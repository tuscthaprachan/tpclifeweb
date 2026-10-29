"use client";

import { useActionState } from "react";
import { Button, ErrorSummary, NotificationBanner, Select, Stack, TextInput, Textarea } from "@/components/ui";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { createItemAction, updateCategoryAction, updateItemAction, type InvState } from "./actions";

export interface CategoryValues {
  id: string;
  nameTh: string;
  nameEn: string;
  hintTh: string;
  hintEn: string;
  noticeWorkingDays: number;
  maxPerRequest: number | null;
  depositCards: number;
  termsTh: string;
  termsEn: string;
  position: number;
  active: boolean;
}

export interface ItemValues {
  id?: string;
  slug?: string;
  categoryId: string;
  nameTh: string;
  nameEn: string;
  hintTh: string;
  hintEn: string;
  unitTh: string;
  unitEn: string;
  totalQuantity: number;
  outOfService: number;
  maxPerRequest: number | null;
  position: number;
  active: boolean;
}

const EMPTY: InvState = {};
const box = "size-5";

function Feedback({ state, locale, anchor }: { state: InvState; locale: Locale; anchor: string }) {
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

/** What was typed after a failed save, else what is stored. */
const pickValue = (state: InvState, key: string, stored: string | number | null) => state.values?.[key] ?? (stored === null ? "" : String(stored));

export function CategoryForm({ locale, values }: { locale: Locale; values: CategoryValues }) {
  const [state, run, pending] = useActionState<InvState, FormData>(updateCategoryAction, EMPTY);
  const anchor = `cat-${values.id}`;
  const err = (f: string) => state.errors?.[f];
  const v = (key: keyof CategoryValues) => pickValue(state, key, values[key] as string | number | null);
  const num = "max-w-[10rem]";
  return (
    <form action={run} noValidate>
      <Stack space={4}>
        <Feedback state={state} locale={locale} anchor={anchor} />
        <input type="hidden" name="id" value={values.id} />
        <TextInput id={`${anchor}-nameTh`} name="nameTh" lang="th" label={a("brInvNameTh", locale)} error={err("nameTh")} defaultValue={v("nameTh")} autoComplete="off" />
        <TextInput id={`${anchor}-nameEn`} name="nameEn" lang="en" label={a("brInvNameEn", locale)} error={err("nameEn")} defaultValue={v("nameEn")} autoComplete="off" />
        <TextInput id={`${anchor}-hintTh`} name="hintTh" lang="th" label={a("brInvHintTh", locale)} error={err("hintTh")} defaultValue={v("hintTh")} autoComplete="off" />
        <TextInput id={`${anchor}-hintEn`} name="hintEn" lang="en" label={a("brInvHintEn", locale)} error={err("hintEn")} defaultValue={v("hintEn")} autoComplete="off" />
        <div className="flex flex-wrap gap-[var(--space-4)]">
          <TextInput id={`${anchor}-noticeWorkingDays`} name="noticeWorkingDays" type="number" inputMode="numeric" min={0} max={30} label={a("brInvNotice", locale)} hint={a("brInvNoticeHint", locale)} error={err("noticeWorkingDays")} defaultValue={v("noticeWorkingDays")} className={num} />
          <TextInput id={`${anchor}-maxPerRequest`} name="maxPerRequest" type="number" inputMode="numeric" min={1} label={a("brInvCategoryMax", locale)} hint={a("brInvCategoryMaxHint", locale)} error={err("maxPerRequest")} defaultValue={v("maxPerRequest")} className={num} />
          <TextInput id={`${anchor}-depositCards`} name="depositCards" type="number" inputMode="numeric" min={0} max={5} label={a("brInvCards", locale)} hint={a("brInvCardsHint", locale)} error={err("depositCards")} defaultValue={v("depositCards")} className={num} />
          <TextInput id={`${anchor}-position`} name="position" type="number" inputMode="numeric" min={0} max={1000} label={a("brInvPosition", locale)} error={err("position")} defaultValue={v("position")} className={num} />
        </div>
        <Textarea id={`${anchor}-termsTh`} name="termsTh" lang="th" label={a("brInvTermsTh", locale)} hint={a("brInvTermsHint", locale)} error={err("termsTh")} defaultValue={v("termsTh")} rows={4} maxLength={1500} />
        <Textarea id={`${anchor}-termsEn`} name="termsEn" lang="en" label={a("brInvTermsEn", locale)} error={err("termsEn")} defaultValue={v("termsEn")} rows={4} maxLength={1500} />
        <label className="flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
          <input type="checkbox" name="active" value="yes" defaultChecked={values.active} className={box} />
          {a("brInvCategoryActive", locale)}
        </label>
        <div>
          <Button type="submit" loading={pending} loadingLabel={a("caseSaving", locale)}>
            {a("brInvSaveCategory", locale)}
          </Button>
        </div>
      </Stack>
    </form>
  );
}

/** Edit an item, or add one when `values.id` is absent. The short name is chosen once, when adding. */
export function ItemForm({ locale, values, categories }: { locale: Locale; values: ItemValues; categories: Array<{ value: string; label: string }> }) {
  const creating = !values.id;
  const [state, run, pending] = useActionState<InvState, FormData>(creating ? createItemAction : updateItemAction, EMPTY);
  const anchor = `item-${values.id ?? "new"}`;
  const err = (f: string) => state.errors?.[f];
  const v = (key: keyof ItemValues) => pickValue(state, key, values[key] as string | number | null);
  const num = "max-w-[10rem]";
  return (
    <form action={run} noValidate>
      <Stack space={4}>
        <Feedback state={state} locale={locale} anchor={anchor} />
        {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
        <Select id={`${anchor}-categoryId`} name="categoryId" label={a("brInvCategory", locale)} options={categories} defaultValue={v("categoryId")} error={err("categoryId")} className="max-w-[28rem]" />
        {creating ? (
          <TextInput id={`${anchor}-slug`} name="slug" label={a("brInvSlug", locale)} hint={a("brInvSlugHint", locale)} error={err("slug")} defaultValue={state.values?.slug ?? ""} autoComplete="off" spellCheck={false} className="max-w-[28rem]" />
        ) : (
          <p className="m-0 text-ink-600">
            {a("brInvSlug", locale)}: <code>{values.slug}</code>
          </p>
        )}
        <TextInput id={`${anchor}-nameTh`} name="nameTh" lang="th" label={a("brInvNameTh", locale)} error={err("nameTh")} defaultValue={v("nameTh")} autoComplete="off" />
        <TextInput id={`${anchor}-nameEn`} name="nameEn" lang="en" label={a("brInvNameEn", locale)} error={err("nameEn")} defaultValue={v("nameEn")} autoComplete="off" />
        <TextInput id={`${anchor}-hintTh`} name="hintTh" lang="th" label={a("brInvHintTh", locale)} error={err("hintTh")} defaultValue={v("hintTh")} autoComplete="off" />
        <TextInput id={`${anchor}-hintEn`} name="hintEn" lang="en" label={a("brInvHintEn", locale)} error={err("hintEn")} defaultValue={v("hintEn")} autoComplete="off" />
        <div className="flex flex-wrap gap-[var(--space-4)]">
          <TextInput id={`${anchor}-unitTh`} name="unitTh" lang="th" label={a("brInvUnitTh", locale)} hint={a("brInvUnitHint", locale)} error={err("unitTh")} defaultValue={v("unitTh")} autoComplete="off" className={num} />
          <TextInput id={`${anchor}-unitEn`} name="unitEn" lang="en" label={a("brInvUnitEn", locale)} error={err("unitEn")} defaultValue={v("unitEn")} autoComplete="off" className={num} />
        </div>
        <div className="flex flex-wrap gap-[var(--space-4)]">
          <TextInput id={`${anchor}-totalQuantity`} name="totalQuantity" type="number" inputMode="numeric" min={0} label={a("brInvTotal", locale)} hint={a("brInvTotalHint", locale)} error={err("totalQuantity")} defaultValue={v("totalQuantity")} className={num} />
          <TextInput id={`${anchor}-outOfService`} name="outOfService" type="number" inputMode="numeric" min={0} label={a("brInvOutOfService", locale)} hint={a("brInvOutOfServiceHint", locale)} error={err("outOfService")} defaultValue={v("outOfService")} className={num} />
          <TextInput id={`${anchor}-maxPerRequest`} name="maxPerRequest" type="number" inputMode="numeric" min={1} label={a("brInvItemMax", locale)} hint={a("brInvItemMaxHint", locale)} error={err("maxPerRequest")} defaultValue={v("maxPerRequest")} className={num} />
          <TextInput id={`${anchor}-position`} name="position" type="number" inputMode="numeric" min={0} label={a("brInvPosition", locale)} error={err("position")} defaultValue={v("position")} className={num} />
        </div>
        <label className="flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
          <input type="checkbox" name="active" value="yes" defaultChecked={creating ? true : values.active} className={box} />
          {a("brInvItemActive", locale)}
        </label>
        <div>
          <Button type="submit" loading={pending} loadingLabel={a("caseSaving", locale)}>
            {creating ? a("brInvCreateItem", locale) : a("brInvSaveItem", locale)}
          </Button>
        </div>
      </Stack>
    </form>
  );
}
