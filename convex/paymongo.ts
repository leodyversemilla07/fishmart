import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { applyOrderInventoryIfNeeded, buildOrderLineItems, revertOrderInventoryIfCommitted } from "./lib/orders";

const PAYMONGO_API_URL = "https://api.paymongo.com/v1";

const getPayMongoSecretKey = () => {
    const key = process.env.PAYMONGO_SECRET_KEY;
    if (!key) {
        throw new Error("PAYMONGO_SECRET_KEY environment variable is not set");
    }
    return key;
};

const encodeCredentials = (secretKey: string) => btoa(`${secretKey}:`);

function normalizePaymentMethod(paymentMethod: string | undefined) {
    switch ((paymentMethod || "").toLowerCase()) {
        case "gcash":
            return "GCASH";
        case "paymaya":
        case "maya":
            return "MAYA";
        case "card":
            return "CARD";
        case "bank_transfer":
            return "BANK_TRANSFER";
        case "cod":
            return "COD";
        default:
            return undefined;
    }
}

function toPayMongoPaymentMethod(paymentMethod: "GCASH" | "MAYA" | "CARD" | "BANK_TRANSFER" | "COD") {
    switch (paymentMethod) {
        case "GCASH":
            return "gcash";
        case "MAYA":
            return "paymaya";
        case "CARD":
            return "card";
        case "BANK_TRANSFER":
            return "bank_transfer";
        default:
            throw new Error(`Unsupported online payment method: ${paymentMethod}`);
    }
}

export const createCheckoutSession = action({
    args: {
        sessionToken: v.string(),
        orderId: v.id("orders"),
        successUrl: v.string(),
        cancelUrl: v.string(),
    },
    handler: async (ctx, args): Promise<{ checkoutUrl: string; sessionId: string; orderNumber: string } | { error: string }> => {
        try {
            await ctx.runMutation(internal.orders.releaseExpiredReservations, {});

            const authResult = await ctx.runQuery(internal.auth.getSessionUser, { sessionToken: args.sessionToken });
            if (!authResult) {
                return { error: "Unauthorized" };
            }

            const order = await ctx.runQuery(internal.paymongo.getOrderForCheckout, {
                orderId: args.orderId,
                buyerId: authResult.user._id,
            });
            if (!order) {
                return { error: "Order not found" };
            }
            if (order.paymentMethod === "COD") {
                return { error: "Cash on Delivery orders do not require online payment" };
            }
            if (order.status !== "PENDING") {
                return { error: "Order can no longer accept payment" };
            }
            if (order.paymentStatus === "PAID") {
                return { error: "Order is already paid" };
            }
            if (order.reservationExpiresAt && order.reservationExpiresAt <= Date.now()) {
                return { error: "Payment window has expired for this order" };
            }

            const secretKey = getPayMongoSecretKey();
            const lineItems = order.items.map((item: { name: string; quantity: number; amount: number; imageUrl?: string }) => ({
                name: item.name,
                quantity: item.quantity,
                amount: Math.round(item.amount * 100),
                currency: "PHP",
                ...(item.imageUrl && { images: [item.imageUrl] }),
            }));

            const payload = {
                data: {
                    attributes: {
                        line_items: lineItems,
                        payment_method_types: [toPayMongoPaymentMethod(order.paymentMethod)],
                        success_url: args.successUrl,
                        cancel_url: args.cancelUrl,
                        description: `Fishmart Order #${order.orderNumber}`,
                        reference_number: order.orderNumber,
                        send_email_receipt: true,
                        show_description: true,
                        show_line_items: true,
                        billing: {
                            name: order.buyerName,
                            email: order.buyerEmail,
                            ...(order.buyerPhone && { phone: order.buyerPhone }),
                        },
                        metadata: {
                            order_id: args.orderId,
                            order_number: order.orderNumber,
                        },
                    },
                },
            };

            const response = await fetch(`${PAYMONGO_API_URL}/checkout_sessions`, {
                method: "POST",
                headers: {
                    Authorization: `Basic ${encodeCredentials(secretKey)}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("PayMongo API error:", errorData);
                return { error: errorData.errors?.[0]?.detail || "Failed to create checkout session" };
            }

            const data = await response.json();
            const checkoutUrl = data.data.attributes.checkout_url;
            const sessionId = data.data.id;

            await ctx.runMutation(internal.paymongo.createPaymentRecord, {
                orderId: args.orderId,
                amount: order.totalAmount,
                paymentMethod: order.paymentMethod,
                checkoutSessionId: sessionId,
            });

            return { checkoutUrl, sessionId, orderNumber: order.orderNumber };
        } catch (error) {
            console.error("Error creating checkout session:", error);
            return { error: error instanceof Error ? error.message : "Unknown error occurred" };
        }
    },
});

export const getCheckoutSession = action({
    args: {
        sessionId: v.string(),
    },
    handler: async (_ctx, args): Promise<{ status: string; paymentIntent?: unknown } | { error: string }> => {
        try {
            const secretKey = getPayMongoSecretKey();

            const response = await fetch(`${PAYMONGO_API_URL}/checkout_sessions/${args.sessionId}`, {
                method: "GET",
                headers: {
                    Authorization: `Basic ${encodeCredentials(secretKey)}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                return { error: errorData.errors?.[0]?.detail || "Failed to retrieve checkout session" };
            }

            const data = await response.json();
            return {
                status: data.data.attributes.status,
                paymentIntent: data.data.attributes.payment_intent,
            };
        } catch (error) {
            console.error("Error retrieving checkout session:", error);
            return { error: error instanceof Error ? error.message : "Unknown error occurred" };
        }
    },
});

export const getOrderForCheckout = internalQuery({
    args: {
        orderId: v.id("orders"),
        buyerId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const order = await ctx.db.get(args.orderId);
        if (!order || order.buyerId !== args.buyerId) {
            return null;
        }

        const buyer = await ctx.db.get(order.buyerId);
        const address = await ctx.db.get(order.addressId);
        const items = await buildOrderLineItems(ctx, order._id);

        return {
            orderNumber: order.orderNumber,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            status: order.status,
            reservationExpiresAt: order.reservationExpiresAt,
            totalAmount: order.total,
            buyerEmail: buyer?.email ?? "",
            buyerName: `${buyer?.firstName ?? ""} ${buyer?.lastName ?? ""}`.trim(),
            buyerPhone: address?.phoneNumber || buyer?.phoneNumber,
            items,
        };
    },
});

export const createPaymentRecord = internalMutation({
    args: {
        orderId: v.id("orders"),
        amount: v.number(),
        paymentMethod: v.union(v.literal("GCASH"), v.literal("MAYA"), v.literal("CARD"), v.literal("BANK_TRANSFER"), v.literal("COD")),
        checkoutSessionId: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("payments", {
            orderId: args.orderId,
            amount: args.amount,
            paymentMethod: args.paymentMethod,
            status: "PENDING",
            checkoutSessionId: args.checkoutSessionId,
        });
    },
});

export const updatePaymentStatus = internalMutation({
    args: {
        checkoutSessionId: v.optional(v.string()),
        paymentIntentId: v.optional(v.string()),
        status: v.union(v.literal("PENDING"), v.literal("PROCESSING"), v.literal("PAID"), v.literal("FAILED"), v.literal("REFUNDED")),
        paymentMethod: v.optional(v.string()),
        transactionId: v.optional(v.string()),
        paidAt: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let payment = null;

        if (args.checkoutSessionId) {
            const checkoutSessionId = args.checkoutSessionId;
            payment = await ctx.db
                .query("payments")
                .withIndex("by_checkoutSessionId", (q) => q.eq("checkoutSessionId", checkoutSessionId))
                .unique();
        }

        if (!payment && args.paymentIntentId) {
            const paymentIntentId = args.paymentIntentId;
            payment = await ctx.db
                .query("payments")
                .withIndex("by_paymentIntentId", (q) => q.eq("paymentIntentId", paymentIntentId))
                .unique();
        }

        if (!payment) {
            throw new Error("Payment not found");
        }

        if (payment.status === "PAID" && args.status === "PAID") {
            return payment._id;
        }

        const normalizedMethod = normalizePaymentMethod(args.paymentMethod);

        await ctx.db.patch(payment._id, {
            status: args.status,
            ...(normalizedMethod && { paymentMethod: normalizedMethod }),
            ...(args.transactionId && { transactionId: args.transactionId }),
            ...(args.paidAt && { paidAt: args.paidAt }),
            ...(args.paymentIntentId && { paymentIntentId: args.paymentIntentId }),
            ...(args.checkoutSessionId && { checkoutSessionId: args.checkoutSessionId }),
        });

        const order = await ctx.db.get(payment.orderId);
        if (!order) {
            throw new Error("Order not found for payment");
        }

        if (args.status === "PAID") {
            await applyOrderInventoryIfNeeded(ctx, order);
            await ctx.db.patch(payment.orderId, {
                paymentStatus: "PAID",
                status: "CONFIRMED",
                confirmedAt: Date.now(),
                reservationExpiresAt: undefined,
            });

            await ctx.runMutation(internal.notifications.create, {
                userId: order.buyerId,
                type: "PAYMENT_SUCCESS",
                title: "Payment Successful",
                message: `Your payment for order ${order.orderNumber} has been confirmed.`,
                data: { orderId: payment.orderId, orderNumber: order.orderNumber },
            });
        } else if (args.status === "FAILED") {
            await revertOrderInventoryIfCommitted(ctx, order);
            await ctx.db.patch(payment.orderId, {
                paymentStatus: "FAILED",
                reservationExpiresAt: undefined,
            });
        }

        return payment._id;
    },
});
