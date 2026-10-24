/**
 * A software WebAuthn authenticator for server-level tests: it builds real
 * "none" attestations and ES256 assertions, so the passkey plugin's own
 * verification (@simplewebauthn/server) runs unmocked. Only what the plugin
 * checks is implemented: one resident credential per instance, no attestation
 * statement, a counter that goes up on every assertion.
 */

import { createHash, generateKeyPairSync, randomBytes, sign, type KeyObject } from "node:crypto";

const b64url = (bytes: Uint8Array | Buffer): string => Buffer.from(bytes).toString("base64url");
const sha256 = (data: Uint8Array | Buffer | string): Buffer => createHash("sha256").update(data).digest();

/** Just enough CBOR for an attestation object and a COSE key. */
function cbor(value: unknown): Buffer {
  const head = (major: number, n: number): Buffer => {
    if (n < 24) return Buffer.from([(major << 5) | n]);
    if (n < 256) return Buffer.from([(major << 5) | 24, n]);
    return Buffer.from([(major << 5) | 25, n >> 8, n & 255]);
  };
  if (typeof value === "number") return value >= 0 ? head(0, value) : head(1, -1 - value);
  if (typeof value === "string") return Buffer.concat([head(3, Buffer.byteLength(value)), Buffer.from(value)]);
  if (Buffer.isBuffer(value)) return Buffer.concat([head(2, value.length), value]);
  if (value instanceof Map) {
    return Buffer.concat([head(5, value.size), ...[...value].flatMap(([k, v]) => [cbor(k), cbor(v)])]);
  }
  throw new Error("Unsupported CBOR value");
}

export interface VirtualAuthenticatorOptions {
  /** Whether the "user verified" flag is set, as for a fingerprint or PIN. */
  userVerified?: boolean;
  aaguid?: Buffer;
}

interface RegistrationOptionsJSON {
  challenge: string;
  rp: { id?: string };
}
interface AuthenticationOptionsJSON {
  challenge: string;
  rpId?: string;
}

export class VirtualAuthenticator {
  readonly credentialId = randomBytes(32);
  private readonly privateKey: KeyObject;
  private readonly publicJwk: { x: string; y: string };
  private counter = 0;
  private readonly userVerified: boolean;
  private readonly aaguid: Buffer;

  constructor(
    private readonly origin: string,
    options: VirtualAuthenticatorOptions = {},
  ) {
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    this.privateKey = privateKey;
    this.publicJwk = publicKey.export({ format: "jwk" }) as { x: string; y: string };
    this.userVerified = options.userVerified ?? true;
    this.aaguid = options.aaguid ?? Buffer.alloc(16);
  }

  get id(): string {
    return b64url(this.credentialId);
  }

  private flags(attested: boolean): number {
    return 0x01 | (this.userVerified ? 0x04 : 0) | (attested ? 0x40 : 0);
  }

  private clientData(type: "webauthn.create" | "webauthn.get", challenge: string): Buffer {
    return Buffer.from(JSON.stringify({ type, challenge, origin: this.origin, crossOrigin: false }));
  }

  /** The browser's reply to `navigator.credentials.create` for these options. */
  register(options: RegistrationOptionsJSON) {
    const rpIdHash = sha256(options.rp.id ?? new URL(this.origin).hostname);
    const cose = cbor(
      new Map<number, unknown>([
        [1, 2],
        [3, -7],
        [-1, 1],
        [-2, Buffer.from(this.publicJwk.x, "base64url")],
        [-3, Buffer.from(this.publicJwk.y, "base64url")],
      ]),
    );
    const idLength = Buffer.alloc(2);
    idLength.writeUInt16BE(this.credentialId.length);
    const counter = Buffer.alloc(4);
    const authData = Buffer.concat([rpIdHash, Buffer.from([this.flags(true)]), counter, this.aaguid, idLength, this.credentialId, cose]);
    const attestationObject = cbor(new Map<string, unknown>([["fmt", "none"], ["attStmt", new Map()], ["authData", authData]]));
    return {
      id: this.id,
      rawId: this.id,
      type: "public-key" as const,
      response: {
        clientDataJSON: b64url(this.clientData("webauthn.create", options.challenge)),
        attestationObject: b64url(attestationObject),
        transports: ["internal"],
      },
      clientExtensionResults: {},
      authenticatorAttachment: "platform",
    };
  }

  /** The browser's reply to `navigator.credentials.get` for these options. */
  assert(options: AuthenticationOptionsJSON) {
    this.counter += 1;
    const counter = Buffer.alloc(4);
    counter.writeUInt32BE(this.counter);
    const authData = Buffer.concat([sha256(options.rpId ?? new URL(this.origin).hostname), Buffer.from([this.flags(false)]), counter]);
    const clientDataJSON = this.clientData("webauthn.get", options.challenge);
    const signature = sign("sha256", Buffer.concat([authData, sha256(clientDataJSON)]), this.privateKey);
    return {
      id: this.id,
      rawId: this.id,
      type: "public-key" as const,
      response: {
        clientDataJSON: b64url(clientDataJSON),
        authenticatorData: b64url(authData),
        signature: b64url(signature),
      },
      clientExtensionResults: {},
      authenticatorAttachment: "platform",
    };
  }
}
