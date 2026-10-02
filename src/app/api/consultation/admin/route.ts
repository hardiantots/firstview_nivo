import { NextRequest } from 'next/server';
import { z } from 'zod';
import { body, database, failure, HttpError, identity, json } from '@/shared/server/http';
import { access, staff } from '@/shared/consultation/server';
export const dynamic = 'force-dynamic';
async function admin(req: NextRequest) {
  const actor = await identity(req);
  if ((await staff(actor))[0]?.role !== 'admin') throw new HttpError(403, 'Akses admin diperlukan.');
  return actor;
}
export async function GET(req: NextRequest) {
  try {
    const actor = await admin(req), db = database();
    const offset = z.coerce.number().int().min(0).max(100000).parse(req.nextUrl.searchParams.get('offset') || '0');
    const { data, error } = await db.from('nivo_rooms').select('id,document,expires_at').gt('expires_at', new Date().toISOString()).order('expires_at', { ascending: false }).range(offset, offset + 49);
    if (error) throw new HttpError(503, 'Laporan belum dapat dimuat.');
    const audit = await db.from('nivo_consultation_audit').insert({ actor, action: 'review_reports' });
    if (audit.error) throw new HttpError(503, 'Audit belum dapat dicatat.');
    return json({ reports: data.filter(r => r.document.reports.length).map(r => ({ id: r.id, reports: r.document.reports, state: r.document.state })), next: data.length === 50 ? offset + 50 : null });
  } catch (e) { return failure(e); }
}
export async function POST(req: NextRequest) {
  try {
    const actor = await admin(req), input = z.object({ id: z.string().uuid(), reason: z.string().trim().min(1).max(500) }).strict().parse(await body(req)), row = await access(input.id, actor);
    const document = { ...row.document, state: 'ended', endedAt: new Date().toISOString(), signals: [], reports: [...row.document.reports, { id: crypto.randomUUID(), actor, reason: input.reason, at: new Date().toISOString() }] };
    const result = await database().rpc('nivo_commit_room', { p_id: input.id, p_user: document.user, p_consultant: document.consultant, p_expected: row.revision, p_document: document, p_expires: row.expires_at });
    if (result.error || !result.data) throw new HttpError(409, 'Sesi berubah. Coba kembali.');
    // Reasons remain with the restricted report; never emit them to generic logs.
    const audit = await database().from('nivo_consultation_audit').insert({ actor, room: input.id, action: 'moderator_ended_session' });
    if (audit.error) throw new HttpError(503, 'Sesi berakhir; audit penutupan belum tersimpan.');
    return json({ ended: true });
  } catch (e) { return failure(e); }
}
