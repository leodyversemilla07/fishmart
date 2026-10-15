import { Id } from '@/convex/_generated/dataModel';
import { useCartStore } from '@/store/cartStore';
import { secureAuthStorage } from '@/store/secureStorage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Define a shape that matches your Convex User schema + generic fields
export interface ConvexUser {
    _id: Id<"users">;
    id?: Id<"users">; // mapping for compatibility
    email: string;
    phoneNumber?: string;
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

interface AuthState {
    user: ConvexUser | null;
    convexUser: ConvexUser | null; // Alias
    sessionToken: string | null;
    isAuthenticated: boolean;
    initialized: boolean;

    // Actions
    login: (user: ConvexUser, sessionToken: string) => void;
    logout: () => void;
    setInitialized: (val: boolean) => void;
    updateUser: (updates: Partial<ConvexUser>) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            convexUser: null,
            sessionToken: null,
            isAuthenticated: false,
            initialized: false,

            login: (user, sessionToken) => {
                const userWithId = { ...user, id: user._id };
                set({
                    user: userWithId,
                    convexUser: userWithId,
                    sessionToken,
                    isAuthenticated: true
                });
            },

            logout: () => {
                // Don't leak the previous user's cart into the next session.
                useCartStore.getState().clearCart();
                set({
                    user: null,
                    convexUser: null,
                    sessionToken: null,
                    isAuthenticated: false
                });
            },

            setInitialized: (initialized) => set({ initialized }),

            updateUser: (updates) => set((state) => {
                if (!state.user) return state;
                const updated = { ...state.user, ...updates };
                return {
                    user: updated,
                    convexUser: updated,
                };
            }),
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => secureAuthStorage),
            partialize: (state) => ({ user: state.user, convexUser: state.convexUser, sessionToken: state.sessionToken, isAuthenticated: state.isAuthenticated }),
        }
    )
);
