import { logAudit } from "@/actions/database/server-only/audit-logs";
import { getDBHetznerServer } from "@/actions/database/server-only/hetzner-servers";
import { getHetznerServer } from "@/actions/hetzner/util";
import { doServerActionWithAuth } from "@/lib/actions";
import { connectToSSHServer, executeSSHScript } from "@/lib/ssh";
import { ServerError, ServerResponse } from "@/types/responses";
import "server-only";

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
        throw new ServerError(
          "Invalid Trackmania server number",
          "InvalidTMServerNumber",
        );
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

      const hetznerServer = await getHetznerServer(projectId, serverId);

      if (!hetznerServer) {
        la("Server not found");
        throw new ServerError("Server not found", "HetznerServerNotFound");
      }

      const labels = hetznerServer.labels || {};
      const serverControllerType =
        labels[`${tmServerNumber}.servercontroller.type`];

      if (command === "servercontroller" && !serverControllerType) {
        la("Server controller not configured for this server");
        throw new ServerError(
          "Server controller not configured for this server",
          "ServerControllerNotConfigured",
        );
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
        throw new ServerError(
          `Error executing command on server: ${result.stderr}`,
          "SSHCommandExecutionError",
        );
      }

      la();

      return result.stdout;
    },
  );
}
