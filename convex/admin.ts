import { v } from "convex/values";
import { query } from "./_generated/server";
import { assertAdmin, requireSessionUser } from "./lib/session";

export const getDashboardStats = query({
    args: { sessionToken: v.string() },
    handler: async (ctx, args) => {
        const actor = await requireSessionUser(ctx, args.sessionToken);
        assertAdmin(actor);

        const [users, products, orders] = await Promise.all([
            ctx.db.query("users").collect(),
            ctx.db.query("products").collect(),
            ctx.db.query("orders").collect(),
        ]);

        const paidOrders = orders.filter((order) => order.paymentStatus === "PAID");
        const recentOrders = [...orders]
            .sort((a, b) => b._creationTime - a._creationTime)
            .slice(0, 5)
            .map((order) => ({
                _id: order._id,
                _creationTime: order._creationTime,
                orderNumber: order.orderNumber,
                total: order.total,
                status: order.status,
                paymentStatus: order.paymentStatus,
            }));

        return {
            users: {
                total: users.length,
                active: users.filter((user) => user.isActive).length,
                sellers: users.filter((user) => user.role === "SELLER").length,
                admins: users.filter((user) => user.role === "ADMIN").length,
                verified: users.filter((user) => user.isVerified).length,
            },
            products: {
                total: products.length,
                active: products.filter((product) => product.status === "ACTIVE").length,
                inactive: products.filter((product) => product.status === "INACTIVE").length,
                outOfStock: products.filter((product) => product.status === "OUT_OF_STOCK" || product.stock <= 0).length,
            },
            orders: {
                total: orders.length,
                pending: orders.filter((order) => order.status === "PENDING").length,
                processing: orders.filter((order) => order.status === "PROCESSING" || order.status === "CONFIRMED").length,
                shipped: orders.filter((order) => order.status === "SHIPPED").length,
                delivered: orders.filter((order) => order.status === "DELIVERED").length,
                cancelled: orders.filter((order) => order.status === "CANCELLED").length,
                paid: paidOrders.length,
                revenue: paidOrders.reduce((sum, order) => sum + order.total, 0),
            },
            recentOrders,
        };
    },
});

export const listOrders = query({
    args: { sessionToken: v.string() },
    handler: async (ctx, args) => {
        const actor = await requireSessionUser(ctx, args.sessionToken);
        assertAdmin(actor);

        const orders = await ctx.db.query("orders").collect();
        const sortedOrders = [...orders].sort((a, b) => b._creationTime - a._creationTime);

        return await Promise.all(
            sortedOrders.map(async (order) => {
                const [items, buyer, address] = await Promise.all([
                    ctx.db
                        .query("order_items")
                        .withIndex("by_order", (q) => q.eq("orderId", order._id))
                        .collect(),
                    ctx.db.get(order.buyerId),
                    ctx.db.get(order.addressId),
                ]);

                return {
                    ...order,
                    items,
                    buyer: buyer
                        ? {
                            _id: buyer._id,
                            email: buyer.email,
                            firstName: buyer.firstName,
                            middleName: buyer.middleName,
                            lastName: buyer.lastName,
                            phoneNumber: buyer.phoneNumber,
                        }
                        : null,
                    address,
                };
            })
        );
    },
});
