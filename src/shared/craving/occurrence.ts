import { dateBefore, localDate, localDateSchema } from '@/shared/journey/domain';

export function localDateTime(at: number, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(at);
  const get = (key: string) => parts.find(part => part.type === key)!.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

/** Converts wall time in the journey timezone, independently of device timezone. */
export function occurrenceUtc(value: string, timezone: string) {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match || !localDateSchema.safeParse(match[1]).success) throw new Error('Pilih tanggal dan jam yang valid.');
  const desired = Date.parse(value + ':00Z');
  let candidate = desired;
  for (let iteration = 0; iteration < 4; iteration++) {
    const wall = Date.parse(localDateTime(candidate, timezone) + ':00Z');
    const difference = desired - wall;
    candidate += difference;
    if (!difference) break;
  }
  if (localDateTime(candidate, timezone) !== value) throw new Error('Jam ini tidak tersedia pada zona waktumu. Pilih jam lain.');
  return new Date(candidate).toISOString();
}

export function quickOccurrence(choice: 'now' | 'earlier' | 'yesterday', at: number, timezone: string) {
  if (choice === 'now') return new Date(at).toISOString();
  if (choice === 'earlier') return new Date(at - 60 * 60000).toISOString();
  const yesterday = dateBefore(localDate(new Date(at), timezone), 1);
  return occurrenceUtc(yesterday + localDateTime(at, timezone).slice(10), timezone);
}
export function occurrenceCaption(value: string, timezone: string) {
  return new Intl.DateTimeFormat('id-ID', { timeZone: timezone, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'short' }).format(new Date(value));
}
