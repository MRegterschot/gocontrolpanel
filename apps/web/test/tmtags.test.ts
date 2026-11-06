import { escapeHtml, parseTmTags, safeLinkUrl } from "@/lib/tmtags";
import { describe, expect, it } from "vitest";

describe("parseTmTags", () => {
  it("escapes raw HTML in text", () => {
    expect(parseTmTags("<img src=x onerror=alert(1)>")).toBe(
      "&lt;img src=x onerror=alert(1)&gt;",
    );
    expect(parseTmTags("$f00<script>x</script>")).toBe(
      "<span style='color: #f00'>&lt;script&gt;x&lt;/script&gt;</span>",
    );
  });

  it("drops non-http links", () => {
    for (const url of [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "data:text/html,<b>x</b>",
      "vbscript:x",
    ]) {
      const html = parseTmTags(`$l[${url}]click$l`);
      expect(html).not.toContain("<a");
      expect(html.toLowerCase()).not.toContain("javascript:");
    }
  });

  it("keeps attribute values inside their quotes", () => {
    const html = parseTmTags(`$l[https://x.test/' onmouseover='alert(1)]x`);
    expect(html).not.toMatch(/'\s*onmouseover=/);
    expect(html).toContain("&#39;%20onmouseover=&#39;alert(1)");
  });

  it("formats normal names like before", () => {
    expect(parseTmTags("$o$f80Hello")).toBe(
      "<span style='font-weight: bold'><span style='color: #f80'>Hello</span></span>",
    );
    expect(parseTmTags("$l[trackmania.exchange]TMX")).toBe(
      "<a href='https://trackmania.exchange/' target='_blank' rel='noopener noreferrer'>TMX</a>",
    );
    expect(parseTmTags(undefined)).toBe("");
  });
});

describe("helpers", () => {
  it("escapes all HTML metacharacters", () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;",
    );
  });

  it("accepts only http(s) URLs", () => {
    expect(safeLinkUrl("http://a.test/x?y=1&z=2")).toBe(
      "http://a.test/x?y=1&amp;z=2",
    );
    expect(safeLinkUrl("ftp://a.test")).toBeNull();
    expect(safeLinkUrl("javascript:alert(1)")).toBeNull();
  });
});
