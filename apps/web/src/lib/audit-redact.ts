import { createHash } from "node:crypto";

// What an audit entry records about an edited file: never its contents, which may hold secrets
export function fileAuditDetails(path: string, text: string) {
  return {
    path,
    bytes: Buffer.byteLength(text, "utf8"),
    sha256: createHash("sha256").update(text).digest("hex"),
  };
}

const SECRET_KEY = /pass(word)?|secret|token|api.?key/i;

// Copy with values under secret-looking keys replaced, at any depth
export function redactSecrets<T>(value: T): T {
  if (Array.isArray(value)) return value.map(redactSecrets) as T;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [
        key,
        SECRET_KEY.test(key) && inner !== "" && inner != null
          ? "[redacted]"
          : redactSecrets(inner),
      ]),
    ) as T;
  }
  return value;
}
