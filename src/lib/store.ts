"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Discipline, Intensity, LogData, Food, FoodDay, MealLog, AddItem, WeekMap, AgendaDay, AgendaNote } from "@/lib/domain";
import { DISC, hasData, isIdentityMap } from "@/lib/domain";
import { LOCAL_MOCK } from "@/lib/local-mock";

export type ExtraDef = { id: string; disc: Discipline; name: string; intensity: Intensity };
export type SetVal = { kg?: string | null; reps?: string | null };
// gymDefaults[routineKey][exerciseIndex] = valores de la 1ª serie, plantilla para futuras sesiones
// imported: ids de actividades ya volcadas en el registro (para no reimportar ni resucitar borradas)
// foodLog: desviaciones de la dieta por día; customFoods: alimentos añadidos por el usuario al catálogo
// weekmap: reordenación de días por semana (clave = lunes ISO, valor = permutación de dow → dow origen)
// agenda: planificación hora a hora por día (clave = fecha ISO)
export type Store = { logs: Record<string, LogData>; extras: Record<string, ExtraDef[]>; gymDefaults: Record<string, Record<number, SetVal>>; imported: Record<string, true>; foodLog: Record<string, FoodDay>; customFoods: Food[]; weekmap: Record<string, WeekMap>; agenda: Record<string, AgendaDay> };
export type SyncState = "loading" | "synced" | "saving" | "offline";

// una actividad a volcar en el registro: sesión planificada (sin extra) o extra autogenerado
export type ImportEntry = { actId: string; id: string; dateK: string; log: LogData; extra?: ExtraDef };

const LS = "tria.store.v1";
const LS_DIRTY = "tria.dirty.v1";
const PHOTO_BUCKET = "training-photos";
const GYM_DEF_KEY = "gym:defaults";
const IMPORTED_KEY = "activities:imported";
const FOOD_CAT_KEY = "food:catalog";
const foodDayKey = (date: string) => `food:${date}`;
const weekMapKey = (mon: string) => `week:${mon}`;
const agendaKey = (date: string) => `day:${date}`;
const empty = (): Store => ({ logs: {}, extras: {}, gymDefaults: {}, imported: {}, foodLog: {}, customFoods: [], weekmap: {}, agenda: {} });

// normaliza extras guardados como string[] (formato viejo) al nuevo {id, amt?}
function normFoodDay(day: unknown): FoodDay {
  const out: FoodDay = {};
  for (const [mid, m] of Object.entries((day as FoodDay) || {})) {
    const raw = (m?.add || []) as unknown as (string | AddItem)[];
    out[mid] = { ...m, add: raw.map((a) => (typeof a === "string" ? { id: a } : a)) };
  }
  return out;
}
function normFoodLog(fl: unknown): Record<string, FoodDay> {
  const out: Record<string, FoodDay> = {};
  for (const [date, day] of Object.entries((fl as Record<string, unknown>) || {})) out[date] = normFoodDay(day);
  return out;
}

// Shrink a camera photo before upload: max 1280px, JPEG q0.7 → typically 100–250 KB.
async function downscale(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const max = 1280;
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/jpeg", 0.7));
}

function loadLocal(): Store {
  try {
    const r = localStorage.getItem(LS);
    if (r) { const s = { ...empty(), ...JSON.parse(r) }; s.foodLog = normFoodLog(s.foodLog); return s; }
  } catch {}
  return empty();
}
function saveLocal(s: Store) {
  try {
    localStorage.setItem(LS, JSON.stringify(s));
  } catch {}
}
function loadDirty(): Set<string> {
  try {
    const r = localStorage.getItem(LS_DIRTY);
    if (r) return new Set(JSON.parse(r));
  } catch {}
  return new Set();
}
function saveDirty(d: Set<string>) {
  try {
    localStorage.setItem(LS_DIRTY, JSON.stringify([...d]));
  } catch {}
}

type Row = { entry_key: string; kind: string; data: Record<string, unknown> };

// server rows -> local store (skip keys still dirty locally: our unpushed edits win)
function rowsToStore(rows: Row[], keepLocal: Store, dirty: Set<string>): Store {
  const s = empty();
  for (const row of rows) {
    if (dirty.has(row.entry_key)) continue;
    if (row.kind === "extra") {
      const d = row.data as { date: string; disc: Discipline; name: string; intensity: Intensity; log?: LogData };
      (s.extras[d.date] ||= []).push({ id: row.entry_key, disc: d.disc, name: d.name, intensity: d.intensity });
      if (d.log) s.logs[row.entry_key] = d.log;
    } else if (row.kind === "gymdef") {
      s.gymDefaults = (row.data as Store["gymDefaults"]) || {};
    } else if (row.kind === "imported") {
      s.imported = (row.data as Store["imported"]) || {};
    } else if (row.kind === "foodcat") {
      s.customFoods = (row.data as { foods: Food[] }).foods || [];
    } else if (row.kind === "foodday") {
      s.foodLog[row.entry_key.slice(5)] = normFoodDay(row.data);
    } else if (row.kind === "weekmap") {
      const map = (row.data as { map?: WeekMap }).map;
      if (!isIdentityMap(map)) s.weekmap[row.entry_key.slice(5)] = map!;
    } else if (row.kind === "agenda") {
      s.agenda[row.entry_key.slice(4)] = (row.data as AgendaDay) || {};
    } else {
      s.logs[row.entry_key] = row.data as LogData;
    }
  }
  // re-apply locally-dirty entries from the cache so offline edits survive
  for (const key of dirty) {
    if (key === GYM_DEF_KEY) { s.gymDefaults = keepLocal.gymDefaults; continue; }
    if (key === IMPORTED_KEY) { s.imported = keepLocal.imported; continue; }
    if (key === FOOD_CAT_KEY) { s.customFoods = keepLocal.customFoods; continue; }
    if (key.startsWith("food:")) { const date = key.slice(5); if (keepLocal.foodLog[date]) s.foodLog[date] = keepLocal.foodLog[date]; continue; }
    if (key.startsWith("week:")) { const mon = key.slice(5); if (keepLocal.weekmap[mon]) s.weekmap[mon] = keepLocal.weekmap[mon]; continue; }
    if (key.startsWith("day:")) { const date = key.slice(4); if (keepLocal.agenda[date]) s.agenda[date] = keepLocal.agenda[date]; continue; }
    if (keepLocal.logs[key]) s.logs[key] = keepLocal.logs[key];
    for (const date of Object.keys(keepLocal.extras)) {
      const ex = keepLocal.extras[date]?.find((e) => e.id === key);
      if (ex && !(s.extras[date] || []).some((e) => e.id === key)) (s.extras[date] ||= []).push(ex);
    }
  }
  return s;
}

export function useStore(userId: string) {
  const [store, setStore] = useState<Store>(empty);
  const [sync, setSync] = useState<SyncState>("loading");
  const supabase = useRef(createClient()).current;
  const dirty = useRef<Set<string>>(new Set());
  const storeRef = useRef<Store>(store);
  storeRef.current = store;

  const commit = useCallback((s: Store) => {
    setStore(s);
    saveLocal(s);
  }, []);

  const isExtra = useCallback((key: string) => {
    for (const date of Object.keys(storeRef.current.extras)) {
      const e = storeRef.current.extras[date]?.find((x) => x.id === key);
      if (e) return { date, def: e };
    }
    return null;
  }, []);

  const buildRow = useCallback(
    (key: string): Row => {
      if (key === GYM_DEF_KEY) {
        return { entry_key: key, kind: "gymdef", data: storeRef.current.gymDefaults };
      }
      if (key === IMPORTED_KEY) {
        return { entry_key: key, kind: "imported", data: storeRef.current.imported };
      }
      if (key === FOOD_CAT_KEY) {
        return { entry_key: key, kind: "foodcat", data: { foods: storeRef.current.customFoods } };
      }
      if (key.startsWith("food:")) {
        return { entry_key: key, kind: "foodday", data: storeRef.current.foodLog[key.slice(5)] || {} };
      }
      if (key.startsWith("week:")) {
        return { entry_key: key, kind: "weekmap", data: { map: storeRef.current.weekmap[key.slice(5)] || [] } };
      }
      if (key.startsWith("day:")) {
        return { entry_key: key, kind: "agenda", data: storeRef.current.agenda[key.slice(4)] || {} };
      }
      const ex = isExtra(key);
      if (ex) {
        return { entry_key: key, kind: "extra", data: { date: ex.date, disc: ex.def.disc, name: ex.def.name, intensity: ex.def.intensity, log: storeRef.current.logs[key] || {} } };
      }
      return { entry_key: key, kind: "log", data: storeRef.current.logs[key] || {} };
    },
    [isExtra],
  );

  const flush = useCallback(async () => {
    if (dirty.current.size === 0) return;
    if (LOCAL_MOCK) { dirty.current.clear(); saveDirty(dirty.current); setSync("synced"); return; } // solo localStorage
    setSync("saving");
    const keys = [...dirty.current];
    const rows = keys.map((k) => ({ user_id: userId, updated_at: new Date().toISOString(), ...buildRow(k) }));
    const { error } = await supabase.from("training_entries").upsert(rows, { onConflict: "user_id,entry_key" });
    if (error) {
      setSync("offline");
      return;
    }
    keys.forEach((k) => dirty.current.delete(k));
    saveDirty(dirty.current);
    setSync("synced");
  }, [supabase, userId, buildRow]);

  const flushT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markDirty = useCallback(
    (key: string) => {
      dirty.current.add(key);
      saveDirty(dirty.current);
      setSync("saving");
      if (flushT.current) clearTimeout(flushT.current);
      flushT.current = setTimeout(() => void flush(), 500);
    },
    [flush],
  );

  const pullAll = useCallback(async () => {
    const { data, error } = await supabase.from("training_entries").select("entry_key,kind,data").eq("user_id", userId);
    if (error) {
      setSync("offline");
      return;
    }
    const merged = rowsToStore((data as Row[]) || [], storeRef.current, dirty.current);
    commit(merged);
    setSync(dirty.current.size ? "saving" : "synced");
    void flush();
  }, [supabase, userId, commit, flush]);

  // boot: hydrate cache, then pull server, subscribe to realtime + online events
  useEffect(() => {
    dirty.current = loadDirty();
    commit(loadLocal());
    if (LOCAL_MOCK) { setSync("synced"); return; } // local: sin pull/realtime, solo localStorage
    void pullAll();

    const channel = supabase
      .channel("training-" + userId)
      .on("postgres_changes", { event: "*", schema: "public", table: "training_entries", filter: `user_id=eq.${userId}` }, () => {
        void pullAll();
      })
      .subscribe();

    const onOnline = () => void flush();
    window.addEventListener("online", onOnline);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("online", onOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  /* ---- mutations ---- */
  const getLog = useCallback((id: string): LogData => storeRef.current.logs[id] || {}, []);

  const setField = useCallback(
    (id: string, field: keyof LogData, value: unknown) => {
      const s = { ...storeRef.current, logs: { ...storeRef.current.logs } };
      s.logs[id] = { ...(s.logs[id] || {}), [field]: value };
      commit(s);
      markDirty(id);
    },
    [commit, markDirty],
  );

  const setSet = useCallback(
    (id: string, routine: string | undefined, exIdx: number, setIdx: number, k: "kg" | "reps", value: string) => {
      const val = value === "" ? null : value;
      const s = { ...storeRef.current, logs: { ...storeRef.current.logs } };
      const log: LogData = { ...(s.logs[id] || {}) };
      const ex = { ...(log.ex || {}) };
      const arr = [...(ex[exIdx] || [])];
      arr[setIdx] = { ...(arr[setIdx] || {}), [k]: val };
      ex[exIdx] = arr;
      log.ex = ex;
      s.logs[id] = log;
      // editar la 1ª serie fija la plantilla para el resto de series y futuras sesiones,
      // salvo en un día suave/recuperación (log.soft): ahí no tocamos los pesos de plantilla
      const setsDefault = setIdx === 0 && routine && !log.soft;
      if (setsDefault) {
        const gd = { ...s.gymDefaults };
        gd[routine] = { ...(gd[routine] || {}), [exIdx]: { ...(gd[routine]?.[exIdx] || {}), [k]: val } };
        s.gymDefaults = gd;
      }
      commit(s);
      markDirty(id);
      if (setsDefault) markDirty(GYM_DEF_KEY);
    },
    [commit, markDirty],
  );

  const toggleDone = useCallback(
    (id: string) => {
      const s = { ...storeRef.current, logs: { ...storeRef.current.logs } };
      s.logs[id] = { ...(s.logs[id] || {}), done: !s.logs[id]?.done };
      commit(s);
      markDirty(id);
      return s.logs[id].done;
    },
    [commit, markDirty],
  );

  // intercambia el plan de dos días (dow, 0=dom..6=sáb) en la semana del lunes `mon` (ISO).
  // Componer varios swaps permite cualquier orden. Si vuelve a la identidad, se elimina el override.
  const swapDays = useCallback(
    (mon: string, a: number, b: number) => {
      if (a === b) return;
      const cur = storeRef.current.weekmap[mon] || [0, 1, 2, 3, 4, 5, 6];
      const next = [...cur];
      [next[a], next[b]] = [next[b], next[a]];
      const s = { ...storeRef.current, weekmap: { ...storeRef.current.weekmap } };
      if (isIdentityMap(next)) delete s.weekmap[mon];
      else s.weekmap[mon] = next;
      commit(s);
      markDirty(weekMapKey(mon));
    },
    [commit, markDirty],
  );

  // restablece una semana a la plantilla original (elimina cualquier reordenación).
  const resetWeek = useCallback(
    (mon: string) => {
      if (!storeRef.current.weekmap[mon]) return;
      const s = { ...storeRef.current, weekmap: { ...storeRef.current.weekmap } };
      delete s.weekmap[mon];
      commit(s);
      markDirty(weekMapKey(mon));
    },
    [commit, markDirty],
  );

  // agenda del día: hora de cada sesión + notas libres. Solo se guarda lo relleno.
  const updateAgenda = useCallback(
    (date: string, fn: (a: AgendaDay) => AgendaDay) => {
      const s = { ...storeRef.current, agenda: { ...storeRef.current.agenda } };
      const next = fn({ ...(s.agenda[date] || {}) });
      const empty = Object.keys(next.times || {}).length === 0 && (next.notes || []).length === 0;
      if (empty) delete s.agenda[date];
      else s.agenda[date] = next;
      commit(s);
      markDirty(agendaKey(date));
    },
    [commit, markDirty],
  );

  // fija (o borra, con "") la hora de una sesión planificada o extra
  const setSessionTime = useCallback(
    (date: string, id: string, at: string) => {
      updateAgenda(date, (a) => {
        const times = { ...(a.times || {}) };
        if (at) times[id] = at;
        else delete times[id];
        return { ...a, times };
      });
    },
    [updateAgenda],
  );

  const addNote = useCallback(
    (date: string, at = "") => {
      const id = "n" + Date.now().toString(36);
      updateAgenda(date, (a) => ({ ...a, notes: [...(a.notes || []), { id, at, text: "" }] }));
      return id;
    },
    [updateAgenda],
  );
  const setNote = useCallback(
    (date: string, id: string, patch: Partial<AgendaNote>) =>
      updateAgenda(date, (a) => ({ ...a, notes: (a.notes || []).map((n) => (n.id === id ? { ...n, ...patch } : n)) })),
    [updateAgenda],
  );
  const delNote = useCallback(
    (date: string, id: string) => updateAgenda(date, (a) => ({ ...a, notes: (a.notes || []).filter((n) => n.id !== id) })),
    [updateAgenda],
  );

  // actualiza el registro de una comida de un día concreto y lo marca para sincronizar
  const updateMealLog = useCallback(
    (date: string, mealId: string, fn: (m: MealLog) => MealLog) => {
      const s = { ...storeRef.current, foodLog: { ...storeRef.current.foodLog } };
      const day: FoodDay = { ...(s.foodLog[date] || {}) };
      const next = fn({ ...(day[mealId] || {}) });
      if ((next.eaten?.length || 0) === 0 && (next.add?.length || 0) === 0 && Object.keys(next.qty || {}).length === 0) delete day[mealId];
      else day[mealId] = next;
      s.foodLog[date] = day;
      commit(s);
      markDirty(foodDayKey(date));
    },
    [commit, markDirty],
  );

  // marca/desmarca un alimento planificado como comido (por defecto nada está comido)
  const toggleFoodPlanned = useCallback(
    (date: string, mealId: string, foodId: string) => {
      updateMealLog(date, mealId, (m) => {
        const eaten = new Set(m.eaten || []);
        eaten.has(foodId) ? eaten.delete(foodId) : eaten.add(foodId);
        return { ...m, eaten: [...eaten] };
      });
    },
    [updateMealLog],
  );

  // fija la cantidad de un alimento contable (huevos, claras, galletas…) en 1..99
  const setFoodQty = useCallback(
    (date: string, mealId: string, foodId: string, qty: number) => {
      const q = Math.max(1, Math.min(2000, Math.round(qty)));
      updateMealLog(date, mealId, (m) => ({ ...m, qty: { ...(m.qty || {}), [foodId]: q } }));
    },
    [updateMealLog],
  );

  // añade / quita / ajusta un alimento extra (fuera del plan) con su cantidad (unidades o gramos)
  const addFoodExtra = useCallback(
    (date: string, mealId: string, foodId: string, amt?: number) =>
      updateMealLog(date, mealId, (m) => ({ ...m, add: [...(m.add || []), amt != null ? { id: foodId, amt } : { id: foodId }] })),
    [updateMealLog],
  );
  const removeFoodExtra = useCallback(
    (date: string, mealId: string, idx: number) => updateMealLog(date, mealId, (m) => ({ ...m, add: (m.add || []).filter((_, i) => i !== idx) })),
    [updateMealLog],
  );
  const setExtraQty = useCallback(
    (date: string, mealId: string, idx: number, amt: number) => {
      const a = Math.max(1, Math.min(2000, Math.round(amt)));
      updateMealLog(date, mealId, (m) => ({ ...m, add: (m.add || []).map((x, i) => (i === idx ? { ...x, amt: a } : x)) }));
    },
    [updateMealLog],
  );

  // añade un alimento nuevo al catálogo del usuario; devuelve su id
  const addCustomFood = useCallback(
    (name: string, kcal: number) => {
      const id = "c" + Date.now().toString(36);
      const s = { ...storeRef.current, customFoods: [...storeRef.current.customFoods, { id, name, kcal, p: 0, c: 0, fat: 0 }] };
      commit(s);
      markDirty(FOOD_CAT_KEY);
      return id;
    },
    [commit, markDirty],
  );

  // vuelca actividades sincronizadas en el registro: seed editable de sesiones planificadas
  // y creación de extras para lo que no estaba en el plan. Cada actividad se procesa una sola vez.
  const importActivities = useCallback(
    (entries: ImportEntry[]) => {
      const s: Store = {
        ...storeRef.current,
        logs: { ...storeRef.current.logs },
        extras: { ...storeRef.current.extras },
        imported: { ...storeRef.current.imported },
      };
      const dirtyKeys: string[] = [];
      let changed = false;
      for (const e of entries) {
        if (s.imported[e.actId]) continue;
        s.imported[e.actId] = true;
        changed = true;
        if (e.extra && !(s.extras[e.dateK] || []).some((x) => x.id === e.id)) {
          s.extras[e.dateK] = [...(s.extras[e.dateK] || []), e.extra];
        }
        // La actividad rellena huecos: nunca pisa lo que escribiste, pero completa lo que falte
        // (sobre todo la duración) y SIEMPRE marca la sesión como hecha. Antes, si ya habías
        // registrado algo a mano (típico del gimnasio, que va por series), se saltaba el merge
        // entero y la sesión se quedaba sin marcar aunque el reloj la hubiera registrado.
        const cur: LogData = s.logs[e.id] || {};
        const merged = { ...cur } as Record<string, unknown>;
        for (const [key, val] of Object.entries(e.log)) {
          if (key === "done" || val == null || val === "") continue;
          if (merged[key] == null || merged[key] === "") merged[key] = val;
        }
        if (e.log.done != null) merged.done = e.log.done;
        s.logs[e.id] = merged as LogData;
        dirtyKeys.push(e.id);
      }
      if (!changed) return;
      commit(s);
      dirtyKeys.forEach((k) => markDirty(k));
      markDirty(IMPORTED_KEY);
    },
    [commit, markDirty],
  );

  const addExtra = useCallback(
    (disc: Discipline, dateK: string) => {
      const id = `${dateK}:x${Date.now()}`;
      const def: ExtraDef = { id, disc, name: DISC[disc].label + " · extra", intensity: "Suave" };
      const s = { ...storeRef.current, extras: { ...storeRef.current.extras } };
      s.extras[dateK] = [...(s.extras[dateK] || []), def];
      commit(s);
      markDirty(id);
      return id;
    },
    [commit, markDirty],
  );

  const delExtra = useCallback(
    async (id: string, dateK: string) => {
      const s = { ...storeRef.current, extras: { ...storeRef.current.extras }, logs: { ...storeRef.current.logs } };
      s.extras[dateK] = (s.extras[dateK] || []).filter((e) => e.id !== id);
      delete s.logs[id];
      commit(s);
      dirty.current.delete(id);
      saveDirty(dirty.current);
      await supabase.from("training_entries").delete().eq("user_id", userId).eq("entry_key", id);
    },
    [commit, supabase, userId],
  );

  const importData = useCallback(
    async (obj: Store) => {
      const s: Store = { logs: obj.logs || {}, extras: obj.extras || {}, gymDefaults: obj.gymDefaults || {}, imported: obj.imported || {}, foodLog: obj.foodLog || {}, customFoods: obj.customFoods || [], weekmap: obj.weekmap || {}, agenda: obj.agenda || {} };
      commit(s);
      const rows: Array<Record<string, unknown>> = [];
      if (Object.keys(s.gymDefaults).length) rows.push({ user_id: userId, entry_key: GYM_DEF_KEY, kind: "gymdef", data: s.gymDefaults, updated_at: new Date().toISOString() });
      for (const key of Object.keys(s.logs)) {
        let isEx = false;
        for (const date of Object.keys(s.extras)) if (s.extras[date]?.some((e) => e.id === key)) isEx = true;
        if (!isEx) rows.push({ user_id: userId, entry_key: key, kind: "log", data: s.logs[key], updated_at: new Date().toISOString() });
      }
      for (const date of Object.keys(s.extras)) {
        for (const e of s.extras[date]) rows.push({ user_id: userId, entry_key: e.id, kind: "extra", data: { date, disc: e.disc, name: e.name, intensity: e.intensity, log: s.logs[e.id] || {} }, updated_at: new Date().toISOString() });
      }
      if (s.customFoods.length) rows.push({ user_id: userId, entry_key: FOOD_CAT_KEY, kind: "foodcat", data: { foods: s.customFoods }, updated_at: new Date().toISOString() });
      for (const date of Object.keys(s.foodLog)) rows.push({ user_id: userId, entry_key: foodDayKey(date), kind: "foodday", data: s.foodLog[date], updated_at: new Date().toISOString() });
      for (const mon of Object.keys(s.weekmap)) rows.push({ user_id: userId, entry_key: weekMapKey(mon), kind: "weekmap", data: { map: s.weekmap[mon] }, updated_at: new Date().toISOString() });
      for (const date of Object.keys(s.agenda)) rows.push({ user_id: userId, entry_key: agendaKey(date), kind: "agenda", data: s.agenda[date], updated_at: new Date().toISOString() });
      if (rows.length) await supabase.from("training_entries").upsert(rows, { onConflict: "user_id,entry_key" });
    },
    [commit, supabase, userId],
  );

  const addPhoto = useCallback(
    async (id: string, file: File) => {
      let blob: Blob = file;
      try { blob = await downscale(file); } catch {}
      const folder = id.replace(/[^a-zA-Z0-9-]/g, "_");
      const path = `${userId}/${folder}/${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;
      const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: false });
      if (error) { setSync("offline"); return; }
      const s = { ...storeRef.current, logs: { ...storeRef.current.logs } };
      const log: LogData = { ...(s.logs[id] || {}) };
      log.photos = [...(log.photos || []), path];
      s.logs[id] = log;
      commit(s);
      markDirty(id);
    },
    [supabase, userId, commit, markDirty],
  );

  const removePhoto = useCallback(
    async (id: string, path: string) => {
      const s = { ...storeRef.current, logs: { ...storeRef.current.logs } };
      const log: LogData = { ...(s.logs[id] || {}) };
      log.photos = (log.photos || []).filter((p) => p !== path);
      s.logs[id] = log;
      commit(s);
      markDirty(id);
      await supabase.storage.from(PHOTO_BUCKET).remove([path]);
    },
    [supabase, commit, markDirty],
  );

  const getPhotoUrls = useCallback(
    async (paths: string[]): Promise<Record<string, string>> => {
      if (!paths.length) return {};
      const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 3600);
      const map: Record<string, string> = {};
      (data || []).forEach((d) => { if (d.signedUrl && d.path) map[d.path] = d.signedUrl; });
      return map;
    },
    [supabase],
  );

  const resetAll = useCallback(async () => {
    commit(empty());
    dirty.current.clear();
    saveDirty(dirty.current);
    await supabase.from("training_entries").delete().eq("user_id", userId);
  }, [commit, supabase, userId]);

  return { store, sync, getLog, setField, setSet, toggleDone, swapDays, resetWeek, setSessionTime, addNote, setNote, delNote, toggleFoodPlanned, setFoodQty, addFoodExtra, removeFoodExtra, setExtraQty, addCustomFood, addExtra, delExtra, importActivities, importData, resetAll, addPhoto, removePhoto, getPhotoUrls };
}
export type UseStore = ReturnType<typeof useStore>;
