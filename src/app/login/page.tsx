"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/lib/icons";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("sending");
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/confirm` },
    });
    if (error) {
      setError(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="login">
      <div className="login-card">
        <h1 className="logo">Tría</h1>
        <div className="rail" />
        <p className="tag">Tu registro de entreno rumbo al Ironman. Entra con tu email y tus datos te siguen a cualquier dispositivo.</p>

        {status === "sent" ? (
          <div className="ok">
            <b>Revisa tu correo 📬</b>
            <br />
            Te enviamos un enlace a <b>{email}</b>. Ábrelo en este dispositivo para entrar.
          </div>
        ) : (
          <form onSubmit={submit}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button className="primary" type="submit" disabled={status === "sending"}>
              <Icon name="mail" size={17} />
              {status === "sending" ? "Enviando…" : "Enviar enlace de acceso"}
            </button>
            {status === "error" && <div className="err">{error}</div>}
          </form>
        )}

        <p className="note">Sin contraseñas. Recibes un enlace mágico, haces clic y entras. Tus datos se sincronizan en la nube y funcionan también sin conexión.</p>
      </div>
    </div>
  );
}
