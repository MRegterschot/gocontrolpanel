"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { connectToSSHServer, executeSSHScript } from "@/lib/ssh";
import { ServerResponse } from "@/types/responses";
import { logAudit } from "../database/server-only/audit-logs";
import { getDBHetznerServer } from "../database/server-only/hetzner-servers";
import { getHetznerServer } from "./util";

export async function restartTrackmaniaServer(
  projectId: string,
  serverId: number,
  tmServerNumber: number,
) {
  return doServerActionWithAuth(
    ["hetzner:servers:manage", `hetzner:${projectId}:admin`],
    async (session) => {
      const la = (error?: string) =>
        logAudit(
          session.user.id,
          projectId,
          "hetzner.server.manage.restartTrackmaniaServer",
          {
            id: serverId,
            tmServerNumber,
          },
          error,
        );

      if (isNaN(tmServerNumber)) {
        la("Invalid Trackmania server number");
        throw new Error("Invalid Trackmania server number");
      }

      const hetznerServer = await getHetznerServer(projectId, serverId);

      if (!hetznerServer) {
        la("Server not found");
        throw new Error("Server not found");
      }

      const labels = hetznerServer.labels || {};

      if (parseInt(labels[`${tmServerNumber}.version`] || "0") < 1) {
        la("Server version is outdated");
        throw new Error("Server version is outdated");
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

      const script = `~/gocontrolpanel-master/hetzner/stack-${tmServerNumber}/restart.sh`;

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
        throw new Error(`Error executing command on server: ${result.stderr}`);
      }

      la();
    },
  );
}

export async function stopTrackmaniaServer(
  projectId: string,
  serverId: number,
  tmServerNumber: number,
) {
  return doServerActionWithAuth(
    ["hetzner:servers:manage", `hetzner:${projectId}:admin`],
    async (session) => {
      const la = (error?: string) =>
        logAudit(
          session.user.id,
          projectId,
          "hetzner.server.manage.stopTrackmaniaServer",
          {
            id: serverId,
            tmServerNumber,
          },
          error,
        );

      if (isNaN(tmServerNumber)) {
        la("Invalid Trackmania server number");
        throw new Error("Invalid Trackmania server number");
      }

      const hetznerServer = await getHetznerServer(projectId, serverId);

      if (!hetznerServer) {
        la("Server not found");
        throw new Error("Server not found");
      }

      const labels = hetznerServer.labels || {};

      if (parseInt(labels[`${tmServerNumber}.version`] || "0") < 1) {
        la("Server version is outdated");
        throw new Error("Server version is outdated");
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

      const script = `~/gocontrolpanel-master/hetzner/stack-${tmServerNumber}/down.sh`;

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
        throw new Error(`Error executing command on server: ${result.stderr}`);
      }

      la();
    },
  );
}

export async function getLogs(
  projectId: string,
  serverId: number,
  tmServerNumber: number,
  command: "dedicated" | "filemanager" | "servercontroller" = "dedicated",
): Promise<ServerResponse<string>> {
  return doServerActionWithAuth(
    ["hetzner:servers:manage", `hetzner:${projectId}:admin`],
    async (session) => {
      const la = (error?: string) =>
        logAudit(
          session.user.id,
          projectId,
          "hetzner.server.manage.logs",
          {
            id: serverId,
            tmServerNumber,
          },
          error,
        );

      if (isNaN(tmServerNumber)) {
        la("Invalid Trackmania server number");
        throw new Error("Invalid Trackmania server number");
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

      const hetznerServer = await getHetznerServer(projectId, serverId);

      if (!hetznerServer) {
        la("Server not found");
        throw new Error("Server not found");
      }

      const labels = hetznerServer.labels || {};
      const serverControllerType =
        labels[`${tmServerNumber}.servercontroller.type`];

      if (command === "servercontroller" && !serverControllerType) {
        la("Server controller not configured for this server");
        throw new Error("Server controller not configured for this server");
      }

      const commands = {
        dedicated: `docker logs --tail 500 stack-${tmServerNumber}-dedicated-1`,
        filemanager: `docker logs --tail 500 stack-${tmServerNumber}-filemanager-1`,
        servercontroller: `docker logs --tail 500 stack-${tmServerNumber}-${serverControllerType}-1`,
      } as const;

      const sshConn = await connectToSSHServer(
        hetznerServer.public_net.ipv4?.ip || "",
        22,
        "root",
        Buffer.from(dbHetznerServer.privateKey),
      );

      const result = await executeSSHScript(sshConn, commands[command]);

      sshConn.end();

      if (result.stderr) {
        la(`Error executing command on server: ${result.stderr.slice(-100)}`);
        throw new Error(`Error executing command on server: ${result.stderr}`);
      }

      la();

      return result.stdout;
    },
  );
}
