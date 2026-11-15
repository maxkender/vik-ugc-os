/**
 * Thème : clair par défaut (fond blanc). Le sombre n'est appliqué que si l'utilisateur l'a
 * choisi explicitement avec le bouton « Thème » (ou « system » choisi à la main).
 */
export type Theme = "light" | "dark" | "system";

export function applyTheme(t: Theme, persist = true) {
  const dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  if (persist) {
    try { localStorage.setItem("theme", t); } catch { /* ignore */ }
  }
}

export function currentTheme(): Theme {
  try {
    const v = localStorage.getItem("theme");
    return v === "dark" || v === "system" || v === "light" ? v : "light";
  } catch {
    return "light";
  }
}
