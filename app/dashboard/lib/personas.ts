export type Persona = {
  theme: { text: string; gradient: string; border: string };
  vibe: { rounded: string; tone: 'warm' | 'formal' | 'neutral' };
};

const NEUTRAL: Persona = {
  theme: { text: 'text-yellow-500', gradient: 'from-yellow-400 to-yellow-600', border: 'border-yellow-500/30' },
  vibe: { rounded: 'rounded-2xl', tone: 'neutral' },
};

export const PERSONAS: Record<string, Persona> = {
  travel: NEUTRAL,
  social: NEUTRAL,
  party: {
    theme: { text: 'text-pink-500', gradient: 'from-pink-400 to-fuchsia-600', border: 'border-pink-500/30' },
    vibe: { rounded: 'rounded-3xl', tone: 'warm' },
  },
  corporate: {
    theme: { text: 'text-blue-400', gradient: 'from-blue-500 to-indigo-600', border: 'border-blue-500/20' },
    vibe: { rounded: 'rounded-lg', tone: 'formal' },
  },
};

export function getPersona(category: string): Persona {
  return PERSONAS[category] ?? NEUTRAL;
}
