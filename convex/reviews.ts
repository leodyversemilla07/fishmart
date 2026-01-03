import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Helper to resolve URL
const resolveUrl = async (ctx: any, url: string) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return await ctx.storage.getUrl(url);
};

export const create = mutation({
    args: {
        productId: v.id("products"),
        userId: v.id("users"),
        rating: v.number(),
        comment: v.optional(v.string()),
        images: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        // Check if user has already reviewed this product
        const existing = await ctx.db
            .query("reviews")
            .withIndex("by_product_user", (q) => q.eq("productId", args.productId).eq("userId", args.userId))
            .unique();

        if (existing) {
            throw new Error("You have already reviewed this product.");
        }

        // Ideally check if user has purchased the product here

        return await ctx.db.insert("reviews", {
            ...args,
            helpfulCount: 0,
        });
    },
});

export const listByProduct = query({
    args: { productId: v.id("products") },
    handler: async (ctx, args) => {
        const reviews = await ctx.db
            .query("reviews")
            .withIndex("by_product", (q) => q.eq("productId", args.productId))
            .order("desc")
            .collect();

        // Join with user info and resolve images
        const reviewsWithUser = await Promise.all(
            reviews.map(async (review) => {
                const user = await ctx.db.get(review.userId);

                // Resolve review images
                let resolvedImages = [];
                if (review.images) {
                    resolvedImages = await Promise.all(review.images.map(img => resolveUrl(ctx, img)));
                }

                // Resolve user avatar if we had one
                if (user && user.shopLogo) {
                    user.shopLogo = await resolveUrl(ctx, user.shopLogo) || user.shopLogo;
                }

                return { ...review, user, images: resolvedImages };
            })
        );

        return reviewsWithUser;
    },
});

export const listBySeller = query({
    args: { sellerId: v.id("users") },
    handler: async (ctx, args) => {
        const products = await ctx.db
            .query("products")
            .withIndex("by_seller", (q) => q.eq("sellerId", args.sellerId))
            .collect();

        const productIds = products.map(p => p._id);

        let allReviews = [];
        for (const productId of productIds) {
            const reviews = await ctx.db
                .query("reviews")
                .withIndex("by_product", (q) => q.eq("productId", productId))
                .collect();

            for (const review of reviews) {
                const user = await ctx.db.get(review.userId);
                const product = products.find(p => p._id === productId);

                // Resolve images
                let resolvedImages = [];
                if (review.images) {
                    resolvedImages = await Promise.all(review.images.map(img => resolveUrl(ctx, img)));
                }
                if (user && user.shopLogo) {
                    user.shopLogo = await resolveUrl(ctx, user.shopLogo) || user.shopLogo;
                }

                allReviews.push({ ...review, user, product, images: resolvedImages });
            }
        }

        return allReviews;
    },
});

export const replyToReview = mutation({
    args: {
        reviewId: v.id("reviews"),
        response: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.reviewId, {
            sellerResponse: args.response,
            respondedAt: Date.now(),
        });
    },
});
