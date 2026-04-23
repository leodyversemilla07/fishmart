import { ConvexReactClient } from "convex/react";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
if (!convexUrl) {
    throw new Error('EXPO_PUBLIC_CONVEX_URL environment variable is required');
}
export const convex = new ConvexReactClient(convexUrl);
