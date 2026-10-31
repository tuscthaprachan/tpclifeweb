import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ContentForm, type ContentRecordInfo } from "@/components/admin/content/ContentForm";
import { BilingualTextarea, TextField } from "@/components/admin/content/fields";
import { FormSection } from "@/components/admin/content/FormSection";
import { userNames } from "@/lib/admin/content/list";
import { OPEN_DATA_PATHS } from "@/lib/admin/open-data/paths";
import { canEditOwner } from "@/lib/admin/open-data/scope";
import { getDb } from "@/lib/db";
import { openDataDecisions, openDataMeetings, type OpenDataOwner } from "@/lib/db/schema/content/open-data";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { deleteDecision, saveDecision } from "../../../actions";

export async function DecisionForm({ locale, owners, meetingId, id, saved }: { locale: Locale; owners: readonly OpenDataOwner[]; meetingId: string; id?: string; saved?: string }) {
  const db = getDb();
  const [meeting] = await db.select({ id: openDataMeetings.id, owner: openDataMeetings.owner }).from(openDataMeetings).where(eq(openDataMeetings.id, meetingId));
  if (!meeting || !canEditOwner(owners, meeting.owner)) notFound();
  const [row] = id ? await db.select().from(openDataDecisions).where(and(eq(openDataDecisions.id, id), eq(openDataDecisions.meetingId, meetingId))) : [];
  if (id && !row) notFound();
  const names = row ? await userNames(db, [row.updatedBy]) : new Map<string, string>();
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);
  const record: ContentRecordInfo | undefined = row
    ? { id: row.id, status: "published", updatedAt: row.updatedAt.toISOString(), updatedByName: row.updatedBy ? names.get(row.updatedBy) : null }
    : undefined;

  return (
    <ContentForm
      key={record?.updatedAt}
      locale={locale}
      action={saveDecision.bind(null, meetingId, row?.id ?? null)}
      deleteAction={row ? deleteDecision.bind(null, meetingId, row.id) : undefined}
      record={record}
      listHref={`${OPEN_DATA_PATHS.meetings}/${meetingId}`}
      saved={saved}
      hasStatus={false}
    >
      <FormSection id="od-decision-identity" icon="edit" legend={L("odmSecDecision")}>
        <div className="grid gap-[var(--space-4)] md:grid-cols-3">
          <TextField name="ref" label={L("odmFieldRef")} hint={L("odmHintRef")} defaultValue={row?.ref} />
          <TextField name="item" label={L("odmFieldItem")} hint={L("odmHintItem")} defaultValue={row?.item} />
          <TextField name="type" label={L("odmFieldDecisionType")} defaultValue={row?.type} />
        </div>
        <TextField name="topic" label={L("odmFieldTopic")} defaultValue={row?.topic} />
        <BilingualTextarea name="text" label={L("odmFieldDecisionText")} rows={4} defaultValue={{ th: row?.textTh, en: row?.textEn }} />
        <TextField name="outcome" label={L("odmFieldOutcome")} defaultValue={row?.outcome} />
        <TextField name="amount" label={L("odmFieldAmount")} hint={L("odmHintAsPrinted")} defaultValue={row?.amount} />
        <TextField name="minutesAnchor" label={L("odmFieldMinutesAnchor")} defaultValue={row?.minutesAnchor} />
      </FormSection>
      <FormSection id="od-decision-votes" icon="info" legend={L("odmSecVotes")} hint={L("odmHintVotes")}>
        <div className="grid gap-[var(--space-4)] sm:grid-cols-2 md:grid-cols-4">
          <TextField name="votesFor" label={L("odmFieldVotesFor")} defaultValue={row?.votesFor} />
          <TextField name="votesAgainst" label={L("odmFieldVotesAgainst")} defaultValue={row?.votesAgainst} />
          <TextField name="votesAbstain" label={L("odmFieldVotesAbstain")} defaultValue={row?.votesAbstain} />
          <TextField name="membersVoting" label={L("odmFieldMembersVoting")} defaultValue={row?.membersVoting} />
        </div>
        <TextField name="partyBreakdown" label={L("odmFieldPartyBreakdown")} defaultValue={row?.partyBreakdown} />
      </FormSection>
    </ContentForm>
  );
}
