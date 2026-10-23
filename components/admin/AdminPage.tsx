import type { ReactNode } from "react";
import { Container, Stack } from "@/components/ui";

/** The page body every console page shares: one centred column with the usual rhythm. */
export function AdminPage({ children, width = "narrow" }: { children: ReactNode; width?: "narrow" | "content" }) {
  return (
    <Container width={width}>
      <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-6)]">
        {children}
      </Stack>
    </Container>
  );
}
