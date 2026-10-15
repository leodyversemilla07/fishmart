import { timingSafeEqual } from "./crypto";

export const WEBHOOK_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

export type PaymongoSignatureParts = {
    timestamp: number | null;
    testSignature: string | null;
    liveSignature: string | null;
};

/**
 * Parses the `Paymongo-Signature` header, e.g.
 * `t=1496734173,te=abc...,li=` (test event) or `t=1496734173,te=,li=abc...` (live event).
 */
export function parsePaymongoSignatureHeader(header: string): PaymongoSignatureParts {
    const parts: PaymongoSignatureParts = { timestamp: null, testSignature: null, liveSignature: null };

    for (const segment of header.split(",")) {
        const separatorIndex = segment.indexOf("=");
        if (separatorIndex === -1) continue;

        const key = segment.slice(0, separatorIndex).trim();
        const value = segment.slice(separatorIndex + 1).trim();
        if (!value) continue;

        if (key === "t") {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) {
                parts.timestamp = parsed;
            }
        } else if (key === "te") {
            parts.testSignature = value.toLowerCase();
        } else if (key === "li") {
            parts.liveSignature = value.toLowerCase();
        }
    }

    return parts;
}

/** PayMongo signs the string `{timestamp}.{rawBody}` (timestamp in unix seconds). */
export function buildPaymongoSignatureMessage(timestamp: number, rawBody: string) {
    return `${timestamp}.${rawBody}`;
}

export async function computeHmacSha256Hex(message: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
    return Array.from(new Uint8Array(signature))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

export function isPaymongoTimestampFresh(
    timestamp: number,
    now = Date.now(),
    toleranceMs = WEBHOOK_TIMESTAMP_TOLERANCE_MS
) {
    return Math.abs(now - timestamp * 1000) <= toleranceMs;
}

export type PaymongoVerificationResult = { ok: true } | { ok: false; reason: string };

export async function verifyPaymongoWebhookSignature(args: {
    rawBody: string;
    signatureHeader: string | null;
    secret: string;
    now?: number;
}): Promise<PaymongoVerificationResult> {
    const { rawBody, signatureHeader, secret, now } = args;

    if (!signatureHeader) {
        return { ok: false, reason: "Missing Paymongo-Signature header" };
    }

    const parts = parsePaymongoSignatureHeader(signatureHeader);
    if (parts.timestamp === null) {
        return { ok: false, reason: "Missing timestamp in Paymongo-Signature header" };
    }
    if (!isPaymongoTimestampFresh(parts.timestamp, now)) {
        return { ok: false, reason: "Signature timestamp is outside the tolerance window" };
    }

    const expected = await computeHmacSha256Hex(buildPaymongoSignatureMessage(parts.timestamp, rawBody), secret);
    const candidates = [parts.testSignature, parts.liveSignature].filter(
        (candidate): candidate is string => Boolean(candidate)
    );
    if (candidates.length === 0) {
        return { ok: false, reason: "Paymongo-Signature header contains no signature values" };
    }

    const matches = candidates.some((candidate) => timingSafeEqual(candidate, expected));
    return matches ? { ok: true } : { ok: false, reason: "Signature mismatch" };
}
