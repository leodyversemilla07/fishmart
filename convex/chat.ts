import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireSessionUser } from "./lib/session";

export const getConversations = query({
    args: { sessionToken: v.string() },
    handler: async (ctx, args) => {
        const user = await requireSessionUser(ctx, args.sessionToken);
        const participants = await ctx.db
            .query("conversation_participants")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect();

        return await Promise.all(
            participants.map(async (p) => {
                const conv = await ctx.db.get(p.conversationId);
                const otherParticipants = await ctx.db
                    .query("conversation_participants")
                    .withIndex("by_conversation", (q) => q.eq("conversationId", p.conversationId))
                    .collect();

                const otherUserPart = otherParticipants.find(op => op.userId !== user._id);
                const otherUser = otherUserPart ? await ctx.db.get(otherUserPart.userId) : null;

                const lastMessage = await ctx.db
                    .query("chat_messages")
                    .withIndex("by_conversation", (q) => q.eq("conversationId", p.conversationId))
                    .order("desc")
                    .first();

                return {
                    ...conv,
                    otherUser,
                    lastMessage,
                };
            })
        );
    },
});

export const sendMessage = mutation({
    args: {
        sessionToken: v.string(),
        recipientId: v.optional(v.id("users")),
        conversationId: v.optional(v.id("conversations")),
        productId: v.optional(v.id("products")),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        const actor = await requireSessionUser(ctx, args.sessionToken);
        let conversationId: any = args.conversationId;

        // If no conversationId provided, try to find one
        if (!conversationId) {
            if (!args.recipientId) {
                throw new Error("Recipient ID is required if Conversation ID is not provided.");
            }

            const senderParts = await ctx.db
                .query("conversation_participants")
                .withIndex("by_user", (q) => q.eq("userId", actor._id))
                .collect();

            for (const part of senderParts) {
                const otherPart = await ctx.db
                    .query("conversation_participants")
                    .withIndex("by_conversation_user", (q) =>
                        q.eq("conversationId", part.conversationId).eq("userId", args.recipientId!)
                    )
                    .unique();

                if (otherPart) {
                    conversationId = part.conversationId;
                    break;
                }
            }
        }

        // If still no conversationId, create one
        if (!conversationId) {
            if (!args.recipientId) {
                // Should be caught above, but for safety
                throw new Error("Cannot create conversation without recipient.");
            }

            conversationId = await ctx.db.insert("conversations", {
                productId: args.productId,
            });
            await ctx.db.insert("conversation_participants", {
                conversationId,
                userId: actor._id,
                joinedAt: Date.now(),
            });
            await ctx.db.insert("conversation_participants", {
                conversationId,
                userId: args.recipientId,
                joinedAt: Date.now(),
            });
        }

        // Verify sender is participant if we passed conversationId straight (optional security check)
        // For Speed iteration, skipping strictly if not needed, but good practice.
        // Let's rely on standard flow.

        const senderParticipant = await ctx.db
            .query("conversation_participants")
            .withIndex("by_conversation_user", (q) => q.eq("conversationId", conversationId).eq("userId", actor._id))
            .unique();

        if (!senderParticipant) {
            throw new Error("Forbidden");
        }

        const messageId = await ctx.db.insert("chat_messages", {
            conversationId,
            senderId: actor._id,
            content: args.content,
            isRead: false,
        });

        return messageId;
    },
});

export const getMessages = query({
    args: { sessionToken: v.string(), conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        const user = await requireSessionUser(ctx, args.sessionToken);
        const participant = await ctx.db
            .query("conversation_participants")
            .withIndex("by_conversation_user", (q) => q.eq("conversationId", args.conversationId).eq("userId", user._id))
            .unique();

        if (!participant) {
            throw new Error("Forbidden");
        }

        return await ctx.db
            .query("chat_messages")
            .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
            .collect();
    },
});
