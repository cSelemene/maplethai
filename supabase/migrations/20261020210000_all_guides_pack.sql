-- Launch promotion: one pack (product 'pack_all', 259 baht) unlocks every guide on sale today plus permanent market access.
-- Owning the pack is one entitlement row; has_product() treats it as covering the products in private.pack_covers(),
-- so revoking the pack payment removes everything it gave. Each guide the buyer already owns takes 99 baht off,
-- the market subscription does not count, and the price never goes below 0 (3+ guides = free claim).
-- Guides added later are NOT included automatically: add them to pack_covers() if the owner decides so.
-- (Applied to the live project on 2026-10-20 as migration 20261020194307 all_guides_pack; copied here verbatim.)

INSERT INTO public.products (id, name, price, kind, days, sort, active) VALUES
  ('pack_all', 'แพ็กทุกอาชีพ + ตลาดถาวร', 259, 'once', NULL, 0, true)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION private.pack_covers()
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$ SELECT ARRAY['guide_bandit','guide_sindit','guide_assassin','guide_mage','guide_fp','guide_cleric','guide_hunter','guide_crossbowman','guide_spearman','guide_page','guide_fighter','market'] $function$;

CREATE OR REPLACE FUNCTION private.has_product(uid uuid, p text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select exists(select 1 from public.entitlements e where e.user_id = uid
  and (e.product = p or (p = 'guide_sindit' and e.product = 'guide_bandit')
       or (e.product = 'pack_all' and p = any(private.pack_covers())))
  and (e.expires_at is null or e.expires_at > now())) $function$;

CREATE OR REPLACE FUNCTION private.has_any_guide(uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select exists(select 1 from public.entitlements e where e.user_id = uid and (e.product like 'guide\_%' or e.product = 'pack_all') and (e.expires_at is null or e.expires_at > now())) or private.is_admin(uid) $function$;

-- Guides the user already owns (any source, still active). Sindit that comes free with Bandit has no row, so it is not counted twice.
CREATE OR REPLACE FUNCTION private.pack_owned_guides(uid uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select count(distinct e.product)::integer from public.entitlements e where e.user_id = uid
  and e.product like 'guide\_%' and e.product = any(private.pack_covers())
  and (e.expires_at is null or e.expires_at > now()) $function$;

CREATE OR REPLACE FUNCTION private.pack_price(uid uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select greatest(0, (select price from public.products where id = 'pack_all') - 99 * private.pack_owned_guides(uid)) $function$;

CREATE OR REPLACE FUNCTION public.pack_quote()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); base integer; owned integer:=0;
BEGIN
 SELECT price INTO base FROM public.products WHERE id='pack_all' AND active;
 IF base IS NULL THEN RETURN jsonb_build_object('active',false); END IF;
 IF uid IS NOT NULL THEN owned:=private.pack_owned_guides(uid); END IF;
 RETURN jsonb_build_object('active',true,'base',base,'owned_guides',owned,
  'discount',least(base,99*owned),'price',greatest(0,base-99*owned),
  'guides',(SELECT count(*) FROM public.products WHERE id LIKE 'guide\_%' AND active AND id=ANY(private.pack_covers())),
  'separate_price',(SELECT coalesce(sum(price),0) FROM public.products WHERE id LIKE 'guide\_%' AND active AND id=ANY(private.pack_covers())),
  'owns_pack',uid IS NOT NULL AND EXISTS(SELECT 1 FROM public.entitlements WHERE user_id=uid AND product='pack_all' AND (expires_at IS NULL OR expires_at>now())));
END $function$;
REVOKE ALL ON FUNCTION public.pack_quote() FROM public;
GRANT EXECUTE ON FUNCTION public.pack_quote() TO anon, authenticated;

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
 SELECT * INTO pr FROM public.products WHERE id=p_product AND active AND id IN ('guide_bandit','guide_sindit','guide_assassin','guide_mage','guide_fp','guide_cleric','guide_hunter','guide_crossbowman','guide_spearman','guide_page','guide_fighter','market','pack_all');
 IF pr.id IS NULL THEN RAISE EXCEPTION 'สินค้านี้ยังไม่เปิดขาย'; END IF;
 IF private.has_product(uid,p_product) THEN RAISE EXCEPTION 'คุณมีสิทธิ์นี้แล้ว'; END IF;
 IF pr.id='pack_all' THEN pr.price:=private.pack_price(uid); END IF;
 SELECT * INTO pay FROM public.payments WHERE user_id=uid AND product=p_product AND gift_email IS NULL AND status IN ('awaiting_slip','pending');
 IF pay.id IS NOT NULL AND pr.id='pack_all' AND pay.status='awaiting_slip' AND pay.amount<>pr.price THEN
  PERFORM private.change_credit(uid,pay.id,'release',pay.credit_applied_cents);
  UPDATE public.payments SET status='cancelled',review_note='ราคาแพ็กเปลี่ยนตามไกด์ที่มี สร้างรายการใหม่แทน' WHERE id=pay.id;
  pay:=NULL;
 END IF;
 IF pay.id IS NOT NULL THEN RETURN to_jsonb(pay); END IF;
 cfg:=public.payment_settings();
 IF NOT coalesce((cfg->>'enabled')::boolean,false) THEN RAISE EXCEPTION 'ยังไม่เปิดรับชำระเงิน'; END IF;
 IF (SELECT count(*) FROM public.payments WHERE user_id=uid AND created_at>now()-interval '1 day')>=10 THEN RAISE EXCEPTION 'สร้างรายการบ่อยเกินไป กรุณาลองใหม่พรุ่งนี้'; END IF;
 credit:=least(coalesce((SELECT balance_cents FROM private.credit_accounts WHERE user_id=uid),0),pr.price::bigint*100);
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
  PERFORM private.grant_product(uid,p_product,CASE WHEN pr.price=0 THEN 'payment' ELSE 'credit' END);
  UPDATE public.payments SET verification_code=CASE WHEN pr.price=0 THEN 'FREE_PACK_UPGRADE' ELSE 'PAID_WITH_CREDIT' END,reviewed_at=now(),
   review_note=CASE WHEN pr.price=0 THEN 'รับแพ็กฟรี ส่วนลดจากไกด์ที่ซื้อไว้ครบราคาแพ็ก' ELSE 'ชำระด้วยเครดิตคงเหลือ' END WHERE id=pay.id RETURNING * INTO pay;
 END IF;
 RETURN to_jsonb(pay);
END $function$;

CREATE OR REPLACE FUNCTION public.sync_account()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); em text; confirmed timestamptz; r record; pack boolean;
begin
  if uid is null then raise exception 'ต้องล็อกอินก่อน'; end if;
  insert into public.profiles(id) values (uid) on conflict do nothing;
  select lower(u.email), u.email_confirmed_at into em, confirmed from auth.users u where u.id = uid;
  if confirmed is not null then
    perform private.claim_gifts(uid);
    perform private.claim_market_rewards(uid);
    for r in select g.product from private.grandfather g where g.email = em loop
      if not exists(select 1 from public.entitlements e where e.user_id = uid and e.product = r.product) then
        perform private.grant_product(uid, r.product, 'grandfather');
      end if;
    end loop;
  end if;
  pack := exists(select 1 from public.entitlements e where e.user_id = uid and e.product = 'pack_all' and (e.expires_at is null or e.expires_at > now()));
  return jsonb_build_object(
    'is_admin', private.is_admin(uid),
    'entitlements', coalesce((select jsonb_agg(x) from (
        select jsonb_build_object('product', e.product, 'expires_at', e.expires_at, 'source', e.source) x
        from public.entitlements e where e.user_id = uid
          and not (pack and e.product = any(private.pack_covers()) and e.expires_at is not null)
        union all
        select jsonb_build_object('product', c, 'expires_at', null, 'source', 'pack')
        from unnest(private.pack_covers()) c
        where pack and not exists(select 1 from public.entitlements e where e.user_id = uid and e.product = c and e.expires_at is null)
      ) t), '[]'::jsonb));
end $function$;
