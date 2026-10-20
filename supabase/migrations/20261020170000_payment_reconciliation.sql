-- Amount-matched access and owner bank reconciliation are separate states.
ALTER TABLE public.payments ADD COLUMN bank_review_state text CHECK (bank_review_state IN ('needs_review','confirmed','revoked'));
ALTER TABLE public.payments ADD COLUMN bank_review_reason text;
CREATE TABLE private.access_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor uuid NOT NULL, customer uuid, product text, payment_id bigint,
 action text NOT NULL, note text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.access_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.access_audit FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.svc_finish_payment_verification(p_payment bigint, p_lease uuid, p_result jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE p public.payments%rowtype; code text; ref text; valid boolean; result jsonb;
BEGIN
 SELECT * INTO p FROM public.payments WHERE id=p_payment;
 IF p.id IS NULL OR p.user_id IS NULL THEN RAISE EXCEPTION 'ไม่พบรายการ'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p.user_id::text,0));
 SELECT * INTO p FROM public.payments WHERE id=p_payment FOR UPDATE;
 IF p.status<>'pending' OR p.verification_lease IS DISTINCT FROM p_lease OR p_lease IS NULL THEN RETURN jsonb_build_object('status',p.status,'code','ALREADY_HANDLED'); END IF;
 ref:=p_result->>'trans_ref';code:=left(coalesce(p_result->>'code','MANUAL_REVIEW'),60);
 valid:=coalesce((p_result->>'verified')::boolean,false) AND (p_result->>'amount_cents')::numeric BETWEEN 1 AND 100000000 AND (p_result->>'amount_cents')::numeric=trunc((p_result->>'amount_cents')::numeric) AND ((p_result->>'bank_code'='004' AND regexp_replace(p_result->>'recipient_account','[^0-9]','','g')=regexp_replace(p.recipient->>'account_number','[^0-9]','','g')) OR (p_result->>'bank_code'='PROMPTPAY' AND p_result->>'recipient_type'='EWALLETID' AND p_result->>'recipient_account'=private.promptpay_receiver(p.recipient->>'qr_payload'))) AND p_result->>'currency'='THB' AND (p_result->>'transferred_at')::timestamptz>=p.created_at-interval '5 minutes' AND (p_result->>'transferred_at')::timestamptz<=now()+interval '5 minutes' AND length(ref) BETWEEN 6 AND 200;
 IF coalesce(valid,false) OR (
 coalesce((p_result->>'provisional')::boolean,false)
 AND code IN ('INVALID_CURRENCY','RECIPIENT_MISMATCH','RECIPIENT_NAME_UNCERTAIN','RECIPIENT_ACCOUNT_UNCERTAIN')
 AND (p_result->>'amount_cents')::numeric=p.amount_due_cents AND p.amount_due_cents>0
 AND (p_result->>'transferred_at')::timestamptz BETWEEN p.created_at-interval '5 minutes' AND now()+interval '5 minutes'
 AND length(ref) BETWEEN 6 AND 200) THEN
  result:=private.settle_transfer(p_payment,(p_result->>'amount_cents')::bigint,ref,'provider','');
  IF result->>'status'='ok' THEN
   UPDATE public.payments SET bank_review_state='needs_review',bank_review_reason=code,
    reviewed_at=NULL,reviewed_by=NULL,review_note='ปลดล็อกแล้ว รอผู้ดูแลตรวจยอดเข้าในบัญชีธนาคาร' WHERE id=p_payment;
   RETURN result || jsonb_build_object('bank_review_state','needs_review');
  END IF;
  IF result->>'status' IN ('credited','rejected') THEN RETURN result; END IF;
  code:=result->>'code';
 ELSE IF code='VERIFIED' THEN code:='VALIDATION_FAILED'; END IF; END IF;
 UPDATE public.payments SET verification_lease=NULL,verification_code=code WHERE id=p_payment;
 RETURN jsonb_build_object('status','pending','code',code);
END $function$
;


CREATE OR REPLACE FUNCTION public.admin_payment_dashboard(p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_admin(auth.uid()) THEN RAISE EXCEPTION 'สำหรับแอดมินเท่านั้น'; END IF;
 RETURN jsonb_build_object('needs_review',(SELECT count(*) FROM public.payments WHERE bank_review_state='needs_review'),
 'pending',(SELECT count(*) FROM public.payments WHERE status='pending'),
 'orders',coalesce((SELECT jsonb_agg(row) FROM (
 SELECT to_jsonb(p)||jsonb_build_object('has_access',coalesce(private.has_product(
 CASE WHEN p.gift_email IS NULL THEN p.user_id ELSE (SELECT id FROM auth.users WHERE lower(email)=lower(p.gift_email)) END,p.product),false)) AS row
 FROM public.payments p ORDER BY (p.bank_review_state='needs_review') DESC NULLS LAST,(p.status='pending') DESC,p.id DESC LIMIT 200 OFFSET greatest(coalesce(p_offset,0),0)
 ) x),'[]'::jsonb));
END $$;
CREATE OR REPLACE FUNCTION public.admin_reconcile_payment(p_payment bigint,p_confirm boolean,p_note text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.payments%rowtype;
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_admin(auth.uid()) THEN RAISE EXCEPTION 'สำหรับแอดมินเท่านั้น'; END IF;
 SELECT * INTO p FROM public.payments WHERE id=p_payment;
 IF p.user_id IS NULL THEN RAISE EXCEPTION 'ไม่พบรายการหรือบัญชี'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p.user_id::text,0));
 SELECT * INTO p FROM public.payments WHERE id=p_payment FOR UPDATE;
 IF p_confirm IS NULL OR p.status<>'ok' THEN RAISE EXCEPTION 'รายการนี้ยังไม่ปลดล็อก หรือถูกระงับแล้ว'; END IF;
 IF NOT p_confirm AND length(btrim(coalesce(p_note,'')))<3 THEN RAISE EXCEPTION 'ระบุเหตุผลการระงับ'; END IF;
 IF p_confirm AND p.bank_review_state='confirmed' THEN RETURN; END IF;
 IF NOT p_confirm THEN PERFORM public.admin_revoke(p_payment); END IF;
 UPDATE public.payments SET bank_review_state=CASE WHEN p_confirm THEN 'confirmed' ELSE 'revoked' END,
 reviewed_by=auth.uid(),reviewed_at=now(),review_note=CASE WHEN p_confirm THEN 'ผู้ดูแลตรวจยอดเข้าบัญชีแล้ว' ELSE 'ระงับสิทธิ์: ไม่พบยอดเข้าบัญชี' END||' · '||left(coalesce(p_note,''),500) WHERE id=p_payment;
 INSERT INTO private.access_audit(actor,customer,product,payment_id,action,note) VALUES(auth.uid(),p.user_id,p.product,p_payment,CASE WHEN p_confirm THEN 'confirm_receipt' ELSE 'revoke_payment' END,left(coalesce(p_note,''),500));
END $$;
CREATE OR REPLACE FUNCTION public.admin_customer_access(p_email text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_admin(auth.uid()) THEN RAISE EXCEPTION 'สำหรับแอดมินเท่านั้น'; END IF;
 SELECT id INTO uid FROM auth.users WHERE lower(email)=lower(btrim(p_email));
 IF uid IS NULL THEN RAISE EXCEPTION 'ไม่พบผู้ใช้อีเมลนี้ ลูกค้าต้องสมัครสมาชิกก่อน'; END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('product',p.id,'name',p.name,'has_access',private.has_product(uid,p.id),'expires_at',e.expires_at)) FROM public.products p LEFT JOIN public.entitlements e ON e.user_id=uid AND e.product=p.id WHERE p.active),'[]'::jsonb);
END $$;
CREATE OR REPLACE FUNCTION public.admin_set_customer_access(p_email text,p_product text,p_grant boolean,p_note text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_admin(auth.uid()) THEN RAISE EXCEPTION 'สำหรับแอดมินเท่านั้น'; END IF;
 SELECT id INTO uid FROM auth.users WHERE lower(email)=lower(btrim(p_email));
 IF uid IS NULL OR p_grant IS NULL OR NOT EXISTS(SELECT 1 FROM public.products WHERE id=p_product) THEN RAISE EXCEPTION 'ไม่พบบัญชีหรือสินค้า'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,0));
 IF p_grant THEN
  IF NOT private.has_product(uid,p_product) THEN PERFORM private.grant_product(uid,p_product,'admin'); END IF;
 ELSE
  IF length(btrim(coalesce(p_note,'')))<3 THEN RAISE EXCEPTION 'ระบุเหตุผลการระงับ'; END IF;
  -- Keep an expired row so legacy access is not automatically granted again.
  UPDATE public.entitlements SET expires_at=now(),updated_at=now(),source='admin_suspended' WHERE user_id=uid AND product=p_product;
  UPDATE private.payment_gifts SET claimed_by=uid,claimed_at=now() WHERE lower(recipient_email)=lower(btrim(p_email)) AND payment_id IN (SELECT id FROM public.payments WHERE product=p_product AND status='ok');
 END IF;
 INSERT INTO private.access_audit(actor,customer,product,action,note) VALUES(auth.uid(),uid,p_product,CASE WHEN p_grant THEN 'grant' ELSE 'suspend' END,left(coalesce(p_note,''),500));
END $$;
REVOKE ALL ON FUNCTION public.admin_payment_dashboard(integer),public.admin_reconcile_payment(bigint,boolean,text),public.admin_customer_access(text),public.admin_set_customer_access(text,text,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_payment_dashboard(integer),public.admin_reconcile_payment(bigint,boolean,text),public.admin_customer_access(text),public.admin_set_customer_access(text,text,boolean,text) TO authenticated;
