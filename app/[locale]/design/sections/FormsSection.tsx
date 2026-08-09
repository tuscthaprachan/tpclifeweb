import { CharacterCount } from "@/components/ui/CharacterCount";
import { Checkboxes } from "@/components/ui/Checkboxes";
import { DateInput } from "@/components/ui/DateInput";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ErrorSummary } from "@/components/ui/ErrorSummary";
import { Fieldset } from "@/components/ui/Fieldset";
import { Radios } from "@/components/ui/Radios";
import { Select } from "@/components/ui/Select";
import { Stack } from "@/components/ui/Stack";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import type { HeadingLevel } from "@/lib/a11y";
import type { Locale } from "@/lib/i18n/config";
import { ComponentDoc } from "../ComponentDoc";

const DATE_LABELS = {
  th: { day: "วัน", month: "เดือน", year: "ปี" },
  en: { day: "Day", month: "Month", year: "Year" },
} satisfies Record<Locale, { day: string; month: string; year: string }>;

const REMAINING_LABEL = {
  th: { remainingLabel: "เหลือ {count} ตัวอักษร" },
  en: { remainingLabel: "You have {count} characters left", remainingLabelOne: "You have 1 character left" },
} satisfies Record<Locale, { remainingLabel: string; remainingLabelOne?: string }>;

export function FormsSection({ headingLevel, locale }: { headingLevel: HeadingLevel; locale: Locale }) {
  const dateLabels = DATE_LABELS[locale];

  return (
    <Stack space={8} as="section" className="border-t border-line pt-[var(--space-8)]">
      <ComponentDoc
        id="text-input"
        name="TextInput"
        headingLevel={headingLevel}
        purpose="A single line of free text: a name, an email address, a reference number."
        whenNotToUse="For anything longer than a line, use Textarea. For a fixed set of choices, use Select or Radios."
        a11yNotes={["Label, hint and error are tied to the input via aria-describedby, built with describedBy() (3.3.1, 3.3.2)."]}
      >
        <Stack space={4}>
          <TextInput id="ds-text-default" label="Student ID" hint="8 digits, no dashes" />
          <TextInput id="ds-text-error" label="Email" defaultValue="not-an-email" error="Enter an email address in the correct format" />
          <TextInput id="ds-text-disabled" label="Locked field" defaultValue="Cannot be edited" disabled />
        </Stack>
      </ComponentDoc>

      <ComponentDoc
        id="textarea"
        name="Textarea"
        headingLevel={headingLevel}
        purpose="Free text of more than one line: a description, a message body."
        whenNotToUse="When there is a maximum length the reader should see counting down, where CharacterCount is the composed version of this same component."
      >
        <Textarea id="ds-textarea" label="Message" hint="Describe what happened and where" />
      </ComponentDoc>

      <ComponentDoc
        id="character-count"
        name="CharacterCount"
        headingLevel={headingLevel}
        purpose="A Textarea with a maximum length the reader should see counting down: an emergency report body, for instance."
        whenNotToUse="For a field with no real length limit, where the count would just be noise."
        a11yNotes={["The visible count updates every keystroke; the version announced to assistive tech is debounced by 500ms so a fast typist is not interrupted mid-sentence (4.1.3)."]}
      >
        <CharacterCount id="ds-char-count" label="What happened" maxLength={200} {...REMAINING_LABEL[locale]} />
      </ComponentDoc>

      <ComponentDoc
        id="select"
        name="Select"
        headingLevel={headingLevel}
        purpose="A single choice from a longer list, where showing every option as a radio would take too much space."
        whenNotToUse="For two to five options, where Radios keeps every choice visible at once and is easier to scan."
      >
        <Select
          id="ds-select"
          label="Faculty"
          options={[
            { value: "law", label: "Faculty of Law" },
            { value: "econ", label: "Faculty of Economics" },
            { value: "arts", label: "Faculty of Liberal Arts" },
          ]}
        />
      </ComponentDoc>

      <ComponentDoc
        id="radios"
        name="Radios"
        headingLevel={headingLevel}
        purpose="A small set of mutually exclusive choices, all visible at once."
        whenNotToUse="When more than one option can be true at the same time, where Checkboxes is correct."
        a11yNotes={["Grouped with a real <fieldset>/<legend> (via Fieldset), the native way to name a group of inputs, not an aria-label on a wrapping div."]}
      >
        <Radios
          id="ds-radios"
          name="ds-radios"
          legend="Where are you reporting from"
          options={[
            { value: "dorm", label: "A dormitory" },
            { value: "campus", label: "Somewhere on campus" },
            { value: "other", label: "Somewhere else" },
          ]}
        />
      </ComponentDoc>

      <ComponentDoc
        id="checkboxes"
        name="Checkboxes"
        headingLevel={headingLevel}
        purpose="Any number of choices from a set, including none or all of them."
        whenNotToUse="For mutually exclusive choices, where Radios is correct."
      >
        <Checkboxes
          id="ds-checkboxes"
          name="ds-checkboxes"
          legend="Which facilities need attention"
          options={[
            { value: "lighting", label: "Lighting" },
            { value: "plumbing", label: "Plumbing" },
            { value: "wifi", label: "Wi-Fi" },
          ]}
        />
      </ComponentDoc>

      <ComponentDoc
        id="date-input"
        name="DateInput"
        headingLevel={headingLevel}
        purpose="A date the reader types: a date of birth, a date something happened."
        whenNotToUse='For a date picked from a calendar of upcoming dates (an event booking), where a native input type="date" or a purpose-built calendar picker fits better.'
        a11yNotes={["Three separate fields rather than a native date picker: a native picker renders differently per browser and OS and cannot show the Buddhist year Thai readers expect."]}
      >
        <DateInput id="ds-date" legend="Date it happened" dayLabel={dateLabels.day} monthLabel={dateLabels.month} yearLabel={dateLabels.year} />
      </ComponentDoc>

      <ComponentDoc
        id="fieldset"
        name="Fieldset"
        headingLevel={headingLevel}
        purpose="Groups related controls under one legend. Radios, Checkboxes and DateInput all use this internally; reach for it directly only when composing a custom group of controls."
        whenNotToUse="Around a single control, which already has its own label."
      >
        <Fieldset id="ds-fieldset" legend="Contact preference" hint="Choose at least one">
          <p className="m-0 text-sm text-ink-600">Custom group content goes here, same as inside Radios or Checkboxes.</p>
        </Fieldset>
      </ComponentDoc>

      <ComponentDoc
        id="error-message"
        name="ErrorMessage"
        headingLevel={headingLevel}
        purpose="The inline error under a single field. TextInput, Textarea and Select render this for you when you pass error; use it directly only when building a custom field."
        whenNotToUse="Alone, without also listing the same error in ErrorSummary at the top of the form (3.3.1)."
      >
        <ErrorMessage id="ds-error-message">Enter a value for this field</ErrorMessage>
      </ComponentDoc>

      <ComponentDoc
        id="error-summary"
        name="ErrorSummary"
        headingLevel={headingLevel}
        purpose="Lists every failing field at the top of a form after a failed submit, each one linking to its field by id."
        whenNotToUse="On a page with no form, or when there are no errors: it renders nothing when items is empty."
        a11yNotes={[
          "autoFocus is the plain HTML attribute, not a scripted focus() call, so it moves focus here even on a full page reload with JavaScript off.",
          "That means the live example below also grabs focus when this reference page itself loads or is revisited. That is correct production behaviour for a real failed submit, reproduced honestly here rather than faked with a non-functional copy; it is the one component on this page where loading it disturbs the page's own focus order.",
        ]}
      >
        <ErrorSummary
          headingLevel={headingLevel}
          title="There is a problem"
          items={[
            { href: "#ds-text-error", message: "Enter an email address in the correct format" },
            { href: "#ds-date", message: "Enter the date it happened" },
          ]}
        />
      </ComponentDoc>
    </Stack>
  );
}
