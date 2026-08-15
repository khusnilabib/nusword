import Link from "next/link";

/**
 * LandingFooter — minimalist footer for the marketing site.
 * Paper-themed: thin top border, muted text.
 */
export function LandingFooter() {
  return (
    <footer className="mt-auto border-t border-outline-variant bg-surface-container-lowest">
      <div className="mx-auto max-w-[1400px] px-margin-mobile md:px-margin-desktop py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <span
              className="text-primary"
              style={{
                fontFamily: "var(--font-source-serif-4), serif",
                fontSize: "1.125rem",
                fontWeight: 700,
              }}
            >
              NUSWORD
            </span>
            <span
              className="text-outline"
              style={{ fontFamily: "var(--font-hanken-grotesk), sans-serif", fontSize: "0.75rem" }}
            >
              Write • Design • Publish • Print
            </span>
          </div>

          {/* Links */}
          <div
            className="flex items-center gap-6"
            style={{ fontFamily: "var(--font-hanken-grotesk), sans-serif" }}
          >
            <Link
              href="/app"
              className="text-body-ui-md text-on-surface-variant transition-colors hover:text-primary"
            >
              Buka App
            </Link>
            <Link
              href="/login"
              className="text-body-ui-md text-on-surface-variant transition-colors hover:text-primary"
            >
              Masuk
            </Link>
            <Link
              href="/signup"
              className="text-body-ui-md text-on-surface-variant transition-colors hover:text-primary"
            >
              Daftar
            </Link>
          </div>
        </div>

        {/* Copyright */}
        <p
          className="mt-6 text-center text-outline sm:text-left"
          style={{ fontFamily: "var(--font-hanken-grotesk), sans-serif", fontSize: "0.75rem" }}
        >
          © {new Date().getFullYear()} NUSWORD. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
