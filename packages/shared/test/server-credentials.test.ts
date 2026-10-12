import { describe, expect, it } from "vitest";
import {
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
    const last = encrypted.at(-3) === "A" ? "B" : "A";
    expect(() =>
      decryptServerCredential(
        encrypted.slice(0, -3) + last + encrypted.slice(-2),
        key,
      ),
    ).toThrow();
  });
  it("does not encrypt with absent or short keys", () => {
    expect(() => encryptServerCredential("secret", "")).toThrow("SECRETS_KEY");
  });
});
