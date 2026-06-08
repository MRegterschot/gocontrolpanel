"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { logger } from "@/lib/logger";
import { connectToSSHServer, executeSSHScript } from "@/lib/ssh";
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
          },
          error,
        );

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

      logger.info(
        `Trackmania server restarted successfully on server ${serverId} (tmServerNumber: ${tmServerNumber}) by user ${session.user.id}`,
      );
      logger.debug(`SSH script output: ${result.stdout}`);
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
          },
          error,
        );

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

      logger.info(
        `Trackmania server stopped successfully on server ${serverId} (tmServerNumber: ${tmServerNumber}) by user ${session.user.id}`,
      );
      logger.debug(`SSH script output: ${result.stdout}`);
    },
  );
}
