import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tría · Camino al Maratón",
    short_name: "Tría",
    description: "Registro de entrenamiento para el maratón — carrera con natación y bici de apoyo.",
    start_url: "/",
    display: "standalone",
    background_color: "#0D1015",
    theme_color: "#0D1015",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
