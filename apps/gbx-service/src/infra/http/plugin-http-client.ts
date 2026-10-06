import { lookup, type LookupAddress } from "node:dns";
import { request } from "node:https";
import { BlockList, isIP } from "node:net";
import type {
  PluginHttpClient,
  PluginHttpRequest,
  PluginHttpResponse,
} from "../../core/ports";

// Plugins reach only the hosts they declared, and never an address inside the network the
// service runs in (Redis and the database usually have no password there).
const privateRanges = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  privateRanges.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  privateRanges.addSubnet(network, prefix, "ipv6");
}

export function isPrivateAddress(address: string): boolean {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (mapped) return privateRanges.check(mapped[1], "ipv4");
  const family = isIP(address);
  if (family === 0) return true;
  return privateRanges.check(address, family === 4 ? "ipv4" : "ipv6");
}

type LookupCallback = (
  error: NodeJS.ErrnoException | null,
  address: string | LookupAddress[],
  family?: number,
) => void;

// DNS lookup that fails for private addresses, used for the actual connection so a
// rebinding name can't slip past an earlier check
function publicLookup(hostname: string, options: { all?: boolean }, callback: LookupCallback) {
  lookup(hostname, { all: true }, (error, addresses) => {
    if (error) return callback(error, []);
    const blocked = addresses.find((entry) => isPrivateAddress(entry.address));
    if (blocked || addresses.length === 0) {
      return callback(
        Object.assign(new Error(`${hostname} resolves to a private address`), { code: "EPRIVATE" }),
        [],
      );
    }
    if (options.all) callback(null, addresses);
    else callback(null, addresses[0].address, addresses[0].family);
  });
}

export class HttpsPluginClient implements PluginHttpClient {
  constructor(private readonly userAgent = "GoControlPanel-Plugin") {}

  fetch(input: PluginHttpRequest): Promise<PluginHttpResponse> {
    const url = new URL(input.url);
    if (url.protocol !== "https:") return Promise.reject(new Error("Only https:// URLs are allowed"));
    if (isIP(url.hostname.replace(/^\[|\]$/g, "")) !== 0) {
      return Promise.reject(new Error("Requests must use a host name, not an IP address"));
    }

    return new Promise((resolve, reject) => {
      const req = request(
        url,
        {
          method: input.method,
          headers: { "user-agent": this.userAgent, ...input.headers },
          lookup: publicLookup as never,
          timeout: input.timeoutMs,
        },
        (res) => {
          const chunks: Buffer[] = [];
          let size = 0;
          res.on("data", (chunk: Buffer) => {
            size += chunk.length;
            if (size > input.maxResponseBytes) {
              req.destroy(new Error(`The response is larger than ${input.maxResponseBytes / 1024} KB`));
              return;
            }
            chunks.push(chunk);
          });
          res.on("end", () => {
            const headers: Record<string, string> = {};
            for (const [name, value] of Object.entries(res.headers)) {
              if (value !== undefined) headers[name] = Array.isArray(value) ? value.join(", ") : value;
            }
            resolve({
              status: res.statusCode ?? 0,
              headers,
              body: Buffer.concat(chunks).toString("utf8"),
            });
          });
          res.on("error", reject);
        },
      );

      const deadline = setTimeout(
        () => req.destroy(new Error(`No answer within ${input.timeoutMs / 1000} s`)),
        input.timeoutMs,
      );
      req.on("timeout", () => req.destroy(new Error(`No answer within ${input.timeoutMs / 1000} s`)));
      req.on("error", reject);
      req.on("close", () => clearTimeout(deadline));
      if (input.body !== undefined) req.write(input.body);
      req.end();
    });
  }
}
