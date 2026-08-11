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
};

export default nextConfig;
