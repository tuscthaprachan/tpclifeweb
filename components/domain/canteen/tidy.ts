/**
 * Server side: send a request whose query carries empty filter values to the
 * tidy address, so a no JavaScript submit of the filter form leaves a clean
 * URL. Does nothing when the query is already tidy.
 */

import { redirect } from "next/navigation";

import type { RawParams } from "@/lib/canteen/params";

import { tidyQuery } from "./query";

export function redirectToTidyQuery(path: string, raw: RawParams): void {
  const tidy = tidyQuery(raw);
  if (tidy !== null) redirect(tidy ? `${path}?${tidy}` : path);
}
