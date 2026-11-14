import { NotConfigured } from "@/components/admin/NotConfigured";
import { Card, ConsolePage, PageHeader } from "@/components/admin/ui";
import { ConsoleIcon } from "@/components/admin/icons";
import { Button, NotificationBanner, Radios, SummaryList, Tag, TextInput, Timestamp } from "@/components/ui";
import { listSessions, NAME_MAX_LENGTH } from "@/lib/admin/account/sessions";
import { parseUserAgent } from "@/lib/admin/account/user-agent";
import { getAdminLocale } from "@/lib/admin/locale";
import { adminTitle } from "@/lib/admin/metadata";
import { isAuthConfigured } from "@/lib/auth";
import { requireStaff } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { a, ROLE_LABEL, type AdminKey } from "@/lib/i18n/admin";
import { LOCALES, LOCALE_LABEL, pick } from "@/lib/i18n/config";
import { setAdminLocale } from "../actions";
import { revokeOtherSessionsAction, revokeSessionAction, updateNameAction } from "./actions";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("chAccountTitle");
}

const NOTICES: Record<string, { title: AdminKey; body: AdminKey; variant: "success" | "info" | "warning" }> = {
  "name-saved": { title: "opAccountNameSavedTitle", body: "opAccountNameSavedBody", variant: "success" },
  "name-unchanged": { title: "opAccountNameUnchangedTitle", body: "opAccountNameUnchangedBody", variant: "info" },
  "name-invalid": { title: "opAccountNameInvalidTitle", body: "opAccountNameInvalidBody", variant: "warning" },
  "session-ended": { title: "opSessionEndedTitle", body: "opSessionEndedBody", variant: "success" },
  "session-gone": { title: "opSessionGoneTitle", body: "opSessionGoneBody", variant: "info" },
  "others-ended": { title: "opSessionsEndedTitle", body: "opSessionsEndedBody", variant: "success" },
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const staff = await requireStaff();
  const { notice } = await searchParams;
  const sessions = await listSessions(getDb(), staff.user.id, staff.sessionId);
  const others = sessions.filter((s) => !s.current);
  const shown = notice ? NOTICES[notice] : undefined;

  const orgName = new Map(staff.organisations.map((o) => [o.id, pick({ th: o.nameTh, en: o.nameEn }, locale)]));
  const roleLines = staff.roles.map((r) => a(ROLE_LABEL[r.role], locale));

  return (
    <ConsolePage width="narrow">
      {shown ? (
        <NotificationBanner variant={shown.variant} title={a(shown.title, locale)}>
          {a(shown.body, locale)}
        </NotificationBanner>
      ) : null}
      <PageHeader title={a("chAccountTitle", locale)} description={a("chAccountIntro", locale)} icon="account" />

      <Card title={a("yourDetails", locale)} icon="account">
        <SummaryList
          rows={[
            { key: a("rowEmail", locale), value: staff.user.email },
            { key: a("rowOrganisations", locale), value: <List items={[...orgName.values()]} /> },
            { key: a("rowRoles", locale), value: <List items={roleLines} /> },
          ]}
        />
      </Card>

      <Card title={a("opAccountNameHeading", locale)} icon="edit" description={a("opAccountNameIntro", locale)}>
        <form action={updateNameAction} className="flex flex-col items-start gap-[var(--space-4)]">
          <TextInput id="account-name" name="name" label={a("rowName", locale)} hint={a("opAccountNameHint", locale)} defaultValue={staff.user.name} maxLength={NAME_MAX_LENGTH} autoComplete="name" required />
          <Button type="submit" icon={<ConsoleIcon name="save" />}>
            {a("opAccountNameSave", locale)}
          </Button>
        </form>
      </Card>

      <Card title={a("opAccountLanguageHeading", locale)} icon="language" description={a("opAccountLanguageIntro", locale)}>
        <form action={setAdminLocale} className="flex flex-col items-start gap-[var(--space-4)]">
          <input type="hidden" name="returnTo" value="/admin/account" />
          <Radios id="account-language" name="locale" legend={a("opAccountLanguageLegend", locale)} defaultValue={locale} options={LOCALES.map((l) => ({ value: l, label: <span lang={l}>{LOCALE_LABEL[l]}</span> }))} />
          <Button type="submit" icon={<ConsoleIcon name="save" />}>
            {a("opAccountLanguageSave", locale)}
          </Button>
        </form>
      </Card>

      <Card title={a("opSessionsHeading", locale)} icon="security" description={a("opSessionsIntro", locale)} padded={false}>
        <ul className="m-0 list-none p-0">
          {sessions.map((s) => {
            const device = parseUserAgent(s.userAgent);
            const name = [device.browser, device.os].filter(Boolean).join(" / ") || a("opSessionUnknownDevice", locale);
            return (
              <li key={s.id} className="flex flex-wrap items-start justify-between gap-x-[var(--space-4)] gap-y-[var(--space-2)] border-t border-line px-[var(--space-4)] py-[var(--space-3)] first:border-t-0">
                <div className="min-w-0">
                  <p className="m-0 flex flex-wrap items-center gap-[var(--space-2)] font-medium">
                    <span>{name}</span>
                    {s.current ? <Tag>{a("opSessionCurrent", locale)}</Tag> : null}
                  </p>
                  <dl className="m-0 mt-[var(--space-1)] grid grid-cols-[auto_minmax(0,1fr)] gap-x-[var(--space-3)] text-sm text-ink-600">
                    <dt>{a("opSessionIp", locale)}</dt>
                    <dd className="m-0 break-all">{s.ipAddress ?? a("opSessionIpUnknown", locale)}</dd>
                    <dt>{a("opSessionStarted", locale)}</dt>
                    <dd className="m-0">
                      <Timestamp value={s.createdAt} locale={locale} format="datetime" />
                    </dd>
                    <dt>{a("opSessionExpires", locale)}</dt>
                    <dd className="m-0">
                      <Timestamp value={s.expiresAt} locale={locale} format="datetime" />
                    </dd>
                  </dl>
                </div>
                {s.current ? null : (
                  <form action={revokeSessionAction}>
                    <input type="hidden" name="sessionId" value={s.id} />
                    <Button type="submit" variant="secondary">
                      {a("opSessionSignOut", locale)}
                      <span className="visually-hidden"> {a("opSessionSignOutFor", locale, { device: name })}</span>
                    </Button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
        {others.length > 0 ? (
          <form action={revokeOtherSessionsAction} className="border-t border-line p-[var(--space-4)]">
            <Button type="submit" variant="destructive">
              {a("opSessionSignOutOthers", locale)}
            </Button>
          </form>
        ) : null}
      </Card>

      <Card title={a("chAccountSessionTitle", locale)} icon="security" description={a("chAccountSecurityHint", locale)}>
        <SummaryList rows={[{ key: a("rowSessionEnds", locale), value: <Timestamp value={staff.times.expiresAt} locale={locale} format="datetime" /> }]} />
        <div className="mt-[var(--space-3)]">
          <Button href="/admin/security" variant="secondary" icon={<ConsoleIcon name="security" />}>
            {a("csNavSecurity", locale)}
          </Button>
        </div>
      </Card>
    </ConsolePage>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="m-0 list-none p-0">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
