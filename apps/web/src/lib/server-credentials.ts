import {
  decryptServerCredential,
  encryptServerCredential,
} from "@gcp/shared/server-credentials";
import "server-only";
import config from "./config";
export const encryptServerPassword = (value: string) =>
  encryptServerCredential(value, config.SECRETS_KEY);
export const decryptServerPassword = (value: string) =>
  decryptServerCredential(value, config.SECRETS_KEY);

export function requireServerCredentialsKey(): void {
  if (config.SECRETS_KEY.length < 32)
    throw new Error("SECRETS_KEY must contain at least 32 characters");
}
