import { GbxClient } from "@evotm/gbxclient";
import type { Socket } from "node:net";
import type {
  GbxCall,
  GbxCallbackHandler,
  GbxSession,
} from "../../core/gbx/connection";
import type { Logger } from "../../core/logger";

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Adapter over @evotm/gbxclient; one instance per connection attempt
export class EvotmGbxSession implements GbxSession {
  private readonly client = new GbxClient({ showErrors: false, throwErrors: true });

  constructor(private readonly log: Logger) {}

  async connect(host: string, port: number, timeoutMs: number): Promise<void> {
    const connecting = this.client.connect(host, port);
    // The library only listens for socket errors after connecting; without this a refused
    // connection is an uncaught 'error' event that takes the whole process down
    const socket = (this.client.gbx as unknown as { socket: Socket | null }).socket;
    const failed = new Promise<never>((_, reject) => socket?.once("error", reject));

    let connected: boolean;
    try {
      connected = await withTimeout(
        Promise.race([connecting, failed]),
        timeoutMs,
        "Connection to GBX server timed out",
      );
    } catch (error) {
      // Drop a socket that may still complete after the timeout
      await this.disconnect();
      throw error;
    }

    if (!connected) {
      await this.disconnect();
      throw new Error(`Failed to connect to GBX server at ${host}:${port}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.gbx.disconnect();
    } catch {
      // Already closed
    }
  }

  call<T = any>(method: string, ...params: unknown[]): Promise<T> {
    return this.client.call(method, ...params);
  }

  callScript<T = any>(method: string, ...params: unknown[]): Promise<T> {
    return this.client.callScript(method, ...params);
  }

  async multicall(calls: GbxCall[]): Promise<unknown[]> {
    // The library shifts the method name off each entry, so hand it copies
    const result = await this.client.multicall(calls.map((call) => [...call]));
    return result ?? [];
  }

  send(method: string, ...params: unknown[]): void {
    try {
      const pending = this.client.send(method, ...params);
      pending?.catch((error: unknown) =>
        this.log.warn({ err: error, method }, "GBX send failed"),
      );
    } catch (error) {
      this.log.warn({ err: error, method }, "GBX send failed");
    }
  }

  onCallback(handler: GbxCallbackHandler): void {
    this.client.on("callback", handler);
  }

  onDisconnect(handler: () => void): void {
    this.client.on("disconnect", handler);
  }
}
