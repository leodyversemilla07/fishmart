import { applyOrderInventoryIfNeeded } from '../orders';

function createCtx() {
  const products = new Map([
    ['product-1', { _id: 'product-1', name: 'Fish Pair', status: 'ACTIVE', stock: 5, sales: 1 }],
  ]);
  const orders = new Map([
    ['order-1', { _id: 'order-1', orderNumber: 'ORD-1', inventoryCommittedAt: undefined }],
  ]);
  const orderItems = [
    {
      _id: 'item-1',
      orderId: 'order-1',
      productId: 'product-1',
      sellerId: 'seller-1',
      quantity: 2,
      productName: 'Fish Pair',
    },
  ];
  const notifications: any[] = [];

  const ctx: any = {
    db: {
      get: jest.fn(async (id: string) => products.get(id) || orders.get(id) || null),
      patch: jest.fn(async (id: string, updates: Record<string, unknown>) => {
        if (products.has(id)) {
          products.set(id, { ...products.get(id), ...updates });
          return;
        }
        if (orders.has(id)) {
          orders.set(id, { ...orders.get(id), ...updates });
        }
      }),
      query: jest.fn((table: string) => ({
        withIndex: (_index: string, callback: any) => {
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

  return { ctx, products, orders, notifications };
}

describe('order inventory helper', () => {
  it('applies stock and notifications only once', async () => {
    const { ctx, products, orders, notifications } = createCtx();

    const first = await applyOrderInventoryIfNeeded(ctx, orders.get('order-1') as any);
    const second = await applyOrderInventoryIfNeeded(ctx, orders.get('order-1') as any);

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(products.get('product-1')).toMatchObject({ stock: 3, sales: 3 });
    expect(orders.get('order-1')?.inventoryCommittedAt).toBeDefined();
    expect(notifications).toHaveLength(1);
  });
});
