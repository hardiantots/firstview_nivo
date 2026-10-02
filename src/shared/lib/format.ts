export function deviceTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Makassar';
}

export function formatDate(value: string | Date, timezone?: string) {
  const localDate = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = localDate ? new Date(value + 'T12:00:00Z') : new Date(value);
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: localDate ? 'UTC' : timezone || 'UTC' }).format(date);
}

export function formatTime(value: string | Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: timezone }).formatToParts(new Date(value));
  return parts.find(part => part.type === 'hour')?.value + ':' + parts.find(part => part.type === 'minute')?.value;
}

export function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}
