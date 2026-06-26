import { v } from "convex/values";
import { ActionCtx, action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { applyOrderInventoryIfNeeded, buildOrderLineItems, getReservationExpiryTimestamp, revertOrderInventoryIfCommitted } from "./lib/orders";

const PAYMONGO_API_URL = "https://api.paymongo.com/v2";

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

const checkoutSessionArgs = {
    sessionToken: v.string(),
    orderId: v.id("orders"),
    successUrl: v.string(),
    cancelUrl: v.string(),
};

type CreateCheckoutSessionArgs = {
    sessionToken: string;
    orderId: Id<"orders">;
    successUrl: string;
    cancelUrl: string;
};

async function createCheckoutSessionHandler(
    ctx: ActionCtx,
    args: CreateCheckoutSessionArgs
): Promise<{ checkoutUrl: string; sessionId: string; orderNumber: string } | { error: string }> {
    try {
        await ctx.runMutation(internal.orders.releaseExpiredReservations, {});

        const authResult = await ctx.runQuery(internal.auth.getSessionUser, { sessionToken: args.sessionToken });
        if (!authResult) {
            return { error: "Unauthorized" };
        }

        await ctx.runMutation(internal.paymongo.prepareOrderForCheckout, {
            orderId: args.orderId,
            buyerId: authResult.user._id,
        });

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
                "Idempotency-Key": `checkout:${args.orderId}:${order.reservationExpiresAt ?? "open"}`,
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
}

export const createCheckoutSession = action({
    args: checkoutSessionArgs,
    handler: createCheckoutSessionHandler,
});

export const createCheckoutSessionInternal = internalAction({
    args: checkoutSessionArgs,
    handler: createCheckoutSessionHandler,
});

export const getCheckoutSession = internalAction({
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

export const prepareOrderForCheckout = internalMutation({
    args: {
        orderId: v.id("orders"),
        buyerId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const order = await ctx.db.get(args.orderId);
        if (!order || order.buyerId !== args.buyerId) {
            throw new Error("Order not found");
        }
        if (order.paymentMethod === "COD") {
            throw new Error("Cash on Delivery orders do not require online payment");
        }
        if (order.status !== "PENDING") {
            throw new Error("Order can no longer accept payment");
        }
        if (order.paymentStatus === "PAID") {
            throw new Error("Order is already paid");
        }
        if (order.reservationExpiresAt && order.reservationExpiresAt <= Date.now()) {
            throw new Error("Payment window has expired for this order");
        }

        await applyOrderInventoryIfNeeded(ctx, order);

        if (order.paymentStatus !== "PENDING" || !order.reservationExpiresAt) {
            await ctx.db.patch(order._id, {
                paymentStatus: "PENDING",
                reservationExpiresAt: getReservationExpiryTimestamp(order.paymentMethod),
            });
        }
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
        const existing = await ctx.db
            .query("payments")
            .withIndex("by_checkoutSessionId", (q) => q.eq("checkoutSessionId", args.checkoutSessionId))
            .unique();
        if (existing) {
            return existing._id;
        }

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

function readPayMongoEvent(payload: any) {
    const event = payload?.data;
    const eventType = event?.type ?? event?.attributes?.type;
    const eventData = event?.data ?? event?.attributes?.data;
    const eventId = event?.id ?? `${eventType}:${eventData?.id ?? "unknown"}`;
    const livemode = event?.livemode ?? event?.attributes?.livemode ?? eventData?.attributes?.livemode;

    return { event, eventType, eventData, eventId, livemode };
}

function expectedPayMongoLivemode() {
    const raw = process.env.PAYMONGO_EXPECT_LIVEMODE ?? process.env.PAYMONGO_LIVEMODE;
    if (raw === undefined) return undefined;
    return raw === "true" || raw === "live" || raw === "1";
}

export const enqueueWebhookEvent = internalMutation({
    args: { payload: v.any() },
    handler: async (ctx, args) => {
        const { eventType, eventId, livemode } = readPayMongoEvent(args.payload);
        if (!eventType || !eventId) {
            throw new Error("Invalid PayMongo webhook payload");
        }

        const existing = await ctx.db
            .query("webhook_events")
            .withIndex("by_provider_eventId", (q) => q.eq("provider", "paymongo").eq("eventId", eventId))
            .unique();

        if (existing && existing.status !== "FAILED") {
            return { duplicate: true };
        }

        const expectedLivemode = expectedPayMongoLivemode();
        const livemodeMismatch = typeof expectedLivemode === "boolean" && typeof livemode === "boolean" && livemode !== expectedLivemode;
        const webhookEventId = existing?._id ?? await ctx.db.insert("webhook_events", {
            provider: "paymongo",
            eventId,
            eventType,
            livemode,
            payload: args.payload,
            status: livemodeMismatch ? "PROCESSED" : "QUEUED",
            ...(livemodeMismatch ? { processedAt: Date.now(), error: "Ignored due to livemode mismatch" } : {}),
        });

        if (existing?.status === "FAILED") {
            await ctx.db.patch(existing._id, {
                payload: args.payload,
                status: livemodeMismatch ? "PROCESSED" : "QUEUED",
                processedAt: livemodeMismatch ? Date.now() : undefined,
                error: livemodeMismatch ? "Ignored due to livemode mismatch" : undefined,
            });
        }

        if (livemodeMismatch) {
            return { duplicate: false };
        }

        await ctx.scheduler.runAfter(0, internal.paymongo.processWebhookEvent, { webhookEventId });
        return { duplicate: false };
    },
});

export const processWebhookEvent = internalMutation({
    args: { webhookEventId: v.id("webhook_events") },
    handler: async (ctx, args) => {
        const record = await ctx.db.get(args.webhookEventId);
        if (!record || record.provider !== "paymongo") return;
        if (record.status === "PROCESSED") return;

        try {
            const { eventType, eventData } = readPayMongoEvent(record.payload);
            const attributes = eventData?.attributes ?? {};

            switch (eventType) {
                case "checkout_session.payment.paid": {
                    const checkoutSessionId = eventData.id;
                    const paymentIntent = attributes.payment_intent;
                    const paidPayment = Array.isArray(attributes.payments)
                        ? attributes.payments.find((payment: any) => payment?.attributes?.status === "paid") ?? attributes.payments[0]
                        : undefined;

                    await ctx.runMutation(internal.paymongo.updatePaymentStatus, {
                        checkoutSessionId,
                        paymentIntentId: paymentIntent?.id,
                        status: "PAID",
                        paymentMethod: paidPayment?.attributes?.source?.type ?? paymentIntent?.attributes?.payment_method_type,
                        transactionId: paidPayment?.id ?? paymentIntent?.id,
                        paidAt: Date.now(),
                    });
                    break;
                }

                case "payment.paid": {
                    const paymentIntentId = attributes.payment_intent_id;
                    await ctx.runMutation(internal.paymongo.updatePaymentStatus, {
                        paymentIntentId,
                        status: "PAID",
                        paymentMethod: attributes.source?.type,
                        transactionId: eventData.id,
                        paidAt: Date.now(),
                    });
                    break;
                }

                case "payment.failed": {
                    const paymentIntentId = attributes.payment_intent_id;
                    await ctx.runMutation(internal.paymongo.updatePaymentStatus, {
                        paymentIntentId,
                        status: "FAILED",
                    });
                    break;
                }

                default:
                    break;
            }

            await ctx.db.patch(record._id, {
                status: "PROCESSED",
                processedAt: Date.now(),
                error: undefined,
            });
        } catch (error) {
            await ctx.db.patch(record._id, {
                status: "FAILED",
                error: error instanceof Error ? error.message : "Unknown webhook processing error",
            });
            throw error;
        }
    },
});
