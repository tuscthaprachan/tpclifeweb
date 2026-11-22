import type { LucideIcon } from "lucide-react";
import { DecorativeIcon } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import type { ContentPage } from "@/lib/content/types";

const FILL: Record<ContentPage["category"], string> = {
  transport: "bg-transport",
  welfare: "bg-welfare",
  activity: "bg-activity",
  governance: "bg-governance",
};

export function TopicTile({ icon, category, size = "md" }: { icon: LucideIcon; category: ContentPage["category"]; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "grid shrink-0 place-items-center rounded-[var(--radius-panel)] text-ink-on-fill",
        FILL[category],
        size === "lg" ? "size-14 sm:size-16" : "size-10",
      )}
    >
      <DecorativeIcon icon={icon} size={size === "lg" ? 28 : 20} />
    </span>
  );
}
