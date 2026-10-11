-- Receive QR image follows the order snapshot, never a hardcoded current recipient.
BEGIN;
ALTER TABLE private.payment_settings ADD COLUMN qr_path text NOT NULL DEFAULT '';
CREATE OR REPLACE FUNCTION public.payment_settings() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('enabled',enabled,'bank',bank,'account_number',account_number,'recipient_name',recipient_name,'qr_path',qr_path) FROM private.payment_settings WHERE id
$$;
CREATE OR REPLACE FUNCTION public.admin_payment_settings(p_enabled boolean,p_bank text,p_account text,p_name text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_admin(auth.uid()) THEN RAISE EXCEPTION 'สำหรับแอดมินเท่านั้น'; END IF;
 IF p_enabled IS NULL OR p_bank IS NULL OR p_account IS NULL OR p_name IS NULL OR length(p_bank)>100 OR length(p_account)>40 OR length(p_name)>160 THEN RAISE EXCEPTION 'ข้อมูลบัญชีไม่ถูกต้อง'; END IF;
 IF p_enabled AND (length(btrim(p_bank))<2 OR length(btrim(p_account))<6 OR length(btrim(p_name))<2) THEN RAISE EXCEPTION 'กรอกธนาคาร เลขบัญชี และชื่อผู้รับก่อนเปิดรับเงิน'; END IF;
 UPDATE private.payment_settings SET
 qr_path=CASE WHEN bank=btrim(p_bank) AND account_number=btrim(p_account) AND recipient_name=btrim(p_name) THEN qr_path ELSE '' END,
 enabled=p_enabled,bank=btrim(p_bank),account_number=btrim(p_account),recipient_name=btrim(p_name) WHERE id;
END $$;
REVOKE EXECUTE ON FUNCTION public.payment_settings() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.payment_settings() TO authenticated;
COMMIT;
-- Live receiving details are configured separately from this reusable schema patch.
