import {
    WEBHOOK_TIMESTAMP_TOLERANCE_MS,
    buildPaymongoSignatureMessage,
    computeHmacSha256Hex,
    isPaymongoTimestampFresh,
    parsePaymongoSignatureHeader,
    verifyPaymongoWebhookSignature,
} from "../webhooks";

const SECRET = "whsec_test";
// HMAC-SHA256("whsec_test", '1700000000.{"test":true}')
const KNOWN_VECTOR = "395b63b00c18dcbab1f1bad844e912306ea32004c97b1216a610740951f35369";

describe("parsePaymongoSignatureHeader", () => {
    it("parses test-mode headers", () => {
        const parts = parsePaymongoSignatureHeader(`t=1496734173,te=${KNOWN_VECTOR},li=`);
        expect(parts.timestamp).toBe(1496734173);
        expect(parts.testSignature).toBe(KNOWN_VECTOR);
        expect(parts.liveSignature).toBeNull();
    });

    it("parses live-mode headers", () => {
        const parts = parsePaymongoSignatureHeader(`t=1492224173,te=,li=${KNOWN_VECTOR}`);
        expect(parts.timestamp).toBe(1492224173);
        expect(parts.testSignature).toBeNull();
        expect(parts.liveSignature).toBe(KNOWN_VECTOR);
    });

    it("tolerates whitespace and ignores unknown keys", () => {
        const parts = parsePaymongoSignatureHeader(` t=1700000000 , te=${KNOWN_VECTOR} , xx=whatever`);
        expect(parts.timestamp).toBe(1700000000);
        expect(parts.testSignature).toBe(KNOWN_VECTOR);
    });

    it("returns nulls for malformed input", () => {
        const parts = parsePaymongoSignatureHeader("garbage");
        expect(parts).toEqual({ timestamp: null, testSignature: null, liveSignature: null });
    });
});

describe("computeHmacSha256Hex", () => {
    it("matches a known HMAC-SHA256 vector", async () => {
        const message = buildPaymongoSignatureMessage(1700000000, '{"test":true}');
        await expect(computeHmacSha256Hex(message, SECRET)).resolves.toBe(KNOWN_VECTOR);
    });
});

describe("buildPaymongoSignatureMessage", () => {
    it("concatenates the timestamp and payload with a period", () => {
        expect(buildPaymongoSignatureMessage(1700000000, "body")).toBe("1700000000.body");
    });
});

describe("isPaymongoTimestampFresh", () => {
    it("accepts timestamps within the tolerance window", () => {
        const now = 1_700_000_000_000;
        expect(isPaymongoTimestampFresh(1_700_000_000, now)).toBe(true);
        expect(isPaymongoTimestampFresh(1_700_000_000, now + WEBHOOK_TIMESTAMP_TOLERANCE_MS)).toBe(true);
    });

    it("rejects timestamps outside the tolerance window", () => {
        const now = 1_700_000_000_000;
        expect(isPaymongoTimestampFresh(1_700_000_000, now + WEBHOOK_TIMESTAMP_TOLERANCE_MS + 1)).toBe(false);
        expect(isPaymongoTimestampFresh(1_700_000_000, now - WEBHOOK_TIMESTAMP_TOLERANCE_MS - 1)).toBe(false);
    });
});

describe("verifyPaymongoWebhookSignature", () => {
    const rawBody = '{"test":true}';
    const timestamp = 1_700_000_000;
    const now = timestamp * 1000;
    let validSignature: string;

    beforeAll(async () => {
        validSignature = await computeHmacSha256Hex(buildPaymongoSignatureMessage(timestamp, rawBody), SECRET);
    });

    it("accepts a correctly signed test-mode request", async () => {
        const result = await verifyPaymongoWebhookSignature({
            rawBody,
            signatureHeader: `t=${timestamp},te=${validSignature},li=`,
            secret: SECRET,
            now,
        });
        expect(result).toEqual({ ok: true });
    });

    it("accepts a correctly signed live-mode request", async () => {
        const result = await verifyPaymongoWebhookSignature({
            rawBody,
            signatureHeader: `t=${timestamp},te=,li=${validSignature}`,
            secret: SECRET,
            now,
        });
        expect(result).toEqual({ ok: true });
    });

    it("rejects a signature computed over the raw body only", async () => {
        const bodyOnlySignature = await computeHmacSha256Hex(rawBody, SECRET);
        const result = await verifyPaymongoWebhookSignature({
            rawBody,
            signatureHeader: `t=${timestamp},te=${bodyOnlySignature},li=`,
            secret: SECRET,
            now,
        });
        expect(result.ok).toBe(false);
    });

    it("rejects tampered payloads", async () => {
        const result = await verifyPaymongoWebhookSignature({
            rawBody: '{"test":false}',
            signatureHeader: `t=${timestamp},te=${validSignature},li=`,
            secret: SECRET,
            now,
        });
        expect(result.ok).toBe(false);
    });

    it("rejects stale timestamps", async () => {
        const result = await verifyPaymongoWebhookSignature({
            rawBody,
            signatureHeader: `t=${timestamp},te=${validSignature},li=`,
            secret: SECRET,
            now: now + WEBHOOK_TIMESTAMP_TOLERANCE_MS + 1,
        });
        expect(result.ok).toBe(false);
    });

    it("rejects a wrong secret", async () => {
        const result = await verifyPaymongoWebhookSignature({
            rawBody,
            signatureHeader: `t=${timestamp},te=${validSignature},li=`,
            secret: "whsec_other",
            now,
        });
        expect(result.ok).toBe(false);
    });

    it("rejects missing or malformed headers", async () => {
        await expect(
            verifyPaymongoWebhookSignature({ rawBody, signatureHeader: null, secret: SECRET, now })
        ).resolves.toMatchObject({ ok: false });
        await expect(
            verifyPaymongoWebhookSignature({ rawBody, signatureHeader: "garbage", secret: SECRET, now })
        ).resolves.toMatchObject({ ok: false });
    });
});
