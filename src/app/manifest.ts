import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tría · Camino al Ironman",
    short_name: "Tría",
    description: "Registro de entrenamiento triatlón — 12 sesiones/semana.",
    start_url: "/",
    display: "standalone",
    background_color: "#0D1015",
    theme_color: "#0D1015",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
