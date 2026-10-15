import {
  applyOrderInventoryIfNeededForTests,
  getReservationExpiryTimestamp,
  revertOrderInventoryIfCommittedForTests,
} from '../orders';
import type { Id, TableNames } from '../../_generated/dataModel';
import type { InventoryMutationTestContext } from '../orders';

function toId<TableName extends TableNames>(value: string): Id<TableName> {
  return value as Id<TableName>;
}

function createCtx(quantities: number[] = [2]) {
  const productId = toId<'products'>('product-1');
  const orderId = toId<'orders'>('order-1');
  const sellerId = toId<'users'>('seller-1');

  const products = new Map<
    string,
    { name: string; status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK'; stock: number; sales: number }
  >([
    [String(productId), { name: 'Fish Pair', status: 'ACTIVE', stock: 5, sales: 1 }],
  ]);
  const orders = new Map<
    string,
    { _id: Id<'orders'>; orderNumber: string; inventoryCommittedAt: number | undefined }
  >([
    [String(orderId), { _id: orderId, orderNumber: 'ORD-1', inventoryCommittedAt: undefined }],
  ]);
  const orderItems = quantities.map((quantity) => ({
    productId,
    sellerId,
    quantity,
    productName: 'Fish Pair',
  }));
  const notifications: unknown[] = [];

  const ctx: InventoryMutationTestContext = {
    db: {
      get: jest.fn(async (id) => products.get(String(id)) || null),
      patch: jest.fn(async (id, updates) => {
        const key = String(id);
        if (products.has(key)) {
          const current = products.get(key);
          if (current) {
            products.set(key, { ...current, ...updates });
          }
          return;
        }
        if (orders.has(key)) {
          const current = orders.get(key);
          if (current) {
            orders.set(key, { ...current, ...updates });
          }
        }
      }),
      query: jest.fn((table: 'order_items') => ({
        withIndex: (
          _index: 'by_order',
          callback: (q: { eq: (field: 'orderId', value: Id<'orders'>) => unknown }) => unknown
        ) => {
          callback({ eq: jest.fn().mockReturnThis() });
          if (table === 'order_items') {
            return {
              collect: async () => orderItems,
            };
          }
          throw new Error(`Unexpected table ${table}`);
        },
      })),
    },
    runMutation: jest.fn(async (_ref: unknown, payload: unknown) => {
      notifications.push(payload);
    }),
  };

  return { ctx, products, orders, notifications, orderId, productId };
}

describe('order inventory helper', () => {
  it('applies stock and notifications only once', async () => {
    const { ctx, products, orders, notifications, orderId, productId } = createCtx();

    const order = orders.get(String(orderId));
    if (!order) throw new Error('Order not found');
    const first = await applyOrderInventoryIfNeededForTests(ctx, order);
    const updatedOrder = orders.get(String(orderId));
    if (!updatedOrder) throw new Error('Updated order not found');
    const second = await applyOrderInventoryIfNeededForTests(ctx, updatedOrder);

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(products.get(String(productId))).toMatchObject({ stock: 3, sales: 3 });
    expect(orders.get(String(orderId))?.inventoryCommittedAt).toBeDefined();
    expect(notifications).toHaveLength(1);
  });

  it('reverts committed inventory once', async () => {
    const { ctx, products, orders, orderId, productId } = createCtx();

    const order = orders.get(String(orderId));
    if (!order) throw new Error('Order not found');

    await applyOrderInventoryIfNeededForTests(ctx, order);
    const committedOrder = orders.get(String(orderId));
    if (!committedOrder) throw new Error('Committed order not found');

    const firstRevert = await revertOrderInventoryIfCommittedForTests(ctx, committedOrder);
    const secondOrderState = orders.get(String(orderId));
    if (!secondOrderState) throw new Error('Reverted order not found');
    const secondRevert = await revertOrderInventoryIfCommittedForTests(ctx, secondOrderState);

    expect(firstRevert).toBe(true);
    expect(secondRevert).toBe(false);
    expect(products.get(String(productId))).toMatchObject({ stock: 5, sales: 1 });
  });

  it('aggregates duplicate lines into a single stock deduction and notification', async () => {
    const { ctx, products, orders, notifications, orderId, productId } = createCtx([2, 2]);

    const order = orders.get(String(orderId));
    if (!order) throw new Error('Order not found');
    const applied = await applyOrderInventoryIfNeededForTests(ctx, order);

    expect(applied).toBe(true);
    expect(products.get(String(productId))).toMatchObject({ stock: 1, sales: 5 });
    expect(notifications).toHaveLength(1);
  });

  it('rejects fractional quantities', async () => {
    const { ctx, orders, orderId } = createCtx([1.5]);

    const order = orders.get(String(orderId));
    if (!order) throw new Error('Order not found');
    await expect(applyOrderInventoryIfNeededForTests(ctx, order)).rejects.toThrow('whole number');
  });

  it('returns reservation expiry for non-COD methods', () => {
    const base = 1_700_000_000_000;
    const codExpiry = getReservationExpiryTimestamp('COD', base);
    const onlineExpiry = getReservationExpiryTimestamp('GCASH', base);

    expect(codExpiry).toBeUndefined();
    expect(onlineExpiry).toBeGreaterThan(base);
  });
});
