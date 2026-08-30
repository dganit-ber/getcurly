import type { NextConfig } from "next";

const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : undefined;
  } catch {
    return undefined;
  }
})();

const nextConfig: NextConfig = {
  // Don't auto-generate AGENTS.md / CLAUDE.md on build.
  agentRules: false,

  // `@google-cloud/vision` is a heavy Node-only dependency; keep it external to the bundle.
  serverExternalPackages: ["@google-cloud/vision"],

  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },

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
