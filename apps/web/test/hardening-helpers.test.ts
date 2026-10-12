import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dbclient", () => ({ getClient: () => ({}) }));
vi.mock("@/lib/sentry/report", () => ({ reportException: vi.fn() }));

import { fileAuditDetails, redactSecrets } from "@/lib/audit-redact";
import { csvCell, csvRow } from "@/lib/csv";
import { fileManagerUrl } from "@/lib/managers/file-manager";

describe("csv", () => {
  it("quotes separators and neutralizes formulas", () => {
    expect(csvRow(["a,b", 'say "hi"', "line\nbreak", 42, -1])).toBe(
      '"a,b","say ""hi""","line\nbreak",42,-1',
    );
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell(null)).toBe("");
  });
});

describe("file manager URLs", () => {
  it("keeps requests on the file manager's origin", () => {
    expect(fileManagerUrl("http://fm.test:3300", "/UserData/Maps")).toBe(
      "http://fm.test:3300/UserData/Maps",
    );
    for (const path of [
      ".attacker.test/x",
      "0/x",
      "@attacker.test/x",
      "//attacker.test/x",
      "/UserData/../secret",
      "/UserData/%2e%2e/secret",
      "/a\\b",
    ]) {
      expect(() => fileManagerUrl("http://fm.test:3300", path)).toThrow();
    }
  });
});

describe("audit redaction", () => {
  it("records file metadata instead of contents", () => {
    const details = fileAuditDetails("/cfg.txt", "secret=1");
    expect(details).toMatchObject({ path: "/cfg.txt", bytes: 8 });
    expect(JSON.stringify(details)).not.toContain("secret=1");
  });

  it("redacts password-like keys at any depth", () => {
    expect(
      redactSecrets({
        defaultOptions: { Name: "x", Password: "p", RefereePassword: "" },
      }),
    ).toEqual({
      defaultOptions: {
        Name: "x",
        Password: "[redacted]",
        RefereePassword: "",
      },
    });
  });
});
