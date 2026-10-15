import { internal } from "../_generated/api";
import { Doc, Id } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";

export const SHIPPING_FEE = 50;
export const RESERVATION_WINDOW_MS = 1000 * 60 * 30; // 30 minutes

export function getReservationExpiryTimestamp(paymentMethod: Doc<"orders">["paymentMethod"], now = Date.now()) {
    return paymentMethod === "COD" ? undefined : now + RESERVATION_WINDOW_MS;
}
type OrderItemDoc = Doc<"order_items">;
type InventoryOrderRecord = Pick<Doc<"orders">, "_id" | "orderNumber" | "inventoryCommittedAt">;
type InventoryProductRecord = Pick<Doc<"products">, "name" | "status" | "stock" | "sales">;
type InventoryOrderItemRecord = Pick<Doc<"order_items">, "productId" | "sellerId" | "productName" | "quantity">;

type InventoryMutationOps = {
    getOrderItems: (orderId: Id<"orders">) => Promise<InventoryOrderItemRecord[]>;
    getProduct: (productId: Id<"products">) => Promise<InventoryProductRecord | null>;
    patch: (
        id: Id<"products"> | Id<"orders">,
        updates: { stock?: number; sales?: number; inventoryCommittedAt?: number }
    ) => Promise<void>;
    notify: (payload: {
        userId: Id<"users">;
        type: "NEW_ORDER";
        title: string;
        message: string;
        data: { orderId: Id<"orders">; orderNumber: string; productId: Id<"products"> };
    }) => Promise<unknown>;
};

type InventoryRevertOps = {
    getOrderItems: (orderId: Id<"orders">) => Promise<InventoryOrderItemRecord[]>;
    getProduct: (productId: Id<"products">) => Promise<InventoryProductRecord | null>;
    patch: (
        id: Id<"products"> | Id<"orders">,
        updates: { stock?: number; sales?: number; inventoryCommittedAt?: number }
    ) => Promise<void>;
};

export type InventoryMutationTestContext = {
    db: {
        get: (id: Id<"products">) => Promise<InventoryProductRecord | null>;
        patch: (
            id: Id<"products"> | Id<"orders">,
            updates: { stock?: number; sales?: number; inventoryCommittedAt?: number }
        ) => Promise<void>;
        query: (table: "order_items") => {
            withIndex: (
                index: "by_order",
                callback: (q: { eq: (field: "orderId", value: Id<"orders">) => unknown }) => unknown
            ) => {
                collect: () => Promise<InventoryOrderItemRecord[]>;
            };
        };
    };
    runMutation: (
        reference: unknown,
        payload: {
            userId: Id<"users">;
            type: "NEW_ORDER";
            title: string;
            message: string;
            data: { orderId: Id<"orders">; orderNumber: string; productId: Id<"products"> };
        }
    ) => Promise<unknown>;
};

export function generateOrderNumber() {
    return "ORD-" + Math.random().toString(36).toUpperCase().substring(2, 10);
}

export async function getOrderItems(ctx: QueryCtx | MutationCtx, orderId: Id<"orders">): Promise<OrderItemDoc[]> {
    return await ctx.db
        .query("order_items")
        .withIndex("by_order", (q) => q.eq("orderId", orderId))
        .collect();
}

/**
 * Aggregates line quantities per product so duplicate cart lines cannot
 * bypass stock checks or double-deduct inventory.
 */
export function aggregateOrderQuantities(items: { productId: Id<"products">; quantity: number }[]) {
    const quantities = new Map<Id<"products">, number>();
    for (const item of items) {
        if (!Number.isInteger(item.quantity) || item.quantity < 1) {
            throw new Error("Quantity must be a whole number of at least 1");
        }
        quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    }
    return quantities;
}

export async function assertOrderInventoryAvailable(
    ctx: QueryCtx | MutationCtx,
    items: { productId: Id<"products">; quantity: number }[]
) {
    if (items.length === 0) {
        throw new Error("Order must contain at least one item");
    }
    const quantities = aggregateOrderQuantities(items);

    for (const [productId, quantity] of quantities) {
        const product = await ctx.db.get(productId);
        if (!product || product.status !== "ACTIVE") {
            throw new Error("One or more products are unavailable");
        }
        if (product.stock < quantity) {
            throw new Error(`Insufficient stock for ${product.name}`);
        }
    }
}

async function applyOrderInventoryCore(ops: InventoryMutationOps, order: InventoryOrderRecord) {
    if (order.inventoryCommittedAt) {
        return false;
    }

    const items = await ops.getOrderItems(order._id);
    const aggregated = new Map<Id<"products">, { quantity: number; sellerId: Id<"users">; productName: string }>();
    for (const item of items) {
        if (!Number.isInteger(item.quantity) || item.quantity < 1) {
            throw new Error("Quantity must be a whole number of at least 1");
        }
        const entry = aggregated.get(item.productId);
        if (entry) {
            entry.quantity += item.quantity;
        } else {
            aggregated.set(item.productId, {
                quantity: item.quantity,
                sellerId: item.sellerId,
                productName: item.productName,
            });
        }
    }

    for (const [productId, { quantity }] of aggregated) {
        const product = await ops.getProduct(productId);
        if (!product || product.status !== "ACTIVE") {
            throw new Error("One or more products are unavailable");
        }
        if (product.stock < quantity) {
            throw new Error(`Insufficient stock for ${product.name}`);
        }
    }

    for (const [productId, { quantity, sellerId, productName }] of aggregated) {
        const product = await ops.getProduct(productId);
        if (!product) {
            throw new Error("Product missing during inventory commit");
        }

        await ops.patch(productId, {
            stock: product.stock - quantity,
            sales: (product.sales || 0) + quantity,
        });

        await ops.notify({
            userId: sellerId,
            type: "NEW_ORDER",
            title: "New Order Received!",
            message: `You have a new order for ${productName} (x${quantity})`,
            data: { orderId: order._id, orderNumber: order.orderNumber, productId },
        });
    }

    await ops.patch(order._id, { inventoryCommittedAt: Date.now() });
    return true;
}

export async function applyOrderInventoryIfNeeded(ctx: MutationCtx, order: Doc<"orders">) {
    return applyOrderInventoryCore(
        {
            getOrderItems: (orderId) => getOrderItems(ctx, orderId),
            getProduct: (productId) => ctx.db.get(productId),
            patch: (id, updates) => ctx.db.patch(id, updates),
            notify: (payload) => ctx.runMutation(internal.notifications.create, payload),
        },
        order
    );
}

async function revertOrderInventoryCore(ops: InventoryRevertOps, order: InventoryOrderRecord) {
    if (!order.inventoryCommittedAt) {
        return false;
    }

    const items = await ops.getOrderItems(order._id);

    for (const item of items) {
        const product = await ops.getProduct(item.productId);
        if (!product) continue;

        await ops.patch(item.productId, {
            stock: product.stock + item.quantity,
            sales: Math.max(0, (product.sales || 0) - item.quantity),
        });
    }

    await ops.patch(order._id, { inventoryCommittedAt: undefined });
    return true;
}

export async function revertOrderInventoryIfCommitted(ctx: MutationCtx, order: Doc<"orders">) {
    return revertOrderInventoryCore(
        {
            getOrderItems: (orderId) => getOrderItems(ctx, orderId),
            getProduct: (productId) => ctx.db.get(productId),
            patch: (id, updates) => ctx.db.patch(id, updates),
        },
        order
    );
}

export async function revertOrderInventoryIfCommittedForTests(
    ctx: InventoryMutationTestContext,
    order: InventoryOrderRecord
) {
    return revertOrderInventoryCore(
        {
            getOrderItems: async (orderId) =>
                ctx.db
                    .query("order_items")
                    .withIndex("by_order", (q) => q.eq("orderId", orderId))
                    .collect(),
            getProduct: (productId) => ctx.db.get(productId),
            patch: (id, updates) => ctx.db.patch(id, updates),
        },
        order
    );
}

export async function applyOrderInventoryIfNeededForTests(
    ctx: InventoryMutationTestContext,
    order: InventoryOrderRecord
) {
    return applyOrderInventoryCore(
        {
            getOrderItems: async (orderId) =>
                ctx.db
                    .query("order_items")
                    .withIndex("by_order", (q) => q.eq("orderId", orderId))
                    .collect(),
            getProduct: (productId) => ctx.db.get(productId),
            patch: (id, updates) => ctx.db.patch(id, updates),
            notify: (payload) => ctx.runMutation(internal.notifications.create, payload),
        },
        order
    );
}

export async function buildOrderLineItems(ctx: QueryCtx | MutationCtx, order: Doc<"orders">) {
    const items = await getOrderItems(ctx, order._id);
    const lineItems = items.map((item: OrderItemDoc) => ({
        name: item.productName,
        quantity: item.quantity,
        amount: item.price,
        imageUrl: item.productImage,
    }));

    // Charge the shipping fee through PayMongo so the collected amount matches order.total.
    if (order.shippingFee > 0) {
        lineItems.push({
            name: "Shipping Fee",
            quantity: 1,
            amount: order.shippingFee,
            imageUrl: undefined,
        });
    }

    return lineItems;
}
