import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { action, internalMutation, MutationCtx, mutation, query } from "./_generated/server";
import {
    applyOrderInventoryIfNeeded,
    assertOrderInventoryAvailable,
    generateOrderNumber,
    getReservationExpiryTimestamp,
    revertOrderInventoryIfCommitted,
    SHIPPING_FEE,
} from "./lib/orders";
import { assertSeller, requireSessionUser } from "./lib/session";

export const create = mutation({
    args: {
        sessionToken: v.string(),
        addressId: v.id("addresses"),
        items: v.array(v.object({
            productId: v.id("products"),
            quantity: v.number(),
        })),
        paymentMethod: v.union(v.literal("GCASH"), v.literal("MAYA"), v.literal("CARD"), v.literal("BANK_TRANSFER"), v.literal("COD")),
        buyerNotes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.runMutation(internal.orders.releaseExpiredReservations, {});

        const buyer = await requireSessionUser(ctx, args.sessionToken);
        const address = await ctx.db.get(args.addressId);
        if (!address || address.userId !== buyer._id) {
            throw new Error("Invalid delivery address");
        }

        await assertOrderInventoryAvailable(ctx, args.items);

        let subtotal = 0;
        const lineItems = [];
        for (const item of args.items) {
            const product = await ctx.db.get(item.productId);
            if (!product) {
                throw new Error("Product not found");
            }

            const primaryImage = await ctx.db
                .query("product_images")
                .withIndex("by_product", (q) => q.eq("productId", product._id))
                .first();

            subtotal += product.price * item.quantity;
            lineItems.push({
                product,
                quantity: item.quantity,
                productImage: primaryImage?.imageUrl,
            });
        }

        const shippingFee = SHIPPING_FEE;
        const total = subtotal + shippingFee;
        const orderNumber = generateOrderNumber();

        const reservationExpiresAt = getReservationExpiryTimestamp(args.paymentMethod);

        const orderId = await ctx.db.insert("orders", {
            orderNumber,
            buyerId: buyer._id,
            addressId: args.addressId,
            subtotal,
            shippingFee,
            total,
            paymentMethod: args.paymentMethod,
            paymentStatus: "PENDING",
            status: "PENDING",
            buyerNotes: args.buyerNotes,
            reservationExpiresAt,
        });

        for (const item of lineItems) {
            await ctx.db.insert("order_items", {
                orderId,
                productId: item.product._id,
                sellerId: item.product.sellerId,
                quantity: item.quantity,
                price: item.product.price,
                subtotal: item.product.price * item.quantity,
                productName: item.product.name,
                productImage: item.productImage,
            });
        }

        const order = await ctx.db.get(orderId);
        if (!order) {
            throw new Error("Failed to create order");
        }

        await applyOrderInventoryIfNeeded(ctx, order);

        await ctx.runMutation(internal.notifications.create, {
            userId: buyer._id,
            type: "ORDER_UPDATE",
            title: "Order Placed Successfully",
            message: `Your order ${orderNumber} has been placed and is awaiting confirmation.`,
            data: { orderId, orderNumber },
        });

        return {
            orderId,
            orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
            total,
        };
    },
});

export const listByBuyer = query({
    args: { sessionToken: v.string() },
    handler: async (ctx, args) => {
        const buyer = await requireSessionUser(ctx, args.sessionToken);
        const orders = await ctx.db
            .query("orders")
            .withIndex("by_buyer", (q) => q.eq("buyerId", buyer._id))
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
    args: { sessionToken: v.string() },
    handler: async (ctx, args) => {
        const seller = await requireSessionUser(ctx, args.sessionToken);
        assertSeller(seller);

        const sellerItems = await ctx.db
            .query("order_items")
            .withIndex("by_seller", (q) => q.eq("sellerId", seller._id))
            .collect();

        const orderIds = [...new Set(sellerItems.map((item) => item.orderId))];

        const sellerOrders = await Promise.all(
            orderIds.map(async (orderId) => {
                const order = await ctx.db.get(orderId);
                if (!order) {
                    return null;
                }

                const items = await ctx.db
                    .query("order_items")
                    .withIndex("by_order", (q) => q.eq("orderId", orderId))
                    .collect();
                const sellerItemsForOrder = items.filter((item) => item.sellerId === seller._id);
                const buyer = await ctx.db.get(order.buyerId);
                const address = await ctx.db.get(order.addressId);

                return {
                    ...order,
                    items: sellerItemsForOrder,
                    buyer,
                    address,
                };
            })
        );

        return sellerOrders.filter(Boolean);
    },
});

export const updateStatus = mutation({
    args: {
        sessionToken: v.string(),
        orderId: v.id("orders"),
        status: v.union(v.literal("PENDING"), v.literal("CONFIRMED"), v.literal("PROCESSING"), v.literal("SHIPPED"), v.literal("DELIVERED"), v.literal("CANCELLED"), v.literal("REFUNDED")),
        trackingNumber: v.optional(v.string()),
        courier: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const seller = await requireSessionUser(ctx, args.sessionToken);
        assertSeller(seller);

        const order = await ctx.db.get(args.orderId);
        if (!order) {
            throw new Error("Order not found");
        }

        const sellerItems = await ctx.db
            .query("order_items")
            .withIndex("by_seller", (q) => q.eq("sellerId", seller._id))
            .collect();
        if (!sellerItems.some((item) => item.orderId === args.orderId)) {
            throw new Error("Forbidden");
        }

        if (order.paymentMethod !== "COD" && order.paymentStatus !== "PAID" && args.status !== "CANCELLED") {
            throw new Error("Order is awaiting payment confirmation");
        }

        const updates = {
            status: args.status,
            ...(args.status === "CONFIRMED" ? { confirmedAt: Date.now(), reservationExpiresAt: undefined } : {}),
            ...(args.status === "SHIPPED" ? { shippedAt: Date.now() } : {}),
            ...(args.status === "DELIVERED" ? { deliveredAt: Date.now() } : {}),
            ...(args.status === "CANCELLED" ? { cancelledAt: Date.now(), reservationExpiresAt: undefined } : {}),
            ...(args.trackingNumber ? { trackingNumber: args.trackingNumber } : {}),
            ...(args.courier ? { courier: args.courier } : {}),
        };

        await ctx.db.patch(args.orderId, updates);

        if (args.status === "CANCELLED") {
            const latestOrder = await ctx.db.get(args.orderId);
            if (latestOrder) {
                await revertOrderInventoryIfCommitted(ctx, latestOrder);
            }
        }

        const statusMessages: Record<string, { title: string; message: string }> = {
            CONFIRMED: { title: "Order Confirmed", message: `Your order ${order.orderNumber} has been confirmed by the seller.` },
            PROCESSING: { title: "Order Processing", message: `Your order ${order.orderNumber} is being prepared.` },
            SHIPPED: {
                title: "Order Shipped",
                message: args.trackingNumber
                    ? `Your order ${order.orderNumber} has been shipped! Tracking: ${args.trackingNumber}`
                    : `Your order ${order.orderNumber} has been shipped!`,
            },
            DELIVERED: { title: "Order Delivered", message: `Your order ${order.orderNumber} has been delivered. Enjoy!` },
            CANCELLED: { title: "Order Cancelled", message: `Your order ${order.orderNumber} has been cancelled.` },
            REFUNDED: { title: "Order Refunded", message: `Your order ${order.orderNumber} has been refunded.` },
        };

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
    args: { sessionToken: v.string(), id: v.id("orders") },
    handler: async (ctx, args) => {
        const actor = await requireSessionUser(ctx, args.sessionToken);
        const order = await ctx.db.get(args.id);
        if (!order) {
            return null;
        }

        const items = await ctx.db
            .query("order_items")
            .withIndex("by_order", (q) => q.eq("orderId", order._id))
            .collect();
        const isBuyer = order.buyerId === actor._id;
        const isSeller = items.some((item) => item.sellerId === actor._id);
        if (!isBuyer && !isSeller && actor.role !== "ADMIN") {
            throw new Error("Forbidden");
        }

        const address = await ctx.db.get(order.addressId);
        const buyer = await ctx.db.get(order.buyerId);

        return {
            ...order,
            items: isSeller && !isBuyer ? items.filter((item) => item.sellerId === actor._id) : items,
            address,
            buyer,
        };
    },
});

async function releaseExpiredReservationsCore(ctx: MutationCtx) {
    const now = Date.now();
    const pendingOrders = await ctx.db
        .query("orders")
        .withIndex("by_status", (q) => q.eq("status", "PENDING"))
        .collect();

    let released = 0;
    for (const order of pendingOrders) {
        const isExpired = Boolean(order.reservationExpiresAt && order.reservationExpiresAt <= now);
        const requiresPayment = order.paymentMethod !== "COD";
        const isUnpaid = order.paymentStatus !== "PAID";

        if (!isExpired || !requiresPayment || !isUnpaid) {
            continue;
        }

        await revertOrderInventoryIfCommitted(ctx, order);
        await ctx.db.patch(order._id, {
            status: "CANCELLED",
            paymentStatus: "FAILED",
            cancelledAt: now,
            reservationExpiresAt: undefined,
        });

        await ctx.runMutation(internal.notifications.create, {
            userId: order.buyerId,
            type: "ORDER_UPDATE",
            title: "Order Cancelled",
            message: `Order ${order.orderNumber} was cancelled because payment was not completed in time.`,
            data: { orderId: order._id, orderNumber: order.orderNumber, status: "CANCELLED" },
        });

        released += 1;
    }

    return { released };
}

export const releaseExpiredReservations = internalMutation({
    args: {},
    handler: async (ctx) => {
        return await releaseExpiredReservationsCore(ctx);
    },
});

export const runReservationSweep = mutation({
    args: { sessionToken: v.string() },
    handler: async (ctx, args) => {
        const actor = await requireSessionUser(ctx, args.sessionToken);
        if (actor.role !== "ADMIN") {
            throw new Error("Forbidden");
        }

        return await releaseExpiredReservationsCore(ctx);
    },
});

export const getReservationMetrics = query({
    args: { sessionToken: v.string(), refreshKey: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const actor = await requireSessionUser(ctx, args.sessionToken);
        if (actor.role !== "ADMIN") {
            throw new Error("Forbidden");
        }

        const now = Date.now();
        const pendingOrders = await ctx.db
            .query("orders")
            .withIndex("by_status", (q) => q.eq("status", "PENDING"))
            .collect();

        const reservableOrders = pendingOrders.filter(
            (order) => order.paymentMethod !== "COD" && order.paymentStatus !== "PAID"
        );

        const expiredReservations = reservableOrders.filter(
            (order) => Boolean(order.reservationExpiresAt && order.reservationExpiresAt <= now)
        );

        return {
            now,
            pendingOrderCount: pendingOrders.length,
            activeReservationCount: reservableOrders.filter(
                (order) => Boolean(order.reservationExpiresAt && order.reservationExpiresAt > now)
            ).length,
            expiredReservationCount: expiredReservations.length,
            expiredOrderIds: expiredReservations.map((order) => order._id),
        };
    },
});

export const retryPayment = action({
    args: {
        sessionToken: v.string(),
        orderId: v.id("orders"),
        successUrl: v.string(),
        cancelUrl: v.string(),
    },
    handler: async (ctx, args): Promise<{ checkoutUrl: string; sessionId: string; orderNumber: string } | { error: string }> => {
        return await ctx.runAction(api.paymongo.createCheckoutSession, args);
    },
});
