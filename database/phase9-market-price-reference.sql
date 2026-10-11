BEGIN;
ALTER TABLE public.listings ADD COLUMN price_reference_eligible boolean NOT NULL DEFAULT true;
-- Historical rows that never went through contact-backed marketplace posting are not price evidence.
UPDATE public.listings l SET price_reference_eligible=false WHERE NOT EXISTS(SELECT 1 FROM private.marketplace_contacts c WHERE c.listing_id=l.id);
CREATE INDEX listings_price_reference ON public.listings(item_id,created_at DESC) WHERE kind='sell' AND status='open' AND price_unit='meso' AND price_reference_eligible;
CREATE FUNCTION public.marketplace_price_reference(p_item_id bigint,p_stats jsonb DEFAULT '{}'::jsonb,p_slots integer DEFAULT null) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
WITH candidates AS (
 SELECT l.user_id,l.price FROM public.listings l JOIN public.items i ON i.id=l.item_id
 WHERE l.item_id=p_item_id AND l.kind='sell' AND l.status='open' AND l.price_unit='meso' AND l.price_reference_eligible
 AND l.expires_at>now() AND l.user_id IS DISTINCT FROM (SELECT auth.uid())
 AND (i.type<>'Equip' OR ((coalesce(p_stats,'{}'::jsonb)='{}'::jsonb OR l.item_stats=p_stats) AND (p_slots IS NULL OR l.slots=p_slots)))
 ORDER BY l.created_at DESC,l.id DESC LIMIT 500
), sellers AS (
 SELECT percentile_cont(0.5) WITHIN GROUP(ORDER BY price) AS price FROM candidates GROUP BY user_id
), summary AS (
 SELECT count(*) AS sellers,percentile_cont(0.25) WITHIN GROUP(ORDER BY price) AS low,percentile_cont(0.75) WITHIN GROUP(ORDER BY price) AS high,percentile_cont(0.5) WITHIN GROUP(ORDER BY price) AS median FROM sellers
)
SELECT jsonb_build_object('seller_count',sellers,'low',CASE WHEN sellers>=3 THEN floor(low)::bigint END,'high',CASE WHEN sellers>=3 THEN ceil(high)::bigint END,'median',CASE WHEN sellers>=3 THEN round(median)::bigint END,'source','maplethai_asking_prices','checked_at',now()) FROM summary
$$;
REVOKE ALL ON FUNCTION public.marketplace_price_reference(bigint,jsonb,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marketplace_price_reference(bigint,jsonb,integer) TO anon,authenticated;
COMMIT;
