type Visual = { image: string; icon: string; matched: boolean };

// Ogni regola: keyword IT -> lista varianti (anti-ripetizione intra-giorno). icon = overlay decorativo.
const RULES: { id: string; re: RegExp; imgs: string[]; icon: string }[] = [
  { id: 'takeoff', re: /decollo|partenza|volo andata|imbarco volo/,        imgs: ['takeoff','takeoff2'],        icon: '\u{2708}\u{FE0F}' },
  { id: 'landing', re: /atterraggio|arrivo|volo ritorno/,                  imgs: ['landing'],                    icon: '\u{1F6EC}' },
  { id: 'seaport', re: /porto|imbarco|molo/,                               imgs: ['seaport'],                    icon: '\u{2693}' },
  { id: 'boatdin', re: /cena in barca|cena barca/,                         imgs: ['boatdinner'],                 icon: '\u{1F6A4}' },
  { id: 'boatnig', re: /barca sera|barca notte|festa in barca|party barca/,imgs: ['boatnight'],                  icon: '\u{1F6A4}' },
  { id: 'boat',    re: /barca|gommone|gita in barca|escursione mare/,      imgs: ['boat','boat2'],               icon: '\u{1F6A4}' },
  { id: 'beachpd', re: /aperitivo spiaggia|tramonto spiaggia|spiaggia sera/,imgs: ['beachpredinner'],            icon: '\u{1F305}' },
  { id: 'beach',   re: /spiaggia|mare|bagno|beach/,                        imgs: ['beach','beach2'],             icon: '\u{1F3D6}\u{FE0F}' },
  { id: 'club',    re: /discoteca|club|serata|festa|party|dj/,             imgs: ['club','club2'],               icon: '\u{1F3A7}' },
  { id: 'cocktail',re: /aperitivo|drink|\bbar\b|cocktail/,                 imgs: ['cocktails'],                  icon: '\u{1F378}' },
  { id: 'predin',  re: /pre-cena|precena|pre cena/,                        imgs: ['predinner'],                  icon: '\u{1F37E}' },
  { id: 'grpdin',  re: /cena|ristorante|dinner/,                           imgs: ['groupdinner'],                icon: '\u{1F37D}\u{FE0F}' },
  { id: 'sealunch',re: /pranzo mare|pranzo spiaggia|pranzo in barca/,      imgs: ['sealunch'],                   icon: '\u{1F35D}' },
  { id: 'breakf',  re: /colazione|breakfast|brunch/,                       imgs: ['americanbreakfast'],          icon: '\u{1F373}' },
  { id: 'grill',   re: /grigliata|barbecue|\bbbq\b|carne|brace/,           imgs: ['grilledmeat','meat'],         icon: '\u{1F356}' },
  { id: 'lunch',   re: /pranzo/,                                           imgs: ['sealunch','meat'],            icon: '\u{1F37D}\u{FE0F}' },
  { id: 'market',  re: /spesa|supermercato|market/,                       imgs: ['supermarket'],                icon: '\u{1F6D2}' },
  { id: 'uber',    re: /transfer|taxi|spostamento|uber|navetta/,          imgs: ['uber'],                       icon: '\u{1F695}' },
  { id: 'house',   re: /villa|alloggio|casa|resort|check-in|checkin/,     imgs: ['seahouse','poolhousenight'],  icon: '\u{1F3E1}' },
  { id: 'spa',     re: /relax|spa|doccia|terme|benessere/,                imgs: ['showerandbath'],              icon: '\u{1F6BF}' },
];

const FALLBACK = 'tobecontinued';

// ruleSignature: chiave conteggio varianti intra-giorno. Determina anche unicita' contesto.
export function ruleSignature(title: string): string {
  const t = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const r of RULES) if (r.re.test(t)) return r.id;
  return '__none__';
}

export function eventVisual(title: string, variantIndex = 0): Visual {
  const t = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const r of RULES) {
    if (r.re.test(t)) {
      const name = r.imgs[variantIndex % r.imgs.length];
      return { image: '/events/' + name + '.webp', icon: r.icon, matched: true };
    }
  }
  return { image: '/events/' + FALLBACK + '.webp', icon: '\u{1F3F7}\u{FE0F}', matched: false };
}
