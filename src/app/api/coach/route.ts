import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import {
  DISC,
  MEALS,
  RACE,
  ROUTINES,
  addDays,
  dayDefFor,
  derive,
  iso,
  mondayOf,
  parseTime,
  weekMeta,
  weekTarget,
  weeksToRace,
  type Discipline,
  type LogData,
  type WeekMap,
} from "@/lib/domain";

export const dynamic = "force-dynamic";

// Ruta pública de solo lectura: expone el entrenamiento en JSON para que un
// asistente externo pueda analizarlo y proponer las semanas siguientes.
// Usa la clave anon; en la BD hay una policy que permite leer solo a este
// usuario (ver supabase/schema.sql), así que esta ruta no puede escribir nada.

type Row = { entry_key: string; kind: string; data: Record<string, unknown> };

type SessionOut = {
  id: string;
  date: string;
  slot?: string;
  disc: Discipline;
  discLabel: string;
  name: string;
  intensity: string;
  source: "plan" | "extra";
  planned: string[] | null;
  done: boolean;
  dist: number | null;
  minutes: number | null;
  hr: number | null;
  rpe: number | null;
  pace: string | null;
  notes: string | null;
  gym: { exercise: string; sets: { kg: number | null; reps: number | null }[] }[] | null;
};

type Totals = { runKm: number; walkKm: number; swimM: number; bikeKm: number; hours: number };

const zero = (): Totals => ({ runKm: 0, walkKm: 0, swimM: 0, bikeKm: 0, hours: 0 });

function num(v: unknown): number | null {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return isFinite(n) ? n : null;
}

function addToTotals(t: Totals, disc: Discipline, dist: number | null, minutes: number | null) {
  if (minutes) t.hours += minutes / 60;
  if (dist == null) return;
  if (disc === "run") t.runKm += dist;
  else if (disc === "walk") t.walkKm += dist;
  else if (disc === "bike") t.bikeKm += dist;
  else if (disc === "swim") t.swimM += dist;
}

function gymSets(log: LogData, routine?: string) {
  if (!routine || !log.ex) return null;
  const ex = ROUTINES[routine as keyof typeof ROUTINES]?.ex;
  if (!ex) return null;
  const out = Object.entries(log.ex)
    .map(([idx, sets]) => ({
      exercise: ex[Number(idx)]?.n ?? `#${idx}`,
      sets: (sets || []).map((s) => ({ kg: num(s?.kg), reps: num(s?.reps) })),
    }))
    .filter((e) => e.sets.length > 0);
  return out.length ? out : null;
}

function buildSession(
  id: string,
  date: string,
  disc: Discipline,
  name: string,
  intensity: string,
  source: "plan" | "extra",
  log: LogData,
  opts: { slot?: string; planned?: string[] | null; routine?: string } = {},
): SessionOut {
  const dist = num(log.dist);
  const secs = parseTime(log.time);
  const minutes = secs != null ? Math.round(secs / 60) : null;
  const d = derive(disc, log);
  return {
    id,
    date,
    slot: opts.slot,
    disc,
    discLabel: DISC[disc].label,
    name,
    intensity,
    source,
    planned: opts.planned ?? null,
    done: !!log.done,
    dist,
    minutes,
    hr: num(log.hr),
    rpe: log.rpe ?? null,
    pace: d && d.v !== "—" ? `${d.v}${d.u}` : null,
    notes: log.notes || null,
    gym: gymSets(log, opts.routine),
  };
}

export async function GET(request: NextRequest) {
  const userId = process.env.COACH_USER_ID;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!userId || !url || !anon) {
    return NextResponse.json({ error: "coach-not-configured" }, { status: 503 });
  }

  const back = Math.min(Math.max(Number(request.nextUrl.searchParams.get("weeks")) || 6, 1), 26);

  const supabase = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("training_entries")
    .select("entry_key,kind,data")
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: "db", detail: error.message }, { status: 502 });
  }

  const rows = (data ?? []) as Row[];
  const logs = new Map<string, LogData>();
  const extras: { key: string; d: Record<string, unknown> }[] = [];
  const weekmaps = new Map<string, WeekMap>();
  const foodDays = new Map<string, Record<string, { eaten?: string[] }>>();

  for (const r of rows) {
    if (r.kind === "log") logs.set(r.entry_key, r.data as LogData);
    else if (r.kind === "extra") extras.push({ key: r.entry_key, d: r.data });
    else if (r.kind === "weekmap") weekmaps.set(r.entry_key.slice(5), (r.data.map as WeekMap) ?? []);
    else if (r.kind === "foodday") foodDays.set(r.entry_key.slice(5), r.data as Record<string, { eaten?: string[] }>);
  }

  const extrasByDate = new Map<string, { key: string; d: Record<string, unknown> }[]>();
  for (const e of extras) {
    const date = String(e.d.date ?? "");
    if (!date) continue;
    const list = extrasByDate.get(date) ?? [];
    list.push(e);
    extrasByDate.set(date, list);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstMonday = addDays(mondayOf(today), -7 * (back - 1));

  const weeks = [];
  // `back` semanas hacia atrás + la siguiente, para que se vea lo que ya toca planificar
  for (let w = 0; w < back + 1; w++) {
    const monday = addDays(firstMonday, w * 7);
    const map = weekmaps.get(iso(monday));
    const meta = weekMeta(monday);
    const target = weekTarget(monday);
    const totals = zero();
    const sessions: SessionOut[] = [];
    let plannedCount = 0;
    let doneCount = 0;

    for (let i = 0; i < 7; i++) {
      const date = addDays(monday, i);
      const dISO = iso(date);

      for (const s of dayDefFor(date, map).sessions) {
        const id = `${dISO}:${s.slot}`;
        const log = logs.get(id) ?? {};
        plannedCount++;
        if (log.done) doneCount++;
        const out = buildSession(id, dISO, s.disc, s.name, s.intensity, "plan", log, {
          slot: s.slot,
          planned: s.plan?.steps ?? null,
          routine: s.routine,
        });
        if (log.done) addToTotals(totals, s.disc, out.dist, out.minutes);
        sessions.push(out);
      }

      for (const e of extrasByDate.get(dISO) ?? []) {
        const log = (e.d.log as LogData) ?? {};
        const disc = e.d.disc as Discipline;
        if (log.done) doneCount++;
        const out = buildSession(
          e.key,
          dISO,
          disc,
          String(e.d.name ?? "Extra"),
          String(e.d.intensity ?? "Medio"),
          "extra",
          log,
        );
        if (log.done) addToTotals(totals, disc, out.dist, out.minutes);
        sessions.push(out);
      }
    }

    const isFuture = monday > mondayOf(today);
    weeks.push({
      monday: iso(monday),
      status: isFuture ? "upcoming" : monday.getTime() === mondayOf(today).getTime() ? "current" : "past",
      weeksToRace: weeksToRace(monday),
      phase: meta ? `${meta.phase} (semana ${meta.num}/${meta.total})` : null,
      recovery: meta?.recovery ?? false,
      target,
      actual: {
        runKm: +totals.runKm.toFixed(1),
        walkKm: +totals.walkKm.toFixed(1),
        swimM: Math.round(totals.swimM),
        bikeKm: +totals.bikeKm.toFixed(1),
        hours: +totals.hours.toFixed(2),
      },
      adherence: target
        ? {
            runKmPct: target.runKm ? Math.round((totals.runKm / target.runKm) * 100) : null,
            hoursPct: target.hours ? Math.round((totals.hours / target.hours) * 100) : null,
          }
        : null,
      sessionsPlanned: plannedCount,
      sessionsDone: doneCount,
      sessions,
    });
  }

  const body = {
    generatedAt: new Date().toISOString(),
    units: {
      dist: "run/walk/bike en km, swim en metros",
      minutes: "duración de la sesión en minutos",
      hours: "total semanal de entreno en horas",
      hr: "ppm",
      rpe: "1–10 esfuerzo percibido",
    },
    race: { name: RACE.name, date: iso(RACE.date), weeksToRace: weeksToRace(today) },
    today: iso(today),
    nutrition: {
      meals: MEALS.map((m) => ({ id: m.id, name: m.name, tag: m.tag })),
      loggedDays: [...foodDays.keys()].sort().slice(-14),
    },
    weeks,
  };

  return NextResponse.json(body, {
    headers: {
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store",
    },
  });
}
