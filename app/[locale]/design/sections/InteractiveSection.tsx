import { Accordion } from "@/components/ui/Accordion";
import { Button } from "@/components/ui/Button";
import { Cluster } from "@/components/ui/Cluster";
import { Link } from "@/components/ui/Link";
import { Stack } from "@/components/ui/Stack";
import { Tabs } from "@/components/ui/Tabs";
import type { HeadingLevel } from "@/lib/a11y";
import type { Locale } from "@/lib/i18n/config";
import { ComponentDoc } from "../ComponentDoc";
import { DialogDemo } from "../demos/DialogDemo";

export function InteractiveSection({ headingLevel, locale }: { headingLevel: HeadingLevel; locale: Locale }) {
  const subLevel = (Math.min(headingLevel + 2, 6) as HeadingLevel);

  return (
    <Stack space={8} as="section" className="border-t border-line pt-[var(--space-8)]">
      <ComponentDoc
        id="button"
        name="Button"
        headingLevel={headingLevel}
        purpose="A primary action, a secondary action, a quiet inline action, or a destructive one. Renders <a> instead of <button> when given href, with identical styling."
        whenNotToUse="For plain navigation inside body copy, where Link is correct and keeps the underline readers expect on an inline link."
        a11yNotes={["Every size clears the 24x24 CSS px target minimum via an explicit min-h/min-w, not only the global selector, so it holds even when rendered as <a> (2.5.8).", "loading announces loadingLabel politely without changing the visible label text."]}
      >
        <Stack space={3}>
          <Cluster space={2}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="quiet">Quiet</Button>
            <Button variant="destructive">Destructive</Button>
          </Cluster>
          <Cluster space={2}>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button disabled>Disabled</Button>
            <Button loading loadingLabel={locale === "th" ? "กำลังบันทึก" : "Saving"}>Loading</Button>
            <Button href="#button">As a link</Button>
          </Cluster>
        </Stack>
      </ComponentDoc>

      <ComponentDoc
        id="link"
        name="Link"
        headingLevel={headingLevel}
        purpose="An inline link inside body copy. Detects an external URL automatically and appends a visually-hidden new-tab notice."
        whenNotToUse="For a call-to-action that should look like a button, use Button with an href instead."
      >
        <p className="m-0 text-ink-900">
          Read the <Link href="/th/forms" locale={locale}>internal forms page</Link>, or the{" "}
          <Link href="https://www.tu.ac.th" locale={locale}>university website</Link>.
        </p>
      </ComponentDoc>

      <ComponentDoc
        id="tabs"
        name="Tabs"
        headingLevel={headingLevel}
        purpose="A small, fixed set of views over the same subject, all visible at once conceptually: this semester's timetable by day, for instance."
        whenNotToUse="For a sequence the reader should read start to finish, or for more than about five panels, where a list of links to separate pages reads better."
        a11yNotes={["Roving tabindex: only the selected tab sits in the Tab order, arrow keys move between tabs (WAI-ARIA APG tabs pattern)."]}
      >
        <Tabs
          label="Sample tabs"
          items={[
            { id: "one", label: "Monday", panel: <p className="m-0">Panel content for Monday.</p> },
            { id: "two", label: "Tuesday", panel: <p className="m-0">Panel content for Tuesday.</p> },
            { id: "three", label: "Wednesday", panel: <p className="m-0">Panel content for Wednesday.</p> },
          ]}
        />
      </ComponentDoc>

      <ComponentDoc
        id="accordion"
        name="Accordion"
        headingLevel={headingLevel}
        purpose="A list of independent, optional sections a reader may or may not need: an FAQ, a set of guide chapters."
        whenNotToUse="For content the reader is very likely to need, which should just be visible."
      >
        <Accordion
          headingLevel={subLevel}
          sections={[
            { id: "acc-one", title: "How do I request a locker?", content: <p className="m-0">Use the lockers form under Welfare.</p> },
            { id: "acc-two", title: "Who do I contact about a broken shuttle?", content: <p className="m-0">Report it through the transport report form.</p> },
          ]}
        />
      </ComponentDoc>

      <ComponentDoc
        id="dialog"
        name="Dialog"
        headingLevel={headingLevel}
        purpose="A focused task that must be completed or dismissed before returning to the page: a confirmation before a destructive action."
        whenNotToUse="For anything that should stay reachable while the reader keeps working, or for a simple disclosure, where Details fits better."
        a11yNotes={["Native <dialog> with showModal(): focus trap and Escape-to-close are the browser's own behaviour. Nothing here calls preventDefault on cancel, so Escape always works."]}
      >
        <DialogDemo headingLevel={subLevel} locale={locale} />
      </ComponentDoc>
    </Stack>
  );
}
