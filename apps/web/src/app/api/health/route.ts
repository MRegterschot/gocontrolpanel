import config from "@/lib/config";
import { getClient } from "@/lib/dbclient";
import { logger } from "@/lib/logger";
import { getRedisClient } from "@/lib/redis";

export const dynamic = "force-dynamic";

async function check(
  name: string,
  run: (signal: AbortSignal) => Promise<unknown>,
): Promise<"ok" | "fail"> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.resolve().then(() => run(controller.signal)),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error("Health check timed out"));
          controller.abort();
        }, 2000);
      }),
    ]);
    return "ok";
  } catch {
    logger.warn({ check: name }, "Health check failed");
    return "fail";
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const [database, redis, gbx] = await Promise.all([
    check("database", async () => getClient().$queryRaw`SELECT 1`),
    check("redis", async () => {
      if ((await (await getRedisClient()).ping()) !== "PONG") {
        throw new Error("Unexpected ping response");
      }
    }),
    check("gbx", async (signal) => {
      const response = await fetch(
        `${config.GBX_SERVICE.URL.replace(/\/$/, "")}/healthz`,
        { signal, cache: "no-store" },
      );
      if (response.status !== 200) throw new Error("Unhealthy service");
    }),
  ]);
  const checks = { database, redis, gbx };
  const healthy = Object.values(checks).every((result) => result === "ok");
  return Response.json(
    { status: healthy ? "ok" : "unavailable", checks },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
