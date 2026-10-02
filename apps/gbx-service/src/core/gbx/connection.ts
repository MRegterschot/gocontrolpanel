// Port for talking to a dedicated server over XML-RPC
export interface GbxConnection {
  call<T = any>(method: string, ...params: unknown[]): Promise<T>;
  // TriggerModeScriptEventArray(method, params)
  callScript<T = any>(method: string, ...params: unknown[]): Promise<T>;
  multicall(calls: GbxCall[]): Promise<unknown[]>;
  // Fire and forget; failures are logged by the adapter
  send(method: string, ...params: unknown[]): void;
}

export type GbxCall = [method: string, ...params: unknown[]];

export type GbxCallbackHandler = (method: string, data: unknown) => void;

// One physical connection; a new session is created for every connection attempt
export interface GbxSession extends GbxConnection {
  connect(host: string, port: number, timeoutMs: number): Promise<void>;
  disconnect(): Promise<void>;
  onCallback(handler: GbxCallbackHandler): void;
  onDisconnect(handler: () => void): void;
}

export type GbxSessionFactory = () => GbxSession;
