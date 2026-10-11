-- Manual bank transfer checkout. Settings remain disabled until an admin supplies a recipient.
BEGIN;
ALTER TABLE public.payments DROP CONSTRAINT payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check CHECK (status IN ('awaiting_slip','pending','ok','rejected','cancelled','revoked'));
ALTER TABLE public.payments ADD COLUMN recipient jsonb, ADD COLUMN review_note text, ADD COLUMN reviewed_at timestamptz, ADD COLUMN reviewed_by uuid;
CREATE UNIQUE INDEX payments_one_open_order ON public.payments(user_id,product) WHERE status IN ('awaiting_slip','pending');
CREATE UNIQUE INDEX payments_unique_slip ON public.payments(slip_path) WHERE slip_path IS NOT NULL AND slip_path <> '';
CREATE TABLE private.payment_settings(id boolean PRIMARY KEY DEFAULT true CHECK(id), enabled boolean NOT NULL DEFAULT false, bank text NOT NULL DEFAULT '', account_number text NOT NULL DEFAULT '', recipient_name text NOT NULL DEFAULT '');
ALTER TABLE private.payment_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO private.payment_settings(id) VALUES(true);
REVOKE ALL ON public.payments, public.entitlements FROM anon, authenticated;
GRANT SELECT ON public.payments, public.entitlements TO authenticated;
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.products FROM anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_payment(text,text,text) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.payment_settings() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('enabled',enabled,'bank',bank,'account_number',account_number,'recipient_name',recipient_name) FROM private.payment_settings WHERE id
$$;
CREATE FUNCTION public.admin_payment_settings(p_enabled boolean,p_bank text,p_account text,p_name text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_admin(auth.uid()) THEN RAISE EXCEPTION 'สำหรับแอดมินเท่านั้น'; END IF;
 IF p_enabled IS NULL OR p_bank IS NULL OR p_account IS NULL OR p_name IS NULL OR length(p_bank)>100 OR length(p_account)>40 OR length(p_name)>160 THEN RAISE EXCEPTION 'ข้อมูลบัญชีไม่ถูกต้อง'; END IF;
 IF p_enabled AND (length(btrim(p_bank))<2 OR length(btrim(p_account))<6 OR length(btrim(p_name))<2) THEN RAISE EXCEPTION 'กรอกธนาคาร เลขบัญชี และชื่อผู้รับก่อนเปิดรับเงิน'; END IF;
 UPDATE private.payment_settings SET enabled=p_enabled,bank=btrim(p_bank),account_number=btrim(p_account),recipient_name=btrim(p_name) WHERE id;
END $$;
CREATE FUNCTION public.create_payment_order(p_product text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); pr public.products%rowtype; pay public.payments%rowtype; cfg jsonb;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,0));
 SELECT * INTO pr FROM public.products WHERE id=p_product AND active AND id IN ('guide_bandit','guide_assassin','guide_mage');
 IF pr.id IS NULL THEN RAISE EXCEPTION 'สินค้านี้ยังไม่เปิดขาย'; END IF;
 IF private.has_product(uid,p_product) THEN RAISE EXCEPTION 'คุณมีสิทธิ์ไกด์นี้แล้ว'; END IF;
 SELECT * INTO pay FROM public.payments WHERE user_id=uid AND product=p_product AND status IN ('awaiting_slip','pending');
 IF pay.id IS NOT NULL THEN RETURN to_jsonb(pay); END IF;
 cfg:=public.payment_settings();
 IF NOT coalesce((cfg->>'enabled')::boolean,false) THEN RAISE EXCEPTION 'ยังไม่เปิดรับชำระเงิน'; END IF;
 IF (SELECT count(*) FROM public.payments WHERE user_id=uid AND created_at>now()-interval '1 day')>=10 THEN RAISE EXCEPTION 'สร้างรายการบ่อยเกินไป กรุณาลองใหม่พรุ่งนี้'; END IF;
 INSERT INTO public.payments(user_id,email,product,amount,trans_ref,slip_path,status,recipient)
 VALUES(uid,(SELECT email FROM auth.users WHERE id=uid),p_product,pr.price,'ORDER-'||gen_random_uuid()::text,'','awaiting_slip',cfg) RETURNING * INTO pay;
 RETURN to_jsonb(pay);
END $$;
CREATE FUNCTION public.submit_payment_slip(p_payment bigint,p_path text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE pay public.payments%rowtype; uid uuid:=auth.uid();
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
 SELECT * INTO pay FROM public.payments WHERE id=p_payment AND user_id=uid FOR UPDATE;
 IF pay.id IS NULL OR pay.status<>'awaiting_slip' THEN RAISE EXCEPTION 'รายการนี้ไม่สามารถส่งสลิปได้'; END IF;
 IF p_path IS NULL OR p_path NOT LIKE uid::text||'/'||p_payment::text||'/%' OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='slips' AND name=p_path) THEN RAISE EXCEPTION 'ไม่พบไฟล์สลิปของรายการนี้'; END IF;
 UPDATE public.payments SET slip_path=p_path,status='pending' WHERE id=p_payment;
END $$;
CREATE FUNCTION public.cancel_payment_order(p_payment bigint) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
 UPDATE public.payments SET status='cancelled' WHERE id=p_payment AND user_id=auth.uid() AND status='awaiting_slip';
 IF NOT FOUND THEN RAISE EXCEPTION 'ยกเลิกรายการนี้ไม่ได้'; END IF;
END $$;
CREATE FUNCTION public.admin_review_payment(p_payment bigint,p_approve boolean,p_amount integer,p_bank_ref text,p_note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE pay public.payments%rowtype;
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_admin(auth.uid()) THEN RAISE EXCEPTION 'สำหรับแอดมินเท่านั้น'; END IF;
 IF p_approve IS NULL THEN RAISE EXCEPTION 'ระบุผลการตรวจสอบ'; END IF;
 SELECT * INTO pay FROM public.payments WHERE id=p_payment FOR UPDATE;
 IF pay.id IS NULL OR pay.status<>'pending' THEN RAISE EXCEPTION 'รายการนี้ได้รับการจัดการแล้ว'; END IF;
 IF pay.user_id IS NULL THEN RAISE EXCEPTION 'ไม่พบบัญชีลูกค้า'; END IF;
 IF p_approve THEN
  IF p_amount IS DISTINCT FROM pay.amount OR p_bank_ref IS NULL OR length(btrim(p_bank_ref))<6 OR length(btrim(p_bank_ref))>200 THEN RAISE EXCEPTION 'ตรวจยอดเงินจริงและกรอกเลขอ้างอิงธนาคารก่อนอนุมัติ'; END IF;
  UPDATE public.payments SET trans_ref=btrim(p_bank_ref),status='ok',reviewed_by=auth.uid(),reviewed_at=now(),review_note=left(coalesce(p_note,''),500) WHERE id=p_payment;
  PERFORM private.grant_product(pay.user_id,pay.product,'payment');
 ELSE
  IF p_note IS NULL OR length(btrim(p_note))<3 THEN RAISE EXCEPTION 'ระบุเหตุผลที่ไม่อนุมัติ'; END IF;
  UPDATE public.payments SET status='rejected',reviewed_by=auth.uid(),reviewed_at=now(),review_note=left(btrim(p_note),500) WHERE id=p_payment;
 END IF;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'เลขอ้างอิงธนาคารนี้ถูกใช้กับรายการอื่นแล้ว';
END $$;
-- Detailed review data is restricted to admins. Existing admin_payments remains compatible.
CREATE FUNCTION public.admin_payment_orders() RETURNS SETOF public.payments LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_admin(auth.uid()) THEN RAISE EXCEPTION 'สำหรับแอดมินเท่านั้น'; END IF;
 RETURN QUERY SELECT * FROM public.payments ORDER BY (status='pending') DESC,id DESC LIMIT 200;
END $$;
-- Revoking a pending/rejected order must never subtract or remove existing entitlements.
CREATE OR REPLACE FUNCTION public.admin_revoke(p_payment bigint) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE pay public.payments%rowtype; k text; d int;
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_admin(auth.uid()) THEN RAISE EXCEPTION 'สำหรับแอดมินเท่านั้น'; END IF;
 SELECT * INTO pay FROM public.payments WHERE id=p_payment FOR UPDATE;
 IF pay.id IS NULL OR pay.status='revoked' THEN RETURN; END IF;
 IF pay.status<>'ok' THEN RAISE EXCEPTION 'เพิกถอนได้เฉพาะรายการที่อนุมัติแล้ว'; END IF;
 UPDATE public.payments SET status='revoked' WHERE id=p_payment;
 SELECT kind,days INTO k,d FROM public.products WHERE id=pay.product;
 IF k='once' THEN
  DELETE FROM public.entitlements WHERE user_id=pay.user_id AND product=pay.product AND source='payment'
   AND NOT EXISTS(SELECT 1 FROM public.payments WHERE user_id=pay.user_id AND product=pay.product AND status='ok');
 ELSE
  UPDATE public.entitlements SET expires_at=expires_at-make_interval(days=>d),updated_at=now() WHERE user_id=pay.user_id AND product=pay.product;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.payment_settings() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.payment_settings() TO authenticated;
REVOKE ALL ON FUNCTION public.admin_payment_settings(boolean,text,text,text),public.create_payment_order(text),public.submit_payment_slip(bigint,text),public.cancel_payment_order(bigint),public.admin_review_payment(bigint,boolean,integer,text,text),public.admin_payment_orders() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_payment_settings(boolean,text,text,text),public.create_payment_order(text),public.submit_payment_slip(bigint,text),public.cancel_payment_order(bigint),public.admin_review_payment(bigint,boolean,integer,text,text),public.admin_payment_orders() TO authenticated;
COMMIT;
