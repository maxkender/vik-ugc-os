-- Pertinence plus stricte (retour du 15/11 : 82 % de « compatibles » était trop permissif).
-- Prompt durci + seuil calé sur la distribution réelle : 70/100 → ~26 % de compatibles Micabo.
update public.settings set value = value || '{"compat_threshold": 70}'::jsonb where key = 'ai';

-- Recalcule ai_compatible / compatible avec le seuil, sans toucher aux corrections manuelles.
update public.videos v set app_scores = (
  select jsonb_object_agg(k, case when e ? 'score' then
      e || jsonb_build_object(
        'ai_compatible', ((e->>'ai_compatible')::boolean is not false) and (e->>'score')::numeric >= 70,
        'compatible', coalesce((e->>'manual')::boolean, ((e->>'ai_compatible')::boolean is not false) and (e->>'score')::numeric >= 70))
    else e end)
  from jsonb_each(v.app_scores) as x(k, e))
where v.app_scores <> '{}'::jsonb;
