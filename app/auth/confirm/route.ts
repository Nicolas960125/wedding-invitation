import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAuthorizedAdmin } from '@/lib/auth/isAdmin';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/admin';

  if (!token_hash || !type) {
    return NextResponse.redirect(new URL('/admin/login?error=invalid-link', request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (error) {
    return NextResponse.redirect(new URL('/admin/login?error=expired-link', request.url));
  }

  // Re-verificar que el email del usuario sigue en la whitelist (defensa en profundidad)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const allowed = await isAuthorizedAdmin(user?.email);
  if (!allowed) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/admin/login?error=unauthorized', request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
