import { Heading, InsetText, StatusTag, SummaryList, Tag, Timestamp } from "@/components/ui";
import { categoryLabel } from "@/components/domain/lostfound/categoryLabel";
import { canEditContent } from "@/lib/admin/content/access";
import { formatBangkokDateTime } from "@/lib/admin/content/datetime";
import { isStorageConfigured } from "@/lib/admin/content/images";
import { requireStaff } from "@/lib/auth/session";
import { listContactSummaries } from "@/lib/cases/contacts";
import { CASE_INBOX_ROLES } from "@/lib/cases/access";
import { getStatusDef, statusLabel } from "@/lib/cases/services";
import { staffActorFor } from "@/lib/cases/staff";
import { getDb } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { a, type AdminKey } from "@/lib/i18n/admin";
import { pick, type Locale } from "@/lib/i18n/config";
import { listClaims } from "@/lib/lost-found/claims";
import { DEFAULT_REJECT_MESSAGE } from "@/lib/lost-found/claims";
import { getCaseDetails } from "@/lib/lost-found/details";
import { getHandover } from "@/lib/lost-found/handover";
import { hasIdentifyingDetail } from "@/lib/lost-found/identifying";
import { linkedCases } from "@/lib/lost-found/links";
import { getListingForCase, listingGaps, type ListingGap, type ListingView } from "@/lib/lost-found/listing";
import { describeMatch, rankMatches, type MatchCandidate } from "@/lib/lost-found/matching";
import { listPrivatePhotos } from "@/lib/lost-found/photos";
import { getStorage } from "@/lib/storage";
import type { CasePanelProps } from "../panels";
import { caseRefs, categoryOptions, deskOptions, placeOptions } from "./data";
import {
  AddClaimForm,
  ClaimAnswerReveal,
  ClaimReview,
  DescribeForm,
  FinderForm,
  HandoverForm,
  IdentifyingReveal,
  MatchButton,
  PhotoUpload,
  PublishListingForm,
  StorageForm,
  VerificationForm,
  VerificationReveal,
} from "./Forms";
import { PrivatePhotos } from "./PrivatePhotos";

/**
 * The lost and found part of the case page (registered in ../panels.ts).
 * Lost reports show the linked listing and the possible matches; found items
 * show where the item is, the hidden detail, photos, claims and the handover.
 * Everything personal stays behind a logged "Show"; this component never
 * decrypts anything itself.
 */
export async function LostFoundPanel(props: CasePanelProps) {
  const staff = await requireStaff(CASE_INBOX_ROLES);
  const actor = await staffActorFor(staff, "lost_found", props.organisationId);
  const common = { ...props, orgId: actor.organisationId, canEdit: canEditContent(staff.roles) };
  return props.kind === "found" ? <FoundPanel {...common} /> : <LostPanel {...common} />;
}

type PanelProps = CasePanelProps & { orgId: number; canEdit: boolean };

const GAP_KEY: Record<ListingGap, AdminKey> = {
  title_th: "lfcGapTitleTh",
  title_en: "lfcGapTitleEn",
  description_th: "lfcGapDescriptionTh",
  description_en: "lfcGapDescriptionEn",
  location: "lfcGapLocation",
};

/* Listing */

async function ListingSection({ caseId, locale, orgId, canEdit, found, status }: { caseId: string; locale: Locale; orgId: number; canEdit: boolean; found: boolean; status: string }) {
  const db = getDb();
  const [listing, places] = await Promise.all([getListingForCase(db, caseId), placeOptions(db, locale)]);
  if (!listing) return <p className="m-0 text-ink-600">{a("lfcListingNone", locale)}</p>;
  const gaps = listingGaps(listing);
  const published = listing.status === "published";
  const canPublish = gaps.length === 0 && !published;
  const foundNeedsIntake = found && status === "logged";
  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <SummaryList
        rows={[
          { key: a("lfcListingState", locale), value: <StatusTag tone={published ? "success" : "neutral"} label={a(published ? "statusPublished" : "statusDraft", locale)} /> },
          { key: a("fieldTitle", locale), value: <Bilingual th={listing.title.th} en={listing.title.en} locale={locale} /> },
          { key: a("lfFieldDescription", locale), value: <Bilingual th={listing.description.th} en={listing.description.en} locale={locale} /> },
          { key: a("fieldCategory", locale), value: categoryLabel(listing.category, locale) },
          { key: a("lfFieldOccurredOn", locale), value: listing.occurredOn },
          { key: a("lfFieldPlace", locale), value: places.find((p) => p.value === listing.placeId)?.label ?? a("caseNone", locale) },
          { key: a("lfFieldLocationNote", locale), value: <Bilingual th={listing.locationNote.th} en={listing.locationNote.en} locale={locale} /> },
          { key: a("lfFieldProgress", locale), value: a(`lfcRegister_${listing.registerStatus}` as AdminKey, locale) },
        ]}
      />
      {!published && gaps.length > 0 ? (
        <InsetText>
          <p className="m-0 font-medium">{a("lfcGapsIntro", locale)}</p>
          <ul className="m-0 mt-[var(--space-1)] pl-[var(--space-5)]">
            {gaps.map((gap) => (
              <li key={gap}>{a(GAP_KEY[gap], locale)}</li>
            ))}
          </ul>
        </InsetText>
      ) : null}
      {canPublish && !foundNeedsIntake ? <PublishListingForm locale={locale} caseId={caseId} orgId={orgId} found={false} /> : null}
      <details className="rounded-panel border border-line">
        <summary className="cursor-pointer px-[var(--space-4)] py-[var(--space-3)] font-medium text-ink-900">{a("lfcListingEdit", locale)}</summary>
        <div className="border-t border-line p-[var(--space-4)]">
          <DescribeForm
            locale={locale}
            mode="panel"
            caseId={caseId}
            orgId={orgId}
            categories={categoryOptions(locale)}
            places={places}
            defaults={{
              category: listing.category,
              titleTh: listing.title.th,
              titleEn: listing.title.en,
              descriptionTh: listing.description.th,
              descriptionEn: listing.description.en,
              placeId: listing.placeId,
              locationNoteTh: listing.locationNote.th,
              locationNoteEn: listing.locationNote.en,
              occurredOn: listing.occurredOn,
            }}
          />
        </div>
      </details>
      {canEdit ? (
        <p className="m-0">
          <a href={`/admin/content/lost-and-found/${listing.id}`}>{a("lfcListingOpenEditor", locale)}</a>
        </p>
      ) : null}
    </div>
  );
}

function Bilingual({ th, en, locale }: { th: string; en: string; locale: Locale }) {
  if (!th && !en) return <span className="text-ink-600">{a("caseNone", locale)}</span>;
  const first = locale === "th" ? ([["th", th], ["en", en]] as const) : ([["en", en], ["th", th]] as const);
  return (
    <>
      {first
        .filter(([, v]) => v)
        .map(([lang, v]) => (
          <span key={lang} lang={lang} className="block">
            {v}
          </span>
        ))}
    </>
  );
}

/* Matches */

function Candidates({ candidates, locale, caseId, orgId, subjectIsLost }: { candidates: MatchCandidate[]; locale: Locale; caseId: string; orgId: number; subjectIsLost: boolean }) {
  if (candidates.length === 0) return <p className="m-0 text-ink-600">{a("lfcMatchNone", locale)}</p>;
  return (
    <ul className="m-0 flex list-none flex-col gap-[var(--space-3)] p-0">
      {candidates.map((c) => {
        const def = getStatusDef("lost_found", c.kind, c.status);
        return (
          <li key={c.caseId} className="flex flex-col gap-[var(--space-2)] rounded-panel border border-line p-[var(--space-4)]">
            <div className="flex flex-wrap items-center gap-x-[var(--space-3)] gap-y-[var(--space-1)]">
              <a href={`/admin/cases/${c.caseId}`} className="font-medium">
                {c.reference}
              </a>
              <StatusTag tone={def?.tone ?? "neutral"} label={pick(statusLabel("lost_found", c.kind, c.status), locale)} />
              <Tag tone="governance">{a("lfcMatchScore", locale, { score: c.score })}</Tag>
            </div>
            <p className="m-0 font-medium">{pick(c.title, locale) || c.title.en || c.title.th}</p>
            <p className="m-0 text-sm text-ink-600">
              {categoryLabel(c.category as Parameters<typeof categoryLabel>[0], locale)}, {c.occurredOn}
            </p>
            <p className="m-0 text-sm">{describeMatch(c.reasons, locale)}</p>
            <MatchButton
              locale={locale}
              caseId={caseId}
              orgId={orgId}
              lostCaseId={subjectIsLost ? caseId : c.caseId}
              foundCaseId={subjectIsLost ? c.caseId : caseId}
              score={c.score}
              linked={c.linked}
              reference={c.reference}
            />
          </li>
        );
      })}
    </ul>
  );
}

async function MatchesSection({ caseId, locale, orgId, kind, status }: { caseId: string; locale: Locale; orgId: number; kind: "lost" | "found"; status: string }) {
  const db = getDb();
  const staff = await requireStaff(CASE_INBOX_ROLES);
  const actor = await staffActorFor(staff, "lost_found", orgId);
  const matchable = kind === "lost" ? ["submitted", "searching", "match_found"] : ["logged", "listed", "claim_pending"];
  const [candidates, links] = await Promise.all([matchable.includes(status) ? rankMatches(db, caseId, actor, 5) : [], linkedCases(db, caseId, kind)]);
  const refs = await caseRefs(db, links.map((l) => l.caseId));
  const active = links.filter((l) => l.status !== "dismissed");
  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      {active.length > 0 ? (
        <div>
          <Heading level={3}>{a("lfcLinkedTitle", locale)}</Heading>
          <ul className="m-0 mt-[var(--space-2)] list-none p-0">
            {active.map((l) => (
              <li key={l.linkId} className="py-[var(--space-1)]">
                <a href={`/admin/cases/${l.caseId}`} className="font-medium">
                  {refs.get(l.caseId)?.reference ?? l.caseId}
                </a>{" "}
                <Tag tone="neutral">{a(l.status === "confirmed" ? "lfcLinkConfirmed" : "lfcLinkPossible", locale)}</Tag>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="flex flex-col gap-[var(--space-2)]">
        <Heading level={3}>{a("lfcCandidatesTitle", locale)}</Heading>
        <p className="m-0 text-ink-600">{a(kind === "lost" ? "lfcCandidatesLostNote" : "lfcCandidatesFoundNote", locale)}</p>
        <Candidates candidates={candidates} locale={locale} caseId={caseId} orgId={orgId} subjectIsLost={kind === "lost"} />
      </div>
    </div>
  );
}

/* Lost report */

async function LostPanel({ caseId, locale, orgId, canEdit, status }: PanelProps) {
  const db = getDb();
  const staff = await requireStaff(CASE_INBOX_ROLES);
  const actor = await staffActorFor(staff, "lost_found", orgId);
  const [summaries, links, identifying] = await Promise.all([listContactSummaries(db, caseId, actor), linkedCases(db, caseId, "lost"), hasIdentifyingDetail(db, caseId)]);
  const refs = await caseRefs(db, links.map((l) => l.caseId));
  const reporter = summaries.find((c) => c.role === "reporter") ?? summaries[0];
  const waiting = status === "match_found" || status === "ready_to_collect";
  const handoverTarget = links.find((l) => l.status === "confirmed") ?? links.find((l) => l.status === "possible");
  return (
    <>
      <section aria-labelledby="lf-listing" className="flex flex-col gap-[var(--space-3)]">
        <Heading level={2} id="lf-listing">
          {a("lfcLostListingTitle", locale)}
        </Heading>
        <p className="m-0 text-ink-600">{a("lfcLostListingNote", locale)}</p>
        <ListingSection caseId={caseId} locale={locale} orgId={orgId} canEdit={canEdit} found={false} status={status} />
      </section>
      <section aria-labelledby="lf-identifying" className="flex flex-col gap-[var(--space-3)]">
        <Heading level={2} id="lf-identifying">
          {a("lfcIdentifyingHeading", locale)}
        </Heading>
        <p className="m-0 text-ink-600">{a("lfcIdentifyingNote", locale)}</p>
        {identifying ? <IdentifyingReveal locale={locale} caseId={caseId} orgId={orgId} /> : <p className="m-0 text-ink-600">{a("lfcIdentifyingNone", locale)}</p>}
      </section>
      <section aria-labelledby="lf-matches" className="flex flex-col gap-[var(--space-3)]">
        <Heading level={2} id="lf-matches">
          {a("lfcMatchesTitle", locale)}
        </Heading>
        <MatchesSection caseId={caseId} locale={locale} orgId={orgId} kind="lost" status={status} />
      </section>
      {waiting ? (
        <section aria-labelledby="lf-contact" className="flex flex-col gap-[var(--space-3)]">
          <Heading level={2} id="lf-contact">
            {a("lfcContactTitle", locale)}
          </Heading>
          <InsetText>
            <p className="m-0">
              {reporter
                ? a("lfcContactReminder", locale, {
                    method: reporter.preferredContact ? a(`contactPref_${reporter.preferredContact}` as AdminKey, locale) : a("lfcNoticePreferredNone", locale),
                    consent: a(reporter.consentContact ? "contactYes" : "contactNo", locale),
                  })
                : a("lfcRemind_no_contact", locale)}
            </p>
            <p className="m-0 mt-[var(--space-2)]">{a("lfcRemindHow", locale)}</p>
          </InsetText>
          {handoverTarget ? (
            <p className="m-0">
              <a href={`/admin/cases/${handoverTarget.caseId}`}>{a("lfcGoToHandover", locale, { reference: refs.get(handoverTarget.caseId)?.reference ?? "" })}</a>
            </p>
          ) : null}
        </section>
      ) : null}
    </>
  );
}

/* Found item */

async function FoundPanel({ caseId, locale, orgId, canEdit, status }: PanelProps) {
  const db = getDb();
  const staff = await requireStaff(CASE_INBOX_ROLES);
  const actor = await staffActorFor(staff, "lost_found", orgId);
  const [details, desks, photos, claims, links, handover, summaries] = await Promise.all([
    getCaseDetails(db, caseId),
    deskOptions(db, locale),
    listPrivatePhotos(db, caseId, getStorage),
    listClaims(db, caseId),
    linkedCases(db, caseId, "found"),
    getHandover(db, caseId),
    listContactSummaries(db, caseId, actor),
  ]);
  const refs = await caseRefs(db, [...links.map((l) => l.caseId), ...claims.map((c) => c.lostCaseId).filter((x): x is string => Boolean(x))]);
  const identifyingByCase = new Map<string, boolean>(await Promise.all(claims.map(async (c) => [c.lostCaseId ?? "", c.lostCaseId ? await hasIdentifyingDetail(db, c.lostCaseId) : false] as const)));
  const deskLabel = desks.find((d) => d.value === String(details.storageOrganisationId))?.label;
  const activeLinks = links.filter((l) => l.status !== "dismissed");
  const open = !["returned", "withdrawn"].includes(status);
  const [officer] = handover ? await db.select({ name: user.name }).from(user).where(eq(user.id, handover.officerUserId)) : [];
  const collectorKnown = summaries.some((c) => (c.role === "claimant" || c.role === "owner") && c.has.name);
  const listing: ListingView | null = await getListingForCase(db, caseId);
  const ready = Boolean(listing && listingGaps(listing).length === 0 && details.storageShelf && details.hasVerificationDetail);

  return (
    <>
      <section aria-labelledby="lf-listing" className="flex flex-col gap-[var(--space-3)]">
        <Heading level={2} id="lf-listing">
          {a("lfcFoundListingTitle", locale)}
        </Heading>
        <ListingSection caseId={caseId} locale={locale} orgId={orgId} canEdit={canEdit} found status={status} />
        {status === "logged" ? (
          <div className="flex flex-col gap-[var(--space-3)]">
            <InsetText>{a(ready ? "lfcPublishReady" : "lfcPublishNotReady", locale)}</InsetText>
            <p className="m-0">
              <a href={`/admin/cases/new/found/${caseId}`}>{a("lfcContinueIntake", locale)}</a>
            </p>
            {ready ? <PublishListingForm locale={locale} caseId={caseId} orgId={orgId} found /> : null}
          </div>
        ) : null}
      </section>

      <section aria-labelledby="lf-storage" className="flex flex-col gap-[var(--space-3)]">
        <Heading level={2} id="lf-storage">
          {a("lfcStorageTitle", locale)}
        </Heading>
        <SummaryList
          rows={[
            { key: a("lfcFieldDesk", locale), value: deskLabel ?? a("lfcNotRecorded", locale) },
            { key: a("lfcFieldShelf", locale), value: details.storageShelf ?? a("lfcNotRecorded", locale) },
          ]}
        />
        {open ? (
          <details className="rounded-panel border border-line">
            <summary className="cursor-pointer px-[var(--space-4)] py-[var(--space-3)] font-medium text-ink-900">{a("lfcStorageEdit", locale)}</summary>
            <div className="border-t border-line p-[var(--space-4)]">
              <StorageForm locale={locale} caseId={caseId} orgId={orgId} desks={desks} deskId={details.storageOrganisationId} shelf={details.storageShelf ?? ""} />
            </div>
          </details>
        ) : null}
      </section>

      <section aria-labelledby="lf-verification" className="flex flex-col gap-[var(--space-3)]">
        <Heading level={2} id="lf-verification">
          {a("lfcVerificationHeading", locale)}
        </Heading>
        <p className="m-0 text-ink-600">{a("lfcVerificationNote", locale)}</p>
        {details.hasVerificationDetail ? <VerificationReveal locale={locale} caseId={caseId} orgId={orgId} /> : <p className="m-0 text-ink-600">{a("lfcVerificationNone", locale)}</p>}
        {open ? (
          <details className="rounded-panel border border-line">
            <summary className="cursor-pointer px-[var(--space-4)] py-[var(--space-3)] font-medium text-ink-900">{a("lfcVerificationEdit", locale)}</summary>
            <div className="border-t border-line p-[var(--space-4)]">
              <VerificationForm locale={locale} caseId={caseId} orgId={orgId} has={details.hasVerificationDetail} />
            </div>
          </details>
        ) : null}
      </section>

      <section aria-labelledby="lf-photos" className="flex flex-col gap-[var(--space-3)]">
        <Heading level={2} id="lf-photos">
          {a("lfcPhotosTitle", locale)}
        </Heading>
        <PrivatePhotos photos={photos} locale={locale} />
        {open ? (
          <details className="rounded-panel border border-line">
            <summary className="cursor-pointer px-[var(--space-4)] py-[var(--space-3)] font-medium text-ink-900">{a("lfcPhotosAdd", locale)}</summary>
            <div className="border-t border-line p-[var(--space-4)]">
              <PhotoUpload locale={locale} caseId={caseId} orgId={orgId} storageConfigured={isStorageConfigured()} canPublic={Boolean(listing)} />
            </div>
          </details>
        ) : null}
      </section>

      {open ? (
        <section aria-labelledby="lf-matches" className="flex flex-col gap-[var(--space-3)]">
          <Heading level={2} id="lf-matches">
            {a("lfcMatchesTitle", locale)}
          </Heading>
          <MatchesSection caseId={caseId} locale={locale} orgId={orgId} kind="found" status={status} />
        </section>
      ) : null}

      <section aria-labelledby="lf-claims" className="flex flex-col gap-[var(--space-4)]">
        <Heading level={2} id="lf-claims">
          {a("lfcClaimsTitle", locale)}
        </Heading>
        {claims.length === 0 ? <p className="m-0 text-ink-600">{a("lfcClaimsNone", locale)}</p> : <p className="m-0 text-ink-600">{a("lfcClaimsNote", locale)}</p>}
        {claims.map((claim, index) => (
          <div key={claim.id} className="flex flex-col gap-[var(--space-3)] rounded-panel border border-line p-[var(--space-4)]">
            <div className="flex flex-wrap items-center gap-x-[var(--space-3)] gap-y-[var(--space-1)]">
              <Heading level={3}>{a("lfcClaimN", locale, { n: index + 1 })}</Heading>
              <Tag tone={claim.decision === "accepted" ? "welfare" : "neutral"}>{a(claim.decision ? (`lfcDecision_${claim.decision}` as AdminKey) : "lfcDecision_pending", locale)}</Tag>
              <span className="text-sm text-ink-600">
                <Timestamp value={claim.createdAt} locale={locale} format="datetime" />
              </span>
            </div>
            {claim.lostReference ? (
              <p className="m-0 text-sm">
                {a("lfcClaimLostReport", locale)}:{" "}
                <a href={`/admin/cases/${claim.lostCaseId}`}>{claim.lostReference}</a>
              </p>
            ) : null}
            {claim.hasAnswer && !claim.decision ? (
              <div className="flex flex-col gap-[var(--space-4)]">
                <p className="m-0 text-sm text-ink-600">{a("lfcClaimCompare", locale)}</p>
                <ClaimAnswerReveal locale={locale} caseId={caseId} orgId={orgId} claimId={claim.id} />
                {details.hasVerificationDetail ? <VerificationReveal locale={locale} caseId={caseId} orgId={orgId} /> : null}
                {claim.lostCaseId && identifyingByCase.get(claim.lostCaseId) ? <IdentifyingReveal locale={locale} caseId={claim.lostCaseId} orgId={orgId} /> : null}
                <ClaimReview locale={locale} caseId={caseId} orgId={orgId} claimId={claim.id} defaultReject={DEFAULT_REJECT_MESSAGE} hasLost={Boolean(claim.lostCaseId || activeLinks.length === 1)} />
              </div>
            ) : null}
            {claim.decision && claim.hasAnswer ? <ClaimAnswerReveal locale={locale} caseId={caseId} orgId={orgId} claimId={claim.id} /> : null}
          </div>
        ))}
        {open && status !== "ready_to_collect" ? (
          <details className="rounded-panel border border-line">
            <summary className="cursor-pointer px-[var(--space-4)] py-[var(--space-3)] font-medium text-ink-900">{a("lfcClaimRecord", locale)}</summary>
            <div className="border-t border-line p-[var(--space-4)]">
              <AddClaimForm locale={locale} caseId={caseId} orgId={orgId} />
            </div>
          </details>
        ) : null}
      </section>

      <section aria-labelledby="lf-finder" className="flex flex-col gap-[var(--space-3)]">
        <Heading level={2} id="lf-finder">
          {a("lfcFinderTitle", locale)}
        </Heading>
        <p className="m-0 text-ink-600">{a(summaries.some((c) => c.role === "finder") ? "lfcFinderHeld" : "lfcFinderNone", locale)}</p>
        {open ? (
          <details className="rounded-panel border border-line">
            <summary className="cursor-pointer px-[var(--space-4)] py-[var(--space-3)] font-medium text-ink-900">{a("lfcFinderAdd", locale)}</summary>
            <div className="border-t border-line p-[var(--space-4)]">
              <FinderForm locale={locale} caseId={caseId} orgId={orgId} has={summaries.some((c) => c.role === "finder")} />
            </div>
          </details>
        ) : null}
      </section>

      <section aria-labelledby="lf-handover" className="flex flex-col gap-[var(--space-3)]">
        <Heading level={2} id="lf-handover">
          {a("lfcHandoverTitle", locale)}
        </Heading>
        {handover ? (
          <SummaryList
            rows={[
              { key: a("lfcFieldCollectedAt", locale), value: <Timestamp value={handover.collectedAt} locale={locale} format="datetime" /> },
              { key: a("lfcFieldIdCheck", locale), value: a(`lfcIdCheck_${handover.idCheckType}` as AdminKey, locale) },
              { key: a("lfcFieldDesk", locale), value: desks.find((d) => d.value === String(handover.deskOrganisationId))?.label ?? "" },
              { key: a("lfcFieldOfficer", locale), value: officer?.name ?? "" },
            ]}
          />
        ) : status === "ready_to_collect" ? (
          <HandoverForm
            locale={locale}
            caseId={caseId}
            orgId={orgId}
            desks={desks}
            nowLocal={formatBangkokDateTime(new Date())}
            collectorKnown={collectorKnown}
            lostChoices={activeLinks.map((l) => ({ value: l.caseId, label: refs.get(l.caseId)?.reference ?? l.caseId }))}
          />
        ) : (
          <p className="m-0 text-ink-600">{a("lfcHandoverNotReady", locale)}</p>
        )}
      </section>
    </>
  );
}
