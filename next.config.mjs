/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  images: { unoptimized: true },
};
export default nextConfig;
