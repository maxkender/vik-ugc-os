export type Theme = "light" | "dark" | "system";
export function applyTheme(t: Theme) {
  const dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  try { localStorage.setItem("theme", t); } catch { /* ignore */ }
}
export function currentTheme(): Theme {
  try { return (localStorage.getItem("theme") as Theme) ?? "system"; } catch { return "system"; }
}
