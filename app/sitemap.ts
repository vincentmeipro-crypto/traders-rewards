import { MetadataRoute } from "next";
import { getStringConfig } from "@/lib/config";

// V2 Phase 1 — URL du site depuis settings (fallback si Supabase indisponible)
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await getStringConfig("branding.site_url");
  const now = new Date();

  return [
    {
      url: String(base),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${base}/partenariat`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/support`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${base}/login`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${base}/register`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${base}/legal/risk`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}
