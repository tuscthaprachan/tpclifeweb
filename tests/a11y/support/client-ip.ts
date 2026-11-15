import { createHash } from "node:crypto";
import type { TestInfo } from "@playwright/test";

/**
 * An address in the benchmarking range (198.18.0.0/15, RFC 2544) unique to one test, sent as
 * `x-forwarded-for`. Tracking lookups are rate limited per address, so a whole
 * suite from one machine would otherwise share one allowance and fail on
 * `problem=limited` instead of the behaviour under test.
 */
export function clientIpFor(testInfo: TestInfo): string {
  const hash = createHash("sha256").update(`${testInfo.testId}:${testInfo.retry}`).digest();
  return `198.${18 + (hash[0]! % 2)}.${hash[1]}.${hash[2]! || 1}`;
}

/** `test.use(perTestClientIp)` gives every test, page and request its own address. */
export const perTestClientIp = {
  extraHTTPHeaders: async ({}, provide: (headers: Record<string, string>) => Promise<void>, testInfo: TestInfo) => {
    await provide({ "x-forwarded-for": clientIpFor(testInfo) });
  },
};
