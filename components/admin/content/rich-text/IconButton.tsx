"use client";

import type { ButtonHTMLAttributes, Ref } from "react";
import { ConsoleIcon, type ConsoleIconName } from "@/components/admin/icons";

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "title"> {
  icon: ConsoleIconName;
  /** The accessible name and the tooltip; include the shortcut here. */
  label: string;
  pressed?: boolean;
  /** Part of the toolbar's roving tab order. */
  tb?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export const ICON_BUTTON =
  "inline-flex size-8 min-h-0 min-w-0 shrink-0 items-center justify-center rounded-control text-ink-900 hover:bg-surface-sunk " +
  "aria-pressed:bg-action aria-pressed:text-action-ink aria-pressed:hover:bg-action-hover " +
  "disabled:cursor-not-allowed disabled:opacity-50 aria-expanded:bg-surface-sunk";

/** A square icon button with a name, a tooltip and, for toggles, `aria-pressed`. Never changes the editor selection on mouse down. */
export function IconButton({ icon, label, pressed, tb, className, onMouseDown, ref, ...rest }: IconButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      data-tb={tb ? "" : undefined}
      onMouseDown={(event) => {
        event.preventDefault();
        onMouseDown?.(event);
      }}
      className={className ? `${ICON_BUTTON} ${className}` : ICON_BUTTON}
      {...rest}
    >
      <ConsoleIcon name={icon} />
    </button>
  );
}
