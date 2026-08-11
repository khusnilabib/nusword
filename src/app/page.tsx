import Link from "next/link";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";

/**
 * NUSWORD Landing Page — / route.
 *
 * Marketing/public website. Architecturally separate from the editor app
 * at /app. This is a server component (no client-side app dependencies,
 * no Zustand store, no editor imports).
 *
 * Theme: "kertas tulisan biasa" — ordinary writing paper. Minimalist,
 * paper-like aesthetic with Source Serif 4 body text, deep teal accents,
 * and generous whitespace.
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface-container-lowest">
      <LandingNav />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <PhasesSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}

/* ================================================================
   Hero — the writing paper aesthetic
   ================================================================ */

function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Paper background with subtle ruled lines */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 31px, #012425 31px, #012425 32px)",
        }}
      />
      {/* Red margin line (like notebook paper) */}
      <div className="absolute left-[10%] top-0 bottom-0 w-px bg-error/20 hidden md:block" />

      <div className="relative mx-auto max-w-4xl px-margin-mobile md:px-margin-desktop py-20 md:py-32">
        <div className="flex flex-col items-center text-center gap-6">
          {/* Brand mark */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-headline-ui-lg font-headline-ui-lg tracking-tight text-primary"
              style={{ fontFamily: "var(--font-source-serif-4), serif", fontWeight: 700 }}
            >
              NUSWORD
            </span>
          </div>

          {/* Headline — like a title on paper */}
          <h1
            className="text-on-surface leading-tight"
            style={{
              fontFamily: "var(--font-source-serif-4), serif",
              fontSize: "clamp(2.5rem, 6vw, 4rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            Write. Design.
            <br />
            Publish. Print.
          </h1>

          {/* Subtitle — like body text on paper */}
          <p
            className="max-w-2xl text-on-surface-variant"
            style={{
              fontFamily: "var(--font-source-serif-4), serif",
              fontSize: "clamp(1.125rem, 2vw, 1.375rem)",
              lineHeight: 1.6,
            }}
          >
            Platform dokumen, publishing, buku, kitab, dan print-ready document.
            Buat, edit, paginasi, dan ekspor — dari satu sumber canonical.
          </p>

          {/* CTAs */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <Link
              href="/signup"
              className="cursor-pointer rounded bg-primary px-6 py-3 text-body-ui-md font-medium text-on-primary transition-colors hover:bg-primary-container"
              style={{ fontFamily: "var(--font-hanken-grotesk), sans-serif" }}
            >
              Mulai Gratis
            </Link>
            <Link
              href="/login"
              className="cursor-pointer rounded border border-outline-variant px-6 py-3 text-body-ui-md font-medium text-primary transition-colors hover:bg-surface-container-low"
              style={{ fontFamily: "var(--font-hanken-grotesk), sans-serif" }}
            >
              Masuk
            </Link>
          </div>

          {/* Tag line */}
          <p
            className="mt-4 text-outline"
            style={{
              fontFamily: "var(--font-hanken-grotesk), sans-serif",
              fontSize: "0.875rem",
            }}
          >
            Gratis untuk tahap awal · Tanpa kartu kredit
          </p>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   Features — minimalist cards
   ================================================================ */

function FeaturesSection() {
  const features = [
    {
      icon: "edit_document",
      title: "Rich Text Editor",
      description:
        "Editor multi-page dengan autosave, version history, blocks, tabel, gambar, dan find/replace.",
    },
    {
      icon: "description",
      title: "Page & Layout",
      description:
        "Paper generator, custom dimensions, margins, header/footer, page numbering, dan preview deterministik.",
    },
    {
      icon: "picture_as_pdf",
      title: "Export Print-Ready",
      description:
        "PDF, DOCX, dan HTML dengan preflight checks, print presets, dan booklet imposition.",
    },
    {
      icon: "menu_book",
      title: "Book Engine",
      description:
        "Chapter tree, front/back matter, mirror margins, running headers, TOC, dan saddle-stitch binding.",
    },
    {
      icon: "auto_stories",
      title: "Kitab & RTL",
      description:
        "Arabic typography, bilingual blocks, footnotes, ornaments, dan Arabic-Indic page numbers.",
    },
    {
      icon: "groups",
      title: "Collaboration",
      description:
        "Organizations, role-based sharing (editor/commenter/viewer), dan template marketplace.",
    },
  ];

  return (
    <section className="bg-surface py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-margin-mobile md:px-margin-desktop">
        <div className="mb-12 text-center">
          <h2
            className="text-on-surface"
            style={{
              fontFamily: "var(--font-source-serif-4), serif",
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Semua yang Anda butuhkan untuk menulis
          </h2>
          <p
            className="mt-3 text-on-surface-variant"
            style={{
              fontFamily: "var(--font-source-serif-4), serif",
              fontSize: "1.125rem",
            }}
          >
            Dari dokumen sederhana sampai buku dan kitab.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex flex-col gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-6 transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]"
            >
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontSize: 32, fontVariationSettings: "'FILL' 0, 'wght' 300" }}
              >
                {f.icon}
              </span>
              <h3
                className="text-on-surface"
                style={{
                  fontFamily: "var(--font-hanken-grotesk), sans-serif",
                  fontSize: "1.125rem",
                  fontWeight: 600,
                }}
              >
                {f.title}
              </h3>
              <p
                className="text-on-surface-variant"
                style={{
                  fontFamily: "var(--font-source-serif-4), serif",
                  fontSize: "0.9375rem",
                  lineHeight: 1.6,
                }}
              >
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   Phases / Roadmap — timeline on paper
   ================================================================ */

function PhasesSection() {
  const phases = [
    { num: "01", title: "Foundation", desc: "Dashboard, editor dasar, document CRUD" },
    { num: "02", title: "Core Editor", desc: "Tiptap, autosave, versions, blocks" },
    { num: "03", title: "Paper & Layout", desc: "Pagination, headers, page numbering" },
    { num: "04", title: "Export", desc: "PDF, DOCX, HTML, preflight, presets" },
    { num: "05", title: "Book Engine", desc: "Chapters, TOC, mirror margins, booklet" },
    { num: "06", title: "Kitab & RTL", desc: "Arabic, bilingual, footnotes, ornaments" },
    { num: "07", title: "SaaS", desc: "Organizations, sharing, templates" },
    { num: "08", title: "AI", desc: "Prompt-to-outline, rewrite, summarize" },
  ];

  return (
    <section className="bg-surface-container-low py-20 md:py-28">
      <div className="mx-auto max-w-4xl px-margin-mobile md:px-margin-desktop">
        <div className="mb-12 text-center">
          <h2
            className="text-on-surface"
            style={{
              fontFamily: "var(--font-source-serif-4), serif",
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Dibangun secara sistematis
          </h2>
          <p
            className="mt-3 text-on-surface-variant"
            style={{
              fontFamily: "var(--font-source-serif-4), serif",
              fontSize: "1.125rem",
            }}
          >
            Setiap fase membangun di atas yang sebelumnya.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {phases.map((p) => (
            <div
              key={p.num}
              className="flex items-start gap-4 border-b border-outline-variant pb-4"
            >
              <span
                className="text-primary shrink-0"
                style={{
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  fontSize: "0.875rem",
                  fontWeight: 400,
                }}
              >
                {p.num}
              </span>
              <div>
                <h3
                  className="text-on-surface"
                  style={{
                    fontFamily: "var(--font-hanken-grotesk), sans-serif",
                    fontSize: "1rem",
                    fontWeight: 600,
                  }}
                >
                  {p.title}
                </h3>
                <p
                  className="text-on-surface-variant"
                  style={{
                    fontFamily: "var(--font-source-serif-4), serif",
                    fontSize: "0.875rem",
                  }}
                >
                  {p.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   CTA
   ================================================================ */

function CtaSection() {
  return (
    <section className="bg-surface py-20 md:py-32">
      <div className="mx-auto max-w-2xl px-margin-mobile md:px-margin-desktop text-center">
        <h2
          className="text-on-surface"
          style={{
            fontFamily: "var(--font-source-serif-4), serif",
            fontSize: "clamp(2rem, 5vw, 3rem)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}
        >
          Mulai menulis hari ini
        </h2>
        <p
          className="mt-4 text-on-surface-variant"
          style={{
            fontFamily: "var(--font-source-serif-4), serif",
            fontSize: "1.125rem",
            lineHeight: 1.6,
          }}
        >
          Gratis untuk tahap awal. Buat dokumen, buku, atau kitab pertama Anda dalam hitungan detik.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <Link
            href="/signup"
            className="cursor-pointer rounded bg-primary px-8 py-3 text-body-ui-md font-medium text-on-primary transition-colors hover:bg-primary-container"
            style={{ fontFamily: "var(--font-hanken-grotesk), sans-serif" }}
          >
            Buat Akun Gratis
          </Link>
          <Link
            href="/app"
            className="cursor-pointer rounded border border-outline-variant px-8 py-3 text-body-ui-md font-medium text-primary transition-colors hover:bg-surface-container-low"
            style={{ fontFamily: "var(--font-hanken-grotesk), sans-serif" }}
          >
            Coba Demo
          </Link>
        </div>
      </div>
    </section>
  );
}
