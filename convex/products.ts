import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const resolveUrl = async (ctx: any, url: string) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    // Assume it's a storage ID
    return await ctx.storage.getUrl(url);
};

export const list = query({
    args: {
        categoryId: v.optional(v.id("categories")),
        sellerId: v.optional(v.id("users")),
        search: v.optional(v.string()),
        status: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let productsQuery;

        // Use indexes when possible for efficient filtering
        if (args.sellerId) {
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
                .withIndex("by_status", (q) => q.eq("status", args.status as any));
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

        // Text search (case-insensitive) - still in-memory but on smaller dataset
        if (args.search) {
            const search = args.search.toLowerCase();
            products = products.filter(
                (p) =>
                    p.name.toLowerCase().includes(search) ||
                    p.description.toLowerCase().includes(search)
            );
        }

        // Join with images and resolve URLs
        const productsWithImages = await Promise.all(
            products.map(async (product) => {
                const images = await ctx.db
                    .query("product_images")
                    .withIndex("by_product", (q) => q.eq("productId", product._id))
                    .collect();

                const resolvedImages = await Promise.all(images.map(async img => ({
                    ...img,
                    imageUrl: await resolveUrl(ctx, img.imageUrl) || img.imageUrl
                })));

                return { ...product, images: resolvedImages };
            })
        );

        return productsWithImages;
    },
});

export const get = query({
    args: { id: v.id("products") },
    handler: async (ctx, args) => {
        const product = await ctx.db.get(args.id);
        if (!product) return null;

        const images = await ctx.db
            .query("product_images")
            .withIndex("by_product", (q) => q.eq("productId", product._id))
            .collect();

        const resolvedImages = await Promise.all(images.map(async img => ({
            ...img,
            imageUrl: await resolveUrl(ctx, img.imageUrl) || img.imageUrl
        })));

        const seller = await ctx.db.get(product.sellerId);

        // Resolve seller logo if applicable
        if (seller && seller.shopLogo) {
            seller.shopLogo = await resolveUrl(ctx, seller.shopLogo) || seller.shopLogo;
        }

        const category = await ctx.db.get(product.categoryId);

        return { ...product, images: resolvedImages, seller, category };
    },
});

export const create = mutation({
    args: {
        sellerId: v.id("users"),
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
        const { images, ...productData } = args;

        const productId = await ctx.db.insert("products", {
            ...productData,
            slug: args.name.toLowerCase().replace(/ /g, "-") + "-" + Date.now(),
            status: "ACTIVE",
            views: 0,
            sales: 0,
            minOrder: 1,
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
    args: { id: v.id("products") },
    handler: async (ctx, args) => {
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
        const { id, images, ...updates } = args;

        if (Object.keys(updates).length > 0) {
            await ctx.db.patch(id, updates as any);
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
