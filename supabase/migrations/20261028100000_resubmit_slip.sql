-- Let a customer replace a wrong slip while the order is still waiting for review.
-- Blocked only while an automated check is running. verification_attempts is not reset,
-- so the 3-check limit on the slip provider still holds; after that the admin reviews the new slip.
CREATE OR REPLACE FUNCTION public.submit_payment_slip(p_payment bigint, p_path text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE pay public.payments%rowtype; uid uuid:=auth.uid();
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
 SELECT * INTO pay FROM public.payments WHERE id=p_payment AND user_id=uid FOR UPDATE;
 IF pay.id IS NULL OR pay.status NOT IN ('awaiting_slip','pending') THEN RAISE EXCEPTION 'รายการนี้ไม่สามารถส่งสลิปได้'; END IF;
 IF pay.status='pending' AND pay.verification_lease IS NOT NULL AND pay.verification_started_at>now()-interval '90 seconds' THEN RAISE EXCEPTION 'ระบบกำลังตรวจสลิปเดิมอยู่ กรุณารอสักครู่แล้วลองอีกครั้ง'; END IF;
 IF p_path IS NULL OR p_path NOT LIKE uid::text||'/'||p_payment::text||'/%' OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='slips' AND name=p_path) THEN RAISE EXCEPTION 'ไม่พบไฟล์สลิปของรายการนี้'; END IF;
 UPDATE public.payments SET slip_path=p_path,status='pending',verification_lease=NULL,verification_code=NULL WHERE id=p_payment;
END $function$
;
