import type { Metadata, Viewport } from "next"; // Riga 1: Importiamo anche Viewport
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Configurazione Identità e Favicon
export const metadata: Metadata = {
  title: "Ibiza Hub 2026",
  description: "Alessandro's Bachelor Hub - Progettato da Fabri",
  icons: {
    icon: "/icon.png", // Specifica esplicitamente il file se non lo rileva in automatico
  },
  // INIEZIONE PROTOCOLLO PWA iOS (standalone) - NON TOCCARE NIENT'ALTRO
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Ibiza 2026',
  },
};

// Risoluzione Errore Vercel: Spostiamo il colore del tema qui
export const viewport: Viewport = {
  themeColor: "#eab308",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
