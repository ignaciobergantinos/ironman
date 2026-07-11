export type Discipline = "run" | "swim" | "bike" | "gym" | "walk";
export type Intensity = "Suave" | "Medio" | "Fuerte" | "Largo";
export type Slot = "am" | "pm";

export type PlanStep = { tag?: string; steps: string[] };
export type TemplateSession = {
  slot: Slot;
  disc: Discipline;
  name: string;
  intensity: Intensity;
  routine?: RoutineKey;
  plan?: PlanStep;
};
export type DayDef = {
  dow: number;
  day: string;
  rest?: boolean;
  sessions: TemplateSession[];
};

export type Session = {
  id: string;
  date: string;
  kind: "templ" | "extra";
  disc: Discipline;
  name: string;
  intensity: Intensity;
  slot?: Slot;
  routine?: RoutineKey;
  plan?: PlanStep | null;
};

export const DISC: Record<Discipline, { label: string; color: string }> = {
  run: { label: "Carrera", color: "var(--run)" },
  swim: { label: "Natación", color: "var(--swim)" },
  bike: { label: "Bici", color: "var(--bike)" },
  gym: { label: "Gimnasio", color: "var(--gym)" },
  walk: { label: "Caminata", color: "var(--walk)" },
};

export const INT: Record<Intensity, { c: string }> = {
  Suave: { c: "var(--good)" },
  Medio: { c: "var(--warn)" },
  Fuerte: { c: "var(--hard)" },
  Largo: { c: "var(--long)" },
};

export type RoutineKey = "pull" | "legs" | "push";
export type Exercise = { n: string; s: number; r: string };
export const ROUTINES: Record<RoutineKey, { label: string; ex: Exercise[] }> = {
  pull: {
    label: "Tirón",
    ex: [
      { n: "Dominadas", s: 4, r: "8" },
      { n: "Press banca", s: 4, r: "8" },
      { n: "Remo", s: 4, r: "10" },
      { n: "Curl de bíceps", s: 3, r: "12" },
    ],
  },
  legs: {
    label: "Piernas",
    ex: [
      { n: "Sentadilla", s: 4, r: "8" },
      { n: "Gemelos", s: 4, r: "15" },
      { n: "Isquios", s: 3, r: "12" },
      { n: "Estocadas", s: 3, r: "10/p" },
    ],
  },
  push: {
    label: "Empuje",
    ex: [
      { n: "Remo", s: 4, r: "10" },
      { n: "Press de hombros", s: 4, r: "10" },
      { n: "Mariposa", s: 3, r: "12" },
      { n: "Vuelos laterales", s: 3, r: "15" },
    ],
  },
};

export type Field = { k: string; l: string; u: string; ph: string; time?: boolean };
export const FIELDS: Record<Discipline, Field[]> = {
  run: [
    { k: "dist", l: "Distancia", u: "km", ph: "0.0" },
    { k: "time", l: "Tiempo", u: "h:mm:ss", time: true, ph: "0:00" },
    { k: "hr", l: "FC media", u: "ppm", ph: "—" },
  ],
  walk: [
    { k: "dist", l: "Distancia", u: "km", ph: "0.0" },
    { k: "time", l: "Tiempo", u: "h:mm:ss", time: true, ph: "0:00" },
    { k: "hr", l: "FC media", u: "ppm", ph: "—" },
  ],
  bike: [
    { k: "dist", l: "Distancia", u: "km", ph: "0.0" },
    { k: "time", l: "Tiempo", u: "h:mm:ss", time: true, ph: "0:00" },
    { k: "power", l: "Potencia", u: "W", ph: "—" },
    { k: "cad", l: "Cadencia", u: "rpm", ph: "—" },
    { k: "hr", l: "FC media", u: "ppm", ph: "—" },
  ],
  swim: [
    { k: "dist", l: "Distancia", u: "m", ph: "0" },
    { k: "time", l: "Tiempo", u: "h:mm:ss", time: true, ph: "0:00" },
    { k: "hr", l: "FC media", u: "ppm", ph: "—" },
  ],
  gym: [], // el gimnasio se registra por rutina/series, no con estos campos
};

/* ---------- plan de 6 semanas (maratón primero, intensidad en el agua) ---------- */
export const PLAN_START = new Date(2026, 6, 13); // lunes 13 jul 2026 (semana 1)

export type WeekParams = {
  phase: string;
  recovery?: boolean;
  swimReps: string; // serie principal del nado de calidad (lunes)
  swimCSS: string; // nado de umbral (viernes)
  longTag: string; // duración del fondo del sábado
};

// 3 semanas de carga → descarga (sem 4) → 2 de construcción/pico.
// El maratón se construye subiendo el fondo largo; los intervalos van en la pileta.
// Vuelta a la natación: base ~1.000 m/sesión (2:05–2:20/100m, 122 ppm). Se sube de a poco.
const PLAN: WeekParams[] = [
  { phase: "Base", swimReps: "6×50 m", swimCSS: "4×100 m", longTag: "70–80’" },
  { phase: "Carga", swimReps: "8×50 m", swimCSS: "5×100 m", longTag: "85–95’" },
  { phase: "Tope", swimReps: "10×50 m", swimCSS: "6×100 m", longTag: "100–110’" },
  { phase: "Recuperación", recovery: true, swimReps: "6×50 m", swimCSS: "4×100 m", longTag: "50–60’" },
  { phase: "Construcción", swimReps: "6×100 m", swimCSS: "6×100 m", longTag: "110–120’" },
  { phase: "Pico", swimReps: "8×100 m", swimCSS: "8×100 m", longTag: "120–140’" },
];

function swimSet(reps: string, hard: boolean): PlanStep {
  return {
    tag: hard ? "Series · respiración" : "Suave",
    steps: [
      "200 m calentamiento suave",
      "4×50 m técnica (20’’ desc)",
      `Principal: ${reps} ${hard ? "a 1:55–2:00/100m" : "suave"} (25–30’’ desc)`,
      "100 m suelto · controlado, sin ahogo (asma)",
    ],
  };
}
function longRun(dur: string, marathonFinish: boolean): PlanStep {
  return {
    tag: `Fondo · ${dur}`,
    steps: [
      "Z2 continuo a 7:45–8:00/km · 135–140 ppm",
      `${dur} en total`,
      marathonFinish ? "Últimos 15’ a ~7:00/km (objetivo maratón)" : "Todo suave, sin forzar",
      "Hidrátate cada 20–25’",
    ],
  };
}

function buildWeek(p: WeekParams): Record<number, DayDef> {
  const r = !!p.recovery;
  const days: DayDef[] = [
    {
      dow: 1,
      day: "Lunes",
      sessions: [
        { slot: "am", disc: "run", name: "Rodaje suave", intensity: "Suave", plan: { tag: "Z2 · 7:30–8:00/km", steps: ["40–50’ a 7:30–8:00/km · 135–140 ppm", "Respiración controlada, conversado", "Abrígate y calienta bien (frío/asma)"] } },
        { slot: "pm", disc: "swim", name: "Natación · series", intensity: r ? "Medio" : "Fuerte", plan: swimSet(p.swimReps, !r) },
      ],
    },
    {
      dow: 2,
      day: "Martes",
      sessions: [
        { slot: "am", disc: "gym", name: "Gimnasio · tren superior", intensity: "Medio", routine: "pull" },
        { slot: "pm", disc: "bike", name: "Bici · rodaje Z2", intensity: "Suave", plan: { tag: "Recuperación piernas", steps: ["50–70’ en Z2 suave", "Cadencia 85–95 rpm", "Bajo impacto, piernas frescas para el sábado"] } },
      ],
    },
    {
      dow: 3,
      day: "Miércoles",
      sessions: [
        { slot: "am", disc: "run", name: "Rodaje progresivo", intensity: r ? "Suave" : "Medio", plan: { tag: "Controlado", steps: ["15’ calentamiento a 8:00/km", r ? "20’ cómodo a ~7:45/km" : "25–30’ progresivo, de 7:45 a ~6:45/km (medio, nunca máximo)", "Cinta si hace mucho frío (asma)", "10’ vuelta a la calma suave"] } },
        { slot: "pm", disc: "swim", name: "Natación · aeróbico", intensity: "Suave", plan: { tag: "Fondo · ~2:10/100m", steps: ["300 m calentamiento", "600–800 m continuo suave (o 2×400 m)", "100 m suelto"] } },
      ],
    },
    {
      dow: 4,
      day: "Jueves",
      sessions: [
        { slot: "am", disc: "gym", name: "Gimnasio · piernas", intensity: r ? "Medio" : "Fuerte", routine: "legs" },
        ...(r ? [] : [{ slot: "pm" as const, disc: "swim" as const, name: "Natación · suave (opcional)", intensity: "Suave" as const, plan: { tag: "Respiración", steps: ["800–1000 m suelto", "Enfoca técnica y respiración bilateral"] } }]),
      ],
    },
    {
      dow: 5,
      day: "Viernes",
      sessions: [
        { slot: "am", disc: "run", name: "Rodaje suave", intensity: "Suave", plan: { tag: "Z2 · 7:45–8:00/km", steps: ["35–45’ a 7:45–8:00/km · 135–140 ppm", "Piernas sueltas para el fondo del sábado"] } },
        { slot: "pm", disc: "swim", name: "Natación · CSS", intensity: r ? "Suave" : "Medio", plan: { tag: `CSS · ${p.swimCSS}`, steps: ["300 m calentamiento", `${p.swimCSS} a ~2:05/100m (20’’ desc)`, "4×50 m solo pies", "100 m suelto"] } },
      ],
    },
    {
      dow: 6,
      day: "Sábado",
      sessions: [
        { slot: "am", disc: "run", name: "Fondo largo", intensity: "Largo", plan: longRun(p.longTag, !r) },
        { slot: "pm", disc: "gym", name: "Gimnasio · empuje", intensity: "Medio", routine: "push" },
      ],
    },
    { dow: 0, day: "Domingo", rest: true, sessions: [] },
  ];
  const map: Record<number, DayDef> = {};
  days.forEach((d) => (map[d.dow] = d));
  return map;
}

const BUILT = PLAN.map(buildWeek);

// Semana del plan (0..5) o null si la fecha cae fuera del bloque de 6 semanas.
export function planWeekIndex(d: Date): number | null {
  const start = mondayOf(PLAN_START).getTime();
  const mon = mondayOf(d).getTime();
  const wk = Math.floor(Math.round((mon - start) / 86400000) / 7);
  return wk >= 0 && wk < PLAN.length ? wk : null;
}
export function dayDef(d: Date): DayDef {
  const i = planWeekIndex(d);
  if (i == null) return { dow: d.getDay(), day: DOW_LONG[d.getDay()], rest: true, sessions: [] };
  return BUILT[i][d.getDay()];
}
export function weekMeta(d: Date): { num: number; total: number; phase: string; recovery: boolean } | null {
  const i = planWeekIndex(d);
  if (i == null) return null;
  return { num: i + 1, total: PLAN.length, phase: PLAN[i].phase, recovery: !!PLAN[i].recovery };
}

export const DOW_LONG = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/* date utils */
export function iso(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
export function mondayOf(d: Date): Date {
  const x = new Date(d);
  const g = x.getDay();
  x.setDate(x.getDate() + (g === 0 ? -6 : 1 - g));
  x.setHours(0, 0, 0, 0);
  return x;
}
export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export function fmtDate(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/* time helpers */
export function parseTime(s: unknown): number | null {
  if (s == null) return null;
  const str = ("" + s).trim();
  if (!str) return null;
  const p = str.split(":").map((x) => parseFloat(x));
  if (p.some((x) => isNaN(x))) return null;
  if (p.length === 1) return p[0] * 60;
  if (p.length === 2) return p[0] * 60 + p[1];
  return p[0] * 3600 + p[1] * 60 + p[2];
}
export function fmtPace(sec: number | null): string {
  if (sec == null || !isFinite(sec)) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
export type LogData = {
  done?: boolean;
  dist?: string | null;
  time?: string | null;
  hr?: string | null;
  power?: string | null;
  cad?: string | null;
  rpe?: number;
  notes?: string | null;
  ex?: Record<number, Array<{ kg?: string | null; reps?: string | null }>>;
  photos?: string[];
};
export function derive(disc: Discipline, d: LogData): { l: string; v: string; u: string } | null {
  const t = parseTime(d.time);
  const dist = parseFloat(d.dist ?? "");
  if (disc === "run" || disc === "walk") {
    if (t && dist > 0) return { l: "Ritmo", v: fmtPace(t / dist), u: "/km" };
    return { l: "Ritmo", v: "—", u: "/km" };
  }
  if (disc === "bike") {
    if (t && dist > 0) return { l: "Velocidad", v: (dist / (t / 3600)).toFixed(1), u: "km/h" };
    return { l: "Velocidad", v: "—", u: "km/h" };
  }
  if (disc === "swim") {
    if (t && dist > 0) return { l: "Ritmo", v: fmtPace(t / (dist / 100)), u: "/100m" };
    return { l: "Ritmo", v: "—", u: "/100m" };
  }
  return null;
}
