import { vi } from "vitest";

/**
 * Collects every Portable Text field the two Sanity seed scripts would write.
 * Both scripts build their documents and write them at import time, so the
 * only way to read them without editing them is to import each one with the
 * Sanity client mocked and capture what is handed to `createOrReplace`.
 */
export async function loadSeedDocs(): Promise<Array<Record<string, unknown>>> {
  const docs: Array<Record<string, unknown>> = [];
  const chain: unknown = new Proxy(() => chain, { get: (_t, prop) => (prop === "then" ? undefined : chain) });

  vi.resetModules();
  vi.doMock("@sanity/client", () => ({
    createClient: () => ({
      createOrReplace: async (doc: Record<string, unknown>) => {
        docs.push(doc);
      },
      fetch: async () => null,
      patch: () => chain,
      transaction: () => chain,
    }),
  }));
  process.env.SANITY_API_WRITE_TOKEN = "test-token";
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ??= "test";
  process.env.NEXT_PUBLIC_SANITY_DATASET ??= "test";
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const err = vi.spyOn(console, "error").mockImplementation(() => {});
  const exit = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);

  try {
    await import("../../../sanity/seed/handbook");
    await import("../../../sanity/seed/seed");
    // Let the scripts' async main functions drain.
    let last = -1;
    while (docs.length !== last) {
      last = docs.length;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  } finally {
    log.mockRestore();
    err.mockRestore();
    exit.mockRestore();
    vi.doUnmock("@sanity/client");
  }
  return docs;
}

type PtBlock = { _type: string; [key: string]: unknown };

/** Every array in a seed document that looks like Portable Text, with where it was found. */
export function findPortableText(docs: Array<Record<string, unknown>>): Array<{ where: string; blocks: PtBlock[] }> {
  const found: Array<{ where: string; blocks: PtBlock[] }> = [];
  const walk = (value: unknown, where: string) => {
    if (Array.isArray(value)) {
      if (value.length > 0 && value.every((v) => typeof v === "object" && v !== null && "_type" in v) && value.some((v) => (v as PtBlock)._type === "block")) {
        found.push({ where, blocks: value as PtBlock[] });
        return;
      }
      value.forEach((v, i) => walk(v, `${where}[${i}]`));
    } else if (typeof value === "object" && value !== null) {
      for (const [k, v] of Object.entries(value)) walk(v, `${where}.${k}`);
    }
  };
  docs.forEach((doc) => walk(doc, String(doc._id)));
  return found;
}
