/* Definicion del plano de puestos — dos mesas imperiales.
   Mesa A (Amigos): 5 modulos · 20 puestos por lado + 2 cabeceras = 42
   Mesa B (Familia): 4 modulos · 16 puestos por lado + 2 cabeceras = 34
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
  { key: "A", label: "Mesa A · Amigos", modules: 5, perSide: 20, total: 42 },
  { key: "B", label: "Mesa B · Familia", modules: 4, perSide: 16, total: 34 },
];

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
    push("head");
    for (let i = 0; i < t.perSide; i++) push(`L${i}`);
    push("foot");
    for (let i = 0; i < t.perSide; i++) push(`R${i}`);
  });
  return out;
}

export const SEATS = buildSeats();

export const SEAT_INDEX = SEATS.reduce<Record<string, SeatDef & { order: number }>>(
  (acc, s, i) => ((acc[s.id] = { ...s, order: i }), acc),
  {},
);

export const TOTAL_SEATS = SEATS.length; // 76

export function isSeatId(value: string): boolean {
  return Object.hasOwn(SEAT_INDEX, value);
}
