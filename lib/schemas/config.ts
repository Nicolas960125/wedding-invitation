import { z } from 'zod';

export const registryLinkSchema = z.object({
  label: z.string().min(1).max(80),
  url: z.string().url(),
});

export const weddingConfigSchema = z.object({
  weddingDate: z.string().datetime(),
  rsvpDeadline: z.string().datetime(),
  rsvpOpen: z.boolean(),
  publishedAt: z.string().datetime(),
  ceremonyLocationName: z.string().nullable(),
  ceremonyLocationAddress: z.string().nullable(),
  ceremonyLocationMapsUrl: z.string().url().nullable(),
  ceremonyTime: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .nullable(),
  receptionLocationName: z.string().nullable(),
  receptionLocationAddress: z.string().nullable(),
  receptionLocationMapsUrl: z.string().url().nullable(),
  receptionTime: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .nullable(),
  dressCode: z.string().nullable(),
  registryLinks: z.array(registryLinkSchema).default([]),
  notes: z.string().nullable(),
});

export type WeddingConfig = z.infer<typeof weddingConfigSchema>;
export type RegistryLink = z.infer<typeof registryLinkSchema>;
