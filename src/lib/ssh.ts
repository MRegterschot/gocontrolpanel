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

export function executeSSHScript(
  conn: Client,
  script: string,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    conn.exec("bash -s", (err, stream) => {
      if (err) return reject(err);

      let stdout = "";
      let stderr = "";

      stream
        .on("close", (code: number) => {
          if (code === 0) resolve({ stdout, stderr });
          else reject(new Error(stderr));
        })
        .on("data", (data: Buffer) => {
          stdout += data.toString();
        });

      stream.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      stream.end(script);
    });
  });
}
