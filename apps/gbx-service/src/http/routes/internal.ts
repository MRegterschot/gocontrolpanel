import {
  chatConfigBodySchema,
  chatMessageBodySchema,
  gbxCallBodySchema,
  gbxMulticallBodySchema,
  mapsBodySchema,
  matchSettingsBodySchema,
  pauseBodySchema,
  pointsBodySchema,
  scriptNameBodySchema,
  scriptSettingsBodySchema,
  serverLifecycleEventSchema,
  type ApiSuccess,
} from "@gcp/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../../core/errors";
import { isPassthroughAllowed } from "../../core/gbx/allowlist";
import type { ServerRegistry } from "../../core/server/server-registry";
import { gbxOperation, parse } from "../errors";
import { requireServiceToken } from "../service-auth";

const serverParams = z.object({ id: z.string().min(1) });
const playerParams = serverParams.extend({ login: z.string().min(1) });
const teamParams = serverParams.extend({ teamId: z.coerce.number().int().min(0) });

const ok = <T>(data: T): ApiSuccess<T> => ({ data });

function assertAllowed(method: string) {
  if (!isPassthroughAllowed(method)) {
    throw new AppError("MethodNotAllowed", `Method ${method} is not allowed through the passthrough`);
  }
}

export async function internalRoutes(
  app: FastifyInstance,
  opts: { registry: ServerRegistry; serviceToken: string },
) {
  const { registry } = opts;
  app.addHook("onRequest", requireServiceToken(opts.serviceToken));

  const runtimeFor = (params: unknown) => registry.get(parse(serverParams, params).id);

  app.get("/internal/servers", async () => ok(registry.list().map((r) => r.status())));

  app.get("/internal/servers/:id", async (req) => ok(runtimeFor(req.params).status()));

  app.get("/internal/servers/:id/live", async (req) => ok(runtimeFor(req.params).snapshot()));

  app.post("/internal/servers/:id/reconnect", async (req) => {
    const connected = await runtimeFor(req.params).reconnect();
    return ok({ connected });
  });

  app.post("/internal/servers/:id/stop-reconnect", async (req) => {
    runtimeFor(req.params).stopReconnect();
    return ok(null);
  });

  app.post("/internal/servers/:id/disconnect", async (req) => {
    await runtimeFor(req.params).disconnect();
    return ok(null);
  });

  app.post("/internal/servers/:id/manialinks/resend", async (req) => {
    await runtimeFor(req.params).manialinks.resendAll();
    return ok(null);
  });

  app.post("/internal/servers/:id/plugins/reload", async (req) => {
    await runtimeFor(req.params).reloadPlugins();
    return ok(null);
  });

  app.post("/internal/servers/:id/gbx/call", async (req) => {
    const runtime = runtimeFor(req.params);
    const { method, params } = parse(gbxCallBodySchema, req.body);
    assertAllowed(method);
    return ok(await gbxOperation(() => runtime.gbx.call(method, ...params)));
  });

  app.post("/internal/servers/:id/gbx/multicall", async (req) => {
    const runtime = runtimeFor(req.params);
    const { calls } = parse(gbxMulticallBodySchema, req.body);
    calls.forEach((call) => assertAllowed(call.method));
    return ok(
      await gbxOperation(() =>
        runtime.gbx.multicall(calls.map((call) => [call.method, ...call.params])),
      ),
    );
  });

  app.post("/internal/servers/:id/chat", async (req) => {
    const runtime = runtimeFor(req.params);
    const { message, login } = parse(chatMessageBodySchema, req.body);
    await gbxOperation(() => runtime.commands.sendChat(message, login));
    return ok(null);
  });

  app.put("/internal/servers/:id/chat-config", async (req) => {
    const runtime = runtimeFor(req.params);
    const config = parse(chatConfigBodySchema, req.body);
    return ok(await runtime.commands.applyChatConfig(config));
  });

  app.post("/internal/servers/:id/script", async (req) => {
    const runtime = runtimeFor(req.params);
    const { script } = parse(scriptNameBodySchema, req.body);
    await gbxOperation(() => runtime.commands.setScriptName(script));
    return ok(null);
  });

  app.post("/internal/servers/:id/match-settings/load", async (req) => {
    const runtime = runtimeFor(req.params);
    const { filename } = parse(matchSettingsBodySchema, req.body);
    await gbxOperation(() => runtime.commands.loadMatchSettings(filename));
    return ok(null);
  });

  app.put("/internal/servers/:id/script-settings", async (req) => {
    const runtime = runtimeFor(req.params);
    const { settings } = parse(scriptSettingsBodySchema, req.body);
    await gbxOperation(() => runtime.commands.setScriptSettings(settings));
    return ok(null);
  });

  app.post("/internal/servers/:id/pause", async (req) => {
    const runtime = runtimeFor(req.params);
    const { paused } = parse(pauseBodySchema, req.body);
    await gbxOperation(() => runtime.commands.setPaused(paused));
    return ok(null);
  });

  app.post("/internal/servers/:id/maps", async (req) => {
    const runtime = runtimeFor(req.params);
    const { filenames } = parse(mapsBodySchema, req.body);
    return ok(await gbxOperation(() => runtime.commands.addMaps(filenames)));
  });

  app.post("/internal/servers/:id/maps/remove", async (req) => {
    const runtime = runtimeFor(req.params);
    const { filenames } = parse(mapsBodySchema, req.body);
    return ok(await gbxOperation(() => runtime.commands.removeMaps(filenames)));
  });

  app.put("/internal/servers/:id/maps/order", async (req) => {
    const runtime = runtimeFor(req.params);
    const { filenames } = parse(mapsBodySchema, req.body);
    return ok(await gbxOperation(() => runtime.commands.reorderMaps(filenames)));
  });

  app.put("/internal/servers/:id/players/:login/points", async (req) => {
    const { id, login } = parse(playerParams, req.params);
    const runtime = registry.get(id);
    const { type, points } = parse(pointsBodySchema, req.body);
    await gbxOperation(() => runtime.commands.setPlayerPoints(login, type, points));
    return ok(null);
  });

  app.put("/internal/servers/:id/teams/:teamId/points", async (req) => {
    const { id, teamId } = parse(teamParams, req.params);
    const runtime = registry.get(id);
    const { type, points } = parse(pointsBodySchema, req.body);
    await gbxOperation(() => runtime.commands.setTeamPoints(teamId, type, points));
    return ok(null);
  });

  app.post("/internal/server-events", async (req) => {
    await registry.handleLifecycleEvent(parse(serverLifecycleEventSchema, req.body));
    return ok(null);
  });
}
