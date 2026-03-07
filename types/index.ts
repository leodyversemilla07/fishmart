import { Id } from "@/convex/_generated/dataModel";

export interface User {
    _id: Id<"users">;
    _creationTime: number;
    email: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    role: "BUYER" | "SELLER" | "ADMIN";
    shopName?: string;
    shopDescription?: string;
    shopLogo?: string;
    isActive: boolean;
    isVerified: boolean;
}

export interface Address {
    _id: Id<"addresses">;
    _creationTime: number;
    userId: Id<"users">;
    firstName: string;
    middleName?: string;
    lastName: string;
    phoneNumber: string;
    streetAddress: string;
    barangay: string;
    city: string;
    province: string;
    postalCode?: string;
    isDefault: boolean;
}

export interface Category {
    _id: Id<"categories">;
    _creationTime: number;
    name: string;
    slug: string;
    description?: string;
    imageUrl?: string;
    isActive: boolean;
    sortOrder: number;
}

export interface Product {
    _id: Id<"products">;
    _creationTime: number;
    sellerId: Id<"users">;
    categoryId: Id<"categories">;
    name: string;
    slug: string;
    description: string;
    species?: string;
    strain?: string;
    gender?: string;
    size?: string;
    age?: string;
    price: number;
    comparePrice?: number;
    stock: number;
    minOrder: number;
    maxOrder?: number;
    city: string;
    province: string;
    status: "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK";
    views: number;
    sales: number;
    images?: Array<{ imageUrl: string }>; // Joined field
    rating?: number; // Calculated/joined field
    reviewCount?: number;
    reviews?: Array<Review>; // Joined field
    seller?: User | null; // Joined field
    category?: Category | null; // Joined field
    sellerAverageRating?: number | null;
    sellerReviewCount?: number;
}

export interface OrderItem {
    orderId: Id<"orders">;
    productId: Id<"products">;
    quantity: number;
    price: number;
    subtotal: number;
    productName: string;
    productImage?: string;
}

export interface Order {
    _id: Id<"orders">;
    _creationTime: number;
    orderNumber: string;
    buyerId: Id<"users">;
    addressId: Id<"addresses">;
    subtotal: number;
    shippingFee: number;
    total: number;
    paymentMethod: "GCASH" | "MAYA" | "CARD" | "BANK_TRANSFER" | "COD";
    paymentStatus: "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "REFUNDED";
    status: "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";
    items: OrderItem[]; // Joined field
}

export interface Notification {
    _id: Id<"notifications">;
    _creationTime: number;
    userId: Id<"users">;
    type: string;
    title: string;
    message: string;
    data?: any;
    isRead: boolean;
    readAt?: number;
}

export interface ChatMessage {
    _id: Id<"chat_messages">;
    _creationTime: number;
    conversationId: Id<"conversations">;
    senderId: Id<"users">;
    content: string;
    isRead: boolean;
}

export interface Conversation {
    _id: Id<"conversations">;
    _creationTime: number;
    productId?: Id<"products">;
    otherUser: User | null; // Joined field
    lastMessage: ChatMessage | null; // Joined field
}

export interface Review {
    _id: Id<"reviews">;
    _creationTime: number;
    userId: Id<"users">;
    productId: Id<"products">;
    rating: number;
    comment: string;
    user?: User | null; // Joined field
    images?: string[]; // Joined field
    sellerResponse?: string;
    respondedAt?: number;
    product?: Product; // For seller reviews
}
