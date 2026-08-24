"use server";

import { AdvancedServerSetupSchemaType } from "@/forms/admin/hetzner/setup-steps/advanced/server-setup-schema";
import { SimpleServerSetupSchemaType } from "@/forms/admin/hetzner/setup-steps/simple/server-setup-schema";
import { TMServerSchemaType } from "@/forms/admin/hetzner/setup-steps/tm-server/tm-server-schema";
import { doServerActionWithAuth } from "@/lib/actions";
import { axiosHetzner } from "@/lib/axios/hetzner";
import { getClient } from "@/lib/dbclient";
import { updateFileManager } from "@/lib/managers/file-manager";
import {
  getKeyHetznerRecentlyCreatedServers,
  getRedisClient,
} from "@/lib/redis";
import { connectToSSHServer, executeSSHScript } from "@/lib/ssh";
import { generateRandomString, getErrorMessage, sleep } from "@/lib/utils";
import { HetznerServer, HetznerServerCache } from "@/types/api/hetzner/servers";
import { ServerError, ServerResponse } from "@/types/responses";
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
import {
  createHetznerSSHKey,
  getApiToken,
  getHetznerServer,
  setRateLimit,
} from "./util";

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
            createServer: data.createServer,
            groupId: data.groupId,
            updateServer: data.updateServer,
            serverId: data.serverId,
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
        const { ok, data, error } = await createHetznerNetwork(
          projectId,
          network,
        );
        if (!ok) {
          la(error);
          throw new ServerError(error, "HetznerNetworkCreationError");
        }
        networkId = data.id;
      } else if (server.controller && network?.existing) {
        networkId = parseInt(network.existing);
      }

      if (!networkId && server.controller && !database?.local) {
        la("Network must be created or selected if the database is not local.");
        throw new ServerError(
          "Network must be created or selected if the database is not local.",
          "HetznerNetworkNotSelected",
        );
      }

      let databaseId: number | undefined = undefined;
      let createdDatabase: HetznerServer | undefined = undefined;
      if (server.controller && database?.new && !database.local) {
        if (!database.name || !database.serverType || !database.location) {
          la(
            "Database name, server type and location is required for new databases.",
          );
          throw new ServerError(
            "Database name, server type and location is required for new databases.",
            "HetznerDatabaseCreationError",
          );
        }

        const { ok, data, error } = await createHetznerDatabase(projectId, {
          ...database,
          name: database.name,
          serverType: database.serverType,
          location: database.location,
          networkId,
        });
        if (!ok) {
          la(error);
          throw new ServerError(error, "HetznerDatabaseCreationError");
        }
        createdDatabase = data;
        databaseId = data.id;
      } else if (server.controller && database?.existing) {
        databaseId = parseInt(database.existing);

        if (!network?.databaseInNetwork) {
          if (!networkId) {
            la("Network must be selected for existing databases.");
            throw new ServerError(
              "Network must be selected for existing databases.",
              "HetznerNetworkNotSelected",
            );
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
            throw new ServerError(
              dbError,
              "HetznerDatabaseNetworkAttachmentError",
            );
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
        dedi_password: server.dediPassword.replace(/\$/g, "$$$$"),
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
        ssh_keys: [
          keys.id,
          ...(server.sshKeys || []).map((id) => parseInt(id)),
        ],
        user_data: userData,
        labels: {
          type: "dedi",
          "0.servercontroller.type": serverController?.type,
          "0.authorization.superadmin.password": dediData.superadmin_password,
          "0.authorization.admin.password": dediData.admin_password,
          "0.authorization.user.password": dediData.user_password,
          "0.filemanager.password": dediData.filemanager_password,
          "0.version": "1",
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

      try {
        if (data.createServer) {
          const db = getClient();
          const newServer = await db.servers.create({
            data: {
              name: cachedServer.name,
              description: "",
              host: cachedServer.ip || "",
              port: cachedServer.port,
              user: "SuperAdmin",
              password: cachedServer.password,
              filemanagerUrl: `http://${cachedServer.ip}:${cachedServer.fm_port}`,
              filemanagerPassword: cachedServer.filemanagerPassword,
              userServers: {
                create: [
                  {
                    userId: session.user.id,
                    role: "Admin",
                  },
                ],
              },
            },
          });

          if (data.groupId) {
            await db.groups.update({
              where: { id: data.groupId },
              data: {
                groupServers: {
                  create: [
                    {
                      serverId: newServer.id,
                    },
                  ],
                },
              },
            });
          }
        } else if (data.updateServer && data.serverId) {
          const db = getClient();
          const existingServer = await db.servers.findUnique({
            where: { id: data.serverId },
          });

          if (!existingServer) {
            throw new ServerError("Server not found", "ServerNotFound");
          }

          await db.servers.update({
            where: { id: data.serverId },
            data: {
              name: cachedServer.name,
              host: cachedServer.ip || "",
              port: cachedServer.port,
              user: "SuperAdmin",
              password: cachedServer.password,
              filemanagerUrl: `http://${cachedServer.ip}:${cachedServer.fm_port}`,
              filemanagerPassword: cachedServer.filemanagerPassword,
            },
          });

          updateFileManager(
            data.serverId,
            `http://${cachedServer.ip}:${cachedServer.fm_port}`,
            cachedServer.filemanagerPassword,
          );
        } else {
          const client = await getRedisClient();
          const key = getKeyHetznerRecentlyCreatedServers(projectId);
          await client.lpush(key, JSON.stringify(cachedServer));
          await client.expire(key, 60 * 60 * 2); // Keep for 2 hours
        }
      } catch (error) {
        la(getErrorMessage(error), res.data.server.id);
      }

      await setRateLimit(projectId, res);

      const serverId = res.data.server.id;

      if (server.controller && !database?.local) {
        if (!networkId) {
          la(
            "Network must be created or selected for controller servers.",
            serverId,
          );
          throw new ServerError(
            "Network must be created or selected for controller servers.",
            "HetznerNetworkNotSelected",
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
          throw new ServerError(
            serverError,
            "HetznerServerNetworkAttachmentError",
          );
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
            createServer: data.createServer,
            groupId: data.groupId,
            updateServer: data.updateServer,
            serverId: data.serverId,
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
        const { ok, data, error } = await createHetznerNetwork(projectId, {
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
        if (!ok) {
          la(error);
          throw new ServerError(error, "HetznerNetworkCreationError");
        }
        networkId = data.id;
      } else if (server.controller) {
        networkId = database?.networkId;
      }

      let databaseId: number | undefined = undefined;
      if (server.controller && database?.new && !database?.local) {
        if (!database.name || !database.serverType) {
          la("Database name and server type is required for new databases.");
          throw new ServerError(
            "Database name and server type is required for new databases.",
            "HetznerDatabaseCreationError",
          );
        }

        const { ok, data, error } = await createHetznerDatabase(projectId, {
          ...database,
          name: database.name,
          serverType: database.serverType,
          databaseType: database.databaseType || "mysql",
          location: server.location,
        });
        if (!ok) {
          la(error);
          throw new ServerError(error, "HetznerDatabaseCreationError");
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
        dedi_password: server.dediPassword.replace(/\$/g, "$$$$"),
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
        ssh_keys: [
          keys.id,
          ...(server.sshKeys || []).map((id) => parseInt(id)),
        ],
        user_data: userData,
        labels: {
          type: "dedi",
          "0.servercontroller.type": serverController?.type,
          "0.authorization.superadmin.password": dediData.superadmin_password,
          "0.authorization.admin.password": dediData.admin_password,
          "0.authorization.user.password": dediData.user_password,
          "0.filemanager.password": dediData.filemanager_password,
          "0.version": "1",
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

      try {
        if (data.createServer) {
          const db = getClient();
          const newServer = await db.servers.create({
            data: {
              name: cachedServer.name,
              description: "",
              host: cachedServer.ip || "",
              port: cachedServer.port,
              user: "SuperAdmin",
              password: cachedServer.password,
              filemanagerUrl: `http://${cachedServer.ip}:${cachedServer.fm_port}`,
              filemanagerPassword: cachedServer.filemanagerPassword,
              userServers: {
                create: [
                  {
                    userId: session.user.id,
                    role: "Admin",
                  },
                ],
              },
            },
          });

          if (data.groupId) {
            await db.groups.update({
              where: { id: data.groupId },
              data: {
                groupServers: {
                  create: [
                    {
                      serverId: newServer.id,
                    },
                  ],
                },
              },
            });
          }
        } else if (data.updateServer && data.serverId) {
          const db = getClient();
          const existingServer = await db.servers.findUnique({
            where: { id: data.serverId },
          });

          if (!existingServer) {
            throw new ServerError("Server not found", "ServerNotFound");
          }

          await db.servers.update({
            where: { id: data.serverId },
            data: {
              name: cachedServer.name,
              host: cachedServer.ip || "",
              port: cachedServer.port,
              user: "SuperAdmin",
              password: cachedServer.password,
              filemanagerUrl: `http://${cachedServer.ip}:${cachedServer.fm_port}`,
              filemanagerPassword: cachedServer.filemanagerPassword,
            },
          });

          updateFileManager(
            data.serverId,
            `http://${cachedServer.ip}:${cachedServer.fm_port}`,
            cachedServer.filemanagerPassword,
          );
        } else {
          const client = await getRedisClient();
          const key = getKeyHetznerRecentlyCreatedServers(projectId);
          await client.lpush(key, JSON.stringify(cachedServer));
          await client.expire(key, 60 * 60 * 2); // Keep for 2 hours
        }
      } catch (error) {
        la(getErrorMessage(error), res.data.server.id);
      }

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
            throw new ServerError(
              dbError,
              "HetznerDatabaseNetworkAttachmentError",
            );
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
          throw new ServerError(
            serverError,
            "HetznerServerNetworkAttachmentError",
          );
        }
      }

      return res.data.server;
    },
  );
}

export async function addTrackmaniaServer(
  projectId: string,
  serverId: number,
  tmServer: TMServerSchemaType,
) {
  return doServerActionWithAuth(
    ["hetzner:servers:create", `hetzner:${projectId}:admin`],
    async (session) => {
      const la = (error?: string, result?: string) =>
        logAudit(
          session.user.id,
          projectId,
          "hetzner.server.create.simple.add",
          {
            id: serverId,
            server: {
              ...tmServer,
              dediPassword: "*****",
            },
            createServer: tmServer.createServer,
            groupId: tmServer.groupId,
            updateServer: tmServer.updateServer,
            serverId: tmServer.serverId,
            result,
          },
          error,
        );

      const hetznerServer = await getHetznerServer(projectId, serverId);

      if (!hetznerServer) {
        la("Server not found");
        throw new ServerError("Server not found", "HetznerServerNotFound");
      }

      const dbHetznerServer = await getDBHetznerServer(serverId);

      if (!dbHetznerServer) {
        la("DB Server not found");
        throw new ServerError("DB Server not found", "DBHetznerServerNotFound");
      }

      if (!dbHetznerServer.privateKey) {
        la("SSH private key not found for the server");
        throw new ServerError(
          "SSH private key not found for the server",
          "SSHPrivateKeyNotFound",
        );
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
        dedi_login: tmServer.dediLogin.replace(/\s+/g, ""),
        dedi_password: tmServer.dediPassword
          .replace(/\$/g, "$$$$")
          .replace(/\s+/g, ""),
        room_password: tmServer.roomPassword?.replace(/\s+/g, ""),
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

      const result = await executeSSHScript(sshConn, script);

      sshConn.end();

      if (result.stderr) {
        // Log last 100 characters of stderr
        la(`Error executing command on server: ${result.stderr.slice(-100)}`);
        throw new ServerError(
          `Error executing command on server: ${result.stderr}`,
          "SSHCommandExecutionError",
        );
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
        [`${serverNumber}.version`]: "1",
      });

      const cachedServer: HetznerServerCache = {
        id: serverId,
        projectId,
        name: `${hetznerServer.name} ${serverNumber + 1}`,
        ip: hetznerServer.public_net.ipv4?.ip,
        port: dediData.xmlrpc_port,
        fm_port: dediData.fm_port,
        password: dediData.superadmin_password,
        filemanagerPassword: dediData.filemanager_password,
      };

      try {
        if (tmServer.createServer) {
          const db = getClient();
          const newServer = await db.servers.create({
            data: {
              name: cachedServer.name,
              description: "",
              host: cachedServer.ip || "",
              port: cachedServer.port,
              user: "SuperAdmin",
              password: cachedServer.password,
              filemanagerUrl: `http://${cachedServer.ip}:${cachedServer.fm_port}`,
              filemanagerPassword: cachedServer.filemanagerPassword,
              userServers: {
                create: [
                  {
                    userId: session.user.id,
                    role: "Admin",
                  },
                ],
              },
            },
          });

          if (tmServer.groupId) {
            await db.groups.update({
              where: { id: tmServer.groupId },
              data: {
                groupServers: {
                  create: [
                    {
                      serverId: newServer.id,
                    },
                  ],
                },
              },
            });
          }
        } else if (tmServer.updateServer && tmServer.serverId) {
          const db = getClient();
          const existingServer = await db.servers.findUnique({
            where: { id: tmServer.serverId },
          });

          if (!existingServer) {
            throw new ServerError("Server not found", "ServerNotFound");
          }

          await db.servers.update({
            where: { id: tmServer.serverId },
            data: {
              name: cachedServer.name,
              host: cachedServer.ip || "",
              port: cachedServer.port,
              user: "SuperAdmin",
              password: cachedServer.password,
              filemanagerUrl: `http://${cachedServer.ip}:${cachedServer.fm_port}`,
              filemanagerPassword: cachedServer.filemanagerPassword,
            },
          });

          updateFileManager(
            tmServer.serverId,
            `http://${cachedServer.ip}:${cachedServer.fm_port}`,
            cachedServer.filemanagerPassword,
          );
        } else {
          const client = await getRedisClient();
          const key = getKeyHetznerRecentlyCreatedServers(projectId);
          await client.lpush(key, JSON.stringify(cachedServer));
          await client.expire(key, 60 * 60 * 2); // Keep for 2 hours
        }
      } catch (error) {
        la(getErrorMessage(error));
      }

      la(undefined, result.stdout);
    },
  );
}

export async function deleteTrackmaniaServer(
  projectId: string,
  serverId: number,
  tmServerNumber: number,
) {
  return doServerActionWithAuth(
    ["hetzner:servers:delete", `hetzner:${projectId}:admin`],
    async (session) => {
      const la = (error?: string, result?: string) =>
        logAudit(
          session.user.id,
          projectId,
          "hetzner.server.delete.simple",
          {
            id: serverId,
            tmServerNumber,
            result,
          },
          error,
        );

      if (isNaN(tmServerNumber)) {
        la("Invalid TM server number");
        throw new ServerError(
          "Invalid TM server number",
          "InvalidTMServerNumber",
        );
      }

      const hetznerServer = await getHetznerServer(projectId, serverId);

      if (!hetznerServer) {
        la("Server not found");
        throw new ServerError("Server not found", "HetznerServerNotFound");
      }

      const dbHetznerServer = await getDBHetznerServer(serverId);

      if (!dbHetznerServer) {
        la("DB Server not found");
        throw new ServerError("DB Server not found", "DBHetznerServerNotFound");
      }

      if (!dbHetznerServer.privateKey) {
        la("SSH private key not found for the server");
        throw new ServerError(
          "SSH private key not found for the server",
          "SSHPrivateKeyNotFound",
        );
      }

      const script = `docker compose -p stack-${tmServerNumber} -f /root/gocontrolpanel-master/hetzner/docker-compose.yml down -v`;

      const sshConn = await connectToSSHServer(
        hetznerServer.public_net.ipv4?.ip || "",
        22,
        "root",
        Buffer.from(dbHetznerServer.privateKey),
      );

      const result = await executeSSHScript(sshConn, script);

      sshConn.end();

      if (result.stderr) {
        la(`Error executing command on server: ${result.stderr.slice(-100)}`);
        throw new ServerError(
          `Error executing command on server: ${result.stderr}`,
          "SSHCommandExecutionError",
        );
      }

      // Remove labels of the deleted TM server
      const newLabels = { ...hetznerServer.labels };
      delete newLabels[`${tmServerNumber}.authorization.admin.password`];
      delete newLabels[`${tmServerNumber}.authorization.superadmin.password`];
      delete newLabels[`${tmServerNumber}.authorization.user.password`];
      delete newLabels[`${tmServerNumber}.filemanager.password`];
      delete newLabels[`${tmServerNumber}.servercontroller.type`];
      delete newLabels[`${tmServerNumber}.version`];

      await updateHetznerServer(projectId, serverId, newLabels);

      la(undefined, result.stdout);
    },
  );
}
