import net from "node:net";
import type { SimOptions } from "./sim.js";
import { MAP_COUNT, Simulation, fakeMap } from "./sim.js";
import { ServerStats } from "./stats.js";
import {
  CALLBACK_HANDLE,
  FrameParser,
  encodeFrame,
  encodeHandshake,
} from "./wire.js";
import {
  FAULT_UNKNOWN_METHOD,
  Fault,
  faultResponse,
  methodCall,
  methodResponse,
  parseMethodCall,
} from "./xml.js";

export interface FakeServerOptions extends SimOptions {
  port: number;
  host: string;
  password: string;
  user: string;
  stats: ServerStats;
  // Simulation tick; tests set 0 to drive the sim by hand
  tickMs?: number;
}

interface Conn {
  socket: net.Socket;
  authenticated: boolean;
  callbacks: boolean;
  scriptCallbacks: boolean;
}

type Handler = (conn: Conn, p: any[]) => unknown;

const RESPONSE_SCRIPTS: Record<string, string> = {
  "Trackmania.GetScores": "Trackmania.Scores",
  "Trackmania.WarmUp.GetStatus": "Trackmania.WarmUp.Status",
  "Maniaplanet.Pause.GetStatus": "Maniaplanet.Pause.Status",
  "Maniaplanet.Mode.GetUseTeams": "Maniaplanet.Mode.UseTeams",
};

const OPEN_METHODS = new Set([
  "Authenticate",
  "GetVersion",
  "system.listMethods",
]);

export class FakeServer {
  readonly sim: Simulation;
  readonly stats: ServerStats;
  private readonly conns = new Set<Conn>();
  private readonly server: net.Server;
  private timer?: NodeJS.Timeout;
  private readonly methods = new Map<string, Handler>();
  private options: Record<string, unknown>;
  private scriptSettings: Record<string, unknown> = {
    S_TimeLimit: 600,
    S_ForceLapsNb: -1,
    S_PointsLimit: 100,
    S_RoundsPerMap: 5,
    S_NbOfWinners: 1,
    S_MapsPerMatch: 3,
    S_PointsRepartition: "10,6,4,3,2,1",
    S_FinishTimeout: -1,
    S_WarmUpNb: 0,
    S_WarmUpDuration: 0,
  };
  private lists: Record<"guest" | "ban" | "black", Set<string>> = {
    guest: new Set(),
    ban: new Set(),
    black: new Set(),
  };
  private manualRouting = false;
  private mainLogin: string;

  constructor(private readonly opts: FakeServerOptions) {
    this.stats = opts.stats;
    this.mainLogin = `lt-server-${opts.index}`;
    this.options = {
      Name: `Load Test ${opts.index}`,
      Comment: "TMControlPanel load test server",
      Password: "",
      PasswordForSpectator: "",
      RefereePassword: "",
      MaxPlayers: Math.max(opts.players, 32),
      MaxSpectators: 32,
      IsP2PUpload: false,
      IsP2PDownload: false,
      NextMaxPlayers: Math.max(opts.players, 32),
      NextMaxSpectators: 32,
      CallVoteTimeOut: 60000,
      CallVoteRatio: 0.5,
      AllowMapDownload: true,
      AutoSaveReplays: false,
      RefereeMode: 0,
      HideServer: 0,
    };
    this.sim = new Simulation(opts, {
      callback: (name, params) => this.broadcast(name, params),
      script: (name, payload) => this.broadcastScript(name, payload),
    });
    this.registerMethods();
    this.server = net.createServer((socket) => this.onSocket(socket));
  }

  get port(): number {
    return (this.server.address() as net.AddressInfo).port;
  }

  async start(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(this.opts.port, this.opts.host, () => resolve());
    });
    const tickMs = this.opts.tickMs ?? 100;
    if (tickMs > 0) {
      let last = Date.now();
      this.timer = setInterval(() => {
        const now = Date.now();
        this.sim.tick(now - last);
        last = now;
      }, tickMs);
    }
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    for (const c of this.conns) c.socket.destroy();
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }

  private onSocket(socket: net.Socket): void {
    const conn: Conn = {
      socket,
      authenticated: false,
      callbacks: false,
      scriptCallbacks: false,
    };
    this.conns.add(conn);
    this.stats.controllers++;
    socket.setNoDelay(true);
    socket.write(encodeHandshake());
    const parser = new FrameParser();
    socket.on("data", (chunk) => {
      let frames;
      try {
        frames = parser.push(chunk);
      } catch {
        return socket.destroy();
      }
      for (const f of frames) void this.handleFrame(conn, f.handle, f.xml);
    });
    socket.on("error", () => undefined);
    socket.on("close", () => {
      if (this.conns.delete(conn)) this.stats.controllers--;
    });
  }

  private async handleFrame(
    conn: Conn,
    handle: number,
    xml: string,
  ): Promise<void> {
    let reply: string;
    try {
      const { method, params } = await parseMethodCall(xml);
      reply = this.dispatchTop(conn, method, params);
    } catch (e) {
      reply = faultResponse(-32700, `Parse error: ${(e as Error).message}`);
    }
    if (!conn.socket.destroyed) conn.socket.write(encodeFrame(handle, reply));
  }

  private dispatchTop(conn: Conn, method: string, params: unknown[]): string {
    if (method === "system.multicall") {
      const calls = ((params[0] as any[]) ?? []).map((c) => {
        try {
          return [this.invoke(conn, String(c.methodName), c.params ?? [])];
        } catch (e) {
          return toFaultStruct(e);
        }
      });
      this.stats.requests.inc(method);
      this.stats.totalRequests++;
      return methodResponse(calls);
    }
    try {
      return methodResponse(this.invoke(conn, method, params));
    } catch (e) {
      const f = toFaultStruct(e);
      return faultResponse(f.faultCode, f.faultString);
    }
  }

  private invoke(conn: Conn, method: string, params: unknown[]): unknown {
    this.stats.requests.inc(method);
    this.stats.totalRequests++;
    const handler = this.methods.get(method);
    if (!handler) {
      this.stats.unknown.inc(method);
      throw new Fault(FAULT_UNKNOWN_METHOD, "Unknown method");
    }
    if (!conn.authenticated && !OPEN_METHODS.has(method)) {
      throw new Fault(FAULT_UNKNOWN_METHOD, "Not authorized");
    }
    return handler(conn, params);
  }

  private send(conn: Conn, name: string, params: unknown[]): void {
    if (conn.socket.destroyed) return;
    this.stats.callbacks++;
    this.stats.totalCallbacks++;
    conn.socket.write(encodeFrame(CALLBACK_HANDLE, methodCall(name, params)));
  }

  // Callbacks only reach controllers that enabled them
  private broadcast(name: string, params: unknown[]): void {
    for (const c of this.conns)
      if (c.authenticated && c.callbacks) this.send(c, name, params);
  }

  private scriptParams(name: string, payload: object): unknown[] {
    return [name, [JSON.stringify(payload)]];
  }

  private broadcastScript(name: string, payload: object): void {
    const params = this.scriptParams(name, payload);
    for (const c of this.conns)
      if (c.authenticated && c.callbacks && c.scriptCallbacks)
        this.send(c, "ManiaPlanet.ModeScriptCallbackArray", params);
  }

  private scriptCall(conn: Conn, name: string, args: unknown[]): boolean {
    this.stats.requests.inc(`script:${name}`);
    const responseId = typeof args[0] === "string" ? args[0] : "";
    if (name === "XmlRpc.EnableCallbacks") {
      conn.scriptCallbacks = args[0] === "true";
      return true;
    }
    if (name === "Maniaplanet.Pause.SetActive") {
      this.sim.paused = args[0] === "true";
      setImmediate(() =>
        this.broadcastScript("Maniaplanet.Pause.Status", {
          responseid: "",
          available: true,
          active: this.sim.paused,
        }),
      );
      return true;
    }
    const reply = RESPONSE_SCRIPTS[name];
    if (reply && conn.callbacks && conn.scriptCallbacks) {
      // Answered after the call response, carrying the caller's responseid
      setImmediate(() => {
        let payload: object;
        if (name === "Trackmania.GetScores")
          payload = this.sim.scores("", responseId);
        else if (name === "Maniaplanet.Mode.GetUseTeams")
          payload = { responseid: responseId, useteams: false };
        else if (name === "Maniaplanet.Pause.GetStatus")
          payload = {
            responseid: responseId,
            available: true,
            active: this.sim.paused,
          };
        else
          payload = { responseid: responseId, available: true, active: false };
        this.send(
          conn,
          "ManiaPlanet.ModeScriptCallbackArray",
          this.scriptParams(reply, payload),
        );
      });
    }
    return true;
  }

  private playerInfo(login: string) {
    const p = this.sim.players.get(login);
    if (!p) throw new Fault(FAULT_UNKNOWN_METHOD, "Login unknown");
    return {
      ...p.info,
      Path: "World|Europe",
      Language: "en",
      ClubLink: "",
      IsInOfficialMode: false,
    };
  }

  private mapByFile(file: unknown) {
    const m = this.sim.maps.find((x) => x.FileName === file);
    if (!m) throw new Fault(-1000, "Map not found");
    return m;
  }

  private list(kind: "guest" | "ban" | "black", p: any[]) {
    const all = [...this.lists[kind]];
    const start = Number(p[1] ?? 0);
    return all
      .slice(start, start + Number(p[0] ?? 1000))
      .map((Login) => ({ Login }));
  }

  private registerMethods(): void {
    const m = this.methods;
    const stats = this.stats;
    const ok = () => true;
    const def = (name: string, h: Handler) => m.set(name, h);
    const sim = this.sim;

    def("system.listMethods", () => [...m.keys()]);
    def("Authenticate", (c, p) => {
      if (p[0] !== this.opts.user || p[1] !== this.opts.password)
        throw new Fault(-1000, "Wrong login/password");
      c.authenticated = true;
      return true;
    });
    def("SetApiVersion", ok);
    def("GetVersion", () => ({
      Name: "Trackmania",
      TitleId: "Trackmania",
      Version: "3.3.0",
      Build: "2024-07-18_15_22",
      ApiVersion: "2023-04-16",
    }));
    def("GetSystemInfo", () => ({
      PublishedIp: "127.0.0.1",
      Port: 2350,
      P2PPort: 3450,
      TitleId: "Trackmania",
      ServerLogin: this.mainLogin,
      ServerPlayerId: 0,
      ConnectionDownloadRate: 102400,
      ConnectionUploadRate: 102400,
      IsServer: true,
      IsDedicated: true,
    }));
    def("EnableCallbacks", (c, p) => ((c.callbacks = p[0] !== false), true));
    def(
      "ChatEnableManualRouting",
      (_c, p) => ((this.manualRouting = p[0] === true), true),
    );
    def("TriggerModeScriptEventArray", (c, p) =>
      this.scriptCall(c, String(p[0]), Array.isArray(p[1]) ? p[1] : []),
    );
    def("Echo", (_c, p) => {
      setImmediate(() =>
        this.broadcast("ManiaPlanet.Echo", [
          String(p[0] ?? ""),
          String(p[1] ?? ""),
        ]),
      );
      return true;
    });

    // Players
    def("GetPlayerList", (_c, p) => {
      const main = {
        Login: this.mainLogin,
        NickName: `Load Test ${this.opts.index}`,
        PlayerId: 0,
        TeamId: 0,
        SpectatorStatus: 0,
        LadderRanking: 0,
        Flags: 0,
      };
      const all = [main, ...sim.playerList()];
      const start = Number(p[1] ?? 0);
      return all.slice(start, start + Number(p[0] ?? 1000));
    });
    def("GetPlayerInfo", (_c, p) => this.playerInfo(String(p[0])));
    def("GetDetailedPlayerInfo", (_c, p) => this.playerInfo(String(p[0])));
    def("GetMainServerPlayerInfo", () => ({
      Login: this.mainLogin,
      NickName: `Load Test ${this.opts.index}`,
      PlayerId: 0,
    }));
    def("GetCurrentRanking", (_c, p) => {
      const rows = sim.scores("").players.map((s) => ({
        Login: s.login,
        NickName: s.name,
        PlayerId: sim.players.get(s.login)?.info.PlayerId ?? 0,
        Rank: s.rank,
        BestTime: s.bestracetime,
        Score: 0,
        NbrLapsFinished: 0,
        LadderScore: 0,
        BestCheckpoints: s.bestracecheckpoints,
      }));
      const start = Number(p[1] ?? 0);
      return rows.slice(start, start + Number(p[0] ?? 1000));
    });
    def(
      "Kick",
      (_c, p) =>
        sim.removePlayer(String(p[0]), String(p[1] ?? "")) ||
        fail("Login unknown"),
    );
    for (const name of [
      "ForceSpectator",
      "ConnectFakePlayer",
      "DisconnectFakePlayer",
    ])
      def(name, ok);

    // Maps
    def("GetCurrentMapInfo", () => sim.map);
    def("GetNextMapInfo", () => sim.maps[sim.nextMapIndex]);
    def("GetMapInfo", (_c, p) => this.mapByFile(p[0]));
    def("GetMapList", (_c, p) => {
      const start = Number(p[1] ?? 0);
      return sim.maps.slice(start, start + Number(p[0] ?? 1000));
    });
    def("GetCurrentMapIndex", () => sim.mapIndex);
    def("GetNextMapIndex", () => sim.nextMapIndex);
    def(
      "SetNextMapIndex",
      (_c, p) => ((sim.nextMapIndex = Number(p[0]) % sim.maps.length), true),
    );
    def("SetNextMapIdent", (_c, p) => {
      const i = sim.maps.findIndex((x) => x.UId === p[0]);
      if (i < 0) throw new Fault(-1000, "Map not found");
      sim.nextMapIndex = i;
      return true;
    });
    def(
      "ChooseNextMap",
      (_c, p) => (
        (sim.nextMapIndex = sim.maps.indexOf(this.mapByFile(p[0]))),
        true
      ),
    );
    def("JumpToMapIndex", (_c, p) => {
      const i = Number(p[0]);
      if (!(i >= 0 && i < sim.maps.length))
        throw new Fault(-1000, "Index out of range");
      sim.changeMap(i);
      return true;
    });
    def("RestartMap", () => (sim.changeMap(sim.mapIndex), true));
    def("NextMap", () => (sim.changeMap(sim.nextMapIndex), true));
    const addMap = (file: unknown) => {
      if (sim.maps.some((x) => x.FileName === file)) return false;
      sim.maps.push(fakeMap(sim.maps.length + MAP_COUNT, String(file)));
      return true;
    };
    const removeMap = (file: unknown) => {
      const i = sim.maps.findIndex((x) => x.FileName === file);
      if (i < 0 || sim.maps.length <= 1) return false;
      sim.maps.splice(i, 1);
      sim.mapIndex = Math.min(sim.mapIndex, sim.maps.length - 1);
      sim.nextMapIndex = Math.min(sim.nextMapIndex, sim.maps.length - 1);
      return true;
    };
    def("AddMap", (_c, p) => addMap(p[0]) || fail("Map already in the list"));
    def("RemoveMap", (_c, p) => removeMap(p[0]) || fail("Map not in the list"));
    def(
      "AddMapList",
      (_c, p) => ((p[0] as unknown[]) ?? []).filter(addMap).length,
    );
    def(
      "RemoveMapList",
      (_c, p) => ((p[0] as unknown[]) ?? []).filter(removeMap).length,
    );
    for (const name of [
      "LoadMatchSettings",
      "AppendPlaylistFromMatchSettings",
      "InsertPlaylistFromMatchSettings",
    ])
      def(name, () => sim.maps.length);
    def("SaveMatchSettings", ok);

    // Mode script
    def("GetScriptName", () => ({
      CurrentValue: sim.scriptName,
      NextValue: sim.nextScriptName,
    }));
    def(
      "SetScriptName",
      (_c, p) => ((sim.nextScriptName = String(p[0])), true),
    );
    def("GetModeScriptInfo", () => ({
      Name: sim.scriptName,
      CompatibleMapTypes: "TrackMania\\TM_Race",
      Description: "Load test mode",
      Version: "2024-01-01",
      ParamDescs: [],
      CommandDescs: [],
    }));
    def("GetModeScriptSettings", () => this.scriptSettings);
    def("SetModeScriptSettings", (_c, p) => {
      Object.assign(this.scriptSettings, (p[0] as object) ?? {});
      return true;
    });

    // Server options
    def("GetServerOptions", () => this.options);
    def(
      "SetServerOptions",
      (_c, p) => (Object.assign(this.options, (p[0] as object) ?? {}), true),
    );
    def("GetServerName", () => this.options.Name);
    def("SetServerName", (_c, p) => ((this.options.Name = String(p[0])), true));
    def("GetServerComment", () => this.options.Comment);
    def(
      "SetServerComment",
      (_c, p) => ((this.options.Comment = String(p[0])), true),
    );
    def("GetMaxPlayers", () => ({
      CurrentValue: this.options.MaxPlayers,
      NextValue: this.options.NextMaxPlayers,
    }));
    def(
      "SetMaxPlayers",
      (_c, p) => ((this.options.NextMaxPlayers = Number(p[0])), true),
    );
    def("GetMaxSpectators", () => ({
      CurrentValue: this.options.MaxSpectators,
      NextValue: this.options.NextMaxSpectators,
    }));
    def(
      "SetMaxSpectators",
      (_c, p) => ((this.options.NextMaxSpectators = Number(p[0])), true),
    );
    def("GetCallVoteTimeOut", () => ({
      CurrentValue: 60000,
      NextValue: 60000,
    }));
    def("GetCallVoteRatio", () => 0.5);
    def("GetCallVoteRatios", () => []);
    def("GetHideServer", () => 0);
    def("GetForceShowAllOpponents", () => ({ CurrentValue: 0, NextValue: 0 }));
    def("IsKeepingPlayerSlots", () => false);
    def("AreHornsDisabled", () => false);
    def("AreServiceAnnouncesDisabled", () => false);
    def("AreProfileSkinsDisabled", () => false);
    def("IsMapDownloadAllowed", () => true);
    def("GetChatLines", () => []);
    def("GetIgnoreList", () => []);
    for (const name of [
      "SetForceShowAllOpponents",
      "SetConnectionRates",
      "DisableProfileSkins",
      "AllowMapDownload",
      "SetHideServer",
      "SetCallVoteTimeOut",
      "SetCallVoteRatio",
      "SetServerPlugin",
    ])
      def(name, ok);

    // Guest / ban / black lists
    const listOps = (
      kind: "guest" | "ban" | "black",
      get: string,
      add: string,
      remove: string,
      clean: string,
      load: string,
      save: string,
    ) => {
      def(get, (_c, p) => this.list(kind, p));
      def(add, (_c, p) => (this.lists[kind].add(String(p[0])), true));
      def(
        remove,
        (_c, p) =>
          this.lists[kind].delete(String(p[0])) || fail("Login not in list"),
      );
      def(clean, () => (this.lists[kind].clear(), true));
      def(load, ok);
      def(save, ok);
    };
    listOps(
      "guest",
      "GetGuestList",
      "AddGuest",
      "RemoveGuest",
      "CleanGuestList",
      "LoadGuestList",
      "SaveGuestList",
    );
    listOps(
      "black",
      "GetBlackList",
      "BlackList",
      "UnBlackList",
      "CleanBlackList",
      "LoadBlackList",
      "SaveBlackList",
    );
    def("GetBanList", (_c, p) =>
      this.list("ban", p).map((x) => ({
        ...x,
        ClientName: x.Login,
        IPAddress: "0.0.0.0",
      })),
    );
    def(
      "Ban",
      (_c, p) => (
        this.lists.ban.add(String(p[0])),
        sim.removePlayer(String(p[0]), "banned"),
        true
      ),
    );
    def(
      "UnBan",
      (_c, p) =>
        this.lists.ban.delete(String(p[0])) || fail("Login not in list"),
    );
    def("CleanBanList", () => (this.lists.ban.clear(), true));

    // Chat and manialinks, counted as received load
    const chat = (text: unknown) => {
      stats.chatMessages++;
      stats.chatBytes += Buffer.byteLength(String(text ?? ""));
      return true;
    };
    def("ChatSendServerMessage", (_c, p) => chat(p[0]));
    def("ChatSendServerMessageToLogin", (_c, p) => chat(p[0]));
    def("ChatSendServerMessageToId", (_c, p) => chat(p[0]));
    def("ChatSend", (_c, p) => chat(p[0]));
    def("ChatSendToLogin", (_c, p) => chat(p[0]));
    def("ChatForwardToLogin", (_c, p) => chat(p[0]));
    const page = (xml: unknown) => {
      stats.manialinkPages++;
      stats.manialinkBytes += Buffer.byteLength(String(xml ?? ""));
      return true;
    };
    def("SendDisplayManialinkPage", (_c, p) => page(p[0]));
    def("SendDisplayManialinkPageToLogin", (_c, p) => page(p[1]));
    def("SendDisplayManialinkPageToId", (_c, p) => page(p[1]));
    def("SendHideManialinkPage", ok);
    def("SendHideManialinkPageToLogin", ok);
  }
}

function fail(message: string): never {
  throw new Fault(-1000, message);
}

function toFaultStruct(e: unknown): { faultCode: number; faultString: string } {
  if (e instanceof Fault)
    return { faultCode: e.faultCode, faultString: e.faultString };
  return {
    faultCode: -32500,
    faultString: (e as Error).message ?? "Internal error",
  };
}
