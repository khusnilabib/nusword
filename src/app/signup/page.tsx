"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

/**
 * Signup Page — /signup route.
 *
 * Uses Supabase Auth (via AuthProvider). Falls back to dev mode
 * (auto-login) if Supabase is not configured.
 */
export default function SignupPage() {
  const router = useRouter();
  const { signUp, isDevMode } = useAuth();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Semua field wajib diisi");
      return;
    }
    if (password.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, name);
    setLoading(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(
      isDevMode
        ? "Akun berhasil dibuat"
        : "Akun berhasil dibuat. Silakan cek email untuk verifikasi.",
    );
    router.push("/app");
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
            href="/login"
            className="text-body-ui-md text-on-surface-variant transition-colors hover:text-primary"
            style={{ fontFamily: "var(--font-hanken-grotesk), sans-serif" }}
          >
            Sudah punya akun? Masuk
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
                Supabase belum dikonfigurasi. Pendaftaran akan otomatis berhasil.
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
              Daftar
            </h1>
            <p
              className="mt-2 text-on-surface-variant"
              style={{
                fontFamily: "var(--font-source-serif-4), serif",
                fontSize: "1rem",
              }}
            >
              Buat akun gratis. Tanpa kartu kredit.
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
                Nama
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama Anda"
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
                placeholder="Minimal 6 karakter"
                required
                minLength={6}
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
              {loading ? "Memuat…" : "Buat Akun"}
            </button>
          </form>

          {/* Terms */}
          <p
            className="mt-6 text-center text-on-surface-variant"
            style={{ fontFamily: "var(--font-hanken-grotesk), sans-serif", fontSize: "0.75rem" }}
          >
            Dengan mendaftar, Anda menyetujui{" "}
            <span className="text-primary hover:underline cursor-pointer">Syarat</span> dan{" "}
            <span className="text-primary hover:underline cursor-pointer">Kebijakan Privasi</span>.
          </p>

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

          {/* Login link */}
          <p
            className="mt-6 text-center text-on-surface-variant"
            style={{ fontFamily: "var(--font-hanken-grotesk), sans-serif", fontSize: "0.875rem" }}
          >
            Sudah punya akun?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Masuk
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
