// Scheda personalità per categoria: parole + stile.
// Un solo punto di verità; aggiungere una categoria = aggiungere una voce.
export type Persona = {
  theme: { text: string; gradient: string; border: string };
  words: {
    members: string;   // come si chiama il gruppo di persone
    schedule: string;  // come si chiama il palinsesto
    tabs: { calendar: string; cassa: string; votes: string; gallery: string; group: string };
    emptyEvents: string;
    tone: 'warm' | 'formal' | 'neutral';
  };
  vibe: { rounded: string; emoji: boolean };  // stile visivo
};

const NEUTRAL: Persona = {
  theme: { text: 'text-yellow-500', gradient: 'from-yellow-400 to-yellow-600', border: 'border-yellow-500/30' },
  words: {
    members: 'Membri', schedule: 'Palinsesto',
    tabs: { calendar: 'Eventi', cassa: 'Cassa', votes: 'Voto', gallery: 'Foto', group: 'Gruppo' },
    emptyEvents: 'Nessun evento ancora.', tone: 'neutral',
  },
  vibe: { rounded: 'rounded-2xl', emoji: false },
};

export const PERSONAS: Record<string, Persona> = {
  travel: NEUTRAL,
  social: NEUTRAL,

  // FESTA TRA AMICI: caldo, allegro, affettuoso (non sguaiato).
  party: {
    theme: { text: 'text-pink-500', gradient: 'from-pink-400 to-fuchsia-600', border: 'border-pink-500/30' },
    words: {
      members: 'Gli amici', schedule: 'Il programma',
      tabs: { calendar: 'Programma', cassa: 'Spese', votes: 'Premio del giorno', gallery: 'Ricordi', group: 'Amici' },
      emptyEvents: 'Ancora niente in programma. Organizziamo qualcosa!', tone: 'warm',
    },
    vibe: { rounded: 'rounded-3xl', emoji: true },
  },

  // CORPORATE: sobrio, minimal, professionale.
  corporate: {
    theme: { text: 'text-blue-400', gradient: 'from-blue-500 to-indigo-600', border: 'border-blue-500/20' },
    words: {
      members: 'Partecipanti', schedule: 'Agenda',
      tabs: { calendar: 'Agenda', cassa: 'Spese', votes: 'Sondaggio', gallery: 'Materiali', group: 'Partecipanti' },
      emptyEvents: 'Nessuna voce in agenda.', tone: 'formal',
    },
    vibe: { rounded: 'rounded-lg', emoji: false },
  },
};

export function getPersona(category: string): Persona {
  return PERSONAS[category] ?? NEUTRAL;
}
