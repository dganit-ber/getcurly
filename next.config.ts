import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't auto-generate AGENTS.md / CLAUDE.md on build.
  agentRules: false,

  // `@google-cloud/vision` is a heavy Node-only dependency; keep it external to the bundle.
  serverExternalPackages: ["@google-cloud/vision"],

  // Dev only: testing the camera means loading the dev server from a phone on
  // the LAN, and Next blocks its own dev assets cross-origin by default — which
  // serves the HTML but silently withholds the JS, so nothing hydrates. The
  // symptom is a page that looks fine until you tap something: the camera opens
  // (that part is plain HTML) and the photo then goes nowhere.
  //
  // Ranges rather than one address, because a single pinned IP breaks every
  // time the laptop changes network — 192.168.43.x is an Android hotspot,
  // 192.168.1.x / 192.168.0.x a home router, 10.x a corporate or tethered LAN.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.16.*.*", "*.local"],

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
