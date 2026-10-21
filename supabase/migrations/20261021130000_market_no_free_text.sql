-- Free-text listing descriptions let sellers publish contact details that the market
-- membership is meant to gate, so listings no longer carry a description, and every
-- listing must be a catalogue item (no free-text item names).
UPDATE public.listings SET description='' WHERE description<>'';
ALTER TABLE public.listings ADD CONSTRAINT listings_no_description CHECK (description='');

CREATE OR REPLACE FUNCTION private.marketplace_save(p_id bigint, p_data jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE item public.items%rowtype; result_id bigint; stats jsonb; k text; v jsonb; d jsonb:=p_data;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
 IF p_data->>'price_unit' IS DISTINCT FROM 'meso' THEN RAISE EXCEPTION 'ตลาดนี้ลงราคาได้เฉพาะ Meso'; END IF;
 IF coalesce(p_data->>'item_id','') !~ '^[0-9]{1,9}$' THEN RAISE EXCEPTION 'เลือกไอเทมจากรายการค้นหา'; END IF;
 SELECT * INTO item FROM public.items WHERE id=(p_data->>'item_id')::int;
 IF item.id IS NULL THEN RAISE EXCEPTION 'ไม่พบไอเทมในฐานข้อมูล'; END IF;
 stats:=coalesce(p_data->'item_stats','{}'::jsonb);
 IF jsonb_typeof(stats) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'สเตตัสไม่ถูกต้อง'; END IF;
 FOR k,v IN SELECT key,value FROM jsonb_each(stats) LOOP
  IF NOT k=ANY(private.market_item_fields(item.type,item.subtype)) OR jsonb_typeof(v)<>'number' OR v::text !~ '^-?[0-9]{1,3}$' OR abs((v::text)::int)>(CASE WHEN k IN ('hp','mp') THEN 999 ELSE 99 END) THEN RAISE EXCEPTION 'สเตตัสไม่ตรงกับชนิดไอเทม'; END IF;
 END LOOP;
 d:=d||jsonb_build_object('item_name',item.name,'category',private.market_item_category(item.type,item.subtype),'atk','','description','');
 IF item.type<>'Equip' THEN d:=d||jsonb_build_object('slots',''); END IF;
 result_id:=private.marketplace_save_legacy(p_id,d);
 UPDATE public.listings SET item_id=item.id,item_stats=stats WHERE id=result_id;
 RETURN result_id;
END $function$;
