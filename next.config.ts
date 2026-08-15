import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // These packages use fs/path at runtime and must not be bundled by
  // Turbopack (their __dirname resolution breaks otherwise).
  serverExternalPackages: ["pdfkit", "docx"],
  images: {
    // Serve modern formats when the browser supports them. AVIF first
    // (best compression), WebP as a fallback. remotePatterns stays empty —
    // NUSWORD only serves user-uploaded images from its own origin.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [],
  },
  // ───────────────────────────────────────────────────────────────────────
  // Bundle analyzer (optional — not installed by default).
  //
  // To inspect the production bundle, install the analyzer and run:
  //
  //   bun add -d @next/bundle-analyzer
  //   ANALYZE=true bun run build
  //
  // Then open the generated `analyze/client.html` and `analyze/server.html`
  // in a browser to see the per-module size breakdown.
  //
  // (This comment is intentionally the only "configuration" for the analyzer;
  // the package is not added to devDependencies so it doesn't bloat CI.)
  // ───────────────────────────────────────────────────────────────────────
};

export default nextConfig;
