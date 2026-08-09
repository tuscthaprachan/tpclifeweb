import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "destructive";
export type ButtonSize = "sm" | "md";

interface ButtonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Only meaningful on the `<button>` form (no href). Ignored on a link. */
  loading?: boolean;
  /** Announced politely while `loading` is true, since the visible label does not change to say so itself. Required whenever `loading` can be true. */
  loadingLabel?: string;
  className?: string;
  children: ReactNode;
}

type ButtonAsButton = ButtonOwnProps & { href?: undefined } & Omit<ComponentPropsWithoutRef<"button">, keyof ButtonOwnProps | "href">;

type ButtonAsAnchor = ButtonOwnProps & { href: string } & Omit<ComponentPropsWithoutRef<"a">, keyof ButtonOwnProps | "href">;

export type ButtonProps = ButtonAsButton | ButtonAsAnchor;

const BASE =
  "inline-flex min-h-[var(--target-min)] min-w-[var(--target-min)] items-center justify-center gap-[var(--space-2)] " +
  "rounded-control font-medium no-underline transition-colors duration-[var(--motion-state)] ease-[var(--easing)] " +
  "disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60";

/**
 * `destructive` has no dedicated hover token (there is no --status-error-hover
 * in tokens.css), so its hover state is an elevation change rather than an
 * invented colour, which would fall outside the fixed palette.
 */
const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "bg-action text-action-ink hover:bg-action-hover",
  secondary: "border border-line-strong bg-surface text-ink-900 hover:bg-surface-alt",
  quiet: "bg-transparent text-action underline decoration-1 underline-offset-[0.2em] hover:text-action-hover",
  destructive: "bg-error text-ink-inverse hover:shadow-[var(--shadow-elevation)]",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "px-[var(--space-3)] py-[var(--space-1)] text-sm",
  md: "px-[var(--space-4)] py-[var(--space-2)] text-base",
};

/**
 * Renders a real `<button>` by default, or an `<a>` when given `href`. Both
 * get identical visual treatment, so a reader cannot tell navigation and
 * action apart by looking, only by what actually happens (2.4.4).
 */
export function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", loading, loadingLabel, className, children, href, ...rest } = props;
  const classes = cx(BASE, VARIANT_CLASS[variant], SIZE_CLASS[size], className);

  if (href !== undefined) {
    const anchorRest = rest as Omit<ComponentPropsWithoutRef<"a">, "href" | "className" | "children">;
    return (
      <a href={href} className={classes} {...anchorRest}>
        {children}
      </a>
    );
  }

  const { type, disabled, ...buttonRest } = rest as Omit<ComponentPropsWithoutRef<"button">, "href" | "className" | "children">;
  const isDisabled = loading === true || disabled === true;

  return (
    <button type={type ?? "button"} className={classes} disabled={isDisabled} {...buttonRest}>
      {children}
      {loading ? (
        <span role="status" aria-live="polite" className="visually-hidden">
          {loadingLabel}
        </span>
      ) : null}
    </button>
  );
}
