import type { Persona } from './personas';
import { getPersona } from './personas';

export type ModuleId = 'calendar' | 'cassa' | 'votes' | 'gallery' | 'consigli' | 'group';

export type Words = {
  members: string;
  schedule: string;
  emptyEvents: string;
  greeting: (name: string) => string;   // saluto tematizzato
  ownerTag: string;
  tabs: Record<ModuleId, string>;
};

export type Blueprint = {
  macro: string;
  modules: ModuleId[];
  b2bVertical: string;
  words: Words;
  defaults: { votesEnabled: boolean; voteLabel: string };
};

const BP: Record<string, Blueprint> = {
  party: {
    macro: 'celebrazione', b2bVertical: 'nightlife',
    modules: ['calendar','cassa','votes','gallery','consigli','group'],
    defaults: { votesEnabled: true, voteLabel: 'Premio del giorno' },
    words: {
      members: 'Gli amici', schedule: 'Il programma',
      emptyEvents: 'Ancora niente in programma. Organizziamo qualcosa!',
      greeting: (n) => 'Ciao ' + n + ' \u{1F389}', ownerTag: ' (organizzatore)',
      tabs: { calendar: 'Programma', cassa: 'Spese', votes: 'Premio', gallery: 'Ricordi', consigli: 'Consigli', group: 'Amici' },
    },
  },
  corporate: {
    macro: 'business', b2bVertical: 'business',
    modules: ['calendar','cassa','consigli','gallery','group'],
    defaults: { votesEnabled: false, voteLabel: 'Sondaggio' },
    words: {
      members: 'Partecipanti', schedule: 'Agenda',
      emptyEvents: 'Nessuna voce in agenda.',
      greeting: (n) => n, ownerTag: ' - Organizzatore',
      tabs: { calendar: 'Agenda', cassa: 'Spese', votes: 'Sondaggio', gallery: 'Materiali', consigli: 'Info', group: 'Partecipanti' },
    },
  },
  bachelor: {
    macro: 'celebrazione', b2bVertical: 'nightlife',
    modules: ['calendar','cassa','votes','gallery','consigli','group'],
    defaults: { votesEnabled: true, voteLabel: 'Sballato del giorno' },
    words: {
      members: 'Compari', schedule: 'La missione',
      emptyEvents: 'Nessuna missione pianificata. Che si comincia!',
      greeting: (n) => 'Accesso: ' + n, ownerTag: ' - Comandante',
      tabs: { calendar: 'Missione', cassa: 'Cassa comune', votes: 'Sballato', gallery: 'Archivio', consigli: 'Radar', group: 'Compari' },
    },
  },
  travel: {
    macro: 'viaggio', b2bVertical: 'travel',
    modules: ['calendar','cassa','votes','gallery','consigli','group'],
    defaults: { votesEnabled: true, voteLabel: 'Voto del giorno' },
    words: {
      members: 'Membri', schedule: 'Programma',
      emptyEvents: 'Nessun evento ancora.',
      greeting: (n) => 'Ciao ' + n, ownerTag: ' (organizzatore)',
      tabs: { calendar: 'Eventi', cassa: 'Cassa', votes: 'Voto', gallery: 'Foto', consigli: 'Consigli', group: 'Gruppo' },
    },
  },
};
BP.social = { ...BP.travel, macro: 'social', b2bVertical: 'social' };

const FALLBACK = BP.travel;

export function getBlueprint(cat: string): Blueprint { return BP[cat] ?? FALLBACK; }
export function getConfig(cat: string): { persona: Persona; blueprint: Blueprint } {
  return { persona: getPersona(cat), blueprint: getBlueprint(cat) };
}
