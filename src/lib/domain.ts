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

export const WEEK: DayDef[] = [
  {
    dow: 1,
    day: "Lunes",
    sessions: [
      { slot: "am", disc: "run", name: "Pasadas", intensity: "Fuerte", plan: { tag: "Series en pista", steps: ["Calentamiento 15’ suave + movilidad", "4 progresivos de 80 m", "Principal: 8×400 m a ritmo 5K, 90’’ rec", "Vuelta a la calma 10’"] } },
      { slot: "pm", disc: "swim", name: "Natación · técnica", intensity: "Suave", plan: { tag: "~1800 m", steps: ["300 m calentamiento", "6×50 m técnica (15’’ desc)", "8×100 m fuerte (20’’ desc)", "200 m suave"] } },
    ],
  },
  {
    dow: 2,
    day: "Martes",
    sessions: [
      { slot: "am", disc: "gym", name: "Gimnasio · tirón", intensity: "Medio", routine: "pull" },
      { slot: "pm", disc: "bike", name: "Bici · rodaje Z2", intensity: "Suave", plan: { tag: "Resistencia", steps: ["60–75’ en Z2 constante", "Cadencia 85–95 rpm", "Terreno llano, esfuerzo conversado"] } },
    ],
  },
  {
    dow: 3,
    day: "Miércoles",
    sessions: [
      { slot: "am", disc: "run", name: "Cuestas", intensity: "Fuerte", plan: { tag: "Fuerza-resistencia", steps: ["Calentamiento 15’", "10 × (60–90’’ cuesta fuerte / bajada al trote)", "Mantén técnica y cadencia alta", "Vuelta a la calma 10’"] } },
      { slot: "pm", disc: "swim", name: "Natación · fondo", intensity: "Medio", plan: { tag: "~2100 m", steps: ["400 m calentamiento", "1×1500 m continuo Z2 (o 3×500 m)", "200 m suave"] } },
    ],
  },
  {
    dow: 4,
    day: "Jueves",
    sessions: [
      { slot: "am", disc: "gym", name: "Gimnasio · piernas", intensity: "Fuerte", routine: "legs" },
      { slot: "pm", disc: "bike", name: "Bici · sweet spot", intensity: "Medio", plan: { tag: "~60’", steps: ["15’ calentamiento", "3×8’ ritmo cómodo-duro (sweet spot), 4’ rec", "10’ vuelta a la calma"] } },
    ],
  },
  {
    dow: 5,
    day: "Viernes",
    sessions: [
      { slot: "am", disc: "run", name: "Fondos", intensity: "Largo", plan: { tag: "Tirada larga", steps: ["Rodaje largo continuo en Z2", "75–100’ a ritmo cómodo y conversado", "Hidratación cada 20–25’"] } },
      { slot: "pm", disc: "swim", name: "Natación · CSS", intensity: "Medio", plan: { tag: "~2050 m", steps: ["400 m calentamiento", "10×100 m a ritmo CSS (15’’ desc)", "4×50 m solo pies", "200 m suave"] } },
    ],
  },
  {
    dow: 6,
    day: "Sábado",
    sessions: [
      { slot: "am", disc: "gym", name: "Gimnasio · empuje", intensity: "Medio", routine: "push" },
      { slot: "pm", disc: "bike", name: "Bici · fondo largo", intensity: "Largo", plan: { tag: "Tirada larga", steps: ["90–120’ en Z2 constante", "Come/bebe en ruta", "Opción brick: 10–15’ trote suave al bajar"] } },
    ],
  },
  { dow: 0, day: "Domingo", rest: true, sessions: [] },
];

export const byDow: Record<number, DayDef> = {};
WEEK.forEach((d) => (byDow[d.dow] = d));

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
