/**
 * Evidence uploaded during the journey, before the complaint exists. Each file
 * is validated by its bytes (lib/storage/validate), stored privately under an
 * unguessable key, and listed in `complaint_journey_files` with its name
 * encrypted. When the complaint is submitted the files become its evidence
 * (../create.ts); if the journey is abandoned they are deleted with it
 * (./store.ts `sweepExpiredJourneys`). If file storage is not configured the
 * journey says so and the step is skipped: evidence is always optional.
 */

import { asc, eq, and } from "drizzle-orm";
import { decryptOptionalPii, encryptOptionalPii, type PiiEnv } from "@/lib/crypto/pii";
import type { AuditExecutor } from "@/lib/db/audit";
import { complaintJourneyFiles } from "@/lib/db/schema/complaints";
import { newObjectKey, StorageError, validateUpload, type Storage } from "@/lib/storage";
import { journeyFileNameAad } from "../aad";
import { MAX_EVIDENCE_BYTES, MAX_EVIDENCE_FILES } from "../constants";

export type EvidenceFailure = "empty" | "too_large" | "unsupported_type" | "type_mismatch" | "too_many" | "not_configured" | "failed";

export type AddEvidenceResult = { ok: true; id: string } | { ok: false; reason: EvidenceFailure };

/** True when file storage is set up, so the step can offer an upload. */
export function isEvidenceStorageAvailable(storage: () => Storage): boolean {
  try {
    storage();
    return true;
  } catch {
    return false;
  }
}

/** A file name safe to keep and show: no path, no control characters, at most 100 characters. */
export function cleanFileName(name: string | undefined | null): string | null {
  const base = (name ?? "").split(/[\\/]/).pop() ?? "";
  const clean = base.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  return clean ? [...clean].slice(0, 100).join("") : null;
}

export async function addJourneyFile(
  db: AuditExecutor,
  journeyId: string,
  file: { bytes: Uint8Array; declaredType?: string; name?: string },
  opts: { storage: () => Storage; now?: Date; env?: PiiEnv },
): Promise<AddEvidenceResult> {
  const now = opts.now ?? new Date();
  if (file.bytes.length > MAX_EVIDENCE_BYTES) return { ok: false, reason: "too_large" };
  const check = validateUpload(file.bytes, "evidence", file.declaredType);
  if (!check.ok) return { ok: false, reason: check.code };

  const existing = await db.select({ id: complaintJourneyFiles.id }).from(complaintJourneyFiles).where(eq(complaintJourneyFiles.journeyId, journeyId));
  if (existing.length >= MAX_EVIDENCE_FILES) return { ok: false, reason: "too_many" };

  let storage: Storage;
  try {
    storage = opts.storage();
  } catch {
    return { ok: false, reason: "not_configured" };
  }
  const key = newObjectKey("cp/evidence", check.extension);
  try {
    await storage.put(key, file.bytes, { visibility: "private", contentType: check.contentType, maxBytes: MAX_EVIDENCE_BYTES });
  } catch (error) {
    if (error instanceof StorageError && error.code === "too_large") return { ok: false, reason: "too_large" };
    console.error("[complaints] evidence upload failed", error instanceof Error ? error.message : error);
    return { ok: false, reason: "failed" };
  }
  const id = crypto.randomUUID();
  try {
    await db.insert(complaintJourneyFiles).values({
      id,
      journeyId,
      storageKey: key,
      contentType: check.contentType,
      size: check.size,
      nameEnc: encryptOptionalPii(cleanFileName(file.name), journeyFileNameAad(id), opts.env),
      createdAt: now,
    });
  } catch (error) {
    await storage.delete(key).catch(() => undefined);
    throw error;
  }
  return { ok: true, id };
}

export interface JourneyFileView {
  id: string;
  name: string | null;
  contentType: string;
  size: number;
}

export async function listJourneyFiles(db: AuditExecutor, journeyId: string, opts: { env?: PiiEnv } = {}): Promise<JourneyFileView[]> {
  const rows = await db.select().from(complaintJourneyFiles).where(eq(complaintJourneyFiles.journeyId, journeyId)).orderBy(asc(complaintJourneyFiles.createdAt));
  return rows.map((r) => ({ id: r.id, name: decryptOptionalPii(r.nameEnc, journeyFileNameAad(r.id), opts.env), contentType: r.contentType, size: r.size }));
}

/** Removes one file from the journey and from storage. Returns whether it existed. */
export async function removeJourneyFile(db: AuditExecutor, journeyId: string, fileId: string, storage: () => Storage): Promise<boolean> {
  const [row] = await db
    .select()
    .from(complaintJourneyFiles)
    .where(and(eq(complaintJourneyFiles.id, fileId), eq(complaintJourneyFiles.journeyId, journeyId)));
  if (!row) return false;
  try {
    await storage().delete(row.storageKey);
  } catch (error) {
    console.error("[complaints] could not delete an evidence file", error instanceof Error ? error.message : error);
    return false;
  }
  await db.delete(complaintJourneyFiles).where(eq(complaintJourneyFiles.id, fileId));
  return true;
}
