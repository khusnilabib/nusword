import type { Metadata } from "next";
import { Hanken_Grotesk, Source_Serif_4, JetBrains_Mono, Amiri } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/providers/query-provider";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const sourceSerif4 = Source_Serif_4({
  variable: "--font-source-serif-4",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic", "latin"],
  display: "swap",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "NUSWORD — Write • Design • Publish • Print",
  description:
    "Platform dokumen, publishing, buku, kitab, dan print-ready document. Buat, edit, paginasi, dan ekspor dari satu sumber canonical.",
  keywords: [
    "NUSWORD",
    "document editor",
    "publishing",
    "print-ready",
    "book typesetting",
    "kitab",
    "RTL Arabic",
  ],
  authors: [{ name: "NUSWORD" }],
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* Material Symbols — outlined, variable weight/fill */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body
        className={`${hankenGrotesk.variable} ${sourceSerif4.variable} ${jetbrainsMono.variable} ${amiri.variable} font-ui antialiased bg-background text-foreground`}
      >
        <QueryProvider>
          {children}
          <Toaster />
          <SonnerToaster position="bottom-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
