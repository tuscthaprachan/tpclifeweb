import Image from "next/image";
import { cx } from "@/components/ui/cx";

export function SiteLogo({ size, className, priority }: { size: number; className?: string; priority?: boolean }) {
  return (
    <Image
      src="/brand/logo.png"
      alt=""
      width={size}
      height={size}
      priority={priority}
      className={cx("shrink-0 select-none", className)}
    />
  );
}
