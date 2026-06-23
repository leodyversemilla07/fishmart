import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
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

        const existing = await ctx.db
            .query("push_tokens")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .unique();

        if (existing) {
            if (existing.userId === user._id && existing.platform === args.platform) {
                return existing._id;
            }

            await ctx.db.patch(existing._id, {
                userId: user._id,
                platform: args.platform,
            });
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

export const getTokensForUserInternal = internalQuery({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("push_tokens")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();
    },
});

export const deletePushToken = internalMutation({
    args: { token: v.string() },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("push_tokens")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .unique();

        if (existing) {
            await ctx.db.delete(existing._id);
        }
    },
});

export const deletePushTokensForUser = internalMutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const tokens = await ctx.db
            .query("push_tokens")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        for (const token of tokens) {
            await ctx.db.delete(token._id);
        }
    },
});

/**
 * Send an Expo push notification to all registered devices for a user.
 * This is an action because Convex mutations must not perform external network IO.
 */
export const sendPushNotification = internalAction({
    args: {
        userId: v.id("users"),
        title: v.string(),
        body: v.string(),
        data: v.optional(v.any()),
    },
    handler: async (ctx, args): Promise<{ sent: number; error?: string }> => {
        const tokens: { token: string }[] = await ctx.runQuery((internal as any).push.getTokensForUserInternal, {
            userId: args.userId,
        });

        if (tokens.length === 0) return { sent: 0 };

        const messages = tokens.map((tokenDoc: { token: string }) => ({
            to: tokenDoc.token,
            sound: "default" as const,
            title: args.title,
            body: args.body,
            data: args.data || {},
            channelId: "fishmart-default",
        }));

        const response = await fetch(EXPO_PUSH_API, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(messages),
        });

        if (!response.ok) {
            const responseText = await response.text();
            console.error("Expo push request failed:", response.status, responseText);
            return { sent: 0, error: responseText };
        }

        const result = await response.json();
        const tickets = Array.isArray(result.data) ? result.data : [];

        await Promise.all(
            tickets.map(async (ticket: { status?: string; details?: { error?: string } }, index: number) => {
                if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
                    const token = tokens[index]?.token;
                    if (token) {
                        await ctx.runMutation((internal as any).push.deletePushToken, { token });
                    }
                }
            })
        );

        return { sent: messages.length };
    },
});
