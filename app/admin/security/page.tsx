import { AdminPage } from "@/components/admin/AdminPage";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { AddPasskeyButton } from "@/components/admin/PasskeyButton";
import { Button, ErrorSummary, Heading, InsetText, NotificationBanner, Stack, SummaryList, Timestamp } from "@/components/ui";
import { adminTitle } from "@/lib/admin/metadata";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { listPasskeys, PASSKEY_NAME_MAX } from "@/lib/auth/passkeys";
import { requireStaff } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { a } from "@/lib/i18n/admin";
import { UI } from "@/lib/i18n/strings";
import { removeOlderPasskeysAction, renamePasskeyAction } from "./actions";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("securityTitle");
}

/** Every member of staff manages their own passkeys here: add a device, rename, remove (never the last one). */
export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const staff = await requireStaff();
  const [{ notice }, passkeys] = await Promise.all([searchParams, listPasskeys(getDb(), staff.user.id)]);
  const onlyOne = passkeys.length <= 1;

  return (
    <AdminPage width="content">
      {notice === "recovered" ? (
        <NotificationBanner variant="success" title={a("recoveredTitle", locale)}>
          <Stack space={3}>
            <p className="m-0">{a("recoveredBody", locale)}</p>
            {passkeys.length > 1 ? (
              <form action={removeOlderPasskeysAction}>
                <p className="mt-0 text-sm">{a("removeOlderHint", locale)}</p>
                <Button type="submit" variant="destructive">
                  {a("removeOlderButton", locale)}
                </Button>
              </form>
            ) : null}
          </Stack>
        </NotificationBanner>
      ) : null}
      {notice === "added" ? (
        <NotificationBanner variant="success" title={a("passkeyAddedTitle", locale)}>
          {a("passkeyAddedBody", locale)}
        </NotificationBanner>
      ) : null}
      {notice === "renamed" ? (
        <NotificationBanner variant="success" title={a("passkeyRenamedTitle", locale)}>
          {a("passkeyRenamedBody", locale)}
        </NotificationBanner>
      ) : null}
      {notice === "removed" ? (
        <NotificationBanner variant="success" title={a("passkeyRemovedTitle", locale)}>
          {a("passkeyRemovedBody", locale)}
        </NotificationBanner>
      ) : null}
      {notice === "older-removed" ? (
        <NotificationBanner variant="success" title={a("olderRemovedTitle", locale)}>
          {a("passkeyRemovedBody", locale)}
        </NotificationBanner>
      ) : null}
      {notice === "gone" ? (
        <NotificationBanner variant="info" title={a("goneTitle", locale)}>
          {a("errNothingToChange", locale)}
        </NotificationBanner>
      ) : null}
      {notice === "last-passkey" ? (
        <ErrorSummary title={UI.errorSummaryTitle[locale]} headingLevel={2} items={[{ href: "#add-passkey", message: a("errLastPasskey", locale) }]} />
      ) : null}
      {notice === "bad-name" ? (
        <ErrorSummary title={UI.errorSummaryTitle[locale]} headingLevel={2} items={[{ href: "#passkeys", message: a("errPasskeyName", locale) }]} />
      ) : null}

      <div>
        <Heading level={1}>{a("securityTitle", locale)}</Heading>
        <p className="mt-[var(--space-2)] text-ink-600">{a("securityIntro", locale)}</p>
      </div>

      <section aria-labelledby="passkeys">
        <Heading level={2} id="passkeys">
          {a("passkeysHeading", locale)}
        </Heading>
        <ul className="mt-[var(--space-3)] m-0 flex list-none flex-col gap-[var(--space-6)] p-0">
          {passkeys.map((key, index) => {
            const label = key.name || `${a("passkeyUnnamed", locale)} ${index + 1}`;
            return (
              <li key={key.id}>
                <Stack space={3}>
                  <Heading level={3}>{label}</Heading>
                  <SummaryList
                    rows={[
                      { key: a("colAdded", locale), value: key.createdAt ? <Timestamp value={key.createdAt} locale={locale} format="datetime" /> : "-" },
                      {
                        key: a("colLastUsed", locale),
                        value: key.lastUsedAt ? <Timestamp value={key.lastUsedAt} locale={locale} format="datetime" /> : a("lastUsedNever", locale),
                      },
                    ]}
                  />
                  <form action={renamePasskeyAction} className="flex flex-wrap items-end gap-[var(--space-3)]">
                    <input type="hidden" name="passkeyId" value={key.id} />
                    <div className="flex flex-col gap-[var(--space-1)]">
                      <label htmlFor={`passkey-name-${key.id}`} className="text-base font-medium text-ink-900">
                        {a("renameLabel", locale)}
                        <span className="visually-hidden"> ({label})</span>
                      </label>
                      <input
                        id={`passkey-name-${key.id}`}
                        name="name"
                        defaultValue={key.name ?? ""}
                        maxLength={PASSKEY_NAME_MAX}
                        autoComplete="off"
                        className="min-h-[var(--target-min)] rounded-control border border-line-strong bg-surface px-[var(--space-3)] py-[var(--space-2)] text-base text-ink-900"
                      />
                    </div>
                    <Button type="submit" variant="secondary">
                      {a("renameSave", locale)}
                    </Button>
                  </form>
                  {onlyOne ? (
                    <p className="m-0 text-ink-600">{a("onlyPasskeyNote", locale)}</p>
                  ) : (
                    <p className="m-0">
                      <a href={`/admin/security/passkeys/${encodeURIComponent(key.id)}/remove`}>
                        {a("removePasskeyVisible", locale)}
                        <span className="visually-hidden"> {a("removePasskeyFor", locale, { name: label })}</span>
                      </a>
                    </p>
                  )}
                </Stack>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <Stack space={3}>
          <Heading level={2} id="add-passkey">
            {a("addPasskeyHeading", locale)}
          </Heading>
          <p className="m-0 text-ink-600">{a("addPasskeyBody", locale)}</p>
          <AddPasskeyButton locale={locale} />
          <noscript>
            <InsetText>{a("passkeyNeedsScript", locale)}</InsetText>
          </noscript>
        </Stack>
      </section>
    </AdminPage>
  );
}
