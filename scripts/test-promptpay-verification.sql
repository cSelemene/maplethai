BEGIN;
DO $$ DECLARE u uuid:=gen_random_uuid(); p jsonb; pid bigint; lease uuid:=gen_random_uuid(); r jsonb; proof jsonb; BEGIN
 INSERT INTO auth.users(id,email) VALUES(u,'promptpay-test@example.invalid');
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
 p:=public.create_payment_order('guide_bandit');pid:=(p->>'id')::bigint;
 UPDATE public.payments SET status='pending',verification_lease=lease WHERE id=pid;
 proof:=jsonb_build_object('verified',true,'code','VERIFIED','amount_cents',(p->>'amount_due_cents')::bigint,'bank_code','PROMPTPAY','recipient_type','EWALLETID','recipient_account','111111111111450','currency','THB','transferred_at',now(),'trans_ref','PP-SQL-TEST-001');
 r:=public.svc_finish_payment_verification(pid,lease,proof);
 IF r->>'status'<>'pending' OR private.has_product(u,'guide_bandit') THEN RAISE EXCEPTION 'wrong full proxy unlocked'; END IF;
 UPDATE public.payments SET verification_lease=lease WHERE id=pid;
 proof:=proof||jsonb_build_object('recipient_account','004999004651450');
 r:=public.svc_finish_payment_verification(pid,lease,proof);
 IF r->>'status'<>'ok' OR NOT private.has_product(u,'guide_bandit') OR (public.credit_summary()->>'available_cents')::bigint<>0 THEN RAISE EXCEPTION 'valid PromptPay failed'; END IF;
 r:=public.svc_finish_payment_verification(pid,lease,proof);
 IF r->>'code'<>'ALREADY_HANDLED' OR (SELECT count(*) FROM private.transfer_receipts WHERE trans_ref='PP-SQL-TEST-001')<>1 THEN RAISE EXCEPTION 'repeated callback credited'; END IF;
 IF has_function_privilege('authenticated','public.svc_finish_payment_verification(bigint,uuid,jsonb)','execute') OR has_function_privilege('anon','public.svc_finish_payment_verification(bigint,uuid,jsonb)','execute') THEN RAISE EXCEPTION 'callback client callable'; END IF;
END $$;
SELECT 'PASS: snapshot PromptPay identity, wrong receiver rejection, real amount/fee settlement, idempotency and service-only callback' AS result;
ROLLBACK;
