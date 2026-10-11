BEGIN;
-- Synthetic data and all mutations roll back; no live receipt is submitted.
DO $$ DECLARE u uuid; p jsonb; q jsonb; r jsonb; pid bigint; fee integer; due bigint; seen bigint[]:='{}'; i integer; a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); balance bigint; BEGIN
 INSERT INTO auth.users(id,email) VALUES(a,'satang-a@example.invalid'),(b,'satang-b@example.invalid');
 PERFORM set_config('request.jwt.claim.sub',a::text,true);
 p:=public.create_payment_order('guide_bandit');pid:=(p->>'id')::bigint;fee:=(p->>'processing_fee_cents')::integer;due:=(p->>'amount_due_cents')::bigint;
 IF fee NOT BETWEEN 11 AND 49 OR due<>9900+fee THEN RAISE EXCEPTION 'suffix out of range'; END IF;
 q:=public.create_payment_order('guide_bandit');IF q->>'id'<>p->>'id' OR q->>'amount_due_cents'<>p->>'amount_due_cents' THEN RAISE EXCEPTION 'refresh rerandomized'; END IF;
 UPDATE public.payments SET status='pending' WHERE id=pid;
 r:=private.settle_transfer(pid,due,'SATANG-TEST-EXACT','provider','');
 IF r->>'status'<>'ok' OR (public.credit_summary()->>'available_cents')::bigint<>0 THEN RAISE EXCEPTION 'fee wrongly credited or exact purchase failed'; END IF;
 p:=public.create_payment_order('guide_assassin');pid:=(p->>'id')::bigint;due:=(p->>'amount_due_cents')::bigint;
 UPDATE public.payments SET status='pending' WHERE id=pid;
 r:=private.settle_transfer(pid,due+25,'SATANG-TEST-OVER','provider','');
 IF (public.credit_summary()->>'available_cents')::bigint<>25 THEN RAISE EXCEPTION 'excess not credited'; END IF;
 p:=public.create_payment_order('guide_mage');pid:=(p->>'id')::bigint;
 IF (p->>'credit_applied_cents')::bigint<>0 OR (p->>'amount_due_cents')::bigint%100 NOT BETWEEN 11 AND 49 THEN RAISE EXCEPTION 'fractional wallet broke suffix'; END IF;
 UPDATE public.payments SET status='pending' WHERE id=pid;
 r:=private.settle_transfer(pid,5000,'SATANG-TEST-UNDER','provider','');
 IF r->>'status'<>'credited' OR (public.credit_summary()->>'available_cents')::bigint<>5025 THEN RAISE EXCEPTION 'underpayment lost'; END IF;
 p:=public.create_payment_order('guide_mage');pid:=(p->>'id')::bigint;
 IF (p->>'credit_applied_cents')::bigint<>5000 OR (p->>'amount_due_cents')::bigint NOT BETWEEN 4911 AND 4949 THEN RAISE EXCEPTION 'partial credit amount incorrect'; END IF;
 PERFORM public.cancel_payment_order(pid);
 IF (public.credit_summary()->>'available_cents')::bigint<>5025 THEN RAISE EXCEPTION 'cancel credit missing'; END IF;
 p:=public.create_payment_order('market');
 IF p->>'status'<>'ok' OR (p->>'processing_fee_cents')::int<>0 OR (public.credit_summary()->>'available_cents')::bigint<>25 THEN RAISE EXCEPTION 'full credit charged fee'; END IF;
 -- Exhaust a fresh payable base (seed balances produce a 17-baht remainder).
 FOR i IN 1..40 LOOP
  u:=gen_random_uuid();INSERT INTO auth.users(id,email) VALUES(u,'satang-pool-'||i||'@example.invalid');
  INSERT INTO private.credit_accounts(user_id,balance_cents) VALUES(u,8200);
  PERFORM set_config('request.jwt.claim.sub',u::text,true);
  IF i<=39 THEN
   p:=public.create_payment_order('guide_bandit');due:=(p->>'amount_due_cents')::bigint;
   IF due=ANY(seen) OR due NOT BETWEEN 1711 AND 1749 THEN RAISE EXCEPTION 'duplicate pool amount'; END IF;
   seen:=array_append(seen,due);
  ELSE
   BEGIN PERFORM public.create_payment_order('guide_bandit');RAISE EXCEPTION 'pool exhaustion silently duplicates';
   EXCEPTION WHEN raise_exception THEN IF SQLERRM='pool exhaustion silently duplicates' THEN RAISE; END IF; END;
   IF (public.credit_summary()->>'available_cents')::bigint<>8200 THEN RAISE EXCEPTION 'exhaustion reserved credit'; END IF;
   -- Released amounts are not reused in the same 24h window.
   UPDATE public.payments SET status='cancelled' WHERE amount_due_cents=seen[1] AND processing_fee_cents>0;
   BEGIN PERFORM public.create_payment_order('guide_bandit');RAISE EXCEPTION 'cancelled recent amount reused';
   EXCEPTION WHEN raise_exception THEN IF SQLERRM='cancelled recent amount reused' THEN RAISE; END IF; END;
   UPDATE public.payments SET created_at=now()-interval '25 hours' WHERE amount_due_cents=seen[1] AND status='cancelled';
   p:=public.create_payment_order('guide_bandit');IF (p->>'amount_due_cents')::bigint<>seen[1] THEN RAISE EXCEPTION 'slot not released after quarantine'; END IF;
  END IF;
 END LOOP;
END $$;
SELECT 'PASS: .11-.49 range, exact fee settlement, excess credit, underpayment, fractional balances, cancel, full-credit fee exemption, 39 unique slots, exhaustion and quarantine' AS result;
ROLLBACK;
