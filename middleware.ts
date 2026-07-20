import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { LOCAL_MOCK } from "@/lib/local-mock";

export async function middleware(request: NextRequest) {
  // ruta pública de solo lectura: sin sesión, no pasa por el login
  if (request.nextUrl.pathname.startsWith("/api/coach")) return NextResponse.next();

  if (LOCAL_MOCK) {
    // local sin Supabase: no hay login, todo va directo a la app
    if (request.nextUrl.pathname.startsWith("/login")) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Todo salvo assets estáticos y el manifest/íconos.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
