import { describe, expect, it } from "vitest";
import {
  SERVER_CREDENTIAL_PREFIX,
  decryptServerCredential,
  encryptServerCredential,
} from "../src/crypto/server-credentials";
const key = "test-only-server-credential-key-0123456789";
describe("server credential encryption", () => {
  it("round trips credentials with a fresh nonce for every write", () => {
    const a = encryptServerCredential("SuperAdmin password", key);
    const b = encryptServerCredential("SuperAdmin password", key);
    expect(a).not.toContain("SuperAdmin password");
    expect(a).not.toBe(b);
    expect(decryptServerCredential(a, key)).toBe("SuperAdmin password");
  });
  it("fails closed on plaintext, incorrect keys and modified ciphertext", () => {
    expect(() => decryptServerCredential("legacy-secret", key)).toThrow(
      "migration",
    );
    const encrypted = encryptServerCredential("secret", key);
    expect(() =>
      decryptServerCredential(encrypted, "different-key-0123456789-0123456789"),
    ).toThrow();
    // Flip a ciphertext byte; editing a base64 char is flaky when it matches the original
    const bytes = Buffer.from(
      encrypted.slice(SERVER_CREDENTIAL_PREFIX.length),
      "base64",
    );
    bytes[bytes.length - 1] ^= 1;
    expect(() =>
      decryptServerCredential(
        SERVER_CREDENTIAL_PREFIX + bytes.toString("base64"),
        key,
      ),
    ).toThrow();
  });
  it("does not encrypt with absent or short keys", () => {
    expect(() => encryptServerCredential("secret", "")).toThrow("SECRETS_KEY");
  });
});
