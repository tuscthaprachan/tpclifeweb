import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";

export function BackLink({ href, locale }: { href: string; locale: Locale }) {
  return (
    <a href={href} className="inline-flex min-h-[var(--target-min)] items-center text-action underline">
      {UI.back[locale]}
    </a>
  );
}
