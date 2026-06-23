import type { Doc, Id } from "../_generated/dataModel";

type ReviewEligibilityOrder = Pick<Doc<"orders">, "_id" | "status" | "paymentStatus" | "paymentMethod">;
type ReviewEligibilityItem = Pick<Doc<"order_items">, "productId">;

export function isCompletedReviewableOrder(order: ReviewEligibilityOrder) {
    return order.status === "DELIVERED" && (order.paymentStatus === "PAID" || order.paymentMethod === "COD");
}

export function hasPurchasedProductForReview(
    orders: ReviewEligibilityOrder[],
    itemsByOrderId: Map<Id<"orders">, ReviewEligibilityItem[]>,
    productId: Id<"products">
) {
    return orders.some((order) => {
        if (!isCompletedReviewableOrder(order)) return false;
        return (itemsByOrderId.get(order._id) ?? []).some((item) => item.productId === productId);
    });
}
