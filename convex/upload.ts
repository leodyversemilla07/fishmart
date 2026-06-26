import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireSessionUser } from "./lib/session";

export const generateUploadUrl = mutation({
    args: { sessionToken: v.string() },
    handler: async (ctx, args) => {
        await requireSessionUser(ctx, args.sessionToken);
        return await ctx.storage.generateUploadUrl();
    },
});
