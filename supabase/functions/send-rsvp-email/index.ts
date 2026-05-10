// Edge Function: send-rsvp-email
//
// Disparada por Database Webhook tras un UPDATE en guest_group con responded_at cambiado.
// Envia un email a los novios via Resend, con idempotencia (5 min debounce por grupo).
//
// Deploy:
//   supabase functions deploy send-rsvp-email --no-verify-jwt
// Secrets requeridos:
//   RESEND_API_KEY
//   RESEND_FROM_EMAIL  (ej: noreply@tudominio.com)
//   ADMIN_EMAILS       (comma-separated, recipients)
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   SUPABASE_DB_WEBHOOK_SECRET  (validacion del Authorization del webhook)
//   SITE_URL           (para link al admin en el email)

import { createClient } from 'jsr:@supabase/supabase-js@2';

type SongItem = { label: string; uri: string | null; imageUrl?: string | null };

type WebhookPayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: {
    id: string;
    token: string;
    display_name: string;
    relationship: string | null;
    responded_at: string | null;
    message: string | null;
    songs: SongItem[] | null;
  };
  old_record: { responded_at: string | null } | null;
  schema: string;
};

Deno.serve(async (req) => {
  // Validar webhook secret
  const expectedSecret = Deno.env.get('SUPABASE_DB_WEBHOOK_SECRET');
  const receivedAuth = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (expectedSecret && receivedAuth !== expectedSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (payload.type !== 'UPDATE' || payload.table !== 'guest_group') {
    return new Response('Ignored', { status: 200 });
  }

  const newResponded = payload.record.responded_at;
  const oldResponded = payload.old_record?.responded_at ?? null;
  if (newResponded === oldResponded) {
    return new Response('No change in responded_at', { status: 200 });
  }
  if (!newResponded) {
    return new Response('Cleared responded_at, skip', { status: 200 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Idempotencia: insertar en outbox con UNIQUE constraint en (group_id, bucket de 5min)
  const { data: outboxRow, error: outboxErr } = await supabase
    .from('email_outbox')
    .insert({
      group_id: payload.record.id,
      payload: payload.record,
    })
    .select('id')
    .maybeSingle();

  if (outboxErr) {
    // UNIQUE violation = ya se mando en esta ventana
    if (outboxErr.code === '23505') {
      return new Response('Already sent in window', { status: 200 });
    }
    return new Response('Outbox error: ' + outboxErr.message, { status: 500 });
  }

  // Cargar invitados del grupo para el template
  const { data: guests } = await supabase
    .from('guest')
    .select('full_name, attending, dietary_restrictions, is_primary')
    .eq('group_id', payload.record.id)
    .order('is_primary', { ascending: false });

  // Construir HTML del email
  const adminEmails = (Deno.env.get('ADMIN_EMAILS') ?? '').split(',').map((e) => e.trim()).filter(Boolean);
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? 'onboarding@resend.dev';
  const siteUrl = Deno.env.get('SITE_URL') ?? '';
  const resendApiKey = Deno.env.get('RESEND_API_KEY');

  if (!resendApiKey || adminEmails.length === 0) {
    if (outboxRow) {
      await supabase
        .from('email_outbox')
        .update({ last_error: 'Missing RESEND_API_KEY or ADMIN_EMAILS' })
        .eq('id', outboxRow.id);
    }
    return new Response('Missing config', { status: 500 });
  }

  const yesGuests = (guests ?? []).filter((g) => g.attending === true);
  const noGuests = (guests ?? []).filter((g) => g.attending === false);

  const html = `
    <h2>RSVP de ${payload.record.display_name}</h2>
    <p>${payload.record.relationship ?? ''}</p>
    <h3>Asisten (${yesGuests.length})</h3>
    <ul>
      ${yesGuests.map((g) => `<li>${escapeHtml(g.full_name)}${g.dietary_restrictions ? ' — ' + escapeHtml(g.dietary_restrictions) : ''}</li>`).join('')}
    </ul>
    ${noGuests.length > 0 ? `<h3>No asisten (${noGuests.length})</h3><ul>${noGuests.map((g) => `<li>${escapeHtml(g.full_name)}</li>`).join('')}</ul>` : ''}
    ${payload.record.message ? `<h3>Mensaje</h3><p>${escapeHtml(payload.record.message)}</p>` : ''}
    ${
      payload.record.songs && payload.record.songs.length > 0
        ? `<h3>Canciones sugeridas (${payload.record.songs.length})</h3><ul>${payload.record.songs
            .map(
              (s) =>
                `<li>${escapeHtml(s.label)}${s.uri ? ` <a href="https://open.spotify.com/track/${s.uri.replace('spotify:track:', '')}">[Spotify]</a>` : ''}</li>`,
            )
            .join('')}</ul>`
        : ''
    }
    ${siteUrl ? `<p><a href="${siteUrl}/admin/groups">Ver en el panel admin</a></p>` : ''}
  `.trim();

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: adminEmails,
      subject: `RSVP · ${payload.record.display_name}`,
      html,
    }),
  });

  if (!resendRes.ok) {
    const err = await resendRes.text();
    if (outboxRow) {
      await supabase
        .from('email_outbox')
        .update({ last_error: err, attempts: 1 })
        .eq('id', outboxRow.id);
    }
    return new Response('Resend error: ' + err, { status: 500 });
  }

  if (outboxRow) {
    await supabase
      .from('email_outbox')
      .update({ sent_at: new Date().toISOString(), attempts: 1 })
      .eq('id', outboxRow.id);
  }

  return new Response('Email sent', { status: 200 });
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
