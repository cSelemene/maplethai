BEGIN;
INSERT INTO auth.users(id,email) VALUES('10000000-0000-4000-8000-000000000071','credit-test-a@example.invalid'),('10000000-0000-4000-8000-000000000072','credit-test-b@example.invalid');
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000071',true);
DO $$ DECLARE a uuid:='10000000-0000-4000-8000-000000000071'; b uuid:='10000000-0000-4000-8000-000000000072'; p jsonb; r jsonb; pid bigint; bal bigint; BEGIN
 p:=public.create_payment_order('guide_bandit');pid:=(p->>'id')::bigint;
 UPDATE public.payments SET status='pending' WHERE id=pid;
 r:=private.settle_transfer(pid,5000,'CREDIT-TEST-REF-001','provider','');
 IF r->>'status'<>'credited' OR private.has_product(a,'guide_bandit') THEN RAISE EXCEPTION 'underpayment unlocked or lost';END IF;
 IF (public.credit_summary()->>'available_cents')::bigint<>5000 THEN RAISE EXCEPTION 'underpayment missing credit'; END IF;
 r:=private.settle_transfer(pid,5000,'CREDIT-TEST-REF-001','provider','');
 IF (public.credit_summary()->>'available_cents')::bigint<>5000 THEN RAISE EXCEPTION 'repeat credit'; END IF;
 p:=public.create_payment_order('market');
 IF p->>'status'<>'ok' OR (p->>'amount_due_cents')::bigint<>0 OR NOT private.has_product(a,'market') OR (public.credit_summary()->>'available_cents')::bigint<>0 THEN RAISE EXCEPTION '50 credit did not buy market'; END IF;
 -- Create another real-looking unmatched transfer of 50 to reserve against a 99 guide.
 p:=public.create_payment_order('guide_assassin');pid:=(p->>'id')::bigint;UPDATE public.payments SET status='pending' WHERE id=pid;PERFORM private.settle_transfer(pid,5000,'CREDIT-TEST-REF-002','provider','');
 p:=public.create_payment_order('guide_bandit');pid:=(p->>'id')::bigint;
 IF (p->>'amount_due_cents')::bigint<>4900 OR (p->>'credit_applied_cents')::bigint<>5000 THEN RAISE EXCEPTION 'partial due not 49'; END IF;
 PERFORM public.cancel_payment_order(pid);
 IF (public.credit_summary()->>'available_cents')::bigint<>5000 THEN RAISE EXCEPTION 'cancel did not release'; END IF;
 BEGIN PERFORM public.cancel_payment_order(pid);RAISE EXCEPTION 'double cancel allowed';EXCEPTION WHEN raise_exception THEN IF SQLERRM='double cancel allowed' THEN RAISE; END IF;END;
 p:=public.create_payment_order('guide_bandit');pid:=(p->>'id')::bigint;UPDATE public.payments SET status='pending' WHERE id=pid;
 r:=private.settle_transfer(pid,4900,'CREDIT-TEST-REF-003','provider','');
 IF r->>'status'<>'ok' OR NOT private.has_product(a,'guide_bandit') OR (public.credit_summary()->>'available_cents')::bigint<>0 THEN RAISE EXCEPTION 'partial purchase incorrect'; END IF;
 -- Overpayment includes sub-baht precision.
 p:=public.create_payment_order('guide_mage');pid:=(p->>'id')::bigint;UPDATE public.payments SET status='pending' WHERE id=pid;
 r:=private.settle_transfer(pid,10025,'CREDIT-TEST-REF-004','provider','');
 IF r->>'status'<>'ok' OR (public.credit_summary()->>'available_cents')::bigint<>125 THEN RAISE EXCEPTION 'overpayment not retained'; END IF;
 p:=public.create_payment_order('guide_assassin');pid:=(p->>'id')::bigint;UPDATE public.payments SET status='pending' WHERE id=pid;
 r:=private.settle_transfer(pid,10025,'CREDIT-TEST-REF-004','provider','');
 IF r->>'status'<>'rejected' OR (public.credit_summary()->>'available_cents')::bigint<>125 THEN RAISE EXCEPTION 'same user duplicate order not closed or credit lost';END IF;
 -- Reference cannot be used for another user or product.
 PERFORM set_config('request.jwt.claim.sub',b::text,true);
 p:=public.create_payment_order('guide_bandit');pid:=(p->>'id')::bigint;UPDATE public.payments SET status='pending' WHERE id=pid;
 r:=private.settle_transfer(pid,10025,'CREDIT-TEST-REF-004','provider','');
 IF r->>'code'<>'DUPLICATE_REFERENCE' OR private.has_product(b,'guide_bandit') OR (public.credit_summary()->>'available_cents')::bigint<>0 THEN RAISE EXCEPTION 'duplicate reused'; END IF;
 -- A reserved balance plus an underpayment must both be returned to available credit.
 PERFORM private.settle_transfer(pid,4000,'CREDIT-TEST-REF-005','provider','');
 p:=public.create_payment_order('guide_assassin');pid:=(p->>'id')::bigint;UPDATE public.payments SET status='pending' WHERE id=pid;
 r:=private.settle_transfer(pid,2500,'CREDIT-TEST-REF-006','provider','');
 IF r->>'status'<>'credited' OR (public.credit_summary()->>'available_cents')::bigint<>6500 OR (public.credit_summary()->>'reserved_cents')::bigint<>0 THEN RAISE EXCEPTION 'reserved credit lost underpayment'; END IF;
 -- Service callback validates the trusted receipt, then atomically spends reserved credit.
 p:=public.create_payment_order('guide_mage');pid:=(p->>'id')::bigint;UPDATE public.payments SET status='pending',verification_lease='10000000-0000-4000-8000-000000000073' WHERE id=pid;
 r:=public.svc_finish_payment_verification(pid,'10000000-0000-4000-8000-000000000073',jsonb_build_object('verified',true,'code','VERIFIED','amount_cents',3400,'bank_code','004','recipient_account','0248522232','currency','THB','transferred_at',now(),'trans_ref','CREDIT-TEST-REF-007'));
 IF r->>'status'<>'ok' OR NOT private.has_product(b,'guide_mage') OR (public.credit_summary()->>'available_cents')::bigint<>0 THEN RAISE EXCEPTION 'service receipt finalization failed'; END IF;
 r:=public.svc_finish_payment_verification(pid,'10000000-0000-4000-8000-000000000073',jsonb_build_object('verified',true));
 IF (public.credit_summary()->>'available_cents')::bigint<>0 THEN RAISE EXCEPTION 'duplicate callback mutated balance'; END IF;
END $$;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.credit_ledger WHERE user_id<>'10000000-0000-4000-8000-000000000072')<>0 THEN RAISE EXCEPTION 'ledger leaks'; END IF;
 BEGIN UPDATE private.credit_accounts SET balance_cents=999999;RAISE EXCEPTION 'wallet client writable';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.admin_record_transfer(1,1,'ILLEGAL-REF','');RAISE EXCEPTION 'nonadmin settlement allowed';EXCEPTION WHEN raise_exception THEN IF SQLERRM='nonadmin settlement allowed' THEN RAISE; END IF;END;
END $$;
RESET ROLE;
SELECT 'PASS: underpayment credit, idempotency, market purchase, 49-baht remainder, reservation cancellation, overpayment decimals, reference dedup, isolation and admin guard' AS result;
ROLLBACK;
