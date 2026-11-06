import { sessionClaimsSchema } from "@tmcontrolpanel/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  scripts: [] as string[],
  mapFiles: [] as string[],
  files: {} as Record<string, string>,
  write: vi.fn(),
  plugins: vi.fn(),
  saveConfig: vi.fn(),
  runCommand: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/sentry/report", () => ({ reportException: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  getLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));
vi.mock("@/actions/filemanager/server-only/files", () => ({
  listModeScriptsAs: async () => mocks.scripts,
  listMapFilesAs: async () => mocks.mapFiles,
  readFileTextAs: async (_a: unknown, _s: string, path: string) =>
    mocks.files[path] ?? "",
  writeFileTextAs: mocks.write,
}));
vi.mock("@/lib/gbx-service", () => ({
  getGbxClient: () => ({ call: async () => [] }),
  gbxService: { runPluginCommand: mocks.runCommand },
}));
vi.mock("@/lib/dbclient", () => ({
  getClient: () => ({ serverPlugins: { findMany: mocks.plugins } }),
}));
vi.mock("@/services/plugins", () => ({
  storedManifest: (raw: unknown) => raw,
}));
vi.mock("@/actions/server-only/plugins", () => ({
  setServerPluginEnabledAs: vi.fn(),
  saveServerPluginConfigAs: mocks.saveConfig,
  reloadServerPluginsAs: vi.fn(),
}));

import { parseFastPath } from "@/lib/codriver/fast-path";
import {
  coerceSetting,
  parseScriptSettings,
  resolveSettingsIn,
} from "@/lib/codriver/modes";
import { splitSteps } from "@/lib/codriver/steps";
import { runPluginCommand, setMatchConfig } from "@/lib/codriver/tools/match";
import { generateScriptTool, targetPath } from "@/lib/codriver/tools/scripts";
import type { ToolContext } from "@/lib/codriver/types";
import { generateScript } from "@/lib/scripts";

const serverId = "server-a";
const ctx: ToolContext = {
  serverId,
  role: "admin",
  actor: {
    userId: "u1",
    login: "admin-login",
    displayName: "Admin",
    claims: sessionClaimsSchema.parse({
      id: "u1",
      admin: false,
      servers: [{ id: serverId, name: "A", role: "Admin" }],
    }),
  },
};

const reverseCup = `#Extends "Modes/Nadeo/Trackmania/Base/TrackmaniaRoundsBase.Script.txt"
#Setting S_WarmUpNb 0 as _("Number of warm up")
#Setting S_WarmUpDuration 20 as _("Duration of one warm up")
#Setting S_ComplexPointsRepartition "" as "JSON of PointsRepartition depending for the number of the Players Alive" // Example
#Setting S_PointsRepartition "1,2,3,4,5"
#Setting S_DisableLastChance False as _("When a player reach 0 points he is automatically eliminated")
#Setting S_DNF_LossPoints 20 as _("Number of points for player that give up a round")
#Setting S_Ratio 0.5`;

const userPrompt = `Create a reverse cup mode script with the following settings: warmup 1, warmup duration 30s, complex points repartition: { "2": [4, 8], "3": [2,6,10], "4": [0, 4, 10] }, DNF penalty of 12. Save the script in a BNL folder. Then create a timeattack script with 100 warmups of 4 hours and save the script in the BNL folder. Then download the BNL campaign maps from the benelux club. Then update the match plugin settings to use the reverse cup mode script and the BNL maps with pickban set to player and with steps: 1,2,3,4,random which are all picks. And for lobby choose a random BNL map and set the script to the timeattack script. Then enable the match plugin and set the server to the lobby state.`;

describe("stepped requests", () => {
  it("splits a request at each then into steps", () => {
    const steps = splitSteps(userPrompt);
    expect(steps).toHaveLength(5);
    expect(steps[0]).toMatch(
      /^Create a reverse cup .*Save the script in a BNL folder\.$/,
    );
    expect(steps[1]).toMatch(/^create a timeattack script/);
    expect(steps[2]).toBe(
      "download the BNL campaign maps from the benelux club.",
    );
    expect(steps[3]).toMatch(/^update the match plugin .*timeattack script\.$/);
    expect(steps[4]).toBe(
      "enable the match plugin and set the server to the lobby state.",
    );
    expect(steps.every((step) => step.length <= 300)).toBe(true);
  });

  it("keeps then inside a sentence and single requests whole", () => {
    expect(splitSteps("if it rains then skip the map")).toHaveLength(1);
    expect(splitSteps("skip the map")).toEqual(["skip the map"]);
    expect(splitSteps("skip, and then restart")).toEqual(["skip", "restart"]);
  });

  it("doesn't treat a toggle with more parts as a fast command", () => {
    expect(
      parseFastPath(
        "enable the match plugin and set the server to the lobby state",
      ),
    ).toBeNull();
    expect(parseFastPath("enable live round")).toEqual({
      tool: "set_plugin_enabled",
      input: { plugin: "live round", enabled: true },
    });
  });
});

describe("custom script settings", () => {
  const settings = parseScriptSettings(reverseCup);

  it("reads the #Setting lines of a script with their types", () => {
    expect(settings.map((s) => [s.name, s.type, s.default])).toEqual([
      ["S_WarmUpNb", "int", "0"],
      ["S_WarmUpDuration", "int", "20"],
      ["S_ComplexPointsRepartition", "string", ""],
      ["S_PointsRepartition", "string", "1,2,3,4,5"],
      ["S_DisableLastChance", "boolean", "False"],
      ["S_DNF_LossPoints", "int", "20"],
      ["S_Ratio", "float", "0.5"],
    ]);
  });

  it("resolves the settings players name and normalizes their values", () => {
    expect(
      resolveSettingsIn(settings, "Reverse Cup", [
        { name: "warmup", value: 1 },
        { name: "warmup duration", value: "30s" },
        {
          name: "complex points repartition",
          value: '{ "2": [4, 8], "3": [2,6,10], "4": [0, 4, 10] }',
        },
        { name: "DNF penalty", value: 12 },
      ]),
    ).toEqual({
      S_WarmUpNb: 1,
      S_WarmUpDuration: 30,
      S_ComplexPointsRepartition: '{"2":[4,8],"3":[2,6,10],"4":[0,4,10]}',
      S_DNF_LossPoints: 12,
    });
  });

  it("reads any DNF penalty wording as S_DNF_LossPoints", () => {
    const withMode = [
      ...settings,
      {
        name: "S_LastChance_DNF_Mode",
        description: "",
        type: "int" as const,
        default: "0",
      },
    ];
    for (const name of [
      "DNF penalty",
      "dnf",
      "S_DNFPenalty",
      "points lost on DNF",
      "S_DNF_LossPoints",
    ])
      expect(
        resolveSettingsIn(withMode, "Reverse Cup", [{ name, value: 12 }]),
      ).toEqual({ S_DNF_LossPoints: 12 });
    expect(
      resolveSettingsIn(withMode, "Reverse Cup", [
        { name: "last chance DNF mode", value: 1 },
      ]),
    ).toEqual({ S_LastChance_DNF_Mode: 1 });
  });

  it("converts durations and rejects invalid repartitions", () => {
    const duration = settings[1];
    expect(coerceSetting(duration, "4 hours")).toBe(14400);
    expect(coerceSetting(duration, "2m")).toBe(120);
    expect(() => coerceSetting(settings[0], "4 hours")).toThrow();
    expect(() => coerceSetting(settings[2], "[1, 2]")).toThrow(/JSON/);
  });

  it("writes values with double quotes in triple quotes", () => {
    expect(
      generateScript("TM_ReverseCupTMCP.Script.txt", {
        S_ComplexPointsRepartition: { value: '{"2":[4,8]}', type: "string" },
        S_PointsRepartition: { value: "1,2", type: "string" },
      }),
    ).toBe(
      '#Extends "Modes/TM_ReverseCupTMCP.Script.txt"\n\n#Setting S_ComplexPointsRepartition """{"2":[4,8]}"""\n#Setting S_PointsRepartition "1,2"\n',
    );
  });
});

describe("generate_script", () => {
  beforeEach(() => {
    mocks.write.mockReset();
    mocks.scripts = [
      "TM_ReverseCupTMCP.Script.txt",
      "TM_ReverseCupTMCP_League.Script.txt",
      "Benelux/TM_ReverseCupTMCP_Finals.Script.txt",
      "TM_Cup.Script.txt",
    ];
    mocks.files = {
      "Scripts/Modes/TM_ReverseCupTMCP.Script.txt": reverseCup,
    };
  });

  it("names a script after its mode and folder", () => {
    expect(
      targetPath(
        "Trackmania/TM_TimeAttack_Online.Script.txt",
        undefined,
        "BNL",
      ),
    ).toBe("BNL/TM_TimeAttack_BNL.Script.txt");
    expect(
      targetPath("TM_ReverseCupTMCP.Script.txt", undefined, undefined),
    ).toBe("TM_ReverseCupTMCP_Custom.Script.txt");
    expect(targetPath("x.Script.txt", "My Cup", "../a/b")).toBe(
      "a/b/My Cup.Script.txt",
    );
  });

  it("extends a custom script found by name and saves it in the folder", async () => {
    const input = await generateScriptTool.prepare!(ctx, {
      mode: "reverse cup",
      folder: "BNL",
      settings: [
        { name: "warmup", value: 1 },
        { name: "DNF penalty", value: 12 },
      ],
    });
    expect(input).toMatchObject({
      mode: "TM_ReverseCupTMCP.Script.txt",
      name: "TM_ReverseCupTMCP_BNL.Script.txt",
      folder: "BNL",
    });
    expect(await generateScriptTool.confirm!(ctx, input)).toBeNull();
    const result = await generateScriptTool.run(ctx, input);
    expect(mocks.write).toHaveBeenCalledWith(
      ctx.actor,
      serverId,
      "Scripts/Modes/BNL/TM_ReverseCupTMCP_BNL.Script.txt",
      '#Extends "Modes/TM_ReverseCupTMCP.Script.txt"\n\n#Setting S_WarmUpNb 1\n#Setting S_DNF_LossPoints 12\n',
    );
    expect(result.reply).toBe(
      "Created BNL/TM_ReverseCupTMCP_BNL.Script.txt from TM_ReverseCupTMCP.Script.txt with S_WarmUpNb 1, S_DNF_LossPoints 12.",
    );
  });

  it("prefers TM_ReverseCupTMCP over the default reverse cup script", async () => {
    mocks.scripts.push(
      "TM_ReverseCup.Script.txt",
      "TM2020-Gamemodes/TM_ReverseCup.Script.txt",
    );
    for (const mode of ["reverse cup", "ReverseCup", "the reverse cup mode"])
      expect(
        await generateScriptTool.prepare!(ctx, { mode, folder: "BNL" }),
      ).toMatchObject({ mode: "TM_ReverseCupTMCP.Script.txt" });
    // A script asked for by name still wins
    expect(
      await generateScriptTool.prepare!(ctx, {
        mode: "TM_ReverseCup.Script.txt",
      }),
    ).toMatchObject({ mode: "TM_ReverseCup.Script.txt" });
  });

  it("generates from a Nadeo mode with long warm ups", async () => {
    const input = await generateScriptTool.prepare!(ctx, {
      mode: "timeattack",
      folder: "BNL",
      settings: [
        { name: "warmups", value: 100 },
        { name: "warmup duration", value: "4 hours" },
      ],
    });
    await generateScriptTool.run(ctx, input);
    expect(mocks.write).toHaveBeenCalledWith(
      ctx.actor,
      serverId,
      "Scripts/Modes/BNL/TM_TimeAttack_BNL.Script.txt",
      '#Extends "Modes/Trackmania/TM_TimeAttack_Online.Script.txt"\n\n#Setting S_WarmUpNb 100\n#Setting S_WarmUpDuration 14400\n',
    );
  });

  it("asks before overwriting and warns about names the panel can't detect", async () => {
    mocks.scripts.push("BNL/TM_Cup_BNL.Script.txt");
    const input = await generateScriptTool.prepare!(ctx, {
      mode: "cup",
      folder: "BNL",
    });
    expect(await generateScriptTool.confirm!(ctx, input)).toBe(
      "BNL/TM_Cup_BNL.Script.txt already exists. Overwrite it?",
    );
    const renamed = await generateScriptTool.prepare!(ctx, {
      mode: "cup",
      name: "Finals",
    });
    expect((await generateScriptTool.run(ctx, renamed)).reply).toContain(
      "treat it as rounds",
    );
  });
});

describe("match tools", () => {
  const manifest = {
    commands: ["matchstart", "lobby"],
    configSchema: {
      type: "object",
      properties: {
        script: { type: "string" },
        maps: { type: "array", items: { type: "string" } },
        admins: { type: "array", items: { type: "string" } },
        pickAndBan: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["player", "team"] },
            order: { type: "string" },
          },
        },
        lobby: {
          type: "object",
          properties: { script: { type: "string" }, map: { type: "string" } },
        },
      },
    },
  };
  const row = (enabled: boolean) => ({
    pluginId: "p-match",
    enabled,
    config: { admins: ["admin-login"], pickAndBan: { type: "team" } },
    plugin: { name: "match", displayName: "Match" },
    version: { manifest },
  });

  beforeEach(() => {
    mocks.saveConfig.mockReset();
    mocks.runCommand.mockReset();
    mocks.plugins.mockResolvedValue([row(true)]);
    mocks.scripts = [
      "TM_ReverseCupTMCP.Script.txt",
      "BNL/TM_ReverseCupTMCP_BNL.Script.txt",
      "BNL/TM_TimeAttack_BNL.Script.txt",
    ];
    mocks.mapFiles = [
      "Downloaded/BNL Season 3/BNL 01.Map.Gbx",
      "Downloaded/BNL Season 3/BNL 02.Map.Gbx",
      "Downloaded/BNL Season 3/BNL 03.Map.Gbx",
      "Downloaded/BNL Season 3/BNL 04.Map.Gbx",
      "Downloaded/BNL Season 3/BNL 05.Map.Gbx",
      "Downloaded/Summer 2025/Summer 01.Map.Gbx",
    ];
  });

  it("sets scripts, maps, the pick and ban order and a random lobby map", async () => {
    const input = await setMatchConfig.prepare!(ctx, {
      script: "BNL/TM_ReverseCupTMCP_BNL.Script.txt",
      maps: "the BNL maps",
      pick_ban_type: "player",
      order: [
        { action: "pick", seed: 1 },
        { action: "pick", seed: 2 },
        { action: "pick", seed: 3 },
        { action: "pick", seed: 4 },
        { action: "random" },
      ],
      lobby_script: "BNL/TM_TimeAttack_BNL.Script.txt",
      lobby_map: "random",
    });
    const lobbyMap = (input as { lobby_map: string }).lobby_map;
    expect(lobbyMap).toMatch(/^Downloaded\/BNL Season 3\/BNL 0\d\.Map\.Gbx$/);
    expect(await setMatchConfig.confirm!(ctx, input)).toContain(
      "5 maps from BNL Season 3, player pick and ban (pick 1, pick 2, pick 3, pick 4, random)",
    );
    await setMatchConfig.run(ctx, input);
    const saved = mocks.saveConfig.mock.calls[0][3];
    expect(saved).toEqual({
      admins: ["admin-login"],
      script: "BNL/TM_ReverseCupTMCP_BNL.Script.txt",
      maps: mocks.mapFiles.slice(0, 5),
      pickAndBan: { type: "player", order: "p:1,p:2,p:3,p:4,r" },
      lobby: {
        script: "BNL/TM_TimeAttack_BNL.Script.txt",
        map: lobbyMap,
      },
    });
  });

  it("asks which script a mode name means when generated ones exist", async () => {
    await expect(
      setMatchConfig.prepare!(ctx, { lobby_script: "the timeattack script" }),
    ).rejects.toThrow(
      "Which script: Trackmania/TM_TimeAttack_Online.Script.txt, BNL/TM_TimeAttack_BNL.Script.txt?",
    );
    mocks.scripts = [];
    const input = await setMatchConfig.prepare!(ctx, { lobby_script: "TA" });
    expect(input).toMatchObject({
      lobby_script: "Trackmania/TM_TimeAttack_Online.Script.txt",
    });
  });

  it("refuses an order longer than the map pool", async () => {
    await expect(
      setMatchConfig.prepare!(ctx, {
        maps: "summer",
        order: [{ action: "pick", seed: 1 }, { action: "random" }],
      }),
    ).rejects.toThrow("The order has 2 steps but the match has 1 maps.");
  });

  it("runs a plugin command, waiting for a freshly enabled plugin to load", async () => {
    vi.useFakeTimers();
    try {
      const input = await runPluginCommand.prepare!(ctx, {
        plugin: "match",
        command: "lobby state",
      });
      expect(input).toMatchObject({ plugin: "id:p-match", command: "lobby" });
      mocks.runCommand
        .mockResolvedValueOnce({ handled: false })
        .mockResolvedValueOnce({ handled: true });
      const result = runPluginCommand.run(ctx, input);
      await vi.advanceTimersByTimeAsync(500);
      expect((await result).reply).toBe("Ran /lobby of Match.");
      expect(mocks.runCommand).toHaveBeenLastCalledWith(serverId, {
        pluginId: "p-match",
        command: "lobby",
        args: [],
        login: "admin-login",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("refuses commands of a plugin that is off or doesn't have them", async () => {
    await expect(
      runPluginCommand.prepare!(ctx, { plugin: "match", command: "explode" }),
    ).rejects.toThrow("It has: /matchstart, /lobby.");
    mocks.plugins.mockResolvedValue([row(false)]);
    await expect(
      runPluginCommand.run(ctx, { plugin: "match", command: "lobby" }),
    ).rejects.toThrow("Match is off. Enable it first.");
  });
});
