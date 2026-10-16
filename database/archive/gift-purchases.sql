ALTER TABLE public.payments ADD COLUMN gift_email text;
ALTER TABLE public.payments ADD CONSTRAINT payments_gift_email_valid CHECK(gift_email IS NULL OR (gift_email=lower(btrim(gift_email)) AND length(gift_email)<=254 AND gift_email ~ '^[^[:space:]@]+@[^[:space:]@.]+\.[^[:space:]@]+$' AND product IN ('guide_bandit','guide_assassin','guide_mage')));
DROP INDEX public.payments_one_open_order;
CREATE UNIQUE INDEX payments_one_open_order ON public.payments(user_id,product,coalesce(gift_email,'')) WHERE status IN ('awaiting_slip','pending');
CREATE TABLE private.payment_gifts(payment_id bigint PRIMARY KEY REFERENCES public.payments(id),recipient_email text NOT NULL,claimed_by uuid REFERENCES auth.users(id),claimed_at timestamptz);
ALTER TABLE private.payment_gifts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.payment_gifts FROM PUBLIC,anon,authenticated;
CREATE INDEX payment_gifts_unclaimed_email ON private.payment_gifts(recipient_email) WHERE claimed_by IS NULL;
CREATE OR REPLACE FUNCTION private.claim_gifts(uid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
DECLARE em text; r record;
BEGIN
 SELECT lower(email) INTO em FROM auth.users WHERE id=uid AND email_confirmed_at IS NOT NULL;
 IF em IS NULL THEN RETURN; END IF;
 FOR r IN SELECT g.payment_id,p.product FROM private.payment_gifts g JOIN public.payments p ON p.id=g.payment_id WHERE g.recipient_email=em AND g.claimed_by IS NULL AND p.status='ok' ORDER BY g.payment_id FOR UPDATE OF g LOOP
  IF NOT private.has_product(uid,r.product) THEN PERFORM private.grant_product(uid,r.product,'gift'); END IF;
  UPDATE private.payment_gifts SET claimed_by=uid,claimed_at=now() WHERE payment_id=r.payment_id;
 END LOOP;
END $function$;
CREATE OR REPLACE FUNCTION private.deliver_payment(p_payment bigint) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
DECLARE pay public.payments%rowtype; receiver uuid;
BEGIN
 SELECT * INTO pay FROM public.payments WHERE id=p_payment;
 IF pay.status IS DISTINCT FROM 'ok' THEN RETURN; END IF;
 IF pay.gift_email IS NULL THEN PERFORM private.grant_product(pay.user_id,pay.product,'payment'); RETURN; END IF;
 INSERT INTO private.payment_gifts(payment_id,recipient_email) VALUES(pay.id,pay.gift_email) ON CONFLICT DO NOTHING;
 SELECT id INTO receiver FROM auth.users WHERE lower(email)=pay.gift_email AND email_confirmed_at IS NOT NULL;
 IF receiver IS NOT NULL THEN PERFORM private.claim_gifts(receiver); END IF;
END $function$;
REVOKE ALL ON FUNCTION private.claim_gifts(uuid),private.deliver_payment(bigint) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.create_payment_order(p_product text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); pr public.products%rowtype; pay public.payments%rowtype; cfg jsonb; credit bigint; fee integer:=0; due bigint;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,0));
 SELECT * INTO pr FROM public.products WHERE id=p_product AND active AND id IN ('guide_bandit','guide_assassin','guide_mage','market');
 IF pr.id IS NULL THEN RAISE EXCEPTION 'สินค้านี้ยังไม่เปิดขาย'; END IF;
 IF private.has_product(uid,p_product) THEN RAISE EXCEPTION 'คุณมีสิทธิ์นี้แล้ว'; END IF;
 SELECT * INTO pay FROM public.payments WHERE user_id=uid AND product=p_product AND gift_email IS NULL AND status IN ('awaiting_slip','pending');
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
END $function$;

CREATE OR REPLACE FUNCTION public.create_gift_payment_order(p_product text, p_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); pr public.products%rowtype; pay public.payments%rowtype; cfg jsonb; credit bigint; fee integer:=0; due bigint; target_email text:=lower(btrim(p_email)); target_uid uuid;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
 IF target_email IS NULL OR length(target_email)>254 OR target_email !~ '^[^[:space:]@]+@[^[:space:]@.]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'กรอกอีเมลผู้รับให้ถูกต้อง'; END IF;
 IF target_email=(SELECT lower(email) FROM auth.users WHERE id=uid) THEN RAISE EXCEPTION 'อีเมลนี้เป็นของคุณ กรุณาเอาติ๊กซื้อให้เพื่อนออก'; END IF;
 SELECT id INTO target_uid FROM auth.users WHERE lower(email)=target_email AND email_confirmed_at IS NOT NULL;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,0));
 SELECT * INTO pr FROM public.products WHERE id=p_product AND active AND id IN ('guide_bandit','guide_assassin','guide_mage');
 IF pr.id IS NULL THEN RAISE EXCEPTION 'สินค้านี้ยังไม่เปิดขาย'; END IF;
 IF target_uid IS NOT NULL AND private.has_product(target_uid,p_product) THEN RAISE EXCEPTION 'ผู้รับมีไกด์นี้แล้ว'; END IF;
 SELECT * INTO pay FROM public.payments WHERE user_id=uid AND product=p_product AND gift_email=target_email AND status IN ('awaiting_slip','pending');
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
 INSERT INTO public.payments(user_id,email,product,amount,trans_ref,slip_path,status,recipient,credit_applied_cents,amount_due_cents,processing_fee_cents,gift_email) VALUES(uid,(SELECT email FROM auth.users WHERE id=uid),p_product,pr.price,'ORDER-'||gen_random_uuid()::text,'',CASE WHEN credit=pr.price::bigint*100 THEN 'ok' ELSE 'awaiting_slip' END,cfg,credit,pr.price::bigint*100-credit+fee,fee,target_email) RETURNING * INTO pay;
 PERFORM private.change_credit(uid,pay.id,'reserve',-credit);
 IF pay.status='ok' THEN
  PERFORM private.deliver_payment(pay.id);
  UPDATE public.payments SET verification_code='PAID_WITH_CREDIT',reviewed_at=now(),review_note='ชำระด้วยเครดิตคงเหลือ' WHERE id=pay.id RETURNING * INTO pay;
 END IF;
 RETURN to_jsonb(pay);
END $function$
;
CREATE OR REPLACE FUNCTION private.settle_transfer(p_payment bigint, p_cents bigint, p_ref text, p_method text, p_note text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE pay public.payments%rowtype; receipt private.transfer_receipts%rowtype;
BEGIN
 SELECT * INTO pay FROM public.payments WHERE id=p_payment;
 IF pay.user_id IS NULL THEN RAISE EXCEPTION 'ไม่พบบัญชีลูกค้า'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(pay.user_id::text,0));
 SELECT * INTO pay FROM public.payments WHERE id=p_payment FOR UPDATE;
 IF pay.status<>'pending' THEN RETURN jsonb_build_object('status',pay.status,'code','ALREADY_HANDLED'); END IF;
 IF p_cents IS NULL OR p_cents NOT BETWEEN 1 AND 100000000 OR p_ref IS NULL OR length(btrim(p_ref)) NOT BETWEEN 6 AND 200 OR p_method NOT IN ('admin','provider') THEN RAISE EXCEPTION 'ข้อมูลยอดเงินจริงไม่ถูกต้อง'; END IF;
 p_ref:=btrim(p_ref);
 -- Consumption is defined by our ledger, not by whether the provider has seen a slip before.
 IF EXISTS(SELECT 1 FROM public.payments WHERE trans_ref=p_ref AND id<>p_payment) OR EXISTS(SELECT 1 FROM private.transfer_receipts WHERE trans_ref=p_ref) THEN
  IF EXISTS(SELECT 1 FROM public.payments WHERE trans_ref=p_ref AND user_id=pay.user_id AND id<>p_payment) THEN
   PERFORM private.change_credit(pay.user_id,p_payment,'release',pay.credit_applied_cents);
   UPDATE public.payments SET status='rejected',verification_lease=NULL,verification_code='DUPLICATE_REFERENCE',reviewed_at=now(),review_note='สลิปนี้ถูกบันทึกในบัญชีนี้แล้ว เลือกใช้เครดิตคงเหลือหรือดูรายการที่ชำระสำเร็จเดิมได้' WHERE id=p_payment;
   RETURN jsonb_build_object('status','rejected','code','DUPLICATE_REFERENCE');
  END IF;
  RETURN jsonb_build_object('status','pending','code','DUPLICATE_REFERENCE');
 END IF;
 BEGIN
  INSERT INTO private.transfer_receipts(trans_ref,user_id,payment_id,amount_cents,method) VALUES(p_ref,pay.user_id,p_payment,p_cents,p_method);
  UPDATE public.payments SET trans_ref=p_ref,received_cents=p_cents,verified_automatically=(p_method='provider'),verification_lease=NULL,reviewed_at=now(),reviewed_by=CASE WHEN p_method='admin' THEN auth.uid() ELSE NULL END WHERE id=p_payment;
  PERFORM private.change_credit(pay.user_id,p_payment,'transfer',p_cents);
  IF p_cents>=pay.amount_due_cents THEN
   PERFORM private.change_credit(pay.user_id,p_payment,'purchase',-pay.amount_due_cents);
   UPDATE public.payments SET status='ok',verification_code='VERIFIED',review_note=CASE WHEN p_cents>pay.amount_due_cents THEN 'ชำระสำเร็จ ยอดส่วนเกินเก็บเป็นเครดิตคงเหลือ' ELSE 'ตรวจสอบการชำระเงินสำเร็จ' END||CASE WHEN coalesce(p_note,'')<>'' THEN ' · '||left(p_note,250) ELSE '' END WHERE id=p_payment;
   PERFORM private.deliver_payment(pay.id);
   RETURN jsonb_build_object('status','ok','code','VERIFIED','excess_cents',p_cents-pay.amount_due_cents);
  ELSE
   PERFORM private.change_credit(pay.user_id,p_payment,'release',pay.credit_applied_cents);
   UPDATE public.payments SET status='credited',verification_code='UNDERPAID_CREDITED',review_note='ยอดโอนต่ำกว่ายอดชำระ เก็บเงินที่ได้รับเป็นเครดิตคงเหลือแล้ว เลือกซื้อแพ็กใหม่ได้'||CASE WHEN coalesce(p_note,'')<>'' THEN ' · '||left(p_note,250) ELSE '' END WHERE id=p_payment;
   RETURN jsonb_build_object('status','credited','code','UNDERPAID_CREDITED','credited_cents',p_cents);
  END IF;
 EXCEPTION WHEN unique_violation THEN RETURN jsonb_build_object('status','pending','code','DUPLICATE_REFERENCE');
 END;
END $function$;

CREATE OR REPLACE FUNCTION public.sync_account()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); em text; confirmed timestamptz; r record;
begin
  if uid is null then raise exception 'ต้องล็อกอินก่อน'; end if;
  insert into public.profiles(id) values (uid) on conflict do nothing;
  select lower(u.email), u.email_confirmed_at into em, confirmed from auth.users u where u.id = uid;
  if confirmed is not null then
    perform private.claim_gifts(uid);
    for r in select g.product from private.grandfather g where g.email = em loop
      if not exists(select 1 from public.entitlements e where e.user_id = uid and e.product = r.product) then
        perform private.grant_product(uid, r.product, 'grandfather');
      end if;
    end loop;
  end if;
  return jsonb_build_object(
    'is_admin', private.is_admin(uid),
    'entitlements', coalesce((select jsonb_agg(jsonb_build_object('product', e.product, 'expires_at', e.expires_at, 'source', e.source)) from public.entitlements e where e.user_id = uid), '[]'::jsonb));
end $function$;

REVOKE ALL ON FUNCTION public.create_gift_payment_order(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_gift_payment_order(text,text) TO authenticated;
NOTIFY pgrst,'reload schema';
CREATE OR REPLACE FUNCTION public.admin_revoke(p_payment bigint) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
DECLARE pay public.payments%rowtype; k text; d int; receiver uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_admin(auth.uid()) THEN RAISE EXCEPTION 'สำหรับแอดมินเท่านั้น'; END IF;
 SELECT * INTO pay FROM public.payments WHERE id=p_payment FOR UPDATE;
 IF pay.id IS NULL OR pay.status='revoked' THEN RETURN; END IF;
 IF pay.status<>'ok' THEN RAISE EXCEPTION 'เพิกถอนได้เฉพาะรายการที่อนุมัติแล้ว'; END IF;
 UPDATE public.payments SET status='revoked' WHERE id=p_payment;
 IF pay.gift_email IS NOT NULL THEN
  SELECT claimed_by INTO receiver FROM private.payment_gifts WHERE payment_id=p_payment;
  DELETE FROM public.entitlements e WHERE e.user_id=receiver AND e.product=pay.product AND e.source='gift'
   AND NOT EXISTS(SELECT 1 FROM private.payment_gifts g JOIN public.payments p ON p.id=g.payment_id WHERE g.claimed_by=receiver AND p.product=pay.product AND p.status='ok')
   AND NOT EXISTS(SELECT 1 FROM public.payments p WHERE p.user_id=receiver AND p.gift_email IS NULL AND p.product=pay.product AND p.status='ok');
  RETURN;
 END IF;
 SELECT kind,days INTO k,d FROM public.products WHERE id=pay.product;
 IF k='once' THEN
  DELETE FROM public.entitlements WHERE user_id=pay.user_id AND product=pay.product AND source='payment'
   AND NOT EXISTS(SELECT 1 FROM public.payments WHERE user_id=pay.user_id AND gift_email IS NULL AND product=pay.product AND status='ok')
   AND NOT EXISTS(SELECT 1 FROM private.payment_gifts g JOIN public.payments p ON p.id=g.payment_id WHERE g.claimed_by=pay.user_id AND p.product=pay.product AND p.status='ok');
 ELSE
  UPDATE public.entitlements SET expires_at=expires_at-make_interval(days=>d),updated_at=now() WHERE user_id=pay.user_id AND product=pay.product;
 END IF;
END $function$;
