// components/brand/GrowthPlant.tsx
export type EGCategory =
  | "viaggio" | "corporate" | "festa" | "nightlife" | "spiaggia" | "ristorazione";

const LEAF = "M0 0 C16 -12 20 -38 0 -58 C-20 -38 -16 -12 0 0 Z";

const NODES = [
  { x: 0,   y: -30,  rot: 0,   s: 1.0,  bloom: true,  shape: "circle" },
  { x: -30, y: -70,  rot: -48, s: 0.9,  bloom: false, shape: "circle" },
  { x: 30,  y: -74,  rot: 48,  s: 0.9,  bloom: true,  shape: "circle" },
  { x: -26, y: -114, rot: -58, s: 0.75, bloom: false, shape: "circle" },
  { x: 26,  y: -118, rot: 58,  s: 0.75, bloom: true,  shape: "circle" },
] as const;

// Forma fioritura per categoria → distinzione ridondante al colore (accessibilità daltonismo)
const BLOOM_SHAPE: Record<EGCategory, "circle" | "diamond" | "star"> = {
  viaggio: "diamond", corporate: "circle", festa: "star",
  nightlife: "star", spiaggia: "diamond", ristorazione: "circle",
};

function Bloom({ shape }: { shape: "circle" | "diamond" | "star" }) {
  const f = "var(--eg-bloom)";
  if (shape === "diamond") return <path d="M0 -60 L7 -52 L0 -44 L-7 -52 Z" fill={f} />;
  if (shape === "star")
    return <path d="M0 -61 L2 -54 L9 -54 L3.5 -50 L5.5 -43 L0 -47 L-5.5 -43 L-3.5 -50 L-9 -54 L-2 -54 Z" fill={f} />;
  return <circle cx="0" cy="-52" r="7" fill={f} />;
}

type Props = { category: EGCategory; stage?: number; className?: string };

export function GrowthPlant({ category, stage = NODES.length, className = "w-40" }: Props) {
  const visible = Math.max(0, Math.min(stage, NODES.length));
  const shape = BLOOM_SHAPE[category];
  return (
    <svg viewBox="-90 -160 180 200" className={className} data-eg-cat={category}
      xmlns="http://www.w3.org/2000/svg" role="img" aria-label={`Hub ${category}`}>
      <defs><path id="eg-leaf-node" d={LEAF} fill="var(--eg-sage)" /></defs>
      <path d="M0 38 C-6 -10 6 -40 0 -128" fill="none"
        stroke="var(--eg-sage-deep)" strokeWidth="4" strokeLinecap="round" />
      {NODES.slice(0, visible).map((n, i) => (
        <g key={i} transform={`translate(${n.x} ${n.y}) rotate(${n.rot}) scale(${n.s})`}>
          <use href="#eg-leaf-node" />
          {n.bloom && <Bloom shape={shape} />}
        </g>
      ))}
    </svg>
  );
}