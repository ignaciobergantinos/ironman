"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useStore, type Store } from "@/lib/store";
import { useIntervals, useIntervalsFeed, icuExtrasFor, actToLog, icuStats, fmtDur, fmtSpeed, type IcuActivity } from "@/lib/intervals";
import { Icon } from "@/lib/icons";
import {
  DISC, INT, ROUTINES, FIELDS, dayDef, weekMeta, DOW_LONG, MONTHS,
  iso, mondayOf, addDays, fmtDate, derive,
  type Discipline, type Session, type LogData,
} from "@/lib/domain";

/* ---------- pure helpers ---------- */
function templSessions(date: Date): Session[] {
  const def = dayDef(date);
  return (def ? def.sessions : []).map((s) => ({ ...s, id: iso(date) + ":" + s.slot, kind: "templ" as const, date: iso(date) }));
}
function extraSessions(date: Date, store: Store): Session[] {
  const k = iso(date);
  return (store.extras[k] || []).map((e) => ({ disc: e.disc, name: e.name, intensity: e.intensity, id: e.id, kind: "extra" as const, date: k, plan: null }));
}
function findSession(id: string, store: Store): Session | null {
  const d = new Date(id.split(":")[0] + "T00:00:00");
  const t = templSessions(d).find((s) => s.id === id);
  if (t) return t;
  return extraSessions(d, store).find((s) => s.id === id) ?? null;
}
function hasData(l?: LogData): boolean {
  if (!l) return false;
  return Object.entries(l).some(([k, v]) => {
    if (k === "done") return false;
    if (v == null || v === "") return false;
    if (typeof v === "object") return Object.keys(v).length > 0;
    return true;
  });
}
type Vol = { run: number; bike: number; swim: number; walk: number; gymDone: number; done: number; total: number };
function weekVolume(mon: Date, store: Store): Vol {
  const v: Vol = { run: 0, bike: 0, swim: 0, walk: 0, gymDone: 0, done: 0, total: 0 };
  for (let i = 0; i < 7; i++) {
    const d = addDays(mon, i);
    [...templSessions(d), ...extraSessions(d, store)].forEach((s) => {
      v.total++;
      const l = store.logs[s.id];
      const dn = !!(l && l.done);
      if (dn) v.done++;
      if (s.disc === "gym") { if (dn) v.gymDone++; return; }
      const dist = l ? parseFloat(l.dist ?? "") : NaN;
      if (dist > 0) {
        if (s.disc === "swim") v.swim += dist;
        else if (s.disc === "run") v.run += dist;
        else if (s.disc === "bike") v.bike += dist;
        else if (s.disc === "walk") v.walk += dist;
      }
    });
  }
  return v;
}

/* ---------- session row ---------- */
function SessionRow({ s, store, onOpen }: { s: Session; store: Store; onOpen: (id: string) => void }) {
  const l = store.logs[s.id];
  const done = !!(l && l.done);
  const data = hasData(l);
  const sub = s.routine ? ROUTINES[s.routine].ex.length + " ejercicios" : s.plan?.tag ?? DISC[s.disc].label;
  return (
    <button className={"sess" + (done ? " done" : "")} onClick={() => onOpen(s.id)}>
      <span className="sess-ic" style={{ ["--sc"]: DISC[s.disc].color } as React.CSSProperties}><Icon name={s.disc} size={19} /></span>
      <span className="sess-main">
        <span className="sess-name">{s.name}</span>
        <span className="sess-sub">
          <span className="idot" style={{ background: INT[s.intensity].c }} />
          {s.intensity} · {sub}
          {data && !done && <b style={{ color: "var(--accent)" }}> •</b>}
        </span>
      </span>
      <span className="check"><Icon name="check" size={12} /></span>
    </button>
  );
}

/* ---------- add-extra picker ---------- */
function AddExtra({ dateK, onAdd }: { dateK: string; onAdd: (disc: Discipline, dateK: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ padding: "6px 15px 14px" }}>
      {open && (
        <div className="picker">
          {(Object.keys(DISC) as Discipline[]).map((dk) => (
            <button key={dk} onClick={() => { onAdd(dk, dateK); setOpen(false); }}>
              <Icon name={dk} size={14} /> {DISC[dk].label}
            </button>
          ))}
        </div>
      )}
      <button className="addbtn" onClick={() => setOpen((o) => !o)}><Icon name="plus" size={15} /> Añadir sesión extra</button>
    </div>
  );
}

/* ---------- fila de actividad de intervals.icu sin sesión planificada (extra) ---------- */
function IcuSlotRow({ a, onOpen }: { a: IcuActivity; onOpen: (a: IcuActivity) => void }) {
  const stats = icuStats(a);
  const sub = stats.slice(0, 2).map((s) => (s.u ? `${s.v} ${s.u}` : s.v)).join(" · ") || a.type;
  return (
    <button className="sess" onClick={() => onOpen(a)}>
      <span className="sess-ic" style={{ ["--sc"]: DISC[a.disc].color } as React.CSSProperties}><Icon name={a.disc} size={19} /></span>
      <span className="sess-main">
        <span className="sess-name">{a.name ?? DISC[a.disc].label}</span>
        <span className="sess-sub"><span className="idot" style={{ background: DISC[a.disc].color }} />intervals.icu · {sub}</span>
      </span>
      <span className="ico-chev"><Icon name="chev" size={16} /></span>
    </button>
  );
}

/* ---------- week view ---------- */
function WeekView({ cursor, setCursor, store, todayISO, activities, onOpen, onOpenAct, onAdd, onDel }: {
  cursor: Date; setCursor: (d: Date) => void; store: Store; todayISO: string; activities: IcuActivity[];
  onOpen: (id: string) => void; onOpenAct: (a: IcuActivity) => void; onAdd: (d: Discipline, k: string) => void; onDel: (id: string, k: string) => void;
}) {
  const start = cursor, end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const title = sameMonth ? `${start.getDate()}–${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}` : `${fmtDate(start)} – ${fmtDate(end)}`;
  let done = 0, total = 0;
  const mini: { n: number; done: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i);
    const ss = [...templSessions(d), ...extraSessions(d, store)];
    let dd = 0;
    ss.forEach((s) => { total++; if (store.logs[s.id]?.done) { done++; dd++; } });
    mini.push({ n: ss.length, done: dd });
  }
  const pct = total ? Math.round((done / total) * 100) : 0;
  const wm = weekMeta(start);
  return (
    <>
      <div className="weeknav">
        <button className="navbtn" onClick={() => setCursor(addDays(cursor, -7))} aria-label="Semana anterior"><Icon name="left" size={16} /></button>
        <div><h2>{title}</h2><div className="sub mono">Semana {wm.num}/{wm.total} · {wm.phase}{wm.recovery ? " 🌙" : ""}</div></div>
        <button className="navbtn" onClick={() => setCursor(addDays(cursor, 7))} aria-label="Semana siguiente"><Icon name="right" size={16} /></button>
        <button className="today-btn" onClick={() => setCursor(mondayOf(new Date()))}>Hoy</button>
      </div>
      <div className="adh">
        <div className="ring" style={{ background: `conic-gradient(var(--accent) ${pct}%, var(--surface-3) 0)` }}><b>{pct}%</b></div>
        <div className="adh-txt"><div className="big mono">{done} / {total} sesiones</div><div className="small">completadas esta semana</div></div>
        <div className="miniweek">{mini.map((m, idx) => Array.from({ length: Math.max(m.n, 1) }).map((_, i) => <i key={idx + "-" + i} className={i < m.done ? "on" : ""} />))}</div>
      </div>
      <div className="days">
        {Array.from({ length: 7 }).map((_, i) => {
          const d = addDays(start, i), k = iso(d), def = dayDef(d);
          const isToday = k === todayISO;
          const templ = templSessions(d), extra = extraSessions(d, store);
          const icuExtras = icuExtrasFor(activities, k, [...templ, ...extra].map((s) => s.disc));
          return (
            <div key={k} className={"day" + (isToday ? " today" : "")}>
              <div className="day-h"><span className="dow">{def.day}</span><span className="date">{fmtDate(d)}</span>{isToday && <span className="todaypill">Hoy</span>}</div>
              {def.rest && templ.length === 0 && extra.length === 0 && icuExtras.length === 0 && (
                <div className="restnote">Descanso o recuperación activa. Puedes añadir una caminata o nado suave.</div>
              )}
              {!def.rest && (
                <div className="slots">
                  {(["am", "pm"] as const).map((sl) => {
                    const s = templ.find((x) => x.slot === sl);
                    return (
                      <div className="slot" key={sl}>
                        <div className="slot-lab">{sl === "am" ? "Mañana · fuerte" : "Tarde · suave"}</div>
                        {s && <SessionRow s={s} store={store} onOpen={onOpen} />}
                      </div>
                    );
                  })}
                </div>
              )}
              {extra.map((s) => (
                <div className="extra" key={s.id} style={{ margin: "0 15px 10px" }}>
                  <SessionRow s={s} store={store} onOpen={onOpen} />
                  <button className="exdel" onClick={() => onDel(s.id, k)} aria-label="Eliminar"><Icon name="x" size={12} /></button>
                </div>
              ))}
              {icuExtras.map((a) => (
                <div className="extra" key={a.id} style={{ margin: "0 15px 10px" }}>
                  <IcuSlotRow a={a} onOpen={onOpenAct} />
                </div>
              ))}
              <AddExtra dateK={k} onAdd={onAdd} />
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ---------- today view ---------- */
function TodayView({ store, activities, onOpen, onOpenAct, onAdd, onDel }: {
  store: Store; activities: IcuActivity[]; onOpen: (id: string) => void; onOpenAct: (a: IcuActivity) => void; onAdd: (d: Discipline, k: string) => void; onDel: (id: string, k: string) => void;
}) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const k = iso(now);
  const templ = templSessions(now), extra = extraSessions(now, store);
  const all = [...templ, ...extra];
  const icuExtras = icuExtrasFor(activities, k, all.map((s) => s.disc));
  return (
    <>
      <div className="weeknav"><div><h2 style={{ textTransform: "capitalize" }}>{DOW_LONG[now.getDay()]}</h2><div className="sub mono">{now.getDate()} {MONTHS[now.getMonth()]} {now.getFullYear()}</div></div></div>
      {all.length === 0 && icuExtras.length === 0 && (
        <div className="card"><div className="card-lab"><span className="eyebrow">Descanso</span></div><p style={{ margin: 0, color: "var(--muted)", fontSize: 13.5 }}>Hoy toca descansar o recuperación activa. Añade una caminata suave si te apetece moverte.</p></div>
      )}
      <div className="days"><div className="day"><div className="slots" style={{ gridTemplateColumns: "1fr" }}>
        {all.map((s) => (
          <div className="slot" key={s.id}>
            <div className="slot-lab">{s.kind === "extra" ? "Extra" : s.slot === "am" ? "Mañana · fuerte" : "Tarde · suave"}</div>
            <div className="extra">
              <SessionRow s={s} store={store} onOpen={onOpen} />
              {s.kind === "extra" && <button className="exdel" onClick={() => onDel(s.id, k)} aria-label="Eliminar"><Icon name="x" size={12} /></button>}
            </div>
          </div>
        ))}
        {icuExtras.map((a) => (
          <div className="slot" key={a.id}>
            <div className="slot-lab">intervals.icu</div>
            <div className="extra"><IcuSlotRow a={a} onOpen={onOpenAct} /></div>
          </div>
        ))}
      </div></div></div>
      <div className="fill-bottom"><AddExtra dateK={k} onAdd={onAdd} /></div>
    </>
  );
}

/* ---------- progress view ---------- */
function ProgressView({ cursor, setCursor, store }: { cursor: Date; setCursor: (d: Date) => void; store: Store }) {
  const v = weekVolume(cursor, store);
  const tiles: { k: Discipline; lab: string; val: string | number; u: string; accent?: boolean }[] = [
    { k: "run", lab: "Carrera", val: v.run.toFixed(1), u: "km" },
    { k: "bike", lab: "Bici", val: v.bike.toFixed(1), u: "km" },
    { k: "swim", lab: "Natación", val: Math.round(v.swim), u: "m" },
    { k: "gym", lab: "Gimnasio", val: v.gymDone, u: "sesiones" },
    { k: "walk", lab: "Caminata", val: v.walk.toFixed(1), u: "km" },
    { k: "run", lab: "Adherencia", val: v.done, u: "/ " + v.total, accent: true },
  ];
  const weeks: { mon: Date; done: number }[] = [];
  let max = 1;
  for (let i = 7; i >= 0; i--) { const mon = addDays(cursor, -7 * i); const v2 = weekVolume(mon, store); weeks.push({ mon, done: v2.done }); max = Math.max(max, v2.total); }
  return (
    <>
      <div className="weeknav"><div><h2>Progreso</h2><div className="sub mono">Volumen de la semana en curso</div></div><button className="today-btn" onClick={() => setCursor(mondayOf(new Date()))}>Hoy</button></div>
      <div className="tiles">
        {tiles.map((t, i) => {
          const c = t.accent ? "var(--accent)" : DISC[t.k].color;
          return (
            <div className="tile" key={i}>
              <span className="bar" style={{ background: c }} />
              <div className="lab" style={{ color: c }}><Icon name={t.accent ? "today" : t.k} size={13} />{t.lab}</div>
              <div className="num">{t.val}<small>{t.u}</small></div>
            </div>
          );
        })}
      </div>
      <div className="trend">
        <h4>Constancia · 8 semanas</h4><div className="cap">Sesiones completadas por semana</div>
        <div className="bars">
          {weeks.map((w, idx) => {
            const cur = idx === weeks.length - 1;
            return (
              <div className={"col" + (cur ? " cur" : "")} key={idx}>
                <div className="v">{w.done}</div>
                <div className="b" style={{ height: "100%" }}><div className="fill" style={{ height: `${Math.round((w.done / max) * 100)}%` }} /></div>
                <div className="k mono">{w.mon.getDate()}/{w.mon.getMonth() + 1}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="legend">{(Object.keys(DISC) as Discipline[]).map((k) => <div key={k}><span className="sw" style={{ background: DISC[k].color }} />{DISC[k].label}</div>)}</div>
    </>
  );
}

/* ---------- activity feed (intervals.icu) ---------- */
function feedDateLabel(dateISO: string, todayISO: string): string {
  if (dateISO === todayISO) return "Hoy";
  const y = iso(addDays(new Date(todayISO + "T00:00:00"), -1));
  if (dateISO === y) return "Ayer";
  const d = new Date(dateISO + "T00:00:00");
  return `${DOW_LONG[d.getDay()]} · ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
function IcuRow({ a, onOpen }: { a: IcuActivity; onOpen: (a: IcuActivity) => void }) {
  const stats = icuStats(a);
  return (
    <button className="act done" onClick={() => onOpen(a)}>
      <span className="sess-ic" style={{ background: DISC[a.disc].color }}><Icon name={a.disc} size={19} /></span>
      <span className="act-main">
        <span className="act-name">{a.name ?? DISC[a.disc].label}</span>
        <span className="act-stats">
          {stats.length === 0 && <span className="act-empty">{a.type}</span>}
          {stats.map((st, i) => <span key={i} className="actstat"><b>{st.v}</b>{st.u && <i>{st.u}</i>}</span>)}
        </span>
      </span>
      <span className="check"><Icon name="chev" size={16} /></span>
    </button>
  );
}
// filas de detalle para el sheet de una actividad de intervals.icu (solo lo que viene relleno)
function icuDetail(a: IcuActivity): { l: string; v: string; u: string }[] {
  const rows: { l: string; v: string; u: string }[] = [];
  const push = (l: string, v: string | number | null, u = "") => { if (v != null && v !== "") rows.push({ l, v: String(v), u }); };
  const cadU = a.disc === "bike" ? "rpm" : "ppm";
  if (a.distM != null) rows.push(a.disc === "swim" ? { l: "Distancia", v: String(Math.round(a.distM)), u: "m" } : { l: "Distancia", v: (a.distM / 1000).toFixed(2), u: "km" });
  if (a.movingS != null) push("Duración", fmtDur(a.movingS), "h:m:s");
  if (a.elapsedS != null && a.elapsedS !== a.movingS) push("Tiempo total", fmtDur(a.elapsedS), "h:m:s");
  const sp = fmtSpeed(a.disc, a.speedAvg), spm = fmtSpeed(a.disc, a.speedMax);
  if (sp) rows.push({ l: a.disc === "bike" ? "Velocidad" : "Ritmo", v: sp.v, u: sp.u });
  if (spm) rows.push({ l: a.disc === "bike" ? "Vel. máx" : "Ritmo máx", v: spm.v, u: spm.u });
  if (a.hr != null) push("FC media", Math.round(a.hr), "ppm");
  if (a.hrMax != null) push("FC máx", Math.round(a.hrMax), "ppm");
  if (a.power != null) push("Potencia", Math.round(a.power), "W");
  if (a.powerNp != null) push("NP", Math.round(a.powerNp), "W");
  if (a.powerMax != null) push("Pot. máx", Math.round(a.powerMax), "W");
  if (a.cad != null) push("Cadencia", Math.round(a.cad), cadU);
  if (a.cadMax != null) push("Cad. máx", Math.round(a.cadMax), cadU);
  if (a.elevGain != null) push("Desnivel+", Math.round(a.elevGain), "m");
  if (a.calories != null) push("Calorías", Math.round(a.calories), "kcal");
  if (a.load != null) push("Carga", Math.round(a.load), "TSS");
  if (a.intensity != null) push("Intensidad", a.intensity.toFixed(2));
  if (a.feel != null) push("Sensación", a.feel, "/5");
  if (a.rpe != null) push("RPE", a.rpe, "/10");
  return rows;
}
function IcuSheet({ a, onClose }: { a: IcuActivity; onClose: () => void }) {
  const { dragProps, sheetStyle } = useSheetDrag(onClose);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  const rows = icuDetail(a);
  const d = new Date(a.date + "T00:00:00");
  const dayLabel = `${DOW_LONG[d.getDay()]} · ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  const zones = a.hrZoneTimes?.some((t) => t > 0) ? a.hrZoneTimes : null;
  const origin = [a.device, a.source, a.trainer ? "Indoor" : null].filter(Boolean).join(" · ");
  const c = DISC[a.disc].color;
  return (
    <div className="overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" style={sheetStyle}>
        <button className="sheet-close" onClick={onClose} aria-label="Cerrar"><Icon name="x" size={16} /></button>
        <div className="grab-zone" {...dragProps}><div className="grab" /></div>
        <div className="sheet-scroll" {...dragProps}>
          <div className="sheet-hero">
            <span className="sess-ic" style={{ background: c }}><Icon name={a.disc} size={25} /></span>
            <div style={{ minWidth: 0 }}>
              <h3>{a.name ?? DISC[a.disc].label}</h3>
              <div className="meta">
                <span>{dayLabel} · {a.startLocal.slice(11, 16)}</span>
                <span className="itag" style={{ color: c, background: `color-mix(in srgb, ${c} 15%, transparent)` }}>{a.type}</span>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-lab"><span className="eyebrow">Datos · intervals.icu</span></div>
            <div className="stats">
              {rows.map((r, i) => (
                <div className="field derived" key={i}><label>{r.l}</label><div className="inp"><input className="mono" readOnly value={r.v} /><span className="unit">{r.u}</span></div></div>
              ))}
            </div>
          </div>
          {zones && (
            <div className="card">
              <div className="card-lab"><span className="eyebrow">Tiempo en zonas FC</span></div>
              <div className="stats">
                {zones.map((t, i) => t > 0 ? (
                  <div className="field derived" key={i}><label>Z{i + 1}</label><div className="inp"><input className="mono" readOnly value={fmtDur(t)} /></div></div>
                ) : null)}
              </div>
            </div>
          )}
          {origin && (
            <div className="card">
              <div className="card-lab"><span className="eyebrow">Origen</span></div>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 13.5 }}>{origin}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function ActivityView({ anchor, todayISO, onOpenAct }: { anchor: Date; todayISO: string; onOpenAct: (a: IcuActivity) => void }) {
  const { acts, refresh } = useIntervalsFeed(anchor);
  const groups: { date: string; items: IcuActivity[] }[] = [];
  for (const a of acts) {
    const g = groups[groups.length - 1];
    if (g && g.date === a.date) g.items.push(a);
    else groups.push({ date: a.date, items: [a] });
  }
  return (
    <>
      <div className="weeknav">
        <div><h2>Actividad</h2><div className="sub mono">intervals.icu · {acts.length} {acts.length === 1 ? "actividad" : "actividades"}</div></div>
        <button className="today-btn" onClick={refresh}><Icon name="cloud" size={14} /> Actualizar</button>
      </div>
      {acts.length === 0
        ? <div className="fill-grow"><div className="empty">No hay actividades en intervals.icu.<br />Sincroniza un entreno y pulsa Actualizar.</div></div>
        : (
          <div className="feed">
            {groups.map((g) => (
              <div className="feed-group" key={g.date}>
                <div className="feed-date">{feedDateLabel(g.date, todayISO)}</div>
                <div className="day">{g.items.map((a) => <IcuRow key={a.id} a={a} onOpen={onOpenAct} />)}</div>
              </div>
            ))}
          </div>
        )}
    </>
  );
}

/* ---------- slide-to-dismiss (pointer events, iOS-safe) ----------
   dragProps se pone en el asa Y en el scroll: si el contenido está arriba del
   todo y arrastras hacia abajo, cierra; si no, es scroll normal. El ref es la
   fuente de verdad para que onPointerUp no lea un dragY obsoleto en móvil. */
function useSheetDrag(onClose: () => void) {
  const [dragY, setDragY] = useState(0);
  const st = useRef({ startY: 0, active: false, dragging: false, y: 0 });
  const onPointerDown = (e: React.PointerEvent) => {
    st.current = { startY: e.clientY, active: true, dragging: false, y: 0 };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = st.current;
    if (!s.active) return;
    const dy = e.clientY - s.startY;
    if (!s.dragging) {
      const el = e.currentTarget as HTMLElement;
      const atTop = (el.scrollTop || 0) <= 0;
      if (dy > 5 && atTop) {
        s.dragging = true;
        try { el.setPointerCapture(e.pointerId); } catch { /* noop */ }
      } else if (dy < -3 || (el.scrollTop || 0) > 0) {
        s.active = false; // es scroll de contenido, no un cierre
        return;
      } else return;
    }
    const y = dy > 0 ? dy : 0;
    s.y = y;
    setDragY(y);
  };
  const end = () => {
    const s = st.current;
    if (!s.active) return;
    s.active = false;
    const closing = s.dragging && s.y > 90;
    s.dragging = false;
    if (closing) onClose();
    else setDragY(0);
  };
  const dragProps = { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end };
  const sheetStyle: React.CSSProperties = { transform: dragY ? `translateY(${dragY}px)` : undefined, transition: dragY ? "none" : undefined };
  return { dragProps, sheetStyle };
}

/* ---------- session sheet ---------- */
function SessionSheet({ id, s, store, api, act, onClose }: {
  id: string; s: Session; store: Store; api: ReturnType<typeof useStore>; act: IcuActivity | null; onClose: () => void;
}) {
  const [openEx, setOpenEx] = useState<Set<number>>(new Set());
  const { dragProps, sheetStyle } = useSheetDrag(onClose);
  const l = store.logs[id] || {};
  const photos = l.photos || [];
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const photoKey = photos.join(",");
  useEffect(() => {
    let alive = true;
    if (!photos.length) { setPhotoUrls({}); return; }
    api.getPhotoUrls(photos).then((m) => { if (alive) setPhotoUrls(m); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoKey]);
  const d = new Date(s.date + "T00:00:00");
  const dayLabel = `${DOW_LONG[d.getDay()]} · ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  const slotLabel = s.kind === "extra" ? "Sesión extra" : s.slot === "am" ? "Mañana" : "Tarde";
  // si hay actividad de intervals.icu emparejada, mostramos sus datos en vez de los campos manuales
  const icuLog = act && !s.routine ? actToLog(act, s.disc) : null;
  const shown = icuLog ?? l;
  const der = s.routine ? null : derive(s.disc, shown);
  const fields = FIELDS[s.disc] || FIELDS.run;
  const toggleEx = (i: number) => setOpenEx((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });

  return (
    <div className="overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" style={sheetStyle}>
        <button className="sheet-close" onClick={onClose} aria-label="Cerrar"><Icon name="x" size={16} /></button>
        <div className="grab-zone" {...dragProps}>
          <div className="grab" />
        </div>
        <div className="sheet-scroll" {...dragProps}>
          <div className="sheet-hero">
            <span className="sess-ic" style={{ ["--sc"]: DISC[s.disc].color } as React.CSSProperties}><Icon name={s.disc} size={25} /></span>
            <div style={{ minWidth: 0 }}>
              <h3>{s.name}</h3>
              <div className="meta">
                <span>{dayLabel} · {slotLabel}</span>
                <span className="itag" style={{ color: INT[s.intensity].c, background: `color-mix(in srgb, ${INT[s.intensity].c} 15%, transparent)` }}>{s.intensity}</span>
              </div>
            </div>
            <button className={"donebig" + (l.done ? " on" : "")} onClick={() => { api.toggleDone(id); onClose(); }}>
              <span className="check"><Icon name="check" size={12} /></span>{l.done ? "Hecho" : "Marcar"}
            </button>
          </div>

          {s.routine ? (
            <>
              {act && (
                <div className="card">
                  <div className="card-lab"><span className="eyebrow">intervals.icu</span><span className="tag">{act.name ?? act.type}</span></div>
                  <div className="stats">
                    <div className="field derived"><label>Duración</label><div className="inp"><input className="mono" readOnly value={fmtDur(act.movingS)} /><span className="unit">h:m:s</span></div></div>
                    {act.hr != null && <div className="field derived"><label>FC media</label><div className="inp"><input className="mono" readOnly value={Math.round(act.hr)} /><span className="unit">ppm</span></div></div>}
                  </div>
                </div>
              )}
              <div className="card-lab" style={{ padding: "0 2px" }}><span className="eyebrow">Rutina · {ROUTINES[s.routine].label}</span><span className="tag">{ROUTINES[s.routine].ex.length} ejercicios</span></div>
              <div>
                {ROUTINES[s.routine].ex.map((e, ei) => {
                  const sets = l.ex?.[ei] ?? [];
                  const dflt = store.gymDefaults[s.routine!]?.[ei];
                  const filled = sets.some((x) => x && (x.kg || x.reps)) || !!(dflt && (dflt.kg || dflt.reps));
                  const open = openEx.has(ei);
                  return (
                    <div className={"ex" + (open ? " open" : "") + (filled ? " hasdata" : "")} key={ei}>
                      <button className="ex-h" onClick={() => toggleEx(ei)}>
                        <span className="filled" /><span className="exn">{e.n}</span><span className="ext">{e.s}×{e.r}</span>
                        <span className="chev"><Icon name="chev" size={16} /></span>
                      </button>
                      {open && (
                        <div className="ex-body">
                          <div className="sethead"><span>Serie</span><span>Peso</span><span>Reps</span></div>
                          {Array.from({ length: e.s }).map((_, si) => {
                            const cur = sets[si] || {};
                            const kg = cur.kg ?? dflt?.kg ?? "";
                            const reps = cur.reps ?? dflt?.reps ?? "";
                            return (
                              <div className="setrow" key={si}>
                                <span className="sname">Serie {si + 1}</span>
                                <div className="inp"><input inputMode="decimal" value={kg} placeholder="kg" onChange={(ev) => api.setSet(id, s.routine, ei, si, "kg", ev.target.value)} /><span className="unit">kg</span></div>
                                <div className="inp"><input inputMode="numeric" value={reps} placeholder={e.r} onChange={(ev) => api.setSet(id, s.routine, ei, si, "reps", ev.target.value)} /><span className="unit">reps</span></div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {s.plan && (
                <div className="card">
                  <div className="card-lab"><span className="eyebrow">Plan de hoy</span>{s.plan.tag && <span className="tag">{s.plan.tag}</span>}</div>
                  <ul className="plan-steps">{s.plan.steps.map((st, i) => <li key={i}><span className="n">{i + 1}</span><span>{st}</span></li>)}</ul>
                </div>
              )}
              <div className="card">
                <div className="card-lab"><span className="eyebrow">{icuLog ? "Datos · intervals.icu" : "Tus datos"}</span>{icuLog && <span className="tag">{act!.name ?? act!.type}</span>}</div>
                <div className="stats">
                  {fields.map((f) => (
                    <div className={"field" + (icuLog ? " derived" : "")} key={f.k}>
                      <label>{f.l}</label>
                      <div className="inp">
                        <input className={icuLog ? "mono" : undefined} readOnly={!!icuLog} inputMode={f.time ? "text" : "decimal"} value={(shown[f.k as keyof LogData] as string) ?? ""} placeholder={f.ph} onChange={icuLog ? undefined : (ev) => api.setField(id, f.k as keyof LogData, ev.target.value === "" ? null : ev.target.value)} />
                        <span className="unit">{f.u}</span>
                      </div>
                    </div>
                  ))}
                  {der && (
                    <div className="field derived"><label>{der.l}</label><div className="inp"><input className="mono" readOnly value={der.v} /><span className="unit">{der.u}</span></div></div>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="card">
            <div className="card-lab"><span className="eyebrow">Esfuerzo percibido (RPE)</span></div>
            <div className="rpe-row">
              <div className="rpe-track"><input type="range" min={1} max={10} step={1} value={l.rpe ?? 5} onChange={(ev) => api.setField(id, "rpe", Number(ev.target.value))} /></div>
              <div className="rpe-val">{l.rpe ?? 5}<small>/10</small></div>
            </div>
          </div>
          <div className="card">
            <div className="card-lab"><span className="eyebrow">Notas</span></div>
            <textarea className="notes" placeholder="Sensaciones, ritmo, tiempo, molestias…" value={l.notes ?? ""} onChange={(ev) => api.setField(id, "notes", ev.target.value)} />
          </div>
          <div className="card">
            <div className="card-lab"><span className="eyebrow">Fotos</span>{photos.length > 0 && <span className="tag">{photos.length}</span>}</div>
            <div className="photo-grid">
              {photos.map((p) => (
                <div className="photo" key={p}>
                  {photoUrls[p]
                    ? <img src={photoUrls[p]} alt="Foto de la sesión" onClick={() => setLightbox(photoUrls[p])} />
                    : <div className="photo-ph" />}
                  <button className="photo-del" onClick={() => api.removePhoto(id, p)} aria-label="Eliminar foto"><Icon name="x" size={13} /></button>
                </div>
              ))}
              <label className={"photo-add" + (uploading ? " busy" : "")}>
                <input type="file" accept="image/*" capture="environment" className="hidden" disabled={uploading}
                  onChange={async (ev) => { const f = ev.target.files?.[0]; ev.target.value = ""; if (!f) return; setUploading(true); await api.addPhoto(id, f); setUploading(false); }} />
                <Icon name="camera" size={22} /><span>{uploading ? "Subiendo…" : "Añadir foto"}</span>
              </label>
            </div>
          </div>
          {s.kind === "extra" && <button className="danger" onClick={() => { api.delExtra(id, s.date); onClose(); }}>Eliminar esta sesión extra</button>}
        </div>
      </div>
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Foto de la sesión" />
          <button className="lightbox-close" onClick={() => setLightbox(null)} aria-label="Cerrar"><Icon name="x" size={18} /></button>
        </div>
      )}
    </div>
  );
}

/* ---------- root ---------- */
const SYNC_LABEL: Record<string, string> = { loading: "Cargando", saving: "Guardando…", synced: "Sincronizado", offline: "Sin conexión" };

export default function TriaApp({ userId, email }: { userId: string; email: string }) {
  const api = useStore(userId);
  const { store } = api;
  const router = useRouter();
  const [view, setView] = useState<"week" | "today" | "activity" | "progress">("week");
  const [cursor, setCursor] = useState<Date>(() => mondayOf(new Date()));
  const [openId, setOpenId] = useState<string | null>(null);
  const [openAct, setOpenAct] = useState<IcuActivity | null>(null);
  const [todayISO] = useState<string>(() => iso(new Date()));
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [toast, setToast] = useState<string | null>(null);
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const cur = (document.documentElement.getAttribute("data-theme") as "light" | "dark") || "dark";
    setTheme(cur);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenId(null); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = openId ? "hidden" : "";
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);

  function flash(msg: string) {
    setToast(msg);
    if (toastT.current) clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(null), 1600);
  }
  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("tria.theme", next); } catch {}
    setTheme(next);
  }
  function exportData() {
    const href = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(store, null, 2));
    const a = document.createElement("a"); a.href = href; a.download = "tria-datos-" + todayISO + ".json"; a.click();
    flash("Exportado");
  }
  async function logout() { const supabase = createClient(); await supabase.auth.signOut(); router.push("/login"); router.refresh(); }

  const sheetSession = openId ? findSession(openId, store) : null;
  // sigue la semana de la sesión abierta (o la que se ve) para emparejar actividades de intervals.icu
  const focusWeek = sheetSession ? mondayOf(new Date(sheetSession.date + "T00:00:00")) : cursor;
  const { activities, match } = useIntervals(focusWeek);

  return (
    <>
      <div className="spectrum" />
      <header className="appbar">
        <div className="appbar-in">
          <div className="brand"><span className="brand-mark"><Icon name="mdot" size={23} /></span><div className="brand-txt"><b>Tría</b><span>{email || "Camino al Ironman"}</span></div></div>
          <div className={"syncbadge " + api.sync}><span className="dot" />{SYNC_LABEL[api.sync]}</div>
          <button className="iconbtn" onClick={toggleTheme} title="Cambiar tema" aria-label="Cambiar tema"><Icon name={theme === "dark" ? "sun" : "moon"} /></button>
          <button className="iconbtn" onClick={exportData} title="Exportar datos" aria-label="Exportar datos"><Icon name="down" /></button>
          <button className="iconbtn" onClick={logout} title="Cerrar sesión" aria-label="Cerrar sesión"><Icon name="logout" /></button>
        </div>
      </header>

      <main className={"wrap" + (view === "today" || view === "activity" ? " fill" : "")}>
        {view === "week" && <WeekView cursor={cursor} setCursor={setCursor} store={store} todayISO={todayISO} activities={activities} onOpen={setOpenId} onOpenAct={setOpenAct} onAdd={(dk, k) => setOpenId(api.addExtra(dk, k))} onDel={(id, k) => { if (confirm("¿Eliminar esta sesión y sus datos?")) { void api.delExtra(id, k); flash("Eliminada"); } }} />}
        {view === "today" && <TodayView store={store} activities={activities} onOpen={setOpenId} onOpenAct={setOpenAct} onAdd={(dk, k) => setOpenId(api.addExtra(dk, k))} onDel={(id, k) => { if (confirm("¿Eliminar esta sesión y sus datos?")) { void api.delExtra(id, k); flash("Eliminada"); } }} />}
        {view === "activity" && <ActivityView anchor={new Date(todayISO + "T00:00:00")} todayISO={todayISO} onOpenAct={setOpenAct} />}
        {view === "progress" && <ProgressView cursor={cursor} setCursor={setCursor} store={store} />}
      </main>

      <nav className="tabbar"><div className="tabbar-in">
        {([["today", "Hoy", "today"], ["week", "Semana", "cal"], ["activity", "Actividad", "feed"], ["progress", "Progreso", "chart"]] as const).map(([k, lab, ic]) => (
          <button key={k} className={"tab" + (view === k ? " active" : "")} onClick={() => { setView(k); window.scrollTo(0, 0); }}><Icon name={ic} size={22} /><span>{lab}</span></button>
        ))}
      </div></nav>

      {sheetSession && <SessionSheet id={openId!} s={sheetSession} store={store} api={api} act={match(sheetSession.date, sheetSession.disc)} onClose={() => setOpenId(null)} />}
      {openAct && <IcuSheet a={openAct} onClose={() => setOpenAct(null)} />}
      {toast && <div className="toast show"><Icon name="check" size={15} />{toast}</div>}
    </>
  );
}
