import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";

export interface Option { id: string; name: string }

export function useApps() {
  return useQuery({ queryKey: ["apps"], queryFn: async () => (await supabase.from("apps").select("*").order("name")).data ?? [] });
}
export function useCompetitors(appId?: string | null) {
  return useQuery({
    queryKey: ["competitors", appId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("competitors").select("*").order("name");
      if (appId) q = q.eq("app_id", appId);
      return (await q).data ?? [];
    },
  });
}
export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: async () => (await supabase.from("categories").select("*").order("sort")).data ?? [] });
}
export function useCountries() {
  return useQuery({ queryKey: ["countries"], queryFn: async () => (await supabase.from("countries").select("*").order("name")).data ?? [] });
}
export function useZones() {
  return useQuery({ queryKey: ["zones"], queryFn: async () => (await supabase.from("zones").select("*").order("code")).data ?? [] });
}
export function usePools() {
  return useQuery({ queryKey: ["pools"], queryFn: async () => (await supabase.from("pools").select("*, pool_members(poster_id)").order("name")).data ?? [] });
}
export function usePosters() {
  return useQuery({ queryKey: ["posters"], queryFn: async () => (await supabase.from("posters").select("*, profiles(email, full_name, is_test)").order("created_at", { ascending: false })).data ?? [] });
}
export function useSetting<T = any>(key: string) {
  return useQuery({ queryKey: ["setting", key], queryFn: async () => ((await supabase.from("settings").select("value").eq("key", key).maybeSingle()).data?.value ?? {}) as T });
}
export async function saveSetting(key: string, value: unknown) {
  const { error } = await supabase.from("settings").upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw error;
}
