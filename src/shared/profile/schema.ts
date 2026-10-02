import { z } from 'zod';
import { localDateSchema, timezoneSchema } from '@/shared/journey/domain';

export const motivationsSchema = z.array(z.string().trim().min(1).max(200)).max(10);

export const profileSchema = z.object({
  full_name: z.string().trim().max(200),
  phone_number: z.string().trim().max(40).optional(),
  gender: z.enum(['', 'Laki-Laki', 'Perempuan']).optional(),
  date_of_birth: localDateSchema.nullable().optional(),
  motivations: motivationsSchema,
  own_reason: z.string().trim().max(300).optional(),
  timezone: timezoneSchema.optional(),
  journey_revision: z.number().int().min(0).optional(),
}).strict().refine(input => (input.own_reason === undefined && input.timezone === undefined) || input.journey_revision !== undefined, {
  message: 'Muat profil terbaru sebelum mengubah rencana.', path: ['journey_revision'],
}).refine(input => (input.own_reason === undefined && input.timezone === undefined) || input.motivations.length <= 2, {
  message: 'Pilih maksimal dua alasan.', path: ['motivations'],
});

export type ProfileInput = z.infer<typeof profileSchema>;
