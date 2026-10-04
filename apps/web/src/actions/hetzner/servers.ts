"use server";

import { AddHetznerDatabaseSchemaType } from "@/forms/admin/hetzner/database/add-hetzner-database-schema";
import { AttachHetznerServerToNetworkSchemaType } from "@/forms/admin/hetzner/server/attach-hetzner-server-to-network-schema";
import { doServerActionWithAuth } from "@/lib/actions";
import { axiosHetzner } from "@/lib/axios/hetzner";
import { HandlebarsServer } from "@/lib/handlebars";
import { getKeyHetznerRecentlyCreatedServers, getRedisClient } from "@/lib/redis";
import { generateRandomString } from "@/lib/utils";
import { HetznerServer, HetznerServerCache } from "@/types/api/hetzner/servers";
import { ServerResponse } from "@/types/responses";
import { readFileSync } from "fs";
import path from "path";
import { packageDirectorySync } from "pkg-dir";
import { logAudit } from "../database/server-only/audit-logs";
import {
  createDBHetznerServer,
  deleteDBHetznerServer,
} from "../database/server-only/hetzner-servers";
import { createHetznerSSHKey, getApiToken, setRateLimit } from "./util";

const root = packageDirectorySync() || process.cwd();

// Dedi template
const dediTemplatePath = path.join(root, "hetzner", "server-init.sh.hbs");

const dediTemplateContent = readFileSync(dediTemplatePath, "utf-8");

export const dediTemplate = HandlebarsServer.compile(dediTemplateContent);

// Database template
const dbTemplatePath = path.join(root, "hetzner", "database-init.sh.hbs");

const dbTemplateContent = readFileSync(dbTemplatePath, "utf-8");

export const dbTemplate = HandlebarsServer.compile(dbTemplateContent);

// Trackmania server template
const tmServerTemplatePath = path.join(root, "hetzner", "add-server.sh.hbs");

const tmServerTemplateContent = readFileSync(tmServerTemplatePath, "utf-8");

export const tmServerTemplate = HandlebarsServer.compile(
  tmServerTemplateContent,
);

export async function deleteHetznerServer(
  projectId: string,
  serverId: number,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    ["hetzner:servers:delete", `hetzner:${projectId}:admin`],
    async (session) => {
      const token = await getApiToken(projectId);

      const res = await axiosHetzner.delete(`/servers/${serverId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await deleteDBHetznerServer(serverId);

      await logAudit(
        session.user.id,
        projectId,
        "hetzner.server.delete",
        serverId,
      );

      const client = await getRedisClient();
      const key = getKeyHetznerRecentlyCreatedServers(projectId);

      const servers = await client.lrange(key, 0, -1);

      const updatedServers = servers
        .map((item) => JSON.parse(item))
        .filter((server: HetznerServerCache) => server.id !== serverId);

      await client.del(key);
      if (updatedServers.length > 0) {
        await client.rpush(
          key,
          ...updatedServers.map((s) => JSON.stringify(s)),
        );
        await client.expire(key, 60 * 60 * 2); // Keep for 2 hours
      }

      await setRateLimit(projectId, res);
    },
  );
}

export async function createHetznerDatabase(
  projectId: string,
  data: AddHetznerDatabaseSchemaType,
): Promise<ServerResponse<HetznerServer>> {
  return doServerActionWithAuth(
    ["hetzner:servers:create", `hetzner:${projectId}:admin`],
    async (session) => {
      const token = await getApiToken(projectId);

      const dbData = {
        db_type: data.databaseType,
        db_root_password: data.databaseRootPassword || generateRandomString(16),
        db_name: data.databaseName,
        db_user: data.databaseUser || generateRandomString(16),
        db_password: data.databasePassword || generateRandomString(16),
      };

      const userData = dbTemplate(dbData);

      const keyName = `db-${data.name}-${generateRandomString(8)}`;
      const keys = await createHetznerSSHKey(projectId, keyName);

      const body = {
        name: data.name,
        server_type: data.serverType,
        image: "ubuntu-22.04",
        location: data.location,
        user_data: userData,
        networks: data.networkId ? [data.networkId] : [],
        ssh_keys: [keys.id],
        labels: {
          type: "database",
          "database.type": dbData.db_type,
          "authorization.database.name": dbData.db_name,
          "authorization.database.user": dbData.db_user,
          "authorization.database.password": dbData.db_password,
        },
        public_net: {
          enable_ipv4: false,
          enable_ipv6: true,
        },
      };

      const res = await axiosHetzner.post<{
        server: HetznerServer;
      }>("/servers", body, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await createDBHetznerServer({
        hetznerId: res.data.server.id,
        publicKey: keys.publicKey,
        privateKey: keys.privateKey,
      });

      await logAudit(
        session.user.id,
        projectId,
        "hetzner.server.create.database",
        {
          id: res.data.server.id,
          ...data,
          databaseRootPassword: data.databaseRootPassword ? "*****" : undefined,
          databasePassword: data.databasePassword ? "*****" : undefined,
        },
      );

      await setRateLimit(projectId, res);

      return res.data.server;
    },
  );
}

export async function attachHetznerServerToNetwork(
  projectId: string,
  serverId: number,
  data: AttachHetznerServerToNetworkSchemaType,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    ["hetzner:servers:create", `hetzner:${projectId}:admin`],
    async (session) => {
      const token = await getApiToken(projectId);

      const body = {
        network: parseInt(data.networkId),
        ip: data.ip,
      };

      const res = await axiosHetzner.post(
        `/servers/${serverId}/actions/attach_to_network`,
        body,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      await logAudit(
        session.user.id,
        projectId,
        "hetzner.server.network.attach",
        { serverId, data },
      );

      await setRateLimit(projectId, res);
    },
  );
}

export async function detachHetznerServerFromNetwork(
  projectId: string,
  serverId: number,
  network: number,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    ["hetzner:servers:create", `hetzner:${projectId}:admin`],
    async (session) => {
      const token = await getApiToken(projectId);

      const res = await axiosHetzner.post(
        `/servers/${serverId}/actions/detach_from_network`,
        { network },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      await logAudit(
        session.user.id,
        projectId,
        "hetzner.server.network.detach",
        { serverId, network },
      );

      await setRateLimit(projectId, res);
    },
  );
}

export async function updateHetznerServer(
  projectId: string,
  serverId: number,
  labels: Record<string, string>,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    ["hetzner:servers:update", `hetzner:${projectId}:admin`],
    async (session) => {
      const token = await getApiToken(projectId);

      const res = await axiosHetzner.put(
        `/servers/${serverId}`,
        { labels },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      await logAudit(session.user.id, projectId, "hetzner.server.update", {
        serverId,
        labels,
      });

      await setRateLimit(projectId, res);
    },
  );
}
