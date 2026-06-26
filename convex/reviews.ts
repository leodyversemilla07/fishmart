import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx, mutation, query } from "./_generated/server";
import { hasPurchasedProductForReview } from "./lib/reviews";
import { requireSessionUser } from "./lib/session";
import { SafeUser, withoutSensitiveUserFields } from "./lib/users";

// Helper to resolve URL
const resolveUrl = async (ctx: QueryCtx | MutationCtx, url: string) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return await ctx.storage.getUrl(url);
};

async function hasEligiblePurchase(ctx: QueryCtx | MutationCtx, userId: Id<"users">, productId: Id<"products">) {
    const orders = await ctx.db
        .query("orders")
        .withIndex("by_buyer", (q) => q.eq("buyerId", userId))
        .collect();

    const candidateOrders = orders.filter((order) => order.status === "DELIVERED");
    const orderItems = await Promise.all(
        candidateOrders.map(async (order) => {
            const items = await ctx.db
                .query("order_items")
                .withIndex("by_order", (q) => q.eq("orderId", order._id))
                .collect();
            return [order._id, items] as const;
        })
    );

    return hasPurchasedProductForReview(orders, new Map(orderItems), productId);
}

async function getReviewEligibilityReason(ctx: QueryCtx | MutationCtx, userId: Id<"users">, productId: Id<"products">) {
    const product = await ctx.db.get(productId);
    if (!product) {
        return { canReview: false, reason: "Product not found" };
    }
    if (product.sellerId === userId) {
        return { canReview: false, reason: "You cannot review your own product." };
    }

    const existing = await ctx.db
        .query("reviews")
        .withIndex("by_product_user", (q) => q.eq("productId", productId).eq("userId", userId))
        .unique();

    if (existing) {
        return { canReview: false, reason: "You have already reviewed this product." };
    }

    const purchased = await hasEligiblePurchase(ctx, userId, productId);
    if (!purchased) {
        return { canReview: false, reason: "Reviews are available after this product is delivered from one of your orders." };
    }

    return { canReview: true, reason: null };
}

export const getEligibility = query({
    args: { productId: v.id("products"), sessionToken: v.string() },
    handler: async (ctx, args) => {
        const user = await requireSessionUser(ctx, args.sessionToken);
        return await getReviewEligibilityReason(ctx, user._id, args.productId);
    },
});

export const create = mutation({
    args: {
        productId: v.id("products"),
        sessionToken: v.string(),
        rating: v.number(),
        comment: v.optional(v.string()),
        images: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await requireSessionUser(ctx, args.sessionToken);
        const eligibility = await getReviewEligibilityReason(ctx, user._id, args.productId);
        if (!eligibility.canReview) {
            throw new Error(eligibility.reason || "You are not eligible to review this product.");
        }

        return await ctx.db.insert("reviews", {
            productId: args.productId,
            userId: user._id,
            rating: args.rating,
            comment: args.comment,
            images: args.images,
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
                let resolvedImages: string[] = [];
                if (review.images) {
                    const resolved = await Promise.all(review.images.map(img => resolveUrl(ctx, img)));
                    resolvedImages = resolved.filter((image): image is string => Boolean(image));
                }

                const safeUser = withoutSensitiveUserFields(user);
                const userWithResolvedAvatar = safeUser?.shopLogo
                    ? { ...safeUser, shopLogo: await resolveUrl(ctx, safeUser.shopLogo) || safeUser.shopLogo }
                    : safeUser;

                return { ...review, user: userWithResolvedAvatar, images: resolvedImages };
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

        let allReviews: (Doc<"reviews"> & { user: SafeUser | null; product: Doc<"products"> | undefined; images: string[] })[] = [];
        for (const productId of productIds) {
            const reviews = await ctx.db
                .query("reviews")
                .withIndex("by_product", (q) => q.eq("productId", productId))
                .collect();

            for (const review of reviews) {
                const user = await ctx.db.get(review.userId);
                const product = products.find(p => p._id === productId);

                // Resolve images
                let resolvedImages: string[] = [];
                if (review.images) {
                    const resolved = await Promise.all(review.images.map(img => resolveUrl(ctx, img)));
                    resolvedImages = resolved.filter((image): image is string => Boolean(image));
                }
                const safeUser = withoutSensitiveUserFields(user);
                const userWithResolvedAvatar = safeUser?.shopLogo
                    ? { ...safeUser, shopLogo: await resolveUrl(ctx, safeUser.shopLogo) || safeUser.shopLogo }
                    : safeUser;

                allReviews.push({ ...review, user: userWithResolvedAvatar, product, images: resolvedImages });
            }
        }

        return allReviews;
    },
});

export const replyToReview = mutation({
    args: {
        sessionToken: v.string(),
        reviewId: v.id("reviews"),
        response: v.string(),
    },
    handler: async (ctx, args) => {
        const actor = await requireSessionUser(ctx, args.sessionToken);
        const review = await ctx.db.get(args.reviewId);
        if (!review) {
            throw new Error("Review not found");
        }
        const product = await ctx.db.get(review.productId);
        if (!product || (product.sellerId !== actor._id && actor.role !== "ADMIN")) {
            throw new Error("Forbidden");
        }
        await ctx.db.patch(args.reviewId, {
            sellerResponse: args.response,
            respondedAt: Date.now(),
        });
    },
});
