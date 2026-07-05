// components/brand/AppIconMark.tsx
type Props = { withBackground?: boolean; withRing?: boolean; className?: string };

const LEAF = "M0 0 C18 -14 22 -42 0 -64 C-22 -42 -18 -14 0 0 Z";

export function AppIconMark({ withBackground = true, withRing = true, className }: Props) {
  return (
    <svg viewBox="0 0 512 512" className={className} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="EventGarden">
      {withBackground && <rect width="512" height="512" fill="var(--eg-anthracite, #191B1D)" />}
      {withRing && (
        <circle cx="256" cy="256" r="176" fill="none"
          stroke="var(--eg-sage, #A3B585)" strokeWidth="6" strokeLinecap="round"
          strokeDasharray="2 22" opacity="0.55" />
      )}
      <defs><g id="eg-leaf"><path d={LEAF} fill="var(--eg-sage, #A3B585)" /></g></defs>
      <path d="M256 372 C248 320 264 288 256 150" fill="none"
        stroke="var(--eg-sage-deep, #7C8E60)" strokeWidth="7" strokeLinecap="round" />
      <g>
        <use href="#eg-leaf" transform="translate(256 168) scale(0.9) rotate(6)" />
        <use href="#eg-leaf" transform="translate(220 210) scale(0.8) rotate(-52)" />
        <use href="#eg-leaf" transform="translate(292 214) scale(0.8) rotate(52)" />
        <use href="#eg-leaf" transform="translate(214 268) scale(0.72) rotate(-62)" />
        <use href="#eg-leaf" transform="translate(298 272) scale(0.72) rotate(62)" />
        <use href="#eg-leaf" transform="translate(224 322) scale(0.62) rotate(-70)" fill="var(--eg-sage-deep, #7C8E60)" />
        <use href="#eg-leaf" transform="translate(288 326) scale(0.62) rotate(70)" />
      </g>
    </svg>
  );
}