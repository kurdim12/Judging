// Cloudflare bindings + secrets exposed via getCloudflareContext().env.
// Regenerate with `pnpm cf-typegen` once wrangler is fully configured.
interface CloudflareEnv {
  DB: D1Database;
  SUBMISSIONS_BUCKET: R2Bucket;
  AVATARS_BUCKET: R2Bucket;
  ASSETS: Fetcher;
  // vars
  SITE_URL?: string;
  EMAIL_FROM?: string;
  // secrets
  AUTH_SECRET?: string;
  RESEND_API_KEY?: string;
  BOOTSTRAP_ADMIN_EMAIL?: string;
}
