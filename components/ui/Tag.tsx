import { Bus, HeartHandshake, Landmark, Sparkles, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "./cx";
import { DecorativeIcon } from "./route-icons";

export type TagTone = "transport" | "welfare" | "activity" | "governance" | "neutral";

interface TagProps {
  children: ReactNode;
  tone?: TagTone;
  className?: string;
  /** Show the category icon before the text. On by default for the four categories; the neutral tag never has one. */
  icon?: boolean;
}

/**
 * A category label, not a status. For transport, welfare, activity and
 * governance this is exactly the documented use of the saturated brand
 * fills: tags and badges carry `--ink-on-fill`, which is where their
 * contrast was measured (tokens.css). Never pass raw hex here.
 */
const TONE_CLASS: Record<TagTone, string> = {
  transport: "bg-transport text-ink-on-fill",
  welfare: "bg-welfare text-ink-on-fill",
  activity: "bg-activity text-ink-on-fill",
  governance: "bg-governance text-ink-on-fill",
  neutral: "bg-neutral-soft text-ink-900",
};

const TONE_ICON: Partial<Record<TagTone, LucideIcon>> = {
  transport: Bus,
  welfare: HeartHandshake,
  activity: Sparkles,
  governance: Landmark,
};

export function Tag({ children, tone = "neutral", className, icon = true }: TagProps) {
  const Icon = icon ? TONE_ICON[tone] : undefined;
  return (
    <span className={cx("inline-flex items-center gap-[var(--space-1)] rounded-pill px-[var(--space-3)] py-[var(--space-1)] text-sm font-medium", TONE_CLASS[tone], className)}>
      {Icon ? <DecorativeIcon icon={Icon} size={14} /> : null}
      {children}
    </span>
  );
}
