// Genera un magic link de admin sin enviar email (usa la admin API con service role).
// Util para cuando Supabase rate-limita los emails (free tier ~2-3/h) o para evitar
// configurar SMTP custom durante development.
//
// Uso:
//   node --env-file=.env.local scripts/admin-magic-link.mjs [email]
// Default email: primer entry de ADMIN_EMAILS

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const ADMIN_EMAILS = process.env.ADMIN_EMAILS ?? '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const email =
  process.argv[2]?.trim() ||
  ADMIN_EMAILS.split(',').map((e) => e.trim()).filter(Boolean)[0];

if (!email) {
  console.error('Pasa un email como argumento o configura ADMIN_EMAILS');
  process.exit(1);
}

const next = process.argv[3] ?? '/admin';

const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
  method: 'POST',
  headers: {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    type: 'magiclink',
    email,
    options: { redirect_to: `${SITE_URL}/auth/confirm?next=${encodeURIComponent(next)}` },
  }),
});

if (!res.ok) {
  console.error('Error:', res.status, await res.text());
  process.exit(1);
}

const data = await res.json();
const url = `${SITE_URL}/auth/confirm?token_hash=${data.hashed_token}&type=magiclink&next=${encodeURIComponent(next)}`;

console.log(`\nMagic link generado para ${email}:\n`);
console.log(url);
console.log(`\nValido por ~1 hora. Pegalo en el navegador para loguearte.`);
console.log(`OTP de respaldo (6 digitos): ${data.email_otp}\n`);
