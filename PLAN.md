# Plan híbrido · septiembre 2026 → diciembre 2027

Objetivo: un cuerpo atlético y funcional. Ni corredor puro ni gimnasio puro. Correr rápido
en 10k sin perder músculo, y ganar volumen donde hoy falta.

Escrito el 30 de agosto de 2026 a partir de los datos de la app (`tria-datos-2026-08-30.json`)
y del `analisis-fisico.md`. Todo lo que sigue se revisa cuando lleguen mediciones reales
(composición corporal, evaluación funcional) en vez de fotos.

---

## 1. Punto de partida — lo que dicen los datos

### Correr

El registro tenía dos poblaciones mezcladas. Corregidas:

| dónde | ritmo real | FC media | qué es en realidad |
|---|---|---|---|
| Cinta a 7,5 km/h | **8:00/km** | 118–139 | rodaje Z2 correcto |
| Caminar a 5 km/h | **12:00/km** | 79–95 | recuperación |
| Calle (15k, 15k, 21k) | **6:22–6:48/km** | 150–159 | ritmo medio, no suave |

La app venía calculando 5:23–5:47/km en cinta porque el reloj infla la distancia sin GPS.
Con la corrección, el volumen semanal real es bastante menor:

| semana | km que decía la app | km reales |
|---|---|---|
| 13 jul | 33,7 | 29,8 |
| 20 jul | 16,6 | 13,1 |
| 27 jul | 30,0 | 25,8 |
| 3 ago | 16,6 | 11,7 |
| 10 ago | 7,2 | 5,2 |
| 17 ago | 31,6 | 29,6 |
| 24 ago | 7,0 | 7,0 |

**Promedio real: ~17 km/semana.** Referencia útil de la tirada larga: 21,63 km en 2:17:47
(6:22/km, FC 159) el 23 de agosto.

### El error central: no hay días fáciles ni días duros

Todo se corre en la franja media. Las tiradas de calle a FC 150-159 son demasiado duras para
ser rodaje, y no son lo bastante duras ni lo bastante cortas para ser calidad. La cinta a
8:00/km con FC 118-139 sí es Z2 legítima — el problema es que la leías como "voy lento".

Esto es exactamente lo que arreglan las pasadas que te recomendaron, pero no funcionan solas:
hay que **bajar los días fáciles al mismo tiempo que subís los duros**. Si metés pasadas sobre
la base actual, sumás fatiga sin ganar velocidad.

Regla de todo el plan: **80% del volumen por debajo de FC 140. 20% duro de verdad.**

### Gimnasio

En el bloque del plan (13 jul – 23 ago) había 18 sesiones de gym planificadas: 4 con pesos
cargados, 7 marcadas hechas sin ningún peso, 7 sin nada. Cargas registradas:

| ejercicio | carga |
|---|---|
| Sentadilla | 150 × 8 |
| Press banca | 90 |
| Dominadas | 80 → 85 |
| Remo | 30 × 8 → 40 → 55 × 5 |
| Vuelos laterales | 6 kg × 1 rep |

El desbalance del `analisis-fisico.md` acá deja de ser una impresión visual y se vuelve un
número: **el tirón horizontal se entrena con la mitad de carga que el empuje**, y el deltoides
lateral —lo que más cambiaría la silueta— está registrado con 6 kg.

### Corrección al `analisis-fisico.md`

Ese documento recomienda "agregar remo" y "elevaciones laterales". Los dos ya estaban en la
rutina (`domain.ts:50`). El problema nunca fue la selección de ejercicios: fue la carga y la
adherencia. Lo que sí faltaba de verdad: **face pull, pájaros y press inclinado**.

---

## 2. Bloque 0 — Maratón del 20 de septiembre (3 semanas)

Esto va primero porque ya está encima y no se puede reprogramar.

### Realidad del maratón

Tu tirada más larga son 21,6 km y venís de ~17 km/semana. Un maratón se corre normalmente
sobre 8-12 semanas de 40-60 km/semana y tiradas largas de 30-32 km. **No estás en ese punto**,
y tres semanas no alcanzan para llegar: todo lo que se puede construir de acá al 20 ya está
construido. Lo único que queda por hacer es llegar entero.

La proyección de Riegel desde tu 21k da 4:40 (6:38/km). Con tu volumen real eso es optimista:
lo que la fórmula no ve es que a partir del km 30 la falta de kilómetros acumulados se cobra
sola. **Objetivo honesto: 5:00–5:30, con estrategia de correr/caminar desde el arranque.**

Estrategia sugerida: 9 minutos corriendo a 7:00/km + 1 minuto caminando, desde el kilómetro 1
—no desde que aparece el cansancio—. Suena lento y por eso funciona: protege el tren inferior
justo donde tu preparación se termina. Si en el km 32 te sentís bien, ahí soltás.

Si existe la opción de cambiar la inscripción a los 21k, es la decisión deportivamente correcta:
tenés preparación para hacer un buen medio maratón y no para un maratón.

### Las tres semanas

| semana | lun | mar | mié | jue | vie | sáb | dom |
|---|---|---|---|---|---|---|---|
| **31 ago – 6 sep**<br>última carga | Gym completo 45' | Rodaje 8 km @ 7:45 | Nado 45' | Rodaje 6 km @ 7:45 | Descanso | **Largo 26–28 km @ 7:00** | Caminata 40' |
| **7 – 13 sep**<br>descarga | Gym ligero 35' | Rodaje 6 km @ 7:45 | Nado 40' | Rodaje 8 km con 3 km @ 6:45 | Descanso | **Largo 16 km @ 7:00** | Caminata 30' |
| **14 – 20 sep**<br>afinamiento | Rodaje 5 km @ 8:00 | Descanso | Rodaje 5 km con 4×400 m @ 6:00 | Descanso | Trote 3 km flojo | Descanso | **MARATÓN** |

Notas del bloque:
- El largo del 5 de septiembre es la sesión que decide la carrera. Corrélo a 7:00/km, no más
  rápido, y con la misma estrategia de correr/caminar que vas a usar el día 20. Es un ensayo,
  no un test.
- Nada de gimnasio de piernas en las últimas dos semanas.
- Sin pasadas de verdad hasta después del maratón. Ese trabajo empieza en el Bloque 2.
- Probá el desayuno, la ropa y los geles en el largo del 5. Nada nuevo el día de la carrera.

---

## 3. La semana tipo (desde octubre)

Seis mañanas de entrenamiento, un día completo libre. **Ninguna sesión pasa de 60 minutos.**

| día | mañana | tarde |
|---|---|---|
| **Lunes** | Gym 1 · Espalda horizontal + bíceps (55') | Natación · técnica (45') |
| **Martes** | Running · calidad / pasadas (55') | Bici Z2 regenerativa (40') · opcional |
| **Miércoles** | Gym 2 · Piernas + core (55') | Natación · aeróbico (45') |
| **Jueves** | Running · Z2 fácil (50') | Descanso o caminata |
| **Viernes** | Gym 3 · Empuje + hombro + brazos (55') | Bici Z2 (45') |
| **Sábado** | Running · tirada larga (60–100') | Libre |
| **Domingo** | Descanso total | — |

Reparto: 3 gimnasio (1 de piernas), 3 running, 2 natación, 2 bici.

### Por qué está ordenada así

- **Piernas el miércoles**, no lunes ni viernes. Queda a 3 días de la tirada larga del sábado y
  a un día de distancia de la calidad del martes. Es el único hueco de la semana donde no
  compromete una sesión de correr.
- **El déficit el lunes**, con el cuerpo fresco después del domingo libre. Lo que más te falta
  entrena primero, no al final cuando ya no queda energía.
- **Calidad el martes y largo el sábado**: 72 horas de separación entre las dos sesiones duras
  de correr. El jueves va en medio y va **fácil de verdad** — ese es el día que hoy no existe.
- **La bici después de piernas** (miércoles) es a resistencia baja y sirve de recuperación
  activa, no de entrenamiento.
- **Natación prioritaria en las tardes** porque es el cross-training que no le cobra nada al
  tren inferior: suma trabajo aeróbico sin impacto ni fatiga en las piernas.

---

## 4. Las tres sesiones de gimnasio

Compuestos como columna vertebral —es como venís entrenando y funciona—, con el trabajo
accesorio apuntado a lo que falta. Cinco ejercicios por sesión para entrar en la hora.

### Gym 1 · Espalda horizontal + bíceps · lunes

| ejercicio | series × reps | por qué |
|---|---|---|
| Remo con barra | 4 × 6–8 | Compuesto del plano que falta. Codos a 60-90°, no pegados al torso. |
| Remo unilateral con mancuerna | 3 × 10–12 | Rango completo, corrige asimetrías, protocolo de escápula. |
| Face pull | 3 × 15–20 | Deltoides posterior + rotadores externos. Lo que menos entrenaste nunca. |
| Pájaros inclinado | 3 × 15 | Deltoides posterior directo, aislado. |
| **Curl inclinado con mancuernas** | 3 × 10–12 | Bíceps en estiramiento máximo. |

### Gym 2 · Piernas + core · miércoles

| ejercicio | series × reps | por qué |
|---|---|---|
| Sentadilla | 4 × 5 | Mantener la fuerza que ya tenés. Series cortas: no vaciarse. |
| Peso muerto rumano | 3 × 8 | Isquiotibiales. Déficit clásico del corredor con cuádriceps fuerte. |
| Búlgara / zancada | 3 × 10 por pierna | Unilateral. Ataca el valgo de rodilla vía glúteo medio. |
| Elevación de gemelo **sentado** | 3 × 15 | Sóleo. Absorbe 6-8× tu peso en cada zancada. |
| Pallof press / plancha lateral | 3 × 30–40" | Core anti-rotación, no abdominales de flexión. |

### Gym 3 · Empuje + hombro + brazos · viernes

| ejercicio | series × reps | por qué |
|---|---|---|
| Press inclinado | 4 × 6–8 | Pecho superior — el pectoral se te ve más desarrollado abajo. |
| Dominadas | 3 × máximas | Mantiene el tirón vertical, que ya tenés bien. |
| **Elevaciones laterales** | 4 × 15–20 | Prioridad #1 de silueta. Hoy están en 6 kg × 1. |
| Fondos o press cerrado | 3 × 8 | Tríceps: dos tercios del volumen del brazo. |
| **Curl martillo** | 3 × 12 | Braquial y braquiorradial. |

### El balance que produce, por semana

| grupo | series | antes |
|---|---|---|
| Tirón horizontal + posterior | 13 | 3-4 |
| Empuje horizontal | 7 | 7 |
| Deltoides lateral | 4 | 3 (a 6 kg) |
| Bíceps directo | 6 | 3 |
| Tríceps directo | 3 | 0 |

El ratio tirón:empuje queda **~2:1**, que es lo que pide el `analisis-fisico.md` hasta emparejar.
Después de 6 meses se baja a 1,5:1 y se sostiene ahí.

### Sobre los brazos

Bíceps más marcado son tres cosas distintas y hay que atacar las tres:

1. **Tamaño.** El curl inclinado es la mejor variante porque trabaja la porción larga en
   estiramiento, que es donde más crece. Dos sesiones semanales de bíceps directo (lunes y
   viernes) más el remo y las dominadas alcanzan.
2. **El bíceps se ve alto cuando el braquial está desarrollado.** El braquial va debajo del
   bíceps y lo empuja hacia arriba. Se entrena con martillo y curl invertido. Esto es lo que
   la mayoría no hace y es la mitad del efecto que buscás.
3. **Definición.** Un bíceps de 40 cm al 20% de grasa se ve peor que uno de 37 cm al 13%. La
   marca depende más de la composición que del tamaño, y eso se resuelve en el Bloque 8.

Nota realista: el brazo es el grupo que más lento crece y el que menos responde al volumen
extra. 6 series semanales bien ejecutadas y progresadas rinden más que 15 apuradas.

### Deficiencias probables que las fotos no mostraban

Vos entrenaste siempre compuestos. Eso cubre bien lo grande y deja huecos previsibles —
además de los que ya sabemos (trapecio medio, romboides, deltoides posterior y lateral,
pecho superior):

| zona | por qué falta con puro compuesto | dónde está en el plan |
|---|---|---|
| **Sóleo** | La sentadilla y el gemelo de pie trabajan el gastrocnemio. El sóleo solo se activa con rodilla flexionada, y es el músculo que más carga soporta al correr. | Gym 2 |
| **Isquiotibiales** | Sentadilla y prensa son dominantes de cuádriceps. Con 150 kg de sentadilla el desbalance isquio/cuádriceps es casi seguro. | Gym 2 |
| **Glúteo medio** | No trabaja en ningún patrón bilateral. Es la causa más probable de tu convergencia de rodillas. | Gym 2 |
| **Rotadores externos** | Se atrofian con mucho press. Es de donde salen la mayoría de los hombros lesionados. | Face pull, Gym 1 |
| **Serrato anterior** | Conectado a las escápulas que se te marcan. | Protocolo escapular en el remo |
| **Core anti-rotación** | El compuesto lo trabaja isométrico y nunca en rotación. | Pallof, Gym 2 |
| **Tibial anterior** | Antagonista del gemelo. Débil = periostitis al subir kilómetros. | Ver abajo |

Dos minutos al final de Gym 2: caminar sobre talones 3 × 30 m para el tibial anterior. No es
glamoroso y es lo que evita que el aumento de volumen de correr te lesione.

---

## 5. Correr — de 6:22 a los 4:00

### La escala honesta

Tu 10k estimado hoy, proyectado desde el medio maratón, es **~62 minutos (6:14/km)**.

| meta | ritmo | 10k | cuándo | realista |
|---|---|---|---|---|
| Sub-57 | 5:42/km | 57:00 | dic 2026 | sí |
| Sub-55 | 5:30/km | 55:00 | feb 2027 | sí |
| Sub-52 | 5:12/km | 52:00 | abr 2027 | sí |
| Sub-50 | 5:00/km | 50:00 | jun 2027 | sí, con constancia |
| Sub-48 | 4:48/km | 48:00 | ago 2027 | exigente |
| Sub-45 | 4:30/km | 45:00 | dic 2027 | techo del plan |
| Sub-40 | 4:00/km | 40:00 | 2029+ | solo priorizando correr |

Sobre los 4:00/km: **es alcanzable, pero no en este plan y no con este cuerpo.** 40 minutos en
10k exige 60-80 km semanales y una relación potencia/peso que empuja hacia un físico de
corredor —menos masa arriba, más liviano—, que es justo lo contrario de lo que querés construir.
Elegir híbrido es elegir un techo de velocidad más bajo. El intercambio vale la pena; lo que no
vale es fingir que no existe.

**4:30/km a fin de 2027 con hombros y espalda más grandes que hoy es un resultado mejor** que
4:00/km delgado, si el objetivo es un cuerpo atlético y funcional.

### Ritmos de trabajo hoy

| tipo | ritmo | cinta | FC |
|---|---|---|---|
| Recuperación / caminar | 12:00/km | 5,0 km/h | < 100 |
| **Rodaje fácil (Z2)** | **7:45–8:00/km** | **7,5–7,7 km/h** | **< 140** |
| Tirada larga | 7:00–7:30/km | 8,0–8,6 km/h | 140–148 |
| Tempo / umbral | 6:15–6:30/km | 9,2–9,6 km/h | 158–165 |
| Pasadas 1000 m | 5:50–6:00/km | 10,0–10,3 km/h | 168+ |
| Pasadas 400 m | 5:30–5:45/km | 10,4–10,9 km/h | máximo |

### Tabla de cinta — km/h a min/km

| km/h | min/km | | km/h | min/km |
|---|---|---|---|---|
| 5,0 | 12:00 | | 10,0 | 6:00 |
| 6,0 | 10:00 | | 10,5 | 5:42 |
| 7,0 | 8:34 | | 11,0 | 5:27 |
| **7,5** | **8:00** | | 11,5 | 5:13 |
| 8,0 | 7:30 | | 12,0 | 5:00 |
| 8,5 | 7:03 | | 13,0 | 4:36 |
| 9,0 | 6:40 | | 14,0 | 4:17 |
| 9,5 | 6:18 | | 15,0 | 4:00 |

Pegá esta tabla en el celular. Cada meta de la escala de arriba es un número de cinta:
sub-55 es **10,9 km/h**, sub-50 es **12,0 km/h**, sub-45 es **13,3 km/h**.

### Las pasadas, en orden

No todas las pasadas hacen lo mismo y el orden importa. Se introducen así:

**Fase A — mecánica (oct–nov 2026).** Rectas en progresión: 6-8 × 20 segundos rápido con
90 segundos de trote entre medio, al final de un rodaje fácil. No es entrenamiento
cardiovascular, es enseñarle a las piernas a moverse rápido después de meses a 8:00/km.
Sin esto, las pasadas de verdad se corren con zancada de rodaje y no sirven.

**Fase B — VO2 corto (dic 2026 – feb 2027).** 6-8 × 400 m a 5:30/km, 90" de recuperación
trotando. Subir a 10 × 400 m antes de cambiar el ritmo.

**Fase C — VO2 largo (mar–may 2027).** 5-6 × 800 m a 5:40/km, 2' de recuperación. Después
4-5 × 1000 m. Esta es la sesión que más sube el 10k.

**Fase D — umbral (jun 2027 en adelante).** 20-30 minutos continuos a ritmo tempo, o
3 × 10' con 2' de trote. Menos divertido que las pasadas y más determinante para 10k.

Una sola sesión de calidad por semana, siempre el martes. Dos por semana es lo que rompe a
la gente que entrena híbrido, porque el gimnasio ya aporta su propia carga.

---

## 6. Los bloques hasta diciembre de 2027

| # | período | sem | foco | volumen correr | gimnasio | meta |
|---|---|---|---|---|---|---|
| **0** | 31 ago – 20 sep 26 | 3 | Taper maratón | 30 → 15 km | mantenimiento | Terminar el maratón entero |
| **1** | 21 sep – 11 oct 26 | 3 | Recuperación | 0 → 15 km | suave, correctivo | Volver sin lesión |
| **2** | 12 oct – 20 dic 26 | 10 | Reconstrucción + déficits | 20 → 32 km | **prioridad alta** | 10k sub-57 |
| — | 21 dic – 3 ene 27 | 2 | Fiestas | libre | libre | Descanso real |
| **3** | 4 ene – 28 feb 27 | 8 | Base + fuerza | 30 → 38 km | alta | 10k sub-55 |
| **4** | 1 mar – 25 abr 27 | 8 | Velocidad 10k | 35 → 42 km | mantenimiento | **10k sub-52** |
| **5** | 26 abr – 20 jun 27 | 8 | Hipertrofia prioritaria | 28 km fijo | **máxima** | Ganar hombro/espalda/brazo |
| **6** | 21 jun – 15 ago 27 | 8 | Medio maratón | 38 → 50 km | mantenimiento | **21k sub-2:05** |
| **7** | 16 ago – 10 oct 27 | 8 | Velocidad 10k II | 35 → 45 km | mantenimiento | **10k sub-48** |
| **8** | 11 oct – 19 dic 27 | 10 | Definición + test | 35 → 40 km | alta, en déficit | **10k sub-45 · 12-13% grasa** |

### Cómo leer la tabla

**No se puede subir volumen de correr y ganar músculo al mismo tiempo.** Por eso los bloques
alternan cuál manda. En los bloques 2, 5 y 8 el gimnasio es el objetivo y correr se mantiene.
En los bloques 4, 6 y 7 es al revés. Intentar los dos a la vez todo el año es la receta para
no progresar en ninguno — que es más o menos lo que venía pasando.

**Bloque 1 · recuperación post-maratón.** Tres semanas sin correr rápido. Primera semana: nada
o caminatas. Segunda: trote suave día por medio. Tercera: vuelta a la rutina. El maratón deja
daño muscular que tarda más en irse de lo que se siente. Es también el momento ideal para
empezar el trabajo correctivo con el cuerpo descansado.

**Bloque 2 · el más importante del plan.** Diez semanas donde el gimnasio manda y correr se
reconstruye desde abajo pero bien: 80% fácil de verdad. Acá se instala la semana tipo, se
instalan las cargas nuevas de remo, face pull y laterales, y se hace la Fase A de pasadas.
Las ganancias de músculo en zonas nunca entrenadas son rápidas los primeros 3-4 meses — el
remo y los laterales van a subir de carga semana a semana. Aprovechá esa ventana.

**Bloque 5 · el único con superávit calórico.** Ocho semanas comiendo por encima del
mantenimiento (+250-300 kcal), corriendo fijo 28 km/semana sin calidad. Es donde de verdad se
ganan los hombros y la espalda. Vas a subir algo de grasa: es parte del trato y se limpia en
el bloque 8.

**Bloque 8 · la definición.** Recién acá se busca el 12-13%. Déficit moderado (-400 kcal),
proteína 1,8-2,2 g/kg, gimnasio alto para retener lo construido. Bajar grasa al final y no al
principio significa que llegás a diciembre de 2027 con el músculo ya hecho — que es el orden
que recomienda el `analisis-fisico.md` y el que hace que el resultado se vea.

### Progresión de volumen de correr

Regla: **no subir más del 10% semanal, y bajar un 30% cada cuarta semana.** Con tu historial
de 17 km/semana, cualquier salto brusco a 40 km termina en periostitis o fascitis.

Ejemplo del bloque 2 (10 semanas): 20 · 22 · 24 · **17** · 26 · 28 · 30 · **21** · 32 · **24**

Las semanas en negrita son de descarga y no son opcionales.

---

## 7. Lo que hay que medir

Este plan está construido sobre fotos y sobre datos de entrenamiento. Le faltan cosas que
solo se saben midiendo:

| qué | cuándo | para qué |
|---|---|---|
| Composición corporal (DEXA o bioimpedancia buena) | Antes del bloque 2 y al final de cada bloque | El 20-22% es una estimación visual. Sin el número real, el déficit del bloque 8 se planifica a ciegas. |
| Test de FC máxima en campo | Bloque 2, semana 3 | Todas las zonas de este plan son estimadas. Un test de 10 minutos las vuelve reales. |
| Evaluación funcional con kinesiólogo | Cuanto antes | El valgo de rodilla bajo 150 kg de sentadilla es el único hallazgo con riesgo real de lesión. |
| Ergometría | Antes del bloque 4 | Obligatoria antes de subir volumen e intensidad. |
| Control de asma | Antes del bloque 2 | Aparece tres veces como condicionante en el plan viejo. Entrenar volumen alto con asma no controlada tiene techo. |
| Test de 10k | Fin de cada bloque | Es el que valida o corrige toda la escala de ritmos. |

Cuando llegue el archivo con las mediciones reales, lo que más probablemente cambie: las zonas
de FC, el porcentaje de grasa de partida y —según lo que diga el kinesiólogo— el volumen de
sentadilla del bloque 2.

---

## 8. Nutrición, en dos líneas

No es un plan nutricional, son las dos reglas que sostienen todo lo de arriba:

- **Proteína 1,8-2,2 g/kg todos los días**, en todos los bloques. Es lo que retiene músculo en
  déficit y lo que lo construye en superávit.
- **Las calorías cambian por bloque, la proteína no.** Mantenimiento en los bloques 1-4 y 6-7,
  +300 en el 5, -400 en el 8.

El `foodLog` de la app tiene 5 días registrados y se corta el 26 de julio. Sin registro no hay
manera de saber de dónde partís. Vale la pena registrar dos semanas seguidas antes del bloque 5.

---

## 9. Resumen operativo

Si de todo este documento hubiera que quedarse con seis cosas:

1. **El maratón del 20 de septiembre se corre para terminarlo**, con correr/caminar desde el
   km 1. 5:00-5:30. No es el objetivo del año, es un trámite que hay que pasar entero.
2. **Los días fáciles tienen que ser fáciles.** 8:00/km en cinta, FC bajo 140. Es la corrección
   que más rendimiento te va a dar y la que más va a costar aceptar.
3. **Una sola sesión de calidad por semana**, los martes, y en el orden A → B → C → D.
4. **Remo pesado, face pull, pájaros, laterales y press inclinado.** Es donde está todo el
   margen de crecimiento que te queda.
5. **Los bloques alternan.** Cuando manda el gimnasio, correr se mantiene. Cuando manda correr,
   el gimnasio se mantiene. Nunca los dos a la vez.
6. **Bajar la grasa al final, no al principio.** Construir primero, definir en el bloque 8.

---

*Este documento son criterios de entrenamiento, no consejo médico. La evaluación del valgo de
rodilla, el asma y la aptitud cardiovascular requieren profesionales presenciales.*
