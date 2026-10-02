import { NextRequest } from 'next/server';
import { z } from 'zod';
import { body, database, failure, identity, json } from '@/shared/server/http';
import { recordOperation } from '@/shared/server/telemetry';

const payload = z.object({ motivations: z.array(z.string().trim().min(1).max(200)).max(10) }).strict();

export async function POST(req: NextRequest) {
  const started = Date.now();
  let status = 503;
  try {
    const userId = await identity(req);
    const input = payload.parse(await body(req, 8192));
    const { error } = await database().from('user_profile').upsert({
      user_id: userId, motivations: input.motivations,
    }, { onConflict: 'user_id' });
    if (error) throw new Error('Profile persistence failed');
    status = 200;
    return json({ success: true });
  } catch (error) {
    const response = failure(error);
    status = response.status;
    return response;
  } finally {
    recordOperation('profile.motivations', status, Date.now() - started);
  }
}
