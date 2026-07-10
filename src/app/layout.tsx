import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tría · Camino al Ironman",
  description: "Registro de entrenamiento triatlón — 12 sesiones/semana.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Tría" },
};

export const viewport: Viewport = {
  themeColor: "#0D1015",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const themeInit = `try{var t=localStorage.getItem('tria.theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        {children}
      </body>
    </html>
  );
}
