BEGIN;
DO $$
DECLARE uid uuid:=gen_random_uuid(); adm uuid:=gen_random_uuid(); pid bigint; a jsonb; r jsonb; failed boolean;
BEGIN
 INSERT INTO auth.users(id,email) VALUES(uid,'sales-report-buyer@example.invalid'),(adm,'sales-report-admin@example.invalid');
 INSERT INTO private.admins(user_id) VALUES(adm);
 PERFORM set_config('request.jwt.claim.sub',uid::text,true);
 failed:=false;BEGIN PERFORM public.admin_sales_report();EXCEPTION WHEN OTHERS THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Buyer can read sales'; END IF;
 a:=public.create_payment_order('guide_bandit');pid:=(a->>'id')::bigint;
 UPDATE public.payments SET status='ok',created_at='2026-10-20 16:59:59+00',received_cents=amount_due_cents,bank_review_state='needs_review' WHERE id=pid;
 a:=public.create_payment_order('guide_assassin');
 UPDATE public.payments SET status='pending',created_at='2026-10-20 16:59:58+00' WHERE id=(a->>'id')::bigint;
 a:=public.create_payment_order('guide_mage');
 UPDATE public.payments SET status='ok',created_at='2026-10-20 17:00:00+00' WHERE id=(a->>'id')::bigint;
 PERFORM set_config('request.jwt.claim.sub',adm::text,true);
 r:=public.admin_sales_report('2026-10-20','2026-10-20','sales-report-buyer@example.invalid','','all',0);
 IF (r#>>'{summary,total_orders}')::int<>2 OR (r#>>'{summary,sales_count}')::int<>1 OR (r#>>'{summary,customers}')::int<>1 OR (r#>>'{summary,needs_review}')::int<>1 OR (r#>>'{summary,sales_cents}')::bigint<>(SELECT amount::bigint*100 FROM public.payments WHERE id=pid) THEN RAISE EXCEPTION 'Summary, status exclusion or Bangkok date boundary failed: %',r; END IF;
 IF jsonb_array_length(r->'products')<>1 OR jsonb_array_length(r->'orders')<>2 THEN RAISE EXCEPTION 'Breakdown mismatch'; END IF;
 r:=public.admin_sales_report('2026-10-20','2026-10-20','sales-report-buyer@example.invalid','guide_bandit','needs_review',50);
 IF jsonb_array_length(r->'orders')<>0 OR (r#>>'{summary,total_orders}')::int<>1 THEN RAISE EXCEPTION 'Pagination affects summary'; END IF;
 r:=public.admin_sales_report(null,null,'sales-report-buyer@example.invalid','guide_mage','ok',0);
 IF (r#>>'{summary,total_orders}')::int<>1 THEN RAISE EXCEPTION 'Product filter failed'; END IF;
 failed:=false;BEGIN PERFORM public.admin_sales_report('2026-10-21','2026-10-20');EXCEPTION WHEN OTHERS THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Invalid dates accepted'; END IF;
 IF has_function_privilege('anon','public.admin_sales_report(date,date,text,text,text,integer)','EXECUTE') THEN RAISE EXCEPTION 'Anon report exposed'; END IF;
 RAISE NOTICE 'PASS: sales authorization, Bangkok dates, pending excluded from revenue, product breakdown, review count, pagination and filters';
END $$;
ROLLBACK;
