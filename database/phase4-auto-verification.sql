BEGIN;
ALTER TABLE private.payment_settings ADD COLUMN auto_verify boolean NOT NULL DEFAULT false;
ALTER TABLE public.payments ADD COLUMN verification_attempts integer NOT NULL DEFAULT 0, ADD COLUMN verification_lease uuid, ADD COLUMN verification_started_at timestamptz, ADD COLUMN verification_code text, ADD COLUMN verified_automatically boolean NOT NULL DEFAULT false;
CREATE FUNCTION public.auto_verification_status() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auto_verify AND EXISTS(SELECT 1 FROM vault.secrets WHERE name='maplethai_easyslip_api_key') FROM private.payment_settings WHERE id
$$;
CREATE FUNCTION public.admin_verification_settings() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_admin(auth.uid()) THEN RAISE EXCEPTION 'สำหรับแอดมินเท่านั้น'; END IF;
 RETURN jsonb_build_object('enabled',(SELECT auto_verify FROM private.payment_settings WHERE id),'has_key',EXISTS(SELECT 1 FROM vault.secrets WHERE name='maplethai_easyslip_api_key'));
END $$;
CREATE FUNCTION public.admin_save_verification_settings(p_enabled boolean,p_key text DEFAULT '') RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE sid uuid; k text:=btrim(coalesce(p_key,''));
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_admin(auth.uid()) THEN RAISE EXCEPTION 'สำหรับแอดมินเท่านั้น'; END IF;
 IF p_enabled IS NULL THEN RAISE EXCEPTION 'ระบุสถานะการตรวจสลิป'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('maplethai.easyslip.config',0));
 SELECT id INTO sid FROM vault.secrets WHERE name='maplethai_easyslip_api_key';
 IF k<>'' THEN
  IF k !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'API Key ของ EasySlip ต้องเป็น UUID v4'; END IF;
  IF sid IS NULL THEN PERFORM vault.create_secret(k,'maplethai_easyslip_api_key','MapleThai bank slip verification');
  ELSE PERFORM vault.update_secret(sid,k); END IF;
 END IF;
 IF p_enabled AND NOT EXISTS(SELECT 1 FROM vault.secrets WHERE name='maplethai_easyslip_api_key') THEN RAISE EXCEPTION 'ใส่ API Key ก่อนเปิดตรวจอัตโนมัติ'; END IF;
 UPDATE private.payment_settings SET auto_verify=p_enabled WHERE id;
END $$;
CREATE FUNCTION public.svc_begin_payment_verification(p_payment bigint,p_user uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.payments%rowtype; token uuid; k text;
BEGIN
 SELECT * INTO p FROM public.payments WHERE id=p_payment FOR UPDATE;
 IF p.id IS NULL OR p_user IS NULL OR NOT coalesce(p.user_id=p_user OR private.is_admin(p_user),false) THEN RAISE EXCEPTION 'ไม่พบรายการของบัญชีนี้'; END IF;
 IF p.status='ok' THEN RETURN jsonb_build_object('status','ok'); END IF;
 IF p.status<>'pending' THEN RETURN jsonb_build_object('status',p.status,'code','NOT_PENDING'); END IF;
 IF NOT public.auto_verification_status() THEN RETURN jsonb_build_object('status','pending','code','MANUAL_REVIEW'); END IF;
 IF p.verification_started_at>now()-interval '90 seconds' AND p.verification_lease IS NOT NULL THEN RETURN jsonb_build_object('status','pending','code','IN_PROGRESS'); END IF;
 IF p.verification_attempts>=3 THEN RETURN jsonb_build_object('status','pending','code','ATTEMPT_LIMIT'); END IF;
 SELECT decrypted_secret INTO k FROM vault.decrypted_secrets WHERE name='maplethai_easyslip_api_key';
 IF k IS NULL THEN RETURN jsonb_build_object('status','pending','code','MANUAL_REVIEW'); END IF;
 token:=gen_random_uuid();
 UPDATE public.payments SET verification_attempts=verification_attempts+1,verification_lease=token,verification_started_at=now(),verification_code='VERIFYING' WHERE id=p_payment;
 RETURN jsonb_build_object('status','pending','lease',token,'api_key',k,'payment',jsonb_build_object('id',p.id,'amount',p.amount,'recipient',p.recipient,'created_at',p.created_at,'slip_path',p.slip_path));
END $$;
CREATE FUNCTION public.svc_finish_payment_verification(p_payment bigint,p_lease uuid,p_result jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.payments%rowtype; code text; ref text; valid boolean;
BEGIN
 SELECT * INTO p FROM public.payments WHERE id=p_payment FOR UPDATE;
 IF p.id IS NULL THEN RAISE EXCEPTION 'ไม่พบรายการ'; END IF;
 IF p.status<>'pending' OR p.verification_lease IS DISTINCT FROM p_lease OR p_lease IS NULL THEN RETURN jsonb_build_object('status',p.status,'code','ALREADY_HANDLED'); END IF;
 ref:=p_result->>'trans_ref';code:=left(coalesce(p_result->>'code','MANUAL_REVIEW'),60);
 valid:=coalesce((p_result->>'verified')::boolean,false)
 AND (p_result->>'amount')::numeric=p.amount AND p_result->>'bank_code'='004'
 AND regexp_replace(p_result->>'recipient_account','[^0-9]','','g')=regexp_replace(p.recipient->>'account_number','[^0-9]','','g')
 AND p_result->>'currency'='THB' AND (p_result->>'transferred_at')::timestamptz>=p.created_at-interval '5 minutes'
 AND (p_result->>'transferred_at')::timestamptz<=now()+interval '5 minutes'
 AND coalesce((p_result->>'duplicate')::boolean,true)=false AND length(ref) BETWEEN 6 AND 200;
 IF coalesce(valid,false) THEN
  BEGIN
   UPDATE public.payments SET status='ok',trans_ref=ref,verification_code='VERIFIED',verified_automatically=true,verification_lease=NULL,reviewed_at=now(),review_note='ตรวจสอบการชำระเงินสำเร็จ' WHERE id=p_payment;
   PERFORM private.grant_product(p.user_id,p.product,'payment');
   RETURN jsonb_build_object('status','ok','code','VERIFIED');
  EXCEPTION WHEN unique_violation THEN code:='DUPLICATE_REFERENCE'; END;
 ELSE
  IF code='VERIFIED' THEN code:='VALIDATION_FAILED'; END IF;
 END IF;
 UPDATE public.payments SET verification_lease=NULL,verification_code=code WHERE id=p_payment;
 RETURN jsonb_build_object('status','pending','code',code);
END $$;
REVOKE ALL ON FUNCTION public.auto_verification_status(),public.admin_verification_settings(),public.admin_save_verification_settings(boolean,text),public.svc_begin_payment_verification(bigint,uuid),public.svc_finish_payment_verification(bigint,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.auto_verification_status(),public.admin_verification_settings(),public.admin_save_verification_settings(boolean,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_verification_status(),public.svc_begin_payment_verification(bigint,uuid),public.svc_finish_payment_verification(bigint,uuid,jsonb) TO service_role;
COMMIT;
