import { scalarBundle } from "@/lib/public-api/scalar-bundle";
import {
  ApiReference,
  type ApiReferenceConfiguration,
} from "@scalar/nextjs-api-reference";

// Interactive reference for /api/v1. Requests from "Test request" go straight to this
// origin; no Scalar proxy, telemetry, agent or remote fonts.
export const GET = ApiReference(
  async (): Promise<Partial<ApiReferenceConfiguration>> => ({
    url: "/api/v1/openapi.json",
    cdn: `/api/v1/docs/scalar.js?v=${(await scalarBundle()).version}`,
    pageTitle: "TMControlPanel API",
    theme: "default",
    telemetry: false,
    withDefaultFonts: false,
    persistAuth: false,
    agent: { disabled: true },
    mcp: { disabled: true },
    showDeveloperTools: "never",
    authentication: { preferredSecurityScheme: "apiKey" },
  }),
);
