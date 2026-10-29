"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

export type QueryRecord = Record<string, string | undefined>;

export function useQueryRecord(): QueryRecord {
  const params = useSearchParams();
  return useMemo(() => {
    const record: QueryRecord = {};
    for (const [key, value] of params) if (!(key in record)) record[key] = value;
    return record;
  }, [params]);
}
