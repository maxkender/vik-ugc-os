-- V3 : paie du lundi. Ajustement manuel avec motif, statut de revue (à vérifier / validé), récap admin.
alter table public.payouts add column if not exists adjustment numeric(10,2) not null default 0;
alter table public.payouts add column if not exists adjustment_reason text;
alter table public.payouts add column if not exists review_status text not null default 'to_review';
alter table public.payouts add column if not exists validated_at timestamptz;
alter table public.payouts add column if not exists validated_by uuid references public.profiles(id) on delete set null;
alter table public.payouts add column if not exists missing_d7 int not null default 0;
do $$ begin
  alter table public.payouts add constraint payouts_review_status_chk check (review_status in ('to_review','validated'));
exception when duplicate_object then null; end $$;
-- Les paiements déjà payés sont validés de fait.
update public.payouts set review_status = 'validated', validated_at = coalesce(validated_at, paid_at) where status = 'paid' and review_status = 'to_review';

insert into public.email_templates (key, language, subject, body, button_label) values
('payroll_recap','fr','Paie de la semaine du {week} : {total} à verser',
 'Bonjour,

La paie de la semaine du {week} est prête : {creators} créateur(s), {videos} vidéo(s) validée(s), {total} à verser.

{flagged} paiement(s) à vérifier (vues J+7 manquantes ou ajustement à confirmer).

Vérifie, clique sur « Tout valider », exporte le CSV pour Ruul, puis marque chaque paiement « Payé sur Ruul ».', 'Ouvrir la paie'),
('payroll_recap','en','Payroll for the week of {week}: {total} to pay',
 'Hi,

Payroll for the week of {week} is ready: {creators} creator(s), {videos} validated video(s), {total} to pay.

{flagged} payout(s) to review (missing D+7 views or adjustment to confirm).

Review, click "Validate all", export the CSV for Ruul, then mark each payout "Paid on Ruul".', 'Open payroll')
on conflict (key, language) do nothing;
