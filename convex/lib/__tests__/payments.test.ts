import { normalizePaymentMethod, toPayMongoPaymentMethod } from '../payments';

describe('normalizePaymentMethod', () => {
    it('normalizes "gcash" to GCASH', () => {
        expect(normalizePaymentMethod('gcash')).toBe('GCASH');
    });

    it('normalizes "GCASH" to GCASH', () => {
        expect(normalizePaymentMethod('GCASH')).toBe('GCASH');
    });

    it('normalizes "maya" to MAYA', () => {
        expect(normalizePaymentMethod('maya')).toBe('MAYA');
    });

    it('normalizes "paymaya" to MAYA', () => {
        expect(normalizePaymentMethod('paymaya')).toBe('MAYA');
    });

    it('normalizes "MAYA" to MAYA', () => {
        expect(normalizePaymentMethod('MAYA')).toBe('MAYA');
    });

    it('normalizes "card" to CARD', () => {
        expect(normalizePaymentMethod('card')).toBe('CARD');
    });

    it('normalizes "bank_transfer" to BANK_TRANSFER', () => {
        expect(normalizePaymentMethod('bank_transfer')).toBe('BANK_TRANSFER');
    });

    it('normalizes "cod" to COD', () => {
        expect(normalizePaymentMethod('cod')).toBe('COD');
    });

    it('returns undefined for unknown methods', () => {
        expect(normalizePaymentMethod('bitcoin')).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
        expect(normalizePaymentMethod('')).toBeUndefined();
    });

    it('returns undefined for undefined', () => {
        expect(normalizePaymentMethod(undefined)).toBeUndefined();
    });
});

describe('toPayMongoPaymentMethod', () => {
    it('converts GCASH to "gcash"', () => {
        expect(toPayMongoPaymentMethod('GCASH')).toBe('gcash');
    });

    it('converts MAYA to "paymaya"', () => {
        expect(toPayMongoPaymentMethod('MAYA')).toBe('paymaya');
    });

    it('converts CARD to "card"', () => {
        expect(toPayMongoPaymentMethod('CARD')).toBe('card');
    });

    it('converts BANK_TRANSFER to "bank_transfer"', () => {
        expect(toPayMongoPaymentMethod('BANK_TRANSFER')).toBe('bank_transfer');
    });

    it('throws for COD', () => {
        expect(() => toPayMongoPaymentMethod('COD')).toThrow('Unsupported online payment method');
    });
});
