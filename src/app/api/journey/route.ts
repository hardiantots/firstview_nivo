import { NextRequest } from 'next/server';
import { z } from 'zod';
import { emptyJourney, reduceJourney, timezoneSchema } from '@/shared/journey/domain';
import { body, database, failure, HttpError, identity, json } from '@/shared/server/http';
import { journeyState } from '@/shared/server/journey-state';
import { journeyOperationSchema } from '@/shared/journey/operation';
export const dynamic = 'force-dynamic';
const flags = () => ({
  triggers: process.env.NIVO_FEATURE_TRIGGERS !== 'false',
  coping: process.env.NIVO_FEATURE_COPING !== 'false',
  slips: process.env.NIVO_FEATURE_SLIPS !== 'false',
  followups: process.env.NIVO_FEATURE_FOLLOWUPS !== 'false',
});
export async function GET(req: NextRequest) {
  try {
    const user = await identity(req),
      db = database();
    const { data, error } = await db
      .from('nivo_journeys')
      .select('revision,document')
      .eq('user_id', user)
      .maybeSingle();
    if (error)
      throw new HttpError(
        503,
        'Penyimpanan perjalanan belum siap. Coba lagi setelah layanan tersedia.',
      );
    const zone = timezoneSchema.safeParse(req.nextUrl.searchParams.get('timezone'));
    const { state } = await journeyState(
      db,
      user,
      data?.document,
      zone.success ? zone.data : undefined,
    );
    return json({ revision: data?.revision || 0, state, flags: flags() });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    const user = await identity(req),
      db = database();
    const input = journeyOperationSchema.parse(await body(req));
    const { data: previous, error: previousError } = await db
      .from('nivo_journey_operations')
      .select('request')
      .eq('user_id', user)
      .eq('operation_id', input.operationId)
      .maybeSingle();
    if (previousError) throw new HttpError(503, 'Penyimpanan perjalanan belum siap.');
    const { data: current, error } = await db
      .from('nivo_journeys')
      .select('revision,document')
      .eq('user_id', user)
      .maybeSingle();
    if (error) throw new HttpError(503, 'Catatan belum dapat dimuat.');
    const { state, unresolvedReasons } = await journeyState(
      db,
      user,
      current?.document,
      input.timezone,
    );
    if (previous) {
      const normalize = (value: object) =>
        JSON.stringify(
          Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))),
        );
      if (normalize(previous.request) !== normalize(input.action))
        throw new HttpError(409, 'ID permintaan telah dipakai untuk isian berbeda.');
      return json({ revision: current.revision, state, flags: flags(), replayed: true });
    }
    if ((current?.revision || 0) !== input.expectedRevision)
      throw new HttpError(
        409,
        'Ada perubahan dari perangkat lain. Muat versi terbaru sebelum menyimpan ulang.',
      );
    const feature = {
      checkin: 'triggers',
      craving_event: 'triggers',
      coping: 'coping',
      coping_feedback: 'coping',
      slip: 'slips',
      preferences: 'followups',
      reminder_answer: 'followups',
    }[input.action.type];
    if (feature && !flags()[feature]) throw new HttpError(403, 'Fitur ini sedang dinonaktifkan.');
    let document;
    try {
      document = reduceJourney(state, input.action, input.operationId);
    } catch (e) {
      throw new HttpError(400, e instanceof Error ? e.message : 'Isian tidak valid.');
    }
    if (unresolvedReasons && input.action.type !== 'reasons') delete document.motivations;
    const result = await db.rpc('nivo_commit_journey', {
      p_user: user,
      p_operation: input.operationId,
      p_expected: input.expectedRevision,
      p_request: input.action,
      p_document: document,
    });
    if (result.error) throw new HttpError(503, 'Catatan belum tersimpan. Silakan coba lagi.');
    if (result.data.error)
      throw new HttpError(
        409,
        'Catatan berubah atau ID permintaan sudah dipakai. Muat versi terbaru.',
      );
    return json({ ...result.data, flags: flags() });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(req: NextRequest) {
  try {
    const user = await identity(req);
    const input = z
      .object({ expectedRevision: z.number().int().min(0), confirm: z.literal('HAPUS PERJALANAN') })
      .strict()
      .parse(await body(req));
    const result = await database().rpc('nivo_delete_journey', {
      p_user: user,
      p_expected: input.expectedRevision,
      p_empty: emptyJourney(),
    });
    if (result.error) throw new HttpError(503, 'Data belum berhasil dihapus.');
    if (!result.data) throw new HttpError(409, 'Data berubah. Muat ulang sebelum menghapus.');
    return json({ deleted: true });
  } catch (e) {
    return failure(e);
  }
}
