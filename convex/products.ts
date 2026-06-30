import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { MutationCtx, QueryCtx, mutation, query } from "./_generated/server";
import { assertSeller, requireSessionUser } from "./lib/session";
import { toPublicUser } from "./lib/users";

const resolveUrl = async (ctx: QueryCtx | MutationCtx, url: string) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    // Assume it's a storage ID
    return await ctx.storage.getUrl(url);
};

function productMatchesSearch(product: { name: string; description: string; species?: string; strain?: string; searchTerms?: string[] }, rawSearch?: string) {
    const search = rawSearch?.toLowerCase().trim();
    if (!search) return true;

    const searchWords = search.split(/[^a-z0-9]+/).filter(Boolean);
    if (product.searchTerms && product.searchTerms.length > 0) {
        return searchWords.every((word) => product.searchTerms!.some((term) => term.includes(word)));
    }

    return (
        product.name.toLowerCase().includes(search) ||
        product.description.toLowerCase().includes(search) ||
        Boolean(product.species?.toLowerCase().includes(search)) ||
        Boolean(product.strain?.toLowerCase().includes(search))
    );
}

async function enrichProducts(ctx: QueryCtx | MutationCtx, products: Doc<"products">[]) {
    const uniqueCategoryIds = [...new Set(products.map((p) => p.categoryId))];
    const categories = await Promise.all(uniqueCategoryIds.map((categoryId) => ctx.db.get(categoryId)));
    const categoryMap = new Map(uniqueCategoryIds.map((categoryId, i) => [categoryId, categories[i]]));

    return await Promise.all(
        products.map(async (product) => {
            const [images, reviews] = await Promise.all([
                ctx.db
                    .query("product_images")
                    .withIndex("by_product", (q) => q.eq("productId", product._id))
                    .collect(),
                ctx.db
                    .query("reviews")
                    .withIndex("by_product", (q) => q.eq("productId", product._id))
                    .collect(),
            ]);

            const resolvedImages = await Promise.all(images.map(async (img) => ({
                ...img,
                imageUrl: await resolveUrl(ctx, img.imageUrl) || img.imageUrl
            })));

            const category = categoryMap.get(product.categoryId);

            return {
                ...product,
                images: resolvedImages,
                category: category ? { _id: category._id, name: category.name, slug: category.slug } : null,
                rating: reviews.length > 0
                    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
                    : null,
                reviewCount: reviews.length,
            };
        })
    );
}

export const list = query({
    args: {
        categoryId: v.optional(v.id("categories")),
        sellerId: v.optional(v.id("users")),
        search: v.optional(v.string()),
        status: v.optional(v.union(v.literal("ACTIVE"), v.literal("INACTIVE"), v.literal("OUT_OF_STOCK"))),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let productsQuery;

        // Use indexes when possible for efficient filtering
        if (args.sellerId) {
            const sellerId = args.sellerId;
            productsQuery = ctx.db
                .query("products")
                .withIndex("by_seller", (q) => q.eq("sellerId", sellerId));
        } else if (args.categoryId) {
            const categoryId = args.categoryId;
            productsQuery = ctx.db
                .query("products")
                .withIndex("by_category", (q) => q.eq("categoryId", categoryId));
        } else if (args.status) {
            const status = args.status;
            productsQuery = ctx.db
                .query("products")
                .withIndex("by_status", (q) => q.eq("status", status));
        } else {
            productsQuery = ctx.db.query("products");
        }

        let products = await productsQuery.collect();

        // Apply additional filters after index query
        if (args.categoryId && args.sellerId) {
            // If both filters, we used sellerId index, now filter by category
            products = products.filter((p) => p.categoryId === args.categoryId);
        }

        if (args.status && (args.sellerId || args.categoryId)) {
            // If status + another filter, apply status filter
            products = products.filter((p) => p.status === args.status);
        }

        if (args.search) {
            products = products.filter((product) => productMatchesSearch(product, args.search));
        }

        const effectiveLimit = Math.max(1, Math.min(args.limit ?? 50, 100));
        return await enrichProducts(ctx, products.slice(0, effectiveLimit));
    },
});

export const listPaginated = query({
    args: {
        categoryId: v.optional(v.id("categories")),
        sellerId: v.optional(v.id("users")),
        search: v.optional(v.string()),
        status: v.optional(v.union(v.literal("ACTIVE"), v.literal("INACTIVE"), v.literal("OUT_OF_STOCK"))),
        minPrice: v.optional(v.number()),
        maxPrice: v.optional(v.number()),
        city: v.optional(v.string()),
        sortBy: v.optional(v.union(v.literal("newest"), v.literal("price_low"), v.literal("price_high"))),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const sortBy = args.sortBy ?? "newest";
        const usePriceSort = sortBy === "price_low" || sortBy === "price_high";
        const orderDir = sortBy === "price_low" ? "asc" : "desc";
        let productsQuery;

        // Select index based on filters and sort preference
        if (args.sellerId && args.status) {
            productsQuery = ctx.db
                .query("products")
                .withIndex("by_seller_status", (q) => q.eq("sellerId", args.sellerId!).eq("status", args.status!));
        } else if (args.status && args.categoryId && usePriceSort) {
            productsQuery = ctx.db
                .query("products")
                .withIndex("by_status_category_price", (q) => q.eq("status", args.status!).eq("categoryId", args.categoryId!));
        } else if (args.status && usePriceSort) {
            productsQuery = ctx.db
                .query("products")
                .withIndex("by_status_price", (q) => q.eq("status", args.status!));
        } else if (args.status && args.categoryId) {
            productsQuery = ctx.db
                .query("products")
                .withIndex("by_status_category", (q) => q.eq("status", args.status!).eq("categoryId", args.categoryId!));
        } else if (args.sellerId) {
            productsQuery = ctx.db
                .query("products")
                .withIndex("by_seller", (q) => q.eq("sellerId", args.sellerId!));
        } else if (args.categoryId) {
            productsQuery = ctx.db
                .query("products")
                .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId!));
        } else if (args.status) {
            productsQuery = ctx.db
                .query("products")
                .withIndex("by_status", (q) => q.eq("status", args.status!));
        } else {
            productsQuery = ctx.db.query("products");
        }

        // Apply server-side filters that Convex supports
        if (args.minPrice !== undefined) {
            productsQuery = productsQuery.filter((q) => q.gte(q.field("price"), args.minPrice!));
        }
        if (args.maxPrice !== undefined) {
            productsQuery = productsQuery.filter((q) => q.lte(q.field("price"), args.maxPrice!));
        }
        const cityFilter = args.city?.trim();
        if (cityFilter) {
            productsQuery = productsQuery.filter((q) => q.eq(q.field("city"), cityFilter));
        }

        const result = await productsQuery.order(orderDir).paginate(args.paginationOpts);
        let products = result.page;

        // Client-side post-filters for unsupported query patterns
        if (args.status && !args.sellerId && !args.categoryId && !usePriceSort) {
            products = products.filter((product) => product.status === args.status);
        }
        if (args.categoryId && !args.status) {
            products = products.filter((product) => product.categoryId === args.categoryId);
        }
        if (args.sellerId && !args.status) {
            products = products.filter((product) => product.sellerId === args.sellerId);
        }
        if (args.search) {
            products = products.filter((product) => productMatchesSearch(product, args.search));
        }

        return {
            ...result,
            page: await enrichProducts(ctx, products),
        };
    },
});

export const get = query({
    args: { id: v.id("products") },
    handler: async (ctx, args) => {
        const product = await ctx.db.get(args.id);
        if (!product) return null;

        const [images, sellerRecord, category, productReviews] = await Promise.all([
            ctx.db
                .query("product_images")
                .withIndex("by_product", (q) => q.eq("productId", product._id))
                .collect(),
            ctx.db.get(product.sellerId),
            ctx.db.get(product.categoryId),
            ctx.db
                .query("reviews")
                .withIndex("by_product", (q) => q.eq("productId", product._id))
                .collect(),
        ]);

        const resolvedImages = await Promise.all(images.map(async (img) => ({
            ...img,
            imageUrl: await resolveUrl(ctx, img.imageUrl) || img.imageUrl
        })));

        const safeSeller = toPublicUser(sellerRecord);
        let seller = safeSeller;
        if (seller?.shopLogo) {
            const resolvedLogo = await resolveUrl(ctx, seller.shopLogo);
            seller = { ...seller, shopLogo: resolvedLogo || seller.shopLogo };
        }

        const sellerProducts = seller
            ? await ctx.db
                .query("products")
                .withIndex("by_seller", (q) => q.eq("sellerId", seller._id))
                .collect()
            : [];

        const sellerReviewBuckets = await Promise.all(
            sellerProducts.map((sellerProduct) =>
                ctx.db
                    .query("reviews")
                    .withIndex("by_product", (q) => q.eq("productId", sellerProduct._id))
                    .collect()
            )
        );

        const sellerReviewCount = sellerReviewBuckets.reduce((total, reviews) => total + reviews.length, 0);
        const sellerRatingSum = sellerReviewBuckets.reduce(
            (total, reviews) => total + reviews.reduce((sum, review) => sum + review.rating, 0),
            0
        );

        return {
            ...product,
            images: resolvedImages,
            seller,
            category,
            rating: productReviews.length > 0
                ? productReviews.reduce((sum, review) => sum + review.rating, 0) / productReviews.length
                : null,
            reviewCount: productReviews.length,
            sellerAverageRating: sellerReviewCount > 0 ? sellerRatingSum / sellerReviewCount : null,
            sellerReviewCount,
        };
    },
});

export const create = mutation({
    args: {
        sessionToken: v.string(),
        categoryId: v.id("categories"),
        name: v.string(),
        description: v.string(),
        price: v.number(),
        stock: v.number(),
        city: v.string(),
        province: v.string(),
        images: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        const seller = await requireSessionUser(ctx, args.sessionToken);
        assertSeller(seller);

        const { images, sessionToken, ...productData } = args;

        // Build search terms for better discoverability
        const searchTerms = [
            args.name.toLowerCase(),
            ...args.name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean),
            ...(args.description.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)),
        ];

        const productId = await ctx.db.insert("products", {
            ...productData,
            sellerId: seller._id,
            slug: args.name.toLowerCase().replace(/ /g, "-") + "-" + Date.now(),
            status: "ACTIVE",
            views: 0,
            sales: 0,
            minOrder: 1,
            searchTerms: [...new Set(searchTerms)],
        });

        for (const imageUrl of images) {
            await ctx.db.insert("product_images", {
                productId,
                imageUrl,
                publicId: "convex-storage",
                sortOrder: 0,
            });
        }

        return productId;
    },
});

export const deleteProduct = mutation({
    args: { sessionToken: v.string(), id: v.id("products") },
    handler: async (ctx, args) => {
        const seller = await requireSessionUser(ctx, args.sessionToken);
        const product = await ctx.db.get(args.id);
        if (!product) {
            throw new Error("Product not found");
        }
        if (product.sellerId !== seller._id && seller.role !== "ADMIN") {
            throw new Error("Forbidden");
        }

        // Delete images first
        const images = await ctx.db
            .query("product_images")
            .withIndex("by_product", (q) => q.eq("productId", args.id))
            .collect();

        for (const image of images) {
            await ctx.db.delete(image._id);
            // Optionally delete from storage as well if it's a storage ID
            // but we need to check if it's safe (ref counting?)
        }

        await ctx.db.delete(args.id);
    },
});

export const update = mutation({
    args: {
        sessionToken: v.string(),
        id: v.id("products"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        price: v.optional(v.number()),
        stock: v.optional(v.number()),
        categoryId: v.optional(v.id("categories")),
        city: v.optional(v.string()),
        province: v.optional(v.string()),
        images: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const seller = await requireSessionUser(ctx, args.sessionToken);
        const product = await ctx.db.get(args.id);
        if (!product) {
            throw new Error("Product not found");
        }
        if (product.sellerId !== seller._id && seller.role !== "ADMIN") {
            throw new Error("Forbidden");
        }

        const { id, images, sessionToken, ...updates } = args;

        // Rebuild search terms if name or description changed
        if (updates.name || updates.description) {
            const name = updates.name || product.name;
            const description = updates.description || product.description;
            const searchTerms = [
                name.toLowerCase(),
                ...name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean),
                ...description.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean),
            ];
            (updates as any).searchTerms = [...new Set(searchTerms)];
        }

        if (Object.keys(updates).length > 0) {
            await ctx.db.patch(id, updates);
        }

        if (images) {
            // Complex update: for now let's just replace all images
            const existingImages = await ctx.db
                .query("product_images")
                .withIndex("by_product", (q) => q.eq("productId", id))
                .collect();

            for (const img of existingImages) {
                await ctx.db.delete(img._id);
            }

            for (const imageUrl of images) {
                await ctx.db.insert("product_images", {
                    productId: id,
                    imageUrl,
                    publicId: "convex-storage",
                    sortOrder: 0,
                });
            }
        }

        return await ctx.db.get(id);
    },
});

export const toggleStatus = mutation({
    args: {
        sessionToken: v.string(),
        id: v.id("products"),
    },
    handler: async (ctx, args) => {
        const seller = await requireSessionUser(ctx, args.sessionToken);
        const product = await ctx.db.get(args.id);
        if (!product) {
            throw new Error("Product not found");
        }
        if (product.sellerId !== seller._id && seller.role !== "ADMIN") {
            throw new Error("Forbidden");
        }

        const newStatus = product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
        await ctx.db.patch(args.id, { status: newStatus });
        return { status: newStatus };
    },
});
