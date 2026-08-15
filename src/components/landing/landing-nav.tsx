import Link from "next/link";
import { ThemeToggle } from "@/components/nusword/theme-toggle";

/**
 * LandingNav — minimalist navigation for the marketing site.
 * Paper-themed: transparent background, thin bottom border.
 */
export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-outline-variant bg-surface-container-lowest/80 backdrop-blur-sm">
      <nav className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-margin-mobile md:px-margin-desktop">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2">
          <span
            className="text-primary"
            style={{
              fontFamily: "var(--font-source-serif-4), serif",
              fontSize: "1.5rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            NUSWORD
          </span>
        </Link>

        {/* Nav links */}
        <div
          className="flex items-center gap-6"
          style={{ fontFamily: "var(--font-hanken-grotesk), sans-serif" }}
        >
          <Link
            href="/#features"
            className="hidden text-body-ui-md text-on-surface-variant transition-colors hover:text-primary sm:inline"
          >
            Fitur
          </Link>
          <Link
            href="/#phases"
            className="hidden text-body-ui-md text-on-surface-variant transition-colors hover:text-primary sm:inline"
          >
            Roadmap
          </Link>
          <ThemeToggle />
          <Link
            href="/login"
            className="text-body-ui-md text-on-surface-variant transition-colors hover:text-primary"
          >
            Masuk
          </Link>
          <Link
            href="/signup"
            className="rounded bg-primary px-4 py-1.5 text-body-ui-md font-medium text-on-primary transition-colors hover:bg-primary-container"
          >
            Daftar
          </Link>
        </div>
      </nav>
    </header>
  );
}
