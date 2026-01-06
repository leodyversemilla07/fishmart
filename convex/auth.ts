import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { action, query } from "./_generated/server";

// Simple hash implementation using Web Crypto API available in Convex
async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const signIn = action({
    args: { email: v.string(), password: v.string() },
    handler: async (ctx, args): Promise<{ error: string } | { userId: Id<"users">, user: Doc<"users"> }> => {
        const user: Doc<"users"> | null = await ctx.runQuery(internal.users.getUserByEmail, { email: args.email });

        if (!user || !user.password) {
            return { error: "Invalid email or password" };
        }

        const hashedInput = await hashPassword(args.password);
        if (hashedInput !== user.password) {
            return { error: "Invalid email or password" };
        }

        return { userId: user._id, user };
    },
});

export const signUp = action({
    args: {
        email: v.string(),
        password: v.string(),
        firstName: v.string(),
        middleName: v.optional(v.string()),
        lastName: v.string(),
        role: v.union(v.literal("BUYER"), v.literal("SELLER")),
    },
    handler: async (ctx, args): Promise<{ error: string } | { userId: Id<"users"> }> => {
        const existing = await ctx.runQuery(internal.users.getUserByEmail, { email: args.email });
        if (existing) {
            return { error: "Email already in use" };
        }

        const hashedPassword = await hashPassword(args.password);

        const userId = await ctx.runMutation(internal.users.createUser, {
            email: args.email,
            password: hashedPassword,
            firstName: args.firstName,
            middleName: args.middleName,
            lastName: args.lastName,
            role: args.role,
        });

        return { userId };
    },
});

// Internal helpers to access DB from Actions

export const dummy = query({
    handler: async () => { return "dummy" }
})
