import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "./supabase";
import { Spinner } from "@/components/ui";

export type Role = "admin" | "recruiter" | "poster";
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  recruiter_countries: string[];
  locale: string;
}

const Ctx = createContext<{ session: Session | null; profile: Profile | null; loading: boolean; refresh: () => void }>({
  session: null, profile: null, loading: true, refresh: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle().then(({ data }) => {
      setProfile(data as Profile | null);
      setLoading(false);
    });
  }, [session?.user.id, tick]);

  return <Ctx.Provider value={{ session, profile, loading, refresh: () => setTick((t) => t + 1) }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
export const isStaff = (p: Profile | null) => p?.role === "admin" || p?.role === "recruiter";

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="flex h-full items-center justify-center"><Spinner /></div>;
  if (!session) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  if (!profile || !roles.includes(profile.role)) {
    return <Navigate to={profile?.role === "poster" ? "/creator" : "/login?denied=1"} replace />;
  }
  return <>{children}</>;
}
