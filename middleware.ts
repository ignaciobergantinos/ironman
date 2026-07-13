import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { LOCAL_MOCK } from "@/lib/local-mock";

export async function middleware(request: NextRequest) {
  if (LOCAL_MOCK) return NextResponse.next(); // local sin Supabase: no hay auth que refrescar
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Todo salvo assets estáticos y el manifest/íconos.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
