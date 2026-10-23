import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { auditLog, organisations, staffRoles } from "@/lib/db/schema";
import { recordAudit, withAudit } from "@/lib/db/audit";
import { getStaffRoles } from "@/lib/auth/roles";
import { createTestDb, makeUser } from "./harness";

let ctx: Awaited<ReturnType<typeof createTestDb>>;
beforeAll(async () => {
  ctx = await createTestDb();
}, 60_000);
afterAll(async () => {
  await ctx.client.close();
});

async function orgId(slug: string) {
  const [row] = await ctx.db.select().from(organisations).where(eq(organisations.slug, slug));
  return row!.id;
}

describe("migrations and seed", () => {
  it("applies cleanly and seeds TUSU and TUSC", async () => {
    const rows = await ctx.db.select().from(organisations);
    expect(rows.map((r) => r.slug).sort()).toEqual(["tusc", "tusu"]);
  });

  it("creates the Better Auth tables", async () => {
    const res = await ctx.client.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public'",
    );
    const names = res.rows.map((r) => r.table_name);
    for (const t of ["user", "session", "account", "verification", "two_factor", "passkey"]) {
      expect(names).toContain(t);
    }
  });
});

describe("audit_log is append-only", () => {
  it("accepts inserts but rejects update, delete and truncate", async () => {
    await recordAudit(ctx.db, { action: "test.create", entityType: "test", entityId: 1 });
    await expect(ctx.db.update(auditLog).set({ action: "tampered" })).rejects.toThrow();
    await expect(ctx.db.delete(auditLog)).rejects.toThrow();
    await expect(ctx.db.execute(sql`truncate audit_log`)).rejects.toThrow();
    const rows = await ctx.db.select().from(auditLog).where(eq(auditLog.action, "test.create"));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.entityId).toBe("1");
  });
});

describe("staff_roles uniqueness", () => {
  it("rejects a duplicate active grant but allows regrant after revocation and other organisations", async () => {
    const [tusu, tusc] = [await orgId("tusu"), await orgId("tusc")];
    const grantor = await makeUser(ctx.db, "Grantor");
    const u = await makeUser(ctx.db);
    const grant = (organisationId: number) =>
      ctx.db.insert(staffRoles).values({ userId: u, role: "editor", organisationId, grantedBy: grantor });

    await grant(tusu);
    await expect(grant(tusu)).rejects.toThrow();
    await grant(tusc);

    await ctx.db
      .update(staffRoles)
      .set({ revokedAt: new Date() })
      .where(eq(staffRoles.organisationId, tusu));
    await grant(tusu);

    const active = await getStaffRoles(u, ctx.db);
    expect(active).toHaveLength(2);
  });
});

describe("withAudit", () => {
  it("commits the write and its audit row together", async () => {
    const id = await withAudit(ctx.db, { actorUserId: "u1", requestId: "req-1" }, async (tx, audit) => {
      const [org] = await tx.insert(organisations).values({ slug: "x1", nameTh: "ก", nameEn: "X1" }).returning();
      await audit({ action: "org.create", entityType: "organisation", entityId: org!.id, after: org });
      return org!.id;
    });
    const [row] = await ctx.db.select().from(auditLog).where(eq(auditLog.action, "org.create"));
    expect(row).toMatchObject({ actorUserId: "u1", requestId: "req-1", entityId: String(id) });
  });

  it("rolls the write back when the audit row fails", async () => {
    await expect(
      withAudit(ctx.db, {}, async (tx, audit) => {
        await tx.insert(organisations).values({ slug: "x2", nameTh: "ข", nameEn: "X2" });
        // action is NOT NULL, so this insert fails and aborts the transaction.
        await audit({ action: null as unknown as string, entityType: "organisation", entityId: "x2" });
      }),
    ).rejects.toThrow();
    const rows = await ctx.db.select().from(organisations).where(eq(organisations.slug, "x2"));
    expect(rows).toHaveLength(0);
  });

  it("rolls the audit row back when the callback throws", async () => {
    await expect(
      withAudit(ctx.db, {}, async (_tx, audit) => {
        await audit({ action: "ghost.create", entityType: "ghost", entityId: "1" });
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    const rows = await ctx.db.select().from(auditLog).where(eq(auditLog.action, "ghost.create"));
    expect(rows).toHaveLength(0);
  });
});
