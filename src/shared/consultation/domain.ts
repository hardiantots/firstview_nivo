import { z } from 'zod';
export const policySchema = z.object({ version: z.string().min(1), cost: z.string().min(1), boundaries: z.string().min(1), retentionDays: z.number().int().min(1).max(365), waitMinutes: z.number().int().min(0), hours: z.array(z.object({ start: z.string().datetime(), end: z.string().datetime() }).refine(h => Date.parse(h.end) > Date.parse(h.start), 'Akhir jadwal harus setelah mulai')).min(1) });
export type Policy = z.infer<typeof policySchema>;
const text = (max: number) => z.string().trim().min(1).max(max);
export const roomAction = z.discriminatedUnion('type', [
  z.object({ type: z.literal('heartbeat') }).strict(),
  z.object({ type: z.literal('metric'), event: z.enum(['connected', 'disconnected', 'failed', 'no_answer', 'mic_denied']) }).strict(),
  z.object({ type: z.literal('satisfaction'), score: z.number().int().min(1).max(5) }).strict(),
  z.object({ type: z.literal('message'), text: text(2000) }).strict(),
  z.object({ type: z.literal('read'), messageId: z.string().uuid() }).strict(),
  z.object({ type: z.literal('accept') }).strict(),
  z.object({ type: z.literal('end') }).strict(),
  z.object({ type: z.literal('report'), reason: text(500) }).strict(),
  z.object({ type: z.literal('summary'), text: text(2000) }).strict(),
  z.object({ type: z.literal('approve_summary') }).strict(),
  z.object({ type: z.literal('signal'), kind: z.enum(['offer', 'answer', 'ice', 'hangup']), callId: z.string().uuid(), data: z.string().max(16000) }).strict(),
]);
export type RoomAction = z.infer<typeof roomAction>;
export type Room = { contentDeleted?: boolean; metrics?: Record<string, number>; satisfaction?: Record<string, number>; acceptedAt?: string; lastSeen?: Record<string, string>; user: string; consultant: string; state: 'queued' | 'connected' | 'ended'; createdAt: string; endedAt?: string; policy: Policy; sharedSummary: string; consentAt: string; messages: { id: string; sender: string; text: string; at: string }[]; reads: Record<string, string>; reports: { id: string; actor: string; reason: string; at: string }[]; summary: { text: string; approved: boolean } | null; signals: { id: string; sender: string; kind: string; callId: string; data: string; at: string }[]; operations: Record<string, { actor: string; action: RoomAction }>; };
export function isParticipant(room: Room, actor: string) { return room.user === actor || room.consultant === actor; }
export function applyRoom(previous: Room, actor: string, input: RoomAction, id: string, now = new Date()): Room {
  if (previous.contentDeleted) throw new Error('Isi sesi sudah dihapus.');
  if (!isParticipant(previous, actor)) throw new Error('Percakapan tidak dapat diakses.');
  const action = roomAction.parse(input), old = previous.operations[id];
  if (old) {
    const canonical = (a: object) => JSON.stringify(Object.fromEntries(Object.entries(a).sort(([a], [b]) => a.localeCompare(b))));
    if (old.actor !== actor || canonical(old.action) !== canonical(action)) throw new Error('ID permintaan sudah digunakan.');
    return previous;
  }
  const room = structuredClone(previous), at = now.toISOString();
  if (room.state === 'ended' && !['report', 'approve_summary', 'read', 'heartbeat', 'metric', 'satisfaction'].includes(action.type)) throw new Error('Sesi sudah berakhir.');
  if (action.type === 'metric') room.metrics = { ...room.metrics, [action.event]: (room.metrics?.[action.event] || 0) + 1 };
  if (action.type === 'satisfaction') room.satisfaction = { ...room.satisfaction, [actor]: action.score };
  if (action.type === 'heartbeat') room.lastSeen = { ...room.lastSeen, [actor]: at };
  if (action.type === 'accept') { if (actor !== room.consultant || room.state !== 'queued') throw new Error('Hanya konsultan dapat menerima antrean.'); room.state = 'connected'; room.acceptedAt = at; }
  if (action.type === 'message') { if (room.state !== 'connected') throw new Error('Tunggu konsultan menerima sesi.'); room.messages.push({ id, sender: actor, text: action.text, at }); }
  if (action.type === 'read') { if (!room.messages.some(m => m.id === action.messageId)) throw new Error('Pesan tidak ditemukan.'); room.reads[actor] = action.messageId; }
  if (action.type === 'end') { room.state = 'ended'; room.endedAt = at; room.signals = []; }
  if (action.type === 'report') room.reports.push({ id, actor, reason: action.reason, at });
  if (action.type === 'summary') { if (actor !== room.consultant) throw new Error('Ringkasan diajukan oleh konsultan.'); room.summary = { text: action.text, approved: false }; }
  if (action.type === 'approve_summary') { if (actor !== room.user || !room.summary) throw new Error('Pengguna perlu meninjau ringkasan terlebih dahulu.'); room.summary.approved = true; }
  if (action.type === 'signal') {
    if (room.state !== 'connected') throw new Error('Sesi belum terhubung.');
    if (room.signals.some(s => s.id === id && s.sender === actor && s.kind === action.kind && s.data === action.data)) return previous;
    room.signals = room.signals.filter(s => now.getTime() - Date.parse(s.at) < 120000);
    if (action.kind === 'offer' && room.signals.some(s => s.kind === 'offer' && s.callId !== action.callId)) throw new Error('Ada panggilan yang masih aktif.');
    if (action.kind !== 'offer' && !room.signals.some(s => s.kind === 'offer' && s.callId === action.callId)) throw new Error('Panggilan telah berakhir.');
    if (action.kind === 'hangup') room.signals = room.signals.filter(s => s.callId !== action.callId);
    else room.signals.push({ id, sender: actor, kind: action.kind, callId: action.callId, data: action.data, at });
  }
  // SDP and ICE are transient; do not copy them into durable idempotency history.
  if (action.type !== 'signal' && action.type !== 'heartbeat') room.operations[id] = { actor, action };
  if (JSON.stringify(room).length > 1000000) throw new Error('Batas sesi tercapai. Akhiri sesi dan mulai sesi baru.');
  return room;
}
