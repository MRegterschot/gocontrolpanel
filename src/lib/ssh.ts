import { generateKeyPairSync } from "crypto";
import sshpk from "sshpk";
import "server-only";
import { Client } from "ssh2";

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
    let output = "";
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      stream
        .on("close", () => resolve(output))
        .on("data", (data: Buffer) => {
          output += data.toString();
        })
        .stderr.on("data", (data: Buffer) => {
          reject(new Error(data.toString()));
        });
    });
  });
}