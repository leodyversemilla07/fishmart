# Fishmart - Database Schema

## Entity Relationship Diagram

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│    users    │────────<│   products   │>────────│ categories  │
└─────────────┘         └──────────────┘         └─────────────┘
      │                        │
      │                        │
      ▼                        ▼
┌─────────────┐         ┌──────────────┐
│  addresses  │         │product_images│
└─────────────┘         └──────────────┘
      │
      │
      ▼
┌─────────────┐         ┌──────────────┐
│   orders    │────────<│ order_items  │
└─────────────┘         └──────────────┘
      │
      │
      ▼
┌─────────────┐
│  payments   │
└─────────────┘
      
┌─────────────┐
│   reviews   │
└─────────────┘
```

## Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Enums
enum UserRole {
  BUYER
  SELLER
  ADMIN
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

enum PaymentStatus {
  PENDING
  PROCESSING
  PAID
  FAILED
  REFUNDED
}

enum PaymentMethod {
  GCASH
  MAYA
  CARD
  BANK_TRANSFER
  COD
}

enum ProductStatus {
  ACTIVE
  INACTIVE
  OUT_OF_STOCK
}

// Models
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  phoneNumber   String?   @unique @map("phone_number")
  firstName     String    @map("first_name")
  lastName      String    @map("last_name")
  role          UserRole  @default(BUYER)
  
  // Seller specific fields
  shopName      String?   @map("shop_name")
  shopDescription String? @map("shop_description")
  shopLogo      String?   @map("shop_logo")
  
  // Authentication (handled by Supabase, but we store reference)
  supabaseId    String    @unique @map("supabase_id")
  
  // Metadata
  isActive      Boolean   @default(true) @map("is_active")
  isVerified    Boolean   @default(false) @map("is_verified")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  
  // Relations
  addresses     Address[]
  products      Product[]
  orders        Order[]
  reviews       Review[]
  notifications Notification[]
  
  @@map("users")
}

model Address {
  id            String   @id @default(uuid())
  userId        String   @map("user_id")
  
  fullName      String   @map("full_name")
  phoneNumber   String   @map("phone_number")
  streetAddress String   @map("street_address")
  barangay      String
  city          String
  province      String
  postalCode    String?  @map("postal_code")
  
  isDefault     Boolean  @default(false) @map("is_default")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  
  // Relations
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  orders        Order[]
  
  @@index([userId])
  @@map("addresses")
}

model Category {
  id          String    @id @default(uuid())
  name        String    @unique
  slug        String    @unique
  description String?
  imageUrl    String?   @map("image_url")
  
  isActive    Boolean   @default(true) @map("is_active")
  sortOrder   Int       @default(0) @map("sort_order")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  // Relations
  products    Product[]
  
  @@map("categories")
}

model Product {
  id            String        @id @default(uuid())
  sellerId      String        @map("seller_id")
  categoryId    String        @map("category_id")
  
  name          String
  slug          String        @unique
  description   String        @db.Text
  
  // Fish specific details
  species       String?
  strain        String?       // For guppies: Moscow, Tuxedo, etc.
  gender        String?       // Male, Female, Pair, Unsexed
  size          String?       // Small, Medium, Large, or specific cm
  age           String?       // Weeks/Months old
  
  // Pricing and stock
  price         Decimal       @db.Decimal(10, 2)
  comparePrice  Decimal?      @map("compare_price") @db.Decimal(10, 2)
  stock         Int           @default(0)
  minOrder      Int           @default(1) @map("min_order")
  maxOrder      Int?          @map("max_order")
  
  // Location
  city          String
  province      String
  
  // Status
  status        ProductStatus @default(ACTIVE)
  
  // SEO and views
  views         Int           @default(0)
  sales         Int           @default(0)
  
  // Metadata
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")
  
  // Relations
  seller        User          @relation(fields: [sellerId], references: [id], onDelete: Cascade)
  category      Category      @relation(fields: [categoryId], references: [id])
  images        ProductImage[]
  orderItems    OrderItem[]
  reviews       Review[]
  
  @@index([sellerId])
  @@index([categoryId])
  @@index([status])
  @@index([createdAt])
  @@map("products")
}

model ProductImage {
  id          String   @id @default(uuid())
  productId   String   @map("product_id")
  
  imageUrl    String   @map("image_url")
  publicId    String   @map("public_id") // Cloudinary public ID
  altText     String?  @map("alt_text")
  sortOrder   Int      @default(0) @map("sort_order")
  
  createdAt   DateTime @default(now()) @map("created_at")
  
  // Relations
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  @@index([productId])
  @@map("product_images")
}

model Order {
  id              String      @id @default(uuid())
  orderNumber     String      @unique @map("order_number")
  buyerId         String      @map("buyer_id")
  addressId       String      @map("address_id")
  
  // Order details
  subtotal        Decimal     @db.Decimal(10, 2)
  shippingFee     Decimal     @db.Decimal(10, 2) @map("shipping_fee")
  total           Decimal     @db.Decimal(10, 2)
  
  // Payment
  paymentMethod   PaymentMethod @map("payment_method")
  paymentStatus   PaymentStatus @default(PENDING) @map("payment_status")
  
  // Shipping
  status          OrderStatus @default(PENDING)
  trackingNumber  String?     @map("tracking_number")
  courier         String?
  
  // Notes
  buyerNotes      String?     @map("buyer_notes") @db.Text
  sellerNotes     String?     @map("seller_notes") @db.Text
  
  // Timestamps
  confirmedAt     DateTime?   @map("confirmed_at")
  shippedAt       DateTime?   @map("shipped_at")
  deliveredAt     DateTime?   @map("delivered_at")
  cancelledAt     DateTime?   @map("cancelled_at")
  createdAt       DateTime    @default(now()) @map("created_at")
  updatedAt       DateTime    @updatedAt @map("updated_at")
  
  // Relations
  buyer           User        @relation(fields: [buyerId], references: [id])
  address         Address     @relation(fields: [addressId], references: [id])
  items           OrderItem[]
  payment         Payment?
  
  @@index([buyerId])
  @@index([orderNumber])
  @@index([status])
  @@index([createdAt])
  @@map("orders")
}

model OrderItem {
  id          String   @id @default(uuid())
  orderId     String   @map("order_id")
  productId   String   @map("product_id")
  
  quantity    Int
  price       Decimal  @db.Decimal(10, 2) // Price at time of order
  subtotal    Decimal  @db.Decimal(10, 2)
  
  // Product snapshot (in case product is deleted)
  productName String   @map("product_name")
  productImage String? @map("product_image")
  
  createdAt   DateTime @default(now()) @map("created_at")
  
  // Relations
  order       Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product     Product  @relation(fields: [productId], references: [id])
  
  @@index([orderId])
  @@index([productId])
  @@map("order_items")
}

model Payment {
  id                String        @id @default(uuid())
  orderId           String        @unique @map("order_id")
  
  amount            Decimal       @db.Decimal(10, 2)
  paymentMethod     PaymentMethod @map("payment_method")
  status            PaymentStatus @default(PENDING)
  
  // PayMongo details
  paymentIntentId   String?       @map("payment_intent_id")
  sourceId          String?       @map("source_id")
  
  // Transaction details
  transactionId     String?       @map("transaction_id")
  paidAt            DateTime?     @map("paid_at")
  
  // Refund details
  refundedAmount    Decimal?      @map("refunded_amount") @db.Decimal(10, 2)
  refundedAt        DateTime?     @map("refunded_at")
  refundReason      String?       @map("refund_reason")
  
  // Metadata
  metadata          Json?
  createdAt         DateTime      @default(now()) @map("created_at")
  updatedAt         DateTime      @updatedAt @map("updated_at")
  
  // Relations
  order             Order         @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  @@index([paymentIntentId])
  @@index([status])
  @@map("payments")
}

model Review {
  id          String   @id @default(uuid())
  productId   String   @map("product_id")
  userId      String   @map("user_id")
  
  rating      Int      // 1-5 stars
  comment     String?  @db.Text
  images      String[] // Array of image URLs
  
  // Helpful votes
  helpfulCount Int     @default(0) @map("helpful_count")
  
  // Seller response
  sellerResponse String? @map("seller_response") @db.Text
  respondedAt    DateTime? @map("responded_at")
  
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  // Relations
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([productId, userId]) // One review per user per product
  @@index([productId])
  @@index([userId])
  @@map("reviews")
}

model Notification {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  
  type        String   // ORDER_UPDATE, PAYMENT_SUCCESS, NEW_MESSAGE, etc.
  title       String
  message     String   @db.Text
  
  // Additional data
  data        Json?
  
  // Status
  isRead      Boolean  @default(false) @map("is_read")
  readAt      DateTime? @map("read_at")
  
  createdAt   DateTime @default(now()) @map("created_at")
  
  // Relations
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, isRead])
  @@index([createdAt])
  @@map("notifications")
}
```

## Database Indexes

### Performance Optimization Indexes

```sql
-- Users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone_number ON users(phone_number);
CREATE INDEX idx_users_role ON users(role);

-- Products table
CREATE INDEX idx_products_seller_id ON products(seller_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_created_at ON products(created_at DESC);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_city_province ON products(city, province);

-- Full text search on products
CREATE INDEX idx_products_name_search ON products USING gin(to_tsvector('english', name));
CREATE INDEX idx_products_description_search ON products USING gin(to_tsvector('english', description));

-- Orders table
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);

-- Order Items table
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- Payments table
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_payment_intent_id ON payments(payment_intent_id);

-- Reviews table
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);

-- Notifications table
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

## Sample Data

### Categories
```sql
INSERT INTO categories (id, name, slug, description, is_active, sort_order) VALUES
('cat-1', 'Guppies', 'guppies', 'Various guppy strains and colors', true, 1),
('cat-2', 'Betta Fish', 'betta-fish', 'Siamese fighting fish', true, 2),
('cat-3', 'Tetras', 'tetras', 'Small schooling fish', true, 3),
('cat-4', 'Goldfish', 'goldfish', 'Various goldfish varieties', true, 4),
('cat-5', 'Shrimp', 'shrimp', 'Freshwater aquarium shrimp', true, 5);
```

## Database Migrations

### Initial Migration
```bash
npx prisma migrate dev --name init
```

### Common Migrations
```bash
# Add new field
npx prisma migrate dev --name add_product_tags

# Modify field
npx prisma migrate dev --name update_price_precision

# Add index
npx prisma migrate dev --name add_search_indexes
```

## Data Validation Rules

### Users
- Email must be valid format and unique
- Phone number must be Philippine format (+63 or 09)
- First name and last name required
- Shop name required if role is SELLER

### Products
- Price must be positive
- Stock must be non-negative
- Minimum order must be at least 1
- Maximum order must be greater than minimum order
- At least one image required
- Name must be between 3-200 characters

### Orders
- Total must equal subtotal + shipping fee
- Payment status must update before order status changes to CONFIRMED
- Cannot cancel order if status is SHIPPED or DELIVERED
- Refund amount cannot exceed total

### Reviews
- Rating must be between 1-5
- User can only review products they have purchased
- One review per user per product

## Backup Strategy

### Automated Backups
- **Daily backups**: Supabase provides automatic daily backups
- **Retention**: 7 days for free tier, 30 days for paid tier
- **Point-in-time recovery**: Available for paid plans

### Manual Backups
```bash
# Export database
pg_dump -h [host] -U [user] -d [database] > backup.sql

# Import database
psql -h [host] -U [user] -d [database] < backup.sql
```

### Critical Data
- User information
- Order history
- Payment records
- Product listings

## Query Examples

### Get products with images and category
```typescript
const products = await prisma.product.findMany({
  where: {
    status: 'ACTIVE',
    stock: { gt: 0 }
  },
  include: {
    images: {
      orderBy: { sortOrder: 'asc' }
    },
    category: true,
    seller: {
      select: {
        shopName: true,
        shopLogo: true
      }
    }
  },
  orderBy: { createdAt: 'desc' },
  take: 20
});
```

### Get user orders with items
```typescript
const orders = await prisma.order.findMany({
  where: { buyerId: userId },
  include: {
    items: {
      include: {
        product: {
          include: {
            images: { take: 1 }
          }
        }
      }
    },
    address: true,
    payment: true
  },
  orderBy: { createdAt: 'desc' }
});
```

### Search products
```typescript
const products = await prisma.product.findMany({
  where: {
    OR: [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { description: { contains: searchTerm, mode: 'insensitive' } },
      { species: { contains: searchTerm, mode: 'insensitive' } }
    ],
    status: 'ACTIVE'
  }
});
```

---

**Document Version**: 1.0  
**Last Updated**: December 23, 2025