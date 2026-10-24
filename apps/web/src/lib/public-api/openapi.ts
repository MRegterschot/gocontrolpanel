import {
  API_KEY_SCOPE_DESCRIPTIONS,
  API_KEY_SCOPES,
  API_KEY_TOKEN_PREFIX,
} from "@gcp/shared";
import {
  ApiErrorSchema,
  publicApiEndpoints,
  type ApiEndpoint,
} from "@gcp/shared/public-api";
import {
  createDocument,
  type ZodOpenApiOperationObject,
  type ZodOpenApiPathsObject,
  type ZodOpenApiResponsesObject,
} from "zod-openapi";

const error = (description: string) => ({
  description,
  content: { "application/json": { schema: ApiErrorSchema } },
});

function responses(endpoint: ApiEndpoint): ZodOpenApiResponsesObject {
  const result: ZodOpenApiResponsesObject = {
    [String(endpoint.status)]: endpoint.response
      ? {
          description: "Success",
          content: { "application/json": { schema: endpoint.response } },
        }
      : { description: "Success, no content" },
  };
  if (endpoint.params || endpoint.query || endpoint.body) {
    result["400"] = error("Invalid request");
  }
  result["401"] = error("Missing, unknown, revoked or expired API key");
  result["403"] = error("The key lacks the scope, or cannot reach this server");
  if (endpoint.params) result["404"] = error("Not found");
  result["429"] = error("Rate limited; see the Retry-After header");
  return result;
}

function operation(endpoint: ApiEndpoint): ZodOpenApiOperationObject {
  const scope = endpoint.scope
    ? `Requires the \`${endpoint.scope}\` scope.`
    : "Any valid key.";
  return {
    operationId: endpoint.id,
    tags: [endpoint.tag],
    summary: endpoint.summary,
    description: [endpoint.description, scope].filter(Boolean).join("\n\n"),
    "x-required-scope": endpoint.scope ?? undefined,
    // zod-openapi rejects keys that are present but undefined
    requestParams: {
      ...(endpoint.params && { path: endpoint.params }),
      ...(endpoint.query && { query: endpoint.query }),
    },
    requestBody: endpoint.body
      ? {
          // A body whose fields all have defaults may be left out
          required: !endpoint.body.safeParse({}).success,
          content: { "application/json": { schema: endpoint.body } },
        }
      : undefined,
    responses: responses(endpoint),
  };
}

// The OpenAPI document for /api/v1, generated from the shared contract
export function buildOpenApiDocument(serverUrl = "/api/v1") {
  const paths: ZodOpenApiPathsObject = {};
  for (const endpoint of publicApiEndpoints) {
    paths[endpoint.path] = {
      ...paths[endpoint.path],
      [endpoint.method]: operation(endpoint),
    };
  }

  const scopes = API_KEY_SCOPES.map(
    (scope) => `- \`${scope}\`: ${API_KEY_SCOPE_DESCRIPTIONS[scope]}`,
  ).join("\n");

  return createDocument({
    openapi: "3.1.0",
    info: {
      title: "GoControlPanel API",
      version: "1.0.0",
      description: [
        "Server and group admins create API keys in the panel. A server key reaches one server; a group key reaches every server currently in its group.",
        `Send the key as \`Authorization: Bearer ${API_KEY_TOKEN_PREFIX}…\`.`,
        `Scopes:\n\n${scopes}`,
      ].join("\n\n"),
    },
    servers: [{ url: serverUrl }],
    security: [{ apiKey: [] }],
    components: {
      securitySchemes: {
        apiKey: {
          type: "http",
          scheme: "bearer",
          description: "An API key created in the panel",
        },
      },
    },
    paths,
  });
}
