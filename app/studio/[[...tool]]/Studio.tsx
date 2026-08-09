"use client";

/**
 * Client boundary for the Sanity Studio.
 *
 * This wrapper exists for one specific reason. `sanity.config.ts` pulls in the
 * whole Studio library, and if a Server Component imports it, Turbopack
 * resolves that subtree under the `react-server` export condition. Sanity's
 * internals import `swr`, whose react-server build has no default export, and
 * the build fails with "Export default doesn't exist in target module".
 *
 * Keeping the config import behind "use client" means it is only ever resolved
 * under the browser and SSR conditions, where `swr` does export a default. The
 * Studio is a client application in any case, so nothing is lost.
 *
 * Do not import `sanity.config.ts` from a Server Component.
 */

import { NextStudio } from "next-sanity/studio";

import config from "@/sanity.config";

export default function Studio() {
  return <NextStudio config={config} />;
}
