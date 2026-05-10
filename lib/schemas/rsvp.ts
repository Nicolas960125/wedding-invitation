import { z } from 'zod';

export const attendingValueSchema = z.enum(['yes', 'no', 'pending']);

export const guestResponseSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().min(1, 'Nombre requerido').max(120),
  attending: attendingValueSchema.nullable(),
  dietaryRestrictions: z.string().max(200).nullable().optional(),
});

export const songItemSchema = z.object({
  label: z.string().min(1).max(200),
  uri: z
    .string()
    .max(100)
    .regex(/^spotify:track:[a-zA-Z0-9]+$/, 'URI invalida')
    .nullable(),
  imageUrl: z.string().url().nullable().optional(),
});

export const rsvpFormSchema = z.object({
  token: z.string().min(1),
  guests: z.array(guestResponseSchema).min(1).max(20),
  message: z.string().max(500).nullable().optional(),
  songs: z.array(songItemSchema).max(8).default([]),
});

export type SongItem = z.infer<typeof songItemSchema>;

export type GuestResponse = z.infer<typeof guestResponseSchema>;
export type RsvpFormInput = z.infer<typeof rsvpFormSchema>;
