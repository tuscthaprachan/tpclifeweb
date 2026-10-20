/**
 * The canteen ("What to eat") logic, in one import. Everything here is pure
 * except `device`, which touches `localStorage` only when called.
 *
 *   import { parse, applyFilters, pick } from "@/lib/canteen";
 *
 * `device` is re-exported as a namespace to keep its short function names
 * (`getFavourites`, `subscribe`) from colliding with the rest.
 */

export * from "./options";
export * from "./params";
export * from "./derive";
export * from "./filter";
export * from "./random";
export * from "./combos";
export * from "./week";
export * from "./group";
export * as device from "./device";
