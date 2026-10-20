-- Sindit guide is sold on its own (product guide_sindit, 99 THB) and stays free for Bandit guide owners.
-- private.guide_product('sindit') now points at guide_sindit; private.has_product treats a Bandit
-- entitlement as owning guide_sindit, so reading, progress, navigation and "already owned" checks all agree.

INSERT INTO public.products (id, name, price, kind, days, sort, active)
VALUES ('guide_sindit', 'ไกด์ Sindit', 99, 'once', NULL, 8, true)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION private.guide_product(p_guide text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$ SELECT 'guide_' || p_guide $function$;

CREATE OR REPLACE FUNCTION private.has_product(uid uuid, p text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select exists(select 1 from public.entitlements e where e.user_id = uid
  and (e.product = p or (p = 'guide_sindit' and e.product = 'guide_bandit'))
  and (e.expires_at is null or e.expires_at > now())) $function$;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_gift_email_valid;
ALTER TABLE public.payments ADD CONSTRAINT payments_gift_email_valid CHECK (((gift_email IS NULL) OR ((gift_email = lower(btrim(gift_email))) AND (length(gift_email) <= 254) AND (gift_email ~ '^[^[:space:]@]+@[^[:space:]@.]+\.[^[:space:]@]+$'::text) AND (product = ANY (ARRAY['guide_bandit'::text, 'guide_sindit'::text, 'guide_assassin'::text, 'guide_mage'::text, 'guide_fp'::text, 'guide_spearman'::text, 'guide_page'::text, 'guide_fighter'::text])))));

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_referral_valid;
ALTER TABLE public.payments ADD CONSTRAINT payments_referral_valid CHECK (((referral_email IS NULL) OR ((gift_email IS NULL) AND (product = ANY (ARRAY['guide_bandit'::text, 'guide_sindit'::text, 'guide_assassin'::text, 'guide_mage'::text, 'guide_fp'::text, 'guide_spearman'::text, 'guide_page'::text, 'guide_fighter'::text])) AND (referral_email = lower(btrim(referral_email))) AND (length(referral_email) <= 254) AND (referral_email ~ '^[^[:space:]@]+@[^[:space:]@.]+\.[^[:space:]@]+$'::text))));

-- Add guide_sindit to the product lists inside the order functions, keeping each body otherwise unchanged.
DO $$
DECLARE r record; d text; n text;
BEGIN
  FOR r IN SELECT p.oid, n.nspname || '.' || p.proname AS fn
           FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE (n.nspname, p.proname) IN (('public', 'create_payment_order'), ('public', 'create_gift_payment_order'),
                                            ('public', 'create_referred_payment_order'), ('private', 'payment_market_promotion'))
  LOOP
    d := pg_get_functiondef(r.oid);
    n := replace(d, '''guide_bandit'',''guide_assassin''', '''guide_bandit'',''guide_sindit'',''guide_assassin''');
    IF n = d AND position('''guide_sindit''' IN d) = 0 THEN RAISE EXCEPTION 'list not found in %', r.fn; END IF;
    IF n <> d THEN EXECUTE n; END IF;
  END LOOP;
END $$;
