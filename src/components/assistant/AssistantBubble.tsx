import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUp, Info, MessageCircle, Sparkles, Users, X } from "lucide-react";
import { callFn } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { assistantStrings } from "./strings";

export interface AssistantMessage { id: string; role: "user" | "assistant" | "system" | "admin"; content: string; created_at: string }
interface History {
  configured: boolean;
  enabled: boolean;
  remaining: number;
  cap: number;
  conversation: { id: string; status: "open" | "escalated" | "closed" } | null;
  messages: AssistantMessage[];
}

const KEY = ["assistant-history"];

/**
 * Bulle d'assistant de l'espace créateur : bouton flottant (au-dessus de la barre d'onglets mobile),
 * feuille de discussion, suggestions, réponses de l'équipe distinctes, état « pas encore configuré ».
 * Ouverture aussi par l'URL : ?assistant=1.
 */
export function AssistantBubble() {
  const { i18n } = useTranslation();
  const s = assistantStrings(i18n.resolvedLanguage);
  const { profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(params.get("assistant") === "1");
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const history = useQuery({
    queryKey: KEY,
    queryFn: () => callFn<History>("assistant", { action: "history" }),
    enabled: open,
    refetchInterval: open ? 30_000 : false,
    retry: 1,
  });
  const h = history.data;
  const messages = h?.messages ?? [];

  useEffect(() => {
    if (params.get("assistant") === "1" && !open) setOpen(true);
  }, [params]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, pending, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    if (params.has("assistant")) {
      params.delete("assistant");
      setParams(params, { replace: true });
    }
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || pending) return;
    setPending(message);
    setDraft("");
    setError(null);
    try {
      const r = await callFn<{ reply: string; messages?: AssistantMessage[]; remaining?: number; status?: string; configured?: boolean; capped?: boolean }>("assistant", { action: "send", message });
      qc.setQueryData<History>(KEY, (old) => {
        const base: History = old ?? { configured: r.configured ?? true, enabled: true, remaining: 0, cap: 0, conversation: null, messages: [] };
        const added: AssistantMessage[] = r.messages ?? [
          { id: `u-${Date.now()}`, role: "user", content: message, created_at: new Date().toISOString() },
          { id: `s-${Date.now()}`, role: "system", content: r.reply, created_at: new Date().toISOString() },
        ];
        return {
          ...base,
          configured: r.configured ?? base.configured,
          remaining: r.remaining ?? base.remaining,
          conversation: base.conversation ?? (r.status ? { id: "", status: r.status as "open" } : null),
          messages: [...base.messages, ...added],
        };
      });
      qc.invalidateQueries({ queryKey: KEY });
    } catch {
      setError(s.error);
      setDraft(message);
    } finally {
      setPending(null);
      inputRef.current?.focus();
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(draft);
  }

  const firstName = (profile?.full_name ?? "").trim().split(/\s+/)[0] || null;
  const escalated = h?.conversation?.status === "escalated";

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label={s.open}
          title={s.open}
          className="fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-[0_8px_24px_rgba(0,77,255,0.35)] transition-transform hover:scale-105 active:scale-95 sm:bottom-6 sm:right-6"
        >
          <MessageCircle className="h-6 w-6" strokeWidth={2} />
        </button>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 sm:hidden" onClick={close} aria-hidden />
          <section
            role="dialog"
            aria-label={s.title}
            className="fixed inset-x-0 bottom-0 z-50 flex h-[85dvh] flex-col overflow-hidden rounded-t-2xl border bg-white shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[600px] sm:max-h-[calc(100dvh-48px)] sm:w-[400px] sm:rounded-2xl"
          >
            <header className="flex items-center gap-3 border-b px-4 py-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Sparkles className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[15px] font-semibold">
                  {s.title}
                  {escalated && <span className="rounded-full bg-tint-violet px-2 py-0.5 text-[11px] font-medium text-[#6b3fd6]">{s.escalated}</span>}
                </div>
                <div className="truncate text-xs text-subtle-foreground">{s.subtitle}</div>
              </div>
              <button onClick={close} aria-label={s.close} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-subtle-foreground hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </header>

            {h && !h.configured && (
              <div className="flex items-start gap-2 border-b bg-tint-yellow px-4 py-2.5 text-xs text-[#7a5a00]">
                <Info className="mt-px h-3.5 w-3.5 shrink-0" /> {s.notConfigured}
              </div>
            )}
            {h && h.configured && !h.enabled && (
              <div className="flex items-start gap-2 border-b bg-muted px-4 py-2.5 text-xs text-muted-foreground">
                <Info className="mt-px h-3.5 w-3.5 shrink-0" /> {s.disabled}
              </div>
            )}

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              <Bubble side="left" tone="assistant">{s.hello(firstName)}</Bubble>
              {history.isLoading && <TypingDots label={s.typing} />}
              {messages.map((m) => <MessageRow key={m.id} m={m} teamLabel={s.team} />)}
              {pending && (
                <>
                  <Bubble side="right" tone="user">{pending}</Bubble>
                  <TypingDots label={s.typing} />
                </>
              )}
            </div>

            <div className="border-t bg-white px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 sm:pb-3">
              {!messages.length && !pending && (
                <div className="mb-2.5 flex flex-wrap gap-1.5">
                  {s.chips.map((c) => (
                    <button key={c} onClick={() => send(c)} className="rounded-full border border-border-strong bg-white px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent">
                      {c}
                    </button>
                  ))}
                </div>
              )}
              {error && <div className="mb-2 text-xs text-danger">{error}</div>}
              <form onSubmit={onSubmit} className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(draft); } }}
                  rows={1}
                  maxLength={2000}
                  placeholder={s.placeholder}
                  className="max-h-28 min-h-[40px] flex-1 resize-none rounded-2xl border border-border-strong bg-white px-3.5 py-2.5 text-sm placeholder:text-subtle-foreground focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10"
                />
                <button type="submit" disabled={!draft.trim() || !!pending} aria-label={s.send}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition-opacity disabled:opacity-40">
                  <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.25} />
                </button>
              </form>
              {h && h.cap > 0 && <div className="mt-1.5 text-center text-[11px] text-subtle-foreground">{s.remaining(h.remaining)}</div>}
            </div>
          </section>
        </>
      )}
    </>
  );
}

function MessageRow({ m, teamLabel }: { m: AssistantMessage; teamLabel: string }) {
  if (m.role === "user") return <Bubble side="right" tone="user">{m.content}</Bubble>;
  if (m.role === "admin") {
    return (
      <div className="flex flex-col items-start gap-1">
        <span className="inline-flex items-center gap-1 pl-1 text-[11px] font-semibold text-[#6b3fd6]"><Users className="h-3 w-3" /> {teamLabel}</span>
        <Bubble side="left" tone="admin">{m.content}</Bubble>
      </div>
    );
  }
  if (m.role === "system") return <div className="mx-auto max-w-[90%] rounded-xl bg-muted px-3 py-2 text-center text-xs text-muted-foreground">{m.content}</div>;
  return <Bubble side="left" tone="assistant">{m.content}</Bubble>;
}

function Bubble({ side, tone, children }: { side: "left" | "right"; tone: "user" | "assistant" | "admin"; children: React.ReactNode }) {
  return (
    <div className={cn("flex", side === "right" ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[85%] whitespace-pre-wrap break-words px-3.5 py-2.5 text-sm leading-relaxed",
        tone === "user" && "rounded-2xl rounded-br-md bg-accent text-accent-foreground",
        tone === "assistant" && "rounded-2xl rounded-bl-md bg-muted text-foreground",
        tone === "admin" && "rounded-2xl rounded-bl-md border border-[#e3d6ff] bg-tint-violet text-foreground",
      )}>
        {children}
      </div>
    </div>
  );
}

function TypingDots({ label }: { label: string }) {
  return (
    <div className="flex justify-start" aria-label={label} role="status">
      <div className="inline-flex items-center gap-1 rounded-2xl rounded-bl-md bg-muted px-3.5 py-3">
        {[0, 150, 300].map((d) => (
          <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-subtle-foreground" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
  );
}
