"use client";

import { useActionState } from "react";
import { importCsv, type CsvImportKind, type CsvImportState } from "@/app/admin/content/open-data/actions";
import { Button, DataTable, ErrorSummary, NotificationBanner, Select, TextInput, type DataTableColumn } from "@/components/ui";
import { describeCsvError, type CsvRowError } from "@/lib/admin/open-data/csv-import";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";

interface Props {
  locale: Locale;
  kind: CsvImportKind;
  columns: readonly string[];
  owners: { value: string; label: string }[];
}

/** One CSV upload. The whole file is checked on the server; either every row is saved or none and each problem row is listed. */
export function ImportForm({ locale, kind, columns, owners }: Props) {
  const [state, formAction, pending] = useActionState<CsvImportState, FormData>(importCsv.bind(null, kind), {});
  const failure = state.failure;
  const id = `import-${kind}`;

  const rowColumns: DataTableColumn<CsvRowError>[] = [
    { id: "line", header: a("odmCsvLine", locale), cell: (e) => formatNumber(e.line, locale) },
    { id: "column", header: a("odmCsvColumn", locale), cell: (e) => <code>{e.column}</code> },
    { id: "value", header: a("odmCsvValue", locale), cell: (e) => e.value || a("odmCsvEmpty", locale) },
    { id: "problem", header: a("odmCsvProblem", locale), cell: (e) => describeCsvError(e, locale) },
  ];

  const summary: string | null = state.error
    ? state.error
    : failure?.reason === "empty"
      ? a("odmCsvEmptyFile", locale)
      : failure?.reason === "headers"
        ? a("odmCsvHeaders", locale)
        : failure?.reason === "source"
          ? a("odmCsvSourceMissing", locale)
          : failure?.reason === "rows"
            ? a("odmCsvRowsFailed", locale)
            : null;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-[var(--space-4)]">
      {summary ? <ErrorSummary title={UI.errorSummaryTitle[locale]} headingLevel={3} items={[{ href: `#${id}-file`, message: summary }]} /> : null}
      {state.done ? (
        <NotificationBanner variant="success" title={a("odmCsvDone", locale)}>
          {a("odmCsvDoneBody", locale, {
            total: formatNumber(state.done.total, locale),
            created: formatNumber(state.done.created, locale),
            updated: formatNumber(state.done.updated, locale),
            unchanged: formatNumber(state.done.unchanged, locale),
          })}
        </NotificationBanner>
      ) : null}
      {failure?.reason === "headers" ? (
        <div className="flex flex-col gap-[var(--space-1)]">
          {failure.headers.missing.length > 0 ? <p className="m-0">{a("odmCsvMissing", locale, { columns: failure.headers.missing.join(", ") })}</p> : null}
          {failure.headers.unexpected.length > 0 ? <p className="m-0">{a("odmCsvUnexpected", locale, { columns: failure.headers.unexpected.join(", ") })}</p> : null}
          {failure.headers.duplicated.length > 0 ? <p className="m-0">{a("odmCsvDuplicated", locale, { columns: failure.headers.duplicated.join(", ") })}</p> : null}
        </div>
      ) : null}
      {failure?.reason === "rows" ? (
        <div className="flex flex-col gap-[var(--space-2)]">
          <p className="m-0">{a("odmCsvNothingSaved", locale)}</p>
          <DataTable columns={rowColumns} rows={failure.errors} getRowKey={(e) => `${e.line}-${e.column}-${e.code}`} caption={a("odmCsvErrorsCaption", locale)} />
          {failure.more > 0 ? <p className="m-0">{a("odmCsvMore", locale, { count: formatNumber(failure.more, locale) })}</p> : null}
        </div>
      ) : null}

      <p className="m-0 text-sm text-ink-600">
        {a("odmCsvColumnsHint", locale)} <code>{columns.join(", ")}</code>
      </p>
      <Select id={`${id}-owner`} name="owner" label={a("fieldOwner", locale)} options={owners} defaultValue={owners.length === 1 ? owners[0]?.value : ""} className="max-w-[24rem]" />
      {kind === "budget" ? <TextInput id={`${id}-source`} name="sourceDocument" label={a("odmFieldSourceNumber", locale)} hint={a("odmHintSourceNumber", locale)} autoComplete="off" className="max-w-[16rem]" /> : null}
      <div className="flex flex-col gap-[var(--space-1)]">
        <label htmlFor={`${id}-file`} className="font-medium">
          {a("odmFieldCsvFile", locale)}
        </label>
        <input id={`${id}-file`} name="file" type="file" accept="text/csv,.csv" />
      </div>
      <div>
        <Button type="submit" loading={pending} loadingLabel={a("odmCsvImporting", locale)}>
          {a("odmCsvImport", locale)}
        </Button>
      </div>
    </form>
  );
}
