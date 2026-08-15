import { getAdminClient } from "@/lib/supabase/admin";
import { isSeatId, isFixedSeat } from "@/lib/seating";
import {
  SeatingPlanClient,
  type ConfirmedGuest,
} from "./_components/SeatingPlanClient";

export const dynamic = "force-dynamic";

export default async function MesasPage() {
  const admin = getAdminClient();
  const [guestsRes, seatsRes] = await Promise.all([
    admin
      .from("guest")
      .select("id, full_name, dietary_restrictions")
      .eq("attending", true)
      .order("full_name", { ascending: true }),
    admin.from("seat_assignment").select("seat_id, guest_id"),
  ]);

  const error = guestsRes.error ?? seatsRes.error;
  if (error) {
    return (
      <div>
        <h1 className="font-serif text-2xl">Plano de mesas</h1>
        <p className="text-destructive mt-4 text-sm">
          Error cargando el plano: {error.message}
        </p>
      </div>
    );
  }

  // Se descartan las filas que ya no corresponden a una silla del plano ni a
  // un invitado confirmado: un invitado que pasa a attending = false conserva
  // su fila, y las sillas eliminadas del plano dejan asignaciones huerfanas.
  // Sin este filtro la silla se veria libre pero contaria como ocupada.
  const guestIds = new Set((guestsRes.data ?? []).map((g) => g.id as string));
  const initialSeating: Record<string, string> = {};
  (seatsRes.data ?? []).forEach((row) => {
    const seatId = row.seat_id as string;
    const guestId = row.guest_id as string;
    if (isSeatId(seatId) && !isFixedSeat(seatId) && guestIds.has(guestId)) {
      initialSeating[seatId] = guestId;
    }
  });

  return (
    <SeatingPlanClient
      guests={(guestsRes.data ?? []) as ConfirmedGuest[]}
      initialSeating={initialSeating}
    />
  );
}
