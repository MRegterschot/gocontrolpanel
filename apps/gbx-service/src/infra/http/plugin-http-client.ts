import {
  assertPublicHttpsUrl,
  publicLookup,
} from "@tmcontrolpanel/shared/public-fetch";
import { request } from "node:https";
import type {
  PluginHttpClient,
  PluginHttpRequest,
  PluginHttpResponse,
} from "../../core/ports";

// Plugins reach only the hosts they declared, and never an address inside the network the
// service runs in; the address rules live in @tmcontrolpanel/shared/public-fetch
export { isPrivateAddress } from "@tmcontrolpanel/shared/public-fetch";

// Hop-by-hop and routing headers a plugin may not set
const RESERVED_HEADERS = new Set([
  "host",
  "connection",
  "transfer-encoding",
  "upgrade",
  "te",
  "keep-alive",
  "proxy-authorization",
]);

export class HttpsPluginClient implements PluginHttpClient {
  constructor(private readonly userAgent = "GoControlPanel-Plugin") {}

  fetch(input: PluginHttpRequest): Promise<PluginHttpResponse> {
    let url: URL;
    try {
      url = assertPublicHttpsUrl(input.url);
    } catch (error) {
      return Promise.reject(error);
    }
    const headers = Object.fromEntries(
      Object.entries(input.headers).filter(
        ([name]) => !RESERVED_HEADERS.has(name.toLowerCase()),
      ),
    );

    return new Promise((resolve, reject) => {
      const req = request(
        url,
        {
          method: input.method,
          headers: { "user-agent": this.userAgent, ...headers },
          lookup: publicLookup as never,
          timeout: input.timeoutMs,
        },
        (res) => {
          const chunks: Buffer[] = [];
          let size = 0;
          res.on("data", (chunk: Buffer) => {
            size += chunk.length;
            if (size > input.maxResponseBytes) {
              req.destroy(
                new Error(
                  `The response is larger than ${input.maxResponseBytes / 1024} KB`,
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
              body: Buffer.concat(chunks).toString("utf8"),
            });
          });
          res.on("error", reject);
        },
      );

      const deadline = setTimeout(
        () =>
          req.destroy(
            new Error(`No answer within ${input.timeoutMs / 1000} s`),
          ),
        input.timeoutMs,
      );
      req.on("timeout", () =>
        req.destroy(new Error(`No answer within ${input.timeoutMs / 1000} s`)),
      );
      req.on("error", reject);
      req.on("close", () => clearTimeout(deadline));
      if (input.body !== undefined) req.write(input.body);
      req.end();
    });
  }
}
