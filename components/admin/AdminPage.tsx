import type { ReactNode } from "react";
import { ConsolePage } from "@/components/admin/ui";

/** Kept so existing pages compile unchanged. New pages use `ConsolePage`, which also offers `wide` and `full`. */
export function AdminPage({ children, width = "narrow" }: { children: ReactNode; width?: "narrow" | "content" }) {
  return <ConsolePage width={width}>{children}</ConsolePage>;
}
