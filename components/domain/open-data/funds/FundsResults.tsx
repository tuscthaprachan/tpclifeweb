"use client";

import Form from "next/form";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import { liveRegionProps } from "@/lib/a11y";
import { localePath, type Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { useQueryRecord, type QueryRecord } from "@/lib/use-query";
import { fillText } from "../fill";
import { FUNDS_PAGE_SIZE, INCOME_ONLY, SPENDABLE, fundsHref, fundsView, parseFundFilter, parsePage, type FundListRow } from "./kinds";

interface FundsResultsProps {
  locale: Locale;
  /** The route without its locale, such as "/about/open-data/tusc/funds". */
  route: string;
  funds: FundListRow[];
  /** Table number of the list, so it follows the regulated funds table. */
  tableNumber: number;
  downloadHref: string;
  downloadSize: string;
}

export function LiveFundsResults(props: FundsResultsProps) {
  return <FundsResults {...props} query={useQueryRecord()} />;
}

export function FundsResults({ locale, route, funds, tableNumber, downloadHref, downloadSize, query }: FundsResultsProps & { query: QueryRecord }) {
  const filter = parseFundFilter(query.type);
  const view = fundsView(funds, filter, parsePage(query.page), FUNDS_PAGE_SIZE);
  const base = localePath(locale, route);
  const n = (value: number) => formatNumber(value, locale);
  const count = (kind: "income" | "spendable") => funds.filter((f) => f.kind === kind).length;

  const kindLabel = (row: FundListRow) => {
    if (row.kind === "other") return row.type ?? "";
    if (locale === "th") return row.kind === "income" ? INCOME_ONLY : SPENDABLE;
    return row.kind === "income" ? UI.odFundsKeyIncome.en : UI.odFundsKeySpend.en;
  };

  const columns: DataTableColumn<FundListRow>[] = [
    { id: "number", header: UI.odFundsColNo[locale], rowHeader: true, cell: (row) => n(row.number) },
    { id: "code", header: UI.odFundsColFundCode[locale], cell: (row) => row.code },
    { id: "name", header: UI.odFundsColName[locale], cell: (row) => <span lang="th">{row.name}</span> },
    { id: "kind", header: UI.odFundsColKind[locale], cell: (row) => (locale === "th" ? <span lang="th">{kindLabel(row)}</span> : kindLabel(row)) },
  ];

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <Form action={base} aria-label={UI.odFundsFilterLegend[locale]} className="flex flex-wrap items-end gap-[var(--space-4)]">
        <Select
          key={filter}
          id="funds-filter-type"
          name="type"
          label={UI.odFundsFilterType[locale]}
          defaultValue={filter}
          options={[
            { value: "", label: fillText(UI.odFundsFilterAll[locale], { n: n(funds.length) }) },
            { value: "income", label: fillText(UI.odFundsFilterIncome[locale], { n: n(count("income")) }) },
            { value: "spendable", label: fillText(UI.odFundsFilterSpend[locale], { n: n(count("spendable")) }) },
          ]}
        />
        <Button type="submit">{UI.odFundsFilterButton[locale]}</Button>
        {filter ? (
          <Link href={base} className="inline-flex min-h-[var(--target-min)] items-center text-action underline">
            {UI.clearFilters[locale]}
          </Link>
        ) : null}
      </Form>
      <p className="m-0" {...liveRegionProps()}>
        {fillText(UI.odFundsShowing[locale], { from: n(view.from), to: n(view.to), total: n(view.total) })}
      </p>
      <p className="m-0">
        <a href={downloadHref} download className="inline-flex min-h-[var(--target-min)] items-center text-action underline hover:text-action-hover">
          {fillText(UI.odFundsDownloadAll[locale], { n: n(funds.length), size: downloadSize })}
        </a>
      </p>
      <DataTable
        id="funds-list"
        columns={columns}
        rows={view.rows}
        getRowKey={(row) => String(row.number)}
        caption={fillText(UI.odFundsListCaption[locale], { n: n(tableNumber), from: n(view.from), to: n(view.to), total: n(view.total) })}
        sourceNote={UI.odFundsListSource[locale]}
        locale={locale}
      />
      <Pagination currentPage={view.page} totalPages={view.totalPages} buildHref={(page) => fundsHref(base, view.filter, page)} locale={locale} />
    </div>
  );
}
