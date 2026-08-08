"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";

/* ---------------------------------------------------------------
   Plano de puestos — dos mesas imperiales
   Mesa A: 4 módulos · 16 puestos por lado + 2 cabeceras = 34
   Mesa B: 5 módulos · 20 puestos por lado + 2 cabeceras = 42
   Total: 76 sillas
   Asignaciones persistidas en localStorage; invitados confirmados
   y sus preferencias alimentarias vienen de la base.
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

const TABLES = [
  { key: "A", label: "Mesa A · Amigos", modules: 5, perSide: 20, total: 42 },
  { key: "B", label: "Mesa B · Familia", modules: 4, perSide: 16, total: 34 },
];

const SEAT_W = 116;
const SEAT_H = 40;
const GAP = 10;
const BODY_W = 92;
const COL_W = SEAT_W * 2 + GAP * 2 + BODY_W;

type SeatDef = {
  id: string;
  table: string;
  pos: string;
  num: number;
  code: string;
};

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

const SEATS = buildSeats();
const SEAT_INDEX = SEATS.reduce<Record<string, SeatDef & { order: number }>>(
  (acc, s, i) => ((acc[s.id] = { ...s, order: i }), acc),
  {},
);
const TOTAL_SEATS = SEATS.length; // 76
const STORE_KEY = "boda:plano-imperial:v1";

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export function SeatingPlanClient({ guests }: { guests: ConfirmedGuest[] }) {
  const [names, setNames] = useState<Record<string, string>>({}); // { seatId: "Nombre" }
  const [stars, setStars] = useState<Record<string, boolean>>({}); // { seatId: true }
  const [title, setTitle] = useState("Nuestro matrimonio");
  const [subtitle, setSubtitle] = useState("Plano de puestos");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
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

  const stageRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  /* cargar */
  useEffect(() => {
    const loaded: Record<string, string> = {};
    let seeded = false;
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        seeded = !!d.seeded;
        if (d.names) {
          Object.entries(d.names as Record<string, string>).forEach(
            ([id, v]) => {
              if (SEAT_INDEX[id]) loaded[id] = v;
            },
          );
        }
        if (d.stars) {
          const valid: Record<string, boolean> = {};
          Object.entries(d.stars as Record<string, boolean>).forEach(
            ([id, v]) => {
              if (SEAT_INDEX[id]) valid[id] = v;
            },
          );
          setStars(valid);
        }
        if (d.title) setTitle(d.title);
        if (d.subtitle) setSubtitle(d.subtitle);
        if (typeof d.stacked === "boolean") setStacked(d.stacked);
        if (d.numbering) setNumbering(d.numbering);
      }
    } catch {
      /* sin datos previos */
    }
    // Primera vez sin plano armado: sentar automaticamente a los confirmados
    if (!seeded && Object.keys(loaded).length === 0) {
      let i = 0;
      for (const s of SEATS) {
        if (i >= guests.length) break;
        loaded[s.id] = guests[i++].full_name;
      }
    }
    setNames(loaded);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* guardar */
  useEffect(() => {
    if (!ready) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(
          STORE_KEY,
          JSON.stringify({
            names,
            stars,
            title,
            subtitle,
            stacked,
            numbering,
            seeded: true,
          }),
        );
      } catch {
        setNote(
          "No se pudo guardar automáticamente. Copia la lista antes de cerrar.",
        );
      }
    }, 400);
    return () => clearTimeout(saveTimer.current);
  }, [names, stars, title, subtitle, stacked, numbering, ready]);

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

  const guestByName = useMemo(() => {
    const map = new Map<string, ConfirmedGuest>();
    guests.forEach((g) => map.set(norm(g.full_name), g));
    return map;
  }, [guests]);

  const seatedSet = useMemo(() => {
    const set = new Set<string>();
    Object.values(names).forEach((v) => {
      if (v && v.trim()) set.add(norm(v));
    });
    return set;
  }, [names]);

  const unseated = useMemo(
    () => guests.filter((g) => !seatedSet.has(norm(g.full_name))),
    [guests, seatedSet],
  );

  const withDiet = useMemo(
    () =>
      guests.filter(
        (g) => g.dietary_restrictions && g.dietary_restrictions.trim(),
      ),
    [guests],
  );

  const filled = useMemo(
    () => Object.values(names).filter((v) => v && v.trim()).length,
    [names],
  );
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const set: Record<string, boolean> = {};
    Object.entries(names).forEach(([id, v]) => {
      if (v && v.toLowerCase().includes(q)) set[id] = true;
    });
    return set;
  }, [query, names]);

  const openSeat = (id: string) => {
    if (starMode) {
      setStars((s) => ({ ...s, [id]: !s[id] }));
      return;
    }
    setEditing(id);
    setDraft(names[id] || "");
  };

  const commit = (id: string, value: string, advance: boolean) => {
    const v = value.trim();
    setNames((n) => {
      const next = { ...n };
      if (v) next[id] = v;
      else delete next[id];
      return next;
    });
    if (advance) {
      const nx = SEATS[SEAT_INDEX[id].order + 1];
      if (nx) {
        setEditing(nx.id);
        setDraft(names[nx.id] || "");
        return;
      }
    }
    setEditing(null);
  };

  const assignGuest = (g: ConfirmedGuest) => {
    const free = SEATS.find((s) => !(names[s.id] && names[s.id].trim()));
    if (!free) {
      setNote("No quedan sillas libres.");
      return;
    }
    setNames((n) => ({ ...n, [free.id]: g.full_name }));
    setNote(
      `${g.full_name} → puesto ${numbering === "global" ? free.num : free.code}.`,
    );
  };

  const assignAll = () => {
    if (!unseated.length) return;
    setNames((n) => {
      const next = { ...n };
      let i = 0;
      for (const s of SEATS) {
        if (i >= unseated.length) break;
        if (!next[s.id]) next[s.id] = unseated[i++].full_name;
      }
      setNote(
        i < unseated.length
          ? `Se sentaron ${i} invitados. Quedaron ${unseated.length - i} sin silla libre.`
          : `Se sentaron ${i} invitados.`,
      );
      return next;
    });
  };

  const copyList = async () => {
    const txt = SEATS.map((s) => {
      const lbl = numbering === "global" ? s.num : s.code;
      const name = names[s.id];
      if (!name) return `${lbl}. —`;
      const diet = guestByName.get(norm(name))?.dietary_restrictions;
      return diet && diet.trim()
        ? `${lbl}. ${name} (${diet.trim()})`
        : `${lbl}. ${name}`;
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
    setNames({});
    setStars({});
    setConfirmReset(false);
    setNote("Plano vacío.");
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
    const name = names[seat.id] || "";
    const isEditing = editing === seat.id;
    const isStar = !!stars[seat.id];
    const isMatch = matches ? !!matches[seat.id] : false;
    const dim = matches && !isMatch;
    const diet = name
      ? guestByName.get(norm(name))?.dietary_restrictions
      : null;
    const hasDiet = !!(diet && diet.trim());

    const base: React.CSSProperties = {
      width: SEAT_W,
      minHeight: SEAT_H,
      boxSizing: "border-box",
      borderRadius: 7,
      background: isStar ? "#F6EDD8" : C.ivory,
      border: `1px ${name ? "solid" : "dashed"} ${isStar ? C.brass : name ? C.line : "#D6DDD5"}`,
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

    if (isEditing) {
      return (
        <div
          style={{
            ...base,
            cursor: "text",
            borderStyle: "solid",
            borderColor: C.wood,
            padding: 0,
          }}
        >
          <input
            autoFocus
            value={draft}
            list="plano-guest-names"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => commit(seat.id, draft, false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit(seat.id, draft, true);
              if (e.key === "Escape") setEditing(null);
            }}
            placeholder={`Puesto ${label(seat)}`}
            style={{
              width: "100%",
              height: SEAT_H - 2,
              border: "none",
              outline: "none",
              background: "transparent",
              textAlign: "center",
              fontFamily: BODY,
              fontSize: 13,
              color: C.ink,
              padding: "0 6px",
            }}
          />
        </div>
      );
    }

    return (
      <div
        style={base}
        onClick={() => openSeat(seat.id)}
        title={
          hasDiet
            ? `Puesto ${label(seat)} · ${diet!.trim()}`
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
        {hasDiet && (
          <span
            style={{
              position: "absolute",
              top: 3,
              [align === "right" ? "left" : "right"]: 6,
              width: 6,
              height: 6,
              borderRadius: 999,
              background: C.brass,
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
      </div>
    );
  };

  /* ---------------- table ---------------- */
  const ImperialTable = ({ t }: { t: (typeof TABLES)[number] }) => {
    const seatOf = (pos: string) => SEAT_INDEX[`${t.key}-${pos}`];
    const rowsPerModule = t.perSide / t.modules;
    const bodyCell = (i: number): React.CSSProperties => ({
      width: BODY_W,
      height: SEAT_H + 6,
      background: C.wood,
      borderBottom:
        (i + 1) % rowsPerModule === 0 && i !== t.perSide - 1
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

        {/* cabecera */}
        <div
          style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}
        >
          <Seat seat={seatOf("head")} />
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
            <Seat seat={seatOf(`L${i}`)} align="right" />
            <div style={bodyCell(i)}>
              <div
                style={{
                  width: 1,
                  height: "100%",
                  background: "rgba(233,222,196,.35)",
                }}
              />
            </div>
            <Seat seat={seatOf(`R${i}`)} align="left" />
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

        {/* pie */}
        <div
          style={{ display: "flex", justifyContent: "center", marginTop: 6 }}
        >
          <Seat seat={seatOf("foot")} />
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
      style={{
        background: C.paper,
        minHeight: "100vh",
        color: C.ink,
        fontFamily: BODY,
        margin: "-2rem -1rem",
        borderRadius: 8,
      }}
    >
      <datalist id="plano-guest-names">
        {guests.map((g) => (
          <option key={g.id} value={g.full_name} />
        ))}
      </datalist>

      {!clean && (
        <div
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
              N.º {numbering === "global" ? "1–76" : "A1 / B1"}
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
                  preferencia alimentaria (
                  <span style={{ color: C.brass }}>●</span> en el plano)
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
                  const seated = seatedSet.has(norm(g.full_name));
                  const diet = g.dietary_restrictions?.trim();
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
                        border: `1px solid ${diet ? C.brass : C.line}`,
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
                            display: "block",
                            fontSize: 11,
                            color: C.brass,
                            marginTop: 2,
                          }}
                        >
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
        style={{ padding: "10px 12px 40px", overflowX: "auto" }}
      >
        <div
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
            <ImperialTable key={t.key} t={t} />
          ))}
        </div>
      </div>

      {!clean && (
        <div
          style={{
            textAlign: "center",
            fontSize: 11.5,
            color: C.muted,
            padding: "0 16px 28px",
          }}
        >
          Toca una silla para escribir el nombre. Enter guarda y salta a la
          siguiente. El punto dorado marca preferencia alimentaria (pasa el
          cursor para verla).
        </div>
      )}
    </div>
  );
}
