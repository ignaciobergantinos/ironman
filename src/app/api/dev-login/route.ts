import { type NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { LOCAL_MOCK } from "@/lib/local-mock";

// SOLO desarrollo local: inicia sesión como cualquier email sin SSO.
// Bloqueado en producción (NODE_ENV === 'production' -> 404) para no ser un agujero de seguridad.
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }
  // En modo local total no hay Supabase: la app se abre directa, así que aquí solo redirigimos.
  if (LOCAL_MOCK) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return new NextResponse("Falta SUPABASE_SERVICE_ROLE_KEY en .env.local", { status: 500 });
  }

  const { searchParams, origin } = new URL(request.url);
  const email = (searchParams.get("email") || "").trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.redirect(`${origin}/login?error=email-invalido`);
  }

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Crea el usuario si no existe (ignora el error de "ya existe").
  await admin.auth.admin.createUser({ email, email_confirm: true });

  // Genera un token de magic link y canjéalo por una sesión (cookies) sin enviar correo.
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) {
    return NextResponse.redirect(`${origin}/login?error=dev-login`);
  }

  const supabase = await createClient();
  const { error: vErr } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: data.properties.hashed_token });
  if (vErr) {
    return NextResponse.redirect(`${origin}/login?error=dev-login`);
  }

  return NextResponse.redirect(origin + "/");
}
