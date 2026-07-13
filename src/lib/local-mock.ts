// Modo local sin Supabase ni SSO. Se activa con NEXT_PUBLIC_LOCAL_MOCK=1 (solo en tu .env.local).
// Con él, localhost no llama a Supabase (auth ni datos) ni a intervals.icu: usuario y actividades falsos,
// y el registro vive solo en localStorage. NUNCA lo pongas en producción.
import type { IcuActivity } from "@/lib/intervals";
import { iso, addDays } from "@/lib/domain";

export const LOCAL_MOCK = process.env.NEXT_PUBLIC_LOCAL_MOCK === "1";

export const MOCK_USER = { id: "local-mock-user", email: "local@tria.dev" };

// Actividad falsa con todo a null salvo lo que le pasemos: imita lo que llegaría sincronizado.
function act(over: Partial<IcuActivity> & Pick<IcuActivity, "id" | "date" | "disc" | "type">): IcuActivity {
  return {
    startLocal: over.date + "T08:00:00",
    name: null, distM: null, movingS: null, elapsedS: null, hr: null, hrMax: null,
    power: null, powerNp: null, powerMax: null, cad: null, cadMax: null,
    speedAvg: null, speedMax: null, elevGain: null, calories: null, load: null,
    intensity: null, hrZones: null, hrZoneTimes: null, feel: null, rpe: null,
    device: "Mock Watch", source: "LOCAL", trainer: false,
    ...over,
  };
}

// Un puñado de actividades en los últimos días (relativas a hoy) para poblar la app en local.
export function mockActivities(): IcuActivity[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = (n: number) => iso(addDays(today, n));
  return [
    act({ id: "m1", date: d(0), disc: "run", type: "Run", name: "Rodaje suave", distM: 8200, movingS: 3900, hr: 138, speedAvg: 8200 / 3900 }),
    act({ id: "m2", date: d(0), disc: "swim", type: "Swim", name: "Natación · series", distM: 1200, movingS: 1800, hr: 128 }),
    act({ id: "m3", date: d(-1), disc: "walk", type: "Walk", name: "Caminata", distM: 3100, movingS: 2400, hr: 104, speedAvg: 3100 / 2400 }),
    act({ id: "m4", date: d(-2), disc: "bike", type: "VirtualRide", name: "Rodillo Z2", distM: 24000, movingS: 3600, hr: 132, power: 165, cad: 88, trainer: true, speedAvg: 24000 / 3600 }),
    act({ id: "m5", date: d(-3), disc: "run", type: "Run", name: "Progresivo", distM: 6500, movingS: 3000, hr: 145, speedAvg: 6500 / 3000 }),
    act({ id: "m6", date: d(-4), disc: "gym", type: "Workout", name: "Gimnasio · tren superior", movingS: 3200, hr: 112 }),
  ];
}
