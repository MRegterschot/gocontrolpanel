import type { z } from "zod/v4";
import type { ApiKeyScope } from "../api-keys";

export type ApiMethod = "get" | "post" | "put" | "patch" | "delete";

type ObjectSchema = z.ZodObject<z.ZodRawShape>;

// One operation of the public API. Paths use OpenAPI {param} syntax, relative to /api/v1.
export interface ApiEndpoint {
  id: string;
  method: ApiMethod;
  path: `/${string}`;
  // null: any valid key may call it
  scope: ApiKeyScope | null;
  tag: string;
  summary: string;
  description?: string;
  params?: ObjectSchema;
  query?: ObjectSchema;
  body?: z.ZodType;
  // Bodies are limited to 64 KB unless the endpoint allows more
  maxBodyBytes?: number;
  status: 200 | 201 | 204;
  // Absent only for 204 responses
  response?: z.ZodType;
}

// Keeps the literal types so route handlers can infer their input and output
export function defineEndpoint<const E extends ApiEndpoint>(endpoint: E): E {
  return endpoint;
}

type Infer<S> = S extends z.ZodType ? z.output<S> : undefined;

export type EndpointParams<E extends ApiEndpoint> = Infer<E["params"]>;
export type EndpointQuery<E extends ApiEndpoint> = Infer<E["query"]>;
export type EndpointBody<E extends ApiEndpoint> = Infer<E["body"]>;
// What a handler returns: the response before serialisation, so it is the schema's input
export type EndpointResult<E extends ApiEndpoint> =
  E["response"] extends z.ZodType ? z.input<E["response"]> : void;
