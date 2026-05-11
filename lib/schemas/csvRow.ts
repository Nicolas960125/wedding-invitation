import { z } from 'zod';

export const GUEST_TITLES = ['Sr.', 'Sra.', 'Srita.'] as const;
export type GuestTitle = (typeof GUEST_TITLES)[number];

const titleSchema = z
  .string()
  .optional()
  .default('')
  .transform((s) => (s ? s.trim() : ''))
  .refine((s) => s === '' || (GUEST_TITLES as readonly string[]).includes(s), {
    message: `Título debe ser uno de: ${GUEST_TITLES.join(', ')}`,
  })
  .transform((s) => (s === '' ? null : (s as GuestTitle)));

// Header esperado del CSV: Nombre, Parentezco, Acompañante, Nombre acompañantes, Título (opcional)
// "Parentezco" con z preservado tal cual lo escribe el usuario en su fuente.
export const csvRowSchema = z
  .object({
    Nombre: z.string().min(1, 'Nombre requerido'),
    Parentezco: z.string().optional().default(''),
    Acompañante: z.coerce
      .number({ invalid_type_error: 'Acompañante debe ser un numero' })
      .int('Acompañante debe ser entero')
      .min(0, 'Acompañante debe ser >= 0'),
    'Nombre acompañantes': z.string().optional().default(''),
    Título: titleSchema,
  })
  .transform((raw) => ({
    name: raw.Nombre.trim(),
    relationship: raw.Parentezco?.trim() || null,
    companionCount: raw.Acompañante,
    companionNames: raw['Nombre acompañantes']?.trim() || '',
    title: raw.Título,
  }))
  .refine((v) => !(v.companionCount === 0 && v.companionNames.length > 0), {
    message: 'Si Acompañante=0, Nombre acompañantes debe estar vacio',
  });

export type CsvRow = z.infer<typeof csvRowSchema>;

export type ImportGroupPayload = {
  display_name: string;
  relationship: string | null;
  max_attendees: number;
  primary_name: string;
  primary_title: GuestTitle | null;
  companion_names: string[];
};
