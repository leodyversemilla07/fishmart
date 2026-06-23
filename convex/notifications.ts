import { v } from "convex/values";
import { MutationCtx, internalMutation, mutation, query } from "./_generated/server";
import { requireSessionUser } from "./lib/session";

const EXPO_PUSH_API = "https://exp.host/--/api/v2/push/send";

async function sendPushNotifications(
    ctx: MutationCtx,
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
) {
    const tokens = await ctx.db
        .query("push_tokens")
        .withIndex("by_user", (q) => q.eq("userId", userId as any))
        .collect();

    if (tokens.length === 0) return;

    for (const tokenDoc of tokens) {
        const message = {
            to: tokenDoc.token,
            sound: "default" as const,
            title,
            body,
            data: data || {},
            channelId: "fishmart-default",
        };

        // Fire-and-forget — don't block the mutation on push delivery
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
}

export const list = query({
    args: { sessionToken: v.string() },
    handler: async (ctx, args) => {
        const user = await requireSessionUser(ctx, args.sessionToken);
        return await ctx.db
            .query("notifications")
            .withIndex("by_user_read", (q) => q.eq("userId", user._id))
            .order("desc")
            .collect();
    },
});

export const getUnreadCount = query({
    args: { sessionToken: v.string() },
    handler: async (ctx, args) => {
        const user = await requireSessionUser(ctx, args.sessionToken);
        const unread = await ctx.db
            .query("notifications")
            .withIndex("by_user_read", (q) => q.eq("userId", user._id).eq("isRead", false))
            .collect();
        return unread.length;
    },
});

export const create = internalMutation({
    args: {
        userId: v.id("users"),
        type: v.string(),
        title: v.string(),
        message: v.string(),
        data: v.optional(v.object({
            orderId: v.optional(v.id("orders")),
            orderNumber: v.optional(v.string()),
            status: v.optional(v.union(
                v.literal("PENDING"),
                v.literal("CONFIRMED"),
                v.literal("PROCESSING"),
                v.literal("SHIPPED"),
                v.literal("DELIVERED"),
                v.literal("CANCELLED"),
                v.literal("REFUNDED")
            )),
            trackingNumber: v.optional(v.string()),
            productId: v.optional(v.id("products")),
        })),
    },
    handler: async (ctx, args) => {
        const notifId = await ctx.db.insert("notifications", {
            userId: args.userId,
            type: args.type,
            title: args.title,
            message: args.message,
            data: args.data,
            isRead: false,
        });

        // Fire push notifications (fire-and-forget, non-blocking)
        sendPushNotifications(ctx, args.userId, args.title, args.message, args.data as Record<string, unknown> | undefined).catch((err) => {
            console.error("Push notification error (non-fatal):", err);
        });

        return notifId;
    },
});

export const markAsRead = mutation({
    args: { sessionToken: v.string(), id: v.id("notifications") },
    handler: async (ctx, args) => {
        const user = await requireSessionUser(ctx, args.sessionToken);
        const notification = await ctx.db.get(args.id);
        if (!notification || notification.userId !== user._id) {
            throw new Error("Forbidden");
        }
        await ctx.db.patch(args.id, { isRead: true, readAt: Date.now() });
    },
});

export const markAllAsRead = mutation({
    args: { sessionToken: v.string() },
    handler: async (ctx, args) => {
        const user = await requireSessionUser(ctx, args.sessionToken);
        const unread = await ctx.db
            .query("notifications")
            .withIndex("by_user_read", (q) => q.eq("userId", user._id).eq("isRead", false))
            .collect();

        for (const n of unread) {
            await ctx.db.patch(n._id, { isRead: true, readAt: Date.now() });
        }
    },
});