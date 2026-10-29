import { Suspense, type ReactNode } from "react";

export function QueryBoundary({ filtered, fallback, children }: { filtered: boolean; fallback: ReactNode; children: ReactNode }) {
  return filtered ? children : <Suspense fallback={fallback}>{children}</Suspense>;
}
