ALTER TABLE public.payments ADD COLUMN referral_email text;
ALTER TABLE public.payments ADD CONSTRAINT payments_referral_valid CHECK(referral_email IS NULL OR (gift_email IS NULL AND product IN ('guide_bandit','guide_assassin','guide_mage') AND referral_email=lower(btrim(referral_email)) AND length(referral_email)<=254 AND referral_email ~ '^[^[:space:]@]+@[^[:space:]@.]+\.[^[:space:]@]+$'));
CREATE TABLE private.market_contact_rewards(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 payment_id bigint NOT NULL REFERENCES public.payments(id),
 recipient_email text NOT NULL,
 intended_user uuid REFERENCES auth.users(id),
 claimed_by uuid REFERENCES auth.users(id),
 remaining integer NOT NULL DEFAULT 10 CHECK(remaining BETWEEN 0 AND 10),
 revoked boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(payment_id,recipient_email)
);
ALTER TABLE private.market_contact_rewards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.market_contact_rewards FROM PUBLIC,anon,authenticated;
CREATE INDEX market_contact_rewards_available ON private.market_contact_rewards(claimed_by,id) WHERE remaining>0 AND NOT revoked;
CREATE INDEX market_contact_rewards_pending ON private.market_contact_rewards(recipient_email) WHERE claimed_by IS NULL AND NOT revoked;
ALTER TABLE private.market_contact_unlocks ADD COLUMN bonus_reward_id bigint REFERENCES private.market_contact_rewards(id);
CREATE OR REPLACE FUNCTION private.claim_market_rewards(uid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
DECLARE em text;
BEGIN
 SELECT lower(email) INTO em FROM auth.users WHERE id=uid AND email_confirmed_at IS NOT NULL AND NOT is_anonymous;
 IF em IS NULL THEN RETURN; END IF;
 UPDATE private.market_contact_rewards r SET claimed_by=uid
 WHERE r.claimed_by IS NULL AND NOT r.revoked
 AND (r.intended_user=uid OR (r.intended_user IS NULL AND r.recipient_email=em))
 AND EXISTS(SELECT 1 FROM public.payments p WHERE p.id=r.payment_id AND p.status='ok');
END $function$;
CREATE OR REPLACE FUNCTION private.payment_market_promotion() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
DECLARE friend_email text; receiver uuid; buyer_email text;
BEGIN
 IF NEW.status='revoked' THEN UPDATE private.market_contact_rewards SET revoked=true,remaining=0 WHERE payment_id=NEW.id;RETURN NEW;END IF;
 IF NEW.status<>'ok' OR NEW.product NOT IN ('guide_bandit','guide_assassin','guide_mage') THEN RETURN NEW;END IF;
 friend_email:=coalesce(NEW.gift_email,NEW.referral_email);
 IF friend_email IS NULL THEN RETURN NEW;END IF;
 buyer_email:=lower(NEW.email);
 IF buyer_email IS NULL OR buyer_email=friend_email OR NEW.user_id IS NULL THEN RETURN NEW;END IF;
 INSERT INTO private.market_contact_rewards(payment_id,recipient_email,intended_user)
 VALUES(NEW.id,buyer_email,NEW.user_id),(NEW.id,friend_email,NULL) ON CONFLICT DO NOTHING;
 PERFORM private.claim_market_rewards(NEW.user_id);
 SELECT id INTO receiver FROM auth.users WHERE lower(email)=friend_email AND email_confirmed_at IS NOT NULL AND NOT is_anonymous;
 IF receiver IS NOT NULL THEN PERFORM private.claim_market_rewards(receiver);END IF;
 RETURN NEW;
END $function$;
REVOKE ALL ON FUNCTION private.claim_market_rewards(uuid),private.payment_market_promotion() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER payment_market_promotion AFTER INSERT OR UPDATE OF status,referral_email ON public.payments FOR EACH ROW EXECUTE FUNCTION private.payment_market_promotion();
CREATE OR REPLACE FUNCTION public.create_referred_payment_order(p_product text,p_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); pr public.products%rowtype; pay public.payments%rowtype; cfg jsonb; credit bigint; fee integer:=0; due bigint; target_email text:=lower(btrim(p_email));
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
 IF target_email IS NULL OR length(target_email)>254 OR target_email !~ '^[^[:space:]@]+@[^[:space:]@.]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'กรอกอีเมลผู้แนะนำให้ถูกต้อง'; END IF;
 IF target_email=(SELECT lower(email) FROM auth.users WHERE id=uid) THEN RAISE EXCEPTION 'ใช้อีเมลตัวเองเป็นผู้แนะนำไม่ได้'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,0));
 SELECT * INTO pr FROM public.products WHERE id=p_product AND active AND id IN ('guide_bandit','guide_assassin','guide_mage');
 IF pr.id IS NULL THEN RAISE EXCEPTION 'สินค้านี้ยังไม่เปิดขาย'; END IF;
 IF private.has_product(uid,p_product) THEN RAISE EXCEPTION 'คุณมีสิทธิ์นี้แล้ว'; END IF;
 SELECT * INTO pay FROM public.payments WHERE user_id=uid AND product=p_product AND gift_email IS NULL AND status IN ('awaiting_slip','pending');
 IF pay.id IS NOT NULL THEN
 IF pay.referral_email IS DISTINCT FROM target_email THEN RAISE EXCEPTION 'มีรายการรอชำระอยู่แล้ว ยกเลิกรายการเดิมก่อนเปลี่ยนผู้แนะนำ'; END IF;
 RETURN to_jsonb(pay); END IF;
 cfg:=public.payment_settings();
 IF NOT coalesce((cfg->>'enabled')::boolean,false) THEN RAISE EXCEPTION 'ยังไม่เปิดรับชำระเงิน'; END IF;
 IF (SELECT count(*) FROM public.payments WHERE user_id=uid AND created_at>now()-interval '1 day')>=10 THEN RAISE EXCEPTION 'สร้างรายการบ่อยเกินไป กรุณาลองใหม่พรุ่งนี้'; END IF;
 credit:=least(coalesce((SELECT balance_cents FROM private.credit_accounts WHERE user_id=uid),0),pr.price::bigint*100);
 -- Full credit purchases have no bank transfer or processing fee. For partial
 -- purchases retain fractional credit so every QR ends in .11 through .49.
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
 INSERT INTO public.payments(user_id,email,product,amount,trans_ref,slip_path,status,recipient,credit_applied_cents,amount_due_cents,processing_fee_cents,referral_email) VALUES(uid,(SELECT email FROM auth.users WHERE id=uid),p_product,pr.price,'ORDER-'||gen_random_uuid()::text,'',CASE WHEN credit=pr.price::bigint*100 THEN 'ok' ELSE 'awaiting_slip' END,cfg,credit,pr.price::bigint*100-credit+fee,fee,target_email) RETURNING * INTO pay;
 PERFORM private.change_credit(uid,pay.id,'reserve',-credit);
 IF pay.status='ok' THEN
  PERFORM private.grant_product(uid,p_product,'credit');
  UPDATE public.payments SET verification_code='PAID_WITH_CREDIT',reviewed_at=now(),review_note='ชำระด้วยเครดิตคงเหลือ' WHERE id=pay.id RETURNING * INTO pay;
 END IF;
 RETURN to_jsonb(pay);
END $function$
;
CREATE OR REPLACE FUNCTION public.sync_account()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); em text; confirmed timestamptz; r record;
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
  return jsonb_build_object(
    'is_admin', private.is_admin(uid),
    'entitlements', coalesce((select jsonb_agg(jsonb_build_object('product', e.product, 'expires_at', e.expires_at, 'source', e.source)) from public.entitlements e where e.user_id = uid), '[]'::jsonb));
end $function$
;
CREATE OR REPLACE FUNCTION private.marketplace_contact(p_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); l public.listings%rowtype; c jsonb; m date:=date_trunc('month',now() AT TIME ZONE 'Asia/Bangkok')::date; unrestricted boolean; reward_id bigint;
BEGIN
 IF uid IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=uid AND NOT is_anonymous) THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
 unrestricted:=private.is_admin(uid) OR private.has_product(uid,'market');
 SELECT * INTO l FROM public.listings WHERE id=p_id;
 IF l.id IS NULL OR l.price_unit<>'meso' OR (l.user_id<>uid AND NOT private.is_admin(uid) AND (l.status<>'open' OR l.expires_at<=now())) THEN RAISE EXCEPTION 'ประกาศนี้ปิดหรือหมดอายุแล้ว'; END IF;
 SELECT contacts INTO c FROM private.marketplace_contacts WHERE listing_id=p_id;
 IF c IS NULL THEN SELECT jsonb_build_object('other',contact) INTO c FROM public.profiles WHERE id=l.user_id AND length(btrim(contact))>0; END IF;
 c:=coalesce(c,'{}'::jsonb);
 IF c='{}'::jsonb OR l.user_id=uid OR unrestricted THEN RETURN c; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('market-contact:'||uid::text||':'||m::text,0));
 IF NOT EXISTS(SELECT 1 FROM private.market_contact_unlocks WHERE user_id=uid AND month_key=m AND listing_id=p_id) THEN
  IF (SELECT count(*) FROM private.market_contact_unlocks WHERE user_id=uid AND month_key=m AND bonus_reward_id IS NULL)>=10 THEN
   SELECT r.id INTO reward_id FROM private.market_contact_rewards r JOIN public.payments p ON p.id=r.payment_id WHERE r.claimed_by=uid AND r.remaining>0 AND NOT r.revoked AND p.status='ok' ORDER BY r.id LIMIT 1 FOR UPDATE OF r;
   IF reward_id IS NULL THEN RAISE EXCEPTION 'LOCKED'; END IF;
   UPDATE private.market_contact_rewards SET remaining=remaining-1 WHERE id=reward_id;
  END IF;
  INSERT INTO private.market_contact_unlocks(user_id,month_key,listing_id,bonus_reward_id) VALUES(uid,m,p_id,reward_id);
 END IF;
 RETURN c;
END $function$
;
CREATE OR REPLACE FUNCTION private.marketplace_contact_quota()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); m date:=date_trunc('month',now() AT TIME ZONE 'Asia/Bangkok')::date; used integer; unlimited boolean; bonus integer;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
 unlimited:=private.is_admin(uid) OR private.has_product(uid,'market');
 SELECT count(*) INTO used FROM private.market_contact_unlocks WHERE user_id=uid AND month_key=m AND bonus_reward_id IS NULL;
 SELECT coalesce(sum(r.remaining),0)::integer INTO bonus FROM private.market_contact_rewards r JOIN public.payments p ON p.id=r.payment_id WHERE r.claimed_by=uid AND NOT r.revoked AND p.status='ok';
 RETURN jsonb_build_object('limit',10,'used',used,'remaining',greatest(0,10-used)+bonus,'free_remaining',greatest(0,10-used),'bonus_remaining',bonus,'unlimited',unlimited,'resets_at',(m+interval '1 month') AT TIME ZONE 'Asia/Bangkok');
END $function$
;
REVOKE ALL ON FUNCTION public.create_referred_payment_order(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_referred_payment_order(text,text) TO authenticated;
NOTIFY pgrst,'reload schema';
