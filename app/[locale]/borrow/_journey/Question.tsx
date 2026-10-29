import type { ReactNode } from "react";
import { Heading } from "@/components/ui";

/** Heading that doubles as a form legend, so the question is read once. */
export function Question({ children }: { children: ReactNode }) {
  return (
    <Heading level={1} className="m-0">
      {children}
    </Heading>
  );
}
