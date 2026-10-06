import type { PluginAppearance } from "@gcp/shared";
import { describe, expect, it } from "vitest";
import { applyManialinkAppearance } from "../../src/core/manialink/appearance";

const rule = (
  attributes: PluginAppearance["rules"][number]["attributes"],
  target: Partial<PluginAppearance["rules"][number]> = {},
): PluginAppearance["rules"][number] => ({
  page: "",
  element: "label",
  id: "",
  className: "",
  attributes,
  ...target,
});
const apply = (xml: string, rules: PluginAppearance["rules"], page = "board") =>
  applyManialinkAppearance(xml, page, { rules });

describe("Manialink appearance", () => {
  it("overrides matching attributes, preserving ids, actions, text and untouched tags", () => {
    const xml = `<manialink id="plg.hello.board"><label id='title' text="a > b" textsize='1' action="hello:go"/><quad size="10 10" /></manialink>`;
    expect(apply(xml, [rule({ textsize: "2", textfont: "GameFont" })])).toBe(
      `<manialink id="plg.hello.board"><label id='title' text="a > b" action="hello:go" textsize="2" textfont="GameFont"/><quad size="10 10" /></manialink>`,
    );
  });
  it("combines page, type, id and class matching; later rules win", () => {
    const xml = `<label id="title" class="heading bright"/><label id="other"/><quad id="title"/>`;
    const rules = [
      rule({ textsize: "2" }),
      rule(
        { textsize: "3", textcolor: "fff" },
        { page: "board", id: "title", className: "heading" },
      ),
    ];
    expect(apply(xml, rules)).toBe(
      `<label id="title" class="heading bright" textsize="3" textcolor="fff"/><label id="other" textsize="2"/><quad id="title"/>`,
    );
    expect(apply(xml, rules, "board-update")).toContain('textsize="3"');
    expect(apply(xml, rules, "other")).not.toContain('textsize="3"');
  });
  it("preserves scripts, CDATA and comments including XML-looking strings", () => {
    const protectedXml = `<!-- <label/> --><![CDATA[<label/>]]><script><!-- declare Text T = "<label/>"; --></script><script><![CDATA["<label/>";]]></script><SCRIPT>"<label/>"</SCRIPT>`;
    expect(apply(protectedXml + "<label/>", [rule({ textsize: "2" })])).toBe(
      protectedXml + '<label textsize="2"/>',
    );
  });
  it("escapes values and handles replacement metacharacters literally", () => {
    expect(apply("<label/>", [rule({ textfont: '$& "<>&' })])).toBe(
      '<label textfont="$&amp; &quot;&lt;&gt;&amp;"/>',
    );
  });
  it("matches escaped element identifiers and never edits the root", () => {
    expect(
      apply('<manialink id="x"><label id="a&amp;b"/></manialink>', [
        rule({ scale: "2" }, { element: "*", id: "a&b" }),
      ]),
    ).toBe('<manialink id="x"><label id="a&amp;b" scale="2"/></manialink>');
    expect(
      apply('<manialink id="x"></manialink>', [
        rule({ scale: "2" }, { element: "*" }),
      ]),
    ).toBe('<manialink id="x"></manialink>');
  });
  it("ignores attribute-looking text and handles self-closing script references", () => {
    const xml = `<script src="library"/><label text=' textsize="10" ' textsize="1"/><script>"<label/>"</script>`;
    expect(apply(xml, [rule({ textsize: "2" })])).toBe(
      `<script src="library"/><label text=' textsize="10" ' textsize="2"/><script>"<label/>"</script>`,
    );
  });

  it("leaves the original page byte-for-byte when reset or unmatched", () => {
    const xml = '<label textsize="1" />';
    expect(apply(xml, [])).toBe(xml);
    expect(apply(xml, [rule({ textsize: "2" }, { page: "other" })])).toBe(xml);
  });
});
