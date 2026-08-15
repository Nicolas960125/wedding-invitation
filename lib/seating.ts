/* Definicion del plano de puestos — dos mesas imperiales.
   Mesa A (Amigos): 5 modulos · 20 puestos por lado = 40
   Mesa B (Familia): 4 modulos · 15 puestos por lado = 30
   Sin cabeceras: los puestos de los extremos quedaban siempre libres.
   Compartida entre el cliente del plano y las server actions que validan
   los seat_id contra esta misma fuente. */

export type SeatDef = {
  id: string;
  table: string;
  pos: string;
  num: number;
  code: string;
};

export const TABLES = [
  { key: "A", label: "Mesa A · Amigos", modules: 5, perSide: 20, total: 40 },
  { key: "B", label: "Mesa B · Familia", modules: 4, perSide: 15, total: 30 },
];

/* Puestos reservados: los novios no son invitados en la base, asi que no
   salen de la tabla guest ni se pueden asignar desde el plano. */
export const FIXED_SEATS: Record<string, string> = {
  "B-R8": "Novia",
  "B-R9": "Novio",
};

export function isFixedSeat(id: string): boolean {
  return Object.hasOwn(FIXED_SEATS, id);
}

function buildSeats(): SeatDef[] {
  const out: SeatDef[] = [];
  let n = 1;
  TABLES.forEach((t) => {
    let local = 1;
    const push = (pos: string) => {
      out.push({
        id: `${t.key}-${pos}`,
        table: t.key,
        pos,
        num: n++,
        code: `${t.key}${local++}`,
      });
    };
    for (let i = 0; i < t.perSide; i++) push(`L${i}`);
    for (let i = 0; i < t.perSide; i++) push(`R${i}`);
  });
  return out;
}

/* Filas tras las que va la union entre modulos. Se calcula en vez de usar
   perSide / modules porque la mesa B ya no divide exacto (15 en 4 mesas). */
export function moduleDividers(perSide: number, modules: number): Set<number> {
  const out = new Set<number>();
  for (let k = 1; k < modules; k++) {
    out.add(Math.round((k * perSide) / modules) - 1);
  }
  return out;
}

export const SEATS = buildSeats();

export const SEAT_INDEX = SEATS.reduce<Record<string, SeatDef & { order: number }>>(
  (acc, s, i) => ((acc[s.id] = { ...s, order: i }), acc),
  {},
);

export const TOTAL_SEATS = SEATS.length; // 70

export function isSeatId(value: string): boolean {
  return Object.hasOwn(SEAT_INDEX, value);
}
