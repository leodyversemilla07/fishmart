import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Define a shape that matches your Convex User schema + generic fields
export interface ConvexUser {
    _id: string;
    id?: string; // mapping for compatibility
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

interface AuthState {
    user: ConvexUser | null;
    convexUser: ConvexUser | null; // Alias
    isAuthenticated: boolean;
    initialized: boolean;

    // Actions
    login: (user: ConvexUser) => void;
    logout: () => void;
    setInitialized: (val: boolean) => void;
    updateUser: (updates: Partial<ConvexUser>) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            convexUser: null,
            isAuthenticated: false,
            initialized: false,

            login: (user) => {
                const userWithId = { ...user, id: user._id };
                set({
                    user: userWithId,
                    convexUser: userWithId,
                    isAuthenticated: true
                });
            },

            logout: () => {
                set({
                    user: null,
                    convexUser: null,
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
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ user: state.user, convexUser: state.convexUser, isAuthenticated: state.isAuthenticated }),
        }
    )
);
