import type { NextConfig } from "next";

// Sent with every page and API response.
// X-Frame-Options and a frame-ancestors policy are left out on purpose: the preview and editor tools show NowBey inside
// a frame, and blocking that would blank the preview. Add them when you deploy for real if you do not need framing.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=15552000" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The mobile app (and Expo web) call these routes from another origin.
      // Sign-in there uses a bearer token, not cookies, so a wildcard origin is safe.
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PATCH,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, x-nowbey-client" },
        ],
      },
    ];
  },
};

export default nextConfig;
