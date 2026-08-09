import { Cluster } from "@/components/ui/Cluster";
import { Container } from "@/components/ui/Container";
import { Grid } from "@/components/ui/Grid";
import { Stack } from "@/components/ui/Stack";
import type { HeadingLevel } from "@/lib/a11y";
import { ComponentDoc } from "../ComponentDoc";

function Box({ children }: { children?: string }) {
  return <div className="rounded-control border border-line-strong bg-surface px-[var(--space-3)] py-[var(--space-2)] text-sm text-ink-900">{children ?? "Item"}</div>;
}

export function LayoutSection({ headingLevel }: { headingLevel: HeadingLevel }) {
  return (
    <Stack space={8} as="section" className="border-t border-line pt-[var(--space-8)]">
      <ComponentDoc
        id="container"
        name="Container"
        headingLevel={headingLevel}
        purpose="Centres page content and applies the page gutter. One per page, wrapping everything below the header."
        whenNotToUse="Inside another Container. Nesting doubles the gutter for no reason."
      >
        <div className="rounded-control border border-dashed border-line-strong bg-surface p-[var(--space-2)]">
          <Container>
            <Box>Container content, capped at --width-content and gutter-padded</Box>
          </Container>
        </div>
      </ComponentDoc>

      <ComponentDoc
        id="stack"
        name="Stack"
        headingLevel={headingLevel}
        purpose="Vertical rhythm: a flex column with one consistent gap from the space scale."
        whenNotToUse="For a horizontal row, use Cluster. For a responsive card grid, use Grid."
      >
        <Stack space={2}>
          <Box>First</Box>
          <Box>Second</Box>
          <Box>Third</Box>
        </Stack>
      </ComponentDoc>

      <ComponentDoc
        id="cluster"
        name="Cluster"
        headingLevel={headingLevel}
        purpose="A wrapping horizontal group: tag lists, filter chips, a row of buttons that should wrap at narrow widths rather than overflow (1.4.10)."
        whenNotToUse="For a fixed-column grid, use Grid instead."
      >
        <Cluster space={2}>
          <Box>Tag one</Box>
          <Box>Tag two</Box>
          <Box>A longer tag that helps show wrapping behaviour</Box>
          <Box>Tag four</Box>
        </Cluster>
      </ComponentDoc>

      <ComponentDoc
        id="grid"
        name="Grid"
        headingLevel={headingLevel}
        purpose="An auto-fitting card grid. Columns are computed from a minimum column width, so it reflows on its own without breakpoints and never needs to scroll horizontally."
        whenNotToUse="For a data grid with real rows and columns, use DataTable."
      >
        <Grid space={3} minColumnWidth="10rem">
          <Box>Card</Box>
          <Box>Card</Box>
          <Box>Card</Box>
          <Box>Card</Box>
        </Grid>
      </ComponentDoc>
    </Stack>
  );
}
