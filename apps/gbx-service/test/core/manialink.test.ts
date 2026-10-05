import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ActionRouter } from "../../src/core/manialink/action-router";
import { ActionGroup } from "../../src/core/manialink/components/action-group";
import { Manialink } from "../../src/core/manialink/components/manialink";
import { Window } from "../../src/core/manialink/components/window";
import { ManialinkService } from "../../src/core/manialink/manialink-service";
import { TemplateRenderer } from "../../src/core/manialink/template-renderer";
import { loadTemplateSources } from "../../src/infra/templates";
import { flush } from "../fakes/clock";
import { FakeGbxSession } from "../fakes/fake-gbx";
import { testRenderer } from "../fakes/harness";
import { silentLogger } from "../fakes/logger";


const TEMPLATES_DIR = fileURLToPath(
  new URL("../../templates", import.meta.url),
);

function setup() {
  const gbx = new FakeGbxSession();
  const manialinks = new ManialinkService(gbx, silentLogger);
  const actions = new ActionRouter(silentLogger);
  const renderer = new TemplateRenderer({
    widget: '<manialink id="{{id}}"/>',
    "widget-update": '<manialink id="{{id}}">{{{data.mapJson}}}</manialink>',
    window: '<manialink id="{{id}}"/>',
    ...loadTemplateSources(TEMPLATES_DIR),
  });
  return { gbx, manialinks, actions, deps: { renderer, manialinks, actions } };
}

describe("TemplateRenderer", () => {
  it("renders layouts, partials and helpers", () => {
    const renderer = new TemplateRenderer({
      base: '<root id="{{id}}">{{#block "body"}}{{/block}}</root>',
      part: "<p>{{ add 1 2 }}</p>",
      page: '{{#extend "base"}}{{#content "body"}}{{> part}}{{bool flag}}{{/content}}{{/extend}}',
    });
    expect(renderer.render("page", { id: "x", flag: true })).toBe(
      '<root id="x"><p>3</p>True</root>',
    );
  });

  it("throws on unknown templates", () => {
    expect(() => new TemplateRenderer({}).render("nope", {})).toThrow(
      /Unknown manialink template/,
    );
  });

  // Snapshots guard the output of every shipped template against accidental changes
  it.each(testRenderer().names())("renders %s", (name) => {
    const xml = testRenderer().render(name, {
      id: "test-id",
      position: { x: 1, y: 2 },
      size: { x: 50, y: 40 },
      title: "Title",
      hideWhileDriving: true,
      data: {
        actions: [{ name: "a", icon: "x", action: "act", type: "image" }],
        positionsAvailable: [1, 2],
        currentAction: { action: "pick", nickName: "Nick" },
      },
    });
    expect(xml).toMatchSnapshot();
  });
});

describe("ManialinkService", () => {
  it("hides then shows a public page and remembers it", () => {
    const { gbx, manialinks } = setup();
    manialinks.display("w", '<manialink id="w">x</manialink>');

    expect(gbx.sent.map((s) => s.method)).toEqual([
      "SendDisplayManialinkPage",
      "SendDisplayManialinkPage",
    ]);
    expect(manialinks.displayedIds()).toEqual(["w"]);
  });

  it("re-displays public and personal pages to a reconnecting player", async () => {
    const { gbx, manialinks } = setup();
    manialinks.display("public", '<manialink id="public"/>');
    manialinks.display("mine", '<manialink id="mine"/>', "abc");
    manialinks.display("theirs", '<manialink id="theirs"/>', "other");

    await manialinks.onPlayerConnect("abc");
    const calls = gbx.multicalls.at(-1)!;
    expect(calls.map((c) => c[2])).toEqual([
      '<manialink id="public"/>',
      '<manialink id="mine"/>',
    ]);
  });

  it("forgets personal pages of disconnected players", () => {
    const { manialinks } = setup();
    manialinks.display("mine", "<x/>", "abc");
    manialinks.onPlayerDisconnect("abc");
    expect(manialinks.displayedIds("abc")).toEqual([]);
  });

  it("resendAll actually sends every page", async () => {
    const { gbx, manialinks } = setup();
    manialinks.display("a", "<a/>");
    manialinks.display("b", "<b/>", "abc");
    await manialinks.resendAll();
    expect(gbx.multicalls.at(-1)).toHaveLength(2);
  });

  it("destroy removes the page from the remembered set", () => {
    const { manialinks } = setup();
    manialinks.display("a", "<a/>");
    manialinks.destroy("a");
    expect(manialinks.displayedIds()).toEqual([]);
  });
});

describe("components", () => {
  it("pairs a widget with its update page", () => {
    const { gbx, deps } = setup();
    const widget = new Manialink(deps, {
      id: "map-info-widget",
      template: "widget",
    });
    widget.setData({ mapJson: JSON.stringify({ name: "A", author: "B" }) });
    widget.display();

    expect(gbx.sentManialinkIds()).toEqual([
      "map-info-widget",
      "map-info-widget",
      "map-info-widget-update",
      "map-info-widget-update",
    ]);

    gbx.sent.length = 0;
    widget.update();
    expect(gbx.sentManialinkIds().at(-1)).toBe("map-info-widget-update");
    expect(String(gbx.sent.at(-1)!.params[0])).toContain('"name":"A"');
  });

  it("closes only the window of the player that clicked close", async () => {
    const { deps, actions } = setup();
    const closed: string[] = [];
    const make = (login: string) =>
      new Window(deps, {
        id: "ecm-window",
        template: "window",
        login,
        title: "ECM",
        onClose: () => closed.push(login),
      });
    make("a");
    make("b");

    await actions.dispatch({
      PlayerUid: 1,
      Login: "a",
      Answer: "close-window-ecm-window",
      Entries: [],
    });
    await flush();
    expect(closed).toEqual(["a"]);
  });

  it("action group hides itself when the last action is removed", () => {
    const { deps, manialinks } = setup();
    const group = new ActionGroup(deps);
    group.add({ name: "ecm", icon: "x" });
    expect(manialinks.displayedIds()).toEqual(["action-group-widget"]);

    group.remove("ecm");
    expect(group.list()).toEqual([]);
    expect(manialinks.displayedIds()).toEqual([]);
  });
});
