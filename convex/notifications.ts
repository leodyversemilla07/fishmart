import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

export const list = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("notifications")
            .withIndex("by_user_read", (q) => q.eq("userId", args.userId))
            .order("desc")
            .collect();
    },
});

export const getUnreadCount = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const unread = await ctx.db
            .query("notifications")
            .withIndex("by_user_read", (q) => q.eq("userId", args.userId).eq("isRead", false))
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
    args: { id: v.id("notifications") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { isRead: true });
    },
});

export const markAllAsRead = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const unread = await ctx.db
            .query("notifications")
            .withIndex("by_user_read", (q) => q.eq("userId", args.userId).eq("isRead", false))
            .collect();

        for (const n of unread) {
            await ctx.db.patch(n._id, { isRead: true });
        }
    },
});
