import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createHmac } from 'crypto';
import { body, database, failure, HttpError, identity, json } from '@/shared/server/http';
import { access, visible } from '@/shared/consultation/server';
import { applyRoom, roomAction } from '@/shared/consultation/domain';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
export async function GET(req: NextRequest, context: Context) {
  try {
    const actor = await identity(req), id = z.string().uuid().parse((await context.params).id), row = await access(id, actor);
    if (req.nextUrl.searchParams.get('ice') === '1') {
      if (actor !== row.document.user && actor !== row.document.consultant) throw new HttpError(403, 'Hanya peserta dapat melakukan panggilan.');
      if (process.env.NIVO_AUDIO_ENABLED !== 'true' || !process.env.NIVO_TURN_SECRET || !process.env.NIVO_TURN_URL || row.document.state !== 'connected') throw new HttpError(503, 'Panggilan suara belum tersedia.');
      const username = `${Math.floor(Date.now()/1000) + 600}:${actor}`;
      return json({ iceServers: [{ urls: process.env.NIVO_TURN_URL.split(','), username, credential: createHmac('sha1', process.env.NIVO_TURN_SECRET).update(username).digest('base64') }] });
    }
    const before = z.coerce.number().int().min(0).parse(req.nextUrl.searchParams.get('before') || row.document.messages.length);
    const document = visible(row.document, actor), end = Math.min(before, document.messages.length), start = Math.max(0, end - 50);
    return json({ id, revision: row.revision, expiresAt: row.expires_at, actor, document: { ...document, messages: document.messages.slice(start, end) }, previous: start || null });
  } catch (e) { return failure(e); }
}
export async function POST(req: NextRequest, context: Context) {
  try {
    const actor = await identity(req), id = z.string().uuid().parse((await context.params).id);
    const input = z.object({ operationId: z.string().uuid(), action: roomAction }).strict().parse(await body(req));
    for (let attempt = 0; attempt < 3; attempt++) {
      const row = await access(id, actor);
      if (input.action.type === 'signal' && process.env.NIVO_AUDIO_ENABLED !== 'true') throw new HttpError(503, 'Panggilan belum tersedia.');
      let document;
      try { document = applyRoom(row.document, actor, input.action, input.operationId); } catch (e) { throw new HttpError(409, e.message); }
      if (document === row.document) return json({ saved: true });
      const result = await database().rpc('nivo_commit_room', { p_id: id, p_user: document.user, p_consultant: document.consultant, p_expected: row.revision, p_document: document, p_expires: row.expires_at });
      if (result.error) throw new HttpError(503, 'Pesan belum tersimpan. Coba lagi dengan isian yang sama.');
      if (result.data) return json({ saved: true });
    }
    throw new HttpError(409, 'Sesi sedang berubah. Kirim ulang.');
  } catch (e) { return failure(e); }
}
export async function DELETE(req: NextRequest, context: Context) {
  try {
    const actor = await identity(req), id = z.string().uuid().parse((await context.params).id), row = await access(id, actor);
    z.object({ confirm: z.literal('HAPUS CHAT') }).strict().parse(await body(req));
    if (row.document.user !== actor || row.document.state !== 'ended') throw new HttpError(403, 'Hanya pengguna dapat menghapus chat setelah sesi berakhir.');
    // Keep the room ID until retention expiry to prevent a delayed create retry resurrecting a session.
    const document = { ...row.document, contentDeleted: true, satisfaction: {}, lastSeen: {}, messages: [], reads: {}, sharedSummary: '', summary: null, signals: [], operations: {}, reports: [] };
    const result = await database().rpc('nivo_commit_room', { p_id: id, p_user: actor, p_consultant: row.document.consultant, p_expected: row.revision, p_document: document, p_expires: row.expires_at });
    if (result.error || !result.data) throw new HttpError(409, 'Sesi berubah. Coba hapus lagi.');
    return json({ deleted: true });
  } catch (e) { return failure(e); }
}
