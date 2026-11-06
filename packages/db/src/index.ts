import { Prisma, PrismaClient } from "@prisma/client";

export * from "@prisma/client";

export type DbClient = PrismaClient;

export function createPrismaClient(
  options: Prisma.PrismaClientOptions = {},
): PrismaClient {
  return new PrismaClient({ errorFormat: "minimal", ...options });
}

const serverPluginsInclude = Prisma.validator<Prisma.ServerPluginsInclude>()({
  plugin: true,
});

export type ServerPluginsWithPlugin = Prisma.ServerPluginsGetPayload<{
  include: typeof serverPluginsInclude;
}>;
