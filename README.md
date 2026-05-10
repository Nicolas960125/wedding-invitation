# Wedding Invitation SPA

SPA de invitaciones de boda con gestión de invitados y RSVP. Stack: Next.js 15 (App Router) + Supabase + Vercel + Tailwind v4 + shadcn/ui.

Ver el plan completo en [`docs/plans/2026-05-09-feat-wedding-invitation-spa-plan.md`](docs/plans/2026-05-09-feat-wedding-invitation-spa-plan.md).

## Setup local

```bash
# Instalar deps
npm install

# Copiar y completar variables de entorno
cp .env.example .env.local
# editar .env.local con valores reales

# Correr en dev
npm run dev
```

## Variables de entorno

| Var | Descripción |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (cliente) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (solo server, NUNCA al cliente) |
| `NEXT_PUBLIC_SITE_URL` | URL pública del sitio (ej: `https://boda.vercel.app`) |
| `ADMIN_EMAILS` | Emails autorizados para magic link admin (comma-separated) |
| `RESEND_API_KEY` | API key de Resend |
| `RESEND_FROM_EMAIL` | Email `from` (dominio verificado en Resend) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL para rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |
| `CRON_SECRET` | Secreto para proteger `/api/cron/*` |
| `SUPABASE_DB_WEBHOOK_SECRET` | Secreto del header `Authorization` del DB Webhook |

## Setup de servicios externos

### Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Correr migrations: `supabase db push` (con CLI) o ejecutar manualmente los SQL de `supabase/migrations/`
3. Configurar Auth → URL Configuration con `Redirect URLs`: `${NEXT_PUBLIC_SITE_URL}/auth/confirm` + dominios de previews
4. Insertar admin emails en tabla `admin_users` o configurar `ADMIN_EMAILS`
5. Crear bucket público `wedding-assets` en Storage para fotos de la galería
6. Deploy Edge Function: `supabase functions deploy send-rsvp-email --no-verify-jwt`
7. Configurar Database Webhook: Database → Webhooks → New
   - Tabla: `guest_group`
   - Eventos: UPDATE
   - URL: `https://<project>.supabase.co/functions/v1/send-rsvp-email`
   - Header: `Authorization: Bearer <SUPABASE_DB_WEBHOOK_SECRET>`

### Vercel

1. Conectar repo a Vercel
2. Configurar env vars en Settings → Environment Variables (Production + Preview)
3. Deploy automático en push a `main`

### Resend

1. Crear cuenta en [resend.com](https://resend.com)
2. Verificar dominio (SPF + DKIM en DNS)
3. Generar API key y agregar a env vars

### Upstash

1. Crear DB Redis gratis en [upstash.com](https://upstash.com)
2. Copiar REST URL y REST token a env vars

## Formato CSV de invitados

Header: `Nombre, Parentezco, Acompañante, Nombre acompañantes`

```csv
Nombre,Parentezco,Acompañante,Nombre acompañantes
"Paola Rivas","mamá del novio",3,"Fabio Reyes, Sebastián Rivas, Andrés Felipe Rivas"
"Erick Gonzalez","Amigo",0,
"Valeria Llanos","Amigo",1,"Karol"
"Shalma Urazán","Amigo",1,
```

Reglas:
- UTF-8 (con o sin BOM)
- Cada fila = 1 grupo (1 invitado primario + N acompañantes)
- Si `Acompañante > 0` y `Nombre acompañantes` está vacío o tiene menos nombres, se generan placeholders `Acompañante 1`, `Acompañante 2`, etc., que el primario completa al confirmar.
- Si `Acompañante = 0` y `Nombre acompañantes` tiene contenido, falla.
- Cap: 500 filas por import.
- Modo: append-only (re-import duplica grupos con mismo `Nombre`).

Template descargable: [`public/csv-template.csv`](public/csv-template.csv).

## Flujos clave

### Para los novios (admin)

1. Login en `/admin/login` con email autorizado → recibís magic link
2. `/admin/import`: subir CSV con la lista
3. Tras import, copiar tokens y mandar links por WhatsApp (ej: `https://boda.vercel.app/invite/X7K2M9AB`)
4. `/admin`: dashboard con KPIs en tiempo real
5. `/admin/groups`: tabla con todas las respuestas
6. `/admin/config`: cerrar RSVP manualmente o cambiar deadline

### Para los invitados

1. Click al link recibido (`/invite/{token}`)
2. Ven la invitación personalizada (saludo a su grupo)
3. Confirman asistencia por persona (sí/no)
4. Pueden volver al link y editar hasta el deadline

## Comandos

```bash
npm run dev          # dev server con turbopack
npm run build        # build de produccion
npm run start        # servir build
npm run lint         # ESLint
npm run typecheck    # TypeScript sin emit
npm run email:dev    # preview de templates React Email
```

## TODO antes del go-live

- [ ] Completar `lib/wedding-config.ts` con datos reales del evento
- [ ] Subir fotos de la galería a Supabase Storage o `public/gallery/`
- [ ] Verificar dominio en Resend (SPF + DKIM)
- [ ] Configurar Database Webhook en Supabase Dashboard
- [ ] Insertar emails de admin en tabla `admin_users` (o `ADMIN_EMAILS` env)
- [ ] Cargar CSV inicial vía `/admin/import`
- [ ] Testear flow completo end-to-end con un grupo de prueba
- [ ] Verificar Open Graph preview en WhatsApp
- [ ] Lighthouse audit en mobile

## Estructura

```
app/
  invite/[token]/         # invitación pública por token
  admin/                  # módulo admin con magic link
  auth/confirm/           # callback de Supabase Auth
actions/                  # server actions
lib/
  supabase/               # clients (browser, server, admin)
  schemas/                # zod schemas
  auth/                   # whitelist admin
components/ui/            # shadcn components
emails/                   # React Email templates
supabase/
  migrations/             # SQL versionado
  functions/              # Edge Functions Deno
docs/
  brainstorms/            # ideación
  plans/                  # planes de implementación
tests/fixtures/           # CSV reales para testing
```

## Documentación

- Plan completo: [`docs/plans/2026-05-09-feat-wedding-invitation-spa-plan.md`](docs/plans/2026-05-09-feat-wedding-invitation-spa-plan.md)
- Brainstorm origen: [`docs/brainstorms/2026-05-09-wedding-invitation-spa-brainstorm.md`](docs/brainstorms/2026-05-09-wedding-invitation-spa-brainstorm.md)
