CREATE FUNCTION private.promptpay_receiver(p_payload text) RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE fields jsonb:='{}'; nested jsonb:='{}'; text_part text; tag text; size integer; pos integer; crc integer:=65535; i integer; j integer;
BEGIN
 IF p_payload IS NULL OR length(p_payload)>512 OR length(p_payload)<12 THEN RETURN NULL; END IF;
 pos:=1;
 WHILE pos<=length(p_payload) LOOP
  IF substring(p_payload,pos,4)!~'^[0-9]{4}$' THEN RETURN NULL; END IF;
  tag:=substring(p_payload,pos,2);size:=substring(p_payload,pos+2,2)::integer;
  IF fields?tag OR pos+3+size>length(p_payload) THEN RETURN NULL; END IF;
  fields:=fields||jsonb_build_object(tag,substring(p_payload,pos+4,size));pos:=pos+4+size;
 END LOOP;
 IF tag<>'63' OR size<>4 THEN RETURN NULL; END IF;
 FOR i IN 1..length(p_payload)-4 LOOP
  crc:=crc # (ascii(substring(p_payload,i,1))<<8);
  FOR j IN 1..8 LOOP
   IF crc&32768<>0 THEN crc:=((crc<<1)#4129)&65535; ELSE crc:=(crc<<1)&65535; END IF;
  END LOOP;
 END LOOP;
 IF fields->>'63'<>upper(lpad(to_hex(crc),4,'0')) THEN RETURN NULL; END IF;
 text_part:=fields->>'29';IF text_part IS NULL THEN RETURN NULL;END IF;pos:=1;
 WHILE pos<=length(text_part) LOOP
  IF substring(text_part,pos,4)!~'^[0-9]{4}$' THEN RETURN NULL; END IF;
  tag:=substring(text_part,pos,2);size:=substring(text_part,pos+2,2)::integer;
  IF nested?tag OR pos+3+size>length(text_part) THEN RETURN NULL; END IF;
  nested:=nested||jsonb_build_object(tag,substring(text_part,pos+4,size));pos:=pos+4+size;
 END LOOP;
 IF nested->>'00'<>'A000000677010111' OR nested ?| ARRAY['01','02','04'] OR coalesce(nested->>'03','')!~'^[0-9]{15}$' THEN RETURN NULL; END IF;
 RETURN nested->>'03';
END $$;
REVOKE ALL ON FUNCTION private.promptpay_receiver(text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.svc_finish_payment_verification(p_payment bigint,p_lease uuid,p_result jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.payments%rowtype; code text; ref text; valid boolean; result jsonb;
BEGIN
 SELECT * INTO p FROM public.payments WHERE id=p_payment;
 IF p.id IS NULL OR p.user_id IS NULL THEN RAISE EXCEPTION 'ไม่พบรายการ'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p.user_id::text,0));
 SELECT * INTO p FROM public.payments WHERE id=p_payment FOR UPDATE;
 IF p.status<>'pending' OR p.verification_lease IS DISTINCT FROM p_lease OR p_lease IS NULL THEN RETURN jsonb_build_object('status',p.status,'code','ALREADY_HANDLED'); END IF;
 ref:=p_result->>'trans_ref';code:=left(coalesce(p_result->>'code','MANUAL_REVIEW'),60);
 valid:=coalesce((p_result->>'verified')::boolean,false) AND (p_result->>'amount_cents')::numeric BETWEEN 1 AND 100000000 AND (p_result->>'amount_cents')::numeric=trunc((p_result->>'amount_cents')::numeric) AND ((p_result->>'bank_code'='004' AND regexp_replace(p_result->>'recipient_account','[^0-9]','','g')=regexp_replace(p.recipient->>'account_number','[^0-9]','','g')) OR (p_result->>'bank_code'='PROMPTPAY' AND p_result->>'recipient_type'='EWALLETID' AND p_result->>'recipient_account'=private.promptpay_receiver(p.recipient->>'qr_payload'))) AND p_result->>'currency'='THB' AND (p_result->>'transferred_at')::timestamptz>=p.created_at-interval '5 minutes' AND (p_result->>'transferred_at')::timestamptz<=now()+interval '5 minutes' AND length(ref) BETWEEN 6 AND 200;
 IF coalesce(valid,false) THEN
  result:=private.settle_transfer(p_payment,(p_result->>'amount_cents')::bigint,ref,'provider','');
  IF result->>'status' IN ('ok','credited','rejected') THEN RETURN result; END IF;
  code:=result->>'code';
 ELSE IF code='VERIFIED' THEN code:='VALIDATION_FAILED'; END IF; END IF;
 UPDATE public.payments SET verification_lease=NULL,verification_code=code WHERE id=p_payment;
 RETURN jsonb_build_object('status','pending','code',code);
END $$;
REVOKE ALL ON FUNCTION public.svc_finish_payment_verification(bigint,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.svc_finish_payment_verification(bigint,uuid,jsonb) TO service_role;
