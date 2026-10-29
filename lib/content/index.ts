/**
 * The content read layer: everything the public site reads from Postgres.
 * Server only. Each module owns one area and exports the functions pages call
 * (`getForms`, `getNewsPage`, ...); the uncached `readX(db, ...)` functions
 * beside them are what the tests run against a PGlite database.
 *
 * Every public function is tagged with `CACHE_TAGS` and wrapped in `safeFetch`,
 * so a database outage renders empty states instead of error pages.
 */

export * from "./cache";
export * from "./canteen";
export * from "./directory";
export * from "./events";
export * from "./faculties";
export * from "./forms";
export * from "./lost-found";
export * from "./news";
export * from "./pages";
export * from "./policies";
export * from "./revalidate";
export * from "./rich-text";
export * from "./safe-fetch";
export * from "./search-index";
export * from "./shuttle";
export * from "./site";
