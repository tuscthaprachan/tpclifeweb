import { CopyLink } from "@/components/admin/CopyLink";
import { NotificationBanner, Stack } from "@/components/ui";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";

export type EmailOutcome = "sent" | "failed" | "not_configured";

interface LinkReadyProps {
  locale: Locale;
  id: string;
  title: string;
  /** The plain-language note to pass the link on privately. */
  body: string;
  link: string;
  email: string;
  emailed: EmailOutcome;
}

/** A one-time invitation or recovery link, shown on screen with a copy button and what happened to email. */
export function LinkReady({ locale, id, title, body, link, email, emailed }: LinkReadyProps) {
  const note =
    emailed === "sent" ? a("emailSentNote", locale, { email }) : emailed === "failed" ? a("emailFailedNote", locale) : a("emailOffNote", locale);
  return (
    <NotificationBanner variant={emailed === "failed" ? "warning" : "success"} title={title}>
      <Stack space={4}>
        <p className="m-0">{body}</p>
        <CopyLink locale={locale} id={id} link={link} />
        <p className="m-0">{note}</p>
      </Stack>
    </NotificationBanner>
  );
}
