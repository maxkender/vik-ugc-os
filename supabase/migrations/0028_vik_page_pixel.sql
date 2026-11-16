-- Lancement : page « Vik Studios » (seule page promouvable du compte) et pixel dédié « Vik UGC Recrutement ».
update public.settings set value = value || '{"page_id": "1509793888874260", "page_name": "Vik Studios", "pixel_id": "2100580263915803"}'::jsonb
where key = 'meta';
