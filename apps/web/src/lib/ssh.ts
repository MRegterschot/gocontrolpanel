import { ServerError } from "@/types/responses";
import { createHash, generateKeyPairSync } from "crypto";
import "server-only";
import { Client } from "ssh2";
import sshpk from "sshpk";
import { getClient } from "./dbclient";

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

export function hostKeyFingerprint(key: Buffer): string {
  return `SHA256:${createHash("sha256").update(key).digest("base64").replace(/=+$/, "")}`;
}

// The host key a provisioned server must present. Hetzner doesn't publish host keys, so the
// first connection pins it (trust on first use) and every later one must match.
export interface HostKeyPin {
  hetznerId: number;
  hostKeyFingerprint: string | null;
}

export function connectToSSHServer(
  host: string,
  port: number,
  username: string,
  privateKey: string | Buffer,
  pin: HostKeyPin,
): Promise<Client> {
  let presented: string | null = null;
  return new Promise<Client>((resolve, reject) => {
    const conn = new Client();
    conn
      .on("ready", () => resolve(conn))
      .on("error", (err: Error) =>
        reject(
          presented && pin.hostKeyFingerprint
            ? new ServerError(
                `The server's SSH host key changed (expected ${pin.hostKeyFingerprint}, got ${presented}). If it was rebuilt, clear the stored fingerprint.`,
                "SSHHostKeyMismatch",
              )
            : err,
        ),
      )
      .connect({
        host,
        port,
        username,
        privateKey,
        readyTimeout: 20_000,
        hostVerifier: (key: Buffer) => {
          presented = hostKeyFingerprint(key);
          return (
            !pin.hostKeyFingerprint || presented === pin.hostKeyFingerprint
          );
        },
      });
  }).then(async (conn) => {
    if (!pin.hostKeyFingerprint && presented) {
      await getClient().hetznerServers.updateMany({
        where: { hetznerId: pin.hetznerId, hostKeyFingerprint: null },
        data: { hostKeyFingerprint: presented },
      });
    }
    return conn;
  });
}

export function executeSSHScript(
  conn: Client,
  script: string,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    conn.exec("bash -s 2>&1", (err, stream) => {
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

// Like executeSSHScript, but always returns the combined output and exit code, even on failure
export function runSSHScript(
  conn: Client,
  script: string,
  args: string[] = [],
): Promise<{ output: string; code: number | null }> {
  // Arguments are fixed by the caller, but quote them anyway
  const quoted = args.map((arg) => `'${arg.replace(/'/g, `'\\''`)}'`).join(" ");
  return new Promise((resolve, reject) => {
    conn.exec(`bash -s -- ${quoted} 2>&1`, (err, stream) => {
      if (err) return reject(err);

      let output = "";
      stream
        .on("close", (code: number | null) => resolve({ output, code }))
        .on("data", (data: Buffer) => {
          output += data.toString();
        });
      stream.stderr.on("data", (data: Buffer) => {
        output += data.toString();
      });

      stream.end(script);
    });
  });
}
