/**
 * Timing-safe string comparison to prevent timing attacks.
 * Always compares all characters up to the maximum length,
 * never short-circuits on length mismatch.
 */
export function timingSafeEqual(a: string, b: string): boolean {
    let result = a.length ^ b.length;
    const maxLength = Math.max(a.length, b.length);

    for (let i = 0; i < maxLength; i += 1) {
        result |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    }
    return result === 0;
}
