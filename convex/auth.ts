import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { generateSessionToken, getSessionRecord, hashSessionToken, SESSION_DURATION_MS } from "./lib/session";

// Salt length in bytes (16 bytes = 128 bits, industry standard)
const SALT_LENGTH = 16;

/**
 * Generate a cryptographically secure random salt
 */
function generateSalt(): string {
    const saltBytes = new Uint8Array(SALT_LENGTH);
    crypto.getRandomValues(saltBytes);
    return Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash password with salt using SHA-256
 * Format: hash(salt + password)
 */
async function hashPassword(password: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(salt + password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify password against stored hash and salt
 */
async function verifyPassword(password: string, storedHash: string, salt: string | undefined): Promise<boolean> {
    if (!salt) {
        // Legacy password without salt - hash directly for backward compatibility
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const legacyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return legacyHash === storedHash;
    }
    
    const hashedInput = await hashPassword(password, salt);
    return hashedInput === storedHash;
}

export const signIn = action({
    args: { email: v.string(), password: v.string() },
    handler: async (ctx, args): Promise<{ error: string } | { userId: Id<"users">, user: Omit<Doc<"users">, "password" | "passwordSalt">, sessionToken: string }> => {
        const user: Doc<"users"> | null = await ctx.runQuery(internal.users.getUserByEmail, { email: args.email });

        if (!user || !user.password || !user.isActive) {
            return { error: "Invalid email or password" };
        }

        const isValid = await verifyPassword(args.password, user.password, (user as any).passwordSalt);
        if (!isValid) {
            return { error: "Invalid email or password" };
        }

        const sessionToken = generateSessionToken();
        await ctx.runMutation(internal.auth.createSession, {
            userId: user._id,
            sessionToken,
        });

        const { password, passwordSalt, ...safeUser } = user;
        return { userId: user._id, user: safeUser, sessionToken };
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

        // Generate salt and hash password
        const salt = generateSalt();
        const hashedPassword = await hashPassword(args.password, salt);

        const userId = await ctx.runMutation(internal.users.createUser, {
            email: args.email,
            password: hashedPassword,
            passwordSalt: salt,
            firstName: args.firstName,
            middleName: args.middleName,
            lastName: args.lastName,
            role: args.role,
        });

        return { userId };
    },
});

export const signOut = action({
    args: { sessionToken: v.string() },
    handler: async (ctx, args) => {
        await ctx.runMutation(internal.auth.revokeSession, { sessionToken: args.sessionToken });
        return { ok: true };
    },
});

export const createSession = internalMutation({
    args: {
        userId: v.id("users"),
        sessionToken: v.string(),
    },
    handler: async (ctx, args) => {
        const tokenHash = await hashSessionToken(args.sessionToken);
        return await ctx.db.insert("sessions", {
            userId: args.userId,
            tokenHash,
            expiresAt: Date.now() + SESSION_DURATION_MS,
        });
    },
});

export const revokeSession = internalMutation({
    args: { sessionToken: v.string() },
    handler: async (ctx, args) => {
        const session = await getSessionRecord(ctx, args.sessionToken);
        if (session && !session.revokedAt) {
            await ctx.db.patch(session._id, { revokedAt: Date.now() });
        }
    },
});

export const getSessionUser = internalQuery({
    args: { sessionToken: v.string() },
    handler: async (ctx, args) => {
        const session = await getSessionRecord(ctx, args.sessionToken);
        if (!session || session.revokedAt || session.expiresAt <= Date.now()) {
            return null;
        }

        const user = await ctx.db.get(session.userId);
        if (!user || !user.isActive) {
            return null;
        }

        return { session, user };
    },
});

// Internal helpers to access DB from Actions

export const dummy = query({
    handler: async () => { return "dummy" }
})
