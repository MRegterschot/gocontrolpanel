import { ServerError } from "@/types/responses";

// Empty IDs collide with the explicit any-resource permission selectors (servers::admin).
export function assertResourceId(id: unknown): asserts id is string {
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
    throw new ServerError("Invalid resource ID", "ValidationError");
  }
}

// Numeric IDs end up in upstream URL paths, so reject anything that isn't a plain integer
export function assertNumericId(id: unknown): asserts id is number {
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) {
    throw new ServerError("Invalid resource ID", "ValidationError");
  }
}
