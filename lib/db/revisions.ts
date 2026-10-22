/**
 * Revision history helper. Call inside the transaction that saves an edit,
 * passing a snapshot of the entity (row plus any child rows) as it now stands.
 * Numbers are allocated per entity, race-safe via the unique constraint on
 * (entity_type, entity_id, revision_number) inside one statement.
 */

import { sql } from "drizzle-orm";
import type { AuditExecutor } from "./audit";
import { contentRevisions } from "./schema/content/revisions";

export async function recordRevision(
  tx: AuditExecutor,
  entry: { entityType: string; entityId: string; revision: unknown; createdBy?: string | null },
): Promise<number> {
  const rows = await tx
    .insert(contentRevisions)
    .values({
      entityType: entry.entityType,
      entityId: entry.entityId,
      revisionNumber: sql`(select coalesce(max(revision_number), 0) + 1 from content_revisions where entity_type = ${entry.entityType} and entity_id = ${entry.entityId})`,
      revision: entry.revision,
      createdBy: entry.createdBy ?? null,
    })
    .returning({ revisionNumber: contentRevisions.revisionNumber });
  return rows[0]!.revisionNumber;
}
