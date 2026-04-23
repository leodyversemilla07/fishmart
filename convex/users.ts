import { v } from "convex/values";
import { MutationCtx, QueryCtx, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { assertSameUser, requireSessionUser } from "./lib/session";

// Helper to resolve URL
const resolveUrl = async (ctx: QueryCtx | MutationCtx, url: string) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return await ctx.storage.getUrl(url);
};

export const getUserByEmail = internalQuery({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .unique();
    },
});

export const createUser = internalMutation({
    args: {
        email: v.string(),
        password: v.string(),
        passwordSalt: v.optional(v.string()), // Salt for secure password hashing
        firstName: v.string(),
        middleName: v.optional(v.string()),
        lastName: v.string(),
        role: v.union(v.literal("BUYER"), v.literal("SELLER")),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("users", {
            email: args.email,
            password: args.password,
            passwordSalt: args.passwordSalt,
            firstName: args.firstName,
            middleName: args.middleName,
            lastName: args.lastName,
            role: args.role,
            isActive: true,
            isVerified: false,
            // optional fields
        });
    },
});


// We need a getProfileById for our new Auth system
export const getProfileById = query({
    args: { sessionToken: v.string() },
    handler: async (ctx, args) => {
        const user = await requireSessionUser(ctx, args.sessionToken);

        const [resolvedShopLogo, addresses, products, orders] = await Promise.all([
            user.shopLogo ? resolveUrl(ctx, user.shopLogo) : Promise.resolve<string | null>(null),
            ctx.db
                .query("addresses")
                .withIndex("by_user", (q) => q.eq("userId", user._id))
                .collect(),
            ctx.db
                .query("products")
                .withIndex("by_seller", (q) => q.eq("sellerId", user._id))
                .collect(),
            ctx.db
                .query("orders")
                .withIndex("by_buyer", (q) => q.eq("buyerId", user._id))
                .collect(),
        ]);

        return {
            ...user,
            shopLogo: resolvedShopLogo || user.shopLogo,
            addresses,
            _count: {
                products: products.length,
                orders: orders.length,
            }
        };
    }
});

export const updateProfile = mutation({
    args: {
        sessionToken: v.string(),
        firstName: v.optional(v.string()),
        middleName: v.optional(v.string()),
        lastName: v.optional(v.string()),
        phoneNumber: v.optional(v.string()),
        shopName: v.optional(v.string()),
        shopDescription: v.optional(v.string()),
        shopLogo: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await requireSessionUser(ctx, args.sessionToken);
        const { sessionToken, ...updates } = args;
        await ctx.db.patch(user._id, updates);
        return await ctx.db.get(user._id);
    },
});

export const listAddresses = query({
    args: { sessionToken: v.string() },
    handler: async (ctx, args) => {
        const user = await requireSessionUser(ctx, args.sessionToken);
        return await ctx.db
            .query("addresses")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect();
    },
});

export const addAddress = mutation({
    args: {
        sessionToken: v.string(),
        firstName: v.string(),
        middleName: v.optional(v.string()),
        lastName: v.string(),
        phoneNumber: v.string(),
        streetAddress: v.string(),
        barangay: v.string(),
        city: v.string(),
        province: v.string(),
        postalCode: v.optional(v.string()),
        isDefault: v.boolean(),
    },
    handler: async (ctx, args) => {
        const user = await requireSessionUser(ctx, args.sessionToken);
        if (args.isDefault) {
            // Unset other defaults
            const existing = await ctx.db
                .query("addresses")
                .withIndex("by_user", (q) => q.eq("userId", user._id))
                .collect();
            for (const addr of existing) {
                if (addr.isDefault) {
                    await ctx.db.patch(addr._id, { isDefault: false });
                }
            }
        }
        const { sessionToken, ...address } = args;
        return await ctx.db.insert("addresses", {
            ...address,
            userId: user._id,
        });
    },
});

export const deleteAddress = mutation({
    args: { sessionToken: v.string(), id: v.id("addresses") },
    handler: async (ctx, args) => {
        const user = await requireSessionUser(ctx, args.sessionToken);
        const address = await ctx.db.get(args.id);
        if (!address) {
            throw new Error("Address not found");
        }
        assertSameUser(user._id, address.userId);
        await ctx.db.delete(args.id);
    },
});

export const setDefaultAddress = mutation({
    args: { sessionToken: v.string(), id: v.id("addresses") },
    handler: async (ctx, args) => {
        const user = await requireSessionUser(ctx, args.sessionToken);
        const selected = await ctx.db.get(args.id);
        if (!selected) {
            throw new Error("Address not found");
        }
        assertSameUser(user._id, selected.userId);

        const existing = await ctx.db
            .query("addresses")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect();

        for (const addr of existing) {
            if (addr.isDefault) {
                await ctx.db.patch(addr._id, { isDefault: false });
            }
        }
        await ctx.db.patch(args.id, { isDefault: true });
    },
});

export const getAddress = query({
    args: { sessionToken: v.string(), id: v.union(v.literal("new"), v.id("addresses")) },
    handler: async (ctx, args) => {
        if (args.id === "new") return null;
        const user = await requireSessionUser(ctx, args.sessionToken);
        const address = await ctx.db.get(args.id);
        if (!address) {
            return null;
        }
        assertSameUser(user._id, address.userId);
        return address;
    },
});

export const updateAddress = mutation({
    args: {
        sessionToken: v.string(),
        id: v.id("addresses"),
        firstName: v.optional(v.string()),
        middleName: v.optional(v.string()),
        lastName: v.optional(v.string()),
        phoneNumber: v.optional(v.string()),
        streetAddress: v.optional(v.string()),
        barangay: v.optional(v.string()),
        city: v.optional(v.string()),
        province: v.optional(v.string()),
        postalCode: v.optional(v.string()),
        isDefault: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const user = await requireSessionUser(ctx, args.sessionToken);
        const address = await ctx.db.get(args.id);
        if (!address) {
            throw new Error("Address not found");
        }
        assertSameUser(user._id, address.userId);

        const { id, sessionToken, ...updates } = args;
        if (updates.isDefault) {
            const existing = await ctx.db
                .query("addresses")
                .withIndex("by_user", (q) => q.eq("userId", user._id))
                .collect();
            for (const addr of existing) {
                if (addr._id !== id && addr.isDefault) {
                    await ctx.db.patch(addr._id, { isDefault: false });
                }
            }
        }
        await ctx.db.patch(id, updates);
        return await ctx.db.get(id);
    }
});

export const getPublicProfile = query({
    args: { id: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.id);
        if (!user) return null;

        const resolvedShopLogo = user.shopLogo ? await resolveUrl(ctx, user.shopLogo) : null;

        const products = await ctx.db
            .query("products")
            .withIndex("by_seller", (q) => q.eq("sellerId", user._id))
            .collect();

        const productDetails = await Promise.all(
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

                return {
                    product,
                    productWithImages: { ...product, images: resolvedImages },
                    reviews,
                };
            })
        );

        const productsWithImages = productDetails.map((entry) => entry.productWithImages);
        const reviewsWithProduct = productDetails.flatMap((entry) =>
            entry.reviews.map((review) => ({ ...review, product: entry.product }))
        );

        const reviewCount = reviewsWithProduct.length;
        const totalRating = reviewsWithProduct.reduce((sum, review) => sum + review.rating, 0);

        const recentReviewBase = [...reviewsWithProduct]
            .sort((a, b) => b._creationTime - a._creationTime)
            .slice(0, 3);

        const uniqueReviewerIds = [...new Set(recentReviewBase.map((review) => review.userId))];
        const reviewers = await Promise.all(uniqueReviewerIds.map((reviewerId) => ctx.db.get(reviewerId)));
        const reviewerMap = new Map(uniqueReviewerIds.map((reviewerId, idx) => [reviewerId, reviewers[idx]]));

        const recentReviews = recentReviewBase.map((review) => ({
            ...review,
            user: reviewerMap.get(review.userId) || null,
        }));

        return {
            ...user,
            shopLogo: resolvedShopLogo || user.shopLogo,
            products: productsWithImages,
            averageRating: reviewCount > 0 ? totalRating / reviewCount : 5.0,
            reviewCount,
            isVerified: user.isVerified || false,
            recentReviews,
            _count: {
                products: products.length
            }
        };
    },
});
