import { splitDateTime } from './dateTime';

// Data e ora tenute SEPARATE nel valore ISO, ma ognuna scrive il proprio segmento
// senza azzerare l'altro. Nessun reset intermedio: il campo incompleto resta tale
// finche' l'utente non termina, invece di essere riscritto a ogni battitura.
export default function DateTimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { date, hh, mm } = splitDateTime(value);
  const time = hh !== '' && mm !== '' ? hh + ':' + mm : '';
  const fld = 'bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none';

  const setDate = (d: string) => onChange(d && time ? d + 'T' + time : d ? d + 'T00:00' : (time ? 'T' + time : ''));
  const setTime = (t: string) => onChange(date && t ? date + 'T' + t : t ? 'T' + t : (date ? date + 'T00:00' : ''));

  return (
    <div className="flex gap-2">
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fld + ' flex-1 min-w-0'} />
      <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={fld + ' w-28 shrink-0'} />
    </div>
  );
}

