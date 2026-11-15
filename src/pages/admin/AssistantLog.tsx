import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, MessageCircle, MessagesSquare, RotateCcw, Send, Sparkles, Users } from "lucide-react";
import { Badge, Button, Card, Chip, Drawer, Empty, KpiCard, PageHeader, Spinner, Textarea, useToast } from "@/components/ui";
import { callFn, supabase } from "@/lib/supabase";
import { ago, cn, dateFr, flag } from "@/lib/utils";

type Status = "open" | "escalated" | "closed";
interface Conversation {
  id: string; poster_id: string; status: Status; escalated_at: string | null; escalation_reason: string | null;
  created_at: string; updated_at: string;
  profiles: { full_name: string | null; email: string; is_test: boolean | null } | null;
}
interface Msg { id: string; conversation_id: string; role: "user" | "assistant" | "system" | "admin"; content: string; tokens_in: number | null; tokens_out: number | null; created_at: string }

const STATUS: Record<Status, { label: string; tone: "danger" | "accent" | "default" }> = {
  escalated: { label: "Escaladée", tone: "danger" },
  open: { label: "Ouverte", tone: "accent" },
  closed: { label: "Close", tone: "default" },
};
const ROLE_LABEL: Record<Msg["role"], string> = { user: "Posteur", assistant: "Assistant", admin: "Équipe", system: "Système" };
const RANK: Record<Status, number> = { escalated: 0, open: 1, closed: 2 };
const startOfDay = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); };

/** Journal de l'assistant posteurs : conversations (escaladées d'abord), fil, réponse de l'équipe. */
export default function AssistantLog() {
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<"all" | Status>((params.get("status") as Status) || "all");
  const selected = params.get("c");
  const select = (id: string | null) => {
    const p = new URLSearchParams(params);
    if (id) p.set("c", id); else p.delete("c");
    setParams(p, { replace: true });
  };

  const data = useQuery({
    queryKey: ["assistant-log"],
    queryFn: async () => {
      const { data: convs, error } = await supabase.from("assistant_conversations")
        .select("id, poster_id, status, escalated_at, escalation_reason, created_at, updated_at, profiles(full_name, email, is_test)")
        .order("updated_at", { ascending: false }).limit(300);
      if (error) throw error;
      const ids = (convs ?? []).map((c) => c.id);
      const posterIds = [...new Set((convs ?? []).map((c) => c.poster_id))];
      const [{ data: msgs }, { data: posters }, { count: today }] = await Promise.all([
        ids.length
          ? supabase.from("assistant_messages").select("id, conversation_id, role, content, tokens_in, tokens_out, created_at").in("conversation_id", ids).order("created_at").limit(5000)
          : Promise.resolve({ data: [] as Msg[] }),
        posterIds.length ? supabase.from("posters").select("id, country, zone_code, language").in("id", posterIds) : Promise.resolve({ data: [] as any[] }),
        supabase.from("assistant_messages").select("id", { count: "exact", head: true }).gte("created_at", startOfDay()),
      ]);
      return {
        convs: (convs ?? []) as unknown as Conversation[],
        msgs: (msgs ?? []) as Msg[],
        posters: new Map((posters ?? []).map((p: any) => [p.id, p])),
        messagesToday: today ?? 0,
      };
    },
    refetchInterval: 30_000,
  });

  const byConv = useMemo(() => {
    const m = new Map<string, Msg[]>();
    for (const x of data.data?.msgs ?? []) (m.get(x.conversation_id) ?? m.set(x.conversation_id, []).get(x.conversation_id)!).push(x);
    return m;
  }, [data.data]);

  const convs = useMemo(() => {
    const all = [...(data.data?.convs ?? [])].sort((a, b) => RANK[a.status] - RANK[b.status] || b.updated_at.localeCompare(a.updated_at));
    return filter === "all" ? all : all.filter((c) => c.status === filter);
  }, [data.data, filter]);

  const sod = startOfDay();
  const all = data.data?.convs ?? [];
  const kpi = {
    today: all.filter((c) => c.updated_at >= sod).length,
    escalated: all.filter((c) => c.status === "escalated").length,
    messagesToday: data.data?.messagesToday ?? 0,
    tokens: (data.data?.msgs ?? []).reduce((s, m) => s + (m.tokens_in ?? 0) + (m.tokens_out ?? 0), 0),
  };
  const current = all.find((c) => c.id === selected) ?? null;
  const counts = { all: all.length, escalated: kpi.escalated, open: all.filter((c) => c.status === "open").length, closed: all.filter((c) => c.status === "closed").length };

  const isDesktop = useIsDesktop();
  // Desktop : on ouvre d'office la première conversation (les escaladées sont en tête).
  useEffect(() => {
    if (isDesktop && !selected && convs.length) select(convs[0].id);
  }, [isDesktop, selected, convs.length]);

  return (
    <div className="space-y-6">
      <PageHeader title="Assistant posteurs" description="Les questions posées à l'assistant de l'espace créateur. Les conversations escaladées attendent une réponse de l'équipe." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Conversations aujourd'hui" value={kpi.today} icon={<MessagesSquare className="h-4 w-4" />} tint="blue" />
        <KpiCard label="Escaladées" value={kpi.escalated} icon={<AlertTriangle className="h-4 w-4" />} tint="red" hint="à traiter" />
        <KpiCard label="Messages aujourd'hui" value={kpi.messagesToday} icon={<MessageCircle className="h-4 w-4" />} tint="violet" />
        <KpiCard label="Tokens (total)" value={new Intl.NumberFormat("fr").format(kpi.tokens)} icon={<Sparkles className="h-4 w-4" />} tint="cyan" />
      </div>

      <div className="flex flex-wrap gap-2">
        {([["all", "Toutes"], ["escalated", "Escaladées"], ["open", "Ouvertes"], ["closed", "Closes"]] as const).map(([k, l]) => (
          <Chip key={k} active={filter === k} onClick={() => { setFilter(k); const p = new URLSearchParams(params); if (k === "all") p.delete("status"); else p.set("status", k); setParams(p, { replace: true }); }}>
            {l} <span className="ml-1 text-subtle-foreground">{counts[k]}</span>
          </Chip>
        ))}
      </div>

      {data.isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !convs.length ? (
        <Empty icon={<MessageCircle className="h-5 w-5" />} title="Aucune conversation">Les questions des posteurs apparaîtront ici dès qu'ils utiliseront l'assistant.</Empty>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
          <Card className="divide-y overflow-hidden p-0">
            {convs.map((c) => {
              const msgs = byConv.get(c.id) ?? [];
              const last = msgs[msgs.length - 1];
              const p = data.data?.posters.get(c.poster_id);
              return (
                <button key={c.id} onClick={() => select(c.id)}
                  className={cn("flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/60", selected === c.id && "bg-accent-soft hover:bg-accent-soft")}>
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{flag(p?.country)} {c.profiles?.full_name || c.profiles?.email || "Posteur"}</span>
                    {c.profiles?.is_test && <Badge tone="outline">test</Badge>}
                    <span className="ml-auto shrink-0 text-[11px] text-subtle-foreground">{ago(c.updated_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="line-clamp-1 flex-1 text-xs text-muted-foreground">
                      {last ? <><span className="font-medium text-foreground/70">{ROLE_LABEL[last.role]} : </span>{last.content}</> : "—"}
                    </span>
                    <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
                  </div>
                </button>
              );
            })}
          </Card>

          {isDesktop && (
            <Card className="flex min-h-[560px] flex-col p-0">
              {current ? <Thread conv={current} msgs={byConv.get(current.id) ?? []} poster={data.data?.posters.get(current.poster_id)} />
                : <div className="flex flex-1 items-center justify-center p-8 text-sm text-subtle-foreground">Sélectionne une conversation.</div>}
            </Card>
          )}
        </div>
      )}

      {!isDesktop && (
        <Drawer open={!!current} onClose={() => select(null)} title={current?.profiles?.full_name || current?.profiles?.email || "Conversation"}>
          {current && <div className="-mx-5 -my-5 flex h-[calc(100dvh-64px)] flex-col"><Thread conv={current} msgs={byConv.get(current.id) ?? []} poster={data.data?.posters.get(current.poster_id)} /></div>}
        </Drawer>
      )}
    </div>
  );
}

function useIsDesktop() {
  const q = "(min-width: 1024px)";
  const [v, setV] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setV(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return v;
}

function Thread({ conv, msgs, poster }: { conv: Conversation; msgs: Msg[]; poster?: any }) {
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const qc = useQueryClient();
  const toast = useToast();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [conv.id, msgs.length]);

  async function run(kind: string, body: Record<string, unknown>, ok: string) {
    setBusy(kind);
    try {
      await callFn("assistant", body);
      toast(ok, "success");
      if (kind === "reply") setReply("");
      await qc.invalidateQueries({ queryKey: ["assistant-log"] });
    } catch (e: any) {
      toast(e.message ?? "Erreur", "danger");
    } finally {
      setBusy(null);
    }
  }

  const tokens = msgs.reduce((s, m) => s + (m.tokens_in ?? 0) + (m.tokens_out ?? 0), 0);

  return (
    <>
      <div className="flex flex-wrap items-start gap-3 border-b px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[15px] font-semibold">
            {flag(poster?.country)} {conv.profiles?.full_name || "Posteur"}
            <Badge tone={STATUS[conv.status].tone}>{STATUS[conv.status].label}</Badge>
          </div>
          <div className="mt-0.5 text-xs text-subtle-foreground">
            {conv.profiles?.email} · zone {poster?.zone_code ?? "—"} · langue {poster?.language ?? "—"} · ouverte le {dateFr(conv.created_at, true)} · {msgs.length} messages{tokens ? ` · ${new Intl.NumberFormat("fr").format(tokens)} tokens` : ""}
          </div>
          {conv.status === "escalated" && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-tint-red px-2.5 py-1 text-xs text-danger">
              <AlertTriangle className="h-3.5 w-3.5" /> Escaladée {ago(conv.escalated_at)}{conv.escalation_reason ? ` : ${conv.escalation_reason}` : ""}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {conv.status !== "closed" ? (
            <Button size="sm" variant="secondary" loading={busy === "close"} onClick={() => run("close", { action: "set_status", conversation_id: conv.id, status: "closed" }, "Conversation close")}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Clore
            </Button>
          ) : (
            <Button size="sm" variant="secondary" loading={busy === "reopen"} onClick={() => run("reopen", { action: "set_status", conversation_id: conv.id, status: "open" }, "Conversation rouverte")}>
              <RotateCcw className="h-3.5 w-3.5" /> Rouvrir
            </Button>
          )}
        </div>
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-[#fafbfc] px-5 py-4" style={{ maxHeight: 520 }}>
        {msgs.map((m) => (
          <div key={m.id} className={cn("flex flex-col", m.role === "user" ? "items-start" : m.role === "system" ? "items-center" : "items-end")}>
            <span className={cn("mb-1 flex items-center gap-1 px-1 text-[11px] font-medium text-subtle-foreground", m.role === "admin" && "text-[#6b3fd6]")}>
              {m.role === "admin" && <Users className="h-3 w-3" />}{m.role === "assistant" && <Sparkles className="h-3 w-3" />}
              {ROLE_LABEL[m.role]} · {dateFr(m.created_at, true)}{m.tokens_out ? ` · ${m.tokens_in ?? 0}→${m.tokens_out} tok` : ""}
            </span>
            <div className={cn("max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm",
              m.role === "user" && "rounded-bl-md border bg-white",
              m.role === "assistant" && "rounded-br-md bg-accent-soft",
              m.role === "admin" && "rounded-br-md border border-[#e3d6ff] bg-tint-violet",
              m.role === "system" && "bg-muted text-xs text-muted-foreground")}>
              {m.content}
            </div>
          </div>
        ))}
      </div>

      <form className="space-y-2 border-t px-5 py-4" onSubmit={(e) => { e.preventDefault(); if (reply.trim()) run("reply", { action: "admin_reply", conversation_id: conv.id, content: reply.trim(), status: "open" }, "Réponse envoyée au posteur"); }}>
        <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} placeholder="Répondre au posteur (visible dans sa bulle d'assistant, dans sa langue de préférence)…" />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-subtle-foreground">La réponse apparaît comme « Équipe Vik » dans l'espace du posteur.</span>
          <Button type="submit" size="sm" loading={busy === "reply"} disabled={!reply.trim()}><Send className="h-3.5 w-3.5" /> Répondre</Button>
        </div>
      </form>
    </>
  );
}
