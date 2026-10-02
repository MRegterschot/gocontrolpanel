import { describe, expect, it, vi } from "vitest";
import { ServerRegistry } from "../../src/core/server/server-registry";
import type { ServerRuntime } from "../../src/core/server/server-runtime";
import { TypedEventBus } from "../../src/core/events";
import type { ServerEventMap } from "../../src/core/server/server-events";
import { silentLogger } from "../fakes/logger";
import { InMemoryServerRepository } from "../fakes/repositories";
import { serverRecord } from "../fakes/harness";

function fakeRuntime(serverId: string) {
  const events = new TypedEventBus<ServerEventMap>();
  return {
    serverId,
    events,
    start: vi.fn(async () => true),
    dispose: vi.fn(async () => events.emit("disconnect")),
    applyServerUpdate: vi.fn(async () => {}),
    refreshPlugins: vi.fn(async () => {}),
  };
}

function setup(enabledServerIds: string[] = []) {
  const servers = new InMemoryServerRepository()
    .add(serverRecord({ id: "a" }))
    .add(serverRecord({ id: "b" }));
  const created = new Map<string, ReturnType<typeof fakeRuntime>>();
  const registry = new ServerRegistry({
    servers,
    log: silentLogger,
    enabledServerIds,
    createRuntime: (id) => {
      const runtime = fakeRuntime(id);
      created.set(id, runtime);
      return runtime as unknown as ServerRuntime;
    },
  });
  return { registry, created };
}

describe("ServerRegistry", () => {
  it("starts a runtime for every active server", async () => {
    const { registry, created } = setup();
    await registry.startAll();
    expect(registry.list().map((r) => r.serverId)).toEqual(["a", "b"]);
    expect(created.get("a")!.start).toHaveBeenCalled();
  });

  it("only manages allowlisted servers", async () => {
    const { registry } = setup(["b"]);
    await registry.startAll();
    expect(registry.list().map((r) => r.serverId)).toEqual(["b"]);
    expect(registry.add("a")).toBeNull();
  });

  it("forwards runtime events with the server id", async () => {
    const { registry, created } = setup();
    await registry.startAll();
    const connect = vi.fn();
    const reconnect = vi.fn();
    const admin = vi.fn();
    registry.events.on("connect", connect);
    registry.events.on("reconnect", reconnect);
    registry.events.on("adminCommand", admin);

    created.get("a")!.events.emit("connect");
    created.get("b")!.events.emit("reconnect", "try", 123);
    created.get("a")!.events.emit("adminCommand", []);

    expect(connect).toHaveBeenCalledWith("a");
    expect(reconnect).toHaveBeenCalledWith("b", "try", 123);
    expect(admin).toHaveBeenCalledWith("a", []);
  });

  it("throws a typed error for unknown servers", () => {
    const { registry } = setup();
    expect(() => registry.get("nope")).toThrow(expect.objectContaining({ code: "ServerNotFound" }));
  });

  it("handles lifecycle events", async () => {
    const { registry, created } = setup();
    const removed = vi.fn();
    registry.events.on("runtimeRemoved", removed);

    await registry.handleLifecycleEvent({ type: "server.created", serverId: "a" });
    expect(registry.find("a")).toBeDefined();

    await registry.handleLifecycleEvent({ type: "server.updated", serverId: "a" });
    expect(created.get("a")!.applyServerUpdate).toHaveBeenCalled();

    await registry.handleLifecycleEvent({ type: "server.updated", serverId: "b" });
    expect(registry.find("b")).toBeDefined();

    await registry.handleLifecycleEvent({ type: "server.plugins.updated", serverId: "a" });
    expect(created.get("a")!.refreshPlugins).toHaveBeenCalled();

    await registry.handleLifecycleEvent({ type: "server.deleted", serverId: "a" });
    expect(registry.find("a")).toBeUndefined();
    expect(created.get("a")!.dispose).toHaveBeenCalled();
    expect(removed).toHaveBeenCalledWith("a");
  });
});
