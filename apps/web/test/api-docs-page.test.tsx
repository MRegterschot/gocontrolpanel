import ApiDocsPage from "@/app/(gocontroller)/api-docs/page";
import { API_KEY_SCOPES } from "@gcp/shared";
import { publicApiEndpoints } from "@gcp/shared/public-api";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

describe("API reference page", () => {
  it("renders every endpoint and scope from the contract", () => {
    const html = renderToStaticMarkup(ApiDocsPage());
    for (const endpoint of publicApiEndpoints) {
      expect(html).toContain(`/api/v1${endpoint.path}`);
      expect(html).toContain(`id="${endpoint.id}"`);
    }
    for (const scope of API_KEY_SCOPES) expect(html).toContain(scope);
    // Body fields with defaults are documented with them
    expect(html).toContain("reason");
    expect(html).toContain("Default &quot;&quot;.");
  });
});
