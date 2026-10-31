import { Fragment, type ReactNode } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Heading } from "@/components/ui/Heading";
import { cx } from "@/components/ui/cx";
import { externalLinkProps, externalLinkSuffix, isExternalUrl, type HeadingLevel } from "@/lib/a11y";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { detectLanguage, inlineText, parseMarkdown, type Block, type Inline, type ListItem, type TableCell } from "@/lib/open-data/markdown";
import { classifyMinutes, type Division, type MinutesKind } from "@/lib/open-data/minutes";
import { fillText } from "./fill";

interface TranscriptProps {
  /** The transcription as stored, without its front matter. */
  markdown: string;
  /** The page language, for the markers the page adds ("[Page 2 of the original]"). */
  locale: Locale;
  /** The depth a `#` heading in the transcription takes in the page outline. */
  headingLevel: HeadingLevel;
  /** "minutes" sets a record of proceedings out Hansard style; every other document renders plainly. */
  variant?: "minutes";
  className?: string;
}

interface Context {
  locale: Locale;
  headingLevel: HeadingLevel;
  tables: { count: number };
}

function renderInline(nodes: Inline[], locale: Locale): ReactNode {
  return nodes.map((node, index) => {
    switch (node.t) {
      case "text":
        return <Fragment key={index}>{node.v}</Fragment>;
      case "strong":
        return <strong key={index}>{renderInline(node.c, locale)}</strong>;
      case "em":
        return <em key={index}>{renderInline(node.c, locale)}</em>;
      case "del":
        return <del key={index}>{renderInline(node.c, locale)}</del>;
      case "u":
        return <u key={index}>{renderInline(node.c, locale)}</u>;
      case "anchor":
        return <span key={index} id={node.id} />;
      case "link": {
        const external = isExternalUrl(node.href);
        return (
          <a key={index} href={node.href} {...externalLinkProps(external)} className="text-action underline">
            {renderInline(node.c, locale)}
            {external ? <span className="visually-hidden">{externalLinkSuffix(locale, true)}</span> : null}
          </a>
        );
      }
    }
  });
}

function Ids({ ids }: { ids: string[] }) {
  return ids.slice(1).map((id) => <span key={id} id={id} />);
}

function listItemText(item: ListItem, locale: Locale): ReactNode {
  const text = renderInline(item.c, locale);
  if (item.number !== null && !item.printed) return <>{item.number}. {text}</>;
  return text;
}

function renderList(block: Extract<Block, { t: "list" }>, key: number, ctx: Context, nested: boolean): ReactNode {
  return (
    <ul key={key} className={cx("m-0 flex list-none flex-col gap-[var(--space-1)] p-0", nested && "ml-[var(--space-6)] mt-[var(--space-1)]")}>
      {block.items.map((item, index) => (
        <li key={index} className={cx("whitespace-pre-line", !block.ordered && !item.printed && "list-disc ml-[var(--space-5)]")}>
          {listItemText(item, ctx.locale)}
          {item.nested.map((child, childIndex) => (child.t === "list" ? renderList(child, childIndex, ctx, true) : null))}
        </li>
      ))}
    </ul>
  );
}

function renderTable(block: Extract<Block, { t: "table" }>, key: number, ctx: Context): ReactNode {
  ctx.tables.count += 1;
  const rows = block.rows.map((cells, i) => ({ i, cells }));
  const columns: DataTableColumn<{ i: number; cells: TableCell[] }>[] = block.head.map((cell, index) => {
    const header = inlineText(cell.c).trim();
    return {
      id: `c${index}`,
      header: header || fillText(UI.odMdColumn[ctx.locale], { n: index + 1 }),
      cell: (row) => renderInline(row.cells[index]?.c ?? [], ctx.locale),
      align: cell.align === "end" ? "end" : undefined,
    };
  });
  return (
    <DataTable
      key={key}
      columns={columns}
      rows={rows}
      getRowKey={(row) => String(row.i)}
      caption={<span className="visually-hidden">{fillText(UI.odMdTableLabel[ctx.locale], { n: ctx.tables.count })}</span>}
    />
  );
}

function renderBlock(block: Block, key: number, ctx: Context): ReactNode {
  switch (block.t) {
    case "heading": {
      const level = Math.min(6, ctx.headingLevel + block.level - 1) as HeadingLevel;
      return (
        <Heading key={key} level={level} id={block.ids[0]} className="m-0 mt-[var(--space-4)]">
          <Ids ids={block.ids} />
          {renderInline(block.c, ctx.locale)}
        </Heading>
      );
    }
    case "paragraph":
      return (
        <p key={key} id={block.ids[0]} className="m-0 max-w-[var(--measure-th)] whitespace-pre-line">
          <Ids ids={block.ids} />
          {renderInline(block.c, ctx.locale)}
        </p>
      );
    case "quote":
      return (
        <blockquote key={key} className="m-0 flex flex-col gap-[var(--space-3)] border-l-4 border-line-strong pl-[var(--space-4)] text-ink-900">
          {block.c.map((child, index) => renderBlock(child, index, ctx))}
        </blockquote>
      );
    case "list":
      return renderList(block, key, ctx, false);
    case "table":
      return renderTable(block, key, ctx);
    case "page":
      return (
        <p key={key} className="m-0 border-t border-line pt-[var(--space-2)] text-sm text-ink-600">
          {fillText(UI.odMdPageMarker[ctx.locale], { n: block.n })}
        </p>
      );
    case "rule":
      return <hr key={key} className="m-0 border-line" />;
  }
}

function renderDivision(division: Division, key: number, ctx: Context): ReactNode {
  ctx.tables.count += 1;
  return (
    <table key={key} className="w-full max-w-[24rem] border-collapse border border-line-strong text-left">
      <caption className="visually-hidden">{fillText(UI.odMdTableLabel[ctx.locale], { n: ctx.tables.count })}</caption>
      {division.head ? (
        <thead>
          <tr className="border-b border-line-strong">
            {division.head.map((cell, index) => (
              <th key={index} scope="col" className={cx("p-[var(--space-3)] text-sm font-bold", index === 1 ? "text-right" : "text-left")}>
                {renderInline(cell.c, ctx.locale)}
              </th>
            ))}
          </tr>
        </thead>
      ) : null}
      <tbody>
        {division.rows.map((row, index) => (
          <tr key={index} className={cx(index > 0 && "border-t border-line")}>
            <th scope="row" className="p-[var(--space-3)] text-left font-normal">
              {renderInline(row.label.c, ctx.locale)}
            </th>
            <td className="p-[var(--space-3)] text-right text-xl font-bold">{renderInline(row.figure.c, ctx.locale)}</td>
            <td className="p-[var(--space-3)] text-sm text-ink-600">{row.unit ? renderInline(row.unit.c, ctx.locale) : null}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderMinutesBlock(block: Block, kind: MinutesKind, key: number, ctx: Context): ReactNode {
  if (kind.k === "division") return renderDivision(kind.division, key, ctx);
  if (block.t === "heading" && kind.k === "agenda") {
    const level = Math.min(6, ctx.headingLevel + block.level - 1) as HeadingLevel;
    const top = kind.level === "item";
    return (
      <Heading
        key={key}
        level={level}
        id={block.ids[0]}
        className={cx("m-0", top ? "mt-[var(--space-8)] border-t border-line-strong pt-[var(--space-4)]" : "mt-[var(--space-6)] border-t border-line pt-[var(--space-3)]")}
      >
        <Ids ids={block.ids} />
        {renderInline(block.c, ctx.locale)}
      </Heading>
    );
  }
  if (block.t !== "paragraph") return renderBlock(block, key, ctx);
  switch (kind.k) {
    case "contribution":
      return (
        <div key={key} id={block.ids[0]} className="flex max-w-[var(--measure-th)] flex-col gap-[var(--space-1)] border-t border-line pt-[var(--space-3)]">
          <Ids ids={block.ids} />
          <p className="m-0">
            <strong>{kind.contribution.prefix}</strong>
          </p>
          <p className="m-0 whitespace-pre-line">{renderInline(kind.contribution.rest, ctx.locale)}</p>
        </div>
      );
    case "resolution":
      return (
        <p key={key} id={block.ids[0]} className="m-0 max-w-[var(--measure-th)] whitespace-pre-line border border-line-strong p-[var(--space-4)]">
          <Ids ids={block.ids} />
          {renderInline(block.c, ctx.locale)}
        </p>
      );
    case "time":
      return (
        <p key={key} id={block.ids[0]} className="m-0 max-w-[var(--measure-th)] whitespace-pre-line text-sm text-ink-600">
          <Ids ids={block.ids} />
          {renderInline(block.c, ctx.locale)}
        </p>
      );
    case "signature":
      return (
        <p
          key={key}
          id={block.ids[0]}
          className={cx("m-0 w-full max-w-[24rem] self-end whitespace-pre-line text-center text-sm text-ink-600", kind.first && "mt-[var(--space-6)]")}
        >
          <Ids ids={block.ids} />
          {renderInline(block.c, ctx.locale)}
        </p>
      );
    default:
      return renderBlock(block, key, ctx);
  }
}

/**
 * A transcription rendered from its Markdown, exactly as written: printed clause and sub-clause
 * numbers stay text (a list never generates its own number), `<a id>` anchors keep their ids,
 * tables use the site table, and page breaks become a small marker. The "minutes" variant only
 * changes presentation: contributions under the speaker's name, agenda items as ruled sections,
 * resolutions boxed, vote tables as a division result; the text itself is never altered.
 */
export function Transcript({ markdown, locale, headingLevel, variant, className }: TranscriptProps) {
  const ctx: Context = { locale, headingLevel, tables: { count: 0 } };
  const blocks = parseMarkdown(markdown);
  const kinds = variant === "minutes" ? classifyMinutes(blocks) : null;
  return (
    <div lang={detectLanguage(markdown)} className={cx("flex flex-col gap-[var(--space-4)]", className)}>
      {blocks.map((block, index) => {
        const kind = kinds?.[index];
        return kind ? renderMinutesBlock(block, kind, index, ctx) : renderBlock(block, index, ctx);
      })}
    </div>
  );
}
