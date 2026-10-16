import { missedAreas } from "@/lib/codriver/completeness";
import { routeCategories } from "@/lib/codriver/router";
import { describe, expect, it } from "vitest";

const areas = (tool: string) =>
  ({ add_club_campaign: "maps", announce: "server" })[tool] as never;

const missed = (text: string, calls: { tool: string; input: unknown }[]) =>
  missedAreas(text, routeCategories(text), calls, areas);

describe("missedAreas", () => {
  const club = {
    tool: "add_club_campaign",
    input: { campaign: "red bull faster 2026", club: "red bull faster" },
  };

  it("ignores keywords inside names the plan used", () => {
    expect(
      missed("load the red bull faster 2026 campaign from red bull faster", [
        club,
      ]),
    ).toEqual([]);
  });

  it("still notices a part about players outside those names", () => {
    expect(
      missed("load red bull faster 2026 from red bull faster and kick bob", [
        club,
      ]),
    ).toEqual(["players"]);
  });

  it("does not hide words a player said inside a free-text argument", () => {
    expect(
      missed("announce kick bob please", [
        { tool: "announce", input: { message: "kick bob" } },
      ]),
    ).toEqual(["players"]);
  });
});
