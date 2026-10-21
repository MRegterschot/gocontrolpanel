import { AsyncLocalStorage } from "node:async_hooks";
import "server-only";

// The API key a public API request runs under, so audit entries record it without every
// action having to pass it along
const storage = new AsyncLocalStorage<{ apiKeyId: string }>();

export function runWithApiKey<T>(apiKeyId: string, fn: () => T): T {
  return storage.run({ apiKeyId }, fn);
}

export function currentApiKeyId(): string | null {
  return storage.getStore()?.apiKeyId ?? null;
}
