import { supabase } from "@/lib/supabase";
import type { Video } from "./types";
import { ORIGIN_LABEL } from "./types";

const esc = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Exporte jusqu'à `max` lignes du filtre courant (pages de 500), en CSV. */
export async function exportCsv(filters: Record<string, unknown>, names: { competitor: (id: string | null) => string; category: (id: string | null) => string }, max = 5000) {
  const rows: Video[] = [];
  for (let offset = 0; offset < max; offset += 500) {
    const { data, error } = await supabase.rpc("explore_videos", { ...filters, p_offset: offset, p_limit: 500, p_cursor_value: null, p_cursor_id: null });
    if (error) throw error;
    rows.push(...((data ?? []) as Video[]));
    if (!data || data.length < 500) break;
  }
  const header = ["url", "plateforme", "origine", "concurrent", "createur", "abonnes", "langue", "pays", "format", "vues", "likes", "commentaires", "partages",
    "engagement", "outlier", "velocite_jour", "score", "publie_le", "pub_jours", "pub_active", "legende"];
  const lines = rows.map((v) => [v.url, v.platform, v.origin ? ORIGIN_LABEL[v.origin] : "", names.competitor(v.competitor_id), v.author_handle ?? v.ad_page_name,
    v.author_followers, v.language, v.country, names.category(v.category_id), v.views, v.likes, v.comments, v.shares,
    v.engagement, v.outlier, v.velocity, v.score, v.published_at?.slice(0, 10), v.ad_days, v.ad_active, (v.caption ?? "").replace(/\s+/g, " ").slice(0, 300)].map(esc).join(","));
  const blob = new Blob(["﻿" + [header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `bibliotheque-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  return rows.length;
}
