import { NextRequest } from 'next/server';
import { z } from 'zod';
import { body, database, failure, identity, json, HttpError } from '@/shared/server/http';
import { configuration, staff } from '@/shared/consultation/server';
import { Room } from '@/shared/consultation/domain';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    const actor = await identity(req), policy = configuration();
    if (!policy) return json({ available: false, consultants: [], rooms: [], policy: null });
    const consultants = await staff(), own = consultants.find(c => c.user_id === actor);
    const { data: rooms, error } = await database().from('nivo_rooms').select('id,expires_at').eq(own ? 'consultant_id' : 'user_id', actor).gt('expires_at', new Date().toISOString()).order('expires_at', { ascending: false }).limit(30);
    if (error) throw new HttpError(503, 'Daftar sesi belum dapat dimuat.');
    return json({ policy, available: policy.hours.some(h => Date.parse(h.start) <= Date.now() && Date.parse(h.end) > Date.now()), role: own?.role || 'user', actor, rooms, audio: process.env.NIVO_AUDIO_ENABLED === 'true' && !!process.env.NIVO_TURN_SECRET && !!process.env.NIVO_TURN_URL, consultants: consultants.filter(c => c.role === 'consultant').map(c => ({ id: c.user_id, name: c.display_name, credentials: c.credentials, available: Date.parse(c.available_until) > Date.now() })) });
  } catch (e) { return failure(e); }
}
export async function POST(req: NextRequest) {
  try {
    const actor = await identity(req), policy = configuration();
    if (!policy) throw new HttpError(503, 'Layanan konsultasi belum tersedia.');
    const input = z.object({ id: z.string().uuid(), consultant: z.string().uuid(), consent: z.literal(true), policyVersion: z.string(), sharedSummary: z.string().max(2000) }).strict().parse(await body(req));
    const db = database();
    const { data: old, error: oldError } = await db.from('nivo_rooms').select('user_id,document,expires_at').eq('id', input.id).maybeSingle();
    if (oldError) throw new HttpError(503, 'Sesi belum dapat diperiksa.');
    if (old) { if (old.user_id !== actor || old.document.consultant !== input.consultant || old.document.sharedSummary !== input.sharedSummary || old.document.policy.version !== input.policyVersion || Date.parse(old.expires_at) <= Date.now()) throw new HttpError(409, 'ID sesi sudah digunakan.'); return json({ id: input.id }); }
    if (input.policyVersion !== policy.version) throw new HttpError(409, 'Kebijakan berubah. Tinjau kembali sebelum memulai.');
    const consultant = (await staff(input.consultant))[0];
    if (!policy.hours.some(h => Date.parse(h.start) <= Date.now() && Date.parse(h.end) > Date.now()) || !consultant || consultant.role !== 'consultant' || !(Date.parse(consultant.available_until) > Date.now()) || input.consultant === actor) throw new HttpError(409, 'Konsultan belum tersedia.');
    const at = new Date().toISOString();
    const document: Room = { user: actor, consultant: input.consultant, state: 'queued', createdAt: at, policy, sharedSummary: input.sharedSummary, consentAt: at, messages: [], reads: {}, reports: [], summary: null, signals: [], operations: {} };
    const result = await db.rpc('nivo_commit_room', { p_id: input.id, p_user: actor, p_consultant: input.consultant, p_expected: 0, p_document: document, p_expires: new Date(Date.now() + policy.retentionDays * 86400000).toISOString() });
    if (result.error) throw new HttpError(503, 'Antrean belum tersimpan.');
    if (!result.data) throw new HttpError(409, 'Sesi berubah; coba lagi.');
    return json({ id: input.id });
  } catch (e) { return failure(e); }
}
