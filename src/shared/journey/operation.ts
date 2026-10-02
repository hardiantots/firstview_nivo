import { z } from 'zod';
import { journeyActionSchema, timezoneSchema } from './domain';

// The API and device retry queue must use the same validation contract.
export const journeyOperationSchema = z
  .object({
    operationId: z.string().uuid(),
    expectedRevision: z.number().int().min(0),
    action: journeyActionSchema,
    timezone: timezoneSchema.optional(),
  })
  .strict();

export type JourneyOperation = z.infer<typeof journeyOperationSchema>;

export function readPendingOperation(value: string | null): JourneyOperation | null {
  if (value === null) return null;
  return journeyOperationSchema.parse(JSON.parse(value));
}
