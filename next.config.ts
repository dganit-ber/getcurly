import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't auto-generate AGENTS.md / CLAUDE.md on build.
  agentRules: false,

  // `@google-cloud/vision` is a heavy Node-only dependency; keep it external to the bundle.
  serverExternalPackages: ["@google-cloud/vision"],

  // Dev only: testing the camera means loading the dev server from a phone on
  // the LAN, and Next blocks its own dev assets cross-origin by default — which
  // serves the HTML but silently withholds the JS, so nothing hydrates.
  allowedDevOrigins: ["192.168.1.142"],

  async redirects() {
    // Was: app.get("/welcome", (req, res) => res.redirect("/")) in the old Express server.
    return [{ source: "/welcome", destination: "/", permanent: false }];
  },

  async headers() {
    // Baseline security headers, replacing the old `helmet` middleware.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

export default nextConfig;
