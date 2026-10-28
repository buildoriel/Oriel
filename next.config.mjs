/** @type {import('next').NextConfig} */
const nextConfig = {
  // Situs user butuh URL folder dengan garis miring akhir (/blog/) agar link relatif benar.
  // Tanpa ini Next mengalihkan /blog/ -> /blog dan CSS/JS/gambar relatif gagal dimuat.
  skipTrailingSlashRedirect: true,
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  images: { unoptimized: true },
};
export default nextConfig;
