import { ServerError } from "@/types/responses";

// Empty IDs collide with the explicit any-resource permission selectors (servers::admin).
export function assertResourceId(id: unknown): asserts id is string {
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
    throw new ServerError("Invalid resource ID", "ValidationError");
  }
}
