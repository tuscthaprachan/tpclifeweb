"use client";

/**
 * Browser-side Better Auth client. Used only for the WebAuthn calls (creating
 * and using a passkey), which must run in the browser; everything else goes
 * through Server Actions so it works without JavaScript.
 */

import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({ plugins: [passkeyClient()] });
