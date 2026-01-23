/**
 * PayMongo Payment Integration for Fishmart
 * 
 * Handles payment processing via PayMongo's Checkout Session API.
 * Supports GCash, Maya, and Credit Card payments.
 */

import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// PayMongo API configuration
const PAYMONGO_API_URL = "https://api.paymongo.com/v1";

// Helper to get API key from environment
const getPayMongoSecretKey = () => {
    const key = process.env.PAYMONGO_SECRET_KEY;
    if (!key) {
        throw new Error("PAYMONGO_SECRET_KEY environment variable is not set");
    }
    return key;
};

// Base64 encode for Basic Auth
const encodeCredentials = (secretKey: string) => {
    // In Convex, use btoa for base64 encoding
    return btoa(`${secretKey}:`);
};

/**
 * Create a PayMongo Checkout Session
 * Returns a checkout URL for the user to complete payment
 */
export const createCheckoutSession = action({
    args: {
        orderId: v.id("orders"),
        orderNumber: v.string(),
        items: v.array(v.object({
            name: v.string(),
            quantity: v.number(),
            amount: v.number(), // In PHP (will be converted to centavos)
            imageUrl: v.optional(v.string()),
        })),
        totalAmount: v.number(), // In PHP
        buyerEmail: v.string(),
        buyerName: v.string(),
        buyerPhone: v.optional(v.string()),
        successUrl: v.string(),
        cancelUrl: v.string(),
    },
    handler: async (ctx, args): Promise<{ checkoutUrl: string; sessionId: string } | { error: string }> => {
        try {
            const secretKey = getPayMongoSecretKey();
            
            // Convert line items to PayMongo format (amount in centavos)
            const lineItems = args.items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                amount: Math.round(item.amount * 100), // Convert PHP to centavos
                currency: "PHP",
                ...(item.imageUrl && { images: [item.imageUrl] }),
            }));

            const payload = {
                data: {
                    attributes: {
                        line_items: lineItems,
                        payment_method_types: ["gcash", "paymaya", "card", "grab_pay"],
                        success_url: args.successUrl,
                        cancel_url: args.cancelUrl,
                        description: `Fishmart Order #${args.orderNumber}`,
                        reference_number: args.orderNumber,
                        send_email_receipt: true,
                        show_description: true,
                        show_line_items: true,
                        billing: {
                            name: args.buyerName,
                            email: args.buyerEmail,
                            ...(args.buyerPhone && { phone: args.buyerPhone }),
                        },
                        metadata: {
                            order_id: args.orderId,
                            order_number: args.orderNumber,
                        },
                    },
                },
            };

            const response = await fetch(`${PAYMONGO_API_URL}/checkout_sessions`, {
                method: "POST",
                headers: {
                    "Authorization": `Basic ${encodeCredentials(secretKey)}`,
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

            // Store payment record
            await ctx.runMutation(internal.paymongo.createPaymentRecord, {
                orderId: args.orderId,
                amount: args.totalAmount,
                paymentMethod: "PENDING", // Will be updated by webhook
                paymentIntentId: sessionId,
            });

            return { checkoutUrl, sessionId };
        } catch (error) {
            console.error("Error creating checkout session:", error);
            return { error: error instanceof Error ? error.message : "Unknown error occurred" };
        }
    },
});

/**
 * Retrieve a checkout session to check payment status
 */
export const getCheckoutSession = action({
    args: {
        sessionId: v.string(),
    },
    handler: async (ctx, args): Promise<{ status: string; paymentIntent?: any } | { error: string }> => {
        try {
            const secretKey = getPayMongoSecretKey();

            const response = await fetch(`${PAYMONGO_API_URL}/checkout_sessions/${args.sessionId}`, {
                method: "GET",
                headers: {
                    "Authorization": `Basic ${encodeCredentials(secretKey)}`,
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

/**
 * Internal mutation to create payment record
 */
export const createPaymentRecord = internalMutation({
    args: {
        orderId: v.id("orders"),
        amount: v.number(),
        paymentMethod: v.string(),
        paymentIntentId: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("payments", {
            orderId: args.orderId,
            amount: args.amount,
            paymentMethod: args.paymentMethod as any,
            status: "PENDING",
            paymentIntentId: args.paymentIntentId,
        });
    },
});

/**
 * Internal mutation to update payment status (called by webhook)
 */
export const updatePaymentStatus = internalMutation({
    args: {
        paymentIntentId: v.string(),
        status: v.string(),
        paymentMethod: v.optional(v.string()),
        transactionId: v.optional(v.string()),
        paidAt: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const payment = await ctx.db
            .query("payments")
            .withIndex("by_paymentIntentId", (q) => q.eq("paymentIntentId", args.paymentIntentId))
            .first();

        if (!payment) {
            throw new Error(`Payment not found for intent: ${args.paymentIntentId}`);
        }

        // Update payment record
        await ctx.db.patch(payment._id, {
            status: args.status as any,
            ...(args.paymentMethod && { paymentMethod: args.paymentMethod as any }),
            ...(args.transactionId && { transactionId: args.transactionId }),
            ...(args.paidAt && { paidAt: args.paidAt }),
        });

        // If payment is successful, update order status
        if (args.status === "PAID") {
            const order = await ctx.db.get(payment.orderId);
            if (order) {
                await ctx.db.patch(payment.orderId, {
                    paymentStatus: "PAID",
                    status: "CONFIRMED",
                    confirmedAt: Date.now(),
                });

                // Notify buyer
                await ctx.runMutation(internal.notifications.create, {
                    userId: order.buyerId,
                    type: "PAYMENT_SUCCESS",
                    title: "Payment Successful",
                    message: `Your payment for order ${order.orderNumber} has been confirmed.`,
                    data: { orderId: payment.orderId, orderNumber: order.orderNumber },
                });
            }
        } else if (args.status === "FAILED") {
            await ctx.db.patch(payment.orderId, {
                paymentStatus: "FAILED",
            });
        }

        return payment._id;
    },
});
