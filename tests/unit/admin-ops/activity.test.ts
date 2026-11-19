import { beforeAll, describe, expect, it } from "vitest";
import { activityScope, loadRecentActivity } from "@/lib/admin/dashboard/activity";
import { loadMyCases, loadMyDrafts } from "@/lib/admin/dashboard/summary";
import { describeAction, entityHref } from "@/lib/admin/audit/describe";
import { recordAudit } from "@/lib/db/audit";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { setupComplaints, type Ctx } from "../complaints/helpers";
import { NOW } from "../complaints/helpers";

let t: Ctx;
let ordinary: { caseId: string; reference: string };
let restricted: { caseId: string; reference: string };

beforeAll(async () => {
  t = await setupComplaints();
  ordinary = await t.file({ key: "facilities" });
  restricted = await t.file({ key: "harassment" });
  await recordAudit(t.db, { action: "news_posts.publish", entityType: "news_posts", entityId: "p1", actorUserId: t.admin.userId });
  await recordAudit(t.db, { action: "staff_member.update", entityType: "staff_member", entityId: "u1", actorUserId: t.admin.userId });
  await recordAudit(t.db, { action: "case.view_details", entityType: "case", entityId: ordinary.caseId, actorUserId: t.handler.userId });
});

const roles = (...r: Array<"admin" | "editor" | "officer">) => r.map((role) => ({ role }));

describe("dashboard activity scope", () => {
  it("is everything for an administrator, content for an editor, case work for an officer", () => {
    expect(activityScope(roles("admin")).all).toBe(true);
    const editor = activityScope(roles("editor"));
    expect(editor.all).toBe(false);
    expect(editor.entityTypes).toContain("news_posts");
    expect(editor.actionPrefixes).toEqual([]);
    const officer = activityScope(roles("officer"));
    expect(officer.actionPrefixes).toContain("complaint.");
    expect(officer.entityTypes).toEqual([]);
    const both = activityScope(roles("editor", "officer"));
    expect(both.entityTypes.length).toBeGreaterThan(0);
    expect(both.actionPrefixes.length).toBeGreaterThan(0);
  });
});

describe("dashboard activity feed visibility", () => {
  it("gives an officer case actions only, without the restricted complaint", async () => {
    const feed = await loadRecentActivity(t.db, { userId: t.handler.userId, roles: roles("officer") });
    const ids = feed.map((f) => f.entityId);
    expect(ids).toContain(ordinary.caseId);
    expect(ids).not.toContain(restricted.caseId);
    expect(feed.some((f) => f.entityType === "news_posts" || f.entityType === "staff_member")).toBe(false);
    expect(feed.some((f) => f.action.includes("view"))).toBe(false);
    expect(feed.find((f) => f.entityId === ordinary.caseId)!.entityLabel).toBe(ordinary.reference);
  });

  it("shows the restricted complaint to the person named on its category, and to nobody else", async () => {
    const named = await loadRecentActivity(t.db, { userId: t.named.userId, roles: roles("officer") });
    expect(named.map((f) => f.entityId)).toContain(restricted.caseId);
    const admin = await loadRecentActivity(t.db, { userId: t.admin.userId, roles: roles("admin") });
    expect(admin.map((f) => f.entityId)).not.toContain(restricted.caseId);
  });

  it("gives an editor content actions only and an administrator the rest", async () => {
    const editor = await loadRecentActivity(t.db, { userId: t.handler.userId, roles: roles("editor") });
    expect(editor.map((f) => f.action)).toEqual(["news_posts.publish"]);
    const admin = await loadRecentActivity(t.db, { userId: t.admin.userId, roles: roles("admin") });
    expect(admin.map((f) => f.action)).toEqual(expect.arrayContaining(["news_posts.publish", "staff_member.update", "complaint.create"]));
  });

  it("describes known actions and falls back to the action name", () => {
    expect(describeAction({ action: "news_posts.publish", entityType: "news_posts" }, "en", { actor: "Ann", entity: "" }).text).toBe("Ann published a news post");
    expect(describeAction({ action: "case.assign", entityType: "case" }, "en", { actor: "Ann", entity: "LF-2026-0001" }).text).toBe("Ann assigned case LF-2026-0001");
    const unknown = describeAction({ action: "brand.new_thing", entityType: "x" }, "th", { actor: "Ann", entity: "" });
    expect(unknown).toMatchObject({ text: "Ann ทำการเปลี่ยนแปลง", known: false });
    expect(unknown.text).not.toContain("brand.new_thing");
    expect(entityHref("case", "abc")).toBe("/admin/cases/abc");
    expect(entityHref("cron", "retention")).toBeNull();
  });
});

describe("dashboard activity, own sign-in events", () => {
  it("leaves out the viewer's own sign-in, session and passkey events but keeps other people's", async () => {
    await recordAudit(t.db, { action: "auth.sign_in", entityType: "user", entityId: t.admin.userId, actorUserId: t.admin.userId });
    await recordAudit(t.db, { action: "auth.session_revoke", entityType: "user", entityId: t.admin.userId, actorUserId: t.admin.userId });
    await recordAudit(t.db, { action: "auth.passkey.register", entityType: "user", entityId: t.admin.userId, actorUserId: t.admin.userId });
    await recordAudit(t.db, { action: "auth.sign_in", entityType: "user", entityId: t.handler.userId, actorUserId: t.handler.userId });
    await recordAudit(t.db, { action: "cron.run", entityType: "cron", entityId: "retention" });
    const mine = await loadRecentActivity(t.db, { userId: t.admin.userId, roles: roles("admin"), limit: 50 });
    expect(mine.filter((f) => f.action.startsWith("auth.") && f.actorUserId === t.admin.userId)).toEqual([]);
    expect(mine.some((f) => f.action === "auth.sign_in" && f.actorUserId === t.handler.userId)).toBe(true);
    expect(mine.some((f) => f.action === "cron.run" && f.actorUserId === null)).toBe(true);
  });
});

describe("audit sentences", () => {
  const ACTIONS = [
    "account.update_name", "audit.export", "auth.passkey.register", "auth.passkey.remove", "auth.passkey.rename", "auth.session_revoke", "auth.session_revoke_others",
    "auth.sign_in", "auth.sign_in.failed", "auth.sign_out", "borrowing.approve", "borrowing.cancel_by_staff", "borrowing.category_update", "borrowing.create",
    "borrowing.decline", "borrowing.handover", "borrowing.item_create", "borrowing.item_update", "borrowing.not_collected", "borrowing.return", "borrowing.settle",
    "borrowing.view_details", "case.assign", "case.create", "case.export", "case.note", "case.pii_purge", "case.public_update", "case.transition", "case_contact.add",
    "case_contact.view", "case_link.issue", "case_link.revoke", "case_view.create", "case_view.delete", "case_view.update", "complaint.auto_close", "complaint.create",
    "complaint.escalate", "complaint.recategorise", "complaint.redirect", "complaint.reopen", "complaint.resolve", "complaint.survey", "complaint.view_details",
    "complaint.view_evidence", "complaint.wellbeing_route", "complaint_category.create", "complaint_category.update", "complaint_category_access.grant",
    "complaint_category_access.revoke", "content.export", "cron.fail", "cron.run", "images.create", "images.delete", "images.replace", "images.update",
    "lost_found.claim_create", "lost_found.claim_decide", "lost_found.claim_view", "lost_found.handover", "lost_found.identifying_view", "lost_found.match_link",
    "lost_found.photo_add", "lost_found.storage_set", "lost_found.verification_set", "lost_found.verification_view", "lost_found_claim.create", "lost_found_item.report",
    "lost_found_items.private_update", "open_data_budget_lines.import", "open_data_funds.import", "redirect.create", "redirect.delete", "redirect.update",
    "staff_account.create", "staff_invite.accept", "staff_invite.create", "staff_invite.revoke", "staff_invite.supersede", "staff_member.suspend", "staff_member.update",
    "staff_membership.add", "staff_recovery.issue", "staff_recovery.supersede", "staff_recovery.use", "staff_role.grant", "staff_role.revoke",
  ];

  it("has a written sentence in both languages for every action the console records", () => {
    for (const action of ACTIONS) {
      for (const locale of ["en", "th"] as const) {
        const described = describeAction({ action, entityType: action.split(".")[0]! }, locale, { actor: "Ann", entity: "REF-1" });
        expect(described.known, action).toBe(true);
        expect(described.text, action).not.toContain(action);
        expect(described.text, action).not.toMatch(/\{\w+\}/);
      }
    }
  });

  it("describes every content verb for a content table", () => {
    for (const verb of ["create", "update", "publish", "unpublish", "delete", "restore", "duplicate", "scheduled_live", "scheduled_down", "slug_redirect"]) {
      const described = describeAction({ action: `news_posts.${verb}`, entityType: "news_posts" }, "en", { actor: "Ann", entity: "" });
      expect(described.known, verb).toBe(true);
      expect(described.text).not.toContain("_");
    }
  });
});

describe("dashboard counts", () => {
  it("counts a person's open cases by service, excluding restricted complaints they cannot see", async () => {
    await t.db.update(schema.cases).set({ assignedTo: t.handler.userId }).where(eq(schema.cases.id, ordinary.caseId));
    await t.db.update(schema.cases).set({ assignedTo: t.handler.userId }).where(eq(schema.cases.id, restricted.caseId));
    const mine = await loadMyCases(t.db, t.handler.userId, roles("officer"));
    expect(mine.find((m) => m.service === "complaint")!.open).toBe(1);
    expect(mine.map((m) => m.service)).toEqual(expect.arrayContaining(["lost_found", "complaint", "borrowing"]));
    expect(await loadMyCases(t.db, t.handler.userId, roles("editor"))).toEqual([]);
  });

  it("lists only the person's own unpublished drafts", async () => {
    const [alert] = await t.db
      .insert(schema.serviceAlerts)
      .values({ titleTh: "ก", titleEn: "Draft alert", bodyTh: "ก", bodyEn: "x", severity: "info", startsAt: NOW, status: "draft", updatedBy: t.admin.userId } as never)
      .returning({ id: schema.serviceAlerts.id });
    const mine = await loadMyDrafts(t.db, t.admin.userId);
    expect(mine.map((d) => d.id)).toContain(alert!.id);
    expect(await loadMyDrafts(t.db, t.handler.userId)).toEqual([]);
  });
});
