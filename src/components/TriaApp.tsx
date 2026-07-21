"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useStore, type Store, type ImportEntry, type UseStore } from "@/lib/store";
import { useIntervals, useIntervalsFeed, actToLog, icuStats, fmtDur, fmtSpeed, type IcuActivity } from "@/lib/intervals";
import { Icon } from "@/lib/icons";
import { composeStatsImage, shareImage, downloadImage, type OverlayStat } from "@/lib/share-image";
import { coachAdvice, TIPS, TIP_CAT } from "@/lib/coach";
import {
  DISC, INT, ROUTINES, FIELDS, MEALS, FOODS, foodsById, serving, itemAmount, mealMacros, dayMacros, dayDefFor, weekMeta, DOW_LONG, MONTHS,
  iso, mondayOf, addDays, fmtDate, derive, hasData, parseTime, AT_LAST, RACE, weeksToRace, weekTarget, NOTE_CATS, DEFAULT_CAT,
  type Discipline, type Session, type LogData, type Food, type Meal, type MealLog, type Macros, type WeekMap, type AgendaNote, type NoteCat,
} from "@/lib/domain";

/* ---------- pure helpers ---------- */
// reordenación de días de la semana que contiene `date` (undefined = plantilla original)
function mapFor(store: Store, date: Date): WeekMap | undefined {
  return store.weekmap[iso(mondayOf(date))];
}
function templSessions(date: Date, map?: WeekMap | null): Session[] {
  const def = dayDefFor(date, map);
  return (def ? def.sessions : []).map((s) => ({ ...s, id: iso(date) + ":" + s.slot, kind: "templ" as const, date: iso(date) }));
}
function extraSessions(date: Date, store: Store): Session[] {
  const k = iso(date);
  return (store.extras[k] || []).map((e) => ({ disc: e.disc, name: e.name, intensity: e.intensity, id: e.id, kind: "extra" as const, date: k, plan: null }));
}
function findSession(id: string, store: Store): Session | null {
  const d = new Date(id.split(":")[0] + "T00:00:00");
  const t = templSessions(d, mapFor(store, d)).find((s) => s.id === id);
  if (t) return t;
  return extraSessions(d, store).find((s) => s.id === id) ?? null;
}
// `secs` = tiempo total registrado en la semana (todas las disciplinas, gimnasio incluido)
type Vol = { run: number; bike: number; swim: number; walk: number; gymDone: number; done: number; total: number; secs: number };
function weekVolume(mon: Date, store: Store): Vol {
  const v: Vol = { run: 0, bike: 0, swim: 0, walk: 0, gymDone: 0, done: 0, total: 0, secs: 0 };
  for (let i = 0; i < 7; i++) {
    const d = addDays(mon, i);
    [...templSessions(d, mapFor(store, d)), ...extraSessions(d, store)].forEach((s) => {
      v.total++;
      const l = store.logs[s.id];
      const dn = !!(l && l.done);
      if (dn) v.done++;
      v.secs += parseTime(l?.time) ?? 0;
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

/* ---------- week view ---------- */
function WeekView({ cursor, setCursor, store, todayISO, onOpen, onAdd, onDel, onSwap, onResetWeek }: {
  cursor: Date; setCursor: (d: Date) => void; store: Store; todayISO: string;
  onOpen: (id: string) => void; onAdd: (d: Discipline, k: string) => void; onDel: (id: string, k: string) => void;
  onSwap: (mon: string, a: number, b: number) => void; onResetWeek: (mon: string) => void;
}) {
  const start = cursor, end = addDays(start, 6);
  const mon = iso(start);
  const map = store.weekmap[mon];
  const [editing, setEditing] = useState(false);
  const [pick, setPick] = useState<number | null>(null);
  const sameMonth = start.getMonth() === end.getMonth();
  const title = sameMonth ? `${start.getDate()}–${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}` : `${fmtDate(start)} – ${fmtDate(end)}`;
  let done = 0, total = 0;
  const mini: { n: number; done: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i);
    const ss = [...templSessions(d, map), ...extraSessions(d, store)];
    let dd = 0;
    ss.forEach((s) => { total++; if (store.logs[s.id]?.done) { done++; dd++; } });
    mini.push({ n: ss.length, done: dd });
  }
  const pct = total ? Math.round((done / total) * 100) : 0;
  const wm = weekMeta(start);
  const tapDay = (dow: number) => {
    if (pick == null) { setPick(dow); return; }
    if (pick === dow) { setPick(null); return; }
    onSwap(mon, pick, dow);
    setPick(null);
  };
  return (
    <>
      <div className="weeknav">
        <button className="navbtn" onClick={() => setCursor(addDays(cursor, -7))} aria-label="Semana anterior"><Icon name="left" size={16} /></button>
        <div><h2>{title}</h2><div className="sub mono">{wm ? `Semana ${wm.num}/${wm.total} · ${wm.phase}${wm.recovery ? " 🌙" : ""}` : "Fuera del plan"}</div></div>
        <button className="navbtn" onClick={() => setCursor(addDays(cursor, 7))} aria-label="Semana siguiente"><Icon name="right" size={16} /></button>
        <button className="today-btn" onClick={() => setCursor(mondayOf(new Date()))}>Hoy</button>
      </div>
      <div className="adh">
        <div className="ring" style={{ background: `conic-gradient(var(--accent) ${pct}%, var(--surface-3) 0)` }}><b>{pct}%</b></div>
        <div className="adh-txt"><div className="big mono">{done} / {total} sesiones</div><div className="small">completadas esta semana</div></div>
        <div className="miniweek">{mini.map((m, idx) => Array.from({ length: Math.max(m.n, 1) }).map((_, i) => <i key={idx + "-" + i} className={i < m.done ? "on" : ""} />))}</div>
      </div>
      {wm && (
        <div className="weekedit">
          <button className={"weekedit-btn" + (editing ? " on" : "")} onClick={() => { setEditing((e) => !e); setPick(null); }}>
            <Icon name={editing ? "check" : "cal"} size={14} /> {editing ? "Listo" : "Reordenar días"}
          </button>
          {editing && <span className="weekedit-hint">{pick == null ? "Toca dos días para intercambiarlos" : `${DOW_LONG[pick]} → toca con quién cambiarlo`}</span>}
          {map && <button className="weekedit-reset" onClick={() => { onResetWeek(mon); setPick(null); }}>Restablecer</button>}
        </div>
      )}
      <div className="days">
        {Array.from({ length: 7 }).map((_, i) => {
          const d = addDays(start, i), k = iso(d), def = dayDefFor(d, map);
          const dow = d.getDay();
          const srcDow = map ? map[dow] : dow;
          const isToday = k === todayISO;
          const templ = templSessions(d, map), extra = extraSessions(d, store);
          return (
            <div key={k} className={"day" + (isToday ? " today" : "") + (editing ? " editing" : "") + (pick === dow ? " picked" : "")}>
              <div className="day-h" {...(editing ? { role: "button", tabIndex: 0, onClick: () => tapDay(dow), style: { cursor: "pointer" } } : {})}>
                {editing && <span className="swap-ic"><Icon name={pick === dow ? "check" : "chev"} size={14} /></span>}
                <span className="dow">{def.day}</span><span className="date">{fmtDate(d)}</span>
                {srcDow !== dow && <span className="swaptag">plan de {DOW_LONG[srcDow]}</span>}
                {isToday && <span className="todaypill">Hoy</span>}
              </div>
              {def.rest && templ.length === 0 && extra.length === 0 && (
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
              <AddExtra dateK={k} onAdd={onAdd} />
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ---------- today view: calendario del día ---------- */
// Rejilla de horas (desde las 7 por defecto). Las sesiones vienen precolocadas —la de la mañana
// a las 8, la de la tarde a las 18— sin necesidad de guardar nada; si cambias la hora, se guarda.
// En cualquier hora libre puedes añadir una nota (reunión, almuerzo…).
type AgendaRow = { at: string } & ({ kind: "sess"; s: Session } | { kind: "note"; note: AgendaNote });

const CAL_FROM = 7, CAL_TO = 22;
const DEFAULT_AT: Record<string, string> = { am: "08:00", pm: "18:00" };
const sessionAt = (s: Session, times: Record<string, string>) => times[s.id] ?? (s.slot ? DEFAULT_AT[s.slot] : "12:00");
const hourOf = (at: string) => parseInt(at.slice(0, 2), 10);

// Un consejo a la vez; al tocarlo pasa al siguiente (temas intercalados).
function TipCard() {
  const [i, setI] = useState(() => new Date().getDate() % TIPS.length);
  const tip = TIPS[i];
  const c = TIP_CAT[tip.cat];
  return (
    <button className="tipcard" onClick={() => setI((n) => (n + 1) % TIPS.length)} aria-label="Ver otro consejo">
      <span className="tip-ic" style={{ ["--sc"]: c.color } as React.CSSProperties}><Icon name={c.icon} size={15} /></span>
      <span className="tip-body">
        <span className="tip-cat" style={{ color: c.color }}>{c.label}</span>
        <span className="tip-txt">{tip.text}</span>
      </span>
      <span className="tip-next"><Icon name="right" size={14} /></span>
    </button>
  );
}

function TodayView({ store, api, onOpen, onAdd, onDel }: {
  store: Store; api: UseStore; onOpen: (id: string) => void; onAdd: (d: Discipline, k: string) => void; onDel: (id: string, k: string) => void;
}) {
  const [catOpen, setCatOpen] = useState<string | null>(null);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const k = iso(now);
  const templ = templSessions(now, mapFor(store, now)), extra = extraSessions(now, store);
  const all = [...templ, ...extra];
  const day = store.agenda[k] || {};
  const times = day.times || {};
  const notes = day.notes || [];
  const rows: AgendaRow[] = [
    ...all.map((s) => ({ kind: "sess" as const, at: sessionAt(s, times), s })),
    ...notes.map((note) => ({ kind: "note" as const, at: note.at || AT_LAST, note })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  // el calendario se estira si algo cae fuera del rango por defecto
  const lo = Math.min(CAL_FROM, ...rows.filter((r) => r.at !== AT_LAST).map((r) => hourOf(r.at)));
  const hi = Math.max(CAL_TO, ...rows.filter((r) => r.at !== AT_LAST).map((r) => hourOf(r.at)));
  const hours = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  return (
    <>
      <div className="weeknav"><div><h2 style={{ textTransform: "capitalize" }}>{DOW_LONG[now.getDay()]}</h2><div className="sub mono">{now.getDate()} {MONTHS[now.getMonth()]} {now.getFullYear()}</div></div></div>
      <TipCard />
      {rows.length === 0 && (
        <div className="card"><div className="card-lab"><span className="eyebrow">Descanso</span></div><p style={{ margin: 0, color: "var(--muted)", fontSize: 13.5 }}>Hoy toca descansar o recuperación activa. Añade una caminata suave o una nota si quieres planificar el día.</p></div>
      )}
      <div className="cal">
        {hours.map((h) => {
          const hh = String(h).padStart(2, "0");
          const inHour = rows.filter((r) => r.at !== AT_LAST && hourOf(r.at) === h);
          return (
            <div className={"cal-row" + (inHour.length ? " full" : "")} key={h}>
              <div className="cal-hour mono">{hh}</div>
              <div className="cal-slot">
                {inHour.map((r) =>
                  r.kind === "sess" ? (
                    <div className="cal-item" key={r.s.id}>
                      <label className="cal-when" title="Cambiar hora">
                        <Icon name="today" size={13} />
                        <input type="time" value={r.at}
                          onChange={(e) => api.setSessionTime(k, r.s.id, e.target.value)} aria-label={`Hora de ${r.s.name}`} />
                      </label>
                      <button className={"cal-main" + (store.logs[r.s.id]?.done ? " done" : "")} onClick={() => onOpen(r.s.id)}>
                        <span className="sess-ic" style={{ ["--sc"]: DISC[r.s.disc].color } as React.CSSProperties}><Icon name={r.s.disc} size={16} /></span>
                        <span className="cal-txt">
                          <span className="cal-name">{r.s.name}</span>
                          <span className="cal-sub"><span className="idot" style={{ background: INT[r.s.intensity].c }} />{r.s.intensity}</span>
                        </span>
                        <span className="check"><Icon name="check" size={11} /></span>
                      </button>
                      {r.s.kind === "extra" && <button className="ag-del" onClick={() => onDel(r.s.id, k)} aria-label="Eliminar"><Icon name="x" size={12} /></button>}
                    </div>
                  ) : (
                    <div className={"cal-item" + (catOpen === r.note.id ? " picking" : "")} key={r.note.id}>
                      <button className="cal-cat" style={{ color: NOTE_CATS[r.note.cat ?? DEFAULT_CAT].color }}
                        onClick={() => setCatOpen((c) => (c === r.note.id ? null : r.note.id))}
                        aria-label={`Categoría: ${NOTE_CATS[r.note.cat ?? DEFAULT_CAT].label}`}>
                        <Icon name={NOTE_CATS[r.note.cat ?? DEFAULT_CAT].icon} size={15} />
                      </button>
                      <input className="ag-note" value={r.note.text} placeholder="Reunión, almuerzo…" autoFocus={!r.note.text}
                        onChange={(e) => api.setNote(k, r.note.id, { text: e.target.value })} aria-label="Nota" />
                      <label className="cal-when" title="Cambiar hora">
                        <Icon name="today" size={13} />
                        <input type="time" value={r.at}
                          onChange={(e) => api.setNote(k, r.note.id, { at: e.target.value })} aria-label="Hora de la nota" />
                      </label>
                      <button className="ag-del" onClick={() => api.delNote(k, r.note.id)} aria-label="Eliminar nota"><Icon name="x" size={12} /></button>
                      {catOpen === r.note.id && (
                        <div className="cat-picker">
                          {(Object.keys(NOTE_CATS) as NoteCat[]).map((ck) => (
                            <button key={ck} className={r.note.cat === ck ? "on" : ""} style={{ ["--cc"]: NOTE_CATS[ck].color } as React.CSSProperties}
                              onClick={() => { api.setNote(k, r.note.id, { cat: ck }); setCatOpen(null); }}>
                              <Icon name={NOTE_CATS[ck].icon} size={14} /> {NOTE_CATS[ck].label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ),
                )}
                <button className="cal-add" onClick={() => api.addNote(k, `${hh}:00`)} aria-label={`Añadir a las ${hh}:00`}>
                  <Icon name="plus" size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="fill-bottom"><AddExtra dateK={k} onAdd={onAdd} /></div>
    </>
  );
}

/* ---------- progress view ---------- */
function ProgressView({ cursor, setCursor, store }: { cursor: Date; setCursor: (d: Date) => void; store: Store }) {
  const mon = mondayOf(cursor);
  const end = addDays(mon, 6);
  const sameMonth = mon.getMonth() === end.getMonth();
  const title = sameMonth ? `${mon.getDate()}–${end.getDate()} ${MONTHS[end.getMonth()]}` : `${fmtDate(mon)} – ${fmtDate(end)}`;
  const v = weekVolume(mon, store);
  const hours = v.secs / 3600;
  const target = weekTarget(mon);
  const left = weeksToRace(mon);
  const pctDone = v.total ? Math.round((v.done / v.total) * 100) : 0;
  const tiles: { k: Discipline; lab: string; val: string | number; u: string; accent?: boolean }[] = [
    { k: "run", lab: "Carrera", val: v.run.toFixed(1), u: "km" },
    { k: "bike", lab: "Bici", val: v.bike.toFixed(1), u: "km" },
    { k: "swim", lab: "Natación", val: Math.round(v.swim), u: "m" },
    { k: "gym", lab: "Gimnasio", val: v.gymDone, u: "sesiones" },
    { k: "walk", lab: "Caminata", val: v.walk.toFixed(1), u: "km" },
    { k: "run", lab: "Tiempo", val: hours.toFixed(1), u: "h", accent: true },
  ];
  const goals = target
    ? [
        { lab: "Carrera", now: v.run, goal: target.runKm, u: "km", dec: 1, c: DISC.run.color },
        { lab: "Tiempo total", now: hours, goal: target.hours, u: "h", dec: 1, c: "var(--accent)" },
      ]
    : [];
  const weeks: { mon: Date; done: number }[] = [];
  let max = 1;
  for (let i = 7; i >= 0; i--) { const wmon = addDays(mon, -7 * i); const v2 = weekVolume(wmon, store); weeks.push({ mon: wmon, done: v2.done }); max = Math.max(max, v2.total); }
  return (
    <>
      <div className="weeknav">
        <button className="navbtn" onClick={() => setCursor(addDays(mon, -7))} aria-label="Semana anterior"><Icon name="left" size={16} /></button>
        <div><h2>Progreso</h2><div className="sub mono">Volumen · {title}</div></div>
        <button className="navbtn" onClick={() => setCursor(addDays(mon, 7))} aria-label="Semana siguiente"><Icon name="right" size={16} /></button>
        <button className="today-btn" onClick={() => setCursor(mondayOf(new Date()))}>Hoy</button>
      </div>
      <div className="adh">
        <div className="ring" style={{ background: `conic-gradient(var(--accent) ${pctDone}%, var(--surface-3) 0)` }}><b>{pctDone}%</b></div>
        <div className="adh-txt"><div className="big mono">{v.done} / {v.total} sesiones</div><div className="small">completadas esta semana</div></div>
      </div>
      {target && (
        <div className="goal">
          <div className="goal-h">
            <div>
              <div className="goal-race"><Icon name="today" size={14} /> {RACE.name} · {RACE.date.getDate()} {MONTHS[RACE.date.getMonth()]} {RACE.date.getFullYear()}</div>
              <div className="goal-left mono">{left === 0 ? "¡Es esta semana!" : left === 1 ? "Falta 1 semana" : `Faltan ${left} semanas`}</div>
            </div>
            <span className="goal-tag">{target.note}</span>
          </div>
          {goals.map((g) => {
            const pct = Math.min(100, Math.round((g.now / g.goal) * 100));
            return (
              <div className="goal-row" key={g.lab}>
                <div className="goal-lab">{g.lab}<b className="mono">{g.now.toFixed(g.dec)} / {g.goal} {g.u}</b></div>
                <div className="goal-bar"><div className="goal-fill" style={{ width: `${pct}%`, background: g.c }} /></div>
              </div>
            );
          })}
          <div className="goal-note">Objetivo orientativo de la semana. Ajusta según cómo te sientas.</div>
        </div>
      )}
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

/* ---------- food view (alimentación diaria) ----------
   Por defecto se asume que comiste lo planificado; solo registras las
   desviaciones: desmarca lo que no comiste, añade lo que comiste de más. */
function FoodPicker({ foods, onAdd, onCreate }: { foods: Food[]; onAdd: (id: string, amt?: number) => void; onCreate: (name: string, kcal: number) => void }) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState("");
  const [amt, setAmt] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const selFood = foods.find((f) => f.id === sel) ?? foods[0];
  const gram = selFood?.grams != null;
  const hasAmt = gram || !!selFood?.unit;
  const defAmt = gram ? selFood!.grams! : 1;
  const add = () => {
    if (!selFood) return;
    const a = amt ? parseInt(amt, 10) : defAmt;
    onAdd(selFood.id, hasAmt ? a : undefined);
    setAmt(""); setSel(""); setOpen(false);
  };
  const create = () => {
    const k = parseInt(kcal, 10);
    if (!name.trim() || !(k > 0)) return;
    onCreate(name.trim(), k);
    setName(""); setKcal(""); setCreating(false);
  };
  return (
    <div className="food-add">
      {open && (
        <div className="food-pick">
          {!creating ? (
            <div className="food-sel">
              <select value={selFood?.id ?? ""} onChange={(e) => { setSel(e.target.value); setAmt(""); }}>
                {foods.map((f) => <option key={f.id} value={f.id}>{f.name} · {Math.round(serving(f, f.grams ?? 1).kcal)} kcal</option>)}
              </select>
              {hasAmt && (
                <div className="food-amt">
                  <input inputMode="numeric" placeholder={String(defAmt)} value={amt} onChange={(e) => setAmt(e.target.value)} />
                  {gram && <span className="unit">g</span>}
                </div>
              )}
              <button className="food-add-btn" onClick={add}>Añadir</button>
            </div>
          ) : (
            <div className="food-new">
              <input placeholder="Alimento nuevo" value={name} onChange={(e) => setName(e.target.value)} />
              <input inputMode="numeric" placeholder="kcal" value={kcal} onChange={(e) => setKcal(e.target.value)} />
              <button className="food-new-add" onClick={create} aria-label="Crear alimento"><Icon name="plus" size={15} /></button>
            </div>
          )}
          <button className="food-link" onClick={() => setCreating((c) => !c)}>{creating ? "← elegir del catálogo" : "+ crear alimento nuevo"}</button>
        </div>
      )}
      <button className="addbtn" onClick={() => setOpen((o) => !o)}><Icon name="plus" size={15} /> Comí algo más</button>
    </div>
  );
}
// bloque de 4 columnas al final de cada fila / cabecera: kcal | prot | carb | gras
function MacroCols({ m, head }: { m: Macros; head?: boolean }) {
  const r = (n: number) => Math.round(n);
  return (
    <div className={"macros" + (head ? " head" : "")}>
      <span className="mac"><b className="mono">{r(m.kcal)}</b><i>kcal</i></span>
      <span className="mac"><b className="mono">{r(m.p)}</b><i>prot</i></span>
      <span className="mac"><b className="mono">{r(m.c)}</b><i>carb</i></span>
      <span className="mac"><b className="mono">{r(m.fat)}</b><i>gras</i></span>
    </div>
  );
}
function FoodRow({ name, macros, eaten, extra, onClick, amount, unitLabel, onDec, onInc }: {
  name: string; macros: Macros; eaten: boolean; extra?: boolean; onClick: () => void;
  amount?: number; unitLabel?: string; onDec?: () => void; onInc?: () => void;
}) {
  return (
    <div className={"food-row" + (eaten ? " done" : "")}>
      <div className="food-txt">
        <button className="food-name" onClick={onClick}>
          <span className="check"><Icon name={extra ? "x" : "check"} size={12} /></span>
          <span className="food-name-t">{name}{extra && <b className="food-extra-tag">extra</b>}</span>
        </button>
        {amount != null && (
          <div className="qty">
            <button onClick={onDec} aria-label="Menos">−</button>
            <b className="mono">{amount}{unitLabel}</b>
            <button onClick={onInc} aria-label="Más">+</button>
          </div>
        )}
      </div>
      <MacroCols m={macros} />
    </div>
  );
}
function MealCard({ meal, log, date, byId, catalog, api }: {
  meal: Meal; log: MealLog | undefined; date: string; byId: Record<string, Food>; catalog: Food[]; api: ReturnType<typeof useStore>;
}) {
  const eaten = new Set(log?.eaten || []);
  let lastGroup: string | undefined;
  return (
    <div className="card">
      <div className="card-lab"><span className="eyebrow">{meal.name}</span></div>
      <MacroCols m={mealMacros(meal, log, byId)} head />
      <div className="food-list">
        {meal.foods.map((it) => {
          const f = byId[it.id];
          const gram = f?.grams != null;
          const step = gram ? 10 : 1;
          const amt = itemAmount(it, f, log);
          const header = it.group && it.group !== lastGroup ? it.group : null;
          lastGroup = it.group;
          return (
            <Fragment key={it.id}>
              {header && <div className="food-group">{header}</div>}
              <FoodRow
                name={f?.name ?? it.id}
                macros={serving(f, amt)}
                eaten={eaten.has(it.id)}
                onClick={() => api.toggleFoodPlanned(date, meal.id, it.id)}
                amount={gram || f?.unit ? amt : undefined}
                unitLabel={gram ? " g" : ""}
                onDec={() => api.setFoodQty(date, meal.id, it.id, amt - step)}
                onInc={() => api.setFoodQty(date, meal.id, it.id, amt + step)}
              />
            </Fragment>
          );
        })}
        {(log?.add || []).map((a, idx) => {
          const f = byId[a.id];
          const gram = f?.grams != null;
          const amount = gram || f?.unit;
          const amt = a.amt ?? (gram ? f!.grams! : 1);
          const step = gram ? 10 : 1;
          return (
            <FoodRow key={"x" + idx} name={f?.name ?? a.id} macros={serving(f, amount ? amt : 1)} eaten extra
              onClick={() => api.removeFoodExtra(date, meal.id, idx)}
              amount={amount ? amt : undefined} unitLabel={gram ? " g" : ""}
              onDec={() => api.setExtraQty(date, meal.id, idx, amt - step)}
              onInc={() => api.setExtraQty(date, meal.id, idx, amt + step)}
            />
          );
        })}
      </div>
      <FoodPicker foods={catalog} onAdd={(fid, amt) => api.addFoodExtra(date, meal.id, fid, amt)} onCreate={(n, k) => api.addFoodExtra(date, meal.id, api.addCustomFood(n, k))} />
    </div>
  );
}
function FoodView({ api }: { api: ReturnType<typeof useStore> }) {
  const [day, setDay] = useState<Date>(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const k = iso(day);
  const byId = foodsById(api.store.customFoods);
  const catalog = [...FOODS, ...api.store.customFoods];
  const dayLog = api.store.foodLog[k];
  const total = dayMacros(dayLog, byId);
  const isToday = k === iso(new Date());
  return (
    <>
      <div className="weeknav">
        <button className="navbtn" onClick={() => setDay(addDays(day, -1))} aria-label="Día anterior"><Icon name="left" size={16} /></button>
        <div><h2 style={{ textTransform: "capitalize" }}>{isToday ? "Hoy" : DOW_LONG[day.getDay()]}</h2><div className="sub mono">{day.getDate()} {MONTHS[day.getMonth()]} {day.getFullYear()}</div></div>
        <button className="navbtn" onClick={() => setDay(addDays(day, 1))} aria-label="Día siguiente"><Icon name="right" size={16} /></button>
        <button className="today-btn" onClick={() => { const d = new Date(); d.setHours(0, 0, 0, 0); setDay(d); }}>Hoy</button>
      </div>
      <div className="adh food-total">
        <div className="ring" style={{ background: "var(--accent)" }}><b style={{ color: "var(--accent)" }}><Icon name="food" size={19} /></b></div>
        <div className="adh-txt"><div className="big mono">Total del día</div><div className="small">marca lo que comas</div></div>
        <MacroCols m={total} head />
      </div>
      {MEALS.map((m) => <MealCard key={m.id} meal={m} log={dayLog?.[m.id]} date={k} byId={byId} catalog={catalog} api={api} />)}
    </>
  );
}

/* ---------- activity feed ---------- */
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
// filas de detalle para el sheet de una actividad registrada (solo lo que viene relleno)
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
            <div className="card-lab"><span className="eyebrow">Datos</span></div>
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
        <div><h2>Actividad</h2><div className="sub mono">{acts.length} {acts.length === 1 ? "actividad" : "actividades"}</div></div>
        <button className="today-btn" onClick={refresh}><Icon name="cloud" size={14} /> Actualizar</button>
      </div>
      {acts.length === 0
        ? <div className="fill-grow"><div className="empty">No hay actividades registradas.<br />Sincroniza un entreno y pulsa Actualizar.</div></div>
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
  // si hay actividad sincronizada, prerrellena los campos pero SIEMPRE editables (el usuario
  // corrige, p.ej. la distancia de cinta/rodillo que viene mal). Lo que edite gana sobre el auto.
  // la actividad sincronizada solo prerrellena; el valor guardado (l) manda
  const autoLog = act && !s.routine ? actToLog(act, s.disc) : null;
  const fields = FIELDS[s.disc] || FIELDS.run;
  const fieldVal = (k: keyof LogData) => (l[k] ?? autoLog?.[k] ?? "") as string;
  // edición explícita de stats con borrador local (evita que se rellene solo con el valor previo).
  // Arranca en modo edición si la sesión está vacía; si ya hay datos, se ve y hay que pulsar "Editar".
  const [statsEditing, setStatsEditing] = useState(() => !s.routine && !fields.some((f) => fieldVal(f.k as keyof LogData) !== ""));
  const [draft, setDraft] = useState<Record<string, string>>({});
  const startEdit = () => { const d0: Record<string, string> = {}; fields.forEach((f) => { d0[f.k] = fieldVal(f.k as keyof LogData); }); setDraft(d0); setStatsEditing(true); };
  const saveEdit = () => { fields.forEach((f) => { const v = (draft[f.k] ?? "").trim(); api.setField(id, f.k as keyof LogData, v === "" ? null : draft[f.k]); }); setStatsEditing(false); };
  const cancelEdit = () => setStatsEditing(false);
  const der = s.routine ? null : derive(s.disc, (statsEditing ? draft : { ...autoLog, ...l }) as LogData);
  const advice = s.routine ? [] : coachAdvice(s.disc, s.intensity, (statsEditing ? draft : { ...autoLog, ...l }) as LogData, act ?? null);
  const toggleEx = (i: number) => setOpenEx((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });

  // métricas que se estampan sobre la foto: las mismas que ya muestra la sesión
  // (lo que hayas escrito, o lo sincronizado desde intervals.icu)
  const [sharing, setSharing] = useState(false);
  const [shareErr, setShareErr] = useState<string | null>(null);
  function overlayStats(): OverlayStat[] {
    const out: OverlayStat[] = [];
    const dist = fieldVal("dist"), time = fieldVal("time"), hr = fieldVal("hr");
    if (dist) out.push({ label: "Distancia", value: dist, unit: s.disc === "swim" ? "m" : "km" });
    if (der && der.v !== "—") out.push({ label: der.l, value: der.v, unit: der.u });
    if (time) out.push({ label: "Tiempo", value: time });
    if (hr) out.push({ label: "FC media", value: hr, unit: "ppm" });
    return out;
  }
  // `save` = guardar siempre en el dispositivo; si no, compartir (y descargar como respaldo)
  async function shareWithStats(url: string, save = false) {
    setSharing(true);
    setShareErr(null);
    try {
      const blob = await composeStatsImage(url, overlayStats());
      const name = `tria-${s.date}.jpg`;
      if (save) downloadImage(blob, name);
      else await shareImage(blob, name);
    } catch {
      setShareErr("No se pudo generar la imagen");
    }
    setSharing(false);
  }

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
                  <div className="card-lab"><span className="eyebrow">Registrado</span><span className="tag">{act.name ?? act.type}</span></div>
                  <div className="stats">
                    <div className="field derived"><label>Duración</label><div className="inp"><input className="mono" readOnly value={fmtDur(act.movingS)} /><span className="unit">h:m:s</span></div></div>
                    {act.hr != null && <div className="field derived"><label>FC media</label><div className="inp"><input className="mono" readOnly value={Math.round(act.hr)} /><span className="unit">ppm</span></div></div>}
                  </div>
                </div>
              )}
              <div className="card-lab" style={{ padding: "0 2px" }}><span className="eyebrow">Rutina · {ROUTINES[s.routine].label}</span><span className="tag">{ROUTINES[s.routine].ex.length} ejercicios</span></div>
              <button type="button" className={"softday" + (l.soft ? " on" : "")} onClick={() => api.setField(id, "soft", !l.soft)}>
                <span className="softday-t">{l.soft ? "Día suave · recuperación" : "¿Día suave / recuperación?"}</span>
                <span className="softday-s">{l.soft ? "Los pesos de hoy no cambian tu plantilla" : "Actívalo para que los pesos de hoy no cambien tu plantilla"}</span>
              </button>
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
                <div className="card-lab">
                  <span className="eyebrow">Tus datos</span>
                  {autoLog && !statsEditing && <span className="tag">{act!.name ?? act!.type}</span>}
                  {!statsEditing ? (
                    <button type="button" className="editbtn" style={{ marginLeft: "auto" }} onClick={startEdit}>Editar</button>
                  ) : (
                    <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                      <button type="button" className="editbtn muted" onClick={cancelEdit}>Cancelar</button>
                      <button type="button" className="editbtn accent" onClick={saveEdit}>Guardar</button>
                    </span>
                  )}
                </div>
                <div className="stats">
                  {fields.map((f) => (
                    <div className={"field" + (statsEditing ? "" : " derived")} key={f.k}>
                      <label>{f.l}</label>
                      <div className="inp">
                        <input className={statsEditing ? undefined : "mono"} readOnly={!statsEditing} inputMode={f.time ? "text" : "decimal"}
                          value={statsEditing ? (draft[f.k] ?? "") : fieldVal(f.k as keyof LogData)} placeholder={f.ph}
                          onChange={statsEditing ? (ev) => setDraft((prev) => ({ ...prev, [f.k]: ev.target.value })) : undefined} />
                        <span className="unit">{f.u}</span>
                      </div>
                    </div>
                  ))}
                  {der && (
                    <div className="field derived"><label>{der.l}</label><div className="inp"><input className="mono" readOnly value={der.v} /><span className="unit">{der.u}</span></div></div>
                  )}
                </div>
              </div>
              {advice.length > 0 && (
                <div className="card">
                  <div className="card-lab"><span className="eyebrow">Consejo</span></div>
                  <ul className="advice">
                    {advice.map((a, i) => (
                      <li key={i} className={"adv " + a.tone}><span className="adv-dot" />{a.text}</li>
                    ))}
                  </ul>
                </div>
              )}
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
                <input type="file" accept="image/*" className="hidden" disabled={uploading}
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
          <div className="lightbox-actions" onClick={(ev) => ev.stopPropagation()}>
            <button className="lightbox-share" disabled={sharing}
              onClick={() => void shareWithStats(lightbox)}>
              {sharing ? "Generando…" : shareErr ?? "Compartir con datos"}
            </button>
            <button className="lightbox-save" disabled={sharing} title="Guardar en este dispositivo"
              onClick={() => void shareWithStats(lightbox, true)}>
              <Icon name="down" size={16} /> Guardar
            </button>
          </div>
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
  const [view, setView] = useState<"week" | "today" | "activity" | "progress" | "food">("week");
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
  // sigue la semana de la sesión abierta (o la que se ve) para emparejar las actividades sincronizadas
  const focusWeek = sheetSession ? mondayOf(new Date(sheetSession.date + "T00:00:00")) : cursor;
  const { activities, match } = useIntervals(focusWeek);

  // vuelca las actividades de la semana en el registro: cada una ocupa su sesión planificada
  // (mismo día y disciplina) o, si no hay, se crea como extra editable. Solo una vez por actividad.
  useEffect(() => {
    if (!activities.length) return;
    const claimed = new Set<string>();
    const entries: ImportEntry[] = [];
    const byTime = [...activities].sort((a, b) => (a.startLocal < b.startLocal ? -1 : 1));
    for (const a of byTime) {
      if (store.imported[a.id]) continue;
      const d = new Date(a.date + "T00:00:00");
      const sessions = [...templSessions(d, mapFor(store, d)), ...extraSessions(d, store)];
      const seat = sessions.find((sn) => sn.disc === a.disc && !claimed.has(sn.id) && !sn.id.includes(":icu-"));
      // el gimnasio se registra por series, pero su duración sí interesa (cuenta en las horas)
      const log: LogData = { ...actToLog(a, a.disc), done: true };
      if (seat) {
        claimed.add(seat.id);
        entries.push({ actId: a.id, id: seat.id, dateK: a.date, log });
      } else {
        const eid = `${a.date}:icu-${a.id}`;
        entries.push({ actId: a.id, id: eid, dateK: a.date, log, extra: { id: eid, disc: a.disc, name: a.name ?? DISC[a.disc].label, intensity: "Suave" } });
      }
    }
    if (entries.length) api.importActivities(entries);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities]);

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
        {view === "week" && <WeekView cursor={cursor} setCursor={setCursor} store={store} todayISO={todayISO} onOpen={setOpenId} onAdd={(dk, k) => setOpenId(api.addExtra(dk, k))} onDel={(id, k) => { if (confirm("¿Eliminar esta sesión y sus datos?")) { void api.delExtra(id, k); flash("Eliminada"); } }} onSwap={(m, a, b) => { api.swapDays(m, a, b); flash("Días cambiados"); }} onResetWeek={(m) => { api.resetWeek(m); flash("Semana restablecida"); }} />}
        {view === "today" && <TodayView store={store} api={api} onOpen={setOpenId} onAdd={(dk, k) => setOpenId(api.addExtra(dk, k))} onDel={(id, k) => { if (confirm("¿Eliminar esta sesión y sus datos?")) { void api.delExtra(id, k); flash("Eliminada"); } }} />}
        {view === "activity" && <ActivityView anchor={new Date(todayISO + "T00:00:00")} todayISO={todayISO} onOpenAct={setOpenAct} />}
        {view === "progress" && <ProgressView cursor={cursor} setCursor={setCursor} store={store} />}
        {view === "food" && <FoodView api={api} />}
      </main>

      <nav className="tabbar"><div className="tabbar-in">
        {([["today", "Hoy", "today"], ["week", "Semana", "cal"], ["activity", "Actividad", "feed"], ["progress", "Progreso", "chart"], ["food", "Comida", "food"]] as const).map(([k, lab, ic]) => (
          <button key={k} className={"tab" + (view === k ? " active" : "")} onClick={() => { setView(k); window.scrollTo(0, 0); }}><Icon name={ic} size={22} /><span>{lab}</span></button>
        ))}
      </div></nav>

      {sheetSession && <SessionSheet id={openId!} s={sheetSession} store={store} api={api} act={match(sheetSession.date, sheetSession.disc)} onClose={() => setOpenId(null)} />}
      {openAct && <IcuSheet a={openAct} onClose={() => setOpenAct(null)} />}
      {toast && <div className="toast show"><Icon name="check" size={15} />{toast}</div>}
    </>
  );
}
