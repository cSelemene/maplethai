BEGIN;
DO $test$
DECLARE buyer uuid:=gen_random_uuid(); owner uuid:=gen_random_uuid(); p jsonb; failed boolean:=false;
BEGIN
 INSERT INTO auth.users(id,email,email_confirmed_at,aud,role) VALUES
 (buyer,'sindit-test-buyer@example.invalid',now(),'authenticated','authenticated'),(owner,'sindit-test-owner@example.invalid',now(),'authenticated','authenticated');
 INSERT INTO public.guide_files(guide,html) VALUES('sindit','<html><head></head><body>sindit</body></html>') ON CONFLICT(guide) DO NOTHING;
 UPDATE private.payment_settings SET enabled=true;
 -- Buying Sindit on its own grants Sindit only.
 INSERT INTO private.credit_accounts(user_id,balance_cents) VALUES(buyer,9900) ON CONFLICT(user_id) DO UPDATE SET balance_cents=9900;
 PERFORM set_config('request.jwt.claim.sub',buyer::text,true);
 p:=public.create_payment_order('guide_sindit');
 IF p->>'status'<>'ok' OR NOT private.has_product(buyer,'guide_sindit') OR private.has_product(buyer,'guide_bandit') THEN RAISE EXCEPTION 'Sindit purchase did not grant exactly Sindit'; END IF;
 IF position('sindit' IN public.get_guide('sindit'))=0 THEN RAISE EXCEPTION 'Sindit buyer cannot read Sindit'; END IF;
 BEGIN PERFORM public.get_guide('bandit'); failed:=true; EXCEPTION WHEN raise_exception THEN NULL; END;
 IF failed THEN RAISE EXCEPTION 'Sindit buyer could read Bandit'; END IF;
 -- Bandit owners keep Sindit for free and cannot buy it again.
 INSERT INTO public.entitlements(user_id,product,expires_at,source) VALUES(owner,'guide_bandit',null,'test');
 PERFORM set_config('request.jwt.claim.sub',owner::text,true);
 IF NOT private.has_product(owner,'guide_sindit') THEN RAISE EXCEPTION 'Bandit owner lost free Sindit'; END IF;
 IF position('sindit' IN public.get_guide('sindit'))=0 THEN RAISE EXCEPTION 'Bandit owner cannot read Sindit'; END IF;
 BEGIN PERFORM public.create_payment_order('guide_sindit'); failed:=true; EXCEPTION WHEN raise_exception THEN NULL; END;
 IF failed THEN RAISE EXCEPTION 'Bandit owner was able to buy Sindit again'; END IF;
END $test$;
ROLLBACK;
