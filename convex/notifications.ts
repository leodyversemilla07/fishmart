import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireSessionUser } from "./lib/session";

const notificationDataValidator = v.object({
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
});

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
        data: v.optional(notificationDataValidator),
    },
    handler: async (ctx, args) => {
        const notificationId = await ctx.db.insert("notifications", {
            userId: args.userId,
            type: args.type,
            title: args.title,
            message: args.message,
            data: args.data,
            isRead: false,
        });

        await ctx.scheduler.runAfter(0, internal.push.sendPushNotification, {
            userId: args.userId,
            title: args.title,
            body: args.message,
            data: args.data,
        });

        return notificationId;
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

        for (const notification of unread) {
            await ctx.db.patch(notification._id, { isRead: true, readAt: Date.now() });
        }
    },
});
