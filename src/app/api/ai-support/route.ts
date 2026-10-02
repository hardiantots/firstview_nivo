import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const payloadSchema = z.object({
  location: z.string().trim().min(1).max(100),
  situation: z.string().trim().min(1).max(200),
  emotions: z.array(z.enum(['senang', 'sedih', 'marah', 'stres', 'cemas', 'bosan', 'netral'])).min(1).max(3),
  intensity: z.number().int().min(1).max(5),
  motivations: z.array(z.string().trim().min(1).max(200)).max(10).optional(),
}).strict();

// Fixed guidance until clinical review and a shared server-side cost limiter exist.
// No health context is sent to a model provider, and no paid model calls are made.
export async function POST(req: NextRequest) {
  const headers = { 'Cache-Control': 'no-store' };
  const reply = (body: object, status: number) => NextResponse.json(body, { status, headers });
  const token = req.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
  if (!token || token.length > 8192) return reply({ error: 'Silakan masuk kembali.' }, 401);
  try {
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8000) }) },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return reply({ error: 'Sesi tidak valid. Silakan masuk kembali.' }, 401);
    const reader = req.body?.getReader();
    if (!reader) return reply({ error: 'Isian belum lengkap.' }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) {
        await reader.cancel();
        return reply({ error: 'Isian terlalu panjang.' }, 413);
      }
      chunks.push(value);
    }
    let body: unknown;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { return reply({ error: 'Format isian tidak valid.' }, 400); }
    if (!payloadSchema.safeParse(body).success) return reply({ error: 'Periksa lokasi, situasi, emosi, dan intensitas 1–5.' }, 400);
    return reply({
      success: true,
      mode: 'automatic',
      suggestion: 'Kamu bisa memilih satu langkah kecil sekarang.\n\n• Beri jeda sebelum memutuskan untuk merokok.\n• Jika memungkinkan, pindah dari situasi yang memicu keinginan.\n• Pilih kegiatan lain yang nyaman, atau hubungi seseorang yang kamu percaya.\n\nIni panduan otomatis umum, bukan percakapan dengan konsultan atau penilaian kesehatan. Kamu tetap menentukan langkah berikutnya.',
      timestamp: new Date().toISOString(),
    }, 200);
  } catch {
    return reply({ error: 'Bantuan belum dapat dimuat. Silakan coba lagi.' }, 503);
  }
}

