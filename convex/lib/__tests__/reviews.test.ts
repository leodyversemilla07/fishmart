import { hasPurchasedProductForReview, isCompletedReviewableOrder } from '../reviews';
import type { Id } from '../../_generated/dataModel';

const orderId = 'order-1' as Id<'orders'>;
const productId = 'product-1' as Id<'products'>;
const otherProductId = 'product-2' as Id<'products'>;

const baseOrder = {
  _id: orderId,
  status: 'DELIVERED' as const,
  paymentStatus: 'PAID' as const,
  paymentMethod: 'GCASH' as const,
};

describe('review eligibility helpers', () => {
  it('allows reviews for delivered paid orders containing the product', () => {
    const eligible = hasPurchasedProductForReview(
      [baseOrder],
      new Map([[orderId, [{ productId }]]]),
      productId
    );

    expect(eligible).toBe(true);
  });

  it('allows delivered COD orders even when payment status is pending', () => {
    expect(isCompletedReviewableOrder({
      ...baseOrder,
      paymentStatus: 'PENDING',
      paymentMethod: 'COD',
    })).toBe(true);
  });

  it('rejects undelivered orders and unrelated products', () => {
    expect(isCompletedReviewableOrder({ ...baseOrder, status: 'SHIPPED' })).toBe(false);

    const eligible = hasPurchasedProductForReview(
      [baseOrder],
      new Map([[orderId, [{ productId: otherProductId }]]]),
      productId
    );

    expect(eligible).toBe(false);
  });
});
