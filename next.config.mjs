/** @type {import('next').NextConfig} */
const nextConfig = {
  // The preview proxy serves this dev server from a different host, so the dev
  // origin has to be allowed or Next blocks the request as cross-origin.
  allowedDevOrigins: ['*.e2b.app', '*.arena.ai', 'localhost:3000', '127.0.0.1:3000'],
  serverExternalPackages: ['pg'],
};

export default nextConfig;
