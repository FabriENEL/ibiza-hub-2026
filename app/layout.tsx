import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk, Cormorant_Garamond } from "next/font/google";
import { SplashScreen } from "@/components/SplashScreen";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Space_Grotesk({ variable: "--font-display", subsets: ["latin"] });
const displaySerif = Cormorant_Garamond({ variable: "--font-display-serif", weight: ["500", "600"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EventGarden",
  description: "EventGarden - Il tuo evento di gruppo, un solo posto.",
  icons: { icon: "/icon.png" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "EventGarden" },
};

export const viewport: Viewport = { themeColor: "#020617" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body className={`${geistSans.variable} ${geistMono.variable} ${display.variable} ${displaySerif.variable} antialiased`}>
        <SplashScreen />
        {children}
      </body>
    </html>
  );
}



