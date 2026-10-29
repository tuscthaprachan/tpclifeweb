/**
 * The optional "email me my private link" message. Email is never required:
 * the link is shown on the confirmation page either way, and a failure to send
 * is reported, never fatal. The wording is in lib/email/borrowing-templates.ts.
 */

import { borrowingTrackingLink } from "@/lib/email/borrowing-templates";
import { getEmailSender, isEmailConfigured } from "@/lib/email";

export { isEmailConfigured };

/** Sends the link. Returns false (never throws) when email is off or the send fails. */
export async function sendTrackingLinkEmail(to: string, reference: string, link: string): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  try {
    await getEmailSender().send({ to, ...borrowingTrackingLink({ reference, link }) });
    return true;
  } catch (error) {
    console.error("[borrowing] tracking link email not sent", error instanceof Error ? error.message : error);
    return false;
  }
}
