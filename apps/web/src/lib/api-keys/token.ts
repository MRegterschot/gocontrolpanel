import { API_KEY_TOKEN_PREFIX } from "@tmcontrolpanel/shared";
import { createHash, randomBytes } from "node:crypto";
import "server-only";

const TOKEN_BYTES = 32;
// tmcp_ plus 32 bytes in base64url
const TOKEN_PATTERN = new RegExp(
  `^${API_KEY_TOKEN_PREFIX}[A-Za-z0-9_-]{${Math.ceil((TOKEN_BYTES * 4) / 3)}}$`,
);
// Enough to tell keys apart in the UI without weakening the rest of the token
const DISPLAY_PREFIX_LENGTH = API_KEY_TOKEN_PREFIX.length + 8;

export interface NewApiKeyToken {
  token: string;
  prefix: string;
  hash: string;
}

// The token has 256 bits of entropy, so a fast hash is enough to store it
export function hashApiKeyToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateApiKeyToken(): NewApiKeyToken {
  const token =
    API_KEY_TOKEN_PREFIX + randomBytes(TOKEN_BYTES).toString("base64url");
  return {
    token,
    prefix: token.slice(0, DISPLAY_PREFIX_LENGTH),
    hash: hashApiKeyToken(token),
  };
}

// The token from an Authorization header, or null when it is missing or not shaped like one
export function bearerApiKeyToken(header: string | null): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(header?.trim() ?? "");
  if (!match || !TOKEN_PATTERN.test(match[1])) return null;
  return match[1];
}
