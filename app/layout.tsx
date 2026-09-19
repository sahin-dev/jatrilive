import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { Header } from "@/components/Header";
import { getDict, getLang } from "@/lib/i18n-server";
import { PwaClient } from "@/components/PwaClient";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: { default: "JatriLive — Dhaka moves together", template: "%s · JatriLive" },
  description: "Community-powered live public transport locations for Dhaka.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const lang = await getLang();
  const t = getDict(lang);
  return (
    <html lang={lang}>
      <body className={manrope.variable}>
        <PwaClient />
        <Header />
        <main>{children}</main>
        <footer className="footer container">
          <div><span className="brand-mark small">J</span><strong>JatriLive</strong></div>
          <p>{t.footerTagline}</p>
          <span>Map data © OpenStreetMap contributors</span>
        </footer>
      </body>
    </html>
  );
}
