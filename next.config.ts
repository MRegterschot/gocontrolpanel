import type { NextConfig } from "next";

const plausibleHost = process.env.NEXT_PUBLIC_PLAUSIBLE_API_HOST;

const nextConfig: NextConfig = {
  output: "standalone",
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
  async rewrites() {
    if (!plausibleHost) {
      return [];
    }
    return [
      {
        source: "/js/script.js",
        destination: `https://${plausibleHost}/js/script.file-downloads.hash.outbound-links.pageview-props.revenue.tagged-events.js`,
      },
      {
        source: "/api/event",
        destination: `https://${plausibleHost}/api/event`,
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
