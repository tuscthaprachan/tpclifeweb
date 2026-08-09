import { Grid } from "@/components/ui/Grid";
import { Heading } from "@/components/ui/Heading";
import { Stack } from "@/components/ui/Stack";
import type { HeadingLevel } from "@/lib/a11y";

interface PaletteEntry {
  /** CSS custom property to read for the swatch's own background, so the swatch always shows the real, currently active theme's value. */
  cssVar: string;
  label: string;
  ratio: string;
  role: string;
}

const BRAND_PRIMITIVES: PaletteEntry[] = [
  { cssVar: "--brand-orange", label: "brand-orange #F9A36A", ratio: "2.00:1 on white. FAILS as text.", role: "Fill only. Never text, never a control border, never the only carrier of meaning." },
  { cssVar: "--brand-pink", label: "brand-pink #F47A8B", ratio: "2.62:1 on white. FAILS as text.", role: "Fill only. Never text, never a control border, never the only carrier of meaning." },
  { cssVar: "--brand-lilac", label: "brand-lilac #B284D4", ratio: "2.94:1 on white. FAILS as text.", role: "Fill only. Never text, never a control border, never the only carrier of meaning." },
  { cssVar: "--brand-indigo", label: "brand-indigo #7267C8", ratio: "4.68:1 on white. Passes.", role: "Source colour behind colour-accent and the governance fill. Not referenced directly by components." },
  { cssVar: "--brand-plum", label: "brand-plum #A33A72", ratio: "6.17:1 on white. Passes.", role: "Source colour behind colour-action. Not referenced directly by components." },
];

const ROLE_TOKENS: PaletteEntry[] = [
  { cssVar: "--ink-900", label: "ink-900", ratio: "17.87:1 on white, 15.91:1 dark", role: "Body text." },
  { cssVar: "--ink-600", label: "ink-600", ratio: "9.74:1 on white, 10.65:1 dark", role: "Secondary text." },
  { cssVar: "--ink-500", label: "ink-500", ratio: "5.90:1 on white, 6.72:1 dark", role: "Hint text. The lightest text colour this system permits." },
  { cssVar: "--colour-action", label: "colour-action", ratio: "8.34:1 on white, 9.02:1 dark", role: "Links, primary buttons." },
  { cssVar: "--colour-action-hover", label: "colour-action-hover", ratio: "10.97:1 on white, 12.02:1 dark", role: "Hover state for the action colour." },
  { cssVar: "--colour-accent", label: "colour-accent", ratio: "6.60:1 on white, 8.42:1 dark", role: "Secondary action colour, tab and Details accents." },
  { cssVar: "--colour-accent-strong", label: "colour-accent-strong", ratio: "9.04:1 on white, 11.14:1 dark", role: "A stronger secondary action colour." },
  { cssVar: "--line-strong", label: "line-strong", ratio: "3.65:1 on white, 3.46:1 on surface-alt", role: "Control borders (1.4.11). --line is decorative only and never identifies a control." },
];

const FILL_TOKENS: PaletteEntry[] = [
  { cssVar: "--fill-transport", label: "fill-transport", ratio: "ink-on-fill 8.91:1", role: "Shuttle, buses, boats, anything time sensitive. Tags and badges only, per the hard rule." },
  { cssVar: "--fill-welfare", label: "fill-welfare", ratio: "ink-on-fill 6.81:1", role: "Welfare, health, wellbeing. Tags and badges only." },
  { cssVar: "--fill-activity", label: "fill-activity", ratio: "ink-on-fill 6.08:1", role: "Clubs, events, activities. Tags and badges only." },
  {
    cssVar: "--fill-governance",
    label: "fill-governance",
    ratio: "ink-on-fill 5.39:1",
    role: "TUSU, TUSC, policy. Tags and badges only. This is a lightened #8C83D6, not the raw brand indigo, which only reaches 3.82:1 against ink and would fail here.",
  },
];

const STATUS_TOKENS: PaletteEntry[] = [
  { cssVar: "--status-success", label: "status-success", ratio: "5.42:1 on white", role: "StatusTag icon colour only. The label text is always ink-900, per 1.4.1: colour is reinforcement, not the only signal." },
  { cssVar: "--status-warning", label: "status-warning", ratio: "7.06:1 on white", role: "Same." },
  { cssVar: "--status-error", label: "status-error", ratio: "6.24:1 on white", role: "Same." },
  { cssVar: "--status-info", label: "status-info", ratio: "9.04:1 on white", role: "Same." },
  { cssVar: "--status-neutral", label: "status-neutral", ratio: "9.74:1 on white", role: "Same." },
];

function Swatch({ entry }: { entry: PaletteEntry }) {
  return (
    <div className="overflow-hidden rounded-panel border border-line">
      <div className="h-16" style={{ backgroundColor: `var(${entry.cssVar})` }} />
      <div className="flex flex-col gap-[var(--space-1)] p-[var(--space-3)]">
        <p className="m-0 font-mono text-sm text-ink-900">{entry.label}</p>
        <p className="m-0 text-sm text-ink-600">{entry.ratio}</p>
        <p className="m-0 text-sm text-ink-900">{entry.role}</p>
      </div>
    </div>
  );
}

function Group({ title, headingLevel, entries }: { title: string; headingLevel: HeadingLevel; entries: PaletteEntry[] }) {
  return (
    <Stack space={3}>
      <Heading level={headingLevel} className="m-0 text-lg font-semibold text-ink-900">
        {title}
      </Heading>
      <Grid space={4} minColumnWidth="14rem">
        {entries.map((entry) => (
          <Swatch key={entry.cssVar} entry={entry} />
        ))}
      </Grid>
    </Stack>
  );
}

export function PaletteSection({ headingLevel }: { headingLevel: HeadingLevel }) {
  const subLevel = (Math.min(headingLevel + 1, 6) as HeadingLevel);

  return (
    <Stack space={6} as="section" className="border-t border-line pt-[var(--space-8)]">
      <Heading level={headingLevel} id="palette">
        Colour palette and the fill-only rule
      </Heading>
      <p className="m-0 max-w-[var(--measure-en)] text-ink-900">
        Every ratio below is re-derived by <code>npm run check:contrast</code> from styles/tokens.css. Swatches read their
        background from the live CSS custom property, so what you see here is the value actually in effect in the current
        theme, not a copy that can drift out of sync.
      </p>
      <Group title="Brand primitives" headingLevel={subLevel} entries={BRAND_PRIMITIVES} />
      <Group title="Role tokens (text and interactive)" headingLevel={subLevel} entries={ROLE_TOKENS} />
      <Group title="Fills (tags and badges only)" headingLevel={subLevel} entries={FILL_TOKENS} />
      <Group title="Status (StatusTag and NotificationBanner)" headingLevel={subLevel} entries={STATUS_TOKENS} />
    </Stack>
  );
}
