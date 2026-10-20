-- F/P (Fire / Poison) Mage guide: guide id 'fp', product 'guide_fp'.
-- The product starts inactive; it is switched on after the guide HTML is uploaded to guide_files.

INSERT INTO public.products (id, name, price, kind, days, sort, active)
VALUES ('guide_fp', 'ไกด์ F/P Mage', 99, 'once', NULL, 7, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.guide_files (guide, html) VALUES ('fp', '<p>กำลังเตรียมไกด์</p>')
ON CONFLICT (guide) DO NOTHING;

ALTER TABLE public.guide_progress DROP CONSTRAINT IF EXISTS guide_progress_guide_check;
ALTER TABLE public.guide_progress ADD CONSTRAINT guide_progress_guide_check
  CHECK (guide = ANY (ARRAY['bandit'::text, 'sindit'::text, 'assassin'::text, 'mage'::text, 'fp'::text, 'spearman'::text, 'page'::text, 'fighter'::text]));

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_gift_email_valid;
ALTER TABLE public.payments ADD CONSTRAINT payments_gift_email_valid CHECK (((gift_email IS NULL) OR ((gift_email = lower(btrim(gift_email))) AND (length(gift_email) <= 254) AND (gift_email ~ '^[^[:space:]@]+@[^[:space:]@.]+\.[^[:space:]@]+$'::text) AND (product = ANY (ARRAY['guide_bandit'::text, 'guide_assassin'::text, 'guide_mage'::text, 'guide_fp'::text, 'guide_spearman'::text, 'guide_page'::text, 'guide_fighter'::text])))));

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_referral_valid;
ALTER TABLE public.payments ADD CONSTRAINT payments_referral_valid CHECK (((referral_email IS NULL) OR ((gift_email IS NULL) AND (product = ANY (ARRAY['guide_bandit'::text, 'guide_assassin'::text, 'guide_mage'::text, 'guide_fp'::text, 'guide_spearman'::text, 'guide_page'::text, 'guide_fighter'::text])) AND (referral_email = lower(btrim(referral_email))) AND (length(referral_email) <= 254) AND (referral_email ~ '^[^[:space:]@]+@[^[:space:]@.]+\.[^[:space:]@]+$'::text))));

-- Add the new ids to the hard-coded product / guide lists inside existing functions, keeping each body otherwise unchanged.
DO $$
DECLARE r record; d text; n text;
BEGIN
  FOR r IN SELECT p.oid, n.nspname || '.' || p.proname AS fn,
                  CASE WHEN p.proname IN ('save_guide_progress', 'read_navigation') THEN 'guide' ELSE 'product' END AS kind
           FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE (n.nspname, p.proname) IN (('public', 'create_payment_order'), ('public', 'create_gift_payment_order'),
                                            ('public', 'create_referred_payment_order'), ('private', 'payment_market_promotion'),
                                            ('public', 'save_guide_progress'), ('private', 'read_navigation'))
  LOOP
    d := pg_get_functiondef(r.oid);
    IF r.kind = 'product' THEN
      n := replace(d, '''guide_mage'',''guide_spearman''', '''guide_mage'',''guide_fp'',''guide_spearman''');
    ELSE
      n := replace(d, '''assassin'',''mage'',''spearman''', '''assassin'',''mage'',''fp'',''spearman''');
    END IF;
    IF n = d AND position('''fp''' IN d) = 0 AND position('''guide_fp''' IN d) = 0 THEN RAISE EXCEPTION 'list not found in %', r.fn; END IF;
    IF n <> d THEN EXECUTE n; END IF;
  END LOOP;
END $$;
