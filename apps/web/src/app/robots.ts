import { SITE_URL } from "@/lib/site";
import type { MetadataRoute } from "next";

// Only the landing page is public, the panel itself sits behind sign in
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login"],
      disallow: ["/api/", "/admin/", "/server/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
