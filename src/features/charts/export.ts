import { z } from 'zod';
import { cravingSummary, DailyPoint, hourLabel, HourPoint, periodSummary } from './data';

export const exportDailySchema = z.object({
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), cigarettes: z.number().int().min(0).max(200).nullable(), reported: z.boolean(),
  baseline_cigs_per_day: z.number().min(0).max(200).nullable(), price_per_cigarette: z.number().min(0).max(1000000).nullable(),
});
export const exportCravingSchema = z.object({
  id: z.string().max(160), occurred_at: z.string().datetime({ offset: true }).max(80), intensity: z.number().min(0).max(10).nullable(),
  trigger: z.string().max(120).nullable(), outcome: z.enum(['passed', 'ongoing', 'smoked']).nullable(),
  duration_sec: z.number().int().nonnegative().nullable(), note: z.string().max(500).nullable(),
  source: z.enum(['sos', 'checkin', 'slip']),
});
export type ExportDaily = { log_date: string; cigarettes: number | null; reported: boolean; baseline_cigs_per_day: number | null; price_per_cigarette: number | null };
export type ExportCraving = { id: string; occurred_at: string; intensity: number | null; trigger: string | null; outcome: 'passed' | 'ongoing' | 'smoked' | null; duration_sec: number | null; note: string | null; source: 'sos' | 'checkin' | 'slip' };

/** Prefix spreadsheet control/formula text before applying RFC 4180 quoting. */
export function csvCell(value: string | number | null | undefined) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[\s\uFEFF]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
const outcomeLabels = { passed: 'mereda', ongoing: 'masih kuat', smoked: 'merokok' };
export function exportCsv(daily: ExportDaily[], cravings: ExportCraving[], timezone: string) {
  const rows: (string | number | null | undefined)[][] = [[
    'jenis', 'tanggal_harian', 'waktu_utc', 'zona_waktu', 'batang', 'status_catatan', 'baseline_batang', 'harga_per_batang_rupiah',
    'estimasi_hemat_rupiah', 'intensitas_0_10', 'pemicu', 'hasil', 'durasi_detik', 'catatan', 'sumber',
  ]];
  daily.forEach(item => {
    const hasReport = item.reported && item.cigarettes !== null;
    const saved = hasReport && item.baseline_cigs_per_day !== null && item.price_per_cigarette !== null ? Math.max(0, item.baseline_cigs_per_day - item.cigarettes!) * item.price_per_cigarette : null;
    rows.push(['harian', item.log_date, '', timezone, hasReport ? item.cigarettes : null, hasReport ? 'tercatat' : 'belum tercatat', item.baseline_cigs_per_day, item.price_per_cigarette, saved, '', '', '', '', '', 'harian']);
  });
  cravings.forEach(item => rows.push(['craving', '', item.occurred_at, timezone, '', '', '', '', '', item.intensity, item.trigger, item.outcome ? outcomeLabels[item.outcome] : 'belum diketahui', item.duration_sec, item.note, item.source]));
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** One-page report, no external service, temporary file, or personal free-text. */
export function exportPdf({ daily, hours, start, end, timezone }: { daily: ExportDaily[]; hours: HourPoint[]; start: string; end: string; timezone: string }): Uint8Array {
  const series: DailyPoint[] = daily.map(item => ({ day: item.log_date, cigarettes: item.reported ? item.cigarettes : null, baseline_cigs_per_day: item.baseline_cigs_per_day, price_per_cigarette: item.price_per_cigarette }));
  const summary = periodSummary(series), cravings = cravingSummary(hours);
  const number = (value: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value);
  const money = summary.saved === null ? 'Belum tersedia: data awal belum lengkap' : `Rp ${number(summary.saved)} (estimasi)`;
  const lines = [
    ['NIVO - Ringkasan perjalanan', 22],
    [`Periode: ${start} s.d. ${end}`, 12],
    [`Zona waktu: ${timezone}`, 11],
    ['', 11],
    ['Dari catatan harian', 16],
    [`Hari tercatat: ${summary.logged}`, 12],
    [`Rata-rata: ${summary.average === null ? 'Belum tersedia' : `${number(summary.average)} batang / hari tercatat`}`, 12],
    [`Hari tercatat 0 batang: ${summary.zeroDays}`, 12],
    [`Batang dihindari: ${summary.avoided === null ? 'Belum tersedia' : `${number(summary.avoided)} (estimasi)`}`, 12],
    [`Uang hemat: ${money}`, 12],
    [`Estimasi tersedia untuk ${summary.estimateDays} dari ${summary.logged} hari tercatat.`, 11],
    ['', 11],
    ['Dari kejadian craving', 16],
    [`Jumlah kejadian: ${cravings.total}`, 12],
    [`Jam dengan catatan terbanyak: ${cravings.busiestHour === null ? 'Perlu minimal 5 kejadian' : `${hourLabel(cravings.busiestHour)} - ${hourLabel((cravings.busiestHour + 1) % 24)}`}`, 12],
    [`Mereda: ${cravings.passed}; merokok: ${cravings.smoked}; masih kuat: ${cravings.ongoing}.`, 12],
    ['Hasil check-in lama yang belum diketahui tidak dianggap mereda.', 11],
    ['', 11],
    ['Cara membaca ringkasan', 16],
    ['Hari tanpa catatan tidak dihitung sebagai nol atau hari bebas rokok.', 11],
    ['Hemat = selisih positif baseline dan batang, dikali harga per batang.', 11],
    ['Baseline mengikuti versi yang melekat pada masing-masing catatan.', 11],
    ['Kejadian merokok dicatat terpisah dari total batang harian.', 11],
    ['Ringkasan ini berdasarkan isian pengguna; bukan diagnosis medis.', 11],
    ['Bawa ringkasan ini untuk berdiskusi dengan tenaga kesehatan.', 11],
  ] as const;
  const escape = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e]/g, ' ').replace(/([\\()])/g, '\\$1');
  const commands = ['0.02 0.33 0.31 rg', 'BT'];
  let y = 788;
  lines.forEach(([line, size]) => { commands.push(`/F1 ${size} Tf`, `1 0 0 1 44 ${y} Tm`, `(${escape(line)}) Tj`); y -= size >= 16 ? 29 : 22; });
  commands.push('ET');
  const stream = commands.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n', offset = Buffer.byteLength(pdf);
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(offset); const part = `${index + 1} 0 obj\n${object}\nendobj\n`; pdf += part; offset += Buffer.byteLength(part); });
  const xref = offset;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(value => { pdf += `${String(value).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(pdf, 'ascii'));
}
