// Consejos: (1) feedback por actividad (coachAdvice) comparando tus datos con
// objetivos por disciplina/intensidad, y (2) una biblioteca de tips rotatorios
// para la pestaña Hoy. Umbrales calibrados para entrenamiento de fondo; ajústalos.
import type { Discipline, Intensity, LogData } from "@/lib/domain";
import type { IcuActivity } from "@/lib/intervals";

export type AdviceTone = "warn" | "good" | "tip";
export type Advice = { tone: AdviceTone; text: string };

const RUN_CAD_LOW = 165; // ppp: por debajo, zancada larga y lenta que castiga rodillas
const RUN_CAD_GOOD = 172;
const BIKE_CAD_LOW = 78; // rpm: pedalear "atragantado" carga las rodillas
const BIKE_CAD_GOOD = 85;
const EASY_HR_MAX = 150; // en día suave/largo la FC no debería pasar de aquí
const HARD_HR_MIN = 155; // en día fuerte, si no subes de aquí, te quedaste corto

const isEasy = (i: Intensity) => i === "Suave" || i === "Largo";
const num = (s?: string | null): number | null => {
  const n = parseFloat((s ?? "").toString());
  return isFinite(n) ? n : null;
};

// Genera 0–2 consejos para una sesión a partir de lo registrado (log) y, si hay,
// la actividad sincronizada de intervals.icu (cadencia/FC más ricas que el log).
export function coachAdvice(
  disc: Discipline,
  intensity: Intensity,
  log: LogData,
  act: IcuActivity | null,
): Advice[] {
  const out: Advice[] = [];
  const hr = num(log.hr) ?? act?.hr ?? null;
  const cad = disc === "bike" ? num(log.cad) ?? act?.cad ?? null : act?.cad ?? null;

  if ((disc === "run" || disc === "walk") && cad != null) {
    if (cad < RUN_CAD_LOW)
      out.push({ tone: "warn", text: `Cadencia baja (${Math.round(cad)} ppp). Pasos más cortos y rápidos, apunta a 175.` });
    else if (cad >= RUN_CAD_GOOD)
      out.push({ tone: "good", text: `Buena cadencia (${Math.round(cad)} ppp), así se cuidan las piernas.` });
  } else if (disc === "bike" && cad != null) {
    if (cad < BIKE_CAD_LOW)
      out.push({ tone: "warn", text: `Cadencia baja (${Math.round(cad)} rpm). Sube a 85–95 para descargar las rodillas.` });
    else if (cad >= BIKE_CAD_GOOD)
      out.push({ tone: "good", text: `Buena cadencia (${Math.round(cad)} rpm).` });
  }

  if (hr != null && disc !== "gym") {
    if (isEasy(intensity) && hr > EASY_HR_MAX)
      out.push({ tone: "warn", text: `Vas fuerte para un día suave (${Math.round(hr)} ppm). Afloja y recupera de verdad.` });
    else if (intensity === "Fuerte" && hr < HARD_HR_MIN)
      out.push({ tone: "tip", text: `Día fuerte pero la FC se quedó baja (${Math.round(hr)} ppm). Puedes apretar más.` });
  }

  return out.slice(0, 2);
}

/* ---------- biblioteca de tips (pestaña Hoy) ---------- */
export type TipCat = "run" | "swim" | "gym" | "nutri" | "general";
export type Tip = { cat: TipCat; text: string };
export const TIP_CAT: Record<TipCat, { label: string; color: string; icon: string }> = {
  run: { label: "Carrera", color: "var(--run)", icon: "run" },
  swim: { label: "Natación", color: "var(--swim)", icon: "swim" },
  gym: { label: "Fuerza", color: "var(--gym)", icon: "gym" },
  nutri: { label: "Nutrición", color: "var(--walk)", icon: "food" },
  general: { label: "General", color: "var(--accent)", icon: "today" },
};

const RUN_TIPS = [
  "Corre la mayoría de tus kilómetros en fácil: si no puedes hablar, vas demasiado rápido.",
  "Apunta a 170–180 pasos por minuto; pasos cortos y rápidos ahorran las rodillas.",
  "Aterriza con el pie bajo la cadera, no por delante, para frenar menos en cada zancada.",
  "Sube el volumen semanal como mucho un 10% para no invitar a las lesiones.",
  "Un día de series rinde más con 15' suaves de calentamiento y unas progresiones.",
  "Cuesta arriba: acorta la zancada y mantén la cadencia; que baje el ritmo, no el esfuerzo.",
  "En bajada relaja los hombros y deja correr; frenar cada paso destroza los cuádriceps.",
  "La tirada larga se corre cómoda: el objetivo es el tiempo en pie, no el ritmo.",
  "Alterna días duros y suaves; dos fuertes seguidos no te hacen más rápido, te cansan.",
  "Respira por la boca y lleva el aire al abdomen, no al pecho.",
  "Estrena zapatillas en rodajes cortos antes de usarlas en la tirada larga.",
  "Cambia de zapatillas cada 600–800 km; la espuma muerta ya no te protege.",
  "Corre relajado: mandíbula suelta, manos como si llevaras algo frágil sin romperlo.",
  "Las progresiones (acabar más rápido que empezar) enseñan a no salir a tope.",
  "Si algo duele y cambia tu forma de correr, para. Correr lesionado alarga la baja.",
  "Mete una semana suave cada 3–4 para asimilar la carga.",
  "El ritmo de maratón se entrena de a poco: bloques dentro de la tirada larga.",
  "Corre por terreno variado; el asfalto plano constante castiga los mismos tejidos.",
  "Los primeros 10 minutos siempre cuestan; no juzgues el día por ellos.",
  "Cuenta tu cadencia 15 segundos y multiplica por 4 si no tienes reloj.",
  "Hidrátate en tiradas de más de una hora; no esperes a tener sed.",
  "Fortalece gemelos y glúteos: casi toda lesión de corredor nace de una cadena débil.",
  "Corre erguido, como tirado por un hilo desde la coronilla.",
  "En el calor baja el ritmo y sube la sal; el crono ya volverá.",
  "Un rodaje de recuperación de verdad se corre incómodamente lento. Ese es el punto.",
];

const SWIM_TIPS = [
  "La técnica manda: nadar más fuerte con mala técnica solo te hunde.",
  "Alarga la brazada y agárrate al agua; cuenta brazadas por largo y baja ese número.",
  "Rota desde la cadera, no desde el hombro; nadar es girar sobre el eje del cuerpo.",
  "Exhala siempre bajo el agua; al girar solo deberías tener que inspirar.",
  "La cabeza mira al fondo, no al frente; la nuca alineada con la columna.",
  "Patea desde la cadera, piernas casi rectas y tobillos sueltos.",
  "Entra con la mano frente al hombro, sin cruzar la línea media.",
  "Series cortas con descanso enseñan velocidad; largos continuos, resistencia.",
  "Usa el pull buoy para aislar los brazos y sentir el agarre del agua.",
  "El material (palas, aletas) es herramienta, no muleta: úsalo con intención.",
  "Nada algunos largos concentrado solo en deslizar, sin buscar velocidad.",
  "Respira bilateral, cada 3 brazadas, para equilibrar los dos lados.",
  "Cuenta los largos por bloques; perder la cuenta es señal de ir disperso.",
  "Empuja el agua hacia atrás hasta la cadera; no saques la mano antes de tiempo.",
  "Relaja la mano: dedos algo separados agarran más agua que un puño tenso.",
  "Calienta hombros y espalda fuera del agua antes de la primera serie fuerte.",
  "Cuerpo alto y horizontal; las caderas que caen frenan más que unos brazos lentos.",
  "Vira eficiente: menos tiempo en la pared es más ritmo real.",
  "Alterna estilos algún día; espalda y pecho equilibran los hombros del crol.",
  "En aguas abiertas levanta la vista un instante cada varias brazadas para no desviarte.",
  "La respiración es un giro de cabeza, no un levantón: una gafa dentro, una fuera.",
  "Nada suave el día después de una sesión dura de piernas.",
  "La constancia gana a la intensidad: tres nados cortos rinden más que uno largo aislado.",
  "Enfría 100–200 m suaves al final; ayuda a soltar los hombros.",
  "Cuida el cloro: aclárate y usa crema; la piel irritada te quita ganas de volver.",
];

const GYM_TIPS = [
  "La fuerza no te pone lento: te hace más económico y resistente a lesiones.",
  "Prioriza la técnica sobre el peso; una sentadilla mal hecha resta, no suma.",
  "Progresa poco a poco: sube peso o repes solo cuando controlas el actual.",
  "Trabaja glúteos y core: son el motor y la estabilidad del corredor y nadador.",
  "Descansa 48 h un grupo muscular antes de volver a cargarlo fuerte.",
  "Baja controlando la fase excéntrica; ahí se construye gran parte de la fuerza.",
  "Exhala en el esfuerzo, inhala al bajar; no aguantes la respiración.",
  "Calienta con series ligeras antes de ir a por los pesos serios.",
  "Peso muerto y sentadilla dan más que diez máquinas de aislamiento.",
  "El core no es solo abdominales: planchas y anti-rotación protegen tu espalda.",
  "Rango completo antes que peso; media repetición es medio resultado.",
  "Registra tus series; lo que no se mide no progresa.",
  "Para fondista, un buen entreno de fuerza es corto e intenso, no eterno.",
  "Trabaja una pierna cada vez (zancadas, búlgaras) para corregir descompensaciones.",
  "La movilidad de tobillo y cadera mejora tu zancada más que estirar sin más.",
  "No entrenes fuerza pesada el día antes de una sesión clave de carrera.",
  "Si te tiembla la técnica en la última repe, esa repe sobra.",
  "Fortalece la espalda alta: contrarresta la silla y mejora tu postura al nadar.",
  "Gemelos y sóleo aguantan toneladas al correr; entrénalos directamente.",
  "Descansa entre series lo suficiente para que la siguiente sea de calidad.",
  "Empieza por lo pesado y técnico cuando estás fresco; deja lo accesorio al final.",
  "Añade trabajo de equilibrio a una pierna; correr es saltar de un pie a otro.",
  "Dos días por semana ya cambian tu cuerpo; no hace falta vivir en el gym.",
  "Estira o usa el foam roller después, no como excusa para saltarte la fuerza.",
  "Si vienes de parón, empieza con la mitad del peso que crees que puedes.",
];

const NUTRI_TIPS = [
  "Bebe a lo largo del día; llegar hidratado vale más que beber a última hora.",
  "En esfuerzos de más de 60–90 min mete 30–60 g de carbohidratos por hora.",
  "Tras entrenar fuerte, come proteína e hidratos en la primera hora.",
  "No estrenes geles ni comida nueva el día de la carrera; pruébalo en entrenos.",
  "El color de tu orina es un termómetro: claro bien, oscuro bebe más.",
  "Los hidratos son gasolina de fondo; no les tengas miedo si entrenas en serio.",
  "Reparte la proteína en el día (20–30 g por comida) en vez de toda de golpe.",
  "En el calor añade sal/electrolitos, no solo agua, para no vaciarte de sodio.",
  "Come suficiente: entrenar mucho y comer poco es la receta de la lesión.",
  "Prioriza comida real; los geles son para entrenar y competir, no para vivir.",
  "Un desayuno con hidratos 2–3 h antes de la tirada larga rinde más que ir en ayunas.",
  "La cafeína antes de una sesión dura ayuda; pruébala en entrenos, no en carrera.",
  "Verduras y fruta a diario: el rendimiento también se construye con micronutrientes.",
  "Recupera con algo de sal si has sudado mucho; el agua sola no repone electrolitos.",
  "Grasa buena (oliva, frutos secos, pescado) sostiene tus hormonas y tu energía.",
  "No entrenes fuerte en ayunas de forma habitual si buscas calidad en las sesiones.",
  "La fibra es tu amiga, pero no justo antes de correr: elígela con cabeza.",
  "Duerme bien: ninguna comida compensa el déficit de sueño para recuperar.",
  "Pésate antes y después de la tirada larga; cada kilo perdido es medio litro a reponer.",
  "El alcohol frena la recuperación y el sueño; modéralo en semanas de carga.",
  "Ten hidratos a mano justo después del entreno duro; la ventana existe, aprovéchala.",
  "Come algo ligero y rico en hidratos 30–60 min antes de una sesión intensa.",
  "Escucha el hambre: entrenar dispara tus necesidades, no las ignores.",
  "Hierro y vitamina D suelen fallar en fondistas; revísalos por analítica si estás plano.",
  "La hidratación de una sesión larga empieza el día antes, no esa misma mañana.",
];

const GENERAL_TIPS = [
  "El descanso es entrenamiento: mejoras al recuperar, no al machacarte.",
  "Duerme 7–9 h: es el suplemento más potente y barato que existe.",
  "La constancia bate a la intensidad: mejor 6 semanas regulares que 1 heroica.",
  "Fatiga que no baja, pulso alto en reposo o mal humor piden descanso.",
  "Registra tus sesiones; ver el progreso motiva en los días grises.",
  "Un mal entreno no arruina nada; una racha avisa de que algo sobra.",
  "Calienta antes de lo intenso; enfría después para volver a la calma.",
  "Ajusta el plan a la vida, no la vida al plan; el mejor plan es el que cumples.",
  "Compárate contigo mismo, no con el de al lado; cada cuerpo va a su ritmo.",
  "Regla del 10%: sube la carga poco a poco y tu cuerpo lo agradecerá.",
  "Ten un objetivo (tu carrera) y deja que cada semana sume hacia él.",
  "Los nervios previos son normales; un buen calentamiento los vuelve energía.",
  "Cuida los pequeños dolores antes de que se hagan grandes.",
  "Planifica semanas suaves: bajar para luego subir más no es perder el tiempo.",
  "Muévete también los días libres: caminar cuenta y ayuda a recuperar.",
  "La motivación va y viene; los hábitos son los que te sacan por la puerta.",
  "Menos pantalla de noche = mejor sueño = mejor entreno mañana.",
  "Prepara la ropa la noche antes; quitar fricción es la mejor táctica para cumplir.",
  "El estrés de la vida y el del entreno suman; en semanas duras de trabajo, baja volumen.",
  "Un paseo al sol y algo de movilidad valen más que un día entero de sofá.",
  "Ten paciencia: la forma tarda semanas en llegar y días en notarse.",
  "Celebra los pequeños logros; el maratón se construye con días normales.",
  "Revisa tu material con tiempo, no la víspera de la carrera.",
  "Respira lento 5 minutos antes de dormir; mejora tu recuperación.",
  "Entrena la cabeza: visualiza los tramos duros y cómo los vas a superar.",
];

// Se intercalan por categoría para que al pasar de uno a otro cambie el tema.
function interleave(groups: Tip[][]): Tip[] {
  const out: Tip[] = [];
  const max = Math.max(...groups.map((g) => g.length));
  for (let i = 0; i < max; i++) for (const g of groups) if (g[i]) out.push(g[i]);
  return out;
}
const tag = (cat: TipCat) => (text: string): Tip => ({ cat, text });
export const TIPS: Tip[] = interleave([
  RUN_TIPS.map(tag("run")),
  NUTRI_TIPS.map(tag("nutri")),
  SWIM_TIPS.map(tag("swim")),
  GENERAL_TIPS.map(tag("general")),
  GYM_TIPS.map(tag("gym")),
]);
