"use server";

import { AdvancedServerSetupSchemaType } from "@/forms/admin/hetzner/setup-steps/advanced/server-setup-schema";
import { SimpleServerSetupSchemaType } from "@/forms/admin/hetzner/setup-steps/simple/server-setup-schema";
import { doServerActionWithAuth } from "@/lib/actions";
import { axiosHetzner } from "@/lib/axios/hetzner";
import {
  getKeyHetznerRecentlyCreatedServers,
  getRedisClient,
} from "@/lib/redis";
import { generateRandomString, sleep } from "@/lib/utils";
import { HetznerServer, HetznerServerCache } from "@/types/api/hetzner/servers";
import { ServerResponse } from "@/types/responses";
import { createHetznerNetwork } from "./networks";
import {
  attachHetznerServerToNetwork,
  createHetznerDatabase,
  dediTemplate,
} from "./servers";
import { getApiToken, getHetznerServer, setRateLimit } from "./util";

export async function createAdvancedServerSetup(
  projectId: string,
  data: AdvancedServerSetupSchemaType,
): Promise<ServerResponse<HetznerServer>> {
  return doServerActionWithAuth(
    ["hetzner:servers:create", `hetzner:${projectId}:admin`],
    async () => {
      if (data.database?.new) {
        data.database = {
          ...data.database,
          databaseRootPassword:
            data.database.databaseRootPassword || generateRandomString(16),
          databaseUser: data.database.databaseUser || generateRandomString(16),
          databasePassword:
            data.database.databasePassword || generateRandomString(16),
        };
      }

      const { server, serverController, database, network } = data;

      const token = await getApiToken(projectId);

      let networkId: number | undefined = undefined;
      if (server.controller && network?.new) {
        const { data, error } = await createHetznerNetwork(projectId, network);
        if (error) {
          throw new Error(error);
        }
        networkId = data.id;
      } else if (server.controller && network?.existing) {
        networkId = parseInt(network.existing);
      }

      if (!networkId && server.controller) {
        throw new Error(
          "Network must be created or selected for controller servers.",
        );
      }

      let databaseId: number | undefined = undefined;
      let createdDatabase: HetznerServer | undefined = undefined;
      if (server.controller && database?.new) {
        const { data, error } = await createHetznerDatabase(projectId, {
          ...database,
          networkId,
        });
        if (error) {
          throw new Error(error);
        }
        createdDatabase = data;
        databaseId = data.id;
      } else if (server.controller && database?.existing) {
        databaseId = parseInt(database.existing);

        if (!network?.databaseInNetwork) {
          if (!networkId) {
            throw new Error("Network must be selected for existing databases.");
          }

          const { error: dbError } = await attachHetznerServerToNetwork(
            projectId,
            databaseId,
            {
              networkId: networkId.toString(),
            },
          );

          let count = 0;
          do {
            await sleep(1000);
            const updatedServer = await getHetznerServer(projectId, databaseId);
            createdDatabase = updatedServer;
            count++;
          } while (
            !createdDatabase.private_net.find(
              (net) => net.network === networkId,
            ) &&
            count < 10
          );

          if (
            !createdDatabase.private_net.find(
              (net) => net.network === networkId,
            )
          ) {
            createdDatabase.private_net?.push({
              network: networkId,
              ip: networkId.toString().split(".").slice(0, 3).join(".") + ".63",
            });
          }

          if (dbError) {
            throw new Error(dbError);
          }
        }
      }

      const dediData = {
        server_controller: server.controller ? serverController : undefined,
        db: {
          host:
            createdDatabase?.private_net.find(
              (net) => net.network === networkId,
            )?.ip ||
            network?.databaseIp ||
            "",
          port: database?.databaseType === "postgres" ? 5432 : 3306,
          name: database?.databaseName,
          user: database?.databaseUser || generateRandomString(16),
          password: database?.databasePassword || generateRandomString(16),
        },
        dedi_login: server.dediLogin,
        dedi_password: server.dediPassword,
        room_password: server.roomPassword,
        superadmin_password:
          server.superAdminPassword || generateRandomString(16),
        admin_password: server.adminPassword || generateRandomString(16),
        user_password: server.userPassword || generateRandomString(16),
        filemanager_password:
          server.filemanagerPassword || generateRandomString(16),
      };

      const userData = dediTemplate(dediData);

      const body = {
        name: server.name,
        server_type: server.serverType,
        image: server.image,
        location: server.location,
        user_data: userData,
        labels: {
          type: "dedi",
          "servercontroller.type": serverController?.type,
          "authorization.superadmin.password": dediData.superadmin_password,
          "authorization.admin.password": dediData.admin_password,
          "authorization.user.password": dediData.user_password,
          "filemanager.password": dediData.filemanager_password,
        },
        public_net: {
          enable_ipv4: true,
          enable_ipv6: false,
        },
      };

      const res = await axiosHetzner.post<{
        server: HetznerServer;
      }>("/servers", body, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const cachedServer: HetznerServerCache = {
        id: res.data.server.id,
        projectId,
        name: res.data.server.name,
        ip: res.data.server.public_net.ipv4?.ip,
        labels: res.data.server.labels,
      };

      const client = await getRedisClient();
      const key = getKeyHetznerRecentlyCreatedServers(projectId);
      await client.lpush(key, JSON.stringify(cachedServer));
      await client.expire(key, 60 * 60 * 2); // Keep for 2 hours

      await setRateLimit(projectId, res);

      const serverId = res.data.server.id;

      if (server.controller) {
        if (!networkId) {
          throw new Error(
            "Network must be created or selected for controller servers.",
          );
        }

        const { error: serverError } = await attachHetznerServerToNetwork(
          projectId,
          serverId,
          {
            networkId: networkId.toString(),
          },
        );

        if (serverError) {
          throw new Error(serverError);
        }
      }

      return res.data.server;
    },
  );
}

export async function createSimpleServerSetup(
  projectId: string,
  data: SimpleServerSetupSchemaType,
): Promise<ServerResponse<HetznerServer>> {
  return doServerActionWithAuth(
    ["hetzner:servers:create", `hetzner:${projectId}:admin`],
    async () => {
      if (data.database?.new) {
        data.database = {
          ...data.database,
          databaseType: "mysql",
          databaseRootPassword: generateRandomString(16),
          databaseUser: generateRandomString(16),
          databasePassword: generateRandomString(16),
        };
      }

      const { server, serverController, database } = data;

      const token = await getApiToken(projectId);

      let networkId: number | undefined = undefined;
      if (server.controller && !database?.networkId) {
        const { data, error } = await createHetznerNetwork(projectId, {
          name: `${server.name}-network-${generateRandomString(8)}`,
          ipRange: "10.0.0.0/16",
          subnets: [
            {
              type: "cloud",
              ipRange: "10.0.0.0/24",
              networkZone: "eu-central",
            },
          ],
        });
        if (error) {
          throw new Error(error);
        }
        networkId = data.id;
      } else if (server.controller) {
        networkId = database?.networkId;
      }

      let databaseId: number | undefined = undefined;
      if (server.controller && database?.new) {
        const { data, error } = await createHetznerDatabase(projectId, {
          ...database,
          databaseType: database.databaseType || "mysql",
          image: "ubuntu-20.04",
          location: server.location,
        });
        if (error) {
          throw new Error(error);
        }
        databaseId = data.id;
      } else if (server.controller && database?.existing) {
        databaseId = parseInt(database.existing);
      }

      const dediData = {
        server_controller: server.controller ? serverController : undefined,
        db: {
          host: database?.databaseIp || "10.0.0.2",
          port: database?.databaseType === "postgres" ? 5432 : 3306,
          name: database?.databaseName,
          user: database?.databaseUser || generateRandomString(16),
          password: database?.databasePassword || generateRandomString(16),
        },
        dedi_login: server.dediLogin,
        dedi_password: server.dediPassword,
        room_password: server.roomPassword,
        superadmin_password: generateRandomString(16),
        admin_password: generateRandomString(16),
        user_password: generateRandomString(16),
        filemanager_password: generateRandomString(16),
      };

      const userData = dediTemplate(dediData);

      const body = {
        name: server.name,
        server_type: server.serverType,
        image: "ubuntu-20.04",
        location: server.location,
        user_data: userData,
        labels: {
          type: "dedi",
          "servercontroller.type": serverController?.type,
          "authorization.superadmin.password": dediData.superadmin_password,
          "authorization.admin.password": dediData.admin_password,
          "authorization.user.password": dediData.user_password,
          "filemanager.password": dediData.filemanager_password,
        },
        public_net: {
          enable_ipv4: true,
          enable_ipv6: false,
        },
      };

      const res = await axiosHetzner.post<{
        server: HetznerServer;
      }>("/servers", body, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const cachedServer: HetznerServerCache = {
        id: res.data.server.id,
        projectId,
        name: res.data.server.name,
        ip: res.data.server.public_net.ipv4?.ip,
        labels: res.data.server.labels,
      };

      const client = await getRedisClient();
      const key = getKeyHetznerRecentlyCreatedServers(projectId);
      await client.lpush(key, JSON.stringify(cachedServer));
      await client.expire(key, 60 * 60 * 2); // Keep for 2 hours

      await setRateLimit(projectId, res);

      const serverId = res.data.server.id;

      if (server.controller && networkId) {
        if (databaseId && !database?.databaseIp) {
          const { error: dbError } = await attachHetznerServerToNetwork(
            projectId,
            databaseId,
            {
              networkId: networkId.toString(),
              ip: dediData.db.host,
            },
          );

          if (dbError) {
            throw new Error(dbError);
          }
        }

        const { error: serverError } = await attachHetznerServerToNetwork(
          projectId,
          serverId,
          {
            networkId: networkId.toString(),
          },
        );

        if (serverError) {
          throw new Error(serverError);
        }
      }

      return res.data.server;
    },
  );
}
