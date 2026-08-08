import { getAdminClient } from "@/lib/supabase/admin";
import {
  SeatingPlanClient,
  type ConfirmedGuest,
} from "./_components/SeatingPlanClient";

export const dynamic = "force-dynamic";

export default async function MesasPage() {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("guest")
    .select("id, full_name, dietary_restrictions")
    .eq("attending", true)
    .order("full_name", { ascending: true });

  if (error) {
    return (
      <div>
        <h1 className="font-serif text-2xl">Plano de mesas</h1>
        <p className="text-destructive mt-4 text-sm">
          Error cargando invitados: {error.message}
        </p>
      </div>
    );
  }

  return <SeatingPlanClient guests={(data ?? []) as ConfirmedGuest[]} />;
}
