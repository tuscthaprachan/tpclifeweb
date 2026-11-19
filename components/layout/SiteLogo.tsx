import { cx } from "@/components/ui/cx";

export function SiteLogo({ size, className }: { size: number; className?: string; priority?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      className={cx("shrink-0 select-none", className)}
    >
      <path d="M4 60 32 20 60 60Z" fill="var(--brand-orange)" />
      <path d="M32 4 44 30H20Z" fill="var(--logo-purple)" />
    </svg>
  );
}
