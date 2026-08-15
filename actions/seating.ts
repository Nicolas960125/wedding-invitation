"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedAdmin } from "@/lib/auth/isAdmin";
import { isSeatId, TOTAL_SEATS } from "@/lib/seating";

export type SeatingActionState = {
  ok: boolean;
  message?: string;
  error?: string;
};

const seatId = z.string().refine(isSeatId, "Puesto invalido");
const guestId = z.string().uuid();

const assignSchema = z.object({
  seat_id: seatId,
  guest_id: guestId,
});

const clearSchema = z.object({
  seat_id: seatId,
});

const assignManySchema = z.object({
  assignments: z
    .array(z.object({ seat_id: seatId, guest_id: guestId }))
    .min(1)
    .max(TOTAL_SEATS),
});

async function ensureAdmin(): Promise<SeatingActionState | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const allowed = await isAuthorizedAdmin(user?.email);
  if (!allowed) return { ok: false, error: "No autorizado" };
  return null;
}

function flattenZod(err: z.ZodError): string {
  return err.issues
    .map((i) => `${i.path.join(".") || "campo"}: ${i.message}`)
    .join("; ");
}

function revalidateSeating() {
  revalidatePath("/admin/mesas");
}

export async function assignSeatAction(
  input: unknown,
): Promise<SeatingActionState> {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const parsed = assignSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Datos invalidos: " + flattenZod(parsed.error) };

  const admin = getAdminClient();

  // Si el invitado ya tenia silla, se mueve: se libera la anterior.
  const { error: moveError } = await admin
    .from("seat_assignment")
    .delete()
    .eq("guest_id", parsed.data.guest_id);

  if (moveError)
    return { ok: false, error: "Error liberando el puesto anterior: " + moveError.message };

  const { error } = await admin
    .from("seat_assignment")
    .upsert(
      { seat_id: parsed.data.seat_id, guest_id: parsed.data.guest_id },
      { onConflict: "seat_id" },
    );

  if (error)
    return { ok: false, error: "Error asignando el puesto: " + error.message };

  revalidateSeating();
  return { ok: true };
}

export async function clearSeatAction(
  input: unknown,
): Promise<SeatingActionState> {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const parsed = clearSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Datos invalidos: " + flattenZod(parsed.error) };

  const admin = getAdminClient();
  const { error } = await admin
    .from("seat_assignment")
    .delete()
    .eq("seat_id", parsed.data.seat_id);

  if (error)
    return { ok: false, error: "Error liberando el puesto: " + error.message };

  revalidateSeating();
  return { ok: true };
}

export async function assignManySeatsAction(
  input: unknown,
): Promise<SeatingActionState> {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const parsed = assignManySchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Datos invalidos: " + flattenZod(parsed.error) };

  const { assignments } = parsed.data;
  const seats = new Set(assignments.map((a) => a.seat_id));
  const ids = new Set(assignments.map((a) => a.guest_id));
  if (seats.size !== assignments.length || ids.size !== assignments.length)
    return { ok: false, error: "Datos invalidos: puestos o invitados repetidos" };

  const admin = getAdminClient();

  const { error: moveError } = await admin
    .from("seat_assignment")
    .delete()
    .in("guest_id", [...ids]);

  if (moveError)
    return { ok: false, error: "Error liberando puestos anteriores: " + moveError.message };

  const { error } = await admin
    .from("seat_assignment")
    .upsert(assignments, { onConflict: "seat_id" });

  if (error)
    return { ok: false, error: "Error asignando los puestos: " + error.message };

  revalidateSeating();
  return { ok: true, message: `Se sentaron ${assignments.length} invitados.` };
}

export async function clearAllSeatsAction(): Promise<SeatingActionState> {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const admin = getAdminClient();
  const { error } = await admin
    .from("seat_assignment")
    .delete()
    .not("seat_id", "is", null);

  if (error)
    return { ok: false, error: "Error vaciando el plano: " + error.message };

  revalidateSeating();
  return { ok: true, message: "Plano vacío." };
}
