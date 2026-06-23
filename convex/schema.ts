import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        email: v.string(),
        phoneNumber: v.optional(v.string()),
        firstName: v.string(),
        middleName: v.optional(v.string()),
        lastName: v.string(),
        role: v.union(v.literal("BUYER"), v.literal("SELLER"), v.literal("ADMIN")),
        shopName: v.optional(v.string()),
        shopDescription: v.optional(v.string()),
        shopLogo: v.optional(v.string()),
        password: v.optional(v.string()),
        passwordSalt: v.optional(v.string()), // Salt for password hashing

        isActive: v.boolean(),
        isVerified: v.boolean(),
    })
        .index("by_email", ["email"]),

    sessions: defineTable({
        userId: v.id("users"),
        tokenHash: v.string(),
        expiresAt: v.number(),
        revokedAt: v.optional(v.number()),
    })
        .index("by_tokenHash", ["tokenHash"])
        .index("by_user", ["userId"]),

    addresses: defineTable({
        userId: v.id("users"),
        firstName: v.string(),
        middleName: v.optional(v.string()),
        lastName: v.string(),
        phoneNumber: v.string(),
        streetAddress: v.string(),
        barangay: v.string(),
        city: v.string(),
        province: v.string(),
        postalCode: v.optional(v.string()),
        isDefault: v.boolean(),
    }).index("by_user", ["userId"]),

    categories: defineTable({
        name: v.string(),
        slug: v.string(),
        description: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        isActive: v.boolean(),
        sortOrder: v.number(),
    }).index("by_slug", ["slug"]),

    products: defineTable({
        sellerId: v.id("users"),
        categoryId: v.id("categories"),
        name: v.string(),
        slug: v.string(),
        description: v.string(),
        species: v.optional(v.string()),
        strain: v.optional(v.string()),
        gender: v.optional(v.string()),
        size: v.optional(v.string()),
        age: v.optional(v.string()),
        price: v.number(),
        comparePrice: v.optional(v.number()),
        stock: v.number(),
        minOrder: v.number(),
        maxOrder: v.optional(v.number()),
        city: v.string(),
        province: v.string(),
        status: v.union(v.literal("ACTIVE"), v.literal("INACTIVE"), v.literal("OUT_OF_STOCK")),
        views: v.number(),
        sales: v.number(),
        searchTerms: v.optional(v.array(v.string())),
    })
        .index("by_seller", ["sellerId"])
        .index("by_category", ["categoryId"])
        .index("by_slug", ["slug"])
        .index("by_status", ["status"]),

    product_images: defineTable({
        productId: v.id("products"),
        imageUrl: v.string(),
        publicId: v.string(),
        altText: v.optional(v.string()),
        sortOrder: v.number(),
    }).index("by_product", ["productId"]),

    orders: defineTable({
        orderNumber: v.string(),
        buyerId: v.id("users"),
        addressId: v.id("addresses"),
        subtotal: v.number(),
        shippingFee: v.number(),
        total: v.number(),
        paymentMethod: v.union(v.literal("GCASH"), v.literal("MAYA"), v.literal("CARD"), v.literal("BANK_TRANSFER"), v.literal("COD")),
        paymentStatus: v.union(v.literal("PENDING"), v.literal("PROCESSING"), v.literal("PAID"), v.literal("FAILED"), v.literal("REFUNDED")),
        status: v.union(v.literal("PENDING"), v.literal("CONFIRMED"), v.literal("PROCESSING"), v.literal("SHIPPED"), v.literal("DELIVERED"), v.literal("CANCELLED"), v.literal("REFUNDED")),
        trackingNumber: v.optional(v.string()),
        courier: v.optional(v.string()),
        buyerNotes: v.optional(v.string()),
        sellerNotes: v.optional(v.string()),
        confirmedAt: v.optional(v.number()),
        shippedAt: v.optional(v.number()),
        deliveredAt: v.optional(v.number()),
        cancelledAt: v.optional(v.number()),
        inventoryCommittedAt: v.optional(v.number()),
        reservationExpiresAt: v.optional(v.number()),
    })
        .index("by_orderNumber", ["orderNumber"])
        .index("by_buyer", ["buyerId"])
        .index("by_status", ["status"]),

    order_items: defineTable({
        orderId: v.id("orders"),
        productId: v.id("products"),
        sellerId: v.id("users"), // Denormalized for efficient seller queries
        quantity: v.number(),
        price: v.number(),
        subtotal: v.number(),
        productName: v.string(),
        productImage: v.optional(v.string()),
    })
        .index("by_order", ["orderId"])
        .index("by_seller", ["sellerId"]),

    payments: defineTable({
        orderId: v.id("orders"),
        amount: v.number(),
        paymentMethod: v.union(v.literal("GCASH"), v.literal("MAYA"), v.literal("CARD"), v.literal("BANK_TRANSFER"), v.literal("COD")),
        status: v.union(v.literal("PENDING"), v.literal("PROCESSING"), v.literal("PAID"), v.literal("FAILED"), v.literal("REFUNDED")),
        checkoutSessionId: v.optional(v.string()),
        paymentIntentId: v.optional(v.string()),
        sourceId: v.optional(v.string()),
        transactionId: v.optional(v.string()),
        paidAt: v.optional(v.number()),
        refundedAmount: v.optional(v.number()),
        refundedAt: v.optional(v.number()),
        refundReason: v.optional(v.string()),
        metadata: v.optional(v.object({
            orderId: v.optional(v.id("orders")),
            buyerId: v.optional(v.id("users")),
            orderNumber: v.optional(v.string()),
            paymentMethod: v.optional(v.union(
                v.literal("GCASH"),
                v.literal("MAYA"),
                v.literal("CARD"),
                v.literal("BANK_TRANSFER"),
                v.literal("COD")
            )),
            checkoutSessionId: v.optional(v.string()),
            paymentIntentId: v.optional(v.string()),
            sourceId: v.optional(v.string()),
        })),
    })
        .index("by_order", ["orderId"])
        .index("by_checkoutSessionId", ["checkoutSessionId"])
        .index("by_paymentIntentId", ["paymentIntentId"]),

    reviews: defineTable({
        productId: v.id("products"),
        userId: v.id("users"),
        rating: v.number(),
        comment: v.optional(v.string()),
        images: v.array(v.string()),
        helpfulCount: v.number(),
        sellerResponse: v.optional(v.string()),
        respondedAt: v.optional(v.number()),
    })
        .index("by_product", ["productId"])
        .index("by_user", ["userId"])
        .index("by_product_user", ["productId", "userId"]),

    notifications: defineTable({
        userId: v.id("users"),
        type: v.string(),
        title: v.string(),
        message: v.string(),
        data: v.optional(v.object({
            orderId: v.optional(v.id("orders")),
            orderNumber: v.optional(v.string()),
            status: v.optional(v.union(
                v.literal("PENDING"),
                v.literal("CONFIRMED"),
                v.literal("PROCESSING"),
                v.literal("SHIPPED"),
                v.literal("DELIVERED"),
                v.literal("CANCELLED"),
                v.literal("REFUNDED")
            )),
            trackingNumber: v.optional(v.string()),
            productId: v.optional(v.id("products")),
        })),
        isRead: v.boolean(),
        readAt: v.optional(v.number()),
    }).index("by_user_read", ["userId", "isRead"]),

    conversations: defineTable({
        productId: v.optional(v.id("products")),
    }),

    conversation_participants: defineTable({
        conversationId: v.id("conversations"),
        userId: v.id("users"),
        joinedAt: v.number(),
    })
        .index("by_conversation", ["conversationId"])
        .index("by_user", ["userId"])
        .index("by_conversation_user", ["conversationId", "userId"]),

    chat_messages: defineTable({
        conversationId: v.id("conversations"),
        senderId: v.id("users"),
        content: v.string(),
        isRead: v.boolean(),
    })
        .index("by_conversation", ["conversationId"]),

    password_reset_tokens: defineTable({
        userId: v.id("users"),
        tokenHash: v.string(),
        expiresAt: v.number(),
    })
        .index("by_tokenHash", ["tokenHash"])
        .index("by_user", ["userId"]),

    push_tokens: defineTable({
        userId: v.id("users"),
        token: v.string(),
        platform: v.union(v.literal("ios"), v.literal("android")),
    })
        .index("by_user", ["userId"])
        .index("by_token", ["token"]),
});