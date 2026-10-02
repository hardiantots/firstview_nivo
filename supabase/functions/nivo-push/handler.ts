import { allowedPushEndpoint, validPushKey, validVapidSubject } from '../../../src/shared/push/endpoint.ts';

export type Subscription = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string; enabled: boolean };
export type Delivery = { id: string; user_id: string; reminder_id: string; kind: string; subscriptions: { id: string }[] };
export type PushStore = {
  claim: () => Promise<Delivery[]>;
  active: (id: string) => Promise<boolean>;
  subscription: (id: string, owner: string) => Promise<Subscription | null>;
  remove: (id: string, owner: string) => Promise<void>;
  finish: (id: string, delivered: number) => Promise<void>;
};
type Dependencies = {
  env: (name: string) => string | undefined;
  store: () => PushStore;
  send: (subscription: Subscription, payload: string) => Promise<number>;
};
const response = (status: number, value: object) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });

async function matchesSecret(provided: string, expected: string) {
  if (expected.length < 32 || expected.length > 256 || !provided || provided.length > 256) return false;
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([provided, expected].map(value => crypto.subtle.digest('SHA-256', encoder.encode(value))));
  const left = new Uint8Array(a), right = new Uint8Array(b);
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left[index] ^ right[index];
  return difference === 0;
}

export function createPushHandler(deps: Dependencies) {
  return async (request: Request) => {
    if (request.method !== 'POST') return response(405, { error: 'method_not_allowed' });
    if (!await matchesSecret(request.headers.get('x-nivo-cron-secret') || '', deps.env('NIVO_PUSH_CRON_SECRET') || '')) return response(401, { error: 'unauthorized' });
    if (deps.env('NIVO_PUSH_READY') !== 'true' || !validPushKey(deps.env('NIVO_VAPID_PUBLIC_KEY') || '', 'public') ||
      !validPushKey(deps.env('NIVO_VAPID_PRIVATE_KEY') || '', 'private') || !validVapidSubject(deps.env('NIVO_VAPID_SUBJECT') || '')) return response(503, { error: 'push_not_configured' });
    try {
      const store = deps.store(), deliveries = await store.claim();
      const deadline = Date.now() + 45000;
      let delivered = 0, processed = 0, failed = 0;
      for (let start = 0; start < deliveries.length; start += 4) {
        await Promise.all(deliveries.slice(start, start + 4).map(async delivery => {
          let sent = 0;
          try {
            for (const claimed of delivery.subscriptions) {
              if (Date.now() > deadline) break;
              // Re-read every device after claiming: deletion/disable and owner changes must win.
              const subscription = await store.subscription(claimed.id, delivery.user_id);
              if (!subscription || !subscription.enabled || subscription.user_id !== delivery.user_id) continue;
              if (!allowedPushEndpoint(subscription.endpoint) || !validPushKey(subscription.p256dh, 'public') || !validPushKey(subscription.auth, 'auth')) { await store.remove(subscription.id, delivery.user_id); continue; }
              if (!await store.active(delivery.id)) break;
              try {
                // No name, reason, smoking count, or health text goes onto the lock screen.
                const status = await deps.send(subscription, JSON.stringify({ tag: delivery.id, url: '/notifications' }));
                if (status >= 200 && status < 300) sent++;
                else if (status === 404 || status === 410) await store.remove(subscription.id, delivery.user_id);
                else failed++;
              } catch { failed++; }
            }
          } catch { failed++; }
          finally {
            try { await store.finish(delivery.id, sent); processed++; delivered += sent; }
            catch { failed++; }
          }
        }));
      }
      return response(failed ? 503 : 200, { processed, delivered, failed });
    } catch { return response(503, { error: 'push_unavailable' }); }
  };
}
