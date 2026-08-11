"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

/**
 * Login Page — /login route.
 *
 * Uses Supabase Auth (via AuthProvider). Falls back to dev mode
 * (auto-login) if Supabase is not configured.
 *
 * NOTE: useSearchParams() must be wrapped in <Suspense> for static
 * prerendering (Next.js build requirement).
 */
export default function LoginPage() {
  return (
    <React.Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </React.Suspense>
  );
}

function LoginFallback() {
  return (
    <div className="min-h-screen flex flex-col bg-surface-container-lowest">
      <div className="flex flex-1 items-center justify-center">
        <div className="text-body-ui-md text-on-surface-variant">Loading…</div>
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, isDevMode } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const redirectTo = searchParams.get("redirect") || "/app";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Email dan password wajib diisi");
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success("Berhasil masuk");
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-container-lowest">
      {/* Simple top bar */}
      <header className="border-b border-outline-variant">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-margin-mobile md:px-margin-desktop">
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
          <Link
            href="/signup"
            className="text-body-ui-md text-on-surface-variant transition-colors hover:text-primary"
            style={{ fontFamily: "var(--font-hanken-grotesk), sans-serif" }}
          >
            Belum punya akun? Daftar
          </Link>
        </div>
      </header>

      {/* Form area */}
      <main className="flex flex-1 items-center justify-center px-margin-mobile py-12">
        <div className="w-full max-w-sm">
          {/* Dev mode banner */}
          {isDevMode && (
            <div
              className="mb-6 rounded-lg border border-primary/30 bg-primary-fixed/20 p-3 text-center"
              style={{ fontFamily: "var(--font-hanken-grotesk), sans-serif" }}
            >
              <p className="text-label-ui-sm text-primary">
                Mode Pengembangan
              </p>
              <p className="text-body-ui-md mt-0.5 text-on-surface-variant">
                Supabase belum dikonfigurasi. Login akan otomatis berhasil.
              </p>
            </div>
          )}

          {/* Heading */}
          <div className="mb-8 text-center">
            <h1
              className="text-on-surface"
              style={{
                fontFamily: "var(--font-source-serif-4), serif",
                fontSize: "2rem",
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              Masuk
            </h1>
            <p
              className="mt-2 text-on-surface-variant"
              style={{
                fontFamily: "var(--font-source-serif-4), serif",
                fontSize: "1rem",
              }}
            >
              Selamat datang kembali.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                className="mb-1.5 block text-on-surface-variant"
                style={{
                  fontFamily: "var(--font-hanken-grotesk), sans-serif",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="anda@email.com"
                required
                className="w-full border-b border-outline-variant bg-transparent py-2 text-on-surface transition-colors focus:border-primary focus:outline-none"
                style={{ fontFamily: "var(--font-source-serif-4), serif", fontSize: "1rem" }}
              />
            </div>

            <div>
              <label
                className="mb-1.5 block text-on-surface-variant"
                style={{
                  fontFamily: "var(--font-hanken-grotesk), sans-serif",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full border-b border-outline-variant bg-transparent py-2 text-on-surface transition-colors focus:border-primary focus:outline-none"
                style={{ fontFamily: "var(--font-source-serif-4), serif", fontSize: "1rem" }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full cursor-pointer rounded bg-primary py-2.5 text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
              style={{ fontFamily: "var(--font-hanken-grotesk), sans-serif", fontSize: "0.9375rem", fontWeight: 500 }}
            >
              {loading ? "Memuat…" : "Masuk"}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-outline-variant" />
            <span
              className="text-outline"
              style={{ fontFamily: "var(--font-hanken-grotesk), sans-serif", fontSize: "0.75rem" }}
            >
              atau
            </span>
            <div className="h-px flex-1 bg-outline-variant" />
          </div>

          {/* Demo access */}
          <Link
            href="/app"
            className="block w-full cursor-pointer rounded border border-outline-variant py-2.5 text-center text-on-surface-variant transition-colors hover:bg-surface-container-low"
            style={{ fontFamily: "var(--font-hanken-grotesk), sans-serif", fontSize: "0.9375rem", fontWeight: 500 }}
          >
            Coba Demo Tanpa Akun
          </Link>

          {/* Signup link */}
          <p
            className="mt-6 text-center text-on-surface-variant"
            style={{ fontFamily: "var(--font-hanken-grotesk), sans-serif", fontSize: "0.875rem" }}
          >
            Belum punya akun?{" "}
            <Link href="/signup" className="text-primary hover:underline">
              Daftar gratis
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
