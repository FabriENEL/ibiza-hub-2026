export function splitDateTime(iso: string): { date: string; hh: string; mm: string } {
  if (!iso) return { date: '', hh: '', mm: '' };
  const [d, t] = iso.split('T');
  const [hh = '', mm = ''] = (t ?? '').split(':');
  return { date: d ?? '', hh, mm };
}

export function joinDateTime(date: string, hh: string, mm: string): string {
  if (!date || hh === '' || mm === '') return '';
  return date + 'T' + hh + ':' + mm;
}
