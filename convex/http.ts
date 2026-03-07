import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

async function hmacSha256(value: string, secret: string) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
    return Array.from(new Uint8Array(signature))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

async function verifyPayMongoSignature(rawBody: string, signatureHeader: string | null) {
    const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
    if (!secret) {
        throw new Error("PAYMONGO_WEBHOOK_SECRET environment variable is not set");
    }
    if (!signatureHeader) {
        throw new Error("Missing PayMongo signature header");
    }

    const expected = await hmacSha256(rawBody, secret);
    const candidates = signatureHeader
        .split(",")
        .map((part) => part.split("=").pop()?.trim().toLowerCase())
        .filter(Boolean);

    if (!candidates.includes(expected.toLowerCase())) {
        throw new Error("Invalid PayMongo webhook signature");
    }
}

http.route({
    path: "/webhooks/paymongo",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            const rawBody = await request.text();
            const signatureHeader =
                request.headers.get("paymongo-signature") ||
                request.headers.get("Paymongo-Signature") ||
                request.headers.get("x-paymongo-signature");

            await verifyPayMongoSignature(rawBody, signatureHeader);

            const body = JSON.parse(rawBody);
            const event = body.data;
            const eventType = event.attributes.type;
            const eventData = event.attributes.data;

            switch (eventType) {
                case "checkout_session.payment.paid": {
                    const checkoutSessionId = eventData.id;
                    const paymentIntent = eventData.attributes.payment_intent;

                    await ctx.runMutation(internal.paymongo.updatePaymentStatus, {
                        checkoutSessionId,
                        paymentIntentId: paymentIntent?.id,
                        status: "PAID",
                        paymentMethod: paymentIntent?.attributes?.payment_method_type,
                        transactionId: paymentIntent?.id,
                        paidAt: Date.now(),
                    });
                    break;
                }

                case "payment.paid": {
                    const paymentIntentId = eventData.attributes.payment_intent_id;
                    await ctx.runMutation(internal.paymongo.updatePaymentStatus, {
                        paymentIntentId,
                        status: "PAID",
                        paymentMethod: eventData.attributes.source?.type,
                        transactionId: eventData.id,
                        paidAt: Date.now(),
                    });
                    break;
                }

                case "payment.failed": {
                    const paymentIntentId = eventData.attributes.payment_intent_id;
                    await ctx.runMutation(internal.paymongo.updatePaymentStatus, {
                        paymentIntentId,
                        status: "FAILED",
                    });
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
