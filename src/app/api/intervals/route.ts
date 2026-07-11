import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Discipline } from "@/lib/domain";

// intervals.icu activity.type -> nuestra disciplina
function toDisc(type: string): Discipline | null {
  const t = type.toLowerCase();
  if (t.includes("swim")) return "swim";
  if (t.includes("ride") || t.includes("bike") || t.includes("cycl")) return "bike";
  if (t.includes("walk") || t.includes("hike")) return "walk";
  if (t.includes("run")) return "run";
  if (t.includes("weight") || t.includes("workout") || t.includes("strength") || t.includes("gym") || t.includes("crossfit")) return "gym";
  return null;
}

type IcuRaw = {
  id: string;
  start_date_local: string;
  type: string;
  name?: string | null;
  distance?: number | null;
  moving_time?: number | null;
  elapsed_time?: number | null;
  average_heartrate?: number | null;
  max_heartrate?: number | null;
  icu_average_watts?: number | null;
  average_watts?: number | null;
  icu_weighted_avg_watts?: number | null;
  max_watts?: number | null;
  average_cadence?: number | null;
  max_cadence?: number | null;
  average_speed?: number | null;
  max_speed?: number | null;
  total_elevation_gain?: number | null;
  calories?: number | null;
  icu_training_load?: number | null;
  icu_intensity?: number | null;
  icu_hr_zones?: number[] | null;
  icu_hr_zone_times?: number[] | null;
  feel?: number | null;
  icu_rpe?: number | null;
  device_name?: string | null;
  source?: string | null;
  trainer?: boolean | null;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no-auth" }, { status: 401 });

  const key = process.env.INTERVALS_API_KEY;
  if (!key) return NextResponse.json([]); // integración no configurada → sin actividades

  const { searchParams } = new URL(request.url);
  const oldest = searchParams.get("oldest");
  const newest = searchParams.get("newest");
  if (!oldest || !newest || !DATE_RE.test(oldest) || !DATE_RE.test(newest)) {
    return NextResponse.json({ error: "bad-range" }, { status: 400 });
  }

  const athlete = process.env.INTERVALS_ATHLETE_ID || "0";
  const url = `https://intervals.icu/api/v1/athlete/${athlete}/activities?oldest=${oldest}&newest=${newest}`;
  const auth = "Basic " + Buffer.from(`API_KEY:${key}`).toString("base64");

  const res = await fetch(url, { headers: { Authorization: auth }, cache: "no-store" });
  if (!res.ok) return NextResponse.json({ error: "intervals-error", status: res.status }, { status: 502 });

  const raw = (await res.json()) as IcuRaw[];
  const acts = raw
    .map((a) => {
      const disc = toDisc(a.type);
      if (!disc) return null;
      return {
        id: a.id,
        date: a.start_date_local.slice(0, 10),
        startLocal: a.start_date_local,
        disc,
        type: a.type,
        name: a.name ?? null,
        distM: a.distance ?? null,
        movingS: a.moving_time ?? null,
        elapsedS: a.elapsed_time ?? null,
        hr: a.average_heartrate ?? null,
        hrMax: a.max_heartrate ?? null,
        power: a.icu_average_watts ?? a.average_watts ?? null,
        powerNp: a.icu_weighted_avg_watts ?? null,
        powerMax: a.max_watts ?? null,
        cad: a.average_cadence ?? null,
        cadMax: a.max_cadence ?? null,
        speedAvg: a.average_speed ?? null,
        speedMax: a.max_speed ?? null,
        elevGain: a.total_elevation_gain ?? null,
        calories: a.calories ?? null,
        load: a.icu_training_load ?? null,
        intensity: a.icu_intensity ?? null,
        hrZones: a.icu_hr_zones ?? null,
        hrZoneTimes: a.icu_hr_zone_times ?? null,
        feel: a.feel ?? null,
        rpe: a.icu_rpe ?? null,
        device: a.device_name ?? null,
        source: a.source ?? null,
        trainer: a.trainer ?? null,
      };
    })
    .filter(Boolean);

  return NextResponse.json(acts);
}
