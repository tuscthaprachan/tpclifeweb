import { describe, expect, it, vi } from "vitest";
import { decryptPii, encryptPii, isPiiAvailable, isPiiCiphertext, needsReencryption, PiiUnavailableError, reencryptPii } from "@/lib/crypto/pii";
import { KEY_A, KEY_B } from "./helpers";

const env = { NODE_ENV: "production", PII_ENCRYPTION_KEY: KEY_A };

describe("PII encryption", () => {
  it("round trips and never contains the plaintext", () => {
    const sealed = encryptPii("somchai@example.org", "aad", env);
    expect(isPiiCiphertext(sealed)).toBe(true);
    expect(sealed).not.toContain("somchai");
    expect(decryptPii(sealed, "aad", env)).toBe("somchai@example.org");
  });

  it("uses a fresh nonce each time", () => {
    expect(encryptPii("x", "aad", env)).not.toBe(encryptPii("x", "aad", env));
  });

  it("round trips Thai text", () => {
    expect(decryptPii(encryptPii("สมชาย ใจดี", "a", env), "a", env)).toBe("สมชาย ใจดี");
  });

  it("refuses a different AAD (a value moved to another row)", () => {
    const sealed = encryptPii("secret", "case_contacts:email:1", env);
    expect(() => decryptPii(sealed, "case_contacts:email:2", env)).toThrow(PiiUnavailableError);
  });

  it("detects tampering", () => {
    const sealed = encryptPii("secret", "a", env);
    const parts = sealed.split(".");
    parts[3] = Buffer.from("tampered!!").toString("base64url");
    expect(() => decryptPii(parts.join("."), "a", env)).toThrow(/integrity|damaged|corrupt/i);
  });

  it("rotates: previous keys decrypt, reencryption moves to the current key", () => {
    const old = encryptPii("secret", "a", { NODE_ENV: "production", PII_ENCRYPTION_KEY: KEY_A });
    const rotated = { NODE_ENV: "production", PII_ENCRYPTION_KEY: KEY_B, PII_ENCRYPTION_KEY_PREVIOUS: KEY_A };
    expect(decryptPii(old, "a", rotated)).toBe("secret");
    expect(needsReencryption(old, rotated)).toBe(true);
    const fresh = reencryptPii(old, "a", rotated);
    expect(needsReencryption(fresh, rotated)).toBe(false);
    expect(decryptPii(fresh, "a", { NODE_ENV: "production", PII_ENCRYPTION_KEY: KEY_B })).toBe("secret");
  });

  it("cannot decrypt once the old key is dropped", () => {
    const old = encryptPii("secret", "a", { NODE_ENV: "production", PII_ENCRYPTION_KEY: KEY_A });
    expect(() => decryptPii(old, "a", { NODE_ENV: "production", PII_ENCRYPTION_KEY: KEY_B })).toThrow(/No configured key/);
  });

  it("refuses to encrypt or decrypt in production without a key", () => {
    const none = { NODE_ENV: "production" };
    expect(() => encryptPii("x", "a", none)).toThrow(PiiUnavailableError);
    expect(isPiiAvailable(none)).toBe(false);
    const sealed = encryptPii("x", "a", env);
    expect(() => decryptPii(sealed, "a", none)).toThrow(PiiUnavailableError);
  });

  it("refuses a malformed key in production and in development", () => {
    expect(() => encryptPii("x", "a", { NODE_ENV: "production", PII_ENCRYPTION_KEY: "short" })).toThrow(/32 bytes/);
    expect(isPiiAvailable({ NODE_ENV: "development", PII_ENCRYPTION_KEY: "short" })).toBe(false);
  });

  it("uses a deterministic development key outside production and warns once", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const dev = { NODE_ENV: "development" };
    const sealed = encryptPii("x", "a", dev);
    expect(decryptPii(sealed, "a", dev)).toBe("x");
    encryptPii("y", "a", dev);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(isPiiAvailable({ NODE_ENV: "test" })).toBe(true);
    warn.mockRestore();
  });
});
