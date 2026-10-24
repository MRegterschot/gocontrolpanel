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
  transpilePackages: ["@gcp/db", "@gcp/shared"],
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
      // Plugin packages are at most 5 MB; file uploads use their own route
      bodySizeLimit: "10mb",
    },
  },
  // The old reference page; Scalar replaces it
  async redirects() {
    return [
      {
        source: "/api-docs",
        destination: "/api/v1/docs",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Scripts aren't restricted yet: Next.js needs nonces for that
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Ignored by browsers over plain http
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000",
          },
        ],
      },
    ];
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
