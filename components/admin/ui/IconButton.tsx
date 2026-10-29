import type { ComponentPropsWithoutRef } from "react";
import { ConsoleIcon, type ConsoleIconName } from "@/components/admin/icons";

interface IconButtonOwn {
  icon: ConsoleIconName;
  /** Required: the accessible name, also shown as a tooltip. */
  label: string;
  size?: number;
  className?: string;
}

type AsButton = IconButtonOwn & { href?: undefined } & Omit<ComponentPropsWithoutRef<"button">, keyof IconButtonOwn | "children" | "aria-label">;
type AsAnchor = IconButtonOwn & { href: string } & Omit<ComponentPropsWithoutRef<"a">, keyof IconButtonOwn | "children" | "href" | "aria-label">;

export type IconButtonProps = AsButton | AsAnchor;

/** An icon-only button or link with a mandatory accessible label and a target of at least var(--target-min). */
export function IconButton(props: IconButtonProps) {
  const { icon, label, size, className = "", href, ...rest } = props;
  const classes = `console-icon-button ${className}`;
  const content = <ConsoleIcon name={icon} size={size} />;
  if (href !== undefined) {
    return (
      <a href={href} aria-label={label} title={label} className={classes} {...(rest as Omit<ComponentPropsWithoutRef<"a">, "href">)}>
        {content}
      </a>
    );
  }
  const { type, ...buttonRest } = rest as Omit<ComponentPropsWithoutRef<"button">, "children">;
  return (
    <button type={type ?? "button"} aria-label={label} title={label} className={classes} {...buttonRest}>
      {content}
    </button>
  );
}
