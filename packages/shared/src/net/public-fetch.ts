import { lookup, type LookupAddress } from "node:dns";
import { request } from "node:https";
import { BlockList, isIP } from "node:net";

// Outbound requests to hosts named by users or third parties. They may only reach public
// addresses: never the panel's network, where Redis and the database usually have no password.

// Separate lists: BlockList also matches IPv4 addresses against IPv4-compatible IPv6 rules
const privateV4 = new BlockList();
const privateV6 = new BlockList();
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
  privateV4.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  // IPv4-compatible, NAT64 and 6to4 addresses can carry an internal IPv4 address
  ["::", 96],
  ["::ffff:0:0", 96],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["2002::", 16],
  ["100::", 64],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8],
] as const) {
  privateV6.addSubnet(network, prefix, "ipv6");
}

export function isPrivateAddress(address: string): boolean {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (mapped) return privateV4.check(mapped[1], "ipv4");
  const family = isIP(address);
  if (family === 0) return true;
  return family === 4
    ? privateV4.check(address, "ipv4")
    : privateV6.check(address, "ipv6");
}

type LookupCallback = (
  error: NodeJS.ErrnoException | null,
  address: string | LookupAddress[],
  family?: number,
) => void;

// DNS lookup that fails for private addresses, used for the actual connection so a
// rebinding name can't slip past an earlier check
export function publicLookup(
  hostname: string,
  options: { all?: boolean },
  callback: LookupCallback,
) {
  lookup(hostname, { all: true }, (error, addresses) => {
    if (error) return callback(error, []);
    const blocked = addresses.find((entry) => isPrivateAddress(entry.address));
    if (blocked || addresses.length === 0) {
      return callback(
        Object.assign(new Error(`${hostname} resolves to a private address`), {
          code: "EPRIVATE",
        }),
        [],
      );
    }
    if (options.all) callback(null, addresses);
    else callback(null, addresses[0].address, addresses[0].family);
  });
}

// Throws unless the URL is https on a host name, the form publicLookup can check
export function assertPublicHttpsUrl(input: string | URL): URL {
  const url = new URL(input);
  if (url.protocol !== "https:")
    throw new Error("Only https:// URLs are allowed");
  if (isIP(url.hostname.replace(/^\[|\]$/g, "")) !== 0) {
    throw new Error("Requests must use a host name, not an IP address");
  }
  return url;
}

export interface PublicFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  // Covers connecting, redirects and the whole body
  timeoutMs: number;
  maxBytes: number;
  maxRedirects?: number;
}

export interface PublicFetchResponse {
  status: number;
  headers: Record<string, string>;
  url: string;
  body: Buffer;
}

// GET (or another bodyless method) that follows redirects itself, re-checking every hop
export async function fetchPublic(
  input: string,
  options: PublicFetchOptions,
): Promise<PublicFetchResponse> {
  const deadline = Date.now() + options.timeoutMs;
  let url = assertPublicHttpsUrl(input);
  for (let hop = 0; hop <= (options.maxRedirects ?? 5); hop++) {
    const response = await requestOnce(url, options, deadline);
    const location = response.headers.location;
    if (response.status >= 300 && response.status < 400 && location) {
      url = assertPublicHttpsUrl(new URL(location, url));
      continue;
    }
    return response;
  }
  throw new Error("Too many redirects");
}

function requestOnce(
  url: URL,
  options: PublicFetchOptions,
  deadline: number,
): Promise<PublicFetchResponse> {
  const remaining = deadline - Date.now();
  if (remaining <= 0) return Promise.reject(new Error("The request timed out"));

  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        method: options.method ?? "GET",
        headers: options.headers,
        lookup: publicLookup as never,
      },
      (res) => {
        const declared = Number(res.headers["content-length"] ?? 0);
        if (declared > options.maxBytes) {
          req.destroy(
            new Error(`The response is larger than ${options.maxBytes} bytes`),
          );
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > options.maxBytes) {
            req.destroy(
              new Error(
                `The response is larger than ${options.maxBytes} bytes`,
              ),
            );
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          const headers: Record<string, string> = {};
          for (const [name, value] of Object.entries(res.headers)) {
            if (value !== undefined)
              headers[name] = Array.isArray(value) ? value.join(", ") : value;
          }
          resolve({
            status: res.statusCode ?? 0,
            headers,
            url: url.toString(),
            body: Buffer.concat(chunks),
          });
        });
        res.on("error", reject);
      },
    );
    const timer = setTimeout(
      () => req.destroy(new Error("The request timed out")),
      remaining,
    );
    req.on("error", reject);
    req.on("close", () => clearTimeout(timer));
    req.end();
  });
}
