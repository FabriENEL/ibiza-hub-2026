"use client";
import { useEffect, useState } from "react";
import { SplashLogo } from "@/components/brand/SplashLogo";

const MIN_VISIBLE = 1600; // ms — permanenza minima percepibile, disaccoppiata dal load

export function SplashScreen({ ready }: { ready?: boolean }) {
  const [exit, setExit] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const mounted = Date.now();
    // Attende il maggiore tra MIN_VISIBLE e il caricamento effettivo
    const trigger = () => {
      const elapsed = Date.now() - mounted;
      const wait = Math.max(0, MIN_VISIBLE - elapsed);
      setTimeout(() => setExit(true), wait);
    };
    if (ready !== undefined) { if (ready) trigger(); return; }
    if (document.readyState === "complete") { trigger(); return; }
    window.addEventListener("load", trigger);
    return () => window.removeEventListener("load", trigger);
  }, [ready]);

  if (gone) return null;
  return (
    <div className={`eg-splash${exit ? " eg-splash--exit" : ""}`}
      onAnimationEnd={() => exit && setGone(true)}
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "grid",
        placeItems: "center", background: "var(--eg-anthracite, #191B1D)" }}>
      <SplashLogo />
    </div>
  );
}
