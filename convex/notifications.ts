import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireSessionUser } from "./lib/session";

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
        data: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("notifications", {
            userId: args.userId,
            type: args.type,
            title: args.title,
            message: args.message,
            data: args.data,
            isRead: false,
        });
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
