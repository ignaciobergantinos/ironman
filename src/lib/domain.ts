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

/* `pull`/`legs`/`push` son las rutinas del bloque viejo (jul–ago 2026). Los logs de gimnasio
   guardan las series por índice de ejercicio, así que renumerarlas rompería el histórico: se
   quedan como están y las rutinas nuevas viven en claves propias. */
export type RoutineKey = "pull" | "legs" | "push" | "espalda" | "piernas" | "empuje";
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
  // El tirón horizontal es el déficit principal: trapecio medio, romboides y hombro posterior.
  espalda: {
    label: "Espalda + bíceps",
    ex: [
      { n: "Remo con barra", s: 4, r: "6-8" },
      { n: "Remo unilateral", s: 3, r: "10-12" },
      { n: "Face pull", s: 3, r: "15-20" },
      { n: "Pájaros inclinado", s: 3, r: "15" },
      { n: "Curl inclinado", s: 3, r: "10-12" },
    ],
  },
  // Sentadilla para sostener fuerza; el resto cubre isquios, glúteo medio y sóleo.
  piernas: {
    label: "Piernas + core",
    ex: [
      { n: "Sentadilla", s: 4, r: "5" },
      { n: "Peso muerto rumano", s: 3, r: "8" },
      { n: "Búlgara", s: 3, r: "10/p" },
      { n: "Gemelo sentado", s: 3, r: "15" },
      { n: "Pallof press", s: 3, r: "30-40”" },
    ],
  },
  empuje: {
    label: "Empuje + brazos",
    ex: [
      { n: "Press inclinado", s: 4, r: "6-8" },
      { n: "Dominadas", s: 3, r: "máx" },
      { n: "Elevaciones laterales", s: 4, r: "15-20" },
      { n: "Fondos", s: 3, r: "8" },
      { n: "Curl martillo", s: 3, r: "12" },
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
  // el gimnasio se registra por rutina/series; solo la duración es útil aquí (suma en las horas)
  gym: [{ k: "time", l: "Tiempo", u: "h:mm:ss", time: true, ph: "0:00" }],
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

/* ---------- plan híbrido · sep 2026 → dic 2027 ----------
   Seis mañanas: 3 de gimnasio (una de piernas) y 3 de correr. Las tardes son natación —
   prioritaria porque no le cobra nada al tren inferior— y bici. Ninguna sesión pasa de 60'.
   Piernas va el miércoles: es el único hueco a tres días del largo del sábado y a uno de la
   calidad del martes. El déficit de espalda va el lunes, con el cuerpo descansado. */

export type HybridWeek = {
  runKm: number;
  hours: number;
  note: string;
  long: string; // duración o distancia del largo del sábado
  quality: PlanStep; // la única sesión dura de correr de la semana
  deload?: boolean;
};

const SWIM_TEC: PlanStep = {
  tag: "Técnica",
  steps: ["300 m calentamiento", "6×50 m técnica (20’’ desc)", "400–600 m continuo suave", "100 m suelto"],
};
const SWIM_AER: PlanStep = {
  tag: "Aeróbico",
  steps: ["300 m calentamiento", "800–1000 m continuo (o 2×400 m)", "100 m suelto · sin ahogo (asma)"],
};
const SWIM_SUAVE: PlanStep = { tag: "Suelto · opcional", steps: ["600–800 m suelto", "Respiración bilateral"] };
const BIKE_REG: PlanStep = {
  tag: "Regenerativa",
  steps: ["40’ en Z2 bajo", "Cadencia 85–95 rpm", "Resistencia baja: es recuperación, no entreno"],
};
const BIKE_Z2: PlanStep = { tag: "Z2", steps: ["45’ continuos en Z2", "Cadencia 85–95 rpm"] };

function easyRun(km: number): PlanStep {
  return {
    tag: "Z2 · 7:45–8:00/km",
    steps: [`${km} km a 7:45–8:00/km · cinta a 7,5 km/h`, "FC por debajo de 140", "Fácil de verdad: es el día que sostiene el resto"],
  };
}
function longRunH(dur: string): PlanStep {
  return { tag: `${dur} · 7:00–7:30/km`, steps: [`${dur} a 7:00–7:30/km · cinta a 8,0–8,6 km/h`, "FC 140–148", "Hidratación cada 20–25’"] };
}

function buildHybrid(w: HybridWeek): Record<number, DayDef> {
  const days: DayDef[] = [
    {
      dow: 1,
      day: "Lunes",
      sessions: [
        { slot: "am", disc: "gym", name: "Gimnasio · espalda + bíceps", intensity: "Medio", routine: "espalda" },
        { slot: "pm", disc: "swim", name: "Natación · técnica", intensity: "Suave", plan: SWIM_TEC },
      ],
    },
    {
      dow: 2,
      day: "Martes",
      sessions: [
        { slot: "am", disc: "run", name: "Carrera · calidad", intensity: w.deload ? "Medio" : "Fuerte", plan: w.quality },
        { slot: "pm", disc: "bike", name: "Bici · regenerativa", intensity: "Suave", plan: BIKE_REG },
      ],
    },
    {
      dow: 3,
      day: "Miércoles",
      sessions: [
        { slot: "am", disc: "gym", name: "Gimnasio · piernas + core", intensity: w.deload ? "Medio" : "Fuerte", routine: "piernas" },
        { slot: "pm", disc: "swim", name: "Natación · aeróbico", intensity: "Suave", plan: SWIM_AER },
      ],
    },
    {
      dow: 4,
      day: "Jueves",
      sessions: [
        { slot: "am", disc: "run", name: "Rodaje suave", intensity: "Suave", plan: easyRun(Math.round(w.runKm * 0.18)) },
        { slot: "pm", disc: "swim", name: "Natación · suelto", intensity: "Suave", plan: SWIM_SUAVE },
      ],
    },
    {
      dow: 5,
      day: "Viernes",
      sessions: [
        { slot: "am", disc: "gym", name: "Gimnasio · empuje + brazos", intensity: "Medio", routine: "empuje" },
        { slot: "pm", disc: "bike", name: "Bici · Z2", intensity: "Suave", plan: BIKE_Z2 },
      ],
    },
    {
      dow: 6,
      day: "Sábado",
      sessions: [{ slot: "am", disc: "run", name: "Tirada larga", intensity: "Largo", plan: longRunH(w.long) }],
    },
    { dow: 0, day: "Domingo", rest: true, sessions: [] },
  ];
  const map: Record<number, DayDef> = {};
  days.forEach((d) => (map[d.dow] = d));
  return map;
}

/* Las pasadas se introducen en orden: mecánica → VO2 corto → VO2 largo → umbral. Saltarse la
   primera fase hace que las series se corran con zancada de rodaje y no sirvan de nada. */
const Q_RECTAS: PlanStep = {
  tag: "Rectas · mecánica",
  steps: ["15’ de rodaje suave", "8 × 20’’ rápido con 90’’ de trote", "No es cardio: es enseñarle a las piernas a moverse", "10’ suelto"],
};
const Q400 = (n: number, pace: string): PlanStep => ({
  tag: `${n}×400 m · ${pace}`,
  steps: ["15’ calentamiento + 4 rectas", `${n} × 400 m a ${pace} con 90’’ de trote`, "10’ vuelta a la calma"],
});
const Q800 = (n: number, pace: string): PlanStep => ({
  tag: `${n}×800 m · ${pace}`,
  steps: ["15’ calentamiento + 4 rectas", `${n} × 800 m a ${pace} con 2’ de trote`, "10’ vuelta a la calma"],
});
const Q1000 = (n: number, pace: string): PlanStep => ({
  tag: `${n}×1000 m · ${pace}`,
  steps: ["15’ calentamiento + 4 rectas", `${n} × 1000 m a ${pace} con 2’ de trote`, "10’ vuelta a la calma"],
});
const QTEMPO = (min: string, pace: string): PlanStep => ({
  tag: `Tempo · ${min}`,
  steps: ["15’ calentamiento", `${min} continuos a ${pace} · FC 158–165`, "10’ vuelta a la calma"],
});

// Progresión de volumen: nunca más de 10% semanal y descarga cada cuarta semana.
function ramp(from: number, to: number, n: number, q: (i: number) => PlanStep, longs: string[]): HybridWeek[] {
  return Array.from({ length: n }, (_, i) => {
    const deload = i > 0 && (i + 1) % 4 === 0;
    const base = from + ((to - from) * i) / Math.max(1, n - 1);
    const runKm = Math.round(deload ? base * 0.7 : base);
    return {
      runKm,
      hours: Math.round((runKm / 8 + 4.5) * 2) / 2,
      note: deload ? "Descarga" : "Carga",
      long: longs[i % longs.length],
      quality: q(i),
      deload,
    };
  });
}

export type Block = {
  key: string;
  name: string;
  start: string; // lunes ISO
  weeks: HybridWeek[];
  kind: "hibrido" | "maraton" | "off";
};

/* Los bloques alternan quién manda. Subir volumen de correr y ganar músculo al mismo tiempo no
   funciona: en 2, 5 y 8 el objetivo es el gimnasio; en 4, 6 y 7 es correr. */
export const BLOCKS: Block[] = [
  /* El maratón del 20 de septiembre se canceló el 14: el bloque queda truncado a las tres
     semanas ya entrenadas (para que el histórico siga resolviendo) y, sin carrera que
     recuperar, la reconstrucción arranca directamente el 14 con 4 semanas de regalo. */
  { key: "maraton", name: "Maratón · afinamiento", start: "2026-08-24", kind: "maraton", weeks: [
    { runKm: 30, hours: 4.5, note: "Transición", long: "—", quality: easyRun(6) },
    { runKm: 45, hours: 6, note: "Última carga", long: "26–28 km", quality: easyRun(8) },
    { runKm: 32, hours: 4.5, note: "Descarga", long: "16 km", quality: QTEMPO("3 km", "6:45/km"), deload: true },
  ] },
  { key: "recon", name: "Reconstrucción + déficits", start: "2026-09-14", kind: "hibrido",
    weeks: ramp(20, 32, 14, (i) => (i < 3 ? Q_RECTAS : Q400(6 + Math.min(4, i - 3), "5:30/km")),
      ["70’", "80’", "85’", "60’"]) },
  { key: "fiestas", name: "Fiestas", start: "2026-12-21", kind: "off", weeks: [
    { runKm: 12, hours: 2, note: "Descanso real", long: "—", quality: easyRun(5) },
    { runKm: 12, hours: 2, note: "Descanso real", long: "—", quality: easyRun(5) },
  ] },
  { key: "base", name: "Base + fuerza", start: "2027-01-04", kind: "hibrido",
    weeks: ramp(30, 38, 8, (i) => (i < 4 ? Q400(10, "5:20/km") : Q800(5, "5:35/km")),
      ["80’", "90’", "95’", "65’"]) },
  { key: "vel1", name: "Velocidad 10k", start: "2027-03-01", kind: "hibrido",
    weeks: ramp(35, 42, 8, (i) => (i < 4 ? Q800(6, "5:25/km") : Q1000(5, "5:15/km")),
      ["85’", "95’", "100’", "70’"]) },
  { key: "hiper", name: "Hipertrofia prioritaria", start: "2027-04-26", kind: "hibrido",
    weeks: Array.from({ length: 8 }, () => ({
      runKm: 28, hours: 5.5, note: "Gimnasio manda · superávit +300 kcal",
      long: "70’", quality: easyRun(8), deload: true,
    })) },
  { key: "media", name: "Medio maratón", start: "2027-06-21", kind: "hibrido",
    weeks: ramp(38, 50, 8, (i) => (i < 4 ? Q1000(5, "5:10/km") : QTEMPO("25’", "5:20/km")),
      ["100’", "110’", "120’", "75’"]) },
  { key: "vel2", name: "Velocidad 10k II", start: "2027-08-16", kind: "hibrido",
    weeks: ramp(35, 45, 8, (i) => (i < 4 ? Q1000(6, "4:55/km") : QTEMPO("30’", "5:05/km")),
      ["85’", "95’", "100’", "70’"]) },
  { key: "defin", name: "Definición + test", start: "2027-10-11", kind: "hibrido",
    weeks: ramp(35, 40, 10, (i) => (i % 2 ? QTEMPO("30’", "4:55/km") : Q1000(6, "4:45/km")),
      ["85’", "90’", "95’", "65’"]) },
];

/* Las semanas del taper eran a medida. El maratón se canceló el 14 de septiembre: quedan las
   tres ya entrenadas (24 ago – 13 sep) para que el histórico siga mostrando lo que se hizo. */
const TAPER: Record<number, DayDef>[] = [
  // semana de transición: el bloque viejo terminó el 23 de agosto y el afinamiento arranca el 31
  wk([
    { dow: 1, day: "Lunes", s: [run("Rodaje suave", "Suave", easyRun(6))] },
    { dow: 2, day: "Martes", s: [g("espalda", "Gimnasio · espalda + bíceps"), sw("Natación · suelta", SWIM_SUAVE)] },
    { dow: 3, day: "Miércoles", s: [run("Rodaje suave", "Suave", easyRun(6))] },
    { dow: 4, day: "Jueves", s: [g("piernas", "Gimnasio · piernas + core"), sw("Natación · aeróbico", SWIM_AER)] },
    { dow: 5, day: "Viernes", s: [] },
    { dow: 6, day: "Sábado", s: [run("Rodaje largo", "Largo", longRunH("12 km"))] },
    { dow: 0, day: "Domingo", s: [walkS("40’")] },
  ]),
  wk([
    { dow: 1, day: "Lunes", s: [g("espalda", "Gimnasio · completo"), sw("Natación · suelta", SWIM_SUAVE)] },
    { dow: 2, day: "Martes", s: [run("Rodaje suave", "Suave", easyRun(8))] },
    { dow: 3, day: "Miércoles", s: [sw("Natación · aeróbico", SWIM_AER)] },
    { dow: 4, day: "Jueves", s: [run("Rodaje suave", "Suave", easyRun(6))] },
    { dow: 5, day: "Viernes", s: [] },
    { dow: 6, day: "Sábado", s: [run("Ensayo de maratón", "Largo", {
      tag: "26–28 km · 7:00/km",
      steps: ["Correr 9’ / caminar 1’ desde el km 1", "7:00/km, ni un segundo más rápido", "Probá desayuno, ropa y geles: es el ensayo", "Es la sesión que decide la carrera"] })] },
    { dow: 0, day: "Domingo", s: [walkS("40’")] },
  ]),
  wk([
    { dow: 1, day: "Lunes", s: [g("espalda", "Gimnasio · ligero"), sw("Natación · suelta", SWIM_SUAVE)] },
    { dow: 2, day: "Martes", s: [run("Rodaje suave", "Suave", easyRun(6))] },
    { dow: 3, day: "Miércoles", s: [sw("Natación · aeróbico", SWIM_AER)] },
    { dow: 4, day: "Jueves", s: [run("Rodaje con ritmo", "Medio", {
      tag: "8 km · 3 km a 6:45", steps: ["2,5 km suaves", "3 km a 6:45/km", "2,5 km suaves"] })] },
    { dow: 5, day: "Viernes", s: [] },
    { dow: 6, day: "Sábado", s: [run("Largo corto", "Largo", longRunH("16 km"))] },
    { dow: 0, day: "Domingo", s: [walkS("30’")] },
  ]),
];

/* helpers de los días a medida del taper */
function wk(rows: { dow: number; day: string; s: TemplateSession[] }[]): Record<number, DayDef> {
  const m: Record<number, DayDef> = {};
  rows.forEach((r) => (m[r.dow] = { dow: r.dow, day: r.day, rest: r.s.length === 0, sessions: r.s }));
  return m;
}
function g(routine: RoutineKey, name: string): TemplateSession {
  return { slot: "am", disc: "gym", name, intensity: "Medio", routine };
}
function run(name: string, intensity: Intensity, plan: PlanStep): TemplateSession {
  return { slot: "am", disc: "run", name, intensity, plan };
}
function sw(name: string, plan: PlanStep): TemplateSession {
  return { slot: "pm", disc: "swim", name, intensity: "Suave", plan };
}
function walkS(dur: string): TemplateSession {
  return { slot: "am", disc: "walk", name: "Caminata", intensity: "Suave", plan: { tag: dur, steps: [`${dur} a 5 km/h`, "Recuperación activa"] } };
}

/* Semana blanda: recuperación post-maratón y fiestas. El volumen de correr se reparte en tres
   troteos; con runKm 0 no se corre nada, que es lo que toca la semana siguiente al maratón. */
function buildOff(w: HybridWeek): Record<number, DayDef> {
  const km = Math.round(w.runKm / 3);
  const jog = (name: string) => (km > 0 ? [run(name, "Suave", easyRun(km))] : []);
  return wk([
    { dow: 1, day: "Lunes", s: [walkS("40’")] },
    { dow: 2, day: "Martes", s: [...jog("Trote suelto"), sw("Natación · suelta", SWIM_SUAVE)] },
    { dow: 3, day: "Miércoles", s: km > 0 ? [g("espalda", "Gimnasio · correctivo")] : [walkS("40’")] },
    { dow: 4, day: "Jueves", s: [...jog("Trote suelto"), sw("Natación · suelta", SWIM_SUAVE)] },
    { dow: 5, day: "Viernes", s: [walkS("40’")] },
    { dow: 6, day: "Sábado", s: jog("Rodaje suave") },
    { dow: 0, day: "Domingo", s: [] },
  ]);
}

const HYBRID_CACHE = new Map<string, Record<number, DayDef>>();

export type BlockPos = { block: Block; week: number; days: Record<number, DayDef> };

// Bloque y semana (0-based) a los que pertenece una fecha, o null si cae fuera del plan.
export function blockAt(d: Date): BlockPos | null {
  const mon = mondayOf(d).getTime();
  for (const b of BLOCKS) {
    const s = mondayOf(new Date(b.start + "T00:00:00")).getTime();
    const w = Math.round((mon - s) / (7 * 86400000));
    if (w < 0 || w >= b.weeks.length) continue;
    let days: Record<number, DayDef>;
    if (b.kind === "maraton") days = TAPER[w];
    else {
      const ck = `${b.key}:${w}`;
      days = HYBRID_CACHE.get(ck) ?? (b.kind === "off" ? buildOff(b.weeks[w]) : buildHybrid(b.weeks[w]));
      HYBRID_CACHE.set(ck, days);
    }
    return { block: b, week: w, days };
  }
  return null;
}

// Semana del plan viejo (0..5) o null. Se conserva para que jul–ago 2026 siga resolviendo igual.
export function planWeekIndex(d: Date): number | null {
  const start = mondayOf(PLAN_START).getTime();
  const mon = mondayOf(d).getTime();
  const wk = Math.floor(Math.round((mon - start) / 86400000) / 7);
  return wk >= 0 && wk < PLAN.length ? wk : null;
}

// Los 7 días de la semana que contiene `d`: primero los bloques nuevos, después el plan viejo.
function builtWeekFor(d: Date): Record<number, DayDef> | null {
  const pos = blockAt(d);
  if (pos) return pos.days;
  const i = planWeekIndex(d);
  return i == null ? null : BUILT[i];
}

export function dayDef(d: Date): DayDef {
  const wkDays = builtWeekFor(d);
  if (!wkDays) return { dow: d.getDay(), day: DOW_LONG[d.getDay()], rest: true, sessions: [] };
  return wkDays[d.getDay()];
}
// Reordenar días de una semana concreta: `map` (indexado por dow, 0=dom..6=sáb) da el dow de
// origen cuyo plan se muestra en cada día natural. El nombre y la fecha del día siguen siendo los
// reales; solo cambian las sesiones (y el descanso). El registro se mantiene por fecha natural.
export type WeekMap = number[];
export function isIdentityMap(m?: WeekMap | null): boolean {
  return !m || m.every((v, i) => v === i);
}
export function dayDefFor(d: Date, map?: WeekMap | null): DayDef {
  const wkDays = builtWeekFor(d);
  if (!wkDays || isIdentityMap(map)) return dayDef(d);
  const real = wkDays[d.getDay()];
  const src = wkDays[map![d.getDay()]];
  return { dow: real.dow, day: real.day, rest: src.rest, sessions: src.sessions };
}
export function weekMeta(d: Date): { num: number; total: number; phase: string; recovery: boolean } | null {
  const pos = blockAt(d);
  if (pos) {
    const w = pos.block.weeks[pos.week];
    return { num: pos.week + 1, total: pos.block.weeks.length, phase: pos.block.name, recovery: !!w.deload || pos.block.kind === "off" };
  }
  const i = planWeekIndex(d);
  if (i == null) return null;
  return { num: i + 1, total: PLAN.length, phase: PLAN[i].phase, recovery: !!PLAN[i].recovery };
}

/* ---------- plan importado del coach (override) ----------
   Un plan generado por el coach LLM se pega como JSON, se valida y se guarda como
   kind 'planoverride' (una entrada por semana, clave = lunes ISO). Cuando existe un
   override para una semana, sus días sustituyen al PLAN hardcodeado; la reordenación
   de días (weekmap) se sigue aplicando encima. */
export type PlanOverride = { monday: string; phase?: string; recovery?: boolean; days: DayDef[] };

export function resolveDayDef(d: Date, map?: WeekMap | null, override?: PlanOverride | null): DayDef {
  if (!override) return dayDefFor(d, map);
  const byDow: Record<number, DayDef> = {};
  for (const day of override.days) byDow[day.dow] = day;
  // un día que el override no incluye conserva el PLAN por defecto (override parcial seguro)
  const baseFor = (dow: number): DayDef => byDow[dow] ?? dayDefFor(addDays(d, dow - d.getDay()), null);
  const real = baseFor(d.getDay());
  if (isIdentityMap(map)) return real;
  const src = baseFor(map![d.getDay()]);
  return { dow: d.getDay(), day: real.day, rest: src.rest, sessions: src.sessions };
}

// Esquema del JSON de importación (se expone en /api/coach para que el LLM sepa el formato).
export const PLAN_IMPORT_SCHEMA = {
  description: "Plan de las próximas semanas. Pégalo en la app (Semana → Importar plan). Solo los días incluidos sustituyen al plan por defecto; los que omitas conservan el plan por defecto de esa fecha. El registro por fecha (lo ya entrenado) se conserva siempre.",
  shape: {
    weeks: [
      {
        monday: "YYYY-MM-DD (debe ser lunes)",
        phase: "opcional, p.ej. 'Carga (semana 3/6)'",
        recovery: "opcional, boolean (semana de descarga)",
        days: [
          {
            dow: "0=domingo … 6=sábado",
            day: "opcional, nombre visible (Lunes…)",
            rest: "opcional, boolean; si true, sessions puede ir vacío",
            sessions: [
              {
                slot: "'am' | 'pm'",
                disc: "'run' | 'swim' | 'bike' | 'gym' | 'walk'",
                name: "texto",
                intensity: "'Suave' | 'Medio' | 'Fuerte' | 'Largo'",
                routine: "opcional, solo gym: 'pull' | 'legs' | 'push'",
                plan: { tag: "opcional, etiqueta corta", steps: ["líneas de la sesión"] },
              },
            ],
          },
        ],
      },
    ],
  },
} as const;

const SLOTS = new Set(["am", "pm"]);
function validSession(s: unknown, ctx: string, errs: string[]): TemplateSession | null {
  if (typeof s !== "object" || s == null) { errs.push(`${ctx}: sesión no es un objeto`); return null; }
  const o = s as Record<string, unknown>;
  if (o.slot != null && !SLOTS.has(String(o.slot))) errs.push(`${ctx}: slot inválido "${o.slot}" (usa am/pm)`);
  if (!(String(o.disc) in DISC)) { errs.push(`${ctx}: disc inválido "${o.disc}"`); return null; }
  if (!(String(o.intensity) in INT)) { errs.push(`${ctx}: intensity inválida "${o.intensity}"`); return null; }
  if (typeof o.name !== "string" || !o.name.trim()) { errs.push(`${ctx}: falta name`); return null; }
  if (o.routine != null && !(String(o.routine) in ROUTINES)) errs.push(`${ctx}: routine inválida "${o.routine}"`);
  let plan: PlanStep | undefined;
  if (o.plan != null) {
    const p = o.plan as Record<string, unknown>;
    const steps = Array.isArray(p.steps) ? p.steps.filter((x) => typeof x === "string") as string[] : [];
    plan = { tag: typeof p.tag === "string" ? p.tag : undefined, steps };
  }
  return {
    slot: (o.slot === "pm" ? "pm" : "am") as Slot,
    disc: o.disc as Discipline,
    name: o.name.trim(),
    intensity: o.intensity as Intensity,
    routine: o.routine != null && String(o.routine) in ROUTINES ? (o.routine as RoutineKey) : undefined,
    plan,
  };
}

// Valida el JSON pegado. Todo-o-nada: si hay errores, no devuelve overrides.
export function validatePlanImport(raw: unknown): { overrides: PlanOverride[]; errors: string[] } {
  const errors: string[] = [];
  const root = raw as Record<string, unknown> | null;
  const weeksRaw = Array.isArray(root?.weeks) ? root!.weeks : Array.isArray(raw) ? (raw as unknown[]) : root?.monday ? [raw] : null;
  if (!weeksRaw) return { overrides: [], errors: ["El JSON debe tener un array 'weeks' (o ser una semana suelta con 'monday')."] };
  const overrides: PlanOverride[] = [];
  weeksRaw.forEach((w, wi) => {
    const o = w as Record<string, unknown>;
    const monday = String(o.monday ?? "");
    const ctxW = `semana #${wi + 1} (${monday || "sin fecha"})`;
    const d = /^\d{4}-\d{2}-\d{2}$/.test(monday) ? new Date(monday + "T00:00:00") : null;
    if (!d || isNaN(d.getTime())) { errors.push(`${ctxW}: monday no es una fecha YYYY-MM-DD válida`); return; }
    if (d.getDay() !== 1) errors.push(`${ctxW}: monday debe ser lunes`);
    const daysRaw = Array.isArray(o.days) ? o.days : null;
    if (!daysRaw) { errors.push(`${ctxW}: falta el array 'days'`); return; }
    const days: DayDef[] = [];
    daysRaw.forEach((dy) => {
      const dd = dy as Record<string, unknown>;
      const dow = Number(dd.dow);
      if (!Number.isInteger(dow) || dow < 0 || dow > 6) { errors.push(`${ctxW}: dow inválido "${dd.dow}"`); return; }
      const rest = !!dd.rest;
      const sessRaw = Array.isArray(dd.sessions) ? dd.sessions : [];
      const sessions = sessRaw.map((s, si) => validSession(s, `${ctxW} ${DOW_LONG[dow]} sesión ${si + 1}`, errors)).filter(Boolean) as TemplateSession[];
      days.push({ dow, day: typeof dd.day === "string" ? dd.day : DOW_LONG[dow], rest, sessions });
    });
    overrides.push({ monday: iso(d), phase: typeof o.phase === "string" ? o.phase : undefined, recovery: !!o.recovery, days });
  });
  return { overrides: errors.length ? [] : overrides, errors };
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
  { id: "barra_proteina", name: "Barra de proteína", kcal: 200, p: 20, c: 20, fat: 7, unit: true },
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
  { id: "merienda", name: "Merienda · pre-entreno", tag: "Antes de entrenar", foods: [{ id: "banana" }, { id: "shake" }, { id: "barra_proteina" }] },
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
// macros del plan de una comida: todos los alimentos a su ración por defecto; en un
// grupo "elige uno" (p.ej. cena) solo cuenta el primero para no inflar el total.
export function mealPlanMacros(meal: Meal, byId: Record<string, Food>): Macros {
  let m = ZERO;
  const seen = new Set<string>();
  for (const it of meal.foods) {
    if (it.group) { if (seen.has(it.group)) continue; seen.add(it.group); }
    m = addMac(m, serving(byId[it.id], itemAmount(it, byId[it.id], undefined)));
  }
  return m;
}
// total del plan: suma de todos los bloques (solo los alimentos listados)
export function planMacros(byId: Record<string, Food>): Macros {
  return MEALS.reduce((s, m) => addMac(s, mealPlanMacros(m, byId)), ZERO);
}
export function dayMacros(day: FoodDay | undefined, byId: Record<string, Food>): Macros {
  return MEALS.reduce((s, m) => addMac(s, mealMacros(m, day?.[m.id], byId)), ZERO);
}

/* ---------- carrera objetivo y volumen semanal recomendado ---------- */
/* Cada bloque de calidad termina en una carrera objetivo. La escala de 10k es progresiva: los
   4:00/km son alcanzables, pero exigen 60–80 km semanales y un físico más liviano que el que
   busca este plan. Sub-45 a fin de 2027 es el techo realista de un plan híbrido. */
export const RACES: { name: string; date: Date; goal?: string }[] = [
  { name: "10k · test", date: new Date(2026, 11, 20), goal: "Sub-57 · 5:42/km" },
  { name: "10k", date: new Date(2027, 1, 28), goal: "Sub-55 · 5:30/km" },
  { name: "10k", date: new Date(2027, 3, 25), goal: "Sub-52 · 5:12/km" },
  { name: "Medio maratón", date: new Date(2027, 7, 15), goal: "Sub-2:05" },
  { name: "10k", date: new Date(2027, 9, 10), goal: "Sub-48 · 4:48/km" },
  { name: "10k · test final", date: new Date(2027, 11, 19), goal: "Sub-45 · 4:30/km" },
];

// La carrera objetivo es la próxima que no pasó; si ya pasaron todas, la última.
export function raceAfter(d: Date): { name: string; date: Date; goal?: string } {
  return RACES.find((r) => mondayOf(r.date).getTime() >= mondayOf(d).getTime()) ?? RACES[RACES.length - 1];
}
export const RACE = raceAfter(new Date());

// semanas completas que faltan para la carrera (0 = semana de la carrera, negativo = ya pasó)
export function weeksToRace(d: Date): number {
  return Math.round((mondayOf(raceAfter(d).date).getTime() - mondayOf(d).getTime()) / (7 * 86400000));
}

// Objetivo orientativo por semana, indexado por semanas que faltan. La forma es la clásica de
// maratón: bloques de carga con una descarga cada 3–4 semanas, pico a 3 semanas y afinamiento
// las dos últimas. `runKm` es solo carrera; `hours` es el total de entreno (nado + bici + gym).
export type WeekTarget = { runKm: number; hours: number; note: string };
const TARGETS: WeekTarget[] = [
  { runKm: 50, hours: 6, note: "Semana de carrera" },      // 0 · incluye los 42,2 km del domingo
  { runKm: 30, hours: 4, note: "Afinamiento" },            // 1
  { runKm: 40, hours: 5.5, note: "Afinamiento" },          // 2
  { runKm: 55, hours: 8, note: "Pico" },                   // 3
  { runKm: 48, hours: 7, note: "Carga" },                  // 4
  { runKm: 52, hours: 7.5, note: "Carga" },                // 5
  { runKm: 36, hours: 5.5, note: "Descarga" },             // 6
  { runKm: 48, hours: 7, note: "Carga" },                  // 7
  { runKm: 44, hours: 6.5, note: "Carga" },                // 8
  { runKm: 40, hours: 6, note: "Construcción" },           // 9
  { runKm: 32, hours: 5, note: "Descarga" },               // 10
  { runKm: 38, hours: 6, note: "Construcción" },           // 11
];
const TARGET_BASE: WeekTarget = { runKm: 34, hours: 5.5, note: "Base" };

export function weekTarget(d: Date): WeekTarget | null {
  const pos = blockAt(d);
  if (pos) {
    const w = pos.block.weeks[pos.week];
    return { runKm: w.runKm, hours: w.hours, note: w.note };
  }
  const w = weeksToRace(d);
  if (w < 0) return null; // fuera del plan y sin carrera por delante
  return TARGETS[w] ?? TARGET_BASE;
}

/* ---------- agenda del día (planificación hora a hora) ----------
   `times` fija la hora de una sesión (planificada o extra) por su id; `notes` son entradas
   libres ("reunión con mi jefe"). Solo se guarda lo que rellenas: las horas vacías no existen. */
// categoría de una nota: define el icono y el color con que se muestra en el calendario
export type NoteCat = "trabajo" | "emprendimiento" | "estudio" | "idiomas" | "correr" | "nadar" | "bici" | "gimnasio" | "caminar" | "otro";
export const NOTE_CATS: Record<NoteCat, { label: string; icon: string; color: string }> = {
  trabajo: { label: "Trabajo", icon: "work", color: "var(--swim)" },
  emprendimiento: { label: "Emprendimiento", icon: "venture", color: "var(--bike)" },
  estudio: { label: "Estudio", icon: "study", color: "var(--gym)" },
  idiomas: { label: "Idiomas", icon: "lang", color: "var(--walk)" },
  correr: { label: "Correr", icon: "run", color: "var(--run)" },
  nadar: { label: "Nadar", icon: "swim", color: "var(--swim)" },
  bici: { label: "Bici", icon: "bike", color: "var(--bike)" },
  gimnasio: { label: "Gimnasio", icon: "gym", color: "var(--gym)" },
  caminar: { label: "Caminar", icon: "walk", color: "var(--walk)" },
  otro: { label: "Otro", icon: "note", color: "var(--muted)" },
};
export const DEFAULT_CAT: NoteCat = "otro";

export type AgendaNote = { id: string; at: string; text: string; cat?: NoteCat };
export type AgendaDay = { times?: Record<string, string>; notes?: AgendaNote[] };
// las entradas sin hora van al final al ordenar
export const AT_LAST = "99:99";

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
