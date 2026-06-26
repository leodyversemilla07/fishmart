import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx, mutation, query } from "./_generated/server";
import { requireSessionUser } from "./lib/session";
import { withoutSensitiveUserFields } from "./lib/users";

async function findConversationBetweenUsers(
    ctx: QueryCtx | MutationCtx,
    actorId: Id<"users">,
    recipientId: Id<"users">
): Promise<Id<"conversations"> | null> {
    const senderParts = await ctx.db
        .query("conversation_participants")
        .withIndex("by_user", (q) => q.eq("userId", actorId))
        .collect();

    for (const part of senderParts) {
        const otherPart = await ctx.db
            .query("conversation_participants")
            .withIndex("by_conversation_user", (q) =>
                q.eq("conversationId", part.conversationId).eq("userId", recipientId)
            )
            .unique();

        if (otherPart) {
            return part.conversationId;
        }
    }

    return null;
}

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
                    otherUser: withoutSensitiveUserFields(otherUser),
                    lastMessage,
                };
            })
        );
    },
});

export const ensureConversation = mutation({
    args: {
        sessionToken: v.string(),
        recipientId: v.id("users"),
        productId: v.optional(v.id("products")),
    },
    handler: async (ctx, args) => {
        const actor = await requireSessionUser(ctx, args.sessionToken);

        if (actor._id === args.recipientId) {
            throw new Error("Cannot start a conversation with yourself");
        }

        const recipient = await ctx.db.get(args.recipientId);
        if (!recipient || !recipient.isActive) {
            throw new Error("Recipient not found");
        }

        let conversationId = await findConversationBetweenUsers(ctx, actor._id, args.recipientId);

        if (!conversationId) {
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

        return { conversationId };
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
        let conversationId: Id<"conversations"> | undefined = args.conversationId;

        // If no conversationId provided, try to find one
        if (!conversationId) {
            if (!args.recipientId) {
                throw new Error("Recipient ID is required if Conversation ID is not provided.");
            }
            const recipientId = args.recipientId;

            conversationId = await findConversationBetweenUsers(ctx, actor._id, recipientId) ?? undefined;
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

export const getUnreadMessageCount = query({
    args: { sessionToken: v.string() },
    handler: async (ctx, args) => {
        const user = await requireSessionUser(ctx, args.sessionToken);
        const participants = await ctx.db
            .query("conversation_participants")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect();

        let totalUnread = 0;
        for (const p of participants) {
            const unread = await ctx.db
                .query("chat_messages")
                .withIndex("by_conversation", (q) => q.eq("conversationId", p.conversationId))
                .filter((q) => q.and(
                    q.eq(q.field("isRead"), false),
                    q.neq(q.field("senderId"), user._id)
                ))
                .collect();
            totalUnread += unread.length;
        }
        return totalUnread;
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
