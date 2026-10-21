-- All-guides pack (pack_all): price rule, free claim, credit, history and revoke.
-- Price = max(0, 259 - 99 x active guide entitlements); market and Bandit's free Sindit never count.
BEGIN;
DO $test$
DECLARE
 adm uuid:=gen_random_uuid(); u0 uuid:=gen_random_uuid(); u1 uuid:=gen_random_uuid(); u2 uuid:=gen_random_uuid();
 u3 uuid:=gen_random_uuid(); uc uuid:=gen_random_uuid(); up uuid:=gen_random_uuid();
 q jsonb; p jsonb; p2 jsonb; failed boolean; pid bigint; acct jsonb; c text;
BEGIN
 INSERT INTO auth.users(id,email,email_confirmed_at,aud,role) VALUES
  (adm,'pack-admin@example.invalid',now(),'authenticated','authenticated'),
  (u0,'pack-new@example.invalid',now(),'authenticated','authenticated'),
  (u1,'pack-one@example.invalid',now(),'authenticated','authenticated'),
  (u2,'pack-two@example.invalid',now(),'authenticated','authenticated'),
  (u3,'pack-three@example.invalid',now(),'authenticated','authenticated'),
  (uc,'pack-credit@example.invalid',now(),'authenticated','authenticated'),
  (up,'pack-partial@example.invalid',now(),'authenticated','authenticated');
 INSERT INTO private.admins(user_id) VALUES(adm);
 UPDATE public.products SET active=true WHERE id LIKE 'guide\_%' OR id IN ('pack_all','market');
 UPDATE private.payment_settings SET enabled=true;

 -- Signed-out visitors see the full price.
 PERFORM set_config('request.jwt.claim.sub','',true);
 q:=public.pack_quote();
 IF (q->>'price')::int<>259 OR (q->>'owned_guides')::int<>0 OR (q->>'guides')::int<>11 OR (q->>'owns_pack')::boolean THEN RAISE EXCEPTION 'anon quote wrong: %',q; END IF;

 -- New customer: 259 baht, QR order with satang suffix.
 PERFORM set_config('request.jwt.claim.sub',u0::text,true);
 IF (public.pack_quote()->>'price')::int<>259 THEN RAISE EXCEPTION 'new customer price'; END IF;
 p:=public.create_payment_order('pack_all');
 IF p->>'status'<>'awaiting_slip' OR (p->>'amount')::int<>259 OR (p->>'amount_due_cents')::bigint NOT BETWEEN 25911 AND 25949 THEN RAISE EXCEPTION 'new customer order: %',p; END IF;
 -- Gaining a guide while the QR is open re-prices the pack instead of charging 259.
 INSERT INTO public.entitlements(user_id,product,expires_at,source) VALUES(u0,'guide_mage',null,'test');
 p2:=public.create_payment_order('pack_all');
 IF (p2->>'amount')::int<>160 OR (SELECT status FROM public.payments WHERE id=(p->>'id')::bigint)<>'cancelled' THEN RAISE EXCEPTION 'stale pack order not re-priced'; END IF;

 -- One guide bought at a personal 69-baht price: still one guide (99 off), sale stays 69.
 PERFORM set_config('request.jwt.claim.sub',adm::text,true);
 PERFORM public.admin_record_manual_sale('pack-one@example.invalid','guide_bandit',69,gen_random_uuid());
 PERFORM public.admin_record_manual_sale('pack-one@example.invalid','market',50,gen_random_uuid());
 PERFORM set_config('request.jwt.claim.sub',u1::text,true);
 q:=public.pack_quote();
 IF (q->>'owned_guides')::int<>1 OR (q->>'price')::int<>160 OR (q->>'discount')::int<>99 THEN RAISE EXCEPTION 'one guide (+free Sindit, +market) quote: %',q; END IF;
 IF (SELECT amount FROM public.payments WHERE user_id=u1 AND product='guide_bandit')<>69 THEN RAISE EXCEPTION '69-baht sale history changed'; END IF;

 -- Two guides: 61 baht.
 INSERT INTO public.entitlements(user_id,product,expires_at,source) VALUES(u2,'guide_bandit',null,'test'),(u2,'guide_sindit',null,'test'),
  (u2,'guide_fighter',now()-interval '1 day','admin_suspended');
 PERFORM set_config('request.jwt.claim.sub',u2::text,true);
 IF (public.pack_quote()->>'price')::int<>61 THEN RAISE EXCEPTION 'two guides (suspended one ignored) price: %',public.pack_quote(); END IF;

 -- Three guides: free claim without QR or slip, and only once.
 INSERT INTO public.entitlements(user_id,product,expires_at,source) VALUES(u3,'guide_bandit',null,'test'),(u3,'guide_mage',null,'test'),(u3,'guide_hunter',null,'test');
 INSERT INTO private.credit_accounts(user_id,balance_cents) VALUES(u3,5000) ON CONFLICT(user_id) DO UPDATE SET balance_cents=5000;
 PERFORM set_config('request.jwt.claim.sub',u3::text,true);
 IF (public.pack_quote()->>'price')::int<>0 THEN RAISE EXCEPTION 'three guides not free'; END IF;
 p:=public.create_payment_order('pack_all');
 IF p->>'status'<>'ok' OR (p->>'amount')::int<>0 OR (p->>'amount_due_cents')::bigint<>0 OR (p->>'credit_applied_cents')::bigint<>0 OR (p->>'processing_fee_cents')::int<>0 OR p->>'verification_code'<>'FREE_PACK_UPGRADE' THEN RAISE EXCEPTION 'free claim: %',p; END IF;
 IF (public.credit_summary()->>'available_cents')::bigint<>5000 THEN RAISE EXCEPTION 'free claim touched credit'; END IF;
 failed:=false; BEGIN PERFORM public.create_payment_order('pack_all'); failed:=true; EXCEPTION WHEN raise_exception THEN NULL; END;
 IF failed THEN RAISE EXCEPTION 'pack claimed twice'; END IF;
 IF (SELECT count(*) FROM public.payments WHERE user_id=u3 AND product='pack_all')<>1 OR (SELECT count(*) FROM public.entitlements WHERE user_id=u3 AND product='pack_all')<>1 THEN RAISE EXCEPTION 'duplicate pack rows'; END IF;
 FOREACH c IN ARRAY private.pack_covers() LOOP
  IF NOT private.has_product(u3,c) THEN RAISE EXCEPTION 'pack missing %',c; END IF;
 END LOOP;
 IF NOT (public.pack_quote()->>'owns_pack')::boolean THEN RAISE EXCEPTION 'owns_pack false'; END IF;
 acct:=public.sync_account();
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(acct->'entitlements') e WHERE e->>'product'='market' AND e->'expires_at'='null'::jsonb) THEN RAISE EXCEPTION 'market not permanent in sync_account'; END IF;
 failed:=false; BEGIN PERFORM public.create_payment_order('market'); failed:=true; EXCEPTION WHEN raise_exception THEN NULL; END;
 IF failed THEN RAISE EXCEPTION 'pack owner could buy market'; END IF;
 failed:=false; BEGIN PERFORM public.create_payment_order('guide_cleric'); failed:=true; EXCEPTION WHEN raise_exception THEN NULL; END;
 IF failed THEN RAISE EXCEPTION 'pack owner could buy a covered guide'; END IF;

 -- Credit covers the discounted price once (one guide -> 160 baht).
 INSERT INTO public.entitlements(user_id,product,expires_at,source) VALUES(uc,'guide_assassin',null,'test');
 INSERT INTO private.credit_accounts(user_id,balance_cents) VALUES(uc,20000) ON CONFLICT(user_id) DO UPDATE SET balance_cents=20000;
 PERFORM set_config('request.jwt.claim.sub',uc::text,true);
 p:=public.create_payment_order('pack_all');
 IF p->>'status'<>'ok' OR (p->>'amount')::int<>160 OR (p->>'credit_applied_cents')::bigint<>16000 OR (p->>'amount_due_cents')::bigint<>0 THEN RAISE EXCEPTION 'credit pack order: %',p; END IF;
 IF (public.credit_summary()->>'available_cents')::bigint<>4000 THEN RAISE EXCEPTION 'credit charged wrong: %',public.credit_summary(); END IF;

 -- Partial credit: 100 baht credit against 160, QR for the rest only.
 INSERT INTO public.entitlements(user_id,product,expires_at,source) VALUES(up,'guide_page',null,'test');
 INSERT INTO private.credit_accounts(user_id,balance_cents) VALUES(up,10000) ON CONFLICT(user_id) DO UPDATE SET balance_cents=10000;
 PERFORM set_config('request.jwt.claim.sub',up::text,true);
 p:=public.create_payment_order('pack_all'); pid:=(p->>'id')::bigint;
 IF p->>'status'<>'awaiting_slip' OR (p->>'credit_applied_cents')::bigint<>10000 OR (p->>'amount_due_cents')::bigint NOT BETWEEN 6011 AND 6049 THEN RAISE EXCEPTION 'partial credit pack: %',p; END IF;
 UPDATE public.payments SET status='pending' WHERE id=pid;
 p2:=private.settle_transfer(pid,(p->>'amount_due_cents')::bigint,'PACK-TEST-REF-001','provider','');
 IF p2->>'status'<>'ok' OR NOT private.has_product(up,'guide_crossbowman') OR NOT private.has_product(up,'market') OR (public.credit_summary()->>'available_cents')::bigint<>0 THEN RAISE EXCEPTION 'pack settlement: %',p2; END IF;

 -- Revoking the pack payment removes everything it gave, but keeps guides bought separately.
 PERFORM set_config('request.jwt.claim.sub',adm::text,true);
 PERFORM public.admin_revoke(pid);
 IF private.has_product(up,'guide_crossbowman') OR private.has_product(up,'market') OR NOT private.has_product(up,'guide_page') THEN RAISE EXCEPTION 'pack revoke wrong'; END IF;
 -- The admin sales report lists the pack with its real amount.
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.admin_sales_report(NULL,NULL,'pack-credit@example.invalid')->'orders') o WHERE o->>'product'='pack_all' AND (o->>'amount')::int=160) THEN RAISE EXCEPTION 'sales report missing pack'; END IF;
END $test$;
SELECT 'PASS: pack price 259/160/61/0, Sindit and market not counted, free claim once, credit once, settlement, revoke, sales report' AS result;
ROLLBACK;
