"use client";

import type { Ref } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { ConsoleIcon } from "@/components/admin/icons";
import { Button } from "@/components/ui";
import type { StatusMessage } from "@/components/hooks/use-status-message";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";

const ARROW = { size: 18, strokeWidth: 1.75, absoluteStrokeWidth: true, "aria-hidden": true, focusable: false } as const;

/** Move up, move down and remove for one row of a repeating list. `label` ("Stop 2") is read out after each button's text. */
export function RowActions({
  locale,
  label,
  first,
  last,
  onMove,
  onRemove,
}: {
  locale: Locale;
  label: string;
  first?: boolean;
  last?: boolean;
  /** Omit for lists that cannot be reordered. */
  onMove?: (by: -1 | 1) => void;
  onRemove: () => void;
}) {
  const hidden = <span className="visually-hidden"> {label}</span>;
  return (
    <div className="flex flex-wrap gap-x-[var(--space-3)]">
      {onMove ? (
        <>
          <Button type="button" variant="quiet" size="sm" data-row-action="up" icon={<ArrowUp {...ARROW} />} disabled={first} onClick={() => onMove(-1)}>
            {a("moveUp", locale)}
            {hidden}
          </Button>
          <Button type="button" variant="quiet" size="sm" data-row-action="down" icon={<ArrowDown {...ARROW} />} disabled={last} onClick={() => onMove(1)}>
            {a("moveDown", locale)}
            {hidden}
          </Button>
        </>
      ) : null}
      <Button type="button" variant="quiet" size="sm" data-row-action="remove" icon={<ConsoleIcon name="delete" />} onClick={onRemove}>
        {a("remove", locale)}
        {hidden}
      </Button>
    </div>
  );
}

/** The "Add ..." button under a repeating list. Pass `useRepeater`'s `addRef` so focus can return to it after the last row is removed. */
export function AddRowButton({ label, onClick, addRef }: { label: string; onClick: () => void; addRef?: Ref<HTMLDivElement> }) {
  return (
    <div ref={addRef} className="mt-[var(--space-3)]">
      <Button type="button" variant="secondary" icon={<ConsoleIcon name="add" />} onClick={onClick}>
        {label}
      </Button>
    </div>
  );
}

/** The live region of a repeating list: announces "Stop 2 removed" and the like. Always mounted, so the first message is read. */
export function RepeaterStatus({ message }: { message: StatusMessage<string> }) {
  return (
    <p role="status" className="visually-hidden">
      {message.value ? <span key={message.nonce}>{message.value}</span> : null}
    </p>
  );
}
