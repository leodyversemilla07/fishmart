import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { verifyPaymongoWebhookSignature } from "./lib/webhooks";

const http = httpRouter();

function jsonResponse(body: Record<string, unknown>, status: number) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

http.route({
    path: "/webhooks/paymongo",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
        if (!secret) {
            console.error("PAYMONGO_WEBHOOK_SECRET environment variable is not set");
            return jsonResponse({ error: "Webhook is not configured" }, 500);
        }

        const rawBody = await request.text();
        const signatureHeader =
            request.headers.get("paymongo-signature") ||
            request.headers.get("x-paymongo-signature");

        const verification = await verifyPaymongoWebhookSignature({
            rawBody,
            signatureHeader,
            secret,
        });
        if (!verification.ok) {
            console.warn(`Rejected PayMongo webhook: ${verification.reason}`);
            return jsonResponse({ error: "Invalid signature" }, 401);
        }

        let payload: unknown;
        try {
            payload = JSON.parse(rawBody);
        } catch {
            return jsonResponse({ error: "Invalid JSON payload" }, 400);
        }

        try {
            await ctx.runMutation(internal.paymongo.enqueueWebhookEvent, { payload });
            return jsonResponse({ received: true }, 200);
        } catch (error) {
            console.error("Webhook processing failed:", error);
            return jsonResponse({ error: "Webhook processing failed" }, 500);
        }
    }),
});

http.route({
    path: "/health",
    method: "GET",
    handler: httpAction(async () => {
        return jsonResponse({ status: "ok", timestamp: Date.now() }, 200);
    }),
});

export default http;
