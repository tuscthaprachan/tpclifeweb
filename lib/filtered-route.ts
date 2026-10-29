import "server-only";

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { FILTERED_HEADER } from "./query-routes";

export async function assertFilteredRewrite(): Promise<void> {
  if ((await headers()).get(FILTERED_HEADER) !== "1") notFound();
}
