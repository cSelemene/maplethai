BEGIN;
-- Preserve historical values; do not relabel baht amounts as Meso.
UPDATE public.listings SET status='done',updated_at=now() WHERE price_unit<>'meso' AND status='open';
ALTER TABLE public.listings ADD CONSTRAINT listings_meso_only CHECK(price_unit='meso' OR status<>'open');
CREATE POLICY listings_meso_read ON public.listings AS RESTRICTIVE FOR SELECT TO anon,authenticated USING(price_unit='meso');
CREATE OR REPLACE FUNCTION private.marketplace_save(p_id bigint,p_data jsonb) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.items%rowtype; result_id bigint; stats jsonb; k text; v jsonb; d jsonb:=p_data;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
 IF p_data->>'price_unit' IS DISTINCT FROM 'meso' THEN RAISE EXCEPTION 'ตลาดนี้ลงราคาได้เฉพาะ Meso'; END IF;
 IF p_data ? 'item_id' THEN
  IF coalesce(p_data->>'item_id','') !~ '^[0-9]{1,9}$' THEN RAISE EXCEPTION 'เลือกไอเทมจากรายการค้นหา'; END IF;
  SELECT * INTO item FROM public.items WHERE id=(p_data->>'item_id')::int;
  IF item.id IS NULL THEN RAISE EXCEPTION 'ไม่พบไอเทมในฐานข้อมูล'; END IF;
 ELSE
  SELECT * INTO item FROM public.items WHERE lower(name)=lower(btrim(p_data->>'item_name')) LIMIT 1;
 END IF;
 stats:=coalesce(p_data->'item_stats','{}'::jsonb);
 IF jsonb_typeof(stats) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'สเตตัสไม่ถูกต้อง'; END IF;
 FOR k,v IN SELECT key,value FROM jsonb_each(stats) LOOP
  IF item.id IS NULL OR NOT k=ANY(private.market_item_fields(item.type,item.subtype)) OR jsonb_typeof(v)<>'number' OR v::text !~ '^[0-9]{1,5}$' OR (v::text)::int>(CASE WHEN k IN ('hp','mp') THEN 99999 ELSE 999 END) THEN RAISE EXCEPTION 'สเตตัสไม่ตรงกับชนิดไอเทม'; END IF;
 END LOOP;
 IF item.id IS NOT NULL THEN
  d:=d||jsonb_build_object('item_name',item.name,'category',private.market_item_category(item.type,item.subtype),'atk',coalesce(stats->>'atk',''));
  IF item.type<>'Equip' THEN d:=d||jsonb_build_object('slots',''); END IF;
 END IF;
 result_id:=private.marketplace_save_legacy(p_id,d);
 UPDATE public.listings SET item_id=item.id,item_stats=stats WHERE id=result_id;
 RETURN result_id;
END $$;
COMMIT;
