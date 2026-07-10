export type Persona = {
  theme: { text: string; gradient: string; border: string };
  vibe: { rounded: string; tone: 'warm' | 'formal' | 'neutral' };
};

// Voce di casa: salvia. Fallback dei moduli e delle categorie "calme".
const NEUTRAL: Persona = {
  theme: { text: 'text-[#A3B585]', gradient: 'from-[#A3B585] to-[#7C8E60]', border: 'border-[#A3B5854D]' },
  vibe: { rounded: 'rounded-2xl', tone: 'neutral' },
};
export const PERSONAS: Record<string, Persona> = {
  travel: {
    theme: { text: 'text-[#7FA8B0]', gradient: 'from-[#7FA8B0] to-[#5F8189]', border: 'border-[#7FA8B04D]' },
    vibe: { rounded: 'rounded-2xl', tone: 'neutral' },
  },
  social: NEUTRAL,
  party: {
    theme: { text: 'text-[#D9A441]', gradient: 'from-[#D9A441] to-[#B7842B]', border: 'border-[#D9A4414D]' },
    vibe: { rounded: 'rounded-3xl', tone: 'warm' },
  },
  corporate: {
    theme: { text: 'text-[#8892B0]', gradient: 'from-[#8892B0] to-[#67718F]', border: 'border-[#8892B04D]' },
    vibe: { rounded: 'rounded-lg', tone: 'formal' },
  },
};
export function getPersona(category: string): Persona {
  return PERSONAS[category] ?? NEUTRAL;
}