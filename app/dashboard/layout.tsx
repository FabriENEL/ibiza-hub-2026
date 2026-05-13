export const metadata = {
    import type { Metadata, Viewport } from "next";

// I metadati ora gestiscono solo le informazioni descrittive
export const metadata: Metadata = {
  title: "Ibiza Hub 2026",
  description: "Alessandro's Bachelor Party",
  manifest: "/manifest.json",
};

// Il colore del tema deve essere esportato separatamente tramite 'viewport'
export const viewport: Viewport = {
  themeColor: "#eab308",
};