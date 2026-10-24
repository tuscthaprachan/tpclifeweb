import { eq } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { faqForms } from "@/lib/db/schema";
import type { validateFaqForm } from "./validate";

type FaqData = Extract<Awaited<ReturnType<typeof validateFaqForm>>, { ok: true }>["data"];

/** The `faqs` columns a validated FAQ form sets. */
export function faqValues(data: FaqData): Record<string, unknown> {
  return {
    slug: data.slug,
    questionTh: data.question.th,
    questionEn: data.question.en,
    answerTh: data.answer.th,
    answerEn: data.answer.en,
    category: data.category,
    sortOrder: data.sortOrder,
  };
}

/** `saveContent`'s `children` callback: replaces the FAQ's related forms. */
export function faqChildren(data: FaqData) {
  return async (tx: AuditExecutor, faqId: string) => {
    await tx.delete(faqForms).where(eq(faqForms.faqId, faqId));
    const formRows = data.forms.map((formId, position) => ({ faqId, formId, position }));
    if (formRows.length > 0) await tx.insert(faqForms).values(formRows);
    return { forms: formRows };
  };
}
