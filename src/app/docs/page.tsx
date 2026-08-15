import type { Metadata } from "next";
import Link from "next/link";
import { DocsNav } from "@/components/docs/docs-nav";
import { DocsContent, type DocSection } from "@/components/docs/docs-content";
import { ALL_SECTIONS } from "@/lib/docs-content";

export const metadata: Metadata = {
  title: "Documentation — NUSWORD",
  description:
    "Complete documentation for NUSWORD — features, guides, keyboard shortcuts, and API reference.",
};

/**
 * Documentation Page — /docs route.
 *
 * Full feature documentation modeled after SaaS platforms like Notion,
 * Linear, and Vercel. Every feature in NUSWORD is documented here.
 */
export default function DocsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface-container-lowest">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-outline-variant bg-surface-container-lowest/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4 lg:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span
              className="text-primary"
              style={{
                fontFamily: "var(--font-source-serif-4), serif",
                fontSize: "1.25rem",
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              NUSWORD
            </span>
            <span
              className="text-outline"
              style={{ fontFamily: "var(--font-hanken-grotesk), sans-serif", fontSize: "0.75rem" }}
            >
              / Docs
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/app"
              className="text-body-ui-md text-on-surface-variant hover:text-primary"
              style={{ fontFamily: "var(--font-hanken-grotesk), sans-serif" }}
            >
              Open App
            </Link>
            <Link
              href="/signup"
              className="rounded bg-primary px-4 py-1.5 text-body-ui-md font-medium text-on-primary hover:bg-primary-container"
              style={{ fontFamily: "var(--font-hanken-grotesk), sans-serif" }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Docs layout: sidebar + content */}
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 overflow-hidden">
        <DocsNav sections={ALL_SECTIONS} />
        <DocsContent sections={ALL_SECTIONS} />
      </div>
    </div>
  );
}
