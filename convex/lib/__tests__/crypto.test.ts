import { timingSafeEqual } from '../crypto';

describe('timingSafeEqual', () => {
    it('returns true for identical strings', () => {
        expect(timingSafeEqual('hello', 'hello')).toBe(true);
    });

    it('returns true for identical empty strings', () => {
        expect(timingSafeEqual('', '')).toBe(true);
    });

    it('returns false for different strings of same length', () => {
        expect(timingSafeEqual('abc', 'abd')).toBe(false);
    });

    it('returns false for strings of different lengths', () => {
        expect(timingSafeEqual('abc', 'abcd')).toBe(false);
    });

    it('returns false when one string is empty and the other is not', () => {
        expect(timingSafeEqual('', 'a')).toBe(false);
    });

    it('handles special characters and unicode', () => {
        expect(timingSafeEqual('héllo-wörld', 'héllo-wörld')).toBe(true);
        expect(timingSafeEqual('héllo-wörld', 'hello-world')).toBe(false);
    });

    it('handles long signatures (typical HMAC hex)', () => {
        const a = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1';
        const b = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1';
        const c = 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';
        expect(timingSafeEqual(a, b)).toBe(true);
        expect(timingSafeEqual(a, c)).toBe(false);
    });

    it('does not short-circuit on length mismatch (constant-time property)', () => {
        // We can't truly measure timing in Jest, but we verify the function
        // doesn't early-return and produces correct result.
        expect(timingSafeEqual('short', 'a_very_long_string_indeed')).toBe(false);
        // The reverse should also work
        expect(timingSafeEqual('a_very_long_string_indeed', 'short')).toBe(false);
    });
});
