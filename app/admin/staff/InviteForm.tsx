"use client";

import { useActionState } from "react";
import { PeopleIcon } from "@/components/admin/PeopleIcon";
import { LinkReady } from "@/components/admin/LinkReady";
import { Button, Checkboxes, ErrorSummary, NotificationBanner, Radios, Stack, TextInput, type ErrorSummaryItem } from "@/components/ui";
import { a, ROLE_HINT, ROLE_LABEL } from "@/lib/i18n/admin";
import { pick, type Locale } from "@/lib/i18n/config";
import { STAFF_ROLES } from "@/lib/db/schema/staff-roles";
import { UI } from "@/lib/i18n/strings";
import { createStaffInvite, type InviteFormState } from "./actions";

export interface OrganisationChoice {
  id: number;
  nameTh: string;
  nameEn: string;
}

export function InviteForm({ locale, organisations }: { locale: Locale; organisations: OrganisationChoice[] }) {
  const [state, formAction, pending] = useActionState<InviteFormState, FormData>(createStaffInvite, {
    values: { email: "", organisation: organisations.length === 1 ? String(organisations[0]?.id) : "", roles: [] },
    errors: {},
  });

  const items: ErrorSummaryItem[] = [];
  if (state.errors.email) items.push({ href: "#admin-invite-email", message: state.errors.email });
  if (state.errors.organisation) items.push({ href: "#admin-invite-organisation-0", message: state.errors.organisation });
  if (state.errors.roles) items.push({ href: "#admin-invite-roles-0", message: state.errors.roles });

  return (
    <form action={formAction} noValidate>
      <Stack space={6}>
        {state.created ? (
          <LinkReady
            locale={locale}
            id="admin-invite-link"
            title={a("invitedTitle", locale)}
            body={a("invitedBody", locale, { email: state.created.email, days: state.created.days })}
            link={state.created.link}
            email={state.created.email}
            emailed={state.created.emailed}
          />
        ) : null}
        {state.errors.form ? (
          <NotificationBanner variant="warning" title={UI.errorTitle[locale]}>
            {state.errors.form}
          </NotificationBanner>
        ) : null}
        {items.length > 0 ? <ErrorSummary title={UI.errorSummaryTitle[locale]} headingLevel={2} items={items} /> : null}

        <TextInput
          id="admin-invite-email"
          name="email"
          type="email"
          label={a("emailLabel", locale)}
          defaultValue={state.values.email}
          error={state.errors.email}
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="none"
          className="max-w-[28rem]"
        />

        {organisations.length === 1 ? (
          <input type="hidden" name="organisation" value={organisations[0]?.id} />
        ) : (
          <Radios
            id="admin-invite-organisation"
            name="organisation"
            legend={a("inviteOrgLegend", locale)}
            defaultValue={state.values.organisation}
            error={state.errors.organisation}
            options={organisations.map((o) => ({ value: String(o.id), label: pick({ th: o.nameTh, en: o.nameEn }, locale) }))}
          />
        )}

        <Checkboxes
          id="admin-invite-roles"
          name="roles"
          legend={a("inviteRolesLegend", locale)}
          hint={a("inviteRolesHint", locale)}
          defaultValue={state.values.roles}
          error={state.errors.roles}
          options={STAFF_ROLES.map((role) => ({ value: role, label: a(ROLE_LABEL[role], locale), hint: a(ROLE_HINT[role], locale) }))}
        />

        <div>
          <Button type="submit" icon={<PeopleIcon name="userPlus" />} loading={pending} loadingLabel={a("inviteSend", locale)}>
            {a("inviteSend", locale)}
          </Button>
        </div>
      </Stack>
    </form>
  );
}
