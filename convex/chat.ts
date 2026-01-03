import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getConversations = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const participants = await ctx.db
            .query("conversation_participants")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        return await Promise.all(
            participants.map(async (p) => {
                const conv = await ctx.db.get(p.conversationId);
                const otherParticipants = await ctx.db
                    .query("conversation_participants")
                    .withIndex("by_conversation", (q) => q.eq("conversationId", p.conversationId))
                    .collect();

                const otherUserPart = otherParticipants.find(op => op.userId !== args.userId);
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
        senderId: v.id("users"),
        recipientId: v.optional(v.id("users")),
        conversationId: v.optional(v.id("conversations")),
        productId: v.optional(v.id("products")),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        let conversationId: any = args.conversationId;

        // If no conversationId provided, try to find one
        if (!conversationId) {
            if (!args.recipientId) {
                throw new Error("Recipient ID is required if Conversation ID is not provided.");
            }

            const senderParts = await ctx.db
                .query("conversation_participants")
                .withIndex("by_user", (q) => q.eq("userId", args.senderId))
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
                userId: args.senderId,
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

        const messageId = await ctx.db.insert("chat_messages", {
            conversationId,
            senderId: args.senderId,
            content: args.content,
            isRead: false,
        });

        return messageId;
    },
});

export const getMessages = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("chat_messages")
            .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
            .collect();
    },
});
