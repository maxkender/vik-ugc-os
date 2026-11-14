// Client Apify minimal. Le token vient de APIFY_TOKEN (secret Supabase).
const BASE = "https://api.apify.com/v2";

function token(): string {
  const t = Deno.env.get("APIFY_TOKEN");
  if (!t) throw new Error("APIFY_TOKEN missing (Supabase → Edge Functions → Secrets)");
  return t;
}

export async function startRun(actor: string, input: unknown, opts: { maxItems: number; maxChargeUsd: number; webhookUrl?: string }) {
  const q = new URLSearchParams({ maxItems: String(opts.maxItems), maxTotalChargeUsd: String(opts.maxChargeUsd) });
  const res = await fetch(`${BASE}/acts/${actor}/runs?${q}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`apify start ${res.status}: ${body?.error?.message ?? "error"}`);
  return body.data as { id: string; status: string; defaultDatasetId: string };
}

export async function getRun(runId: string) {
  const res = await fetch(`${BASE}/actor-runs/${runId}`, { headers: { Authorization: `Bearer ${token()}` } });
  const body = await res.json();
  if (!res.ok) throw new Error(`apify run ${res.status}`);
  return body.data as { id: string; status: string; defaultDatasetId: string; usageTotalUsd?: number; statusMessage?: string };
}

export async function datasetItems(datasetId: string, limit = 1000): Promise<any[]> {
  const res = await fetch(`${BASE}/datasets/${datasetId}/items?clean=1&limit=${limit}`, { headers: { Authorization: `Bearer ${token()}` } });
  if (!res.ok) throw new Error(`apify dataset ${res.status}`);
  return await res.json();
}

export async function abortRun(runId: string) {
  await fetch(`${BASE}/actor-runs/${runId}/abort`, { method: "POST", headers: { Authorization: `Bearer ${token()}` } });
}
