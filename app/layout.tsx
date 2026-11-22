import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({ subsets: ["latin", "vietnamese"], weight: ["400", "500", "700"], variable: "--font-main" });

export const metadata: Metadata = {
  title: "Road Trip Route",
  description: "Lên tuyến 3–5 điểm ăn uống / tham quan quanh bạn, mở thẳng Google Maps.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#1a73e8" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={roboto.variable}>
      <body>{children}</body>
    </html>
  );
}
