"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { Leaf, Drumstick, Fish, TriangleAlert, Utensils } from "lucide-react";
import {
  assignSeatAction,
  clearSeatAction,
  assignManySeatsAction,
  clearAllSeatsAction,
  type SeatingActionState,
} from "@/actions/seating";
import {
  SEATS,
  SEAT_INDEX,
  TABLES,
  TOTAL_SEATS,
  FIXED_SEATS,
  isFixedSeat,
  moduleDividers,
  type SeatDef,
} from "@/lib/seating";

/* Sillas que el plano puede asignar: las de los novios estan reservadas. */
const OPEN_SEATS = SEATS.filter((s) => !isFixedSeat(s.id));
const FIXED_COUNT = SEATS.length - OPEN_SEATS.length;

/* ---------------------------------------------------------------
   Plano de puestos — dos mesas imperiales
   Mesa A (Amigos): 5 módulos · 20 puestos por lado = 40
   Mesa B (Familia): 4 módulos · 15 puestos por lado = 30
   Total: 70 sillas, de las cuales 2 quedan reservadas para los novios
   Las asignaciones se persisten en la tabla seat_assignment; en
   localStorage solo quedan las preferencias de vista.
---------------------------------------------------------------- */

export type ConfirmedGuest = {
  id: string;
  full_name: string;
  dietary_restrictions: string | null;
};

const C = {
  paper: "#EEF1EC",
  paperDeep: "#E3E8E1",
  ink: "#1E2A24",
  muted: "#7C8A80",
  line: "#C9D2C7",
  wood: "#33453B",
  woodEdge: "#22302A",
  ivory: "#FBF9F4",
  brass: "#A98A4B",
  brassSoft: "#E7D9B8",
};

const DISPLAY = "var(--font-serif), Georgia, serif";
const BODY = "var(--font-sans), 'Segoe UI', system-ui, sans-serif";

const SEAT_W = 116;
const SEAT_H = 40;
const GAP = 10;
const BODY_W = 92;
const COL_W = SEAT_W * 2 + GAP * 2 + BODY_W;

const PREFS_KEY = "boda:plano-imperial:v1";
const LEGACY_KEY = "boda:plano-imperial:legacy-names";

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/* Las preferencias se escriben a mano en el RSVP, asi que se clasifican por
   palabras clave para poder marcarlas con un icono en el plano. Quien no
   tiene preferencia real ("Ninguna") no lleva marca. */
type DietKind = "veg" | "pollo" | "pescado" | "alergia" | "otro";

const DIET_META: Record<
  DietKind,
  { Icon: typeof Leaf; color: string; label: string }
> = {
  veg: { Icon: Leaf, color: "#4E7A4A", label: "Vegetariano" },
  pollo: { Icon: Drumstick, color: "#9A6B24", label: "Sin carnes rojas" },
  pescado: { Icon: Fish, color: "#3E6E86", label: "Pescetariano" },
  alergia: { Icon: TriangleAlert, color: "#B4553F", label: "Alergia" },
  otro: { Icon: Utensils, color: "#A98A4B", label: "Otra preferencia" },
};

function dietKind(raw: string | null | undefined): DietKind | null {
  const d = (raw ?? "").trim().toLowerCase();
  if (!d) return null;
  // "No huevo" o "No piña" son restricciones reales: solo se descarta el
  // texto que en si mismo dice que no hay ninguna.
  if (/^ning[uú]n[oa]?/.test(d)) return null;
  if (/^(nada|no|n\/a|na|-|\.)$/.test(d)) return null;
  // La alergia va primero: si alguien es vegetariano y ademas alergico, la
  // silla muestra un solo icono y tiene que ser el de la alerta.
  if (/alergi|al[eé]rgic|marisco|frutos secos/.test(d)) return "alergia";
  if (/vegan|vegetarian/.test(d)) return "veg";
  if (/pesquetarian|pescetarian|pescatarian/.test(d)) return "pescado";
  if (/carnes? roja|carne de res|solo pollo|s[oó]lo pollo|ni cerdo|no cerdo/.test(d))
    return "pollo";
  return "otro";
}

export function SeatingPlanClient({
  guests,
  initialSeating,
}: {
  guests: ConfirmedGuest[];
  initialSeating: Record<string, string>;
}) {
  const [seating, setSeating] = useState(initialSeating); // { seatId: guestId }
  const [stars, setStars] = useState<Record<string, boolean>>({}); // { seatId: true }
  const [title, setTitle] = useState("Nuestro matrimonio");
  const [subtitle, setSubtitle] = useState("Plano de puestos");
  const [editing, setEditing] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [scale, setScale] = useState(1);
  const [stacked, setStacked] = useState(false);
  const [numbering, setNumbering] = useState<"global" | "table">("global");
  const [starMode, setStarMode] = useState(false);
  const [clean, setClean] = useState(false);
  const [panel, setPanel] = useState<"guests" | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [note, setNote] = useState("");
  const [ready, setReady] = useState(false);
  const [legacyNames, setLegacyNames] = useState<Record<string, string> | null>(
    null,
  );
  const [printing, setPrinting] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const stageRef = useRef<HTMLDivElement>(null);
  const planRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const pendingSave = useRef<string | null>(null);

  /* el servidor es la fuente de verdad de las asignaciones */
  useEffect(() => {
    if (!pending) setSeating(initialSeating);
  }, [initialSeating, pending]);

  /* cargar preferencias de vista */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PREFS_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.stars) {
          const valid: Record<string, boolean> = {};
          Object.entries(d.stars as Record<string, boolean>).forEach(
            ([id, v]) => {
              if (SEAT_INDEX[id]) valid[id] = v;
            },
          );
          setStars(valid);
        }
        if (typeof d.title === "string") setTitle(d.title);
        if (typeof d.subtitle === "string") setSubtitle(d.subtitle);
        if (typeof d.stacked === "boolean") setStacked(d.stacked);
        if (d.numbering === "global" || d.numbering === "table")
          setNumbering(d.numbering);
        // Planos armados antes de persistir en base: se guardan aparte para
        // ofrecer importarlos una sola vez.
        if (d.names && Object.keys(d.names).length > 0)
          window.localStorage.setItem(LEGACY_KEY, JSON.stringify(d.names));
      }
      const legacy = window.localStorage.getItem(LEGACY_KEY);
      if (legacy) setLegacyNames(JSON.parse(legacy));
    } catch {
      /* sin datos previos */
    }
    setReady(true);
  }, []);

  /* guardar preferencias de vista */
  useEffect(() => {
    if (!ready) return;
    const payload = JSON.stringify({
      stars,
      title,
      subtitle,
      stacked,
      numbering,
    });
    pendingSave.current = payload;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(PREFS_KEY, payload);
        pendingSave.current = null;
      } catch {
        setNote("No se pudieron guardar las preferencias de vista.");
      }
    }, 400);
    return () => clearTimeout(saveTimer.current);
  }, [stars, title, subtitle, stacked, numbering, ready]);

  /* si desmonta con un guardado pendiente, escribirlo de inmediato */
  useEffect(
    () => () => {
      if (!pendingSave.current) return;
      try {
        window.localStorage.setItem(PREFS_KEY, pendingSave.current);
      } catch {
        /* almacenamiento no disponible */
      }
    },
    [],
  );

  /* ajustar al ancho */
  const fit = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    const avail = el.clientWidth - 24;
    const planW = stacked ? COL_W : COL_W * 2 + 56;
    setScale(
      Math.max(0.35, Math.min(1.4, Math.round((avail / planW) * 100) / 100)),
    );
  }, [stacked]);

  useEffect(() => {
    fit();
  }, [fit]);
  useEffect(() => {
    const onR = () => fit();
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, [fit]);

  const guestById = useMemo(() => {
    const map = new Map<string, ConfirmedGuest>();
    guests.forEach((g) => map.set(g.id, g));
    return map;
  }, [guests]);

  const seatedIds = useMemo(() => new Set(Object.values(seating)), [seating]);

  const unseated = useMemo(
    () => guests.filter((g) => !seatedIds.has(g.id)),
    [guests, seatedIds],
  );

  const withDiet = useMemo(
    () => guests.filter((g) => dietKind(g.dietary_restrictions)),
    [guests],
  );

  /* Solo las categorias presentes entre los confirmados, para la leyenda. */
  const dietLegend = useMemo(() => {
    const kinds = new Set<DietKind>();
    guests.forEach((g) => {
      const k = dietKind(g.dietary_restrictions);
      if (k) kinds.add(k);
    });
    return (Object.keys(DIET_META) as DietKind[]).filter((k) => kinds.has(k));
  }, [guests]);

  const filled = Object.keys(seating).length + FIXED_COUNT;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const set: Record<string, boolean> = {};
    Object.entries(seating).forEach(([seatId, guestId]) => {
      const name = guestById.get(guestId)?.full_name;
      if (name && name.toLowerCase().includes(q)) set[seatId] = true;
    });
    return set;
  }, [query, seating, guestById]);

  /* candidatos a importar desde el plano viejo de localStorage */
  const legacyPlan = useMemo(() => {
    if (!legacyNames) return [];
    const byName = new Map<string, ConfirmedGuest>();
    guests.forEach((g) => byName.set(norm(g.full_name), g));
    const taken = new Set<string>();
    const out: { seat_id: string; guest_id: string }[] = [];
    Object.entries(legacyNames).forEach(([seatId, name]) => {
      if (!SEAT_INDEX[seatId] || seating[seatId]) return;
      const g = typeof name === "string" ? byName.get(norm(name)) : undefined;
      if (!g || taken.has(g.id) || seatedIds.has(g.id)) return;
      taken.add(g.id);
      out.push({ seat_id: seatId, guest_id: g.id });
    });
    return out;
  }, [legacyNames, guests, seating, seatedIds]);

  const dropLegacy = () => {
    try {
      window.localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* almacenamiento no disponible */
    }
    setLegacyNames(null);
  };

  /* aplica el cambio local y lo persiste; si falla, vuelve a pedirle el
     plano al servidor en vez de revertir a un snapshot, que quedaria viejo
     si otra accion cambio el plano mientras esta estaba en vuelo */
  const run = (
    next: Record<string, string>,
    action: () => Promise<SeatingActionState>,
    message?: string,
  ) => {
    setSeating(next);
    startTransition(async () => {
      const res = await action();
      if (res.ok) setNote(message ?? res.message ?? "");
      else {
        setNote(res.error ?? "No se pudo guardar el cambio.");
        router.refresh();
      }
    });
  };

  const openSeat = (id: string) => {
    if (isFixedSeat(id)) return;
    if (starMode) {
      setStars((s) => ({ ...s, [id]: !s[id] }));
      return;
    }
    setEditing(id);
  };

  const commit = (seatId: string, guestId: string) => {
    setEditing(null);
    const current = seating[seatId] ?? "";
    if (guestId === current) return;

    if (!guestId) {
      const next = { ...seating };
      delete next[seatId];
      run(next, () => clearSeatAction({ seat_id: seatId }));
      return;
    }

    const next = { ...seating };
    Object.keys(next).forEach((s) => {
      if (next[s] === guestId) delete next[s];
    });
    next[seatId] = guestId;
    run(next, () => assignSeatAction({ seat_id: seatId, guest_id: guestId }));
  };

  const assignGuest = (g: ConfirmedGuest) => {
    const free = OPEN_SEATS.find((s) => !seating[s.id]);
    if (!free) {
      setNote("No quedan sillas libres.");
      return;
    }
    run(
      { ...seating, [free.id]: g.id },
      () => assignSeatAction({ seat_id: free.id, guest_id: g.id }),
      `${g.full_name} → puesto ${numbering === "global" ? free.num : free.code}.`,
    );
  };

  const assignAll = () => {
    if (!unseated.length) return;
    const assignments: { seat_id: string; guest_id: string }[] = [];
    const next = { ...seating };
    let i = 0;
    for (const s of OPEN_SEATS) {
      if (i >= unseated.length) break;
      if (next[s.id]) continue;
      const g = unseated[i++];
      next[s.id] = g.id;
      assignments.push({ seat_id: s.id, guest_id: g.id });
    }
    if (!assignments.length) {
      setNote("No quedan sillas libres.");
      return;
    }
    const left = unseated.length - assignments.length;
    run(
      next,
      () => assignManySeatsAction({ assignments }),
      left > 0
        ? `Se sentaron ${assignments.length} invitados. Quedaron ${left} sin silla libre.`
        : undefined,
    );
  };

  const importLegacy = () => {
    if (!legacyPlan.length) return;
    const next = { ...seating };
    legacyPlan.forEach((a) => (next[a.seat_id] = a.guest_id));
    // Solo se descarta el plano viejo si la importacion llego a la base.
    run(next, async () => {
      const res = await assignManySeatsAction({ assignments: legacyPlan });
      if (res.ok) dropLegacy();
      return res;
    });
  };

  /* Ajusta el plano a una hoja A4 y abre el dialogo de impresion, donde el
     navegador ofrece "Guardar como PDF". Se restaura el zoom al cerrarlo. */
  const exportPdf = () => {
    const el = planRef.current;
    if (!el) {
      window.print();
      return;
    }
    const rect = el.getBoundingClientRect();
    const naturalW = rect.width / scale;
    const naturalH = rect.height / scale;
    const pageW = ((210 - 16) / 25.4) * 96; // A4 menos los margenes, en px
    const pageH = ((297 - 16) / 25.4) * 96;
    // El encabezado y la leyenda se imprimen fuera del plano y no los afecta
    // el zoom, asi que su alto sale del espacio disponible para el plano.
    const headerH = headerRef.current?.getBoundingClientRect().height ?? 0;
    const legendH = legendRef.current?.getBoundingClientRect().height ?? 0;
    const fit = Math.min(
      pageW / naturalW,
      (pageH - headerH - legendH) / naturalH,
      1,
    );
    setPrinting(scale);
    setScale(Math.max(0.2, Math.floor(fit * 100) / 100));
  };

  useEffect(() => {
    if (printing === null) return;
    // afterprint y no la linea siguiente a print(): en Firefox print() no
    // bloquea, asi que restaurar de inmediato alteraria la vista previa.
    const restore = () => {
      setScale(printing);
      setPrinting(null);
    };
    window.addEventListener("afterprint", restore, { once: true });
    // Un respiro para que el plano se re-renderice con el zoom de la hoja.
    const id = window.setTimeout(() => window.print(), 120);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("afterprint", restore);
    };
  }, [printing]);

  const copyList = async () => {
    const txt = SEATS.map((s) => {
      const lbl = numbering === "global" ? s.num : s.code;
      if (FIXED_SEATS[s.id]) return `${lbl}. ${FIXED_SEATS[s.id]}`;
      const g = seating[s.id] ? guestById.get(seating[s.id]) : undefined;
      if (!g) return `${lbl}. —`;
      const diet = g.dietary_restrictions?.trim();
      return diet ? `${lbl}. ${g.full_name} (${diet})` : `${lbl}. ${g.full_name}`;
    }).join("\n");
    try {
      await navigator.clipboard.writeText(txt);
      setNote("Lista copiada al portapapeles.");
    } catch {
      setNote("No se pudo copiar. Selecciona el texto del panel manualmente.");
    }
  };

  const resetAll = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    setConfirmReset(false);
    setStars({});
    run({}, () => clearAllSeatsAction());
  };

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(""), 4000);
    return () => clearTimeout(t);
  }, [note]);

  const label = (s: SeatDef) => (numbering === "global" ? s.num : s.code);

  /* ---------------- seat ---------------- */
  const Seat = ({
    seat,
    align,
  }: {
    seat: SeatDef;
    align?: "left" | "right";
  }) => {
    const fixed = FIXED_SEATS[seat.id];
    const guestId = fixed ? "" : (seating[seat.id] ?? "");
    const guest = guestId ? guestById.get(guestId) : undefined;
    const name = fixed ?? guest?.full_name ?? "";
    const isEditing = editing === seat.id;
    const isStar = !!stars[seat.id];
    const isMatch = matches ? !!matches[seat.id] : false;
    const dim = matches && !isMatch;
    const diet = guest?.dietary_restrictions;
    const kind = dietKind(diet);
    const meta = kind ? DIET_META[kind] : null;

    const base: React.CSSProperties = {
      width: SEAT_W,
      minHeight: SEAT_H,
      boxSizing: "border-box",
      borderRadius: 7,
      background: fixed || isStar ? "#F6EDD8" : C.ivory,
      border: `1px ${fixed || guestId ? "solid" : "dashed"} ${fixed || isStar ? C.brass : guestId ? C.line : "#D6DDD5"}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      padding: "5px 8px 5px 8px",
      cursor: "pointer",
      opacity: dim ? 0.35 : 1,
      boxShadow: isMatch ? `0 0 0 2px ${C.brass}` : "none",
      transition: "opacity .15s ease, box-shadow .15s ease",
    };

    if (isEditing && !fixed) {
      // Solo confirmados sin silla (mas el ocupante actual de este puesto).
      const options = guests.filter(
        (g) => !seatedIds.has(g.id) || g.id === guestId,
      );
      return (
        <div
          style={{
            ...base,
            cursor: "default",
            borderStyle: "solid",
            borderColor: C.wood,
            padding: 0,
          }}
        >
          <select
            autoFocus
            value={guestId}
            onChange={(e) => commit(seat.id, e.target.value)}
            onBlur={() => setEditing(null)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditing(null);
            }}
            aria-label={`Puesto ${label(seat)}`}
            style={{
              width: "100%",
              height: SEAT_H - 2,
              border: "none",
              outline: "none",
              background: "transparent",
              textAlign: "center",
              fontFamily: BODY,
              fontSize: 12.5,
              color: C.ink,
              padding: "0 4px",
              cursor: "pointer",
            }}
          >
            <option value="">— Libre —</option>
            {options.map((g) => (
              <option key={g.id} value={g.id}>
                {g.full_name}
              </option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <button
        type="button"
        style={{ ...base, font: "inherit", textAlign: "center" }}
        onClick={() => openSeat(seat.id)}
        title={
          fixed
            ? `Puesto ${label(seat)} · reservado para ${fixed.toLowerCase()}`
            : meta
              ? `Puesto ${label(seat)} · ${meta.label}: ${diet!.trim()}`
              : `Puesto ${label(seat)}`
        }
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            [align === "right" ? "right" : "left"]: 5,
            fontFamily: BODY,
            fontSize: 9.5,
            letterSpacing: ".06em",
            color: isStar ? C.brass : C.muted,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {label(seat)}
        </span>
        {meta && (
          <meta.Icon
            size={11}
            strokeWidth={2.2}
            color={meta.color}
            aria-hidden
            style={{
              position: "absolute",
              top: 3,
              [align === "right" ? "left" : "right"]: 5,
            }}
          />
        )}
        {name ? (
          <span
            style={{
              fontFamily: BODY,
              fontSize: 12.5,
              lineHeight: 1.2,
              color: C.ink,
              textAlign: "center",
              marginTop: 5,
              wordBreak: "break-word",
              maxHeight: 30,
              overflow: "hidden",
            }}
          >
            {isStar ? "♥ " : ""}
            {name}
          </span>
        ) : (
          <span
            style={{
              fontFamily: BODY,
              fontSize: 11,
              color: "#AEBAB0",
              marginTop: 5,
            }}
          >
            libre
          </span>
        )}
      </button>
    );
  };

  /* ---------------- table ---------------- */
  const ImperialTable = ({ t }: { t: (typeof TABLES)[number] }) => {
    const seatOf = (pos: string) => SEAT_INDEX[`${t.key}-${pos}`];
    const dividers = moduleDividers(t.perSide, t.modules);
    const bodyCell = (i: number): React.CSSProperties => ({
      width: BODY_W,
      height: SEAT_H + 6,
      background: C.wood,
      borderBottom: dividers.has(i)
        ? "1px solid rgba(233,222,196,.45)"
        : "none",
      display: "flex",
      justifyContent: "center",
    });

    return (
      <div style={{ width: COL_W }}>
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div
            style={{
              fontFamily: DISPLAY,
              fontSize: 19,
              color: C.ink,
              letterSpacing: ".02em",
            }}
          >
            {t.label}
          </div>
          <div
            style={{
              fontFamily: BODY,
              fontSize: 11,
              color: C.muted,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              marginTop: 3,
            }}
          >
            {t.modules} mesas unidas · {t.total} puestos
          </div>
        </div>

        {/* tapa superior */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div
            style={{
              width: BODY_W,
              height: 22,
              background: C.wood,
              borderRadius: "10px 10px 0 0",
              borderBottom: "none",
            }}
          />
        </div>

        {/* filas */}
        {Array.from({ length: t.perSide }).map((_, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: GAP,
              marginBottom: 4,
            }}
          >
            {Seat({ seat: seatOf(`L${i}`), align: "right" })}
            <div style={bodyCell(i)}>
              <div
                style={{
                  width: 1,
                  height: "100%",
                  background: "rgba(233,222,196,.35)",
                }}
              />
            </div>
            {Seat({ seat: seatOf(`R${i}`), align: "left" })}
          </div>
        ))}

        {/* tapa inferior */}
        <div
          style={{ display: "flex", justifyContent: "center", marginTop: -4 }}
        >
          <div
            style={{
              width: BODY_W,
              height: 22,
              background: C.wood,
              borderRadius: "0 0 10px 10px",
            }}
          />
        </div>
      </div>
    );
  };

  /* ---------------- ui ---------------- */
  const btn = (active: boolean): React.CSSProperties => ({
    fontFamily: BODY,
    fontSize: 12,
    padding: "7px 12px",
    borderRadius: 999,
    border: `1px solid ${active ? C.wood : C.line}`,
    background: active ? C.wood : "transparent",
    color: active ? C.ivory : C.ink,
    cursor: "pointer",
    whiteSpace: "nowrap",
  });

  return (
    <div
      className="print-area"
      style={{
        background: C.paper,
        minHeight: "100vh",
        color: C.ink,
        fontFamily: BODY,
        margin: "-2rem -1rem",
        borderRadius: 8,
      }}
    >
      {!clean && (
        <div
          className="print-hidden"
          style={{
            borderBottom: `1px solid ${C.line}`,
            background: C.paperDeep,
            padding: "12px 16px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: BODY,
                fontSize: 12,
                color: C.muted,
                marginRight: 4,
              }}
            >
              {guests.length - unseated.length} de {guests.length} confirmados
              sentados · {TOTAL_SEATS - filled} sillas libres de {TOTAL_SEATS}
              {pending ? " · guardando…" : ""}
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar invitado"
              style={{
                fontFamily: BODY,
                fontSize: 12,
                padding: "7px 12px",
                borderRadius: 999,
                border: `1px solid ${C.line}`,
                background: C.ivory,
                color: C.ink,
                width: 150,
                outline: "none",
              }}
            />
            <button
              style={btn(starMode)}
              onClick={() => setStarMode((v) => !v)}
            >
              ♥ Destacar puesto
            </button>
            <button
              style={btn(stacked)}
              onClick={() => {
                setStacked((v) => !v);
                setTimeout(fit, 0);
              }}
            >
              {stacked ? "Mesas apiladas" : "Mesas lado a lado"}
            </button>
            <button
              style={btn(false)}
              onClick={() =>
                setNumbering((n) => (n === "global" ? "table" : "global"))
              }
            >
              N.º {numbering === "global" ? `1–${TOTAL_SEATS}` : "A1 / B1"}
            </button>
            <button
              style={btn(panel === "guests")}
              onClick={() => setPanel(panel === "guests" ? null : "guests")}
            >
              Confirmados ({guests.length})
            </button>
            <button style={btn(false)} onClick={copyList}>
              Copiar lista
            </button>
            <button style={btn(clean)} onClick={() => setClean(true)}>
              Modo captura
            </button>
            <button style={btn(false)} onClick={exportPdf}>
              Exportar PDF
            </button>
            <button
              style={{
                ...btn(false),
                borderColor: confirmReset ? "#B4553F" : C.line,
                color: confirmReset ? "#B4553F" : C.ink,
              }}
              onClick={resetAll}
            >
              {confirmReset ? "Confirmar: borrar todo" : "Vaciar plano"}
            </button>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginLeft: "auto",
              }}
            >
              <button style={btn(false)} onClick={fit}>
                Ajustar
              </button>
              <input
                type="range"
                min="40"
                max="140"
                value={Math.round(scale * 100)}
                onChange={(e) => setScale(Number(e.target.value) / 100)}
                style={{ width: 90, accentColor: C.wood }}
                aria-label="Zoom"
              />
              <span
                style={{
                  fontSize: 11,
                  color: C.muted,
                  width: 34,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {Math.round(scale * 100)}%
              </span>
            </span>
          </div>

          {legacyPlan.length > 0 && (
            <div
              style={{
                marginTop: 10,
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: 12, color: C.wood }}>
                Hay un plano guardado en este navegador con {legacyPlan.length}{" "}
                puestos que coinciden con invitados confirmados.
              </span>
              <button style={btn(true)} onClick={importLegacy}>
                Importar a la base
              </button>
              <button style={btn(false)} onClick={dropLegacy}>
                Descartar
              </button>
            </div>
          )}

          {panel === "guests" && (
            <div style={{ marginTop: 10 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 12, color: C.muted }}>
                  {unseated.length} sin silla · {withDiet.length} con
                  preferencia alimentaria, marcada con su icono en el plano
                </span>
                {unseated.length > 0 && (
                  <button style={btn(true)} onClick={assignAll}>
                    Sentar pendientes en orden
                  </button>
                )}
              </div>
              <div
                style={{
                  marginTop: 8,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
                  gap: 6,
                  maxHeight: 260,
                  overflowY: "auto",
                  paddingRight: 4,
                }}
              >
                {guests.map((g) => {
                  const seated = seatedIds.has(g.id);
                  const diet = g.dietary_restrictions?.trim();
                  const kind = dietKind(g.dietary_restrictions);
                  const meta = kind ? DIET_META[kind] : null;
                  return (
                    <button
                      key={g.id}
                      onClick={() => !seated && assignGuest(g)}
                      title={
                        seated
                          ? "Ya tiene silla"
                          : "Asignar a la primera silla libre"
                      }
                      style={{
                        textAlign: "left",
                        fontFamily: BODY,
                        fontSize: 12.5,
                        padding: "7px 10px",
                        borderRadius: 8,
                        border: `1px solid ${meta ? meta.color : C.line}`,
                        background: seated ? "transparent" : C.ivory,
                        color: C.ink,
                        opacity: seated ? 0.55 : 1,
                        cursor: seated ? "default" : "pointer",
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>
                        {seated ? "✓ " : ""}
                        {g.full_name}
                      </span>
                      {diet && (
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 11,
                            color: meta ? meta.color : C.muted,
                            marginTop: 2,
                          }}
                        >
                          {meta && (
                            <meta.Icon size={11} strokeWidth={2.2} aria-hidden />
                          )}
                          {diet}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {note && (
            <div style={{ marginTop: 8, fontSize: 12, color: C.wood }}>
              {note}
            </div>
          )}
        </div>
      )}

      {clean && (
        <button
          className="print-hidden"
          style={{
            ...btn(false),
            position: "fixed",
            top: 10,
            right: 12,
            zIndex: 20,
            background: C.ivory,
          }}
          onClick={() => setClean(false)}
        >
          Salir del modo captura
        </button>
      )}

      {/* encabezado del plano */}
      <div
        ref={headerRef}
        style={{
          textAlign: "center",
          padding: clean ? "28px 16px 6px" : "22px 16px 6px",
        }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            fontFamily: DISPLAY,
            fontSize: 30,
            textAlign: "center",
            border: "none",
            background: "transparent",
            color: C.ink,
            outline: "none",
            width: "100%",
            maxWidth: 520,
            letterSpacing: ".01em",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            marginTop: 6,
          }}
        >
          <span
            style={{ height: 1, width: 46, background: C.brass, opacity: 0.6 }}
          />
          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            style={{
              fontFamily: BODY,
              fontSize: 11.5,
              letterSpacing: ".22em",
              textTransform: "uppercase",
              textAlign: "center",
              border: "none",
              background: "transparent",
              color: C.muted,
              outline: "none",
              width: 260,
            }}
          />
          <span
            style={{ height: 1, width: 46, background: C.brass, opacity: 0.6 }}
          />
        </div>
      </div>

      {/* plano */}
      <div
        ref={stageRef}
        className="print-stage"
        style={{ padding: "10px 12px 40px", overflowX: "auto" }}
      >
        <div
          ref={planRef}
          style={{
            zoom: scale,
            display: "flex",
            flexDirection: stacked ? "column" : "row",
            gap: stacked ? 46 : 56,
            justifyContent: "center",
            alignItems: "flex-start",
            width: "fit-content",
            margin: "0 auto",
          }}
        >
          {TABLES.map((t) => (
            <div key={t.key} className="print-keep">
              {ImperialTable({ t })}
            </div>
          ))}
        </div>
      </div>

      {/* Leyenda: en papel es lo unico que explica los iconos. */}
      {dietLegend.length > 0 && (
        <div
          ref={legendRef}
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "6px 18px",
            padding: "0 16px 18px",
            fontSize: 11,
            color: C.muted,
          }}
        >
          {dietLegend.map((k) => {
            const { Icon, color, label: text } = DIET_META[k];
            return (
              <span
                key={k}
                style={{ display: "flex", alignItems: "center", gap: 5 }}
              >
                <Icon size={12} strokeWidth={2.2} color={color} aria-hidden />
                {text}
              </span>
            );
          })}
        </div>
      )}

      {!clean && (
        <div
          className="print-hidden"
          style={{
            textAlign: "center",
            fontSize: 11.5,
            color: C.muted,
            padding: "0 16px 28px",
          }}
        >
          Toca una silla y elige un invitado confirmado de la lista. Cada cambio
          se guarda en la base. Los iconos marcan la preferencia alimentaria
          (pasa el cursor para leer el texto completo).
        </div>
      )}
    </div>
  );
}
