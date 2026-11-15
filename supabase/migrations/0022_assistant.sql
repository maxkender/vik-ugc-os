-- Assistant posteurs (bulle de chat dans l'espace créateur) : conversations, messages, réglages.
-- Les écritures passent par l'edge function « assistant » (service role) ; la RLS ouvre la lecture
-- au posteur pour ses propres lignes et à l'équipe (admin, recruteur) pour tout.

create table if not exists public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  poster_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'open' check (status in ('open','escalated','closed')),
  escalated_at timestamptz,
  escalation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists assistant_conversations_poster_idx on public.assistant_conversations (poster_id, updated_at desc);
create index if not exists assistant_conversations_status_idx on public.assistant_conversations (status, updated_at desc);

create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.assistant_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system','admin')),
  content text not null,
  tokens_in integer,
  tokens_out integer,
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists assistant_messages_conv_idx on public.assistant_messages (conversation_id, created_at);
create index if not exists assistant_messages_created_idx on public.assistant_messages (created_at);

alter table public.assistant_conversations enable row level security;
alter table public.assistant_messages enable row level security;

-- Conversations : le posteur voit et crée les siennes ; admin et recruteur voient tout ; l'admin peut changer le statut.
drop policy if exists assistant_conv_select on public.assistant_conversations;
create policy assistant_conv_select on public.assistant_conversations for select
  using (poster_id = auth.uid() or public.is_recruiter_or_admin());
drop policy if exists assistant_conv_insert on public.assistant_conversations;
create policy assistant_conv_insert on public.assistant_conversations for insert
  with check (poster_id = auth.uid());
drop policy if exists assistant_conv_update on public.assistant_conversations;
create policy assistant_conv_update on public.assistant_conversations for update
  using (public.is_recruiter_or_admin()) with check (public.is_recruiter_or_admin());

-- Messages : le posteur lit ceux de ses conversations et n'insère que des messages « user » ;
-- admin et recruteur lisent tout et peuvent répondre (rôle « admin »).
drop policy if exists assistant_msg_select on public.assistant_messages;
create policy assistant_msg_select on public.assistant_messages for select
  using (public.is_recruiter_or_admin() or exists (
    select 1 from public.assistant_conversations c where c.id = conversation_id and c.poster_id = auth.uid()));
drop policy if exists assistant_msg_insert_poster on public.assistant_messages;
create policy assistant_msg_insert_poster on public.assistant_messages for insert
  with check (role = 'user' and exists (
    select 1 from public.assistant_conversations c where c.id = conversation_id and c.poster_id = auth.uid()));
drop policy if exists assistant_msg_insert_staff on public.assistant_messages;
create policy assistant_msg_insert_staff on public.assistant_messages for insert
  with check (role = 'admin' and public.is_recruiter_or_admin());

-- Réglages par défaut (modifiables dans settings) : plafond de messages posteur par jour, modèle.
insert into public.settings (key, value)
values ('assistant', '{"enabled": true, "daily_cap": 30, "model": "claude-sonnet-5-5"}'::jsonb)
on conflict (key) do nothing;
