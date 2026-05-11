import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // implicit en lugar de PKCE: el token_hash que llega al /auth/confirm
        // no depende de un code_verifier guardado en cookies, asi el magic link
        // sobrevive cross-device, modo incognito y pre-fetch de anti-phishing.
        flowType: 'implicit',
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components no pueden setear cookies; el middleware refresca la sesion.
          }
        },
      },
    }
  );
}
