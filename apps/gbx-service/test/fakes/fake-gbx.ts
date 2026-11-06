import type {
  GbxCall,
  GbxCallbackHandler,
  GbxSession,
} from "../../src/core/gbx/connection";

type Handler = (...params: any[]) => unknown;

export interface RecordedCall {
  method: string;
  params: unknown[];
}

// Scriptable dedicated server: responses per method, records every call/send
export class FakeGbxSession implements GbxSession {
  readonly calls: RecordedCall[] = [];
  readonly scriptCalls: RecordedCall[] = [];
  readonly sent: RecordedCall[] = [];
  readonly multicalls: GbxCall[][] = [];
  connectedTo: { host: string; port: number } | null = null;
  disconnected = false;
  connectError: Error | null = null;
  private callbackHandlers: GbxCallbackHandler[] = [];
  private disconnectHandlers: (() => void)[] = [];

  constructor(private readonly handlers: Record<string, Handler | unknown> = {}) {}

  respond(method: string, value: Handler | unknown): this {
    this.handlers[method] = value;
    return this;
  }

  async connect(host: string, port: number): Promise<void> {
    if (this.connectError) throw this.connectError;
    this.connectedTo = { host, port };
  }

  async disconnect(): Promise<void> {
    if (this.disconnected) return;
    this.disconnected = true;
    this.disconnectHandlers.forEach((handler) => handler());
  }

  async call<T>(method: string, ...params: unknown[]): Promise<T> {
    this.calls.push({ method, params });
    return this.resolve(method, params) as T;
  }

  async callScript<T>(method: string, ...params: unknown[]): Promise<T> {
    this.scriptCalls.push({ method, params });
    return this.resolve(`script:${method}`, params, true) as T;
  }

  async multicall(calls: GbxCall[]): Promise<unknown[]> {
    this.multicalls.push(calls);
    const results: unknown[] = [];
    for (const [method, ...params] of calls) {
      results.push(await this.resolve(method, params, true));
    }
    return results;
  }

  send(method: string, ...params: unknown[]): void {
    this.sent.push({ method, params });
  }

  onCallback(handler: GbxCallbackHandler): void {
    this.callbackHandlers.push(handler);
  }

  onDisconnect(handler: () => void): void {
    this.disconnectHandlers.push(handler);
  }

  // Simulates a server callback
  emit(method: string, data: unknown): void {
    this.callbackHandlers.forEach((handler) => handler(method, data));
  }

  // Simulates a mode script callback with a JSON payload
  emitScript(name: string, payload: unknown = {}): void {
    this.emit("ManiaPlanet.ModeScriptCallbackArray", [name, [JSON.stringify(payload)]]);
  }

  // Simulates the server dropping the connection
  drop(): void {
    this.disconnectHandlers.forEach((handler) => handler());
  }

  callbackHandlerCount(): number {
    return this.callbackHandlers.length;
  }

  callsTo(method: string): RecordedCall[] {
    return this.calls.filter((call) => call.method === method);
  }

  sentManialinkIds(): string[] {
    return this.sent
      .filter((s) => s.method.startsWith("SendDisplayManialinkPage"))
      .map((s) => {
        const xml = String(s.params[s.method.endsWith("ToLogin") ? 1 : 0]);
        return /<manialink[^>]*\bid="([^"]+)"/.exec(xml)?.[1] ?? "";
      });
  }

  // Last XML sent for a manialink id (public or to any login)
  lastManialink(id: string): string | null {
    for (let i = this.sent.length - 1; i >= 0; i--) {
      const { method, params } = this.sent[i];
      if (!method.startsWith("SendDisplayManialinkPage")) continue;
      const xml = String(params[method.endsWith("ToLogin") ? 1 : 0]);
      if (xml.includes(`id="${id}"`) && xml.includes("<script")) return xml;
    }
    return null;
  }

  // JSON a widget update page carries in `declare Text <name> = """...""";`
  widgetJson<T = any>(id: string, name: string): T | null {
    const xml = this.lastManialink(id);
    const match = xml && new RegExp(`declare Text ${name} = """([\\s\\S]*?)""";`).exec(xml);
    return match ? (JSON.parse(match[1]) as T) : null;
  }

  private async resolve(method: string, params: unknown[], optional = false): Promise<unknown> {
    if (!(method in this.handlers)) {
      if (optional) return undefined;
      return true;
    }
    const handler = this.handlers[method];
    return typeof handler === "function" ? await (handler as Handler)(...params) : handler;
  }
}
