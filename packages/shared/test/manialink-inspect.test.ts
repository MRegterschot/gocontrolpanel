import { describe, expect, it } from "vitest";
import type { PluginAppearance } from "../src/plugins/appearance";
import {
  applyManialinkAppearance,
  inspectManialink,
} from "../src/plugins/manialink";

const xml = `<manialink id="plg.hello.board" version="3">
<frame id="widget" pos="10 20">
  <quad size="40 10" bgcolor="222C" action="secret" url="https://example.com"/>
  <label text="Hello" textsize="2"/>
  <label text="World"/>
</frame>
<framemodel id="row"><label text="model"/></framemodel>
<script><!-- <label text="script"/> --></script>
<entry name="nick" default="private"/>
</manialink>`;

const rule = (
  target: Partial<PluginAppearance["rules"][number]>,
  attributes: PluginAppearance["rules"][number]["attributes"],
): PluginAppearance["rules"][number] => ({
  page: "board",
  element: "label",
  id: "",
  className: "",
  attributes,
  ...target,
});

describe("Manialink inspection", () => {
  it("lists visual elements with presentation data only", () => {
    const { elements, truncated } = inspectManialink(xml);
    expect(truncated).toBe(false);
    expect(elements.map((e) => [e.tag, e.path, e.parentPath])).toEqual([
      ["frame", "0.0", null],
      ["quad", "0.0.0", "0.0"],
      ["label", "0.0.1", "0.0"],
      ["label", "0.0.2", "0.0"],
      ["entry", "0.2", null],
    ]);
    expect(elements[1].attributes).toEqual({ size: "40 10", bgcolor: "222C" });
    expect(elements[2].attributes).toEqual({ textsize: "2", text: "Hello" });
    // Entry values, names, actions and URLs never reach the browser
    expect(elements[4].attributes).toEqual({});
  });

  it("truncates at the element limit", () => {
    const { elements, truncated } = inspectManialink(xml, 2);
    expect(elements).toHaveLength(2);
    expect(truncated).toBe(true);
  });

  it("targets an inspected path on its own page when applying", () => {
    const second = inspectManialink(xml).elements[3];
    const rules = [rule({ path: second.path }, { textcolor: "F00" })];
    const styled = applyManialinkAppearance(xml, "board", { rules });
    expect(styled).toContain('<label text="World" textcolor="F00"/>');
    expect(styled).toContain('<label text="Hello" textsize="2"/>');
    expect(applyManialinkAppearance(xml, "other", { rules })).toBe(xml);
  });

  it("keeps paths stable after styling so later inspections still match", () => {
    const rules = [rule({ element: "frame", id: "widget" }, { scale: "2" })];
    const styled = applyManialinkAppearance(xml, "board", { rules });
    expect(inspectManialink(styled).elements.map((e) => e.path)).toEqual(
      inspectManialink(xml).elements.map((e) => e.path),
    );
  });
});
