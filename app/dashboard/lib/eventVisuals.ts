type Visual = { gradient: string; icon: string };

// Primo match vince. Input normalizzato NFD a monte.
const RULES: [RegExp, Visual][] = [
  [/spiaggia|mare|beach|bagno/,       { gradient: 'from-sky-400 to-cyan-600',       icon: '\u{1F3D6}\u{FE0F}' }],
  [/discoteca|club|festa|party|dj/,   { gradient: 'from-fuchsia-500 to-purple-700', icon: '\u{1F3A7}' }],
  [/cena|ristorante|dinner|pranzo/,   { gradient: 'from-amber-400 to-orange-600',   icon: '\u{1F37D}\u{FE0F}' }],
  [/aperitivo|drink|\bbar\b|cocktail/,{ gradient: 'from-rose-400 to-pink-600',      icon: '\u{1F378}' }],
  [/escursione|trekking|montagna/,    { gradient: 'from-emerald-400 to-green-700',  icon: '\u{26F0}\u{FE0F}' }],
  [/museo|arte|mostra|cultura/,       { gradient: 'from-indigo-400 to-blue-700',    icon: '\u{1F3DB}\u{FE0F}' }],
  [/volo|aeroporto|partenza|arrivo/,  { gradient: 'from-slate-400 to-slate-700',    icon: '\u{2708}\u{FE0F}' }],
  [/hotel|check|alloggio/,            { gradient: 'from-teal-400 to-cyan-700',      icon: '\u{1F3E8}' }],
  [/riunione|meeting|agenda|call/,    { gradient: 'from-blue-500 to-indigo-700',    icon: '\u{1F4BC}' }],
  [/cerimonia|matrimonio|rito/,       { gradient: 'from-rose-300 to-red-500',       icon: '\u{1F48D}' }],
];
const FALLBACK: Visual = { gradient: 'from-slate-600 to-slate-800', icon: '\u{1F4CC}' };

export function eventVisual(title: string): Visual {
  const t = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [re, v] of RULES) if (re.test(t)) return v;
  return FALLBACK;
}
