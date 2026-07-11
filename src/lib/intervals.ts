"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Discipline, LogData } from "@/lib/domain";
import { iso, addDays, derive, fmtPace } from "@/lib/domain";

export type IcuActivity = {
  id: string;
  date: string;
  startLocal: string;
  disc: Discipline;
  type: string;
  name: string | null;
  distM: number | null;
  movingS: number | null;
  elapsedS: number | null;
  hr: number | null;
  hrMax: number | null;
  power: number | null;
  powerNp: number | null;
  powerMax: number | null;
  cad: number | null;
  cadMax: number | null;
  speedAvg: number | null;
  speedMax: number | null;
  elevGain: number | null;
  calories: number | null;
  load: number | null;
  intensity: number | null;
  hrZones: number[] | null;
  hrZoneTimes: number[] | null;
  feel: number | null;
  rpe: number | null;
  device: string | null;
  source: string | null;
  trainer: boolean | null;
};

const POLL_MS = 10 * 60 * 1000; // refresca cada 10 min mientras la app está abierta

// Trae las actividades de intervals.icu de un rango y las mantiene frescas.
function useIcuActivities(oldest: string, newest: string): [IcuActivity[], () => void] {
  const [acts, setActs] = useState<IcuActivity[]>([]);

  const fetchRange = useCallback(async (opts?: { signal?: AbortSignal; force?: boolean }) => {
    try {
      const q = `/api/intervals?oldest=${oldest}&newest=${newest}` + (opts?.force ? "&force=1" : "");
      const r = await fetch(q, { signal: opts?.signal });
      if (!r.ok) return;
      const d = (await r.json()) as IcuActivity[];
      if (Array.isArray(d)) setActs(d);
    } catch {
      /* offline / abort: conserva lo que ya había */
    }
  }, [oldest, newest]);

  useEffect(() => {
    const ctrl = new AbortController();
    void fetchRange({ signal: ctrl.signal });
    const iv = setInterval(() => void fetchRange(), POLL_MS);
    const onFocus = () => void fetchRange();
    window.addEventListener("focus", onFocus);
    return () => {
      ctrl.abort();
      clearInterval(iv);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchRange]);

  const refresh = useCallback(() => void fetchRange({ force: true }), [fetchRange]);
  return [acts, refresh];
}

// Empareja las sesiones de la semana con actividades reales por fecha + disciplina.
export function useIntervals(weekStart: Date) {
  const [acts] = useIcuActivities(iso(weekStart), iso(addDays(weekStart, 6)));
  return useCallback(
    (dateISO: string, disc: Discipline): IcuActivity | null =>
      acts.find((a) => a.date === dateISO && a.disc === disc) ?? null,
    [acts],
  );
}

// Lista de actividades de intervals.icu (para el feed), más recientes primero, con refresco manual.
export function useIntervalsFeed(anchor: Date, daysBack = 60): { acts: IcuActivity[]; refresh: () => void } {
  const [acts, refresh] = useIcuActivities(iso(addDays(anchor, -daysBack)), iso(anchor));
  const sorted = useMemo(
    () => [...acts].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [acts],
  );
  return { acts: sorted, refresh };
}

// actividad de intervals.icu -> nuestros campos (dist en m para nado, km para el resto)
export function actToLog(act: IcuActivity, disc: Discipline): LogData {
  const n = (x: number | null) => (x == null ? null : String(Math.round(x)));
  const dist = act.distM == null ? null : disc === "swim" ? String(Math.round(act.distM)) : (act.distM / 1000).toFixed(2);
  return { dist, time: act.movingS == null ? null : fmtDur(act.movingS), hr: n(act.hr), power: n(act.power), cad: n(act.cad) };
}

// Métricas resumidas para una tarjeta del feed.
export function icuStats(act: IcuActivity): { v: string; u: string }[] {
  if (act.disc === "gym") return act.movingS != null ? [{ v: fmtDur(act.movingS), u: "" }] : [];
  const out: { v: string; u: string }[] = [];
  if (act.distM != null) out.push(act.disc === "swim" ? { v: String(Math.round(act.distM)), u: "m" } : { v: (act.distM / 1000).toFixed(1), u: "km" });
  if (act.movingS != null) out.push({ v: fmtDur(act.movingS), u: "" });
  const der = derive(act.disc, actToLog(act, act.disc));
  if (der && der.v !== "—") out.push({ v: der.v, u: der.u });
  if (act.hr != null) out.push({ v: String(Math.round(act.hr)), u: "ppm" });
  return out;
}

// velocidad (m/s) -> ritmo (/km, /100m) o km/h según disciplina
export function fmtSpeed(disc: Discipline, ms: number | null): { v: string; u: string } | null {
  if (ms == null || ms <= 0) return null;
  if (disc === "bike") return { v: (ms * 3.6).toFixed(1), u: "km/h" };
  if (disc === "swim") return { v: fmtPace(100 / ms), u: "/100m" };
  return { v: fmtPace(1000 / ms), u: "/km" };
}

export function fmtDur(sec: number | null): string {
  if (sec == null || !isFinite(sec)) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}
