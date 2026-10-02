import { NextRequest } from 'next/server';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { body, database, failure, HttpError, identity, json } from '@/shared/server/http';

export const dynamic = 'force-dynamic';
const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const metrics = z.enum(['smoke_free_days', 'total_smoke_free_days', 'days_logged_7']);
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const unavailable = () => new HttpError(404, 'Undangan tidak tersedia, kedaluwarsa, atau sudah dicabut.');

export async function GET(req: NextRequest) {
  try {
    const actor = await identity(req), db = database(), token = req.nextUrl.searchParams.get('token');
    if (token !== null) {
      const parsed = tokenSchema.parse(token);
      const { data, error } = await db.from('nivo_buddy_invites').select('user_id,share_metrics,expires_at,revoked_at,accepted_by').eq('token_hash', hash(parsed)).maybeSingle();
      if (error) throw new HttpError(503, 'Undangan belum dapat dimuat.');
      if (!data || data.user_id === actor || data.revoked_at || data.accepted_by || Date.parse(data.expires_at) <= Date.now()) throw unavailable();
      return json({ metrics: data.share_metrics, expires_at: data.expires_at });
    }
    const { data: owned, error: ownerError } = await db.from('nivo_buddy_links').select('id,share_metrics').eq('user_id', actor).is('revoked_at', null);
    const { data: receiving, error: recipientError } = await db.from('nivo_buddy_links').select('id,share_metrics').eq('buddy_id', actor).is('revoked_at', null);
    const { data: pending, error: inviteError } = await db.from('nivo_buddy_invites').select('id,share_metrics,expires_at').eq('user_id', actor).is('revoked_at', null).is('accepted_by', null).gt('expires_at', new Date().toISOString());
    if (ownerError || recipientError || inviteError) throw new HttpError(503, 'Pendamping belum dapat dimuat.');
    const summaries = [];
    for (const link of receiving || []) {
      const { data, error } = await db.rpc('nivo_buddy_summary', { p_link: link.id, p_actor: actor });
      if (error) throw new HttpError(503, 'Ringkasan belum dapat dimuat.');
      if (data && !data.error) {
        const selected = Object.fromEntries(Object.entries(data).filter(([metric, value]) => metrics.safeParse(metric).success && link.share_metrics.includes(metric) && Number.isSafeInteger(value) && Number(value) >= 0));
        summaries.push({ id: link.id, metrics: selected });
      }
    }
    return json({ owned: owned || [], receiving: summaries, pending: pending || [] });
  } catch (error) { return failure(error); }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await identity(req), db = database();
    const input = z.discriminatedUnion('type', [
      z.object({ type: z.literal('invite'), consent: z.literal(true), metrics: z.array(metrics).min(1).max(3).refine(values => new Set(values).size === values.length) }).strict(),
      z.object({ type: z.literal('accept'), consent: z.literal(true), token: tokenSchema }).strict(),
    ]).parse(await body(req));
    if (input.type === 'invite') {
      const token = randomBytes(32).toString('base64url');
      const { data, error } = await db.rpc('nivo_create_buddy_invite', { p_user: actor, p_token_hash: hash(token), p_metrics: input.metrics });
      if (error) throw new HttpError(503, 'Undangan belum dibuat.');
      if (data?.error) throw new HttpError(409, 'Kamu sudah memiliki satu pendamping. Cabut aksesnya sebelum mengundang orang lain.');
      return json({ path: '/buddy/' + token, expires_at: data.expires_at }, 201);
    }
    const { data, error } = await db.rpc('nivo_accept_buddy', { p_token_hash: hash(input.token), p_buddy: actor });
    if (error) throw new HttpError(503, 'Undangan belum diterima.');
    if (!data || data.error) throw unavailable();
    return json({ accepted: true, link_id: data.link_id });
  } catch (error) { return failure(error); }
}

export async function DELETE(req: NextRequest) {
  try {
    const actor = await identity(req), db = database();
    const input = z.object({ kind: z.enum(['invite', 'link']), id: z.string().uuid() }).strict().parse(await body(req));
    if (input.kind === 'link') {
      const { data, error } = await db.rpc('nivo_revoke_buddy', { p_actor: actor, p_link: input.id });
      if (error) throw new HttpError(503, 'Akses belum dicabut.');
      if (!data) throw unavailable();
    } else {
      const { data, error } = await db.from('nivo_buddy_invites').update({ revoked_at: new Date().toISOString() }).eq('id', input.id).eq('user_id', actor).is('accepted_by', null).is('revoked_at', null).select('id');
      if (error) throw new HttpError(503, 'Undangan belum dicabut.');
      if (!data?.length) {
        const current = await db.from('nivo_buddy_invites').select('id,revoked_at').eq('id', input.id).eq('user_id', actor).is('accepted_by', null).maybeSingle();
        if (current.error) throw new HttpError(503, 'Undangan belum dicabut.');
        if (!current.data?.revoked_at) throw unavailable();
      }
    }
    return json({ revoked: true });
  } catch (error) { return failure(error); }
}
