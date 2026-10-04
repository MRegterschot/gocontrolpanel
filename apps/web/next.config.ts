import type { NextConfig } from "next";
import path from "node:path";

// Monorepo: the root .env is the base. Real environment variables and apps/web/.env* win over it.
// Missing in Docker/CI, where the variables come from the environment.
try {
  process.loadEnvFile(path.join(__dirname, "../../.env"));
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const nextConfig: NextConfig = {
  output: "standalone",
  // Trace from the monorepo root so workspace packages end up in the standalone build
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@tmcp/db", "@tmcp/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "core.trackmania.nadeo.live",
        port: "",
        pathname: "/maps/**",
      },
      {
        protocol: "https",
        hostname: "avatars.ubisoft.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "trackmania.exchange",
        port: "",
        pathname: "/mapimage/**",
      },
      {
        protocol: "https",
        hostname: "trackmania.exchange",
        port: "",
        pathname: "/mappackthumb/**",
      },
      {
        protocol: "https",
        hostname: "trackmania-prod-media-s3.cdn.ubi.com",
        port: "",
        pathname: "/media/image/live-api/**",
      },
    ],
    minimumCacheTTL: 60 * 60 * 24, // 1 day
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "1gb",
    },
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.node$/,
      use: [
        {
          loader: "nextjs-node-loader",
        },
      ],
    });
    return config;
  },
};

export default nextConfig;
