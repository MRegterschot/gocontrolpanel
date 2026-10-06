import { manialinkColor } from "@/lib/plugins/manialink-color";
import {
  layoutManialink,
  plainManialinkText,
  updateElementAppearance,
} from "@/lib/plugins/manialink-preview";
import type { ManialinkPageSnapshot, PluginAppearance } from "@gcp/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  snapshot: vi.fn(),
  auth: vi.fn(),
  allowed: true,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/actions", () => ({
  doServerActionWithAuth: async (
    roles: string[],
    action: () => Promise<unknown>,
  ) => {
    mocks.auth(roles);
    if (!mocks.allowed) return { error: "Unauthorized" };
    try {
      return { data: await action() };
    } catch (error) {
      return { error: (error as Error).message };
    }
  },
}));
vi.mock("@/lib/dbclient", () => ({
  getClient: () => ({ serverPlugins: { findFirst: mocks.find } }),
}));
vi.mock("@/lib/gbx-service", () => ({
  gbxService: { pluginManialinks: mocks.snapshot },
}));

import { getPluginManialinks } from "@/services/plugin-manialinks";

const page: ManialinkPageSnapshot = {
  id: "plg.hello.board",
  page: "board",
  visible: true,
  truncated: false,
  elements: [
    {
      path: "0.0",
      parentPath: null,
      tag: "frame",
      attributes: { id: "widget", pos: "10 20", scale: "2" },
    },
    {
      path: "0.0.0",
      parentPath: "0.0",
      tag: "label",
      attributes: { id: "title", text: "$o$f00Hi$$", pos: "1 -1" },
    },
    { path: "0.0.1", parentPath: "0.0", tag: "label", attributes: {} },
    { path: "0.0.2", parentPath: "0.0", tag: "label", attributes: {} },
  ],
};
const broad: PluginAppearance["rules"][number] = {
  page: "",
  element: "label",
  id: "",
  className: "",
  attributes: { textsize: "3" },
};

describe("visual appearance editing", () => {
  it("targets unique IDs by ID and anonymous elements by path", () => {
    const byId = updateElementAppearance(
      { rules: [] },
      page,
      page.elements[1],
      "textcolor",
      "F00",
    );
    expect(byId.rules).toEqual([
      {
        page: "board",
        element: "label",
        id: "title",
        className: "",
        attributes: { textcolor: "F00" },
      },
    ]);
    const byPath = updateElementAppearance(
      { rules: [] },
      page,
      page.elements[2],
      "textsize",
      "4",
    );
    expect(byPath.rules[0]).toMatchObject({ id: "", path: "0.0.1" });
  });

  it("moves edited targets after broad rules and drops them when emptied", () => {
    let appearance = updateElementAppearance(
      { rules: [] },
      page,
      page.elements[2],
      "textsize",
      "4",
    );
    appearance = { rules: [...appearance.rules, broad] };
    appearance = updateElementAppearance(
      appearance,
      page,
      page.elements[2],
      "textcolor",
      "0F0",
    );
    expect(appearance.rules).toHaveLength(2);
    expect(appearance.rules[0]).toEqual(broad);
    expect(appearance.rules[1].attributes).toEqual({
      textsize: "4",
      textcolor: "0F0",
    });
    for (const name of ["textsize", "textcolor"])
      appearance = updateElementAppearance(
        appearance,
        page,
        page.elements[2],
        name,
        undefined,
      );
    expect(appearance.rules).toEqual([broad]);
  });

  it("lays out children in their parent's coordinate space with overrides", () => {
    const nodes = layoutManialink(page, { rules: [broad] });
    const title = nodes.find((n) => n.element.path === "0.0.0")!;
    // Parent scale 2 at (10, 20), Manialink Y up becomes SVG Y down
    expect(title.matrix.slice(4)).toEqual([12, -18]);
    expect(title.attributes.textsize).toBe("3");
    expect(title.text).toBe("Hi$");
  });

  it("places label text inside its box according to valign", () => {
    const label = (valign?: string): ManialinkPageSnapshot => ({
      ...page,
      elements: [
        {
          path: "0.0",
          parentPath: null,
          tag: "label",
          attributes: { text: "Hi", size: "20 10", ...(valign && { valign }) },
        },
      ],
    });
    const place = (valign?: string) => {
      const [node] = layoutManialink(label(valign), { rules: [] });
      return [node.y, node.textY, node.textBaseline];
    };
    expect(place()).toEqual([0, 0, "hanging"]);
    expect(place("center")).toEqual([-5, 0, "central"]);
    expect(place("center2")).toEqual([-5, 0, "central"]);
    expect(place("bottom")).toEqual([-10, 0, "text-after-edge"]);
  });

  it("normalizes Manialink colors and strips formatting", () => {
    expect(manialinkColor("F80")).toBe("#FF8800");
    expect(manialinkColor("222C")).toBe("#222222CC");
    expect(manialinkColor("nope", "#000")).toBe("#000");
    expect(plainManialinkText("$l[https://x]Link$l $<$i$>")).toBe("Link ");
  });
});

describe("plugin Manialink snapshots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.allowed = true;
    mocks.find.mockResolvedValue({ pluginId: "p1" });
    mocks.snapshot.mockResolvedValue({
      running: true,
      pages: [],
      truncated: false,
      capturedAt: "",
    });
  });

  it("requires server admin access and an installation on that server", async () => {
    const result = await getPluginManialinks("s1", "p1");
    expect(result.error).toBeUndefined();
    expect(mocks.auth).toHaveBeenCalledWith([
      "servers:s1:admin",
      "group:servers:s1:admin",
    ]);
    expect(mocks.find.mock.calls[0][0].where).toMatchObject({
      serverId: "s1",
      pluginId: "p1",
    });
    expect(mocks.snapshot).toHaveBeenCalledWith("s1", "p1");
  });

  it("does not reach the GBX service for unauthorized or foreign plugins", async () => {
    mocks.allowed = false;
    expect((await getPluginManialinks("s1", "p1")).error).toBeTruthy();
    mocks.allowed = true;
    mocks.find.mockResolvedValue(null);
    expect((await getPluginManialinks("s1", "p2")).error).toMatch(
      /not installed/,
    );
    expect(mocks.snapshot).not.toHaveBeenCalled();
  });
});
