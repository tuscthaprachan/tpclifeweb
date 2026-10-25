import { InsetText, WarningText } from "@/components/ui";
import { pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { CalloutBoxAttrs } from "@/lib/rich-text/schema";

/**
 * The stored `calloutBox` node keeps its three tones, but nothing is drawn as
 * a coloured box. `info` renders as GOV.UK inset text (grey rule, no fill).
 * `warning` and `critical` render as GOV.UK warning text: bold, with the "!"
 * icon and a visually hidden "Warning" prefix. `critical` also sets its title
 * (when the editor gave one) as a bold heading line above the body.
 */
export function CalloutBoxBlock({ attrs, locale }: { attrs: CalloutBoxAttrs; locale: Locale }) {
  if (!attrs?.body) return null;

  const tone = attrs.tone ?? "info";
  const title = attrs.title ? pick(attrs.title, locale) : "";
  const body = pick(attrs.body, locale);

  if (tone === "info") {
    return (
      <InsetText className="my-[var(--space-4)]">
        {title ? <p className="m-0 font-bold">{title}</p> : null}
        <p className={title ? "m-0 mt-[var(--space-1)]" : "m-0"}>{body}</p>
      </InsetText>
    );
  }

  return (
    <WarningText className="my-[var(--space-4)]">
      <span className="visually-hidden">{UI.warning[locale]}: </span>
      {title ? (
        <>
          {tone === "critical" ? <span className="block">{title}</span> : <>{title}. </>}
        </>
      ) : null}
      {body}
    </WarningText>
  );
}
