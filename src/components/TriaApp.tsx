"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useStore, type Store } from "@/lib/store";
import { Icon } from "@/lib/icons";
import {
  DISC, INT, ROUTINES, FIELDS, WEEK, byDow, DOW_LONG, MONTHS,
  iso, mondayOf, addDays, fmtDate, derive,
  type Discipline, type Session, type LogData,
} from "@/lib/domain";

/* ---------- pure helpers ---------- */
function templSessions(date: Date): Session[] {
  const def = byDow[date.getDay()];
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
      <span className="sess-ic" style={{ background: DISC[s.disc].color }}><Icon name={s.disc} size={19} /></span>
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
function WeekView({ cursor, setCursor, store, todayISO, onOpen, onAdd, onDel }: {
  cursor: Date; setCursor: (d: Date) => void; store: Store; todayISO: string;
  onOpen: (id: string) => void; onAdd: (d: Discipline, k: string) => void; onDel: (id: string, k: string) => void;
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
  return (
    <>
      <div className="weeknav">
        <button className="navbtn" onClick={() => setCursor(addDays(cursor, -7))} aria-label="Semana anterior"><Icon name="left" size={16} /></button>
        <div><h2>{title}</h2><div className="sub mono">Semana de entreno</div></div>
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
          const d = addDays(start, i), k = iso(d), def = byDow[d.getDay()];
          const isToday = k === todayISO;
          const templ = templSessions(d), extra = extraSessions(d, store);
          return (
            <div key={k} className={"day" + (isToday ? " today" : "")}>
              <div className="day-h"><span className="dow">{def.day}</span><span className="date">{fmtDate(d)}</span>{isToday && <span className="todaypill">Hoy</span>}</div>
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

/* ---------- today view ---------- */
function TodayView({ store, onOpen, onAdd, onDel }: {
  store: Store; onOpen: (id: string) => void; onAdd: (d: Discipline, k: string) => void; onDel: (id: string, k: string) => void;
}) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const k = iso(now);
  const templ = templSessions(now), extra = extraSessions(now, store);
  const all = [...templ, ...extra];
  return (
    <>
      <div className="weeknav"><div><h2 style={{ textTransform: "capitalize" }}>{DOW_LONG[now.getDay()]}</h2><div className="sub mono">{now.getDate()} {MONTHS[now.getMonth()]} {now.getFullYear()}</div></div></div>
      {all.length === 0 && (
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
      </div></div></div>
      <AddExtra dateK={k} onAdd={onAdd} />
    </>
  );
}

/* ---------- progress view ---------- */
function ProgressView({ cursor, setCursor, store, onReset }: { cursor: Date; setCursor: (d: Date) => void; store: Store; onReset: () => void }) {
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
      <div className="section-title">Datos</div>
      <button className="danger" onClick={onReset}>Borrar todos los registros</button>
    </>
  );
}

/* ---------- session sheet ---------- */
function SessionSheet({ id, s, store, api, onClose }: {
  id: string; s: Session; store: Store; api: ReturnType<typeof useStore>; onClose: () => void;
}) {
  const [openEx, setOpenEx] = useState<Set<number>>(new Set());
  const l = store.logs[id] || {};
  const d = new Date(s.date + "T00:00:00");
  const dayLabel = `${DOW_LONG[d.getDay()]} · ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  const slotLabel = s.kind === "extra" ? "Sesión extra" : s.slot === "am" ? "Mañana" : "Tarde";
  const der = s.routine ? null : derive(s.disc, l);
  const fields = FIELDS[s.disc] || FIELDS.run;
  const toggleEx = (i: number) => setOpenEx((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });

  return (
    <div className="overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet">
        <div className="grab" />
        <div className="sheet-scroll">
          <div className="sheet-hero">
            <span className="sess-ic" style={{ background: DISC[s.disc].color }}><Icon name={s.disc} size={25} /></span>
            <div style={{ minWidth: 0 }}>
              <h3>{s.name}</h3>
              <div className="meta">
                <span>{dayLabel} · {slotLabel}</span>
                <span className="itag" style={{ color: INT[s.intensity].c, background: `color-mix(in srgb, ${INT[s.intensity].c} 15%, transparent)` }}>{s.intensity}</span>
              </div>
            </div>
            <button className={"donebig" + (l.done ? " on" : "")} onClick={() => api.toggleDone(id)}>
              <span className="check"><Icon name="check" size={12} /></span>{l.done ? "Hecho" : "Marcar"}
            </button>
          </div>

          {s.routine ? (
            <>
              <div className="card-lab" style={{ padding: "0 2px" }}><span className="eyebrow">Rutina · {ROUTINES[s.routine].label}</span><span className="tag">{ROUTINES[s.routine].ex.length} ejercicios</span></div>
              <div>
                {ROUTINES[s.routine].ex.map((e, ei) => {
                  const sets = l.ex?.[ei] ?? [];
                  const filled = sets.some((x) => x && (x.kg || x.reps));
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
                            return (
                              <div className="setrow" key={si}>
                                <span className="sname">Serie {si + 1}</span>
                                <div className="inp"><input inputMode="decimal" value={cur.kg ?? ""} placeholder="kg" onChange={(ev) => api.setSet(id, ei, si, "kg", ev.target.value)} /><span className="unit">kg</span></div>
                                <div className="inp"><input inputMode="numeric" value={cur.reps ?? ""} placeholder={e.r} onChange={(ev) => api.setSet(id, ei, si, "reps", ev.target.value)} /><span className="unit">reps</span></div>
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
                <div className="card-lab"><span className="eyebrow">Tus datos</span></div>
                <div className="stats">
                  {fields.map((f) => (
                    <div className="field" key={f.k}>
                      <label>{f.l}</label>
                      <div className="inp">
                        <input inputMode={f.time ? "text" : "decimal"} value={(l[f.k as keyof LogData] as string) ?? ""} placeholder={f.ph} onChange={(ev) => api.setField(id, f.k as keyof LogData, ev.target.value === "" ? null : ev.target.value)} />
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
          {s.kind === "extra" && <button className="danger" onClick={() => { api.delExtra(id, s.date); onClose(); }}>Eliminar esta sesión extra</button>}
        </div>
      </div>
    </div>
  );
}

/* ---------- root ---------- */
const SYNC_LABEL: Record<string, string> = { loading: "Cargando", saving: "Guardando…", synced: "Sincronizado", offline: "Sin conexión" };

export default function TriaApp({ userId, email }: { userId: string; email: string }) {
  const api = useStore(userId);
  const { store } = api;
  const router = useRouter();
  const [view, setView] = useState<"week" | "today" | "progress">("week");
  const [cursor, setCursor] = useState<Date>(() => mondayOf(new Date()));
  const [openId, setOpenId] = useState<string | null>(null);
  const [todayISO] = useState<string>(() => iso(new Date()));
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const cur = document.documentElement.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light");
    setTheme(cur as "light" | "dark");
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
  function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { const data = JSON.parse(String(r.result)); if (data && data.logs) { void api.importData(data); flash("Datos importados"); } else alert("Archivo no válido."); } catch { alert("No se pudo leer el archivo."); } };
    r.readAsText(f); e.target.value = "";
  }
  async function logout() { const supabase = createClient(); await supabase.auth.signOut(); router.push("/login"); router.refresh(); }

  const sheetSession = openId ? findSession(openId, store) : null;

  return (
    <>
      <div className="spectrum" />
      <header className="appbar">
        <div className="appbar-in">
          <div className="brand"><b>Tría</b><span>{email || "Camino al Ironman"}</span></div>
          <div className={"syncbadge " + api.sync}><span className="dot" />{SYNC_LABEL[api.sync]}</div>
          <button className="iconbtn" onClick={toggleTheme} title="Cambiar tema" aria-label="Cambiar tema"><Icon name={theme === "dark" ? "sun" : "moon"} /></button>
          <button className="iconbtn" onClick={exportData} title="Exportar datos" aria-label="Exportar datos"><Icon name="down" /></button>
          <button className="iconbtn" onClick={() => fileRef.current?.click()} title="Importar datos" aria-label="Importar datos"><Icon name="up" /></button>
          <button className="iconbtn" onClick={logout} title="Cerrar sesión" aria-label="Cerrar sesión"><Icon name="logout" /></button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onImport} />
        </div>
      </header>

      <main className="wrap">
        {view === "week" && <WeekView cursor={cursor} setCursor={setCursor} store={store} todayISO={todayISO} onOpen={setOpenId} onAdd={(dk, k) => setOpenId(api.addExtra(dk, k))} onDel={(id, k) => { if (confirm("¿Eliminar esta sesión y sus datos?")) { void api.delExtra(id, k); flash("Eliminada"); } }} />}
        {view === "today" && <TodayView store={store} onOpen={setOpenId} onAdd={(dk, k) => setOpenId(api.addExtra(dk, k))} onDel={(id, k) => { if (confirm("¿Eliminar esta sesión y sus datos?")) { void api.delExtra(id, k); flash("Eliminada"); } }} />}
        {view === "progress" && <ProgressView cursor={cursor} setCursor={setCursor} store={store} onReset={() => { if (confirm("Esto borra TODOS tus registros y sesiones extra. ¿Seguro?")) { void api.resetAll(); flash("Todo borrado"); } }} />}
      </main>

      <nav className="tabbar"><div className="tabbar-in">
        {([["week", "Semana", "cal"], ["today", "Hoy", "today"], ["progress", "Progreso", "chart"]] as const).map(([k, lab, ic]) => (
          <button key={k} className={"tab" + (view === k ? " active" : "")} onClick={() => { setView(k); window.scrollTo(0, 0); }}><Icon name={ic} size={22} /><span>{lab}</span></button>
        ))}
      </div></nav>

      {sheetSession && <SessionSheet id={openId!} s={sheetSession} store={store} api={api} onClose={() => setOpenId(null)} />}
      {toast && <div className="toast show"><Icon name="check" size={15} />{toast}</div>}
    </>
  );
}
