# FishMart - Database Documentation & Architecture

This document outlines the active database schema, entity relationships, indexes, query optimizations, data seeding, and schema migration strategies in **FishMart**, utilizing **Convex Document Store**.

---

## 1. Entity Relationship Design

Convex is a document database. Relationships are modeled using unique document references (`v.id("tableName")`) rather than foreign key constraints. The following diagram illustrates the document references and active logical relationships:

```
                  ┌───────────────┐
                  │  categories   │
                  └───────────────┘
                          ▲
                          │ (categoryId)
                          │
  ┌───────────┐     ┌───────────────┐     ┌────────────────┐
  │   users   │◄────│   products    │◄────│ product_images │
  └───────────┘     └───────────────┘     └────────────────┘
    ▲   ▲  ▲          ▲          ▲
    │   │  │          │          │
    │   │  │ (buyerId)│          │ (productId)
    │   │  └──────────┼──────┐   │
    │   │ (sellerId)  │      │   │
    │   └───────────┐ │      │   │
    │ (userId)      │ │      │   │
  ┌───────────┐   ┌─┴─┴──────┴───┴┐
  │ addresses │◄──│    orders     │
  └───────────┘   └──────┬────────┘
    ▲                    │ (orderId)
    │ (addressId)        ▼
    └─────────────────┌───────────┐
                      │ payments  │
                      └───────────┘
```

### Table Relationships Overview:
1.  **`users` ◄── `products`**: A seller (`users` with role `"SELLER"` or `"ADMIN"`) can publish multiple marketplace products.
2.  **`categories` ◄── `products`**: Each product belongs to a single category (e.g., "Guppies", "Betta Fish").
3.  **`products` ◄── `product_images`**: A product can have multiple product images ordered via `sortOrder`.
4.  **`users` ◄── `addresses`**: A buyer or seller can save multiple shipping/billing addresses, with a flag `isDefault` to determine checkout defaults.
5.  **`users` ◄── `orders`**: A buyer places an order.
6.  **`addresses` ◄── `orders`**: An order references a single static shipping address document.
7.  **`orders` ◄── `order_items`**: An order has multiple items. To ensure long-term integrity, `order_items` contains denormalized snapshots of product fields (`productName`, `productImage`, `price`) in case the original listing is updated or deleted.
8.  **`orders` ◄── `payments`**: An online payment order has a single associated payment session records.
9.  **`products` & `users` ◄── `reviews`**: A buyer can submit a review with rating and photos for products they purchased.
10. **`users` ◄── `push_tokens` / `sessions`**: Supports notification dispatching and session authorization lifecycles.
11. **`conversations` ◄── `chat_messages`**: Real-time message logs in buyer-seller threads.

---

## 2. Convex Active Database Schema (`convex/schema.ts`)

Here is the complete active Convex database schema in **TypeScript**:

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // Users Profile Collection
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
        passwordSalt: v.optional(v.string()), // Hashed salt
        isActive: v.boolean(),
        isVerified: v.boolean(),
    }).index("by_email", ["email"]),

    // User Sessions
    sessions: defineTable({
        userId: v.id("users"),
        tokenHash: v.string(),
        expiresAt: v.number(),
        revokedAt: v.optional(v.number()),
    })
        .index("by_tokenHash", ["tokenHash"])
        .index("by_user", ["userId"]),

    // Shipping & Billing Addresses
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

    // Product Categories
    categories: defineTable({
        name: v.string(),
        slug: v.string(),
        description: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        isActive: v.boolean(),
        sortOrder: v.number(),
    }).index("by_slug", ["slug"]),

    // Product Listings
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
        searchTerms: v.optional(v.array(v.string())), // Normalized tokens for text search
    })
        .index("by_seller", ["sellerId"])
        .index("by_category", ["categoryId"])
        .index("by_slug", ["slug"])
        .index("by_status", ["status"])
        .index("by_status_category", ["status", "categoryId"])
        .index("by_seller_status", ["sellerId", "status"]),

    // Product Listing Media Elements
    product_images: defineTable({
        productId: v.id("products"),
        imageUrl: v.string(),
        publicId: v.string(),
        altText: v.optional(v.string()),
        sortOrder: v.number(),
    }).index("by_product", ["productId"]),

    // Orders Collection
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

    // Order Line Items (Denormalized Snapshot)
    order_items: defineTable({
        orderId: v.id("orders"),
        productId: v.id("products"),
        sellerId: v.id("users"), // Denormalized for seller-specific sales reports
        quantity: v.number(),
        price: v.number(),
        subtotal: v.number(),
        productName: v.string(),
        productImage: v.optional(v.string()),
    })
        .index("by_order", ["orderId"])
        .index("by_seller", ["sellerId"]),

    // Payments Logs & PayMongo Intents
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
                v.literal("GCASH"), v.literal("MAYA"), v.literal("CARD"), v.literal("BANK_TRANSFER"), v.literal("COD")
            )),
            checkoutSessionId: v.optional(v.string()),
            paymentIntentId: v.optional(v.string()),
            sourceId: v.optional(v.string()),
        })),
    })
        .index("by_order", ["orderId"])
        .index("by_checkoutSessionId", ["checkoutSessionId"])
        .index("by_paymentIntentId", ["paymentIntentId"]),

    // Ratings and Reviews
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

    // Push & In-App Notifications
    notifications: defineTable({
        userId: v.id("users"),
        type: v.string(),
        title: v.string(),
        message: v.string(),
        data: v.optional(v.object({
            orderId: v.optional(v.id("orders")),
            orderNumber: v.optional(v.string()),
            status: v.optional(v.union(
                v.literal("PENDING"), v.literal("CONFIRMED"), v.literal("PROCESSING"), v.literal("SHIPPED"), v.literal("DELIVERED"), v.literal("CANCELLED"), v.literal("REFUNDED")
            )),
            trackingNumber: v.optional(v.string()),
            productId: v.optional(v.id("products")),
        })),
        isRead: v.boolean(),
        readAt: v.optional(v.number()),
    }).index("by_user_read", ["userId", "isRead"]),

    // Chat Messenger Collections
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
    }).index("by_conversation", ["conversationId"]),

    // Authentication Recovery
    password_reset_tokens: defineTable({
        userId: v.id("users"),
        tokenHash: v.string(),
        expiresAt: v.number(),
    })
        .index("by_tokenHash", ["tokenHash"])
        .index("by_user", ["userId"]),

    // Expo/FCM Device Registration Tokens
    push_tokens: defineTable({
        userId: v.id("users"),
        token: v.string(),
        platform: v.union(v.literal("ios"), v.literal("android")),
    })
        .index("by_user", ["userId"])
        .index("by_token", ["token"]),
});
```

---

## 3. Database Indexes & Query Optimizations

Unlike relational databases where SQL engines analyze and plan dynamic searches, **Convex indexed queries must specify which index is being queried**. 

Below is a catalog of the database indexes along with their optimizations:

### A. Authentication & Sessions
*   **`by_email`** on `users(["email"])`: 
    Used on logins to quickly find the corresponding profile.
*   **`by_tokenHash`** on `sessions(["tokenHash"])`:
    Verifies authentication requests instantly on every secure API hit.

### B. E-Commerce Listings Filtering
*   **`by_seller`** on `products(["sellerId"])`:
    Optimizes public shop screens and the seller inventory dashboard.
*   **`by_category`** on `products(["categoryId"])`:
    Optimizes target browse filters on category clicks.
*   **`by_status`** on `products(["status"])`:
    Queries active products exclusively (`status = "ACTIVE"`) while filtering out inactive or out-of-stock listings.

### C. Order Routing & Payment Logs
*   **`by_orderNumber`** on `orders(["orderNumber"])`:
    Locates detailed order data when processing administrative actions or webhooks.
*   **`by_checkoutSessionId`** on `payments(["checkoutSessionId"])`:
    Enables immediate lookup when processing checkout notifications from the PayMongo payment gateway webhook.

---

## 4. Seeding Data

Seeding is handled via Convex TypeScript mutation handlers located in `convex/seed.ts`. It allows initializing database configurations deterministically across development, staging, or production projects. Seeding uses an `internalMutation`, so it can only be invoked with the Convex CLI (never exposed to app clients).

To seed the initial listing categories:
```bash
npx convex run seed
```

### Seeding Implementation Details:
```typescript
import { internalMutation } from "./_generated/server";

export const seed = internalMutation({
    args: {},
    handler: async (ctx) => {
        const categories = [
            { name: "Live Fish", slug: "live-fish", sortOrder: 1, isActive: true },
            { name: "Aquarium Plants", slug: "aquarium-plants", sortOrder: 2, isActive: true },
            { name: "Fish Food", slug: "fish-food", sortOrder: 3, isActive: true },
            { name: "Aquarium Supplies", slug: "aquarium-supplies", sortOrder: 5, isActive: true },
        ];

        for (const cat of categories) {
            const existing = await ctx.db
                .query("categories")
                .filter((q) => q.eq(q.field("name"), cat.name))
                .unique();

            if (!existing) {
                await ctx.db.insert("categories", cat);
            }
        }
    },
});
```

---

## 5. Schema Evolution & Migrations

Convex database schemas are **implicitly versioned and dynamically checked**. Typical SQL migrations (e.g. `npx prisma migrate dev`) do not exist. Instead, Convex ensures type safety by evaluating live writes against the schema compiled in `schema.ts`.

### Schema Migration Guidelines:
1.  **Adding Optional Fields**:
    Adding an optional field (e.g., `Species` as `v.optional(v.string())`) requires no manual database changes. Existing documents will naturally fall into the type definition (resolving to `undefined` during reads).
2.  **Adding Required Fields**:
    To add a new required field, implement it in three safe steps:
    *   **Step 1**: Declare the field as `v.optional(...)` in `schema.ts`.
    *   **Step 2**: Create and run a temporary Convex internal mutation script to traverse and write default values into all historical documents:
        ```typescript
        export const migrateHistoricalDocs = internalMutation({
            handler: async (ctx) => {
                const documents = await ctx.db.query("tableName").collect();
                for (const doc of documents) {
                    await ctx.db.patch(doc._id, { newField: "defaultValue" });
                }
            }
        });
        ```
    *   **Step 3**: Promote the field to a required type in `schema.ts` once all documents have been successfully updated.

---

## 6. Practical Query & Mutation Patterns

### Fetching Product Listing Details (Query)
```typescript
export const getProduct = query({
    args: { id: v.id("products") },
    handler: async (ctx, args) => {
        const product = await ctx.db.get(args.id);
        if (!product) return null;

        const images = await ctx.db
            .query("product_images")
            .withIndex("by_product", (q) => q.eq("productId", product._id))
            .collect();

        return {
            ...product,
            images,
        };
    },
});
```

### Commit Order and Block Inventory (Mutation)
```typescript
export const commitInventory = mutation({
    args: { orderId: v.id("orders") },
    handler: async (ctx, args) => {
        const order = await ctx.db.get(args.orderId);
        if (!order || order.inventoryCommittedAt) return;

        const items = await ctx.db
            .query("order_items")
            .withIndex("by_order", (q) => q.eq("orderId", order._id))
            .collect();

        for (const item of items) {
            const product = await ctx.db.get(item.productId);
            if (!product || product.stock < item.quantity) {
                throw new Error("Insufficient stock");
            }
            // Atomically decrement stock
            await ctx.db.patch(item.productId, {
                stock: product.stock - item.quantity,
                sales: (product.sales || 0) + item.quantity,
            });
        }

        await ctx.db.patch(order._id, {
            inventoryCommittedAt: Date.now()
        });
    }
});
```

---

**Document Version**: 2.0  
**Last Updated**: May 20, 2026  
**Next Review**: December 2026