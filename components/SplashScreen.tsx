"use client";
import { useEffect, useState } from "react";
import { SplashLogo } from "@/components/brand/SplashLogo";
const MIN_VISIBLE = 1600;
export function SplashScreen({ ready }: { ready?: boolean }) {
  const [exit, setExit] = useState(false);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const mounted = Date.now();
    const trigger = () => {
      const elapsed = Date.now() - mounted;
      setTimeout(() => setExit(true), Math.max(0, MIN_VISIBLE - elapsed));
    };
    if (ready !== undefined) { if (ready) trigger(); return; }
    if (document.readyState === "complete") { trigger(); return; }
    window.addEventListener("load", trigger);
    // Fallback: 'load' puo non scattare in navigazione SPA -> splash resterebbe overlay fisso z-9999 bloccando ogni click.
    const safety = setTimeout(trigger, MIN_VISIBLE + 400);
    return () => { window.removeEventListener("load", trigger); clearTimeout(safety); };
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
