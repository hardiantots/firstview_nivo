import { database, HttpError } from '@/shared/server/http';
import { policySchema, Room } from './domain';
export function configuration() {
  try { return process.env.NIVO_CONSULTATION_ENABLED === 'true' && process.env.NIVO_RETENTION_JOB_READY === 'true' ? policySchema.parse(JSON.parse(process.env.NIVO_CONSULTATION_POLICY || '')) : null; } catch { return null; }
}
export async function staff(user?: string) {
  let query = database().from('nivo_consultants').select('*').not('verified_at', 'is', null).eq('environment', process.env.NIVO_ENVIRONMENT === 'production' ? 'production' : 'test');
  if (user) query = query.eq('user_id', user);
  const { data, error } = await query;
  if (error) throw new HttpError(503, 'Daftar konsultan belum tersedia.');
  return data || [];
}
export async function access(id: string, actor: string) {
  const { data, error } = await database().from('nivo_rooms').select('*').eq('id', id).maybeSingle();
  if (error) throw new HttpError(503, 'Percakapan belum dapat dimuat.');
  if (!data || Date.parse(data.expires_at) <= Date.now()) throw new HttpError(404, 'Percakapan tidak tersedia atau masa simpan berakhir.');
  const room = data.document as Room;
  if (actor !== room.user) {
    const verified = (await staff(actor))[0];
    if (!verified || (actor !== room.consultant && verified.role !== 'admin')) throw new HttpError(404, 'Percakapan tidak tersedia.');
    const { error: auditError } = await database().from('nivo_consultation_audit').insert({ actor, room: id, action: verified.role === 'admin' ? 'admin_access' : 'consultant_access' });
    if (auditError) throw new HttpError(503, 'Akses belum dapat dicatat.');
  }
  return { ...data, document: room };
}
export function visible(room: Room, actor: string) {
  const { operations, reports, signals, ...rest } = room;
  return { ...rest, reports: reports.filter(r => r.actor === actor), signals: signals.filter(s => Date.now() - Date.parse(s.at) < 120000) };
}
