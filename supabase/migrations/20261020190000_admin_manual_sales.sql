-- Record owner-confirmed offline sales and grant access atomically.
CREATE OR REPLACE FUNCTION public.admin_record_manual_sale(
 p_email text,p_product text,p_amount integer,p_request uuid,p_note text DEFAULT '',p_paid_at timestamptz DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid; pay public.payments%rowtype; ref text; note text;
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_admin(auth.uid()) THEN RAISE EXCEPTION 'สำหรับแอดมินเท่านั้น'; END IF;
 IF p_request IS NULL OR p_amount IS NULL OR p_amount NOT BETWEEN 1 AND 1000000 THEN RAISE EXCEPTION 'ระบุราคาขายเป็นจำนวนเต็มตั้งแต่ 1 ถึง 1,000,000 บาท'; END IF;
 IF p_paid_at IS NOT NULL AND (NOT isfinite(p_paid_at) OR p_paid_at>now()+interval '5 minutes' OR p_paid_at<'2000-01-01'::timestamptz) THEN RAISE EXCEPTION 'วันเวลาที่รับเงินไม่ถูกต้อง'; END IF;
 SELECT id INTO uid FROM auth.users WHERE lower(email)=lower(btrim(p_email));
 IF uid IS NULL THEN RAISE EXCEPTION 'ไม่พบผู้ใช้อีเมลนี้ ลูกค้าต้องสมัครสมาชิกก่อน'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.products WHERE id=p_product AND active) THEN RAISE EXCEPTION 'ไม่พบสินค้าที่เปิดขาย'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,0));
 ref:='ORDER-MANUAL-'||p_request::text;
 note:='โอนส่วนตัวนอกระบบ ผู้ดูแลยืนยันรับเงินแล้ว'||CASE WHEN p_paid_at IS NULL THEN ' · วันเวลารายการเป็นเวลาที่บันทึก' ELSE ' · วันเวลารายการตามที่ผู้ดูแลระบุ' END||CASE WHEN btrim(coalesce(p_note,''))<>'' THEN ' · '||left(btrim(p_note),350) ELSE '' END;
 SELECT * INTO pay FROM public.payments WHERE trans_ref=ref;
 IF pay.id IS NOT NULL THEN
  IF pay.user_id IS DISTINCT FROM uid OR pay.product IS DISTINCT FROM p_product OR pay.amount IS DISTINCT FROM p_amount OR pay.review_note IS DISTINCT FROM note OR (p_paid_at IS NOT NULL AND pay.created_at IS DISTINCT FROM p_paid_at) THEN RAISE EXCEPTION 'รหัสบันทึกนี้ถูกใช้กับรายการอื่นแล้ว กรุณาตรวจประวัติการขาย'; END IF;
  RETURN jsonb_build_object('id',pay.id,'status',pay.status,'already_recorded',true);
 END IF;
 INSERT INTO public.payments(user_id,email,product,amount,trans_ref,status,amount_due_cents,received_cents,processing_fee_cents,credit_applied_cents,bank_review_state,verification_code,reviewed_by,reviewed_at,review_note,created_at)
 VALUES(uid,lower(btrim(p_email)),p_product,p_amount,ref,'ok',p_amount::bigint*100,p_amount::bigint*100,0,0,'confirmed','OWNER_CONFIRMED_MANUAL',auth.uid(),now(),note,coalesce(p_paid_at,now())) RETURNING * INTO pay;
 PERFORM private.deliver_payment(pay.id);
 INSERT INTO private.access_audit(actor,customer,product,payment_id,action,note) VALUES(auth.uid(),uid,p_product,pay.id,'manual_sale',note);
 RETURN jsonb_build_object('id',pay.id,'status',pay.status,'already_recorded',false);
END $$;
REVOKE ALL ON FUNCTION public.admin_record_manual_sale(text,text,integer,uuid,text,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_record_manual_sale(text,text,integer,uuid,text,timestamptz) TO authenticated;

-- Read-only report. Totals use order values, not bank transfers or credit top-ups.
CREATE OR REPLACE FUNCTION public.admin_sales_report(
 p_from date DEFAULT NULL,p_to date DEFAULT NULL,p_search text DEFAULT '',
 p_product text DEFAULT '',p_status text DEFAULT 'ok',p_offset integer DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE report jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_admin(auth.uid()) THEN RAISE EXCEPTION 'สำหรับแอดมินเท่านั้น'; END IF;
 IF p_from IS NOT NULL AND p_to IS NOT NULL AND p_from>p_to THEN RAISE EXCEPTION 'วันที่เริ่มต้องไม่เกินวันที่สิ้นสุด'; END IF;
 IF p_status IS NULL OR p_status NOT IN ('all','ok','pending','awaiting_slip','credited','rejected','cancelled','revoked','needs_review') THEN RAISE EXCEPTION 'สถานะไม่ถูกต้อง'; END IF;
 WITH filtered AS (
 SELECT p.*,pr.name AS product_name,
 coalesce(private.has_product(CASE WHEN p.gift_email IS NULL THEN p.user_id ELSE (SELECT u.id FROM auth.users u WHERE lower(u.email)=p.gift_email) END,p.product),false) AS has_access
 FROM public.payments p JOIN public.products pr ON pr.id=p.product
 WHERE (p_from IS NULL OR p.created_at>=p_from::timestamp AT TIME ZONE 'Asia/Bangkok')
 AND (p_to IS NULL OR p.created_at<(p_to+1)::timestamp AT TIME ZONE 'Asia/Bangkok')
 AND (coalesce(p_product,'')='' OR p.product=p_product)
 AND (p_status='all' OR p.status=p_status OR (p_status='needs_review' AND p.bank_review_state='needs_review'))
 AND (coalesce(btrim(p_search),'')='' OR strpos(lower(concat_ws(' ',p.email,p.gift_email,p.id::text,pr.name)),lower(btrim(p_search)))>0)
 ), totals AS (
 SELECT count(*) AS total_orders,count(*) FILTER(WHERE status='ok') AS sales_count,
 count(DISTINCT coalesce(user_id::text,email)) FILTER(WHERE status='ok') AS customers,
 coalesce(sum(amount::bigint*100) FILTER(WHERE status='ok'),0) AS sales_cents,
 count(*) FILTER(WHERE bank_review_state='needs_review' AND status='ok') AS needs_review,
 coalesce(sum(received_cents) FILTER(WHERE status='ok'),0) AS received_cents,
 coalesce(sum(credit_applied_cents) FILTER(WHERE status='ok'),0) AS credit_cents
 FROM filtered
 ), breakdown AS (
 SELECT product,product_name,count(*) AS quantity,sum(amount::bigint*100) AS sales_cents FROM filtered WHERE status='ok' GROUP BY product,product_name
 ), rows AS (
 SELECT id,email,product,product_name,amount,amount_due_cents,received_cents,credit_applied_cents,processing_fee_cents,status,created_at,reviewed_at,gift_email,bank_review_state,has_access,(trans_ref LIKE 'ORDER-MANUAL-%') AS manual_sale
 FROM filtered ORDER BY created_at DESC,id DESC LIMIT 50 OFFSET greatest(coalesce(p_offset,0),0)
 )
 SELECT jsonb_build_object('summary',(SELECT to_jsonb(t) FROM totals t),
 'products',coalesce((SELECT jsonb_agg(to_jsonb(b) ORDER BY b.sales_cents DESC,b.product) FROM breakdown b),'[]'::jsonb),
 'orders',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC,r.id DESC) FROM rows r),'[]'::jsonb)) INTO report;
 RETURN report;
END $$;
REVOKE ALL ON FUNCTION public.admin_sales_report(date,date,text,text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_sales_report(date,date,text,text,text,integer) TO authenticated;
