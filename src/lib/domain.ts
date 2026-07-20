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
// Reordenar días de una semana concreta: `map` (indexado por dow, 0=dom..6=sáb) da el dow de
// origen cuyo plan se muestra en cada día natural. El nombre y la fecha del día siguen siendo los
// reales; solo cambian las sesiones (y el descanso). El registro se mantiene por fecha natural.
export type WeekMap = number[];
export function isIdentityMap(m?: WeekMap | null): boolean {
  return !m || m.every((v, i) => v === i);
}
export function dayDefFor(d: Date, map?: WeekMap | null): DayDef {
  const i = planWeekIndex(d);
  if (i == null || isIdentityMap(map)) return dayDef(d);
  const real = BUILT[i][d.getDay()];
  const src = BUILT[i][map![d.getDay()]];
  return { dow: real.dow, day: real.day, rest: src.rest, sessions: src.sessions };
}
export function weekMeta(d: Date): { num: number; total: number; phase: string; recovery: boolean } | null {
  const i = planWeekIndex(d);
  if (i == null) return null;
  return { num: i + 1, total: PLAN.length, phase: PLAN[i].phase, recovery: !!PLAN[i].recovery };
}

/* ---------- alimentación diaria (casi siempre lo mismo) ----------
   Catálogo de alimentos (kcal por ración/unidad) + comidas planificadas que
   los referencian por id. `unit` = alimento contable (kcal por unidad), con un
   contador de cantidad. El registro diario guarda solo lo que marcas como
   comido, las cantidades que cambies y los extras añadidos. */
// valores (kcal, p=proteína, c=carbos, fat=grasas en g) = por unidad si `unit`,
// por 100 g si `grams` (con esa ración por defecto), o fijos si ninguno
export type Food = { id: string; name: string; kcal: number; p: number; c: number; fat: number; unit?: boolean; grams?: number };
export const FOODS: Food[] = [
  { id: "banana", name: "Banana", kcal: 105, p: 1.3, c: 24, fat: 0.4 },
  { id: "shake_creatina", name: "Batido de proteína + creatina", kcal: 175, p: 30, c: 8, fat: 3 },
  { id: "shake", name: "Batido de proteína", kcal: 150, p: 25, c: 8, fat: 2 },
  { id: "huevo", name: "Huevo", kcal: 72, p: 6.3, c: 0.4, fat: 5, unit: true },
  { id: "clara", name: "Clara", kcal: 17, p: 3.6, c: 0.2, fat: 0.1, unit: true },
  { id: "atun", name: "Lata de atún", kcal: 130, p: 28, c: 0, fat: 2 },
  { id: "galleta_arroz_mani", name: "Galleta de arroz con maní", kcal: 65, p: 2.5, c: 8, fat: 2.5, unit: true },
  { id: "miel", name: "Miel", kcal: 304, p: 0.3, c: 82, fat: 0, grams: 20 },
  { id: "avena", name: "Avena", kcal: 389, p: 13, c: 67, fat: 7, grams: 40 },
  { id: "verduras", name: "Verduras", kcal: 35, p: 2, c: 6, fat: 0.3, grams: 200 },
  { id: "arroz", name: "Arroz", kcal: 130, p: 2.7, c: 28, fat: 0.3, grams: 200 },
  { id: "fideos_int", name: "Fideos integrales", kcal: 150, p: 5, c: 30, fat: 1, grams: 200 },
  { id: "batata", name: "Batata", kcal: 86, p: 1.6, c: 20, fat: 0.1, grams: 200 },
  { id: "papa", name: "Papa", kcal: 77, p: 2, c: 17, fat: 0.1, grams: 200 },
  { id: "carne", name: "Carne", kcal: 200, p: 26, c: 0, fat: 11, grams: 150 },
  { id: "pollo", name: "Pollo", kcal: 165, p: 31, c: 0, fat: 4, grams: 150 },
  { id: "pescado", name: "Pescado", kcal: 120, p: 20, c: 0, fat: 4.5, grams: 150 },
];

// item planificado de una comida: id + cantidad por defecto (unit) + grupo opcional (elige uno)
export type MealItem = { id: string; qty?: number; group?: string };
export type Meal = { id: string; name: string; tag: string; foods: MealItem[] };
export const MEALS: Meal[] = [
  { id: "pre_am", name: "Pre-entreno · mañana", tag: "Antes de entrenar", foods: [{ id: "banana" }, { id: "shake_creatina" }, { id: "miel" }] },
  { id: "desayuno", name: "Desayuno", tag: "Post-entreno", foods: [{ id: "huevo", qty: 2 }, { id: "clara", qty: 2 }, { id: "atun" }, { id: "galleta_arroz_mani", qty: 5 }] },
  { id: "almuerzo", name: "Almuerzo", tag: "Mediodía", foods: [{ id: "huevo", qty: 3 }, { id: "clara", qty: 3 }, { id: "avena" }, { id: "verduras" }] },
  { id: "merienda", name: "Merienda · pre-entreno", tag: "Antes de entrenar", foods: [{ id: "banana" }, { id: "shake" }] },
  {
    id: "cena", name: "Cena", tag: "Noche", foods: [
      { id: "arroz", group: "Carbohidrato" }, { id: "fideos_int", group: "Carbohidrato" }, { id: "batata", group: "Carbohidrato" }, { id: "papa", group: "Carbohidrato" },
      { id: "carne", group: "Proteína" }, { id: "pollo", group: "Proteína" }, { id: "pescado", group: "Proteína" },
      { id: "verduras" },
    ],
  },
];

// registro de un día: por comida, planificados comidos + cantidades cambiadas + extras (con su cantidad)
export type AddItem = { id: string; amt?: number };
export type MealLog = { eaten?: string[]; add?: AddItem[]; qty?: Record<string, number> };
export type FoodDay = Record<string, MealLog>;

export function foodsById(custom: Food[] = []): Record<string, Food> {
  const m: Record<string, Food> = {};
  for (const f of [...FOODS, ...custom]) m[f.id] = f;
  return m;
}
export type Macros = { kcal: number; p: number; c: number; fat: number };
const ZERO: Macros = { kcal: 0, p: 0, c: 0, fat: 0 };
const addMac = (a: Macros, b: Macros): Macros => ({ kcal: a.kcal + b.kcal, p: a.p + b.p, c: a.c + b.c, fat: a.fat + b.fat });

// cantidad efectiva de un item: la que hayas fijado, la del plan, o la ración por defecto (unidades o gramos)
export function itemAmount(item: MealItem, food: Food | undefined, log: MealLog | undefined): number {
  return log?.qty?.[item.id] ?? item.qty ?? food?.grams ?? 1;
}
// escala los macros de un alimento a una ración: por 100 g, por unidad o fija
export function serving(food: Food | undefined, amount: number): Macros {
  if (!food) return ZERO;
  const s = food.grams != null ? amount / 100 : food.unit ? amount : 1;
  return { kcal: food.kcal * s, p: food.p * s, c: food.c * s, fat: food.fat * s };
}
// macros de una comida en un día (planificados comidos × cantidad, más extras a ración por defecto)
export function mealMacros(meal: Meal, log: MealLog | undefined, byId: Record<string, Food>): Macros {
  const eaten = new Set(log?.eaten || []);
  let m = ZERO;
  for (const it of meal.foods) if (eaten.has(it.id)) m = addMac(m, serving(byId[it.id], itemAmount(it, byId[it.id], log)));
  for (const a of log?.add || []) { const f = byId[a.id]; m = addMac(m, serving(f, a.amt ?? f?.grams ?? 1)); }
  return m;
}
export function dayMacros(day: FoodDay | undefined, byId: Record<string, Food>): Macros {
  return MEALS.reduce((s, m) => addMac(s, mealMacros(m, day?.[m.id], byId)), ZERO);
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
  soft?: boolean; // día suave/recuperación: los pesos de esta sesión no fijan la plantilla
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
// ¿tiene el registro datos introducidos (más allá de "done")?
export function hasData(l?: LogData): boolean {
  if (!l) return false;
  return Object.entries(l).some(([k, v]) => {
    if (k === "done" || k === "soft") return false;
    if (v == null || v === "") return false;
    if (typeof v === "object") return Object.keys(v).length > 0;
    return true;
  });
}
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
