import { getAdminClient } from "@/lib/supabase/admin";
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

  // Un invitado que pasa a attending = false conserva su fila; sin este
  // filtro la silla se veria libre pero contaria como ocupada.
  const guestIds = new Set((guestsRes.data ?? []).map((g) => g.id as string));
  const initialSeating: Record<string, string> = {};
  (seatsRes.data ?? []).forEach((row) => {
    const guestId = row.guest_id as string;
    if (guestIds.has(guestId)) initialSeating[row.seat_id as string] = guestId;
  });

  return (
    <SeatingPlanClient
      guests={(guestsRes.data ?? []) as ConfirmedGuest[]}
      initialSeating={initialSeating}
    />
  );
}
