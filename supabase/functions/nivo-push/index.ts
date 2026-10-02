import { createClient } from 'npm:@supabase/supabase-js@2.84.0';
import webpush from 'npm:web-push@3.6.7';
import { createPushHandler, type Delivery, type Subscription } from './handler.ts';

const env = (name: string) => Deno.env.get(name);
const database = () => {
  const url = env('SUPABASE_URL'), key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('missing_configuration');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }) },
  });
};

Deno.serve(createPushHandler({
  env,
  store: () => {
    const db = database();
    return {
      claim: async () => { const { data, error } = await db.rpc('nivo_claim_push', { p_limit: 25 }); if (error || !Array.isArray(data)) throw new Error('claim_failed'); return data as Delivery[]; },
      active: async id => { const { data, error } = await db.rpc('nivo_push_delivery_active', { p_delivery: id }); if (error) throw new Error('status_failed'); return data === true; },
      subscription: async (id, owner) => {
        const { data, error } = await db.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth,enabled').eq('id', id).eq('user_id', owner).eq('enabled', true).maybeSingle();
        if (error) throw new Error('subscription_failed'); return data as Subscription | null;
      },
      remove: async (id, owner) => { const { error } = await db.from('push_subscriptions').delete().eq('id', id).eq('user_id', owner); if (error) throw new Error('cleanup_failed'); },
      finish: async (id, delivered) => { const { error } = await db.rpc('nivo_finish_push', { p_delivery: id, p_delivered: delivered }); if (error) throw new Error('finish_failed'); },
    };
  },
  send: async (subscription, payload) => {
    const details = webpush.generateRequestDetails({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload, {
      vapidDetails: { subject: env('NIVO_VAPID_SUBJECT')!, publicKey: env('NIVO_VAPID_PUBLIC_KEY')!, privateKey: env('NIVO_VAPID_PRIVATE_KEY')! },
      TTL: 300, urgency: 'low', contentEncoding: 'aes128gcm',
    });
    // Use native fetch so provider redirects cannot turn a stored endpoint into an SSRF request.
    const response = await fetch(details.endpoint, { method: 'POST', headers: details.headers, body: details.body, redirect: 'error', signal: AbortSignal.timeout(10000) });
    await response.body?.cancel();
    return response.status;
  },
}));
