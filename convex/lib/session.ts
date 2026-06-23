import { Doc, Id } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";

export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

export async function hashSessionToken(sessionToken: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(sessionToken);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

export function generateSessionToken(): string {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    return Array.from(randomBytes)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

export async function getSessionRecord(ctx: QueryCtx | MutationCtx, sessionToken: string) {
    const tokenHash = await hashSessionToken(sessionToken);
    return await ctx.db
        .query("sessions")
        .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
        .unique();
}

export async function requireSession(ctx: QueryCtx | MutationCtx, sessionToken: string): Promise<{
    session: Doc<"sessions">;
    user: Doc<"users">;
}> {
    const session = await getSessionRecord(ctx, sessionToken);
    if (!session || session.revokedAt || session.expiresAt <= Date.now()) {
        throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || !user.isActive) {
        throw new Error("Unauthorized");
    }

    return { session, user };
}

export async function requireSessionUser(ctx: QueryCtx | MutationCtx, sessionToken: string) {
    return (await requireSession(ctx, sessionToken)).user;
}

export function assertSameUser(actorId: Id<"users">, expectedUserId: Id<"users">) {
    if (actorId !== expectedUserId) {
        throw new Error("Forbidden");
    }
}

export function assertSeller(user: Doc<"users">) {
    if (user.role !== "SELLER" && user.role !== "ADMIN") {
        throw new Error("Seller access required");
    }
}

export function assertAdmin(user: Doc<"users">) {
    if (user.role !== "ADMIN") {
        throw new Error("Admin access required");
    }
}
