import { ConvexReactClient } from "convex/react";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL as string;
export const convex = new ConvexReactClient(convexUrl);
