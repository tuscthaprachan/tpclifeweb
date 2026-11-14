import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const MIGRATIONS = fileURLToPath(new URL("../../../lib/db/migrations", import.meta.url));
const LAST_OLD = "0015_open_data";

const scratch = mkdtempSync(path.join(tmpdir(), "staff-migration-"));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

function truncatedMigrations(): string {
  const dir = path.join(scratch, "before");
  cpSync(MIGRATIONS, dir, { recursive: true });
  const journalPath = path.join(dir, "meta", "_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as { entries: Array<{ tag: string }> };
  const keep = journal.entries.findIndex((e) => e.tag === LAST_OLD) + 1;
  journal.entries = journal.entries.slice(0, keep);
  writeFileSync(journalPath, JSON.stringify(journal));
  return dir;
}

describe("migration 0016: three roles and body memberships", () => {
  it("maps old roles, collapses duplicates, creates memberships and converts invites", async () => {
    const client = new PGlite({ extensions: { pg_trgm } });
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: truncatedMigrations() });

    await client.exec(`
      INSERT INTO organisations (slug, name_th, name_en) VALUES ('tusu', 'อมธ.', 'TUSU'), ('tusc', 'สภา', 'TUSC');
      INSERT INTO "user" (id, name, email) VALUES ('boss', 'Boss', 'boss@example.test'), ('multi', 'Multi', 'multi@example.test'), ('solo', 'Solo', 'solo@example.test'), ('gone', 'Gone', 'gone@example.test');
      INSERT INTO staff_roles (user_id, role, organisation_id, granted_by, granted_at, revoked_at) VALUES
        ('boss', 'admin', 1, 'boss', '2026-01-01', NULL),
        ('boss', 'editor', 1, 'boss', '2026-01-01', NULL),
        ('boss', 'editor', 2, 'boss', '2026-01-02', NULL),
        ('multi', 'lf_officer', 1, 'boss', '2026-01-03', NULL),
        ('multi', 'complaints_handler', 1, 'boss', '2026-01-03', NULL),
        ('multi', 'unit_lead', 2, 'boss', '2026-01-04', NULL),
        ('multi', 'equipment_officer', 1, 'boss', '2026-01-05', NULL),
        ('solo', 'unit_lead', 2, 'boss', '2026-01-06', NULL),
        ('gone', 'lf_officer', 1, 'boss', '2026-01-07', '2026-02-01');
      INSERT INTO staff_invites (email, organisation_id, roles, token_hash, expires_at) VALUES
        ('new@example.test', 2, '{lf_officer,unit_lead,editor}', 'hash-1', '2030-01-01'),
        ('admin@example.test', 1, '{admin}', 'hash-2', '2030-01-01');
    `);

    await migrate(db, { migrationsFolder: MIGRATIONS });

    const roles = (await client.query<{ user_id: string; role: string; revoked: boolean }>(
      `SELECT user_id, role::text AS role, (revoked_at IS NOT NULL) AS revoked FROM staff_roles ORDER BY user_id, role, id`,
    )).rows;
    const active = (id: string) => roles.filter((r) => r.user_id === id && !r.revoked).map((r) => r.role);
    expect(active("boss")).toEqual(["admin", "editor"]);
    expect(active("multi")).toEqual(["officer"]);
    expect(active("solo")).toEqual(["officer"]);
    expect(active("gone")).toEqual([]);
    expect(roles.filter((r) => r.user_id === "gone")).toEqual([{ user_id: "gone", role: "officer", revoked: true }]);
    expect(roles.filter((r) => r.user_id === "multi")).toHaveLength(4);

    const memberships = (await client.query<{ user_id: string; slug: string; added_by: string }>(
      `SELECT m.user_id, o.slug, m.added_by FROM staff_memberships m JOIN organisations o ON o.id = m.organisation_id ORDER BY m.user_id, o.slug`,
    )).rows;
    expect(memberships.map((m) => `${m.user_id}:${m.slug}`)).toEqual(["boss:tusc", "boss:tusu", "multi:tusc", "multi:tusu", "solo:tusc"]);
    expect(memberships.every((m) => m.added_by === "boss")).toBe(true);

    const invites = (await client.query<{ email: string; roles: string[]; organisation_ids: number[] }>(
      `SELECT email, roles::text[] AS roles, organisation_ids FROM staff_invites ORDER BY email`,
    )).rows;
    expect(invites).toEqual([
      { email: "admin@example.test", roles: ["admin"], organisation_ids: [1] },
      { email: "new@example.test", roles: ["editor", "officer"], organisation_ids: [2] },
    ]);

    const enumValues = (await client.query<{ v: string }>(`SELECT unnest(enum_range(NULL::staff_role))::text AS v`)).rows.map((r) => r.v);
    expect(enumValues).toEqual(["admin", "editor", "officer"]);

    await expect(
      client.exec(`INSERT INTO staff_roles (user_id, role, granted_by) VALUES ('boss', 'admin', 'boss')`),
    ).rejects.toThrow();
    const columns = (await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name IN ('staff_roles', 'staff_invites') AND column_name LIKE 'organisation%'`,
    )).rows.map((r) => r.column_name);
    expect(columns).toEqual(["organisation_ids"]);
    await client.close();
  });
});
