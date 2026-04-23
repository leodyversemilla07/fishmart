import AsyncStorage from '@react-native-async-storage/async-storage';
import { Id } from '@/convex/_generated/dataModel';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface CartItem {
    id: Id<"products">;
    name: string;
    price: number;
    imageUrl: string;
    quantity: number;
    sellerId: Id<"users">;
    sellerName: string;
}

interface ProductForCart {
    id: Id<"products">;
    name: string;
    price: string | number;
    images?: { imageUrl: string }[];
    sellerId: Id<"users">;
    seller?: { shopName?: string } | null;
}

interface CartState {
    items: CartItem[];
    addItem: (product: ProductForCart, quantity?: number) => void;
    removeItem: (productId: Id<"products">) => void;
    updateQuantity: (productId: Id<"products">, quantity: number) => void;
    clearCart: () => void;
    totalItems: () => number;
    totalPrice: () => number;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],

            addItem: (product, quantity = 1) => {
                const items = get().items;
                const existingItem = items.find((item) => item.id === product.id);

                if (existingItem) {
                    set({
                        items: items.map((item) =>
                            item.id === product.id
                                ? { ...item, quantity: item.quantity + quantity }
                                : item
                        ),
                    });
                } else {
                    set({
                        items: [
                            ...items,
                            {
                                id: product.id,
                                name: product.name,
                                price: parseFloat(product.price.toString()),
                                imageUrl: product.images?.[0]?.imageUrl || 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=800',
                                quantity: quantity,
                                sellerId: product.sellerId,
                                sellerName: product.seller?.shopName || 'Premium Seller',
                            },
                        ],
                    });
                }
            },

            removeItem: (productId) => {
                set({
                    items: get().items.filter((item) => item.id !== productId),
                });
            },

            updateQuantity: (productId, quantity) => {
                if (quantity < 1) {
                    get().removeItem(productId);
                    return;
                }
                set({
                    items: get().items.map((item) =>
                        item.id === productId ? { ...item, quantity } : item
                    ),
                });
            },

            clearCart: () => set({ items: [] }),

            totalItems: () => get().items.reduce((total, item) => total + item.quantity, 0),

            totalPrice: () => get().items.reduce((total, item) => total + item.price * item.quantity, 0),
        }),
        {
            name: 'cart-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
