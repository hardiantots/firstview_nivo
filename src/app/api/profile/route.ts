import { NextRequest } from 'next/server';
import { z } from 'zod';
import { localDate, localDateSchema } from '@/shared/journey/domain';
import { body, database, failure, HttpError, json, verifiedUser } from '@/shared/server/http';

const fields = 'full_name,email,phone_number,gender,date_of_birth,motivations';
const payload = z.object({
  full_name: z.string().trim().max(200),
  phone_number: z.string().trim().max(40),
  gender: z.enum(['', 'Laki-Laki', 'Perempuan']),
  date_of_birth: localDateSchema.nullable(),
  motivations: z.array(z.string().trim().min(1).max(200)).max(10),
}).strict();

export async function GET(req: NextRequest) {
  try {
    const user = await verifiedUser(req);
    const { data, error } = await database().from('user_profile').select(fields).eq('user_id', user.id).maybeSingle();
    if (error) throw new HttpError(503, 'Profil belum dapat dimuat. Silakan coba lagi.');
    return json({ profile: { full_name: '', phone_number: '', gender: '', date_of_birth: null, motivations: [], ...data, email: user.email || '' } });
  } catch (error) { return failure(error); }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await verifiedUser(req);
    const input = payload.parse(await body(req, 8192));
    if (input.date_of_birth && (input.date_of_birth < '1900-01-01' || input.date_of_birth > localDate(new Date(), 'Asia/Makassar'))) {
      throw new HttpError(400, 'Tanggal lahir tidak valid.');
    }
    const { error } = await database().from('user_profile').upsert({ ...input, user_id: user.id, email: user.email || '' }, { onConflict: 'user_id' });
    if (error) throw new HttpError(503, 'Perubahan belum tersimpan. Silakan coba lagi.');
    return json({ success: true });
  } catch (error) { return failure(error); }
}
