"use client";

import { useId, useState, type ReactNode } from "react";
import { Button, Checkboxes, ErrorMessage, Select, Textarea, TextInput } from "@/components/ui";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { isSafeHref } from "@/lib/rich-text/schema";
import { validateBlockAttrs, type BlockType } from "@/lib/rich-text/editor";
import { ImagePicker } from "../ImagePicker";
import { PortalDialog } from "../PortalDialog";
import { ReferencePicker } from "../ReferencePicker";
import { BLOCK_LABEL, type RichTextRefs } from "./blocks";

type Raw = Record<string, unknown>;
type Pair = { th: string; en: string };

const pair = (v: unknown): Pair => {
  const o = (typeof v === "object" && v !== null ? v : {}) as Partial<Pair>;
  return { th: o.th ?? "", en: o.en ?? "" };
};
const filled = (p: Pair) => p.th.trim() !== "" && p.en.trim() !== "";

/** A Thai and an English box for one bilingual attr. */
function PairInput({ id, label, value, onChange, multiline, hint }: { id: string; label: string; value: Pair; onChange: (v: Pair) => void; multiline?: boolean; hint?: string }) {
  const Field = multiline ? Textarea : TextInput;
  return (
    <div className="grid gap-[var(--space-3)] sm:grid-cols-2">
      {(["th", "en"] as const).map((lang) => (
        <Field
          key={lang}
          id={`${id}-${lang}`}
          label={`${label} (${lang === "th" ? "ไทย" : "English"})`}
          hint={hint}
          lang={lang}
          value={value[lang]}
          onChange={(e: { target: { value: string } }) => onChange({ ...value, [lang]: e.target.value })}
          autoComplete="off"
          {...(multiline ? { rows: 3 } : {})}
        />
      ))}
    </div>
  );
}

/** Checks the common mistakes with a plain message each; the schema is the backstop. */
function precheck(type: BlockType, attrs: Raw): AdminKey | null {
  switch (type) {
    case "contactBlock":
      return filled(pair(attrs.label)) && String(attrs.value ?? "").trim() ? null : "errBlockContact";
    case "formCallout":
      return attrs.formId ? null : "errBlockForm";
    case "image":
      if (!attrs.imageId) return "errBlockImage";
      return attrs.isDecorative || filled(pair(attrs.alt)) ? null : "errBlockImageAlt";
    case "linkOut":
      if (!filled(pair(attrs.label)) || !String(attrs.url ?? "").trim()) return "errBlockLinkOut";
      return isSafeHref(String(attrs.url).trim()) ? null : "errBlockUrl";
    case "calloutBox":
      return filled(pair(attrs.body)) ? null : "errBlockCallout";
    case "stepList": {
      const steps = Array.isArray(attrs.steps) ? attrs.steps : [];
      return steps.length > 0 && steps.every((s) => filled(pair((s as Raw).title))) ? null : "errBlockSteps";
    }
  }
}

interface BlockDialogProps {
  type: BlockType;
  mode: "insert" | "edit";
  initial: Raw;
  locale: Locale;
  refs: RichTextRefs;
  onSubmit: (attrs: Raw) => void;
  onClose: () => void;
}

/** The form for one custom block's attrs, opened by the toolbar (insert) or the block's Edit button. */
export function BlockDialog({ type, mode, initial, locale, refs, onSubmit, onClose }: BlockDialogProps) {
  const uid = useId();
  const [attrs, setAttrs] = useState<Raw>(() => structuredClone(initial));
  const [error, setError] = useState<string | null>(null);
  const set = (key: string, value: unknown) => setAttrs((cur) => ({ ...cur, [key]: value }));
  const id = (n: string) => `${uid}-${n}`;

  function submit() {
    const key = precheck(type, attrs);
    if (key) return setError(a(key, locale));
    const detail = validateBlockAttrs(type, attrs);
    if (detail) return setError(a("errBlockInvalid", locale, { detail }));
    onSubmit(attrs);
  }

  let body: ReactNode;
  if (type === "contactBlock") {
    body = (
      <>
        <PairInput id={id("label")} label={a("blockContactLabel", locale)} value={pair(attrs.label)} onChange={(v) => set("label", v)} />
        <Select
          id={id("channel")}
          label={a("blockContactChannel", locale)}
          value={String(attrs.channel ?? "line")}
          onChange={(e) => set("channel", e.target.value)}
          options={(["line", "email", "phone", "inPerson", "url"] as const).map((c) => ({ value: c, label: a(`channel_${c}` as AdminKey, locale) }))}
        />
        <TextInput id={id("value")} label={a("blockContactValue", locale)} hint={a("blockContactValueHint", locale)} value={String(attrs.value ?? "")} onChange={(e) => set("value", e.target.value)} autoComplete="off" />
        <PairInput id={id("hours")} label={a("blockContactHours", locale)} value={pair(attrs.hours)} onChange={(v) => set("hours", v)} />
      </>
    );
  } else if (type === "formCallout") {
    body = (
      <ReferencePicker
        unnamed
        name={`${uid}-form`}
        label={a("blockFormChoose", locale)}
        hint={a("blockFormHint", locale)}
        options={refs.forms}
        defaultValue={String(attrs.formId ?? "")}
        onChange={(ids) => set("formId", ids[0] ?? "")}
      />
    );
  } else if (type === "image") {
    body = (
      <>
        <ImagePicker
          unnamed
          name={`${uid}-image`}
          label={a("blockImagePicture", locale)}
          images={refs.images}
          storageConfigured={refs.storageConfigured}
          defaultValue={attrs.imageId ? [String(attrs.imageId)] : []}
          onChange={(ids) => {
            const chosen = refs.images.find((i) => i.id === ids[0]);
            setAttrs((cur) => ({
              ...cur,
              imageId: ids[0] ?? "",
              alt: filled(pair(cur.alt)) || !chosen ? cur.alt : { th: chosen.altTh, en: chosen.altEn },
            }));
          }}
        />
        <Checkboxes
          id={id("decorative")}
          name={id("decorative")}
          legend={a("blockImageDecorative", locale)}
          hint={a("blockImageDecorativeHint", locale)}
          options={[{ value: "yes", label: a("imageDecorativeLabel", locale) }]}
          value={attrs.isDecorative ? ["yes"] : []}
          onValueChange={(v) => set("isDecorative", v.includes("yes"))}
        />
        {attrs.isDecorative ? null : <PairInput id={id("alt")} label={a("blockImageAlt", locale)} hint={a("blockImageAltHint", locale)} value={pair(attrs.alt)} onChange={(v) => set("alt", v)} />}
        <PairInput id={id("caption")} label={a("blockImageCaption", locale)} value={pair(attrs.caption)} onChange={(v) => set("caption", v)} />
      </>
    );
  } else if (type === "linkOut") {
    body = (
      <>
        <PairInput id={id("label")} label={a("blockLinkLabel", locale)} value={pair(attrs.label)} onChange={(v) => set("label", v)} />
        <TextInput id={id("url")} type="url" label={a("blockLinkUrl", locale)} value={String(attrs.url ?? "")} onChange={(e) => set("url", e.target.value)} autoComplete="off" spellCheck={false} />
        <PairInput id={id("description")} label={a("blockLinkDescription", locale)} value={pair(attrs.description)} onChange={(v) => set("description", v)} />
        <Checkboxes
          id={id("signin")}
          name={id("signin")}
          legend={a("blockLinkSignIn", locale)}
          options={[{ value: "yes", label: a("blockLinkSignInLabel", locale) }]}
          value={attrs.requiresSignIn ? ["yes"] : []}
          onValueChange={(v) => set("requiresSignIn", v.includes("yes"))}
        />
      </>
    );
  } else if (type === "calloutBox") {
    body = (
      <>
        <Select
          id={id("tone")}
          label={a("blockCalloutTone", locale)}
          value={String(attrs.tone ?? "info")}
          onChange={(e) => set("tone", e.target.value)}
          options={(["info", "warning", "critical"] as const).map((t) => ({ value: t, label: a(`tone_${t}` as AdminKey, locale) }))}
        />
        <PairInput id={id("title")} label={a("blockCalloutTitle", locale)} value={pair(attrs.title)} onChange={(v) => set("title", v)} />
        <PairInput id={id("body")} label={a("blockCalloutBody", locale)} value={pair(attrs.body)} onChange={(v) => set("body", v)} multiline />
      </>
    );
  } else {
    const steps = (Array.isArray(attrs.steps) ? attrs.steps : []) as Raw[];
    const setSteps = (next: Raw[]) => set("steps", next);
    const blank = (): Raw => ({ title: { th: "", en: "" }, detail: null });
    body = (
      <>
        <PairInput id={id("title")} label={a("blockStepsTitle", locale)} value={pair(attrs.title)} onChange={(v) => set("title", v)} />
        <ol className="m-0 flex list-none flex-col gap-[var(--space-4)] p-0">
          {steps.map((step, i) => (
            <li key={i} className="flex flex-col gap-[var(--space-3)] rounded-panel border border-line p-[var(--space-3)]">
              <p className="m-0 font-semibold">{a("blockStepN", locale, { n: i + 1 })}</p>
              <PairInput id={id(`s${i}t`)} label={a("blockStepTitle", locale)} value={pair(step.title)} onChange={(v) => setSteps(steps.map((s, j) => (j === i ? { ...s, title: v } : s)))} />
              <PairInput id={id(`s${i}d`)} label={a("blockStepDetail", locale)} value={pair(step.detail)} onChange={(v) => setSteps(steps.map((s, j) => (j === i ? { ...s, detail: v } : s)))} multiline />
              <div className="flex flex-wrap gap-[var(--space-2)]">
                {i > 0 ? (
                  <Button type="button" variant="secondary" size="sm" onClick={() => setSteps(steps.map((s, j) => (j === i - 1 ? steps[i]! : j === i ? steps[i - 1]! : s)))}>
                    {a("moveUp", locale)}
                  </Button>
                ) : null}
                {i < steps.length - 1 ? (
                  <Button type="button" variant="secondary" size="sm" onClick={() => setSteps(steps.map((s, j) => (j === i + 1 ? steps[i]! : j === i ? steps[i + 1]! : s)))}>
                    {a("moveDown", locale)}
                  </Button>
                ) : null}
                {steps.length > 1 ? (
                  <Button type="button" variant="quiet" size="sm" onClick={() => setSteps(steps.filter((_, j) => j !== i))}>
                    {a("remove", locale)}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
        <div>
          <Button type="button" variant="secondary" onClick={() => setSteps([...steps, blank()])}>
            {a("blockStepAdd", locale)}
          </Button>
        </div>
      </>
    );
  }

  return (
    <PortalDialog
      open
      onClose={onClose}
      title={a(mode === "insert" ? "blockInsertTitle" : "blockEditTitle", locale, { block: a(BLOCK_LABEL[type], locale) })}
      headingLevel={2}
      locale={locale}
      className="w-[min(100vw-2rem,44rem)]"
    >
      <div
        className="flex flex-col gap-[var(--space-4)]"
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target instanceof HTMLInputElement && e.target.type !== "file") {
            e.preventDefault();
            submit();
          }
        }}
      >
        {body}
        {error ? (
          <ErrorMessage id={id("error")}>
            <span role="alert">{error}</span>
          </ErrorMessage>
        ) : null}
        <div className="flex flex-wrap gap-[var(--space-3)]">
          <Button type="button" onClick={submit}>
            {a(mode === "insert" ? "blockInsert" : "blockSaveChanges", locale)}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            {a("cancel", locale)}
          </Button>
        </div>
      </div>
    </PortalDialog>
  );
}
