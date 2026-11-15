"use client";

import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import Image from "next/image";
import { useSyncExternalStore } from "react";
import { ConsoleIcon } from "@/components/admin/icons";
import { CalloutBoxBlock } from "@/components/domain/rich-text/blocks/CalloutBoxBlock";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import type { BlockType } from "@/lib/rich-text/editor";
import type { CalloutBoxAttrs } from "@/lib/rich-text/schema";
import type { EditorBridge } from "./bridge";
import { IconButton } from "./IconButton";
import { BLOCK_ICON, BLOCK_LABEL, summariseBlock, type RichTextRefs } from "./blocks";

type Raw = Record<string, unknown>;

export interface BlockContext {
  locale: Locale;
  refs: RichTextRefs;
  onEdit: (type: BlockType, pos: number, attrs: Raw) => void;
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

/** How a custom block looks inside the editor: a card with its icon, a thumbnail for pictures, what it holds, and Edit, Remove, Move up and Move down. */
export function BlockCard({ node, getPos, deleteNode, selected, extension, editor }: NodeViewProps) {
  const bridge = (extension.options as BlockOptions).bridge;
  const ctx = useSyncExternalStore(bridge.subscribe, bridge.getCtx, bridge.getCtx);
  if (!ctx) return null;
  const { locale, refs, onEdit, announce } = ctx;
  const type = node.type.name as BlockType;
  const attrs = node.attrs as Raw;
  const summary = summariseBlock(type, attrs, locale, refs);
  const name = a(BLOCK_LABEL[type], locale);
  const image = type === "image" ? refs.images.find((i) => i.id === attrs.imageId) : undefined;
  const move = (direction: -1 | 1) => {
    const pos = getPos();
    if (typeof pos !== "number") return;
    const result = moveBlock(editor as Editor, pos, direction);
    if (result) announce(a("edBlockMoved", locale, { block: name, position: result.index + 1, total: result.total }));
  };

  return (
    <NodeViewWrapper
      contentEditable={false}
      className={`my-[var(--space-3)] flex flex-wrap items-center gap-[var(--space-3)] border bg-surface p-[var(--space-3)] ${
        selected ? "border-[length:var(--border-width-thick)] border-action" : "border-line"
      }`}
    >
      {image?.url ? (
        <Image src={image.url} alt="" width={56} height={56} unoptimized className="size-14 shrink-0 rounded-control bg-surface-sunk object-cover" />
      ) : (
        <span aria-hidden="true" className="inline-flex size-14 shrink-0 items-center justify-center rounded-control bg-surface-sunk text-ink-600">
          <ConsoleIcon name={BLOCK_ICON[type]} size={24} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="m-0 flex items-center gap-[var(--space-1)] text-sm font-semibold text-ink-600">
          <ConsoleIcon name={BLOCK_ICON[type]} size={16} />
          {name}
        </p>
        {type === "calloutBox" && summary ? (
          <CalloutBoxBlock attrs={attrs as unknown as CalloutBoxAttrs} locale={locale} />
        ) : (
          <p className="m-0 break-words">{summary || a("blockEmpty", locale)}</p>
        )}
      </div>
      <div role="group" aria-label={a("edBlockActions", locale, { block: name })} className="flex shrink-0 gap-[var(--space-1)]">
        <IconButton icon="moveUp" label={`${a("moveUp", locale)}: ${name}`} onClick={() => move(-1)} className="border border-line-strong" />
        <IconButton icon="moveDown" label={`${a("moveDown", locale)}: ${name}`} onClick={() => move(1)} className="border border-line-strong" />
        <IconButton
          icon="edit"
          label={`${a("edit", locale)}: ${name}`}
          onClick={() => {
            const pos = getPos();
            if (typeof pos === "number") onEdit(type, pos, attrs);
          }}
          className="border border-line-strong"
        />
        <IconButton icon="delete" label={`${a("remove", locale)}: ${name}`} onClick={() => deleteNode()} className="border border-line-strong" />
      </div>
    </NodeViewWrapper>
  );
}
