import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { generateSessionToken, getSessionRecord, hashSessionToken, SESSION_DURATION_MS } from "./lib/session";

const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 210_000;
const PBKDF2_HASH_BITS = 256;

function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) {
        throw new Error("Invalid hex string");
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

function generateSalt(): string {
    const saltBytes = new Uint8Array(SALT_LENGTH);
    crypto.getRandomValues(saltBytes);
    return bytesToHex(saltBytes);
}

async function hashPasswordLegacySha256(password: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(salt + password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return bytesToHex(new Uint8Array(hashBuffer));
}

async function hashPasswordPbkdf2(password: string, saltHex: string, iterations = PBKDF2_ITERATIONS): Promise<string> {
    const passwordKey = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
    );

    const saltBytes = hexToBytes(saltHex);
    const saltBuffer = new ArrayBuffer(saltBytes.length);
    new Uint8Array(saltBuffer).set(saltBytes);

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: saltBuffer,
            iterations,
            hash: "SHA-256",
        },
        passwordKey,
        PBKDF2_HASH_BITS
    );

    return `pbkdf2$${iterations}$${bytesToHex(new Uint8Array(derivedBits))}`;
}

async function verifyPassword(password: string, storedHash: string, salt: string | undefined): Promise<boolean> {
    if (storedHash.startsWith("pbkdf2$")) {
        if (!salt) return false;
        const [, iterationStr, expectedHash] = storedHash.split("$");
        const iterations = Number.parseInt(iterationStr ?? "", 10);
        if (!Number.isFinite(iterations) || iterations < 10_000 || !expectedHash) {
            return false;
        }

        const computed = await hashPasswordPbkdf2(password, salt, iterations);
        return computed === storedHash;
    }

    if (!salt) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const legacyHash = bytesToHex(new Uint8Array(hashBuffer));
        return legacyHash === storedHash;
    }

    const hashedInput = await hashPasswordLegacySha256(password, salt);
    return hashedInput === storedHash;
}

export const signIn = action({
    args: { email: v.string(), password: v.string() },
    handler: async (ctx, args): Promise<{ error: string } | { userId: Id<"users">, user: Omit<Doc<"users">, "password" | "passwordSalt">, sessionToken: string }> => {
        const user: Doc<"users"> | null = await ctx.runQuery(internal.users.getUserByEmail, { email: args.email });

        if (!user || !user.password || !user.isActive) {
            return { error: "Invalid email or password" };
        }

        const isValid = await verifyPassword(args.password, user.password, user.passwordSalt);
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

        const salt = generateSalt();
        const hashedPassword = await hashPasswordPbkdf2(args.password, salt);

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

