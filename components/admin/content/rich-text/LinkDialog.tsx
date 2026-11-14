"use client";

import { getMarkRange, type Editor } from "@tiptap/core";
import { useEffect, useId, useRef, useState } from "react";
import { Button, TextInput } from "@/components/ui";
import { a } from "@/lib/i18n/admin";
import { localePath, type Locale } from "@/lib/i18n/config";
import { isSafeHref } from "@/lib/rich-text/schema";
import { PortalDialog } from "../PortalDialog";

export interface LinkTarget {
  from: number;
  to: number;
  text: string;
  href: string;
  /** The selection is already a link. */
  existing: boolean;
  /** The selection stays inside one block, so its words can be rewritten. */
  editableText: boolean;
}

/** What the link dialog starts from: the link under the caret, else the selection, else nothing. */
export function linkTargetFor(editor: Editor): LinkTarget {
  const { state } = editor;
  const type = state.schema.marks.link!;
  const { from, to, $from, $to, empty } = state.selection;
  const range = empty || editor.isActive("link") ? getMarkRange($from, type) : null;
  if (range && (empty || (range.from <= from && range.to >= to))) {
    return {
      from: range.from,
      to: range.to,
      text: state.doc.textBetween(range.from, range.to),
      href: String(editor.getAttributes("link").href ?? ""),
      existing: true,
      editableText: true,
    };
  }
  return { from, to, text: empty ? "" : state.doc.textBetween(from, to, " "), href: "", existing: false, editableText: empty || $from.sameParent($to) };
}

/** Bare domains get https://, email addresses mailto:; anything else must pass the same check the server applies. */
export function normaliseHref(raw: string): string {
  const v = raw.trim();
  if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(v) && !v.includes("@")) return `https://${v}`;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return `mailto:${v}`;
  return v;
}

interface PageResult {
  id: string;
  title: string;
  subtitle: string;
  path: string;
}

/**
 * Edits a link's words and address, and can point it at a page of this site.
 * Pages are searched through /admin/api/pages and inserted as site-relative
 * addresses in the language of the text being written.
 */
export function LinkDialog({ editor, target, lang, locale, onClose }: { editor: Editor; target: LinkTarget | null; lang: "th" | "en"; locale: Locale; onClose: () => void }) {
  const uid = useId();
  const [text, setText] = useState(target?.text ?? "");
  const [href, setHref] = useState(target?.href ?? "");
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PageResult[] | null>(null);
  const [searchError, setSearchError] = useState(false);
  const textTouched = useRef(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/admin/api/pages?q=${encodeURIComponent(term)}`, { signal: controller.signal, headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as { results: PageResult[] };
        setResults(body.results);
        setSearchError(false);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setSearchError(true);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  if (!target) return null;

  function apply() {
    if (!target) return;
    const address = normaliseHref(href);
    const chain = editor.chain().focus();
    if (!address) {
      if (target.existing) chain.setTextSelection({ from: target.from, to: target.to }).unsetLink().run();
      else chain.run();
      return onClose();
    }
    if (!isSafeHref(address)) return setError(a("errLinkUnsafe", locale));
    const words = (target.editableText ? text : target.text).trim();
    const collapsed = target.from === target.to;
    if (collapsed || (target.editableText && words !== target.text.trim())) {
      chain
        .insertContentAt({ from: target.from, to: target.to }, { type: "text", text: words || address, marks: [{ type: "link", attrs: { href: address } }] })
        .run();
    } else {
      chain.setTextSelection({ from: target.from, to: target.to }).setLink({ href: address }).run();
    }
    onClose();
  }

  function removeLink() {
    if (!target) return;
    editor.chain().focus().setTextSelection({ from: target.from, to: target.to }).unsetLink().run();
    onClose();
  }

  function choose(page: PageResult) {
    setHref(localePath(lang, page.path));
    if (!text.trim() && !textTouched.current && target?.editableText) setText(page.title);
    setError(null);
  }

  return (
    <PortalDialog open onClose={onClose} title={a("rteLinkTitle", locale)} headingLevel={2} locale={locale} className="w-[min(100vw-2rem,34rem)]">
      <div
        className="flex flex-col gap-[var(--space-3)]"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT" && (e.target as HTMLInputElement).type !== "search") {
            e.preventDefault();
            apply();
          }
        }}
      >
        <TextInput
          id={`${uid}-text`}
          label={a("edLinkText", locale)}
          value={target.editableText ? text : target.text}
          readOnly={!target.editableText}
          onChange={(e) => {
            textTouched.current = true;
            setText(e.target.value);
          }}
          lang={lang}
          autoComplete="off"
        />
        <TextInput
          id={`${uid}-href`}
          label={a("rteLinkAddress", locale)}
          hint={a("rteLinkHint", locale)}
          value={href}
          onChange={(e) => {
            setHref(e.target.value);
            setError(null);
          }}
          error={error ?? undefined}
          autoComplete="off"
          spellCheck={false}
        />
        <section aria-labelledby={`${uid}-pages`} className="flex flex-col gap-[var(--space-2)] border-t border-line pt-[var(--space-3)]">
          <h3 id={`${uid}-pages`} className="m-0 text-lg font-semibold">
            {a("edLinkPages", locale)}
          </h3>
          <TextInput
            id={`${uid}-search`}
            type="search"
            label={a("edLinkPageSearch", locale)}
            hint={a("edLinkPageHint", locale)}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (e.target.value.trim().length < 2) setResults(null);
            }}
            autoComplete="off"
          />
          <p role="status" className="m-0 text-sm text-ink-600">
            {searchError ? a("edLinkPageFailed", locale) : results ? (results.length === 0 ? a("edLinkPageNone", locale) : a("edLinkPageCount", locale, { count: results.length })) : ""}
          </p>
          {results && results.length > 0 ? (
            <ul className="m-0 flex max-h-[12rem] list-none flex-col gap-[var(--space-1)] overflow-y-auto p-0">
              {results.map((page) => (
                <li key={page.id}>
                  <button
                    type="button"
                    onClick={() => choose(page)}
                    className="flex min-h-[var(--target-min)] w-full flex-col items-start rounded-control border border-line px-[var(--space-2)] py-[var(--space-1)] text-left hover:bg-surface-sunk"
                  >
                    <span className="font-medium">
                      {page.title}
                      <span className="visually-hidden">. {a("edLinkPageUse", locale)}</span>
                    </span>
                    <span className="text-sm text-ink-600">{page.subtitle}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
        <div className="flex flex-wrap gap-[var(--space-3)]">
          <Button type="button" onClick={apply}>
            {a("rteLinkApply", locale)}
          </Button>
          {target.existing ? (
            <Button type="button" variant="secondary" onClick={removeLink}>
              {a("rteLinkRemove", locale)}
            </Button>
          ) : null}
          <Button type="button" variant="quiet" onClick={onClose}>
            {a("cancel", locale)}
          </Button>
        </div>
      </div>
    </PortalDialog>
  );
}
