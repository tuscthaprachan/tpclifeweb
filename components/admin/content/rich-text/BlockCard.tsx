"use client";

import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import type { BlockType } from "@/lib/rich-text/editor";
import type { ImageChoice } from "@/lib/admin/content/images";
import type { EditorBridge } from "./bridge";
import { IconButton } from "./IconButton";
import { BlockDialog } from "./BlockDialog";
import { BlockPreview } from "./BlockPreview";
import { BLOCK_LABEL, type RichTextRefs } from "./blocks";

type Raw = Record<string, unknown>;

export interface BlockContext {
  locale: Locale;
  bodyLocale: Locale;
  refs: RichTextRefs;
  onImageUploaded: (image: ImageChoice) => void;
  /** Said to assistive technology after a block moves. */
  announce: (message: string) => void;
}

export interface BlockOptions {
  bridge: EditorBridge;
}

/** Moves the block at `pos` one place up or down among its siblings. Returns where it ended up, or null when it is already at that end. */
export function moveBlock(editor: Editor, pos: number, direction: -1 | 1): { pos: number; index: number; total: number } | null {
  const { doc } = editor.state;
  const $pos = doc.resolve(pos);
  const node = $pos.nodeAfter;
  if (!node) return null;
  const index = $pos.index();
  const parent = $pos.parent;
  const sibling = parent.maybeChild(index + direction);
  if (!sibling) return null;
  const tr = editor.state.tr;
  let target: number;
  if (direction === -1) {
    target = pos - sibling.nodeSize;
    tr.delete(pos, pos + node.nodeSize).insert(target, node);
  } else {
    target = pos + sibling.nodeSize;
    tr.insert(pos + node.nodeSize + sibling.nodeSize, node).delete(pos, pos + node.nodeSize);
  }
  tr.setSelection(NodeSelection.create(tr.doc, target));
  editor.view.dispatch(tr.scrollIntoView());
  editor.view.focus();
  return { pos: target, index: index + direction, total: parent.childCount };
}

/** A document block with its published layout and editing controls anchored to its position. */
export function BlockCard({ node, getPos, deleteNode, selected, extension, editor, updateAttributes }: NodeViewProps) {
  const bridge = (extension.options as BlockOptions).bridge;
  const ctx = useSyncExternalStore(bridge.subscribe, bridge.getCtx, bridge.getCtx);
  const id = useId();
  const editButton = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const [editing, setEditing] = useState(false);

  useLayoutEffect(() => {
    if (!editing && restoreFocus.current) {
      restoreFocus.current = false;
      editButton.current?.focus();
    }
  }, [editing]);

  if (!ctx) return null;
  const { locale, bodyLocale, refs, onImageUploaded, announce } = ctx;
  const type = node.type.name as BlockType;
  const attrs = node.attrs as Raw;
  const name = a(BLOCK_LABEL[type], locale);

  function closeEdit() {
    restoreFocus.current = true;
    setEditing(false);
  }

  function move(direction: -1 | 1) {
    const pos = getPos();
    if (typeof pos !== "number") return;
    const result = moveBlock(editor as Editor, pos, direction);
    if (result) announce(a("edBlockMoved", locale, { block: name, position: result.index + 1, total: result.total }));
  }

  return (
    <NodeViewWrapper
      contentEditable={false}
      data-editor-block=""
      className="group relative min-w-0 [overflow-wrap:anywhere]"
    >
      <div
        lang={bodyLocale}
        className={selected ? "outline outline-action outline-offset-[var(--space-1)]" : undefined}
      >
        <BlockPreview type={type} attrs={attrs} locale={bodyLocale} uiLocale={locale} refs={refs} />
      </div>
      {editing ? (
        <BlockDialog
          inlineId={id}
          mode="edit"
          type={type}
          initial={attrs}
          locale={locale}
          bodyLocale={bodyLocale}
          refs={refs}
          onSubmit={(next) => {
            updateAttributes(next);
            closeEdit();
          }}
          onClose={closeEdit}
          onImageUploaded={onImageUploaded}
        />
      ) : (
        <div
          role="group"
          aria-label={a("edBlockActions", locale, { block: name })}
          className={`relative z-10 mt-[var(--space-1)] ml-auto flex w-fit flex-wrap justify-end gap-[var(--space-1)] rounded-control border border-line bg-surface p-[var(--space-1)] sm:absolute sm:top-0 sm:right-0 sm:mt-0
            ${selected ? "" : "[@media(hover:hover)]:sm:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"}`}
        >
          <IconButton
            ref={editButton}
            icon="edit"
            label={`${a("edit", locale)}: ${name}`}
            onClick={() => setEditing(true)}
          />
          <IconButton icon="moveUp" label={`${a("moveUp", locale)}: ${name}`} onClick={() => move(-1)} />
          <IconButton icon="moveDown" label={`${a("moveDown", locale)}: ${name}`} onClick={() => move(1)} />
          <IconButton icon="delete" label={`${a("remove", locale)}: ${name}`} onClick={() => deleteNode()} />
        </div>
      )}
    </NodeViewWrapper>
  );
}
