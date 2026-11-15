import { useSyncExternalStore } from "react";

/** Une seule vidéo lue à la fois dans les grilles (lecture dans la carte). */
let current: string | null = null;
const subs = new Set<() => void>();
export function playInline(id: string | null) {
  current = id;
  subs.forEach((f) => f());
}
export function useInlinePlaying(id: string): boolean {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => current === id);
}
