import { z } from 'zod';
import { allowedPushEndpoint, validPushKey, validVapidSubject } from './endpoint';

export const pushEndpointSchema = z.string().max(2048).refine(allowedPushEndpoint);
export const pushSubscriptionSchema = z.object({
  endpoint: pushEndpointSchema,
  expirationTime: z.number().finite().nonnegative().nullable().optional(),
  keys: z.object({
    p256dh: z.string().max(100).refine(value => validPushKey(value, 'public')),
    auth: z.string().max(32).refine(value => validPushKey(value, 'auth')),
  }).strict(),
}).strict();

export function pushConfigured() {
  return process.env.NIVO_PUSH_READY === 'true' &&
    validPushKey(process.env.NIVO_VAPID_PUBLIC_KEY || '', 'public') &&
    validPushKey(process.env.NIVO_VAPID_PRIVATE_KEY || '', 'private') &&
    validVapidSubject(process.env.NIVO_VAPID_SUBJECT || '');
}
