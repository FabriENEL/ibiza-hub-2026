import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Junction",
  description: "Junction - Il tuo evento di gruppo, un solo posto.",
  icons: { icon: "/icon.png" },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Junction' },
};

export const viewport: Viewport = { themeColor: "#020617" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it"><body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body></html>
  );
}
