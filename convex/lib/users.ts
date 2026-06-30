import { Doc } from "../_generated/dataModel";

export type SafeUser = Omit<Doc<"users">, "password" | "passwordSalt">;
export type PublicUser = Omit<SafeUser, "email" | "phoneNumber" | "isActive">;

export function withoutSensitiveUserFields(user: Doc<"users">): SafeUser;
export function withoutSensitiveUserFields(user: Doc<"users"> | null): SafeUser | null;
export function withoutSensitiveUserFields(user: Doc<"users"> | undefined): SafeUser | undefined;
export function withoutSensitiveUserFields(user: Doc<"users"> | null | undefined): SafeUser | null | undefined {
    if (!user) return user;
    const { password, passwordSalt, ...safeUser } = user;
    return safeUser;
}

export function toPublicUser(user: Doc<"users">): PublicUser;
export function toPublicUser(user: Doc<"users"> | null): PublicUser | null;
export function toPublicUser(user: Doc<"users"> | undefined): PublicUser | undefined;
export function toPublicUser(user: Doc<"users"> | null | undefined): PublicUser | null | undefined {
    if (!user) return user;
    const { password, passwordSalt, email, phoneNumber, isActive, ...publicUser } = user;
    return publicUser;
}
