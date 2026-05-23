"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { logger } from "@/lib/logger";
import { connectToSSHServer, executeSSHScript } from "@/lib/ssh";
import { logAudit } from "../database/server-only/audit-logs";
import { getDBHetznerServer } from "../database/server-only/hetzner-servers";
import { getHetznerServer } from "./util";

export async function updateTrackmaniaServer(
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
          "hetzner.server.manage.updateTrackmaniaServer",
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

      const imageName = "evoesports/trackmania:latest";

      let script = `docker pull ${imageName}`;

      if (tmServerNumber === -1) {
        script += ` && for c in $(docker ps -q --filter ancestor=${imageName}); do project=$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.project" }}' $c); workdir=$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.project.working_dir" }}' $c); compose=$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.project.config_files" }}' $c); docker compose -p "$project" -f "$workdir/$compose" up -d; done`;
      } else {
        script += ` && TM_PORT=${2350 + tmServerNumber} TM_XMLRPC_PORT=${5000 + tmServerNumber} docker compose -p stack-${tmServerNumber} -f /root/gocontrolpanel-master/hetzner/docker-compose.yml up -d`;
      }

      // script = "docker ps";

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
        `Trackmania server updated successfully on server ${serverId} (tmServerNumber: ${tmServerNumber}) by user ${session.user.id}`,
      );
      logger.debug(`SSH script output: ${result.stdout}`);
    },
  );
}
