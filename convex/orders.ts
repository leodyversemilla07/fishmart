import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";

export const create = mutation({
    args: {
        buyerId: v.id("users"),
        addressId: v.id("addresses"),
        items: v.array(v.object({
            productId: v.id("products"),
            quantity: v.number(),
            price: v.number(),
            productName: v.string(),
            productImage: v.optional(v.string()),
        })),
        subtotal: v.number(),
        shippingFee: v.number(),
        total: v.number(),
        paymentMethod: v.union(v.literal("GCASH"), v.literal("MAYA"), v.literal("CARD"), v.literal("BANK_TRANSFER"), v.literal("COD")),
        buyerNotes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const orderNumber = "ORD-" + Math.random().toString(36).toUpperCase().substring(2, 10);

        const orderId = await ctx.db.insert("orders", {
            orderNumber,
            buyerId: args.buyerId,
            addressId: args.addressId,
            subtotal: args.subtotal,
            shippingFee: args.shippingFee,
            total: args.total,
            paymentMethod: args.paymentMethod,
            paymentStatus: "PENDING",
            status: "PENDING",
            buyerNotes: args.buyerNotes,
        });

        for (const item of args.items) {
            await ctx.db.insert("order_items", {
                orderId,
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.price * item.quantity,
                productName: item.productName,
                productImage: item.productImage,
            });

            // Update stock
            const product = await ctx.db.get(item.productId);
            if (product) {
                await ctx.db.patch(item.productId, {
                    stock: Math.max(0, product.stock - item.quantity),
                    sales: (product.sales || 0) + item.quantity,
                });

                // Notify seller about new order
                await ctx.runMutation(internal.notifications.create, {
                    userId: product.sellerId,
                    type: "NEW_ORDER",
                    title: "New Order Received!",
                    message: `You have a new order for ${item.productName} (x${item.quantity})`,
                    data: { orderId, orderNumber, productId: item.productId },
                });
            }
        }

        // Notify buyer about order confirmation
        await ctx.runMutation(internal.notifications.create, {
            userId: args.buyerId,
            type: "ORDER_UPDATE",
            title: "Order Placed Successfully",
            message: `Your order ${orderNumber} has been placed and is awaiting confirmation.`,
            data: { orderId, orderNumber },
        });

        return orderId;
    },
});

export const listByBuyer = query({
    args: { buyerId: v.id("users") },
    handler: async (ctx, args) => {
        const orders = await ctx.db
            .query("orders")
            .withIndex("by_buyer", (q) => q.eq("buyerId", args.buyerId))
            .collect();

        return await Promise.all(
            orders.map(async (order) => {
                const items = await ctx.db
                    .query("order_items")
                    .withIndex("by_order", (q) => q.eq("orderId", order._id))
                    .collect();
                return { ...order, items };
            })
        );
    },
});

export const listIncomingOrders = query({
    args: { sellerId: v.id("users") },
    handler: async (ctx, args) => {
        const allOrders = await ctx.db.query("orders").collect();
        const sellerOrders = [];

        for (const order of allOrders) {
            const items = await ctx.db
                .query("order_items")
                .withIndex("by_order", (q) => q.eq("orderId", order._id))
                .collect();

            let belongsToSeller = false;
            for (const item of items) {
                const product = await ctx.db.get(item.productId);
                if (product && product.sellerId === args.sellerId) {
                    belongsToSeller = true;
                    break;
                }
            }

            if (belongsToSeller) {
                const buyer = await ctx.db.get(order.buyerId);
                const address = await ctx.db.get(order.addressId);
                sellerOrders.push({
                    ...order,
                    items,
                    buyer,
                    address
                });
            }
        }

        return sellerOrders;
    },
});

export const updateStatus = mutation({
    args: {
        orderId: v.id("orders"),
        status: v.union(v.literal("PENDING"), v.literal("CONFIRMED"), v.literal("PROCESSING"), v.literal("SHIPPED"), v.literal("DELIVERED"), v.literal("CANCELLED"), v.literal("REFUNDED")),
        trackingNumber: v.optional(v.string()),
        courier: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const order = await ctx.db.get(args.orderId);
        if (!order) throw new Error("Order not found");

        // Update status with timestamp
        const updates: any = { status: args.status };
        if (args.status === "CONFIRMED") updates.confirmedAt = Date.now();
        if (args.status === "SHIPPED") updates.shippedAt = Date.now();
        if (args.status === "DELIVERED") updates.deliveredAt = Date.now();
        if (args.status === "CANCELLED") updates.cancelledAt = Date.now();

        // Add tracking info if provided
        if (args.trackingNumber) updates.trackingNumber = args.trackingNumber;
        if (args.courier) updates.courier = args.courier;

        await ctx.db.patch(args.orderId, updates);

        // Status messages for notifications
        const statusMessages: Record<string, { title: string; message: string }> = {
            CONFIRMED: { title: "Order Confirmed", message: `Your order ${order.orderNumber} has been confirmed by the seller.` },
            PROCESSING: { title: "Order Processing", message: `Your order ${order.orderNumber} is being prepared.` },
            SHIPPED: { 
                title: "Order Shipped", 
                message: args.trackingNumber 
                    ? `Your order ${order.orderNumber} has been shipped! Tracking: ${args.trackingNumber}` 
                    : `Your order ${order.orderNumber} has been shipped!`
            },
            DELIVERED: { title: "Order Delivered", message: `Your order ${order.orderNumber} has been delivered. Enjoy!` },
            CANCELLED: { title: "Order Cancelled", message: `Your order ${order.orderNumber} has been cancelled.` },
            REFUNDED: { title: "Order Refunded", message: `Your order ${order.orderNumber} has been refunded.` },
        };

        // Notify buyer about status change
        if (statusMessages[args.status]) {
            await ctx.runMutation(internal.notifications.create, {
                userId: order.buyerId,
                type: "ORDER_UPDATE",
                title: statusMessages[args.status].title,
                message: statusMessages[args.status].message,
                data: { orderId: args.orderId, orderNumber: order.orderNumber, status: args.status, trackingNumber: args.trackingNumber },
            });
        }

        return await ctx.db.get(args.orderId);
    },
});

export const get = query({
    args: { id: v.id("orders") },
    handler: async (ctx, args) => {
        const order = await ctx.db.get(args.id);
        if (!order) return null;

        const items = await ctx.db
            .query("order_items")
            .withIndex("by_order", (q) => q.eq("orderId", order._id))
            .collect();

        const address = await ctx.db.get(order.addressId);
        const buyer = await ctx.db.get(order.buyerId);

        return {
            ...order,
            items,
            address,
            buyer
        };
    },
});
