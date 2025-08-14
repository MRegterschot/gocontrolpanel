import { generateKeyPairSync } from "crypto";
import "server-only";
import { Client } from "ssh2";
import sshpk from "sshpk";

export function generateSSHKeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "pkcs1", format: "pem" },
    privateKeyEncoding: { type: "pkcs1", format: "pem" },
  });

  // Convert public key to OpenSSH format (ssh-rsa AAAAB3...)
  const pubKeySSH = sshpk.parseKey(publicKey, "pem").toString("ssh");

  return {
    publicKey: pubKeySSH,
    privateKey,
  };
}

export function connectToSSHServer(
  host: string,
  port: number,
  username: string,
  privateKey: string | Buffer,
): Promise<Client> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn
      .on("ready", () => resolve(conn))
      .on("error", (err: Error) => reject(err))
      .connect({
        host,
        port,
        username,
        privateKey,
      });
  });
}

export async function executeSSHCommand(
  conn: Client,
  command: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let stdoutData = "";
    let stderrData = "";

    conn.exec(command, (err, stream) => {
      if (err) return reject(err);

      stream
        .on("close", (code: number) => {
          if (code === 0) {
            resolve(stdoutData);
          } else {
            const errorMessage = [
              `Command failed with exit code ${code}`,
              "STDOUT:",
              stdoutData.trim(),
              "STDERR:",
              stderrData.trim(),
            ].join("\n");
            reject(new Error(errorMessage));
          }
        })
        .on("data", (data: Buffer) => {
          stdoutData += data.toString();
        })
        .stderr.on("data", (data: Buffer) => {
          stderrData += data.toString();
        });
    });
  });
}

export async function waitForVolumePath(
  conn: Client,
  volumePath: string,
  timeoutMs = 5000,
  intervalMs = 500,
) {
  const start = Date.now();
  while (true) {
    try {
      const output = await executeSSHCommand(
        conn,
        `[ -b ${volumePath} ] && echo "exists" || echo "missing"`,
      );
      if (output.trim() === "exists") return;
    } catch {
      // Ignore command errors, just retry
    }

    if (Date.now() - start > timeoutMs) {
      throw new Error(`Volume device ${volumePath} did not appear within ${timeoutMs}ms`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}