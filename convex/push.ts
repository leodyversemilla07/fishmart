import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireSessionUser } from "./lib/session";

const EXPO_PUSH_API = "https://exp.host/--/api/v2/push/send";

export const registerPushToken = mutation({
    args: {
        sessionToken: v.string(),
        token: v.string(),
        platform: v.union(v.literal("ios"), v.literal("android")),
    },
    handler: async (ctx, args) => {
        const user = await requireSessionUser(ctx, args.sessionToken);

        // Check if token already exists
        const existing = await ctx.db
            .query("push_tokens")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .unique();

        if (existing) {
            // If it's already assigned to this user, no-op
            if (existing.userId === user._id) return existing._id;
            // Otherwise, update the owner (user logged in on another device)
            await ctx.db.patch(existing._id, { userId: user._id });
            return existing._id;
        }

        return await ctx.db.insert("push_tokens", {
            userId: user._id,
            token: args.token,
            platform: args.platform,
        });
    },
});

export const unregisterPushToken = mutation({
    args: {
        sessionToken: v.string(),
        token: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await requireSessionUser(ctx, args.sessionToken);
        const existing = await ctx.db
            .query("push_tokens")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .unique();

        if (existing && existing.userId === user._id) {
            await ctx.db.delete(existing._id);
        }
    },
});

export const getTokensForUser = query({
    args: { sessionToken: v.string() },
    handler: async (ctx, args) => {
        const user = await requireSessionUser(ctx, args.sessionToken);
        return await ctx.db
            .query("push_tokens")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect();
    },
});

/**
 * Internal mutation to send an Expo push notification to a specific user.
 * Called by the notification creation logic.
 */
export const sendPushNotification = internalMutation({
    args: {
        userId: v.id("users"),
        title: v.string(),
        body: v.string(),
        data: v.optional(v.object({
            orderId: v.optional(v.id("orders")),
            orderNumber: v.optional(v.string()),
            productId: v.optional(v.id("products")),
        })),
    },
    handler: async (ctx, args) => {
        const tokens = await ctx.db
            .query("push_tokens")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        if (tokens.length === 0) return;

        // Fire-and-forget: send push notifications
        for (const tokenDoc of tokens) {
            const message = {
                to: tokenDoc.token,
                sound: "default" as const,
                title: args.title,
                body: args.body,
                data: args.data || {},
                channelId: "fishmart-default",
            };

            fetch(EXPO_PUSH_API, {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(message),
            }).catch((err) => {
                console.error("Failed to send push notification:", err);
            });
        }
    },
});