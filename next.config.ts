import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const withNextIntl = createNextIntlPlugin("./i18n.ts");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "55mb" },
  },
};

// In `next dev`, make Cloudflare bindings (D1, R2) available via getCloudflareContext().
initOpenNextCloudflareForDev();

export default withNextIntl(nextConfig);
