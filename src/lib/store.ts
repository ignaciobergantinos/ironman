"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Discipline, Intensity, LogData, Food, FoodDay, MealLog } from "@/lib/domain";
import { DISC, hasData } from "@/lib/domain";
import { LOCAL_MOCK } from "@/lib/local-mock";

export type ExtraDef = { id: string; disc: Discipline; name: string; intensity: Intensity };
export type SetVal = { kg?: string | null; reps?: string | null };
// gymDefaults[routineKey][exerciseIndex] = valores de la 1ª serie, plantilla para futuras sesiones
// imported: ids de actividades ya volcadas en el registro (para no reimportar ni resucitar borradas)
// foodLog: desviaciones de la dieta por día; customFoods: alimentos añadidos por el usuario al catálogo
export type Store = { logs: Record<string, LogData>; extras: Record<string, ExtraDef[]>; gymDefaults: Record<string, Record<number, SetVal>>; imported: Record<string, true>; foodLog: Record<string, FoodDay>; customFoods: Food[] };
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
const empty = (): Store => ({ logs: {}, extras: {}, gymDefaults: {}, imported: {}, foodLog: {}, customFoods: [] });

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
    if (r) return { ...empty(), ...JSON.parse(r) };
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
      s.foodLog[row.entry_key.slice(5)] = (row.data as FoodDay) || {};
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
      // editar la 1ª serie fija la plantilla para el resto de series y futuras sesiones
      if (setIdx === 0 && routine) {
        const gd = { ...s.gymDefaults };
        gd[routine] = { ...(gd[routine] || {}), [exIdx]: { ...(gd[routine]?.[exIdx] || {}), [k]: val } };
        s.gymDefaults = gd;
      }
      commit(s);
      markDirty(id);
      if (setIdx === 0 && routine) markDirty(GYM_DEF_KEY);
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

  // actualiza el registro de una comida de un día concreto y lo marca para sincronizar
  const updateMealLog = useCallback(
    (date: string, mealId: string, fn: (m: MealLog) => MealLog) => {
      const s = { ...storeRef.current, foodLog: { ...storeRef.current.foodLog } };
      const day: FoodDay = { ...(s.foodLog[date] || {}) };
      const next = fn({ ...(day[mealId] || {}) });
      if ((next.skip?.length || 0) === 0 && (next.add?.length || 0) === 0) delete day[mealId];
      else day[mealId] = next;
      s.foodLog[date] = day;
      commit(s);
      markDirty(foodDayKey(date));
    },
    [commit, markDirty],
  );

  // marca/desmarca un alimento planificado como comido (por defecto se asume comido)
  const toggleFoodPlanned = useCallback(
    (date: string, mealId: string, foodId: string) => {
      updateMealLog(date, mealId, (m) => {
        const skip = new Set(m.skip || []);
        skip.has(foodId) ? skip.delete(foodId) : skip.add(foodId);
        return { ...m, skip: [...skip] };
      });
    },
    [updateMealLog],
  );

  // añade / quita un alimento extra (fuera del plan) a una comida
  const addFoodExtra = useCallback(
    (date: string, mealId: string, foodId: string) => updateMealLog(date, mealId, (m) => ({ ...m, add: [...(m.add || []), foodId] })),
    [updateMealLog],
  );
  const removeFoodExtra = useCallback(
    (date: string, mealId: string, idx: number) => updateMealLog(date, mealId, (m) => ({ ...m, add: (m.add || []).filter((_, i) => i !== idx) })),
    [updateMealLog],
  );

  // añade un alimento nuevo al catálogo del usuario; devuelve su id
  const addCustomFood = useCallback(
    (name: string, kcal: number) => {
      const id = "c" + Date.now().toString(36);
      const s = { ...storeRef.current, customFoods: [...storeRef.current.customFoods, { id, name, kcal }] };
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
        // no pisar datos ya introducidos por el usuario; el seed es solo un punto de partida
        if (!hasData(s.logs[e.id])) {
          s.logs[e.id] = { ...(s.logs[e.id] || {}), ...e.log };
          dirtyKeys.push(e.id);
        }
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
      const s: Store = { logs: obj.logs || {}, extras: obj.extras || {}, gymDefaults: obj.gymDefaults || {}, imported: obj.imported || {}, foodLog: obj.foodLog || {}, customFoods: obj.customFoods || [] };
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

  return { store, sync, getLog, setField, setSet, toggleDone, toggleFoodPlanned, addFoodExtra, removeFoodExtra, addCustomFood, addExtra, delExtra, importActivities, importData, resetAll, addPhoto, removePhoto, getPhotoUrls };
}
export type UseStore = ReturnType<typeof useStore>;
