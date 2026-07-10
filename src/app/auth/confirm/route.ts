import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth (Google) landing: Supabase redirects here with a PKCE `code` to exchange for a session.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=acceso-invalido`);
}
