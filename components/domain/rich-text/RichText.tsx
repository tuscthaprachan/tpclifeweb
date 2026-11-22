import { Fragment, type ReactNode } from "react";

import { Heading, Link, Prose, ScrollTable } from "@/components/ui";
import type { HeadingLevel } from "@/lib/a11y";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { RichTextDoc, RichTextNode } from "@/lib/rich-text/types";
import type { CalloutBoxAttrs, ContactBlockAttrs, FormCalloutAttrs, ImageAttrs, KeyFactsAttrs, LinkOutAttrs, LiveTimelineAttrs, StepListAttrs } from "@/lib/rich-text/schema";
import { KeyFactsBlock } from "./blocks/KeyFactsBlock";
import { CalloutBoxBlock } from "./blocks/CalloutBoxBlock";
import { ContactBlockRenderer } from "./blocks/ContactBlock";
import { FormCalloutBlock } from "./blocks/FormCalloutBlock";
import { ImageBlock } from "./blocks/ImageBlock";
import { LinkOutBlock } from "./blocks/LinkOutBlock";
import { StepListBlock } from "./blocks/StepListBlock";
import { LiveTimelineBlock } from "./blocks/LiveTimelineBlock";
import { clampHeadingLevel } from "./headingLevel";
import type { ResolvedRefs } from "./types";

interface RichTextProps {
  /** One language side of a rich text field, e.g. `newsPost.body[locale]`. Validated on write; not re-validated here. */
  value: RichTextDoc | null | undefined;
  locale: Locale;
  /**
   * The outline depth a level 2 heading written in the CMS should render at
   * on this page. Levels 3 and 4 in the body offset from this by one and
   * two. Always clamped to 2 or deeper, so body content can never produce
   * the page's own h1.
   */
  headingLevel: HeadingLevel;
  /** Forms and images referenced by the document, fetched by the read layer. */
  resolved?: ResolvedRefs;
  className?: string;
  anchorPrefix?: string;
}

interface Ctx {
  locale: Locale;
  headingLevel: HeadingLevel;
  bodyLevel: HeadingLevel;
  resolved: ResolvedRefs;
  anchors?: Map<RichTextNode, string>;
}

function renderMarks(node: RichTextNode, ctx: Ctx): ReactNode {
  let out: ReactNode = node.text;
  // Marks are listed outermost first, so wrap from the last one inwards.
  for (const mark of [...(node.marks ?? [])].reverse()) {
    if (mark.type === "bold") out = <strong>{out}</strong>;
    else if (mark.type === "italic") out = <em>{out}</em>;
    else if (mark.type === "underline") out = <u>{out}</u>;
    else if (mark.type === "strike") out = <s>{out}</s>;
    else if (mark.type === "code") {
      out = <code className="rounded-control bg-surface-sunk px-[var(--space-1)] py-px font-mono text-[0.9em] text-ink-900 [overflow-wrap:anywhere]">{out}</code>;
    }
    else if (mark.type === "link" && typeof mark.attrs?.href === "string") {
      out = (
        <Link href={mark.attrs.href} locale={ctx.locale}>
          {out}
        </Link>
      );
    }
  }
  return out;
}

function renderInline(nodes: readonly RichTextNode[] | undefined, ctx: Ctx): ReactNode[] {
  return (nodes ?? []).map((node, i) => {
    if (node.type === "hardBreak") return <br key={i} />;
    return <Fragment key={i}>{renderMarks(node, ctx)}</Fragment>;
  });
}

/**
 * Children of a node that holds a single run of text (list item, quote):
 * a lone paragraph is unwrapped so the output matches the old renderer's
 * `<li>text</li>` and `<blockquote>text</blockquote>`.
 */
function renderBlocks(nodes: readonly RichTextNode[] | undefined, ctx: Ctx, unwrapFirstParagraph = false): ReactNode[] {
  const list = nodes ?? [];
  const onlyOneParagraph = list.filter((n) => n.type === "paragraph").length === 1;
  return list.map((node, i) => {
    if (node.type === "paragraph" && unwrapFirstParagraph && onlyOneParagraph) {
      return <Fragment key={i}>{renderInline(node.content, ctx)}</Fragment>;
    }
    return renderNode(node, ctx, i);
  });
}

function cellText(cell: RichTextNode): string {
  const parts: string[] = [];
  const walk = (nodes: readonly RichTextNode[] | undefined) => {
    for (const n of nodes ?? []) {
      if (n.type === "text" && n.text) parts.push(n.text);
      else if (n.type === "hardBreak") parts.push(" ");
      walk(n.content);
    }
  };
  walk(cell.content);
  return parts.join("").replace(/\s+/g, " ").trim();
}

function renderTable(node: RichTextNode, ctx: Ctx, key: number): ReactNode {
  const rows = node.content ?? [];
  const head = rows[0]?.content?.[0]?.type === "tableHeader" ? rows[0] : undefined;
  const body = head ? rows.slice(1) : rows;
  const cell = "px-[var(--space-2)] py-[var(--space-2)] align-top [overflow-wrap:break-word] sm:px-[var(--space-3)]";
  const fit = (c: RichTextNode) => (cellText(c).length <= 16 ? " whitespace-nowrap" : " min-w-[8rem]");
  return (
    <ScrollTable key={key} label={UI.scrollableTable[ctx.locale]}>
      <table className="w-full border-collapse text-left">
        {head ? (
          <thead>
            <tr>
              {head.content?.map((c, i) => (
                <th key={i} scope="col" className={`${cell}${fit(c)} border-b border-line-strong font-semibold text-ink-900`}>
                  {renderInline(c.content?.[0]?.content, ctx)}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {body.map((row, r) => (
            <tr key={r}>
              {row.content?.map((c, i) => (
                <td key={i} className={`${cell}${fit(c)} border-t border-line text-ink-900`}>
                  {renderInline(c.content?.[0]?.content, ctx)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollTable>
  );
}

function renderNode(node: RichTextNode, ctx: Ctx, key: number): ReactNode {
  const attrs = (node.attrs ?? {}) as Record<string, unknown>;
  switch (node.type) {
    case "paragraph":
      return <p key={key}>{renderInline(node.content, ctx)}</p>;
    case "heading": {
      const offset = typeof attrs.level === "number" ? attrs.level - 2 : 0;
      return (
        <Heading key={key} id={ctx.anchors?.get(node)} level={clampHeadingLevel(ctx.headingLevel + offset)}>
          {renderInline(node.content, ctx)}
        </Heading>
      );
    }
    case "blockquote":
      return (
        <blockquote
          key={key}
          className="border-l-[length:var(--border-width-thick)] border-line-strong pl-[var(--space-4)] py-[var(--space-1)] text-ink-900 italic"
        >
          {renderBlocks(node.content, ctx, true)}
        </blockquote>
      );
    case "bulletList":
      return (
        <ul key={key} className="m-0 flex list-disc flex-col gap-[var(--space-2)] pl-[var(--space-6)]">
          {renderBlocks(node.content, ctx)}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} className="m-0 flex list-decimal flex-col gap-[var(--space-2)] pl-[var(--space-6)]">
          {renderBlocks(node.content, ctx)}
        </ol>
      );
    case "listItem":
      return <li key={key}>{renderBlocks(node.content, ctx, true)}</li>;
    case "codeBlock":
      return (
        <pre key={key} className="m-0 whitespace-pre-wrap rounded-control bg-surface-sunk p-[var(--space-3)] font-mono text-sm text-ink-900 [overflow-wrap:anywhere]">
          <code>{node.content?.map((c) => c.text).join("")}</code>
        </pre>
      );
    case "horizontalRule":
      return <hr key={key} className="m-0 border-0 border-t border-line-strong" />;
    case "table":
      return renderTable(node, ctx, key);
    case "image": {
      const a = attrs as unknown as ImageAttrs;
      return <ImageBlock key={key} attrs={a} image={ctx.resolved.images?.get(a.imageId)} locale={ctx.locale} />;
    }
    case "formCallout": {
      const a = attrs as unknown as FormCalloutAttrs;
      return (
        <FormCalloutBlock key={key} attrs={a} form={ctx.resolved.forms?.get(a.formId)} locale={ctx.locale} headingLevel={ctx.bodyLevel} />
      );
    }
    case "linkOut":
      return <LinkOutBlock key={key} attrs={attrs as unknown as LinkOutAttrs} locale={ctx.locale} />;
    case "calloutBox":
      return <CalloutBoxBlock key={key} attrs={attrs as unknown as CalloutBoxAttrs} locale={ctx.locale} />;
    case "stepList":
      return <StepListBlock key={key} attrs={attrs as unknown as StepListAttrs} locale={ctx.locale} headingLevel={ctx.bodyLevel} />;
    case "liveTimeline":
      return <LiveTimelineBlock key={key} attrs={attrs as unknown as LiveTimelineAttrs} locale={ctx.locale} headingLevel={ctx.bodyLevel} />;
    case "keyFacts":
      return <KeyFactsBlock key={key} attrs={attrs as unknown as KeyFactsAttrs} locale={ctx.locale} headingLevel={ctx.bodyLevel} />;
    case "contactBlock":
      return <ContactBlockRenderer key={key} attrs={attrs as unknown as ContactBlockAttrs} locale={ctx.locale} />;
    default:
      // Unknown nodes never reach here for documents that passed
      // `parseRichTextDoc`; skipping is safer than throwing mid-page.
      return null;
  }
}

/**
 * The shared renderer for every rich text body on the site: news, events,
 * welfare, guide, FAQ. `Prose`-wrapped so the reading measure and vertical
 * rhythm come from the same place as every other rich text block. Never uses
 * `dangerouslySetInnerHTML`; every node type is a real React component.
 */
export interface RichTextSection {
  id: string;
  label: string;
}

function topSections(value: RichTextDoc | null | undefined, prefix: string): { node: RichTextNode; section: RichTextSection }[] {
  return (value?.content ?? [])
    .filter((node) => node.type === "heading" && (node.attrs?.level ?? 2) === 2)
    .map((node, i) => ({ node, section: { id: `${prefix}-${i + 1}`, label: cellText(node) } }))
    .filter(({ section }) => section.label.length > 0);
}

export function richTextSections(value: RichTextDoc | null | undefined, prefix: string): RichTextSection[] {
  return topSections(value, prefix).map(({ section }) => section);
}

export function RichText({ value, locale, headingLevel, resolved = {}, className, anchorPrefix }: RichTextProps) {
  if (!value || value.content.length === 0) return null;

  const anchors = anchorPrefix ? new Map(topSections(value, anchorPrefix).map(({ node, section }) => [node, section.id])) : undefined;
  const ctx: Ctx = { locale, headingLevel, bodyLevel: clampHeadingLevel(headingLevel), resolved, anchors };

  return (
    <Prose locale={locale} className={className}>
      {renderBlocks(value.content, ctx)}
    </Prose>
  );
}
