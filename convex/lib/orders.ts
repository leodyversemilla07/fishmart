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

export async function assertOrderInventoryAvailable(
    ctx: QueryCtx | MutationCtx,
    items: { productId: Id<"products">; quantity: number }[]
) {
    for (const item of items) {
        const product = await ctx.db.get(item.productId);
        if (!product || product.status !== "ACTIVE") {
            throw new Error("One or more products are unavailable");
        }
        if (item.quantity < 1) {
            throw new Error("Quantity must be at least 1");
        }
        if (product.stock < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name}`);
        }
    }
}

async function applyOrderInventoryCore(ops: InventoryMutationOps, order: InventoryOrderRecord) {
    if (order.inventoryCommittedAt) {
        return false;
    }

    const items = await ops.getOrderItems(order._id);
    for (const item of items) {
        const product = await ops.getProduct(item.productId);
        if (!product || product.status !== "ACTIVE") {
            throw new Error("One or more products are unavailable");
        }
        if (item.quantity < 1) {
            throw new Error("Quantity must be at least 1");
        }
        if (product.stock < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name}`);
        }
    }

    for (const item of items) {
        const product = await ops.getProduct(item.productId);
        if (!product) {
            throw new Error("Product missing during inventory commit");
        }

        await ops.patch(item.productId, {
            stock: product.stock - item.quantity,
            sales: (product.sales || 0) + item.quantity,
        });

        await ops.notify({
            userId: item.sellerId,
            type: "NEW_ORDER",
            title: "New Order Received!",
            message: `You have a new order for ${item.productName} (x${item.quantity})`,
            data: { orderId: order._id, orderNumber: order.orderNumber, productId: item.productId },
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

export async function buildOrderLineItems(ctx: QueryCtx | MutationCtx, orderId: Id<"orders">) {
    const items = await getOrderItems(ctx, orderId);
    return items.map((item: OrderItemDoc) => ({
        name: item.productName,
        quantity: item.quantity,
        amount: item.price,
        imageUrl: item.productImage,
    }));
}
