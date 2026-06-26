import { Doc } from "../_generated/dataModel";

export type SafeUser = Omit<Doc<"users">, "password" | "passwordSalt">;

export function withoutSensitiveUserFields(user: Doc<"users">): SafeUser;
export function withoutSensitiveUserFields(user: Doc<"users"> | null): SafeUser | null;
export function withoutSensitiveUserFields(user: Doc<"users"> | undefined): SafeUser | undefined;
export function withoutSensitiveUserFields(user: Doc<"users"> | null | undefined): SafeUser | null | undefined {
    if (!user) return user;
    const { password, passwordSalt, ...safeUser } = user;
    return safeUser;
}
