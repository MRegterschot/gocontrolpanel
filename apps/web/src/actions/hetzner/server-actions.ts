"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { readFileSync } from "fs";
import path from "path";
import { packageDirectorySync } from "pkg-dir";
import { connectToSSHServer, executeSSHScript, runSSHScript } from "@/lib/ssh";
import { ServerError, ServerResponse } from "@/types/responses";
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
        throw new ServerError("Invalid Trackmania server number", "InvalidTMServerNumber");
      }

      const hetznerServer = await getHetznerServer(projectId, serverId);

      if (!hetznerServer) {
        la("Server not found");
        throw new ServerError("Server not found", "HetznerServerNotFound");
      }

      const labels = hetznerServer.labels || {};

      if (parseInt(labels[`${tmServerNumber}.version`] || "0") < 1) {
        la("Server version is outdated");
        throw new ServerError("Server version is outdated", "OutdatedServerVersion");
      }

      const dbHetznerServer = await getDBHetznerServer(serverId);

      if (!dbHetznerServer) {
        la("DB Server not found");
        throw new ServerError("DB Server not found", "DBHetznerServerNotFound");
      }

      if (!dbHetznerServer.privateKey) {
        la("SSH private key not found for the server");
        throw new ServerError("SSH private key not found for the server", "SSHPrivateKeyNotFound");
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
        throw new ServerError(`Error executing command on server: ${result.stderr}`, "SSHCommandExecutionError");
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
        throw new ServerError("Invalid Trackmania server number", "InvalidTMServerNumber");
      }

      const hetznerServer = await getHetznerServer(projectId, serverId);

      if (!hetznerServer) {
        la("Server not found");
        throw new ServerError("Server not found", "HetznerServerNotFound");
      }

      const labels = hetznerServer.labels || {};

      if (parseInt(labels[`${tmServerNumber}.version`] || "0") < 1) {
        la("Server version is outdated");
        throw new ServerError("Server version is outdated", "OutdatedServerVersion");
      }

      const dbHetznerServer = await getDBHetznerServer(serverId);

      if (!dbHetznerServer) {
        la("DB Server not found");
        throw new ServerError("DB Server not found", "DBHetznerServerNotFound");
      }

      if (!dbHetznerServer.privateKey) {
        la("SSH private key not found for the server");
        throw new ServerError("SSH private key not found for the server", "SSHPrivateKeyNotFound");
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
        throw new ServerError(`Error executing command on server: ${result.stderr}`, "SSHCommandExecutionError");
      }

      la();
    },
  );
}

// Pulls the latest image and recreates that container in every running stack on the server
export async function updateServerContainers(
  projectId: string,
  serverId: number,
  target: "filemanager" | "trackmania",
): Promise<ServerResponse<{ output: string; success: boolean }>> {
  return doServerActionWithAuth(
    ["hetzner:servers:manage", `hetzner:${projectId}:admin`],
    async (session) => {
      if (target !== "filemanager" && target !== "trackmania") {
        throw new ServerError("Invalid update target", "InvalidUpdateTarget");
      }

      const la = (error?: string) =>
        logAudit(
          session.user.id,
          projectId,
          `hetzner.server.manage.update${target === "filemanager" ? "FileManagers" : "TrackmaniaServers"}`,
          { id: serverId },
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

      const script = readFileSync(
        path.join(
          packageDirectorySync() || process.cwd(),
          "hetzner",
          "update-containers.sh",
        ),
        "utf-8",
      );

      const sshConn = await connectToSSHServer(
        hetznerServer.public_net.ipv4?.ip || "",
        22,
        "root",
        Buffer.from(dbHetznerServer.privateKey),
      );

      try {
        const { output, code } = await runSSHScript(
          sshConn,
          script,
          ["--target", target],
        );
        await la(code === 0 ? undefined : `Update failed with exit code ${code}`);
        return { output, success: code === 0 };
      } finally {
        sshConn.end();
      }
    },
  );
}
