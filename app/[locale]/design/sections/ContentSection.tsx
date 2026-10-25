import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Details } from "@/components/ui/Details";
import { River } from "@/components/illustrations/River";
import { EmptyState } from "@/components/ui/EmptyState";
import { Heading } from "@/components/ui/Heading";
import { InsetText } from "@/components/ui/InsetText";
import { NotificationBanner } from "@/components/ui/NotificationBanner";
import { Pagination } from "@/components/ui/Pagination";
import { Panel } from "@/components/ui/Panel";
import { Prose } from "@/components/ui/Prose";
import { Stack } from "@/components/ui/Stack";
import { SummaryList } from "@/components/ui/SummaryList";
import { StatusTag } from "@/components/ui/StatusTag";
import { Tag } from "@/components/ui/Tag";
import { Timestamp } from "@/components/ui/Timestamp";
import { WarningText } from "@/components/ui/WarningText";
import type { HeadingLevel } from "@/lib/a11y";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { ComponentDoc } from "../ComponentDoc";

interface TimetableRow {
  route: string;
  departs: string;
  seats: string;
}

const TIMETABLE_COLUMNS: DataTableColumn<TimetableRow>[] = [
  { id: "route", header: "Route", cell: (row) => row.route },
  { id: "departs", header: "Departs", cell: (row) => row.departs, align: "end" },
  { id: "seats", header: "Seats free", cell: (row) => row.seats, align: "end" },
];

const TIMETABLE_ROWS: TimetableRow[] = [
  { route: "Thammasat Tha Prachan to Rangsit", departs: "07:30", seats: "12" },
  { route: "Thammasat Tha Prachan to Rangsit", departs: "08:00", seats: "4" },
  { route: "Rangsit to Thammasat Tha Prachan", departs: "08:15", seats: "20" },
];

export function ContentSection({ headingLevel, locale }: { headingLevel: HeadingLevel; locale: Locale }) {
  return (
    <Stack space={8} as="section" className="border-t border-line pt-[var(--space-8)]">
      <ComponentDoc
        id="heading"
        name="Heading"
        headingLevel={headingLevel}
        purpose="Every heading on the site, at whatever depth the page outline needs."
        whenNotToUse="For text that only needs to look bold, not to be a heading. Use font weight utilities on a <p> instead."
        a11yNotes={["Takes a required level prop rather than defaulting to h2, so a component cannot silently skip a level in the outline (1.3.1, 2.4.6)."]}
      >
        <Stack space={1}>
          <Heading level={4}>This is rendered with level 4</Heading>
          <p className="m-0 text-sm text-ink-600">The visual size always follows the tag, from typography.css. Pass visualLevel only when the outline depth and the type size genuinely need to diverge.</p>
        </Stack>
      </ComponentDoc>

      <ComponentDoc
        id="prose"
        name="Prose"
        headingLevel={headingLevel}
        purpose="Wraps rich text (Portable Text output, long-form guidance) and applies the reading measure so lines do not run the full width of a wide page."
        whenNotToUse="For a single short paragraph or a form hint, which do not need a constrained measure."
      >
        <Prose locale={locale}>
          <p>
            This paragraph is capped at the reading measure for {locale === "th" ? "Thai" : "English"}, which is wider for Thai because Thai runs more characters per line at
            the same point size.
          </p>
          <p>A second paragraph shows the automatic spacing Prose applies between flow elements.</p>
        </Prose>
      </ComponentDoc>

      <ComponentDoc
        id="summary-list"
        name="SummaryList"
        headingLevel={headingLevel}
        purpose="Key and value rows for a record: a form's own summary before submit, a policy's detail page, a shuttle stop's facts."
        whenNotToUse="For tabular data with more than one value per row, where DataTable fits better."
        a11yNotes={["Stacks key over value below sm rather than forcing a horizontal scroll (1.4.10)."]}
      >
        <SummaryList
          rows={[
            { key: "Form", value: "Dormitory maintenance report" },
            { key: "Deadline", value: "Rolling, no fixed date" },
            { key: "Responsible body", value: "TUSC Tha Prachan", actions: <a href="#summary-list" className="text-action underline">Change</a> },
          ]}
        />
      </ComponentDoc>

      <ComponentDoc
        id="data-table"
        name="DataTable"
        headingLevel={headingLevel}
        purpose="Genuinely tabular data: a timetable, a list with several comparable columns per row."
        whenNotToUse="For a simple key/value record, where SummaryList is the right, simpler pattern."
        a11yNotes={[
          "Below sm each cell becomes a labelled row instead of scrolling the table sideways (1.4.10).",
          "See the note in components/ui/DataTable.tsx about the trade-off of changing display on table cells at that breakpoint.",
        ]}
      >
        <DataTable columns={TIMETABLE_COLUMNS} rows={TIMETABLE_ROWS} getRowKey={(row) => `${row.route}-${row.departs}`} caption="Sample shuttle timetable" />
      </ComponentDoc>

      <ComponentDoc
        id="tag"
        name="Tag"
        headingLevel={headingLevel}
        purpose="A category label: which of transport, welfare, activity or governance a piece of content belongs to."
        whenNotToUse="For a status (in progress, delivered, blocked). Use StatusTag, which always carries an icon and word as well as colour."
      >
        <div className="flex flex-wrap gap-[var(--space-2)]">
          <Tag tone="transport">Transport</Tag>
          <Tag tone="welfare">Welfare</Tag>
          <Tag tone="activity">Activity</Tag>
          <Tag tone="governance">Governance</Tag>
          <Tag tone="neutral">Neutral</Tag>
        </div>
      </ComponentDoc>

      <ComponentDoc
        id="status-tag"
        name="StatusTag"
        headingLevel={headingLevel}
        purpose="A status: not started, in progress, delivered, blocked, dropped, or a form/search result state."
        whenNotToUse="Never with an empty label. A StatusTag with no visible word is a 1.4.1 bug, which is why label is required, not optional."
      >
        <div className="flex flex-wrap gap-[var(--space-2)]">
          <StatusTag tone="success" label="Delivered" />
          <StatusTag tone="info" label="In progress" />
          <StatusTag tone="warning" label="Blocked" />
          <StatusTag tone="error" label="Dropped" />
          <StatusTag tone="neutral" label="Not started" />
        </div>
      </ComponentDoc>

      <ComponentDoc
        id="inset-text"
        name="InsetText"
        headingLevel={headingLevel}
        purpose="A quoted or supplementary passage set off from the surrounding copy: a quote from a policy document, a worked example."
        whenNotToUse="For a warning, where WarningText carries the icon that a plain inset does not. Inset text is a grey rule and indented text: no fill and no colour."
      >
        <InsetText>A quoted passage sits here, indented and set off from the paragraph before it.</InsetText>
      </ComponentDoc>

      <ComponentDoc
        id="warning-text"
        name="WarningText"
        headingLevel={headingLevel}
        purpose="A warning the reader needs to notice before continuing: a deadline that has nearly passed, a form that cannot be resubmitted."
        whenNotToUse="For a page-level alert about something that just happened, where NotificationBanner is the right pattern."
        a11yNotes={["The GOV.UK warning text: bold text beside a black \"!\" icon, with no box, fill or coloured border. children must start with the visually hidden word \"Warning\" in the active language (UI.warning); the icon is decorative."]}
      >
        <WarningText>
          <span className="visually-hidden">{UI.warning[locale]}: </span>
          {locale === "th" ? "ปิดรับคำร้องนี้ในอีก 2 วัน" : "This request closes in 2 days"}
        </WarningText>
      </ComponentDoc>

      <ComponentDoc
        id="details"
        name="Details"
        headingLevel={headingLevel}
        purpose="Extra detail that most readers do not need: a definition, a longer explanation, an FAQ answer."
        whenNotToUse="For anything that must be visible on first load, or for a tooltip. This is the accessible replacement for a tooltip, not an addition to one (1.4.13)."
      >
        <Details summary="What counts as a welfare emergency?">
          <p className="m-0">Anything that puts a student&apos;s health, safety or ability to continue studying at immediate risk.</p>
        </Details>
      </ComponentDoc>

      <ComponentDoc
        id="notification-banner"
        name="NotificationBanner"
        headingLevel={headingLevel}
        purpose="A page-level message: a form was submitted, a service is degraded, a warning that needs immediate attention."
        whenNotToUse="For a per-field form error, where ErrorMessage plus ErrorSummary is the correct pattern."
        a11yNotes={["The GOV.UK notification banner: a white body inside a solid border, with a solid title bar holding the title. Brand colour for info and warning, green for success. There is no tinted fill.", "info is a labelled region; success is role=alert and takes focus when it appears after an action; warning is announced assertively (4.1.3)."]}
      >
        <Stack space={3}>
          <NotificationBanner variant="info" title="Service notice">The shuttle timetable was updated for this semester.</NotificationBanner>
          <NotificationBanner variant="success" title="Submitted" focusOnMount={false}>Your report has been sent to TUSC Tha Prachan.</NotificationBanner>
          <NotificationBanner variant="warning" title="Action needed">This form closes for submissions in 2 days.</NotificationBanner>
        </Stack>
      </ComponentDoc>

      <ComponentDoc
        id="no-accent-boxes"
        name="No tinted accent boxes"
        headingLevel={headingLevel}
        purpose="Setting something apart from the text around it. This site uses the GOV.UK patterns: inset text for a quotation or supporting passage, warning text for something the reader must not miss, a notification banner for a page-level message, an error summary for a failed form, a phase banner for the service stage, and a summary card, a heading with a rule or a plain list for grouped information."
        whenNotToUse="A coloured or tinted background panel with a coloured left or top stripe, a coloured border, or both: a callout box, alert box or soft-tinted card. These are not used anywhere, public site or admin. Structure comes from headings, spacing, rules and bold text, and colour never carries the meaning on its own."
        a11yNotes={[
          "Tags and status tags are labels, not boxes, so a small tinted fill behind a word is allowed there (and the word and icon always come with it).",
          "scripts/check-no-accent-boxes.mjs runs in npm run check and fails on a class list that pairs a coloured thick border with a tinted background, and on bg-*-soft outside the tag components.",
          "Rich text callout blocks keep their stored tones: info renders as inset text, warning and critical as warning text. Service alerts render as notification banners, critical with warning text inside.",
        ]}
      >
        <Stack space={4}>
          <Heading level={4} className="m-0 text-lg">
            Summary card
          </Heading>
          <div className="border border-line-strong bg-surface">
            <div className="border-b border-line px-[var(--space-4)] py-[var(--space-3)]">
              <Heading level={5} className="m-0 text-lg">
                Student ID reissue form
              </Heading>
            </div>
            <div className="px-[var(--space-4)] py-[var(--space-3)]">
              <p className="m-0">Used for a lost or damaged card. White, a thin grey border, and a title row above a rule.</p>
            </div>
          </div>
        </Stack>
      </ComponentDoc>

      <ComponentDoc
        id="panel"
        name="Panel"
        headingLevel={headingLevel}
        purpose="A prominent confirmation panel at the end of a completed task, such as a submitted form."
        whenNotToUse="Anywhere higher up a page than the very end of a completed flow. It is deliberately loud."
      >
        <Panel headingLevel={4} title="Report submitted" tone="success">
          Your reference number is WF-2031.
        </Panel>
      </ComponentDoc>

      <ComponentDoc
        id="pagination"
        name="Pagination"
        headingLevel={headingLevel}
        purpose="Paging through a long list: news, events, forms."
        whenNotToUse="For fewer results than fit on one page. It renders nothing when totalPages is 1 or fewer."
        a11yNotes={["Renders real <a href> links built from buildHref, so paging works with JavaScript off, per the progressive enhancement rule in CONTRIBUTING.md."]}
      >
        <Pagination currentPage={2} totalPages={5} buildHref={(page) => `#pagination?page=${page}`} locale={locale} />
      </ComponentDoc>

      <ComponentDoc
        id="empty-state"
        name="EmptyState"
        headingLevel={headingLevel}
        purpose="A list or search with nothing in it, so the page never looks broken or blank. Shows the River illustration above the title; pass illustration={false} to leave it out."
        whenNotToUse='For an error condition, where NotificationBanner variant="warning" fits better. Turn the illustration off in dense staff tables.'
        a11yNotes={["The illustration is decorative (aria-hidden), so the title is the only content a screen reader announces."]}
      >
        <Stack space={4}>
          <EmptyState title="No events scheduled">Check back closer to the new semester.</EmptyState>
          <EmptyState title="No events scheduled" illustration={false} />
        </Stack>
      </ComponentDoc>

      <ComponentDoc
        id="river"
        name="River"
        headingLevel={headingLevel}
        purpose="The small campus scene (sun, river and ferry) used in EmptyState, the not-found pages and the error page. Under 2 KB, coloured with fill and surface tokens so it follows the theme."
        whenNotToUse="As the only signal of a state, or anywhere it would repeat on the same page: it is decoration and carries no meaning."
        a11yNotes={["Renders aria-hidden and not focusable. Size it with className, for example h-[84px] w-[120px]."]}
      >
        <River className="h-[84px] w-[120px]" />
      </ComponentDoc>

      <ComponentDoc
        id="timestamp"
        name="Timestamp"
        headingLevel={headingLevel}
        purpose="Any published, reviewed or updated date on the site."
        whenNotToUse="Never render a bare formatted date string without this component: the machine-readable datetime attribute is what lets assistive tech and search engines parse it unambiguously."
      >
        <Stack space={1}>
          <p className="m-0 text-sm text-ink-600">date: <Timestamp value="2026-08-07T09:00:00+07:00" locale={locale} /></p>
          <p className="m-0 text-sm text-ink-600">datetime: <Timestamp value="2026-08-07T09:00:00+07:00" locale={locale} format="datetime" /></p>
          <p className="m-0 text-sm text-ink-600">
            relative: <Timestamp value="2026-05-01T09:00:00+07:00" locale={locale} format="relative" now={new Date("2026-08-07T09:00:00+07:00")} />
          </p>
        </Stack>
      </ComponentDoc>
    </Stack>
  );
}
