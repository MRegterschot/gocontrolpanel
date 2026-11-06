import { AppError } from "../errors";
import type { GbxCall, GbxConnection, GbxSession } from "./connection";

// Stable GbxConnection for collaborators while the underlying session comes and goes
export class ActiveConnection implements GbxConnection {
  constructor(private readonly current: () => GbxSession | null) {}

  private require(): GbxSession {
    const session = this.current();
    if (!session) {
      throw new AppError("ServerNotConnected", "Server is not connected");
    }
    return session;
  }

  call<T = any>(method: string, ...params: unknown[]): Promise<T> {
    try {
      return this.require().call<T>(method, ...params);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  callScript<T = any>(method: string, ...params: unknown[]): Promise<T> {
    try {
      return this.require().callScript<T>(method, ...params);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  multicall(calls: GbxCall[]): Promise<unknown[]> {
    try {
      return this.require().multicall(calls);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  // Dropped while disconnected; manialink cleanup after a lost connection must not throw
  send(method: string, ...params: unknown[]): void {
    this.current()?.send(method, ...params);
  }
}
