'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isAuthorizedAdmin } from '@/lib/auth/isAdmin';
import { adminLoginLimiter, checkLimit } from '@/lib/ratelimit';

const signInSchema = z.object({
  email: z.string().email('Email invalido'),
  next: z.string().optional(),
});

export type SignInState = {
  ok: boolean;
  message?: string;
  error?: string;
};

const GENERIC_RESPONSE: SignInState = {
  ok: true,
  message: 'Si tu email esta autorizado, recibiras un magic link en breve.',
};

export async function signInAction(
  _prev: SignInState | undefined,
  formData: FormData,
): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    next: formData.get('next'),
  });

  if (!parsed.success) {
    return { ok: false, error: 'Email invalido' };
  }

  const headerList = await headers();
  const ip = headerList.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const limitResult = await checkLimit(adminLoginLimiter, `admin-login:${ip}`);
  if (!limitResult.ok) {
    return { ok: false, error: 'Demasiados intentos. Intenta en unos minutos.' };
  }

  const allowed = await isAuthorizedAdmin(parsed.data.email);
  if (!allowed) {
    // Respuesta generica: no leakear quien esta autorizado
    return GENERIC_RESPONSE;
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000';
  const next = parsed.data.next ?? '/admin';
  const redirectTo = `${siteUrl}/auth/confirm?next=${encodeURIComponent(next)}`;

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  });

  if (error) {
    // Aun en error: respuesta generica para evitar leak
    return GENERIC_RESPONSE;
  }

  return GENERIC_RESPONSE;
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}
