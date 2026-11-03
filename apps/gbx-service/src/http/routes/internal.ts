import {
  chatConfigBodySchema,
  chatMessageBodySchema,
  commandBodySchema,
  gbxCallBodySchema,
  gbxMulticallBodySchema,
  mapsBodySchema,
  matchSettingsBodySchema,
  pauseBodySchema,
  pluginCommandBodySchema,
  pluginEventBodySchema,
  pointsBodySchema,
  scriptNameBodySchema,
  scriptSettingsBodySchema,
  serverLifecycleEventSchema,
  type ApiSuccess,
} from "@tmcontrolpanel/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ServerGateway } from "../../core/cluster/gateway";
import { AppError } from "../../core/errors";
import { isPassthroughAllowed } from "../../core/gbx/allowlist";
import { parse } from "../errors";
import { requireServiceToken } from "../service-auth";

const serverParams = z.object({ id: z.string().min(1) });
const playerParams = serverParams.extend({ login: z.string().min(1) });
const teamParams = serverParams.extend({
  teamId: z.coerce.number().int().min(0),
});

const ok = <T>(data: T): ApiSuccess<T> => ({ data });

function assertAllowed(method: string) {
  if (!isPassthroughAllowed(method)) {
    throw new AppError(
      "MethodNotAllowed",
      `Method ${method} is not allowed through the passthrough`,
    );
  }
}

export async function internalRoutes(
  app: FastifyInstance,
  opts: { gateway: ServerGateway; serviceToken: string },
) {
  const { gateway } = opts;
  app.addHook("onRequest", requireServiceToken(opts.serviceToken));
  app.get("/internal/servers", async () => ok(await gateway.list()));
  app.get("/internal/servers/:id", async (req) => {
    const { id } = parse(serverParams, req.params);
    return ok(await gateway.call(id, "status"));
  });
  app.get("/internal/servers/:id/live", async (req) => {
    const { id } = parse(serverParams, req.params);
    return ok(await gateway.call(id, "snapshot"));
  });
  app.post("/internal/servers/:id/reconnect", async (req) => {
    const { id } = parse(serverParams, req.params);
    return ok(await gateway.call(id, "reconnect"));
  });
  app.post("/internal/servers/:id/stop-reconnect", async (req) => {
    const { id } = parse(serverParams, req.params);
    return ok(await gateway.call(id, "stopReconnect"));
  });
  app.post("/internal/servers/:id/disconnect", async (req) => {
    const { id } = parse(serverParams, req.params);
    return ok(await gateway.call(id, "disconnect"));
  });
  app.post("/internal/servers/:id/manialinks/resend", async (req) => {
    const { id } = parse(serverParams, req.params);
    return ok(await gateway.call(id, "resendManialinks"));
  });
  app.post("/internal/servers/:id/plugins/reload", async (req) => {
    const { id } = parse(serverParams, req.params);
    return ok(await gateway.call(id, "reloadPlugins"));
  });
  app.post("/internal/servers/:id/plugin-events", async (req) => {
    const { id } = parse(serverParams, req.params);
    const args = parse(pluginEventBodySchema, req.body);
    return ok(
      await gateway.call(id, "pluginEvent", {
        source: args.source,
        name: args.name,
        payload: args.payload,
      }),
    );
  });
  app.post("/internal/servers/:id/commands", async (req) => {
    const { id } = parse(serverParams, req.params);
    const args = parse(commandBodySchema, req.body);
    return ok(await gateway.call(id, "command", args));
  });
  app.post("/internal/servers/:id/plugin-commands", async (req) => {
    const { id } = parse(serverParams, req.params);
    const args = parse(pluginCommandBodySchema, req.body);
    return ok(await gateway.call(id, "pluginCommand", args));
  });
  app.post("/internal/servers/:id/gbx/call", async (req) => {
    const { id } = parse(serverParams, req.params);
    const args = parse(gbxCallBodySchema, req.body);
    assertAllowed(args.method);
    return ok(await gateway.call(id, "gbxCall", args));
  });
  app.post("/internal/servers/:id/gbx/multicall", async (req) => {
    const { id } = parse(serverParams, req.params);
    const args = parse(gbxMulticallBodySchema, req.body);
    args.calls.forEach((call) => assertAllowed(call.method));
    return ok(await gateway.call(id, "gbxMulticall", args));
  });
  app.post("/internal/servers/:id/chat", async (req) => {
    const { id } = parse(serverParams, req.params);
    const args = parse(chatMessageBodySchema, req.body);
    return ok(await gateway.call(id, "chat", args));
  });
  app.put("/internal/servers/:id/chat-config", async (req) => {
    const { id } = parse(serverParams, req.params);
    const args = parse(chatConfigBodySchema, req.body);
    return ok(await gateway.call(id, "chatConfig", args));
  });
  app.post("/internal/servers/:id/script", async (req) => {
    const { id } = parse(serverParams, req.params);
    const args = parse(scriptNameBodySchema, req.body);
    return ok(await gateway.call(id, "script", args));
  });
  app.post("/internal/servers/:id/match-settings/load", async (req) => {
    const { id } = parse(serverParams, req.params);
    const args = parse(matchSettingsBodySchema, req.body);
    return ok(await gateway.call(id, "loadMatchSettings", args));
  });
  app.put("/internal/servers/:id/script-settings", async (req) => {
    const { id } = parse(serverParams, req.params);
    const args = parse(scriptSettingsBodySchema, req.body);
    return ok(await gateway.call(id, "scriptSettings", args));
  });
  app.post("/internal/servers/:id/pause", async (req) => {
    const { id } = parse(serverParams, req.params);
    const args = parse(pauseBodySchema, req.body);
    return ok(await gateway.call(id, "pause", args));
  });
  app.post("/internal/servers/:id/maps", async (req) => {
    const { id } = parse(serverParams, req.params);
    const args = parse(mapsBodySchema, req.body);
    return ok(await gateway.call(id, "addMaps", args));
  });
  app.post("/internal/servers/:id/maps/remove", async (req) => {
    const { id } = parse(serverParams, req.params);
    const args = parse(mapsBodySchema, req.body);
    return ok(await gateway.call(id, "removeMaps", args));
  });
  app.put("/internal/servers/:id/maps/order", async (req) => {
    const { id } = parse(serverParams, req.params);
    const args = parse(mapsBodySchema, req.body);
    return ok(await gateway.call(id, "reorderMaps", args));
  });
  app.put("/internal/servers/:id/players/:login/points", async (req) => {
    const { id, login } = parse(playerParams, req.params);
    const { type, points } = parse(pointsBodySchema, req.body);
    return ok(await gateway.call(id, "playerPoints", { login, type, points }));
  });
  app.put("/internal/servers/:id/teams/:teamId/points", async (req) => {
    const { id, teamId } = parse(teamParams, req.params);
    const { type, points } = parse(pointsBodySchema, req.body);
    return ok(await gateway.call(id, "teamPoints", { teamId, type, points }));
  });
  app.post("/internal/server-events", async (req) => {
    await gateway.handleLifecycleEvent(
      parse(serverLifecycleEventSchema, req.body),
    );
    return ok(null);
  });
}
