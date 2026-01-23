/**
 * Convex HTTP Endpoints
 * 
 * Handles webhooks and other HTTP-based integrations.
 */

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

/**
 * PayMongo Webhook Handler
 * 
 * Receives payment events from PayMongo and updates order/payment status.
 * 
 * Events handled:
 * - checkout_session.payment.paid - Payment successful
 * - payment.paid - Direct payment successful
 * - payment.failed - Payment failed
 */
http.route({
    path: "/webhooks/paymongo",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            const body = await request.json();
            const event = body.data;
            
            console.log("PayMongo webhook received:", event.attributes.type);

            // Verify webhook signature (optional but recommended)
            // const signature = request.headers.get("Paymongo-Signature");
            // TODO: Implement signature verification for production

            const eventType = event.attributes.type;
            const eventData = event.attributes.data;

            switch (eventType) {
                case "checkout_session.payment.paid": {
                    // Payment completed through checkout session
                    const checkoutSessionId = eventData.id;
                    const paymentIntent = eventData.attributes.payment_intent;
                    
                    await ctx.runMutation(internal.paymongo.updatePaymentStatus, {
                        paymentIntentId: checkoutSessionId,
                        status: "PAID",
                        paymentMethod: paymentIntent?.attributes?.payment_method_type?.toUpperCase(),
                        transactionId: paymentIntent?.id,
                        paidAt: Date.now(),
                    });
                    break;
                }

                case "payment.paid": {
                    // Direct payment successful
                    const paymentId = eventData.attributes.payment_intent_id;
                    
                    if (paymentId) {
                        await ctx.runMutation(internal.paymongo.updatePaymentStatus, {
                            paymentIntentId: paymentId,
                            status: "PAID",
                            paymentMethod: eventData.attributes.source?.type?.toUpperCase(),
                            transactionId: eventData.id,
                            paidAt: Date.now(),
                        });
                    }
                    break;
                }

                case "payment.failed": {
                    // Payment failed
                    const paymentId = eventData.attributes.payment_intent_id;
                    
                    if (paymentId) {
                        await ctx.runMutation(internal.paymongo.updatePaymentStatus, {
                            paymentIntentId: paymentId,
                            status: "FAILED",
                        });
                    }
                    break;
                }

                default:
                    console.log("Unhandled webhook event:", eventType);
            }

            return new Response(JSON.stringify({ received: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Webhook error:", error);
            return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    }),
});

// Health check endpoint
http.route({
    path: "/health",
    method: "GET",
    handler: httpAction(async () => {
        return new Response(JSON.stringify({ status: "ok", timestamp: Date.now() }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }),
});

export default http;
