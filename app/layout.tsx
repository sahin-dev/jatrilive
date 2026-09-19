import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { Header } from "@/components/Header";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: { default: "JatriLive — Dhaka moves together", template: "%s · JatriLive" },
  description: "Community-powered live public transport locations for Dhaka.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={manrope.variable}>
        <Header />
        <main>{children}</main>
        <footer className="footer container">
          <div><span className="brand-mark small">J</span><strong>JatriLive</strong></div>
          <p>Community-powered movement for Dhaka. Never share personal details publicly.</p>
          <span>Map data © OpenStreetMap contributors</span>
        </footer>
      </body>
    </html>
  );
}
