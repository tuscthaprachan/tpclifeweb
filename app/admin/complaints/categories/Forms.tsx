"use client";

import { useActionState } from "react";
import { Button, ErrorSummary, NotificationBanner, Select, Stack, TextInput } from "@/components/ui";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { createCategoryAction, grantAccessAction, revokeAccessAction, updateCategoryAction, type CategoryState } from "./actions";

export interface CategoryValues {
  id?: string;
  key?: string;
  nameTh: string;
  nameEn: string;
  hintTh: string;
  hintEn: string;
  acknowledgeDays: number;
  resolveDays: number;
  restricted: boolean;
  offerWellbeing: boolean;
  position: number;
  active: boolean;
}

const EMPTY: CategoryState = {};
const box = "size-5";

function Feedback({ state, locale, anchor }: { state: CategoryState; locale: Locale; anchor: string }) {
  const items = [...Object.entries(state.errors ?? {}).map(([field, message]) => ({ href: `#${anchor}-${field}`, message })), ...(state.error ? [{ href: `#${anchor}-form`, message: state.error }] : [])];
  return (
    <>
      {state.saved ? (
        <NotificationBanner variant="success" title={a(state.saved, locale)}>
          {null}
        </NotificationBanner>
      ) : null}
      {items.length > 0 ? <ErrorSummary title={UI.errorSummaryTitle[locale]} headingLevel={3} items={items} /> : null}
      <span id={`${anchor}-form`} tabIndex={-1} />
    </>
  );
}

/** Edit one category, or add a new one when `values.id` is absent. */
export function CategoryForm({ locale, values, hasCases }: { locale: Locale; values: CategoryValues; hasCases?: boolean }) {
  const creating = !values.id;
  const [state, run, pending] = useActionState<CategoryState, FormData>(creating ? createCategoryAction : updateCategoryAction, EMPTY);
  const anchor = `cat-${values.id ?? "new"}`;
  const err = (f: string) => state.errors?.[f];
  return (
    <form action={run} noValidate>
      <Stack space={4}>
        <Feedback state={state} locale={locale} anchor={anchor} />
        {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
        {creating ? <TextInput id={`${anchor}-key`} name="key" label={a("cpcatKey", locale)} hint={a("cpcatKeyHint", locale)} error={err("key")} autoComplete="off" spellCheck={false} /> : null}
        <TextInput id={`${anchor}-nameTh`} name="nameTh" lang="th" label={a("cpcatNameTh", locale)} error={err("nameTh")} defaultValue={values.nameTh} autoComplete="off" />
        <TextInput id={`${anchor}-nameEn`} name="nameEn" lang="en" label={a("cpcatNameEn", locale)} error={err("nameEn")} defaultValue={values.nameEn} autoComplete="off" />
        <TextInput id={`${anchor}-hintTh`} name="hintTh" lang="th" label={a("cpcatHintTh", locale)} error={err("hintTh")} defaultValue={values.hintTh} autoComplete="off" />
        <TextInput id={`${anchor}-hintEn`} name="hintEn" lang="en" label={a("cpcatHintEn", locale)} error={err("hintEn")} defaultValue={values.hintEn} autoComplete="off" />
        <div className="flex flex-wrap gap-[var(--space-4)]">
          <TextInput id={`${anchor}-acknowledgeDays`} name="acknowledgeDays" type="number" min={1} max={365} label={a("cpcatAckDays", locale)} hint={a("cpcatDaysHint", locale)} error={err("acknowledgeDays")} defaultValue={String(values.acknowledgeDays)} className="max-w-[10rem]" />
          <TextInput id={`${anchor}-resolveDays`} name="resolveDays" type="number" min={1} max={365} label={a("cpcatResolveDays", locale)} error={err("resolveDays")} defaultValue={String(values.resolveDays)} className="max-w-[10rem]" />
          <TextInput id={`${anchor}-position`} name="position" type="number" min={0} max={1000} label={a("cpcatPosition", locale)} error={err("position")} defaultValue={String(values.position)} className="max-w-[10rem]" />
        </div>
        <label className="flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
          <input type="checkbox" name="restricted" value="yes" defaultChecked={values.restricted} className={box} />
          {a("cpcatRestricted", locale)}
        </label>
        {err("restricted") ? <p id={`${anchor}-restricted`} className="m-0 font-medium text-error">{err("restricted")}</p> : null}
        <p className="m-0 text-sm text-ink-600">{a("cpcatRestrictedHint", locale)}</p>
        {hasCases || state.needsConfirm ? (
          <label className="flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
            <input type="checkbox" name="confirmUnrestrict" value="yes" className={box} />
            {a("cpcatConfirmUnrestrict", locale)}
          </label>
        ) : null}
        <label className="flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
          <input type="checkbox" name="offerWellbeing" value="yes" defaultChecked={values.offerWellbeing} className={box} />
          {a("cpcatWellbeing", locale)}
        </label>
        <label className="flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
          <input type="checkbox" name="active" value="yes" defaultChecked={creating ? true : values.active} className={box} />
          {a("cpcatActive", locale)}
        </label>
        <div>
          <Button type="submit" loading={pending} loadingLabel={a("caseSaving", locale)}>
            {creating ? a("cpcatCreate", locale) : a("cpcatSave", locale)}
          </Button>
        </div>
      </Stack>
    </form>
  );
}

/** The named staff for a category, with add and remove. */
export function AccessList({ locale, categoryId, named, candidates }: { locale: Locale; categoryId: string; named: Array<{ userId: string; name: string; email: string }>; candidates: Array<{ value: string; label: string }> }) {
  const [grant, runGrant, granting] = useActionState<CategoryState, FormData>(grantAccessAction, EMPTY);
  const [revoke, runRevoke, revoking] = useActionState<CategoryState, FormData>(revokeAccessAction, EMPTY);
  const available = candidates.filter((c) => !named.some((n) => n.userId === c.value));
  return (
    <Stack space={3}>
      <Feedback state={grant} locale={locale} anchor={`acc-${categoryId}`} />
      <Feedback state={revoke} locale={locale} anchor={`acc-r-${categoryId}`} />
      {named.length === 0 ? (
        <p className="m-0 font-medium">{a("cpcatNobodyNamed", locale)}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-[var(--space-2)] p-0">
          {named.map((n) => (
            <li key={n.userId} className="flex flex-wrap items-center gap-[var(--space-3)]">
              <span>
                {n.name || n.email} <span className="text-ink-600">({n.email})</span>
              </span>
              <form action={runRevoke}>
                <input type="hidden" name="id" value={categoryId} />
                <input type="hidden" name="userId" value={n.userId} />
                <Button type="submit" variant="secondary" size="sm" loading={revoking} loadingLabel={a("caseSaving", locale)}>
                  {a("cpcatRemove", locale)}
                  <span className="visually-hidden"> {n.name || n.email}</span>
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
      {available.length > 0 ? (
        <form action={runGrant}>
          <input type="hidden" name="id" value={categoryId} />
          <div className="flex flex-wrap items-end gap-[var(--space-3)]">
            <Select id={`acc-${categoryId}-user`} name="userId" label={a("cpcatAddStaff", locale)} options={[{ value: "", label: a("cpcatChooseStaff", locale) }, ...available]} className="max-w-[24rem]" />
            <Button type="submit" variant="secondary" loading={granting} loadingLabel={a("caseSaving", locale)}>
              {a("cpcatAdd", locale)}
            </Button>
          </div>
        </form>
      ) : null}
    </Stack>
  );
}
