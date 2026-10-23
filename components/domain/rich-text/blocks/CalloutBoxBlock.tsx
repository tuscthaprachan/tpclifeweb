import { cx, StatusTag, type StatusTone } from "@/components/ui";
import { pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { LocaleString } from "@/lib/content/types";
import type { CalloutBoxAttrs, CalloutTone } from "@/lib/rich-text/schema";

const TONE_STATUS: Record<CalloutTone, StatusTone> = {
  info: "info",
  warning: "warning",
  critical: "error",
};

const TONE_BORDER: Record<CalloutTone, string> = {
  info: "border-info",
  warning: "border-warning",
  critical: "border-error",
};

const TONE_BG: Record<CalloutTone, string> = {
  info: "bg-info-soft",
  warning: "bg-warning-soft",
  critical: "bg-error-soft",
};

/**
 * `lib/i18n/strings.ts` has a generic word for "warning" but not for "info"
 * or "critical" (only page-specific notices such as `phaseAlphaNote` exist).
 * Hardcoded here per CONTRIBUTING.md's own instruction for a missing shared
 * string: mark it, report it, do not invent a synonym for something that
 * already exists.
 */
const TONE_LABEL: Record<CalloutTone, LocaleString> = {
  info: { th: "ข้อมูล", en: "Information" }, // TODO: add to UI strings
  warning: UI.warning,
  critical: { th: "วิกฤต", en: "Critical" }, // TODO: add to UI strings
};

/**
 * A highlighted note set apart from body text. Every tone renders an icon
 * plus a visible word plus colour (1.4.1): the tone label always shows as a
 * `StatusTag`, never colour alone, whether or not the editor also gave the
 * box its own title.
 */
export function CalloutBoxBlock({ attrs, locale }: { attrs: CalloutBoxAttrs; locale: Locale }) {
  if (!attrs?.body) return null;

  const tone = attrs.tone ?? "info";
  const title = attrs.title ? pick(attrs.title, locale) : "";
  const body = pick(attrs.body, locale);

  return (
    <div
      className={cx(
        "my-[var(--space-4)] rounded-panel border-l-[length:var(--border-width-thick)] px-[var(--space-4)] py-[var(--space-4)]",
        TONE_BORDER[tone],
        TONE_BG[tone],
      )}
    >
      <StatusTag tone={TONE_STATUS[tone]} label={pick(TONE_LABEL[tone], locale)} />
      {title ? <p className="m-0 mt-[var(--space-2)] font-semibold text-ink-900">{title}</p> : null}
      <p className="m-0 mt-[var(--space-2)] text-ink-900">{body}</p>
    </div>
  );
}
