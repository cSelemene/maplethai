ALTER TABLE public.payments ADD COLUMN processing_fee_cents integer NOT NULL DEFAULT 0 CHECK(processing_fee_cents=0 OR processing_fee_cents BETWEEN 11 AND 49);
ALTER TABLE public.payments DROP CONSTRAINT payments_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_check CHECK(amount_due_cents>=0 AND amount_due_cents+credit_applied_cents=amount::bigint*100+processing_fee_cents);
CREATE INDEX payments_due_lookup ON public.payments(amount_due_cents,created_at DESC) WHERE amount_due_cents>0;
CREATE OR REPLACE FUNCTION public.create_payment_order(p_product text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); pr public.products%rowtype; pay public.payments%rowtype; cfg jsonb; credit bigint; fee integer:=0; due bigint;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,0));
 SELECT * INTO pr FROM public.products WHERE id=p_product AND active AND id IN ('guide_bandit','guide_assassin','guide_mage','market');
 IF pr.id IS NULL THEN RAISE EXCEPTION 'สินค้านี้ยังไม่เปิดขาย'; END IF;
 IF private.has_product(uid,p_product) THEN RAISE EXCEPTION 'คุณมีสิทธิ์นี้แล้ว'; END IF;
 SELECT * INTO pay FROM public.payments WHERE user_id=uid AND product=p_product AND status IN ('awaiting_slip','pending');
 IF pay.id IS NOT NULL THEN RETURN to_jsonb(pay); END IF;
 cfg:=public.payment_settings();
 IF NOT coalesce((cfg->>'enabled')::boolean,false) THEN RAISE EXCEPTION 'ยังไม่เปิดรับชำระเงิน'; END IF;
 IF (SELECT count(*) FROM public.payments WHERE user_id=uid AND created_at>now()-interval '1 day')>=10 THEN RAISE EXCEPTION 'สร้างรายการบ่อยเกินไป กรุณาลองใหม่พรุ่งนี้'; END IF;
 credit:=least(coalesce((SELECT balance_cents FROM private.credit_accounts WHERE user_id=uid),0),pr.price::bigint*100);
 -- Full credit purchases have no bank transfer or processing fee. For partial
 -- purchases retain fractional credit so every QR ends in .11 through .49.
 IF credit<pr.price::bigint*100 THEN
  credit:=(credit/100)*100;
  due:=pr.price::bigint*100-credit;
  PERFORM pg_advisory_xact_lock(hashtextextended('payment-amount-allocation',0));
  SELECT s INTO fee FROM generate_series(11,49) s
  WHERE NOT EXISTS(SELECT 1 FROM public.payments p WHERE p.amount_due_cents=due+s
    AND (p.status IN ('awaiting_slip','pending') OR p.created_at>now()-interval '24 hours'))
  ORDER BY random() LIMIT 1;
  IF fee IS NULL THEN RAISE EXCEPTION 'ยอดชำระช่วงนี้ถูกจองครบแล้ว กรุณาลองใหม่ภายหลัง'; END IF;
 END IF;
 INSERT INTO public.payments(user_id,email,product,amount,trans_ref,slip_path,status,recipient,credit_applied_cents,amount_due_cents,processing_fee_cents) VALUES(uid,(SELECT email FROM auth.users WHERE id=uid),p_product,pr.price,'ORDER-'||gen_random_uuid()::text,'',CASE WHEN credit=pr.price::bigint*100 THEN 'ok' ELSE 'awaiting_slip' END,cfg,credit,pr.price::bigint*100-credit+fee,fee) RETURNING * INTO pay;
 PERFORM private.change_credit(uid,pay.id,'reserve',-credit);
 IF pay.status='ok' THEN
  PERFORM private.grant_product(uid,p_product,'credit');
  UPDATE public.payments SET verification_code='PAID_WITH_CREDIT',reviewed_at=now(),review_note='ชำระด้วยเครดิตคงเหลือ' WHERE id=pay.id RETURNING * INTO pay;
 END IF;
 RETURN to_jsonb(pay);
END $$;

REVOKE ALL ON FUNCTION public.create_payment_order(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_payment_order(text) TO authenticated;
