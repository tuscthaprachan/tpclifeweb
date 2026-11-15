"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { clearFind, getFindState, replaceAll, replaceCurrent, setFind, stepFind } from "./find-replace";
import { IconButton } from "./IconButton";

const FIELD =
  "min-h-[var(--target-min)] min-w-0 flex-1 basis-[10rem] rounded-control border border-line-strong bg-surface px-[var(--space-2)] py-[var(--space-1)] text-base text-ink-900";

/** Find and replace for one editor: match count, next and previous, replace one or all, case toggle. Escape closes it and returns to the text. */
export function FindPanel({ editor, locale, focusNonce, onClose }: { editor: Editor; locale: Locale; focusNonce: number; onClose: () => void }) {
  const queryRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [note, setNote] = useState("");
  const find = useEditorState({ editor, selector: ({ editor: e }) => getFindState(e.state) });
  const total = find.matches.length;

  useEffect(() => () => clearFind(editor), [editor]);

  useEffect(() => {
    queryRef.current?.focus();
    queryRef.current?.select();
  }, [focusNonce]);

  function close() {
    clearFind(editor);
    onClose();
    editor.commands.focus();
  }

  function onKey(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === "Enter" && event.target === queryRef.current) {
      event.preventDefault();
      stepFind(editor, event.shiftKey ? -1 : 1);
    }
  }

  const status = !query ? "" : total === 0 ? a("edFindNone", locale) : a("edFindCount", locale, { current: find.current + 1, total });

  return (
    <div role="search" aria-label={a("edFind", locale)} onKeyDown={onKey} className="flex flex-wrap items-center gap-[var(--space-2)] border-b border-line bg-surface-alt p-[var(--space-2)]">
      <input
        ref={queryRef}
        type="text"
        aria-label={a("edFindQuery", locale)}
        placeholder={a("edFindQuery", locale)}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setNote("");
          setFind(editor, { query: e.target.value, caseSensitive });
        }}
        autoComplete="off"
        spellCheck={false}
        className={FIELD}
      />
      <input
        type="text"
        aria-label={a("edFindReplaceWith", locale)}
        placeholder={a("edFindReplaceWith", locale)}
        value={replacement}
        onChange={(e) => setReplacement(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        className={FIELD}
      />
      <span className="min-w-[5rem] text-sm text-ink-600" aria-live="polite">
        {status}
      </span>
      <span className="text-sm text-ink-600" role="status">
        {note}
      </span>
      <IconButton icon="rteCaseSensitive" label={a("edFindCase", locale)} pressed={caseSensitive} onClick={() => {
        setCaseSensitive(!caseSensitive);
        setFind(editor, { query, caseSensitive: !caseSensitive });
      }} />
      <IconButton icon="chevronUp" label={a("edFindPrev", locale)} disabled={total === 0} onClick={() => stepFind(editor, -1)} />
      <IconButton icon="chevronDown" label={a("edFindNext", locale)} disabled={total === 0} onClick={() => stepFind(editor, 1)} />
      <IconButton icon="rteReplace" label={a("edFindReplace", locale)} disabled={total === 0} onClick={() => replaceCurrent(editor, replacement)} />
      <IconButton
        icon="rteReplaceAll"
        label={a("edFindReplaceAll", locale)}
        disabled={total === 0}
        onClick={() => {
          const n = replaceAll(editor, replacement);
          setNote(a("edFindReplaced", locale, { count: n }));
        }}
      />
      <IconButton icon="close" label={a("edFindClose", locale)} onClick={close} />
    </div>
  );
}
