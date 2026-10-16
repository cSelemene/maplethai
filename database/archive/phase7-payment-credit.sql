BEGIN;
ALTER TABLE private.payment_settings ADD COLUMN qr_payload text NOT NULL DEFAULT '';
UPDATE private.payment_settings SET qr_payload='00020101021129390016A000000677010111031500499900465145053037645802TH6304BF03' WHERE account_number='0248522232';
ALTER TABLE public.payments ADD COLUMN credit_applied_cents bigint NOT NULL DEFAULT 0 CHECK(credit_applied_cents>=0), ADD COLUMN amount_due_cents bigint, ADD COLUMN received_cents bigint;
UPDATE public.payments SET amount_due_cents=amount::bigint*100;
ALTER TABLE public.payments ALTER COLUMN amount_due_cents SET NOT NULL;
CREATE FUNCTION private.payment_due_defaults() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN NEW.amount_due_cents:=coalesce(NEW.amount_due_cents,NEW.amount::bigint*100); RETURN NEW; END $$;
REVOKE ALL ON FUNCTION private.payment_due_defaults() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER payment_due_defaults BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION private.payment_due_defaults();

ALTER TABLE public.payments ADD CHECK(amount_due_cents>=0 AND amount_due_cents+credit_applied_cents=amount::bigint*100);
ALTER TABLE public.payments DROP CONSTRAINT payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check CHECK(status IN ('awaiting_slip','pending','ok','credited','rejected','cancelled','revoked'));
CREATE TABLE private.credit_accounts(user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,balance_cents bigint NOT NULL DEFAULT 0 CHECK(balance_cents>=0));
CREATE TABLE public.credit_ledger(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,payment_id bigint NOT NULL REFERENCES public.payments(id),kind text NOT NULL CHECK(kind IN ('reserve','release','transfer','purchase')),delta_cents bigint NOT NULL CHECK(delta_cents<>0),balance_after_cents bigint NOT NULL CHECK(balance_after_cents>=0),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(payment_id,kind));
CREATE INDEX credit_ledger_owner_time ON public.credit_ledger(user_id,created_at DESC);
CREATE TABLE private.transfer_receipts(trans_ref text PRIMARY KEY,user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,payment_id bigint NOT NULL UNIQUE REFERENCES public.payments(id),amount_cents bigint NOT NULL CHECK(amount_cents>0),verified_at timestamptz NOT NULL DEFAULT now(),method text NOT NULL CHECK(method IN ('provider','admin')));
ALTER TABLE private.credit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.transfer_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.credit_accounts,private.transfer_receipts FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.credit_ledger FROM anon,authenticated;
GRANT SELECT ON public.credit_ledger TO authenticated;
CREATE POLICY own_credit_ledger ON public.credit_ledger FOR SELECT TO authenticated USING((SELECT auth.uid())=user_id);
CREATE FUNCTION private.change_credit(uid uuid,p_payment bigint,p_kind text,p_delta bigint) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE balance bigint;
BEGIN
 IF p_delta=0 THEN RETURN; END IF;
 INSERT INTO private.credit_accounts(user_id) VALUES(uid) ON CONFLICT DO NOTHING;
 UPDATE private.credit_accounts SET balance_cents=balance_cents+p_delta WHERE user_id=uid AND balance_cents+p_delta>=0 RETURNING balance_cents INTO balance;
 IF balance IS NULL THEN RAISE EXCEPTION 'เครดิตไม่เพียงพอ'; END IF;
 INSERT INTO public.credit_ledger(user_id,payment_id,kind,delta_cents,balance_after_cents) VALUES(uid,p_payment,p_kind,p_delta,balance);
END $$;
REVOKE ALL ON FUNCTION private.change_credit(uuid,bigint,text,bigint) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.credit_summary() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
 RETURN jsonb_build_object('available_cents',coalesce((SELECT balance_cents FROM private.credit_accounts WHERE user_id=uid),0),'reserved_cents',coalesce((SELECT sum(credit_applied_cents) FROM public.payments WHERE user_id=uid AND status IN ('awaiting_slip','pending')),0));
END $$;
CREATE OR REPLACE FUNCTION public.payment_settings() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('enabled',enabled,'bank',bank,'account_number',account_number,'recipient_name',recipient_name,'qr_path',qr_path,'qr_payload',qr_payload) FROM private.payment_settings WHERE id
$$;
CREATE OR REPLACE FUNCTION public.admin_payment_settings(p_enabled boolean,p_bank text,p_account text,p_name text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_admin(auth.uid()) THEN RAISE EXCEPTION 'สำหรับแอดมินเท่านั้น'; END IF;
 IF p_enabled IS NULL OR p_bank IS NULL OR p_account IS NULL OR p_name IS NULL OR length(p_bank)>100 OR length(p_account)>40 OR length(p_name)>160 THEN RAISE EXCEPTION 'ข้อมูลบัญชีไม่ถูกต้อง'; END IF;
 IF p_enabled AND (length(btrim(p_bank))<2 OR length(btrim(p_account))<6 OR length(btrim(p_name))<2) THEN RAISE EXCEPTION 'กรอกข้อมูลผู้รับก่อนเปิดรับเงิน'; END IF;
 UPDATE private.payment_settings SET qr_payload=CASE WHEN bank=btrim(p_bank) AND account_number=btrim(p_account) AND recipient_name=btrim(p_name) THEN qr_payload ELSE '' END,qr_path=CASE WHEN bank=btrim(p_bank) AND account_number=btrim(p_account) AND recipient_name=btrim(p_name) THEN qr_path ELSE '' END,enabled=p_enabled,bank=btrim(p_bank),account_number=btrim(p_account),recipient_name=btrim(p_name) WHERE id;
END $$;
CREATE OR REPLACE FUNCTION public.create_payment_order(p_product text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); pr public.products%rowtype; pay public.payments%rowtype; cfg jsonb; credit bigint;
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
 INSERT INTO public.payments(user_id,email,product,amount,trans_ref,slip_path,status,recipient,credit_applied_cents,amount_due_cents) VALUES(uid,(SELECT email FROM auth.users WHERE id=uid),p_product,pr.price,'ORDER-'||gen_random_uuid()::text,'',CASE WHEN credit=pr.price::bigint*100 THEN 'ok' ELSE 'awaiting_slip' END,cfg,credit,pr.price::bigint*100-credit) RETURNING * INTO pay;
 PERFORM private.change_credit(uid,pay.id,'reserve',-credit);
 IF pay.status='ok' THEN
  PERFORM private.grant_product(uid,p_product,'credit');
  UPDATE public.payments SET verification_code='PAID_WITH_CREDIT',reviewed_at=now(),review_note='ชำระด้วยเครดิตคงเหลือ' WHERE id=pay.id RETURNING * INTO pay;
 END IF;
 RETURN to_jsonb(pay);
END $$;
CREATE OR REPLACE FUNCTION public.cancel_payment_order(p_payment bigint) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); pay public.payments%rowtype;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,0));
 SELECT * INTO pay FROM public.payments WHERE id=p_payment AND user_id=uid FOR UPDATE;
 IF pay.id IS NULL OR pay.status<>'awaiting_slip' THEN RAISE EXCEPTION 'ยกเลิกรายการนี้ไม่ได้'; END IF;
 PERFORM private.change_credit(uid,p_payment,'release',pay.credit_applied_cents);
 UPDATE public.payments SET status='cancelled' WHERE id=p_payment;
END $$;
CREATE FUNCTION private.settle_transfer(p_payment bigint,p_cents bigint,p_ref text,p_method text,p_note text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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
   PERFORM private.grant_product(pay.user_id,pay.product,'payment');
   RETURN jsonb_build_object('status','ok','code','VERIFIED','excess_cents',p_cents-pay.amount_due_cents);
  ELSE
   PERFORM private.change_credit(pay.user_id,p_payment,'release',pay.credit_applied_cents);
   UPDATE public.payments SET status='credited',verification_code='UNDERPAID_CREDITED',review_note='ยอดโอนต่ำกว่ายอดชำระ เก็บเงินที่ได้รับเป็นเครดิตคงเหลือแล้ว เลือกซื้อแพ็กใหม่ได้'||CASE WHEN coalesce(p_note,'')<>'' THEN ' · '||left(p_note,250) ELSE '' END WHERE id=p_payment;
   RETURN jsonb_build_object('status','credited','code','UNDERPAID_CREDITED','credited_cents',p_cents);
  END IF;
 EXCEPTION WHEN unique_violation THEN RETURN jsonb_build_object('status','pending','code','DUPLICATE_REFERENCE');
 END;
END $$;
REVOKE ALL ON FUNCTION private.settle_transfer(bigint,bigint,text,text,text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.admin_review_payment(p_payment bigint,p_approve boolean,p_amount integer,p_bank_ref text,p_note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE pay public.payments%rowtype; result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_admin(auth.uid()) THEN RAISE EXCEPTION 'สำหรับแอดมินเท่านั้น'; END IF;
 SELECT * INTO pay FROM public.payments WHERE id=p_payment;
 IF p_approve IS NULL OR pay.id IS NULL OR pay.user_id IS NULL THEN RAISE EXCEPTION 'รายการไม่ถูกต้อง'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(pay.user_id::text,0));
 SELECT * INTO pay FROM public.payments WHERE id=p_payment FOR UPDATE;
 IF pay.status<>'pending' THEN RAISE EXCEPTION 'รายการนี้ได้รับการจัดการแล้ว'; END IF;
 IF p_approve THEN
  result:=private.settle_transfer(p_payment,p_amount::bigint*100,p_bank_ref,'admin',p_note);
  IF result->>'code'='DUPLICATE_REFERENCE' THEN RAISE EXCEPTION 'เลขอ้างอิงธนาคารนี้ถูกใช้แล้ว'; END IF;
 ELSE
  IF p_note IS NULL OR length(btrim(p_note))<3 THEN RAISE EXCEPTION 'ระบุเหตุผลที่ไม่อนุมัติ'; END IF;
  PERFORM private.change_credit(pay.user_id,p_payment,'release',pay.credit_applied_cents);
  UPDATE public.payments SET status='rejected',verification_lease=NULL,reviewed_by=auth.uid(),reviewed_at=now(),review_note=left(btrim(p_note),500) WHERE id=p_payment;
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.svc_finish_payment_verification(p_payment bigint,p_lease uuid,p_result jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.payments%rowtype; code text; ref text; valid boolean; result jsonb;
BEGIN
 SELECT * INTO p FROM public.payments WHERE id=p_payment;
 IF p.id IS NULL OR p.user_id IS NULL THEN RAISE EXCEPTION 'ไม่พบรายการ'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p.user_id::text,0));
 SELECT * INTO p FROM public.payments WHERE id=p_payment FOR UPDATE;
 IF p.status<>'pending' OR p.verification_lease IS DISTINCT FROM p_lease OR p_lease IS NULL THEN RETURN jsonb_build_object('status',p.status,'code','ALREADY_HANDLED'); END IF;
 ref:=p_result->>'trans_ref';code:=left(coalesce(p_result->>'code','MANUAL_REVIEW'),60);
 valid:=coalesce((p_result->>'verified')::boolean,false) AND (p_result->>'amount_cents')::numeric BETWEEN 1 AND 100000000 AND (p_result->>'amount_cents')::numeric=trunc((p_result->>'amount_cents')::numeric) AND p_result->>'bank_code'='004' AND regexp_replace(p_result->>'recipient_account','[^0-9]','','g')=regexp_replace(p.recipient->>'account_number','[^0-9]','','g') AND p_result->>'currency'='THB' AND (p_result->>'transferred_at')::timestamptz>=p.created_at-interval '5 minutes' AND (p_result->>'transferred_at')::timestamptz<=now()+interval '5 minutes' AND length(ref) BETWEEN 6 AND 200;
 IF coalesce(valid,false) THEN
  result:=private.settle_transfer(p_payment,(p_result->>'amount_cents')::bigint,ref,'provider','');
  IF result->>'status' IN ('ok','credited','rejected') THEN RETURN result; END IF;
  code:=result->>'code';
 ELSE IF code='VERIFIED' THEN code:='VALIDATION_FAILED'; END IF; END IF;
 UPDATE public.payments SET verification_lease=NULL,verification_code=code WHERE id=p_payment;
 RETURN jsonb_build_object('status','pending','code',code);
END $$;
REVOKE ALL ON FUNCTION public.credit_summary() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.credit_summary() TO authenticated;
CREATE OR REPLACE FUNCTION public.svc_begin_payment_verification(p_payment bigint, p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE p public.payments%rowtype; token uuid; k text;
BEGIN
 SELECT * INTO p FROM public.payments WHERE id=p_payment FOR UPDATE;
 IF p.id IS NULL OR p_user IS NULL OR NOT coalesce(p.user_id=p_user OR private.is_admin(p_user),false) THEN RAISE EXCEPTION 'ไม่พบรายการของบัญชีนี้'; END IF;
 IF p.status='ok' THEN RETURN jsonb_build_object('status','ok'); END IF;
 IF p.status<>'pending' THEN RETURN jsonb_build_object('status',p.status,'code','NOT_PENDING'); END IF;
 IF NOT public.auto_verification_status() THEN RETURN jsonb_build_object('status','pending','code','MANUAL_REVIEW'); END IF;
 IF p.verification_started_at>now()-interval '90 seconds' AND p.verification_lease IS NOT NULL THEN RETURN jsonb_build_object('status','pending','code','IN_PROGRESS'); END IF;
 IF p.verification_attempts>=3 AND NOT private.is_admin(p_user) THEN RETURN jsonb_build_object('status','pending','code','ATTEMPT_LIMIT'); END IF;
 SELECT decrypted_secret INTO k FROM vault.decrypted_secrets WHERE name='maplethai_easyslip_api_key';
 IF k IS NULL THEN RETURN jsonb_build_object('status','pending','code','MANUAL_REVIEW'); END IF;
 token:=gen_random_uuid();
 UPDATE public.payments SET verification_attempts=verification_attempts+1,verification_lease=token,verification_started_at=now(),verification_code='VERIFYING' WHERE id=p_payment;
 RETURN jsonb_build_object('status','pending','lease',token,'api_key',k,'payment',jsonb_build_object('id',p.id,'amount',p.amount,'amount_due_cents',p.amount_due_cents,'recipient',p.recipient,'created_at',p.created_at,'slip_path',p.slip_path));
END $function$;
CREATE FUNCTION public.admin_record_transfer(p_payment bigint,p_amount numeric,p_bank_ref text,p_note text DEFAULT '') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_admin(auth.uid()) THEN RAISE EXCEPTION 'สำหรับแอดมินเท่านั้น'; END IF;
 IF p_amount IS NULL OR p_amount<=0 OR p_amount>1000000 OR p_amount*100<>trunc(p_amount*100) THEN RAISE EXCEPTION 'ระบุยอดเงินจริงไม่เกินสองตำแหน่งทศนิยม'; END IF;
 RETURN private.settle_transfer(p_payment,(p_amount*100)::bigint,p_bank_ref,'admin',p_note);
END $$;
REVOKE ALL ON FUNCTION public.admin_record_transfer(bigint,numeric,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_record_transfer(bigint,numeric,text,text) TO authenticated;
COMMIT;
