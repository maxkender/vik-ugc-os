import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button, Field, Input } from "@/components/ui";
import { Logo } from "@/components/brand/Logo";

export default function Login() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { session, profile } = useAuth();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"link" | "password">("link");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get("denied") ? t("login.denied") : null);

  useEffect(() => {
    if (session && profile) nav(params.get("next") ?? (profile.role === "poster" ? "/creator" : "/admin"), { replace: true });
  }, [session, profile]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "link") {
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/` } });
        if (error) throw error;
        setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-[380px]">
          <Logo className="mb-10 h-8" />
          <div className="rounded-xl border bg-card p-7 shadow-[0_1px_3px_rgba(0,17,62,0.06),0_8px_24px_-12px_rgba(0,17,62,0.12)]">
            <h1 className="text-xl font-semibold tracking-tight">{t("login.title")}</h1>
            {sent ? (
              <div className="mt-4 rounded-lg bg-accent/5 p-4 text-sm text-foreground ring-1 ring-accent/20">{t("login.sent")}</div>
            ) : (
              <form onSubmit={submit} className="mt-6 space-y-4">
                <Field label={t("login.email")}><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus placeholder="nom@exemple.com" className="h-10" /></Field>
                {mode === "password" && <Field label={t("login.password")}><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-10" /></Field>}
                {error && <p className="rounded-md bg-danger/5 px-3 py-2 text-sm text-danger ring-1 ring-danger/20">{error}</p>}
                <Button type="submit" className="h-10 w-full" loading={busy}>{mode === "link" ? t("login.send") : t("login.title")}</Button>
                <button type="button" className="w-full text-center text-xs text-muted-foreground hover:text-foreground hover:underline" onClick={() => setMode(mode === "link" ? "password" : "link")}>
                  {mode === "link" ? t("login.withPassword") : t("login.send")}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
      <p className="pb-6 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} Vik Studios</p>
    </div>
  );
}
