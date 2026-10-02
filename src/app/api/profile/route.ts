import { NextRequest } from 'next/server';
import { localDate } from '@/shared/journey/domain';
import { profileSchema } from '@/shared/profile/schema';
import { body, database, failure, HttpError, json, verifiedUser } from '@/shared/server/http';

const fields = 'full_name,email,phone_number,gender,date_of_birth,motivations';

export async function GET(req: NextRequest) {
  try {
    const user = await verifiedUser(req);
    const db = database();
    const [profile, journey] = await Promise.all([
      db.from('user_profile').select(fields).eq('user_id', user.id).maybeSingle(),
      db.from('nivo_journeys').select('revision,document').eq('user_id', user.id).maybeSingle(),
    ]);
    if (profile.error || journey.error) throw new HttpError(503, 'Profil belum dapat dimuat. Silakan coba lagi.');
    return json({ profile: {
      full_name: '', phone_number: '', gender: '', date_of_birth: null,
      ...profile.data, email: user.email || '',
      motivations: Array.isArray(journey.data?.document?.motivations) ? journey.data.document.motivations : profile.data?.motivations || [],
      own_reason: journey.data?.document?.ownReason || '',
      timezone: journey.data?.document?.timezone || null,
      journey_revision: journey.data?.revision || 0,
    } });
  } catch (error) { return failure(error); }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await verifiedUser(req);
    const input = profileSchema.parse(await body(req, 8192));
    if (input.date_of_birth && (input.date_of_birth < '1900-01-01' || input.date_of_birth > localDate(new Date(), 'Asia/Makassar'))) {
      throw new HttpError(400, 'Tanggal lahir tidak valid.');
    }
    const { own_reason, timezone, journey_revision, ...profile } = input;
    if (own_reason !== undefined || timezone !== undefined) {
      const result = await database().rpc('nivo_update_profile', {
        p_user: user.id, p_profile: profile, p_expected: journey_revision,
        p_own_reason: own_reason ?? null, p_timezone: timezone ?? null,
      });
      if (result.error || !result.data) throw new HttpError(503, 'Perubahan belum tersimpan. Silakan coba lagi.');
      if (result.data.error === 'conflict') throw new HttpError(409, 'Ada perubahan dari perangkat lain. Muat profil terbaru sebelum menyimpan ulang.');
      if (!result.data.success) throw new HttpError(503, 'Perubahan belum tersimpan. Silakan coba lagi.');
      return json({ success: true, journey_revision: result.data.revision });
    }
    const { error } = await database().from('user_profile').upsert({ ...profile, user_id: user.id, email: user.email || '' }, { onConflict: 'user_id' });
    if (error) throw new HttpError(503, 'Perubahan belum tersimpan. Silakan coba lagi.');
    return json({ success: true });
  } catch (error) { return failure(error); }
}
