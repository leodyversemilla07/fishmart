import { ConvexReactClient } from "convex/react";

// Safely get convex URL, allowing for graceful fallback on web
const getConvexUrl = () => {
    // On web, we need to ensure the URL is available
    if (typeof window === 'undefined') {
        // Server-side rendering - return undefined to skip initialization
        return undefined;
    }
    return process.env.EXPO_PUBLIC_CONVEX_URL;
};

const convexUrl = getConvexUrl();

if (!convexUrl) {
    // Only throw in development, not in production web builds
    if (process.env.NODE_ENV === 'development') {
        console.warn('EXPO_PUBLIC_CONVEX_URL not set - Convex features will be unavailable');
    }
}

export const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;
