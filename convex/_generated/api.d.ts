/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as categories from "../categories.js";
import type * as chat from "../chat.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as lib_orders from "../lib/orders.js";
import type * as lib_session from "../lib/session.js";
import type * as notifications from "../notifications.js";
import type * as orders from "../orders.js";
import type * as paymongo from "../paymongo.js";
import type * as products from "../products.js";
import type * as push from "../push.js";
import type * as reviews from "../reviews.js";
import type * as seed from "../seed.js";
import type * as upload from "../upload.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  categories: typeof categories;
  chat: typeof chat;
  crons: typeof crons;
  http: typeof http;
  "lib/orders": typeof lib_orders;
  "lib/session": typeof lib_session;
  notifications: typeof notifications;
  orders: typeof orders;
  paymongo: typeof paymongo;
  products: typeof products;
  push: typeof push;
  reviews: typeof reviews;
  seed: typeof seed;
  upload: typeof upload;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
