// Appel LLM via fal (endpoint OpenAI-compatible openrouter/router). Clé FAL_KEY (secret Supabase), jamais loggée.
export const FAL_CHAT_URL = "https://fal.run/openrouter/router/openai/v1/chat/completions";

export interface FalChatResult { text: string; model: string; costUsd: number; tokensIn: number; tokensOut: number }

/** Essaie chaque modèle dans l'ordre (repli si indisponible). */
export async function falChat(
  models: string[], messages: { role: string; content: string }[], opts: { maxTokens?: number; temperature?: number; timeoutMs?: number } = {},
): Promise<FalChatResult> {
  const key = Deno.env.get("FAL_KEY");
  if (!key) throw new Error("fal_not_configured");
  let last = "";
  for (const model of models.filter((m, i, a) => m && a.indexOf(m) === i)) {
    const res = await fetch(FAL_CHAT_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Key ${key}` },
      body: JSON.stringify({ model, messages, max_tokens: opts.maxTokens ?? 2000, temperature: opts.temperature ?? 0.2 }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 90_000),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      last = `fal ${res.status} ${model} ${String(err?.error?.message ?? err?.detail ?? "").slice(0, 160)}`.trim();
      console.error(last);
      continue;
    }
    const j = await res.json();
    const c = j.choices?.[0]?.message?.content;
    const text = typeof c === "string" ? c : Array.isArray(c) ? c.map((b: any) => b.text ?? "").join("") : "";
    return { text, model, costUsd: Number(j.usage?.cost ?? 0), tokensIn: j.usage?.prompt_tokens ?? 0, tokensOut: j.usage?.completion_tokens ?? 0 };
  }
  throw new Error(last || "fal_no_model");
}
