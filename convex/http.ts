import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { timingSafeEqual } from "./lib/crypto";

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

    const expected = (await hmacSha256(rawBody, secret)).toLowerCase();
    const candidates = signatureHeader
        .split(",")
        .map((part) => part.split("=").pop()?.trim().toLowerCase())
        .filter((candidate): candidate is string => Boolean(candidate));

    if (!candidates.some((candidate) => timingSafeEqual(candidate, expected))) {
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
            await ctx.runMutation(internal.paymongo.enqueueWebhookEvent, { payload: body });

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
