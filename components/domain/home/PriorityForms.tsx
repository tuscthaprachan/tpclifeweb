import { FormCard } from "@/components/domain/form";
import { Button, EmptyState, Grid, Heading, Stack } from "@/components/ui";
import { localePath, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { FormRecord } from "@/lib/sanity/types";

interface PriorityFormsProps {
  locale: Locale;
  /** `getPriorityForms()`, already filtered and ordered by the query. */
  forms: FormRecord[];
}

const MAX_FORMS = 4;

/**
 * Section 4: the centralised form system. The small set of forms an editor
 * has marked `isPriority`, surfaced directly as cards (the priority set is
 * exactly the case CONTRIBUTING.md reserves cards for in the form domain),
 * plus a route to the full index at `/{locale}/forms` regardless of whether
 * this list is empty.
 */
export function PriorityForms({ locale, forms }: PriorityFormsProps) {
  const priorityForms = forms.slice(0, MAX_FORMS);

  return (
    <Stack space={4} as="section">
      <Stack space={1}>
        <Heading level={2} className="m-0">
          {UI.forms[locale]}
        </Heading>
        <p className="m-0 text-ink-600">{UI.formsIntro[locale]}</p>
      </Stack>

      {priorityForms.length === 0 ? (
        <EmptyState
          title={UI.nothingHere[locale]}
          action={
            <Button href={localePath(locale, "/forms")} variant="secondary" size="sm">
              {UI.seeAll[locale]}
            </Button>
          }
        />
      ) : (
        <>
          <Grid minColumnWidth="18rem">
            {priorityForms.map((form) => (
              <FormCard key={form._id} form={form} locale={locale} headingLevel={3} />
            ))}
          </Grid>
          <div>
            <Button href={localePath(locale, "/forms")} variant="secondary" size="sm">
              {UI.seeAll[locale]}
            </Button>
          </div>
        </>
      )}
    </Stack>
  );
}
