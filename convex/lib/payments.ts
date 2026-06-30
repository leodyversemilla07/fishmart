/**
 * Normalize a raw payment method string to an internal enum value.
 * Returns undefined for unrecognised methods.
 */
export function normalizePaymentMethod(paymentMethod: string | undefined): "GCASH" | "MAYA" | "CARD" | "BANK_TRANSFER" | "COD" | undefined {
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

/**
 * Convert an internal payment method enum to PayMongo's API string.
 * Only supports online methods; throws for COD.
 */
export function toPayMongoPaymentMethod(paymentMethod: "GCASH" | "MAYA" | "CARD" | "BANK_TRANSFER" | "COD"): string {
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
