import { internal } from "../_generated/api";
import { Doc, Id } from "../_generated/dataModel";

export const SHIPPING_FEE = 50;

export function generateOrderNumber() {
    return "ORD-" + Math.random().toString(36).toUpperCase().substring(2, 10);
}

export async function getOrderItems(ctx: any, orderId: Id<"orders">) {
    return await ctx.db
        .query("order_items")
        .withIndex("by_order", (q: any) => q.eq("orderId", orderId))
        .collect();
}

export async function assertOrderInventoryAvailable(
    ctx: any,
    items: Array<{ productId: Id<"products">; quantity: number }>
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

export async function applyOrderInventoryIfNeeded(ctx: any, order: Doc<"orders">) {
    if (order.inventoryCommittedAt) {
        return false;
    }

    const items = await getOrderItems(ctx, order._id);
    await assertOrderInventoryAvailable(
        ctx,
        items.map((item) => ({ productId: item.productId, quantity: item.quantity }))
    );

    for (const item of items) {
        const product = await ctx.db.get(item.productId);
        if (!product) {
            throw new Error("Product missing during inventory commit");
        }

        await ctx.db.patch(item.productId, {
            stock: product.stock - item.quantity,
            sales: (product.sales || 0) + item.quantity,
        });

        await ctx.runMutation(internal.notifications.create, {
            userId: item.sellerId,
            type: "NEW_ORDER",
            title: "New Order Received!",
            message: `You have a new order for ${item.productName} (x${item.quantity})`,
            data: { orderId: order._id, orderNumber: order.orderNumber, productId: item.productId },
        });
    }

    await ctx.db.patch(order._id, { inventoryCommittedAt: Date.now() });
    return true;
}

export async function buildOrderLineItems(ctx: any, orderId: Id<"orders">) {
    const items = await getOrderItems(ctx, orderId);
    return items.map((item) => ({
        name: item.productName,
        quantity: item.quantity,
        amount: item.price,
        imageUrl: item.productImage,
    }));
}

