/** @type {import('next').NextConfig} */
const nextConfig = {
  // User sites need folder URLs with a trailing slash (/blog/) so relative links resolve correctly.
  // Without this, Next redirects /blog/ -> /blog and relative CSS/JS/images fail to load.
  skipTrailingSlashRedirect: true,
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  images: { unoptimized: true },
  // the example projects are read from disk by the showcase publishing task
  outputFileTracingIncludes: { "/api/admin/showcase": ["./content/showcase/**/*"] },
};
export default nextConfig;
