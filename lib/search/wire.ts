import type { SearchIndex, SearchRecord } from "@/lib/content/types";

export const SEARCH_INDEX_URL = "/api/search-index";

type WireRecord = Omit<SearchRecord, "path" | "haystack"> & {
  path: SearchRecord["path"] | string;
  haystack?: string;
  rest?: string;
};

export interface WireIndex {
  generatedAt: string;
  records: WireRecord[];
}

function lead(record: Pick<SearchRecord, "title" | "summary">): string {
  return [record.title?.th, record.title?.en, record.summary?.th, record.summary?.en].filter(Boolean).join(" ");
}

function encodeRecord({ path, haystack, ...rest }: SearchRecord): WireRecord {
  const out: WireRecord = { ...rest, path: path.th.startsWith("/th") && path.en === `/en${path.th.slice(3)}` ? path.th : path };
  const prefix = lead(rest);
  if (prefix && haystack === prefix) return out;
  if (prefix && haystack.startsWith(`${prefix} `)) return { ...out, rest: haystack.slice(prefix.length + 1) };
  return { ...out, haystack };
}

function decodeRecord({ path, haystack, rest, ...record }: WireRecord): SearchRecord {
  const prefix = lead(record);
  return {
    ...record,
    path: typeof path === "string" ? { th: path, en: `/en${path.slice(3)}` } : path,
    haystack: haystack ?? (rest === undefined ? prefix : `${prefix} ${rest}`),
  };
}

export function encodeSearchIndex(index: SearchIndex): WireIndex {
  return { generatedAt: index.generatedAt, records: index.records.map(encodeRecord) };
}

export function decodeSearchIndex(index: WireIndex): SearchIndex {
  return { generatedAt: index.generatedAt, records: index.records.map(decodeRecord) };
}

let request: Promise<SearchRecord[]> | null = null;

export function loadSearchRecords(): Promise<SearchRecord[]> {
  request ??= fetch(SEARCH_INDEX_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`search index request failed: ${response.status}`);
      return response.json() as Promise<WireIndex>;
    })
    .then((index) => decodeSearchIndex(index).records)
    .catch((error: unknown) => {
      request = null;
      throw error;
    });
  return request;
}
