import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button, Card, Field, Input } from "@/components/ui";

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
    if (session && profile) nav(params.get("next") ?? (profile.role === "poster" ? "/creator" : "/admin/library"), { replace: true });
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
    <div className="flex min-h-full items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-sm p-8">
        <p className="mb-1 text-sm font-semibold">Vik Studios</p>
        <h1 className="mb-6 text-xl font-semibold">{t("login.title")}</h1>
        {sent ? (
          <p className="text-sm">{t("login.sent")}</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Field label={t("login.email")}><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></Field>
            {mode === "password" && <Field label={t("login.password")}><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>}
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" className="w-full" loading={busy}>{mode === "link" ? t("login.send") : t("login.title")}</Button>
            <button type="button" className="w-full text-xs text-muted-foreground hover:underline" onClick={() => setMode(mode === "link" ? "password" : "link")}>
              {mode === "link" ? t("login.withPassword") : t("login.send")}
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}
