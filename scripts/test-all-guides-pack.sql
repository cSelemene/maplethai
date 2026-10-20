BEGIN;
DO $test$
DECLARE fresh uuid:=gen_random_uuid(); one uuid:=gen_random_uuid(); three uuid:=gen_random_uuid(); mkt uuid:=gen_random_uuid();
 p jsonb; q jsonb; acc jsonb; failed boolean:=false; old_id bigint;
BEGIN
 INSERT INTO auth.users(id,email,email_confirmed_at,aud,role) VALUES
 (fresh,'pack-fresh@example.invalid',now(),'authenticated','authenticated'),
 (one,'pack-one@example.invalid',now(),'authenticated','authenticated'),
 (three,'pack-three@example.invalid',now(),'authenticated','authenticated'),
 (mkt,'pack-market@example.invalid',now(),'authenticated','authenticated');
 UPDATE public.products SET active=true WHERE id LIKE 'guide\_%';
 INSERT INTO public.guide_files(guide,html) VALUES('cleric','<html><head></head><body>cleric</body></html>') ON CONFLICT(guide) DO UPDATE SET html=excluded.html;
 UPDATE private.payment_settings SET enabled=true;

 -- Anonymous visitors see the base price.
 PERFORM set_config('request.jwt.claim.sub','',true);
 q:=public.pack_quote();
 IF (q->>'price')::int<>259 OR (q->>'guides')::int<>11 THEN RAISE EXCEPTION 'anonymous quote wrong: %',q; END IF;

 -- New buyer pays 259 and gets nothing before paying.
 PERFORM set_config('request.jwt.claim.sub',fresh::text,true);
 p:=public.create_payment_order('pack_all');
 IF p->>'status'<>'awaiting_slip' OR (p->>'amount')::int<>259 OR (p->>'amount_due_cents')::bigint NOT BETWEEN 25911 AND 25949 THEN RAISE EXCEPTION 'fresh pack order wrong: %',p; END IF;
 IF private.has_product(fresh,'guide_cleric') OR private.has_product(fresh,'pack_all') THEN RAISE EXCEPTION 'pack granted before payment'; END IF;

 -- Owning one guide = 160; market subscription does not count.
 INSERT INTO public.entitlements(user_id,product,expires_at,source) VALUES(one,'guide_mage',null,'payment'),(one,'market',now()+interval '20 days','payment');
 PERFORM set_config('request.jwt.claim.sub',one::text,true);
 q:=public.pack_quote();
 IF (q->>'price')::int<>160 OR (q->>'owned_guides')::int<>1 THEN RAISE EXCEPTION 'one-guide quote wrong: %',q; END IF;
 p:=public.create_payment_order('pack_all'); old_id:=(p->>'id')::bigint;
 IF (p->>'amount')::int<>160 THEN RAISE EXCEPTION 'one-guide order price wrong: %',p; END IF;
 -- Buying another guide meanwhile re-prices the waiting order to 61.
 INSERT INTO public.entitlements(user_id,product,expires_at,source) VALUES(one,'guide_page',null,'payment');
 p:=public.create_payment_order('pack_all');
 IF (p->>'amount')::int<>61 OR (p->>'id')::bigint=old_id OR (SELECT status FROM public.payments WHERE id=old_id)<>'cancelled' THEN RAISE EXCEPTION 'stale pack order not replaced: %',p; END IF;
 -- Paying it with credit unlocks every covered guide and permanent market.
 UPDATE public.payments SET status='cancelled' WHERE id=(p->>'id')::bigint;
 INSERT INTO private.credit_accounts(user_id,balance_cents) VALUES(one,6100) ON CONFLICT(user_id) DO UPDATE SET balance_cents=6100;
 p:=public.create_payment_order('pack_all');
 IF p->>'status'<>'ok' THEN RAISE EXCEPTION 'credit pack purchase failed: %',p; END IF;
 IF NOT private.has_product(one,'guide_cleric') OR NOT private.has_product(one,'guide_sindit') OR NOT private.has_product(one,'market') THEN RAISE EXCEPTION 'pack does not cover everything'; END IF;
 IF position('cleric' IN public.get_guide('cleric'))=0 THEN RAISE EXCEPTION 'pack owner cannot read Cleric'; END IF;
 acc:=public.sync_account();
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(acc->'entitlements') e WHERE e->>'product'='market' AND e->>'expires_at' IS NULL) THEN RAISE EXCEPTION 'market not shown as permanent: %',acc; END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(acc->'entitlements') e WHERE e->>'product'='guide_hunter') THEN RAISE EXCEPTION 'pack guides missing from account: %',acc; END IF;
 IF (SELECT count(*) FROM jsonb_array_elements(acc->'entitlements') e WHERE e->>'product'='market')<>1 THEN RAISE EXCEPTION 'market listed twice'; END IF;
 IF NOT (private.marketplace_contact_quota()->>'unlimited')::boolean THEN RAISE EXCEPTION 'pack owner has no unlimited market'; END IF;
 BEGIN PERFORM public.create_payment_order('pack_all'); failed:=true; EXCEPTION WHEN raise_exception THEN NULL; END;
 IF failed THEN RAISE EXCEPTION 'pack bought twice'; END IF;
 BEGIN PERFORM public.create_payment_order('market'); failed:=true; EXCEPTION WHEN raise_exception THEN NULL; END;
 IF failed THEN RAISE EXCEPTION 'pack owner could still buy market'; END IF;

 -- Three guides or more = free claim, no QR.
 INSERT INTO public.entitlements(user_id,product,expires_at,source) VALUES(three,'guide_bandit',null,'payment'),(three,'guide_assassin',null,'payment'),(three,'guide_fighter',null,'grandfather');
 PERFORM set_config('request.jwt.claim.sub',three::text,true);
 IF (public.pack_quote()->>'price')::int<>0 THEN RAISE EXCEPTION 'three-guide quote not free'; END IF;
 p:=public.create_payment_order('pack_all');
 IF p->>'status'<>'ok' OR (p->>'amount_due_cents')::bigint<>0 OR p->>'verification_code'<>'FREE_PACK_UPGRADE' THEN RAISE EXCEPTION 'free claim wrong: %',p; END IF;
 IF NOT private.has_product(three,'guide_crossbowman') OR NOT private.has_product(three,'market') THEN RAISE EXCEPTION 'free claim did not unlock'; END IF;

 -- Market-only subscribers get no discount.
 INSERT INTO public.entitlements(user_id,product,expires_at,source) VALUES(mkt,'market',now()+interval '5 days','payment');
 PERFORM set_config('request.jwt.claim.sub',mkt::text,true);
 IF (public.pack_quote()->>'price')::int<>259 THEN RAISE EXCEPTION 'market subscription was discounted'; END IF;

 -- Gifts and referrals cannot carry the pack.
 BEGIN PERFORM public.create_gift_payment_order('pack_all','pack-fresh@example.invalid'); failed:=true; EXCEPTION WHEN raise_exception THEN NULL; END;
 IF failed THEN RAISE EXCEPTION 'pack could be gifted'; END IF;

 -- Revoking the pack payment removes everything it unlocked; owned guides stay.
 PERFORM set_config('request.jwt.claim.sub',three::text,true);
 INSERT INTO private.admins(user_id) VALUES(three) ON CONFLICT DO NOTHING;
 PERFORM public.admin_revoke((p->>'id')::bigint);
 DELETE FROM private.admins WHERE user_id=three;
 IF private.has_product(three,'guide_crossbowman') OR private.has_product(three,'market') OR NOT private.has_product(three,'guide_bandit') THEN RAISE EXCEPTION 'revoke did not remove only the pack'; END IF;
 RAISE NOTICE 'PASS';
END $test$;
ROLLBACK;
