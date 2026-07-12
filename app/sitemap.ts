import type { MetadataRoute } from "next";

const BASE_URL = "https://reapp.live";
const LAST_MODIFIED = new Date("2026-07-12T00:00:00Z");

const routes = [
  "",
  "/ap2",
  "/cli",
  "/composites",
  "/express",
  "/research",
  "/t2",
  "/t2/demo",
  "/video",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: LAST_MODIFIED,
  }));
}
