-- Sindit guide (claw first, then dagger Bandit) is a bonus for Bandit guide owners.
-- Guide id 'sindit' reads with the guide_bandit entitlement. Also allows the new 'grind' tab in saved progress.

CREATE OR REPLACE FUNCTION private.guide_product(p_guide text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$ SELECT CASE WHEN p_guide = 'sindit' THEN 'guide_bandit' ELSE 'guide_' || p_guide END $function$;

ALTER TABLE public.guide_progress DROP CONSTRAINT IF EXISTS guide_progress_guide_check;
ALTER TABLE public.guide_progress ADD CONSTRAINT guide_progress_guide_check
  CHECK (guide = ANY (ARRAY['bandit'::text, 'sindit'::text, 'assassin'::text, 'mage'::text, 'spearman'::text, 'page'::text, 'fighter'::text]));

CREATE OR REPLACE FUNCTION public.get_guide(p_guide text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); h text;
begin
  if uid is null then raise exception 'ต้องล็อกอินก่อน'; end if;
  if not (private.has_product(uid, private.guide_product(p_guide)) or private.is_admin(uid)) then raise exception 'ยังไม่ได้ซื้อไกด์นี้'; end if;
  select html into h from public.guide_files where guide = p_guide;
  return h;
end $function$;

CREATE OR REPLACE FUNCTION public.save_guide_progress(p_guide text, p_state jsonb, p_label text, p_completed integer, p_total integer, p_version integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); result public.guide_progress%rowtype;
BEGIN
 IF uid IS NULL OR NOT coalesce(private.has_product(uid,private.guide_product(p_guide)) OR private.is_admin(uid),false) THEN RAISE EXCEPTION 'ไม่มีสิทธิ์บันทึกไกด์นี้'; END IF;
 IF p_guide NOT IN ('bandit','sindit','assassin','mage','spearman','page','fighter') OR p_state IS NULL OR jsonb_typeof(p_state)<>'object' OR octet_length(p_state::text)>65536 OR p_total IS NULL OR p_total NOT BETWEEN 1 AND 2000 OR p_completed IS NULL OR p_completed NOT BETWEEN 0 AND p_total OR p_version IS NULL OR p_version<0 OR p_label IS NULL OR length(p_label)>160 THEN RAISE EXCEPTION 'ข้อมูลความคืบหน้าไม่ถูกต้อง'; END IF;
 IF jsonb_typeof(p_state->'i') IS DISTINCT FROM 'number' OR (p_state->>'i')!~'^[0-9]+$' OR (p_state->>'i')::numeric>=p_total OR jsonb_typeof(p_state->'done') IS DISTINCT FROM 'object' OR coalesce(p_state->>'tab','') NOT IN ('route','intro','opt','money','builds','grind') THEN RAISE EXCEPTION 'รูปแบบจุดอ่านไม่ถูกต้อง'; END IF;
 IF p_version=0 THEN
  INSERT INTO public.guide_progress(user_id,guide,state,step_label,completed,total) VALUES(uid,p_guide,p_state,p_label,p_completed,p_total) ON CONFLICT DO NOTHING RETURNING * INTO result;
 ELSE
  UPDATE public.guide_progress SET state=p_state,step_label=p_label,completed=p_completed,total=p_total,version=version+1,updated_at=now() WHERE user_id=uid AND guide=p_guide AND version=p_version RETURNING * INTO result;
 END IF;
 IF result.user_id IS NULL THEN RETURN jsonb_build_object('conflict',true); END IF;
 RETURN jsonb_build_object('version',result.version,'updated_at',result.updated_at);
END $function$;

CREATE OR REPLACE FUNCTION private.read_navigation(p_guide text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); result jsonb;
BEGIN
 IF uid IS NULL OR p_guide IS NULL OR p_guide NOT IN ('bandit','sindit','assassin','mage','spearman','page','fighter') THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบและเลือกไกด์'; END IF;
 IF NOT coalesce(private.has_product(uid,private.guide_product(p_guide)) OR private.is_admin(uid),false) THEN RAISE EXCEPTION 'ยังไม่มีสิทธิ์ใช้ระบบนำทาง'; END IF;
 SELECT payload INTO result FROM private.navigation_content WHERE key='v1';
 IF result IS NULL THEN RAISE EXCEPTION 'ระบบนำทางยังไม่พร้อม'; END IF;
 RETURN result;
END $function$;
