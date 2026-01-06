import { mutation } from "./_generated/server";

export const seed = mutation({
    args: {},
    handler: async (ctx) => {
        const categories = [
            { name: "Live Fish", slug: "live-fish", sortOrder: 1, isActive: true },
            { name: "Aquarium Plants", slug: "aquarium-plants", sortOrder: 2, isActive: true },
            { name: "Fish Food", slug: "fish-food", sortOrder: 3, isActive: true },
            { name: "Aquarium Supplies", slug: "aquarium-supplies", sortOrder: 5, isActive: true },
        ];

        for (const cat of categories) {
            const existing = await ctx.db
                .query("categories")
                .filter((q) => q.eq(q.field("name"), cat.name))
                .unique();

            if (!existing) {
                await ctx.db.insert("categories", cat);
            }
        }
    },
});
