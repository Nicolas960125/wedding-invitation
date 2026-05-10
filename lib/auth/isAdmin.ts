import 'server-only';
import { getAdminClient } from '@/lib/supabase/admin';

/**
 * Verifica si un email esta autorizado para acceder al modulo admin.
 * Whitelist combinada: env var ADMIN_EMAILS + tabla admin_users.
 */
export async function isAuthorizedAdmin(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();

  const envList = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (envList.includes(normalized)) return true;

  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from('admin_users')
      .select('email')
      .eq('email', normalized)
      .maybeSingle();
    if (error) return false;
    return data !== null;
  } catch {
    return false;
  }
}
