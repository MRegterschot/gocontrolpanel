"use server";

import { AdvancedServerSetupSchemaType } from "@/forms/admin/hetzner/setup-steps/advanced/server-setup-schema";
import { SimpleServerSetupSchemaType } from "@/forms/admin/hetzner/setup-steps/simple/server-setup-schema";
import { TMServerSchemaType } from "@/forms/admin/hetzner/setup-steps/tm-server/tm-server-schema";
import { doServerActionWithAuth } from "@/lib/actions";
import { axiosHetzner } from "@/lib/axios/hetzner";
import { logger } from "@/lib/logger";
import {
  getKeyHetznerRecentlyCreatedServers,
  getRedisClient,
} from "@/lib/redis";
import { connectToSSHServer, executeSSHScript } from "@/lib/ssh";
import { generateRandomString, sleep } from "@/lib/utils";
import { HetznerServer, HetznerServerCache } from "@/types/api/hetzner/servers";
import { ServerResponse } from "@/types/responses";
import { logAudit } from "../database/server-only/audit-logs";
import {
  createDBHetznerServer,
  getDBHetznerServer,
} from "../database/server-only/hetzner-servers";
import { createHetznerNetwork } from "./networks";
import {
  attachHetznerServerToNetwork,
  createHetznerDatabase,
  dediTemplate,
  tmServerTemplate,
  updateHetznerServer,
} from "./servers";
import { createHetznerSSHKey } from "./ssh-keys";
import { getApiToken, getHetznerServer, setRateLimit } from "./util";

export async function createAdvancedServerSetup(
  projectId: string,
  data: AdvancedServerSetupSchemaType,
): Promise<ServerResponse<HetznerServer>> {
  return doServerActionWithAuth(
    ["hetzner:servers:create", `hetzner:${projectId}:admin`],
    async (session) => {
      const la = (error?: string, id?: number) =>
        logAudit(
          session.user.id,
          projectId,
          "hetzner.server.create.advanced",
          {
            id,
            server: {
              ...data.server,
              dediPassword: "*****",
              superAdminPassword: data.server.superAdminPassword
                ? "*****"
                : undefined,
              adminPassword: data.server.adminPassword ? "*****" : undefined,
              userPassword: data.server.userPassword ? "*****" : undefined,
              filemanagerPassword: data.server.filemanagerPassword
                ? "*****"
                : undefined,
            },
            serverController: {
              ...data.serverController,
              secret:
                data.serverController && "secret" in data.serverController
                  ? "*****"
                  : undefined,
            },
            database: {
              ...data.database,
              databaseRootPassword: data.database?.databaseRootPassword
                ? "*****"
                : undefined,
              databasePassword: data.database?.databasePassword
                ? "*****"
                : undefined,
            },
            network: data.network,
          },
          error,
        );

      if (data.database?.new) {
        data.database = {
          ...data.database,
          databaseName:
            data.database.databaseName ||
            data.database.name ||
            data.server.name,
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
      if (server.controller && network?.new && !database?.local) {
        const { data, error } = await createHetznerNetwork(projectId, network);
        if (error) {
          la(error);
          throw new Error(error);
        }
        networkId = data.id;
      } else if (server.controller && network?.existing) {
        networkId = parseInt(network.existing);
      }

      if (!networkId && server.controller && !database?.local) {
        la("Network must be created or selected if the database is not local.");
        throw new Error(
          "Network must be created or selected if the database is not local.",
        );
      }

      let databaseId: number | undefined = undefined;
      let createdDatabase: HetznerServer | undefined = undefined;
      if (server.controller && database?.new && !database.local) {
        if (!database.name || !database.serverType || !database.location) {
          la(
            "Database name, server type and location is required for new databases.",
          );
          throw new Error(
            "Database name, server type and location is required for new databases.",
          );
        }

        const { data, error } = await createHetznerDatabase(projectId, {
          ...database,
          name: database.name,
          serverType: database.serverType,
          location: database.location,
          networkId,
        });
        if (error) {
          la(error);
          throw new Error(error);
        }
        createdDatabase = data;
        databaseId = data.id;
      } else if (server.controller && database?.existing) {
        databaseId = parseInt(database.existing);

        if (!network?.databaseInNetwork) {
          if (!networkId) {
            la("Network must be selected for existing databases.");
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
            la(dbError);
            throw new Error(dbError);
          }
        }
      }

      const dediData = {
        server_controller: server.controller ? serverController : undefined,
        db: {
          type: database?.databaseType || "mysql",
          host:
            createdDatabase?.private_net.find(
              (net) => net.network === networkId,
            )?.ip ||
            network?.databaseIp ||
            "",
          port: database?.databaseType === "postgres" ? 5432 : 3306,
          name: database?.databaseName || database?.name || data.server.name,
          user: database?.databaseUser || generateRandomString(16),
          password: database?.databasePassword || generateRandomString(16),
          root_password:
            database?.databaseRootPassword || generateRandomString(16),
          local: database?.local || false,
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
        port: 2350,
        xmlrpc_port: 5000,
        fm_port: 3300,
        stack_name: "stack-0",
      };

      const userData = dediTemplate(dediData);

      const keyName = `advanced-${server.name}-${generateRandomString(8)}`;
      const keys = await createHetznerSSHKey(projectId, keyName);

      const body = {
        name: server.name,
        server_type: server.serverType,
        image: "ubuntu-22.04",
        location: server.location,
        ssh_keys: [keys.id],
        user_data: userData,
        labels: {
          type: "dedi",
          "0.servercontroller.type": serverController?.type,
          "0.authorization.superadmin.password": dediData.superadmin_password,
          "0.authorization.admin.password": dediData.admin_password,
          "0.authorization.user.password": dediData.user_password,
          "0.filemanager.password": dediData.filemanager_password,
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

      await createDBHetznerServer({
        hetznerId: res.data.server.id,
        publicKey: keys.publicKey,
        privateKey: keys.privateKey,
      });

      la(undefined, res.data.server.id);

      const cachedServer: HetznerServerCache = {
        id: res.data.server.id,
        projectId,
        name: res.data.server.name,
        ip: res.data.server.public_net.ipv4?.ip,
        port: dediData.xmlrpc_port,
        fm_port: dediData.fm_port,
        password: dediData.superadmin_password,
        filemanagerPassword: dediData.filemanager_password,
      };

      const client = await getRedisClient();
      const key = getKeyHetznerRecentlyCreatedServers(projectId);
      await client.lpush(key, JSON.stringify(cachedServer));
      await client.expire(key, 60 * 60 * 2); // Keep for 2 hours

      await setRateLimit(projectId, res);

      const serverId = res.data.server.id;

      if (server.controller && !database?.local) {
        if (!networkId) {
          la(
            "Network must be created or selected for controller servers.",
            serverId,
          );
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
          la(serverError, serverId);
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
    async (session) => {
      const la = (error?: string, id?: number) =>
        logAudit(
          session.user.id,
          projectId,
          "hetzner.server.create.simple",
          {
            id,
            server: {
              ...data.server,
              dediPassword: "*****",
            },
            serverController: {
              ...data.serverController,
              secret:
                data.serverController && "secret" in data.serverController
                  ? "*****"
                  : undefined,
            },
            database: {
              ...data.database,
              databaseRootPassword: data.database?.databaseRootPassword
                ? "*****"
                : undefined,
              databasePassword: data.database?.databasePassword
                ? "*****"
                : undefined,
            },
          },
          error,
        );

      if (data.database?.new) {
        data.database = {
          ...data.database,
          databaseName:
            data.database.databaseName ||
            data.database.name ||
            data.server.name,
          databaseType: "mysql",
          databaseRootPassword: generateRandomString(16),
          databaseUser: generateRandomString(16),
          databasePassword: generateRandomString(16),
        };
      }

      const { server, serverController, database } = data;

      const token = await getApiToken(projectId);

      let networkId: number | undefined = undefined;
      if (server.controller && !database?.networkId && !database?.local) {
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
          la(error);
          throw new Error(error);
        }
        networkId = data.id;
      } else if (server.controller) {
        networkId = database?.networkId;
      }

      let databaseId: number | undefined = undefined;
      if (server.controller && database?.new && !database?.local) {
        if (!database.name || !database.serverType) {
          la("Database name and server type is required for new databases.");
          throw new Error(
            "Database name and server type is required for new databases.",
          );
        }

        const { data, error } = await createHetznerDatabase(projectId, {
          ...database,
          name: database.name,
          serverType: database.serverType,
          databaseType: database.databaseType || "mysql",
          location: server.location,
        });
        if (error) {
          la(error);
          throw new Error(error);
        }
        databaseId = data.id;
      } else if (server.controller && database?.existing) {
        databaseId = parseInt(database.existing);
      }

      const dediData = {
        server_controller: server.controller ? serverController : undefined,
        db: {
          type: database?.databaseType || "mysql",
          host: database?.databaseIp || "10.0.0.2",
          port: database?.databaseType === "postgres" ? 5432 : 3306,
          name: database?.databaseName || database?.name || data.server.name,
          user: database?.databaseUser || generateRandomString(16),
          password: database?.databasePassword || generateRandomString(16),
          root_password:
            database?.databaseRootPassword || generateRandomString(16),
          local: database?.local || false,
        },
        dedi_login: server.dediLogin,
        dedi_password: server.dediPassword,
        room_password: server.roomPassword,
        superadmin_password: generateRandomString(16),
        admin_password: generateRandomString(16),
        user_password: generateRandomString(16),
        filemanager_password: generateRandomString(16),
        port: 2350,
        xmlrpc_port: 5000,
        fm_port: 3300,
        stack_name: "stack-0",
      };

      const userData = dediTemplate(dediData);

      const keyName = `simple-${server.name}-${generateRandomString(8)}`;
      const keys = await createHetznerSSHKey(projectId, keyName);

      const body = {
        name: server.name,
        server_type: server.serverType,
        image: "ubuntu-22.04",
        location: server.location,
        ssh_keys: [keys.id],
        user_data: userData,
        labels: {
          type: "dedi",
          "0.servercontroller.type": serverController?.type,
          "0.authorization.superadmin.password": dediData.superadmin_password,
          "0.authorization.admin.password": dediData.admin_password,
          "0.authorization.user.password": dediData.user_password,
          "0.filemanager.password": dediData.filemanager_password,
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

      await createDBHetznerServer({
        hetznerId: res.data.server.id,
        publicKey: keys.publicKey,
        privateKey: keys.privateKey,
      });

      la(undefined, res.data.server.id);

      const cachedServer: HetznerServerCache = {
        id: res.data.server.id,
        projectId,
        name: res.data.server.name,
        ip: res.data.server.public_net.ipv4?.ip,
        port: dediData.xmlrpc_port,
        fm_port: dediData.fm_port,
        password: dediData.superadmin_password,
        filemanagerPassword: dediData.filemanager_password,
      };

      const client = await getRedisClient();
      const key = getKeyHetznerRecentlyCreatedServers(projectId);
      await client.lpush(key, JSON.stringify(cachedServer));
      await client.expire(key, 60 * 60 * 2); // Keep for 2 hours

      await setRateLimit(projectId, res);

      const serverId = res.data.server.id;

      if (server.controller && networkId && !database?.local) {
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
            la(dbError, serverId);
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
          la(serverError, serverId);
          throw new Error(serverError);
        }
      }

      return res.data.server;
    },
  );
}

export async function addSimpleServer(
  projectId: string,
  serverId: number,
  tmServer: TMServerSchemaType,
) {
  return doServerActionWithAuth(
    ["hetzner:servers:create", `hetzner:${projectId}:admin`],
    async (session) => {
      const la = (error?: string) =>
        logAudit(
          session.user.id,
          projectId,
          "hetzner.server.create.simple.add",
          {
            id: serverId,
          },
          error,
        );

      const hetznerServer = await getHetznerServer(projectId, serverId);

      if (!hetznerServer) {
        la("Server not found");
        throw new Error("Server not found");
      }

      const dbHetznerServer = await getDBHetznerServer(serverId);

      if (!dbHetznerServer) {
        la("DB Server not found");
        throw new Error("DB Server not found");
      }

      if (!dbHetznerServer.privateKey) {
        la("SSH private key not found for the server");
        throw new Error("SSH private key not found for the server");
      }

      const tmServers: number[] = [];
      Object.keys(hetznerServer.labels).forEach((key) => {
        const match = key.match(/^(\d+)\./);
        if (match) {
          tmServers.push(parseInt(match[1]));
        }
      });

      // Highest id of tmServers + 1, to get the next server number
      const serverNumber =
        tmServers.length > 0 ? Math.max(...tmServers) + 1 : 1;

      const dediData = {
        dedi_login: tmServer.dediLogin,
        dedi_password: tmServer.dediPassword,
        room_password: tmServer.roomPassword,
        superadmin_password: generateRandomString(16),
        admin_password: generateRandomString(16),
        user_password: generateRandomString(16),
        filemanager_password: generateRandomString(16),
        port: 2350 + serverNumber,
        xmlrpc_port: 5000 + serverNumber,
        fm_port: 3300 + serverNumber,
        stack_name: `stack-${serverNumber}`,
      };

      const script = tmServerTemplate(dediData);

      const sshConn = await connectToSSHServer(
        hetznerServer.public_net.ipv4?.ip || "",
        22,
        "root",
        Buffer.from(dbHetznerServer.privateKey),
      );

      // Test command, docker ps
      const result = await executeSSHScript(sshConn, script);

      sshConn.end();

      if (result.stderr) {
        // Log last 100 characters of stderr
        la(`Error executing command on server: ${result.stderr.slice(-100)}`);
        throw new Error(`Error executing command on server: ${result.stderr}`);
      }

      // Add new labels to the server for the new TM server
      await updateHetznerServer(projectId, serverId, {
        ...hetznerServer.labels,
        [`${serverNumber}.authorization.admin.password`]:
          dediData.admin_password,
        [`${serverNumber}.authorization.superadmin.password`]:
          dediData.superadmin_password,
        [`${serverNumber}.authorization.user.password`]: dediData.user_password,
        [`${serverNumber}.filemanager.password`]: dediData.filemanager_password,
      });

      const cachedServer: HetznerServerCache = {
        id: serverId,
        projectId,
        name: `${hetznerServer.name} ${serverNumber}`,
        ip: hetznerServer.public_net.ipv4?.ip,
        port: dediData.xmlrpc_port,
        fm_port: dediData.fm_port,
        password: dediData.superadmin_password,
        filemanagerPassword: dediData.filemanager_password,
      };

      const client = await getRedisClient();
      const key = getKeyHetznerRecentlyCreatedServers(projectId);
      await client.lpush(key, JSON.stringify(cachedServer));
      await client.expire(key, 60 * 60 * 2); // Keep for 2 hours

      logger.info(
        `Added new TM server to Hetzner server ${serverId} with dedi login ${tmServer.dediLogin}`,
      );
      logger.debug(`SSH script output: ${result.stdout}`);
    },
  );
}
