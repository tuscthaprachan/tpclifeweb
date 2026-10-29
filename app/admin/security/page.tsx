import { ConsoleIcon } from "@/components/admin/icons";
import { PeopleIcon } from "@/components/admin/PeopleIcon";
import { Card, ConsolePage, PageHeader } from "@/components/admin/ui";
import { signOutAction } from "@/app/admin/actions";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { AddPasskeyButton } from "@/components/admin/PasskeyButton";
import { Button, ErrorSummary, InsetText, NotificationBanner, Stack, SummaryList, Timestamp } from "@/components/ui";
import { adminTitle } from "@/lib/admin/metadata";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { listPasskeys, PASSKEY_NAME_MAX } from "@/lib/auth/passkeys";
import { requireStaff } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { a } from "@/lib/i18n/admin";
import { formatDateTime } from "@/lib/i18n/format";
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
    <ConsolePage width="content">
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

      <PageHeader
        title={a("securityTitle", locale)}
        icon="security"
        description={a("securityIntro", locale)}
        actions={
          <Button href="#add-passkey" variant="secondary" icon={<PeopleIcon name="key" />}>
            {a("addPasskeyButton", locale)}
          </Button>
        }
      />

      <Card title={a("passkeysHeading", locale)} icon="security" description={a("cpPasskeysDesc", locale)}>
        <div id="passkeys" tabIndex={-1} className="outline-none" />
        <ul className="m-0 flex list-none flex-col p-0">
          {passkeys.map((key, index) => {
            const label = key.name || `${a("passkeyUnnamed", locale)} ${index + 1}`;
            return (
              <li key={key.id} className="border-t border-line py-[var(--space-4)] first:border-t-0 first:pt-0 last:pb-0">
                <Stack space={3}>
                  <h3 className="m-0 flex items-center gap-[var(--space-2)] text-lg font-semibold">
                    <PeopleIcon name="key" className="text-ink-600" />
                    {label}
                  </h3>
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
                    <Button type="submit" variant="secondary" icon={<ConsoleIcon name="save" />}>
                      {a("renameSave", locale)}
                    </Button>
                    {onlyOne ? null : (
                      <Button href={`/admin/security/passkeys/${encodeURIComponent(key.id)}/remove`} variant="secondary" icon={<PeopleIcon name="trash" />}>
                        {a("removePasskeyVisible", locale)}
                        <span className="visually-hidden"> {a("removePasskeyFor", locale, { name: label })}</span>
                      </Button>
                    )}
                  </form>
                  {onlyOne ? (
                    <p className="m-0 flex items-center gap-[var(--space-2)] text-ink-600">
                      <ConsoleIcon name="info" />
                      {a("onlyPasskeyNote", locale)}
                    </p>
                  ) : null}
                </Stack>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title={a("addPasskeyHeading", locale)} icon="add" description={a("addPasskeyBody", locale)}>
        <span id="add-passkey" tabIndex={-1} className="outline-none" />
        <AddPasskeyButton locale={locale} />
        <noscript>
          <InsetText>{a("passkeyNeedsScript", locale)}</InsetText>
        </noscript>
      </Card>

      <Card title={a("cpSessionHeading", locale)} icon="signOut" description={a("cpSessionSignOutHint", locale)}>
        <Stack space={3}>
          <p className="m-0 flex items-center gap-[var(--space-2)]">
            <PeopleIcon name="clock" className="text-ink-600" />
            {a("cpSessionBody", locale, { time: formatDateTime(staff.deadlines.endsAt, locale) })}
          </p>
          <form action={signOutAction}>
            <Button type="submit" variant="secondary" icon={<ConsoleIcon name="signOut" />}>
              {a("signOut", locale)}
            </Button>
          </form>
        </Stack>
      </Card>
    </ConsolePage>
  );
}
