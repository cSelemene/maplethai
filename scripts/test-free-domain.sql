-- Free access by e-mail domain (private.free_domains): a confirmed @sasin.edu account gets
-- the all-guides pack on first sync, other domains and unconfirmed addresses get nothing,
-- the grant is given once (a suspension is not undone) and covered products cannot be bought.
BEGIN;
DO $test$
DECLARE
 us uuid:=gen_random_uuid(); uu uuid:=gen_random_uuid(); uo uuid:=gen_random_uuid(); ul uuid:=gen_random_uuid(); ux uuid:=gen_random_uuid();
 acct jsonb; c text; failed boolean; h text;
BEGIN
 INSERT INTO auth.users(id,email,email_confirmed_at,aud,role) VALUES
  (us,'Kawinnithi.Planthong@sasin.edu',now(),'authenticated','authenticated'),
  (uu,'unconfirmed@sasin.edu',null,'authenticated','authenticated'),
  (uo,'someone@gmail.com',now(),'authenticated','authenticated'),
  (ul,'lookalike@sasin.edu.example.invalid',now(),'authenticated','authenticated'),
  (ux,'suspended@sasin.edu',now(),'authenticated','authenticated');
 UPDATE public.products SET active=true WHERE id LIKE 'guide\_%' OR id IN ('pack_all','market');
 UPDATE private.payment_settings SET enabled=true;
 INSERT INTO public.guide_files(guide,html) VALUES('bandit','<!doctype html><html><head></head><body>bandit</body></html>') ON CONFLICT (guide) DO UPDATE SET html=excluded.html;
 IF NOT EXISTS(SELECT 1 FROM private.free_domains WHERE domain='sasin.edu' AND product='pack_all') THEN RAISE EXCEPTION 'sasin.edu not seeded'; END IF;

 -- Confirmed Sasin address (mixed case): pack granted on first sync, every covered product readable, nothing to buy.
 PERFORM set_config('request.jwt.claim.sub',us::text,true);
 acct:=public.sync_account();
 IF (SELECT source FROM public.entitlements WHERE user_id=us AND product='pack_all') IS DISTINCT FROM 'domain' THEN RAISE EXCEPTION 'pack not granted by domain: %',acct; END IF;
 IF (SELECT expires_at FROM public.entitlements WHERE user_id=us AND product='pack_all') IS NOT NULL THEN RAISE EXCEPTION 'domain pack should not expire'; END IF;
 FOREACH c IN ARRAY private.pack_covers() LOOP
  IF NOT private.has_product(us,c) THEN RAISE EXCEPTION 'sasin account missing %',c; END IF;
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(acct->'entitlements') e WHERE e->>'product'=c) THEN RAISE EXCEPTION 'sync_account does not list %',c; END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(acct->'entitlements') e WHERE e->>'product'='pack_all' AND e->>'source'='domain') THEN RAISE EXCEPTION 'sync_account hides the domain source: %',acct; END IF;
 h:=public.get_guide('bandit');
 IF h IS NULL OR h NOT LIKE '%bandit%' THEN RAISE EXCEPTION 'sasin account cannot read a guide'; END IF;
 IF NOT (public.pack_quote()->>'owns_pack')::boolean THEN RAISE EXCEPTION 'pack_quote owns_pack false'; END IF;
 failed:=false; BEGIN PERFORM public.create_payment_order('pack_all'); failed:=true; EXCEPTION WHEN raise_exception THEN NULL; END;
 IF failed THEN RAISE EXCEPTION 'sasin account could buy the pack'; END IF;
 failed:=false; BEGIN PERFORM public.create_payment_order('guide_mage'); failed:=true; EXCEPTION WHEN raise_exception THEN NULL; END;
 IF failed THEN RAISE EXCEPTION 'sasin account could buy a covered guide'; END IF;
 -- Second sync: still exactly one pack row, same source.
 PERFORM public.sync_account();
 IF (SELECT count(*) FROM public.entitlements WHERE user_id=us)<>1 THEN RAISE EXCEPTION 'extra entitlement rows after resync'; END IF;

 -- Unconfirmed Sasin address: nothing until the e-mail is confirmed, then granted.
 PERFORM set_config('request.jwt.claim.sub',uu::text,true);
 PERFORM public.sync_account();
 IF EXISTS(SELECT 1 FROM public.entitlements WHERE user_id=uu) THEN RAISE EXCEPTION 'unconfirmed address granted'; END IF;
 failed:=false; BEGIN PERFORM public.get_guide('bandit'); failed:=true; EXCEPTION WHEN raise_exception THEN NULL; END;
 IF failed THEN RAISE EXCEPTION 'unconfirmed address could read a guide'; END IF;
 UPDATE auth.users SET email_confirmed_at=now() WHERE id=uu;
 PERFORM public.sync_account();
 IF NOT private.has_product(uu,'guide_bandit') THEN RAISE EXCEPTION 'confirmed later but not granted'; END IF;

 -- Other domain and a look-alike domain: nothing.
 PERFORM set_config('request.jwt.claim.sub',uo::text,true);
 PERFORM public.sync_account();
 IF EXISTS(SELECT 1 FROM public.entitlements WHERE user_id=uo) THEN RAISE EXCEPTION 'gmail address granted'; END IF;
 PERFORM set_config('request.jwt.claim.sub',ul::text,true);
 PERFORM public.sync_account();
 IF EXISTS(SELECT 1 FROM public.entitlements WHERE user_id=ul) THEN RAISE EXCEPTION 'look-alike domain granted'; END IF;

 -- A suspended pack (expired row) is not silently re-granted on the next sync.
 INSERT INTO public.entitlements(user_id,product,expires_at,source) VALUES(ux,'pack_all',now()-interval '1 day','admin_suspended');
 PERFORM set_config('request.jwt.claim.sub',ux::text,true);
 PERFORM public.sync_account();
 IF private.has_product(ux,'guide_bandit') THEN RAISE EXCEPTION 'suspended sasin account re-granted'; END IF;

 -- The domain list is private.
 PERFORM set_config('request.jwt.claim.sub',us::text,true);
 IF has_table_privilege('authenticated','private.free_domains','SELECT') OR has_table_privilege('anon','private.free_domains','SELECT') THEN RAISE EXCEPTION 'free_domains readable by clients'; END IF;
END $test$;
SELECT 'PASS: sasin.edu pack grant on confirmed sign-in, covered guides readable and unbuyable, idempotent, unconfirmed/other/look-alike domains denied, suspension kept, list private' AS result;
ROLLBACK;
