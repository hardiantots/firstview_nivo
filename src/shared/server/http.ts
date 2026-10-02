import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
export async function verifiedUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
  if (!token || token.length > 8192) throw new HttpError(401, 'Silakan masuk kembali.');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new HttpError(503, 'Layanan belum dikonfigurasi.');
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }) } });
  const { data, error } = await client.auth.getUser(token);
  if (error && (error.name === 'AuthRetryableFetchError' || error.status >= 500)) throw new HttpError(503, 'Sesi belum dapat diverifikasi. Silakan coba lagi saat layanan tersedia.');
  if (error || !data.user) throw new HttpError(401, 'Sesi tidak valid. Silakan masuk kembali.');
  return data.user;
}
export async function identity(req: NextRequest) { return (await verifiedUser(req)).id; }
export function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new HttpError(503, 'Layanan belum dikonfigurasi.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(12000) }) } });
}
export async function body(req: NextRequest, limit = 40000): Promise<unknown> {
  const reader = req.body?.getReader(); if (!reader) throw new HttpError(400, 'Isian kosong.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const next = await reader.read(); if (next.done) break; size += next.value.byteLength; if (size > limit) { await reader.cancel(); throw new HttpError(413, 'Isian terlalu panjang.'); } chunks.push(next.value); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HttpError(400, 'Format isian tidak valid.'); }
}
export function failure(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  if (error && typeof error === 'object' && 'issues' in error) return json({ error: 'Periksa kembali format dan batas isian.' }, 400);
  return json({ error: 'Layanan belum dapat diakses. Isianmu tetap ada; silakan coba lagi.' }, 503);
}
