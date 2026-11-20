import { createHmac, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import {
  StorageError,
  assertValidKey,
  clampExpiry,
  type PutOptions,
  type PutResult,
  type Storage,
  type StoredObject,
  type Visibility,
} from "./types";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  gif: "image/gif",
  avif: "image/avif",
  pdf: "application/pdf",
  csv: "text/csv",
  json: "application/json",
  txt: "text/plain",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
};

export function contentTypeForKey(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

export const FILES_ROUTE = "/files";

function signature(secret: string, key: string, expires: number): string {
  return createHmac("sha256", secret).update(`${key}\n${expires}`).digest("base64url");
}

export class LocalDiskStorage implements Storage {
  private readonly root: string;

  private readonly secret: string;

  constructor(
    options: { root: string; signingSecret: string },
    private readonly now: () => number = Date.now,
  ) {
    this.root = path.resolve(options.root);
    this.secret = options.signingSecret;
  }

  private file(visibility: Visibility, key: string): string {
    assertValidKey(key);
    const full = path.join(this.root, visibility, ...key.split("/"));
    if (!full.startsWith(path.join(this.root, visibility) + path.sep)) {
      throw new StorageError("invalid_key", "Storage key is not valid.");
    }
    return full;
  }

  private async locate(key: string): Promise<{ file: string; visibility: Visibility; size: number } | null> {
    for (const visibility of ["private", "public"] as const) {
      const file = this.file(visibility, key);
      const info = await stat(file).catch(() => null);
      if (info?.isFile()) return { file, visibility, size: info.size };
    }
    return null;
  }

  async exists(key: string): Promise<boolean> {
    return (await this.locate(key)) !== null;
  }

  async put(key: string, body: Uint8Array, options: PutOptions): Promise<PutResult> {
    if (body.length > options.maxBytes) {
      throw new StorageError("too_large", "Object is larger than the allowed size.");
    }
    const target = this.file(options.visibility, key);
    if (await this.locate(key)) throw new StorageError("backend", "An object with this key already exists.");
    try {
      await mkdir(path.dirname(target), { recursive: true });
      const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
      await writeFile(temp, body, { flag: "wx" });
      await rename(temp, target);
    } catch (error) {
      throw new StorageError("backend", error instanceof Error ? error.message : "Upload failed.");
    }
    return {
      key,
      visibility: options.visibility,
      contentType: options.contentType,
      size: body.length,
      url: options.visibility === "public" ? this.publicUrl(key) : undefined,
    };
  }

  async get(key: string): Promise<StoredObject | null> {
    const found = await this.locate(key);
    if (!found) return null;
    return {
      body: Readable.toWeb(createReadStream(found.file)) as ReadableStream<Uint8Array>,
      contentType: contentTypeForKey(key),
      size: found.size,
    };
  }

  async read(key: string, visibility: Visibility): Promise<StoredObject | null> {
    const found = await this.locate(key);
    if (!found || found.visibility !== visibility) return null;
    return this.get(key);
  }

  async delete(key: string): Promise<void> {
    for (const visibility of ["private", "public"] as const) {
      await rm(this.file(visibility, key), { force: true });
    }
  }

  publicUrl(key: string): string {
    assertValidKey(key);
    return `${FILES_ROUTE}/${key}`;
  }

  async signedReadUrl(key: string, options?: { expiresInSeconds?: number }): Promise<string> {
    assertValidKey(key);
    const expires = Math.floor(this.now() / 1000) + clampExpiry(options?.expiresInSeconds);
    return `${FILES_ROUTE}/${key}?exp=${expires}&sig=${signature(this.secret, key, expires)}`;
  }

  isSignatureValid(key: string, exp: string | null, sig: string | null): boolean {
    if (!exp || !sig || !/^\d+$/.test(exp)) return false;
    const expires = Number(exp);
    if (expires < Math.floor(this.now() / 1000)) return false;
    const expected = Buffer.from(signature(this.secret, key, expires));
    const given = Buffer.from(sig);
    return expected.length === given.length && timingSafeEqual(expected, given);
  }
}
