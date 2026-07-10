"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Discipline, Intensity, LogData } from "@/lib/domain";
import { DISC } from "@/lib/domain";

export type ExtraDef = { id: string; disc: Discipline; name: string; intensity: Intensity };
export type Store = { logs: Record<string, LogData>; extras: Record<string, ExtraDef[]> };
export type SyncState = "loading" | "synced" | "saving" | "offline";

const LS = "tria.store.v1";
const LS_DIRTY = "tria.dirty.v1";
const empty = (): Store => ({ logs: {}, extras: {} });

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
    } else {
      s.logs[row.entry_key] = row.data as LogData;
    }
  }
  // re-apply locally-dirty entries from the cache so offline edits survive
  for (const key of dirty) {
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
    (id: string, exIdx: number, setIdx: number, k: "kg" | "reps", value: string) => {
      const s = { ...storeRef.current, logs: { ...storeRef.current.logs } };
      const log: LogData = { ...(s.logs[id] || {}) };
      const ex = { ...(log.ex || {}) };
      const arr = [...(ex[exIdx] || [])];
      arr[setIdx] = { ...(arr[setIdx] || {}), [k]: value === "" ? null : value };
      ex[exIdx] = arr;
      log.ex = ex;
      s.logs[id] = log;
      commit(s);
      markDirty(id);
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
      const s: Store = { logs: obj.logs || {}, extras: obj.extras || {} };
      commit(s);
      const rows: Array<Record<string, unknown>> = [];
      for (const key of Object.keys(s.logs)) {
        let isEx = false;
        for (const date of Object.keys(s.extras)) if (s.extras[date]?.some((e) => e.id === key)) isEx = true;
        if (!isEx) rows.push({ user_id: userId, entry_key: key, kind: "log", data: s.logs[key], updated_at: new Date().toISOString() });
      }
      for (const date of Object.keys(s.extras)) {
        for (const e of s.extras[date]) rows.push({ user_id: userId, entry_key: e.id, kind: "extra", data: { date, disc: e.disc, name: e.name, intensity: e.intensity, log: s.logs[e.id] || {} }, updated_at: new Date().toISOString() });
      }
      if (rows.length) await supabase.from("training_entries").upsert(rows, { onConflict: "user_id,entry_key" });
    },
    [commit, supabase, userId],
  );

  const resetAll = useCallback(async () => {
    commit(empty());
    dirty.current.clear();
    saveDirty(dirty.current);
    await supabase.from("training_entries").delete().eq("user_id", userId);
  }, [commit, supabase, userId]);

  return { store, sync, getLog, setField, setSet, toggleDone, addExtra, delExtra, importData, resetAll };
}
export type UseStore = ReturnType<typeof useStore>;
