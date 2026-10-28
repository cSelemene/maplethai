-- Isolated integration test: all user/order/config/storage metadata changes roll back.
BEGIN;
CREATE TEMP TABLE payment_test_results(result text);
DO $$
DECLARE buyer uuid:=gen_random_uuid(); admin uuid:=gen_random_uuid(); other uuid:=gen_random_uuid(); a jsonb; b jsonb; pid bigint; rejected_id bigint; path text; failed boolean;
BEGIN
 INSERT INTO auth.users(id,email) VALUES(buyer,'payment-test-buyer@example.invalid'),(admin,'payment-test-admin@example.invalid'),(other,'payment-test-other@example.invalid');
 INSERT INTO private.admins(user_id) VALUES(admin);
 UPDATE private.payment_settings SET enabled=false WHERE id; -- start from a closed checkout whatever the live setting is
 PERFORM set_config('request.jwt.claim.sub',buyer::text,true);
 failed:=false; BEGIN PERFORM public.create_payment_order('guide_bandit'); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Disabled checkout accepted order'; END IF;
 failed:=false; BEGIN PERFORM public.admin_payment_settings(true,'Test Bank','1234567890','Test Receiver'); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Buyer changed recipient settings'; END IF;
 PERFORM set_config('request.jwt.claim.sub',admin::text,true);
 PERFORM public.admin_payment_settings(true,'Test Bank','1234567890','Test Receiver');
 PERFORM set_config('request.jwt.claim.sub',buyer::text,true);
 a:=public.create_payment_order('guide_bandit'); b:=public.create_payment_order('guide_bandit'); pid:=(a->>'id')::bigint;
 IF a->>'id' IS DISTINCT FROM b->>'id' OR (a->>'amount')::int<>99 THEN RAISE EXCEPTION 'Order idempotency/server pricing failed'; END IF;
 IF private.has_product(buyer,'guide_bandit') THEN RAISE EXCEPTION 'Order prematurely granted entitlement'; END IF;
 failed:=false; BEGIN PERFORM public.submit_payment_slip(pid,buyer::text||'/'||pid||'/missing.png'); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Missing slip accepted'; END IF;
 path:=buyer::text||'/'||pid||'/test.png';
 INSERT INTO storage.objects(bucket_id,name,owner_id,metadata) VALUES('slips',path,buyer::text,'{"mimetype":"image/png","size":100}');
 PERFORM set_config('request.jwt.claim.sub',other::text,true);
 failed:=false; BEGIN PERFORM public.submit_payment_slip(pid,path); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Other user submitted buyer order'; END IF;
 PERFORM set_config('request.jwt.claim.sub',buyer::text,true);
 PERFORM public.submit_payment_slip(pid,path);
 IF private.has_product(buyer,'guide_bandit') THEN RAISE EXCEPTION 'Slip upload prematurely granted entitlement'; END IF;
 -- A wrong slip can be replaced while the order is pending, but not during a running check.
 INSERT INTO storage.objects(bucket_id,name,owner_id,metadata) VALUES('slips',buyer::text||'/'||pid||'/second.png',buyer::text,'{"mimetype":"image/png","size":100}');
 UPDATE public.payments SET verification_lease=gen_random_uuid(),verification_started_at=now(),verification_code='VERIFYING' WHERE id=pid;
 failed:=false; BEGIN PERFORM public.submit_payment_slip(pid,buyer::text||'/'||pid||'/second.png'); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Slip replaced during a running check'; END IF;
 UPDATE public.payments SET verification_lease=NULL,verification_code='VALIDATION_FAILED' WHERE id=pid;
 PERFORM public.submit_payment_slip(pid,buyer::text||'/'||pid||'/second.png');
 IF NOT EXISTS(SELECT 1 FROM public.payments WHERE id=pid AND status='pending' AND slip_path=buyer::text||'/'||pid||'/second.png' AND verification_code IS NULL) THEN RAISE EXCEPTION 'Pending order did not accept a replacement slip'; END IF;
 failed:=false; BEGIN PERFORM public.admin_review_payment(pid,true,99,'TEST-REF-001',''); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Buyer approved own payment'; END IF;
 PERFORM set_config('request.jwt.claim.sub',admin::text,true);
 -- Orders carry a .11-.49 satang suffix, so the admin records the exact received amount.
 -- Underpayment (kept as credit) is covered by scripts/test-credit.sql.
 PERFORM public.admin_record_transfer(pid,(a->>'amount_due_cents')::numeric/100,'TEST-REF-001','Verified in bank account');
 IF NOT private.has_product(buyer,'guide_bandit') OR private.has_product(buyer,'guide_assassin') THEN RAISE EXCEPTION 'Wrong product rights granted'; END IF;
 failed:=false; BEGIN PERFORM public.admin_review_payment(pid,true,99,'TEST-REF-001',''); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Repeated approval accepted'; END IF;
 PERFORM set_config('request.jwt.claim.sub',buyer::text,true);
 b:=public.create_payment_order('guide_assassin'); rejected_id:=(b->>'id')::bigint;
 path:=buyer::text||'/'||rejected_id||'/test.png';
 INSERT INTO storage.objects(bucket_id,name,owner_id,metadata) VALUES('slips',path,buyer::text,'{"mimetype":"image/png","size":100}');
 PERFORM public.submit_payment_slip(rejected_id,path);
 PERFORM set_config('request.jwt.claim.sub',admin::text,true);
 failed:=false; BEGIN PERFORM public.admin_review_payment(rejected_id,true,99,'TEST-REF-001',''); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Reused bank reference accepted'; END IF;
 PERFORM public.admin_review_payment(rejected_id,false,null,null,'Payment not received');
 IF private.has_product(buyer,'guide_assassin') THEN RAISE EXCEPTION 'Rejection granted entitlement'; END IF;
 failed:=false; BEGIN PERFORM public.admin_revoke(rejected_id); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed OR NOT private.has_product(buyer,'guide_bandit') THEN RAISE EXCEPTION 'Invalid revocation affected entitlement'; END IF;
 PERFORM set_config('request.jwt.claim.sub',buyer::text,true);
 b:=public.create_payment_order('guide_mage'); PERFORM public.cancel_payment_order((b->>'id')::bigint);
 INSERT INTO payment_test_results VALUES('PASS: disabled checkout, admin authorization, server price, idempotent order, slip ownership/existence, no premature access, exact amount grant, correct guide grant, repeated approval blocked, duplicate bank reference blocked, rejection, cancellation, revocation guard');
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.payments) THEN RAISE EXCEPTION 'RLS leaked another user payments'; END IF;
 IF EXISTS(SELECT 1 FROM public.entitlements) THEN RAISE EXCEPTION 'RLS leaked another user entitlements'; END IF;
END $$;
RESET ROLE;
SELECT result FROM payment_test_results;
ROLLBACK;
