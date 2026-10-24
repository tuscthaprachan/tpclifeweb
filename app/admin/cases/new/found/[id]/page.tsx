import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { AdminPage } from "@/components/admin/AdminPage";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Heading, InsetText, SummaryList } from "@/components/ui";
import { isStorageConfigured } from "@/lib/admin/content/images";
import { isUuid } from "@/lib/admin/content/form-state";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { requireStaff } from "@/lib/auth/session";
import { canAccessService, CASE_INBOX_ROLES } from "@/lib/cases/access";
import { listContactSummaries } from "@/lib/cases/contacts";
import { staffActorFor } from "@/lib/cases/staff";
import { getDb } from "@/lib/db";
import { cases } from "@/lib/db/schema";
import { a, type AdminKey } from "@/lib/i18n/admin";
import { getCaseDetails } from "@/lib/lost-found/details";
import { intakeProgress, type IntakeTask } from "@/lib/lost-found/intake";
import { getListingForCase, type ListingGap } from "@/lib/lost-found/listing";
import { listPrivatePhotos } from "@/lib/lost-found/photos";
import { getStorage } from "@/lib/storage";
import { categoryOptions, deskOptions, placeOptions } from "../../../lost-found/data";
import { DescribeForm, FinderForm, PhotoUpload, PublishListingForm, StorageForm, VerificationForm } from "../../../lost-found/Forms";
import { PrivatePhotos } from "../../../lost-found/PrivatePhotos";
import { TaskList, type TaskItem, type TaskState } from "../../../lost-found/TaskList";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("lfcFoundTitle", locale) };
}

const TASKS: IntakeTask[] = ["describe", "photos", "storage", "verification", "finder", "publish"];
const TITLE: Record<IntakeTask, AdminKey> = {
  describe: "lfcTaskDescribe",
  photos: "lfcTaskPhotos",
  storage: "lfcTaskStorage",
  verification: "lfcTaskVerification",
  finder: "lfcTaskFinder",
  publish: "lfcTaskPublish",
};
const GAP: Record<ListingGap, AdminKey> = {
  title_th: "lfcGapTitleTh",
  title_en: "lfcGapTitleEn",
  description_th: "lfcGapDescriptionTh",
  description_en: "lfcGapDescriptionEn",
  location: "lfcGapLocation",
};

/**
 * Found item intake as a task list (the GOV.UK pattern). Each task is a page
 * of its own (`?task=`), done in any order and left half done; "Publish to the
 * public list" opens when the listing has both languages and a place, the
 * storage location is recorded and the hidden detail is set.
 */
export default async function FoundIntakePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ task?: string; as?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const staff = await requireStaff(CASE_INBOX_ROLES);
  const [{ id }, { task: taskParam, as }] = await Promise.all([params, searchParams]);
  if (!isUuid(id) || !canAccessService(staff.roles, "lost_found")) notFound();

  const db = getDb();
  const [row] = await db.select().from(cases).where(eq(cases.id, id));
  if (!row || row.service !== "lost_found" || row.kind !== "found") notFound();
  if (row.status !== "logged") redirect(`/admin/cases/${id}`);

  const actor = await staffActorFor(staff, "lost_found", Number(as) || null);
  const [contacts, listing, details] = await Promise.all([listContactSummaries(db, id, actor), getListingForCase(db, id), getCaseDetails(db, id)]);
  const progress = await intakeProgress(db, id, contacts.some((c) => c.role === "finder"));
  const task = TASKS.find((t) => t === taskParam);
  const base = `/admin/cases/new/found/${id}`;
  const orgId = actor.organisationId;
  const state = (done: boolean, started = false): TaskState => (done ? "completed" : started ? "in_progress" : "not_started");

  const items: TaskItem[] = [
    {
      id: "describe",
      title: a(TITLE.describe, locale),
      hint: progress.gaps.length > 0 ? a("lfcDescribeNeeds", locale, { missing: progress.gaps.map((g) => a(GAP[g], locale)).join(", ") }) : undefined,
      href: `${base}?task=describe`,
      state: progress.gaps.length === 0 ? "completed" : "in_progress",
    },
    { id: "photos", title: a(TITLE.photos, locale), hint: a("lfcPhotosCount", locale, { count: progress.photos }), href: `${base}?task=photos`, state: progress.photos > 0 ? "completed" : "optional" },
    { id: "storage", title: a(TITLE.storage, locale), href: `${base}?task=storage`, state: state(progress.storageDone, Boolean(details.storageOrganisationId)) },
    { id: "verification", title: a(TITLE.verification, locale), href: `${base}?task=verification`, state: state(progress.verificationDone) },
    { id: "finder", title: a(TITLE.finder, locale), href: `${base}?task=finder`, state: progress.finderDone ? "completed" : "optional" },
    {
      id: "publish",
      title: a(TITLE.publish, locale),
      hint: progress.canPublish ? undefined : a("lfcPublishWaiting", locale),
      href: progress.canPublish ? `${base}?task=publish` : null,
      state: progress.canPublish ? "not_started" : "cannot_start",
    },
  ];

  return (
    <AdminPage width="content">
      <div>
        {task ? <a href={base}>{a("lfcBackToTasks", locale)}</a> : <a href={`/admin/cases/${id}`}>{a("lfcOpenCase", locale)}</a>}
        <Heading level={1} className="mt-[var(--space-2)]">
          {task ? a(TITLE[task], locale) : a("lfcFoundTitle", locale)}
        </Heading>
        <p className="mt-[var(--space-2)] text-ink-600">{a("lfcReferenceIs", locale, { reference: row.reference })}</p>
      </div>

      {!task ? (
        <>
          <TaskList locale={locale} items={items} />
          <InsetText>{a("lfcTaskListNote", locale)}</InsetText>
        </>
      ) : null}

      {task === "describe" && listing ? (
        <DescribeForm
          locale={locale}
          mode="describe"
          caseId={id}
          orgId={orgId}
          categories={categoryOptions(locale)}
          places={await placeOptions(db, locale)}
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
      ) : null}

      {task === "photos" ? (
        <div className="flex flex-col gap-[var(--space-4)]">
          <p className="m-0 text-ink-600">{a("lfcPhotosIntro", locale)}</p>
          <PrivatePhotos photos={await listPrivatePhotos(db, id, getStorage)} locale={locale} />
          <PhotoUpload locale={locale} caseId={id} orgId={orgId} storageConfigured={isStorageConfigured()} canPublic />
        </div>
      ) : null}

      {task === "storage" ? <StorageForm locale={locale} caseId={id} orgId={orgId} desks={await deskOptions(db, locale)} deskId={details.storageOrganisationId} shelf={details.storageShelf ?? ""} /> : null}

      {task === "verification" ? (
        <div className="flex flex-col gap-[var(--space-4)]">
          <InsetText>{a("lfcVerificationNote", locale)}</InsetText>
          <VerificationForm locale={locale} caseId={id} orgId={orgId} has={details.hasVerificationDetail} />
        </div>
      ) : null}

      {task === "finder" ? <FinderForm locale={locale} caseId={id} orgId={orgId} has={progress.finderDone} /> : null}

      {task === "publish" && listing ? (
        <div className="flex flex-col gap-[var(--space-4)]">
          <p className="m-0">{a("lfcPublishIntro", locale)}</p>
          <SummaryList
            rows={[
              { key: a("fieldTitle", locale), value: [listing.title.th, listing.title.en].filter(Boolean).join(" / ") },
              { key: a("lfFieldDescription", locale), value: [listing.description.th, listing.description.en].filter(Boolean).join(" / ") },
              { key: a("lfcFieldShelf", locale), value: details.storageShelf ?? "" },
              { key: a("lfcPhotosTitle", locale), value: a("lfcPhotosCount", locale, { count: progress.photos }) },
            ]}
          />
          <PublishListingForm locale={locale} caseId={id} orgId={orgId} found openCaseAfter />
        </div>
      ) : null}
    </AdminPage>
  );
}
