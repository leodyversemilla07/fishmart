import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { generateSessionToken, getSessionRecord, hashSessionToken, SESSION_DURATION_MS } from "./lib/session";

const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 210_000;
const PBKDF2_HASH_BITS = 256;
const PASSWORD_RESET_TOKEN_TTL_MS = 1000 * 60 * 15;
const DEFAULT_PASSWORD_RESET_URL_BASE = "fishmart://forgot-password";

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

function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function buildPasswordResetUrl(resetToken: string) {
    const baseUrl = process.env.PASSWORD_RESET_URL_BASE || DEFAULT_PASSWORD_RESET_URL_BASE;
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}token=${encodeURIComponent(resetToken)}`;
}

async function sendPasswordResetEmail(email: string, resetToken: string) {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
        if (process.env.NODE_ENV === "development") {
            console.warn("RESEND_API_KEY is not configured; password reset email was not sent.");
        }
        return;
    }

    const from = process.env.RESEND_FROM_EMAIL || "Fishmart <onboarding@resend.dev>";
    const resetUrl = buildPasswordResetUrl(resetToken);
    const escapedResetUrl = escapeHtml(resetUrl);
    const escapedToken = escapeHtml(resetToken);

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from,
            to: email,
            subject: "Reset your Fishmart password",
            text: `Reset your Fishmart password using this link: ${resetUrl}\n\nIf the link does not open, enter this reset token in the app: ${resetToken}\n\nThis link expires in 15 minutes. If you did not request this, you can ignore this email.`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 560px; margin: 0 auto;">
                    <h1 style="color: #0061A4;">Reset your Fishmart password</h1>
                    <p>We received a request to reset your password. Tap the button below to choose a new password.</p>
                    <p>
                        <a href="${escapedResetUrl}" style="display: inline-block; background: #0061A4; color: #ffffff; padding: 12px 18px; border-radius: 10px; text-decoration: none; font-weight: 700;">
                            Reset password
                        </a>
                    </p>
                    <p>If the button does not open the app, copy this reset token into Fishmart:</p>
                    <p style="font-family: monospace; background: #f1f5f9; padding: 12px; border-radius: 8px; word-break: break-all;">${escapedToken}</p>
                    <p>This reset link expires in 15 minutes.</p>
                    <p style="color: #64748b; font-size: 13px;">If you did not request this, you can safely ignore this email.</p>
                </div>
            `,
        }),
    });

    if (!response.ok) {
        const responseText = await response.text();
        throw new Error(`Resend password reset email failed: ${response.status} ${responseText}`);
    }
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
        const authResult = await ctx.runQuery(internal.auth.getSessionUser, { sessionToken: args.sessionToken });
        if (authResult) {
            await ctx.runMutation(internal.push.deletePushTokensForUser, { userId: authResult.user._id });
        }
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

export const createPasswordResetToken = internalMutation({
    args: {
        userId: v.id("users"),
        tokenHash: v.string(),
        expiresAt: v.number(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("password_reset_tokens", args);
    },
});

export const getPasswordResetToken = internalQuery({
    args: { tokenHash: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("password_reset_tokens")
            .withIndex("by_tokenHash", (q) => q.eq("tokenHash", args.tokenHash))
            .unique();
    },
});

export const deletePasswordResetToken = internalMutation({
    args: { tokenHash: v.string() },
    handler: async (ctx, args) => {
        const token = await ctx.db
            .query("password_reset_tokens")
            .withIndex("by_tokenHash", (q) => q.eq("tokenHash", args.tokenHash))
            .unique();
        if (token) {
            await ctx.db.delete(token._id);
        }
    },
});

export const deletePasswordResetTokensForUser = internalMutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const tokens = await ctx.db
            .query("password_reset_tokens")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        for (const token of tokens) {
            await ctx.db.delete(token._id);
        }
    },
});

export const revokeAllUserSessions = internalMutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const sessions = await ctx.db
            .query("sessions")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();
        const now = Date.now();
        for (const session of sessions) {
            if (!session.revokedAt) {
                await ctx.db.patch(session._id, { revokedAt: now });
            }
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

export const forgotPassword = action({
    args: { email: v.string() },
    handler: async (ctx, args): Promise<{ error: string } | { ok: true }> => {
        const user = await ctx.runQuery(internal.users.getUserByEmail, { email: args.email });
        if (!user) {
            // Don't reveal whether the email exists
            return { ok: true };
        }

        // Generate a password-reset token (short-lived, 15 minutes)
        const resetToken = generateSessionToken();
        const resetHash = await hashSessionToken(resetToken);

        await ctx.runMutation(internal.auth.deletePasswordResetTokensForUser, { userId: user._id });
        await ctx.runMutation(internal.auth.createPasswordResetToken, {
            userId: user._id,
            tokenHash: resetHash,
            expiresAt: Date.now() + PASSWORD_RESET_TOKEN_TTL_MS,
        });

        try {
            await sendPasswordResetEmail(user.email, resetToken);
        } catch (error) {
            console.error("Password reset email failed:", error);
        }

        return { ok: true };
    },
});

export const resetPassword = action({
    args: {
        token: v.string(),
        newPassword: v.string(),
    },
    handler: async (ctx, args): Promise<{ error: string } | { ok: true }> => {
        const tokenHash = await hashSessionToken(args.token);
        const resetRecord = await ctx.runQuery(internal.auth.getPasswordResetToken, { tokenHash });

        if (!resetRecord) {
            return { error: "Invalid or expired reset token" };
        }

        if (resetRecord.expiresAt <= Date.now()) {
            await ctx.runMutation(internal.auth.deletePasswordResetToken, { tokenHash });
            return { error: "Reset token has expired. Please request a new one." };
        }

        // Hash the new password
        const salt = generateSalt();
        const hashedPassword = await hashPasswordPbkdf2(args.newPassword, salt);

        await ctx.runMutation(internal.users.updatePassword, {
            userId: resetRecord.userId,
            password: hashedPassword,
            passwordSalt: salt,
        });

        // Delete the reset token so it can't be reused
        await ctx.runMutation(internal.auth.deletePasswordResetToken, { tokenHash });

        // Revoke all existing sessions for this user (force re-login)
        await ctx.runMutation(internal.auth.revokeAllUserSessions, { userId: resetRecord.userId });

        return { ok: true };
    },
});

