/**
 * The result of a server action.
 *
 * Deliberately a discriminated union rather than `{ data: T; error?: string }`:
 * on the failure path there is no data, and typing `data` as always-present made
 * the compiler wave through call sites that read it before checking `error`.
 *
 * The discriminant is `ok`, not `error`, because TypeScript can only narrow on a
 * property with a unit type. `error: string` is not one, so `if (error) return`
 * does not narrow `data` — including when the response has been destructured,
 * which is how nearly every call site reads it. `ok: true | false` does.
 *
 *     const { ok, data, error } = await getServers();
 *     if (!ok) return handle(error);
 *     data.forEach(...);          // narrowed to T
 */
export type ServerResponse<T = void> =
  | { ok: true; data: T; error?: undefined; code?: undefined }
  | { ok: false; data?: undefined; error: string; code: string };

export interface PaginationResponse<T> {
  data: T[];
  totalCount: number;
}

export class ServerError extends Error {
  constructor(message: string, name: string = "ServerError") {
    super(message);
    this.name = name;
  }
}
