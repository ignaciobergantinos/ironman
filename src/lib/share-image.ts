// Estampa los datos de la sesión sobre la foto (estilo Strava) y devuelve un JPEG
// listo para compartir. Todo pasa en el canvas del navegador: sin servidor ni API.
export type OverlayStat = { label: string; value: string; unit?: string };

const MAX_W = 1440;
const SANS = '"Avenir Next", Avenir, -apple-system, system-ui, sans-serif';

// La imagen se trae con fetch (no <img>) para no ensuciar el canvas: las fotos
// viven en Supabase Storage y una URL firmada cross-origin bloquearía toBlob().
async function loadBitmap(src: string): Promise<ImageBitmap> {
  const res = await fetch(src);
  if (!res.ok) throw new Error("no se pudo cargar la foto");
  return await createImageBitmap(await res.blob());
}

export async function composeStatsImage(
  src: string,
  stats: OverlayStat[],
): Promise<Blob> {
  const bmp = await loadBitmap(src);
  const scale = Math.min(1, MAX_W / bmp.width);
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();

  // k normaliza los tamaños a un ancho de referencia de 1080 px
  const k = w / 1080;
  const pad = 62 * k;

  // Los tiempos largos ("1:47:52") no caben en columnas de ancho fijo: se mide
  // la fila real y se encoge la tipografía hasta que entre, así nunca se solapan.
  const unitF = (lf: number) => lf * 1.25;
  const colWidths = (vf: number, lf: number) =>
    stats.map((st) => {
      ctx.font = `800 ${vf}px ${SANS}`;
      let wv = ctx.measureText(st.value).width;
      if (st.unit) {
        ctx.font = `700 ${unitF(lf)}px ${SANS}`;
        wv += 8 * k + ctx.measureText(st.unit).width;
      }
      ctx.font = `700 ${lf}px ${SANS}`;
      return Math.max(wv, ctx.measureText(st.label.toUpperCase()).width);
    });

  let valueF = 84 * k, labelF = 27 * k, gap = 46 * k;
  let widths = colWidths(valueF, labelF);
  if (stats.length) {
    const avail = w - pad * 2;
    const total = () => widths.reduce((a, b) => a + b, 0) + gap * (stats.length - 1);
    if (total() > avail) {
      const f = avail / total();
      valueF *= f;
      labelF *= f;
      gap *= f;
      widths = colWidths(valueF, labelF);
    }
  }

  const labelY = h - pad;
  const valueY = labelY - labelF - 20 * k;

  // degradado inferior: sin él el texto blanco desaparece sobre fotos claras
  const top = Math.max(0, valueY - valueF * 0.85 - 46 * k);
  const grad = ctx.createLinearGradient(0, top, 0, h);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.45, "rgba(0,0,0,.45)");
  grad.addColorStop(1, "rgba(0,0,0,.82)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, top, w, h - top);

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  let x = pad;
  stats.forEach((st, i) => {
    ctx.fillStyle = "#fff";
    ctx.font = `800 ${valueF}px ${SANS}`;
    const vw = ctx.measureText(st.value).width;
    ctx.fillText(st.value, x, valueY);
    if (st.unit) {
      ctx.fillStyle = "rgba(255,255,255,.8)";
      ctx.font = `700 ${unitF(labelF)}px ${SANS}`;
      ctx.fillText(st.unit, x + vw + 8 * k, valueY);
    }
    ctx.fillStyle = "rgba(255,255,255,.72)";
    ctx.font = `700 ${labelF}px ${SANS}`;
    ctx.fillText(st.label.toUpperCase(), x, labelY);
    x += widths[i] + gap;
  });

  return await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/jpeg", 0.9),
  );
}

// Comparte por la hoja nativa de iOS (PWA); si no hay, descarga el archivo.
// Guarda el blob como descarga en el dispositivo (móvil o escritorio).
export function downloadImage(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Safari necesita que la URL siga viva un instante tras el click
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function shareImage(blob: Blob, filename: string): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: "image/jpeg" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "shared"; // el usuario canceló
    }
  }
  downloadImage(blob, filename);
  return "downloaded";
}
