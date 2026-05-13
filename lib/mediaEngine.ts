export function getDynamicImage(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('barca') || t.includes('imbarco')) return 'https://images.unsplash.com/photo-1544333323-e18e38521a0b?w=800&q=80';
  if (t.includes('volo') || t.includes('decollo') || t.includes('atterraggio')) return 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80';
  if (t.includes('cena') || t.includes('pranzo') || t.includes('aperitivo') || t.includes('reunion')) return 'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800&q=80';
  if (t.includes('spiaggia') || t.includes('mare') || t.includes('cala')) return 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80';
  if (t.includes('villa')) return 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80';
  if (t.includes('serata') || t.includes('locali') || t.includes('dc10')) return 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80';
  
  return 'https://images.unsplash.com/photo-1533130061792-64b345e4a833?w=800&q=80'; // Asset di fallback
}