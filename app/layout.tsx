import type { Metadata } from "next";
import { Geist, Merriweather } from "next/font/google";
import { ThemeSync } from "../components/theme/theme-sync";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://jems3.sbc.org.br"),
  applicationName: "JEMS3 Leak",
  title: {
    default: "JEMS3 Leak",
    template: "%s | JEMS3 Leak",
  },
  description:
    "Plataforma acadêmica JEMS3 Leak para submissões, revisões e revisão por pares com sessão segura.",
  keywords: [
    "JEMS3 Leak",
    "submissões",
    "reviews",
    "revisores",
    "plataforma acadêmica",
  ],
  authors: [{ name: "JEMS3 Leak" }],
  creator: "JEMS3 Leak",
  publisher: "JEMS3 Leak",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "JEMS3 Leak",
    title: "JEMS3 Leak",
    description:
      "Plataforma acadêmica JEMS3 Leak para submissões, revisões e revisão por pares com sessão segura.",
    images: [
      {
        url: "/jems3-leak-logo.svg",
        width: 1200,
        height: 630,
        alt: "JEMS3 Leak",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JEMS3 Leak",
    description:
      "Plataforma acadêmica JEMS3 Leak para submissões, revisões e revisão por pares com sessão segura.",
    images: ["/jems3-leak-logo.svg"],
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${merriweather.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
