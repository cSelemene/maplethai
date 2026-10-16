BEGIN;
CREATE TABLE public.guide_progress (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 guide text NOT NULL CHECK (guide IN ('bandit','assassin','mage')),
 state jsonb NOT NULL CHECK (jsonb_typeof(state)='object' AND octet_length(state::text)<=65536),
 step_label text NOT NULL DEFAULT '' CHECK (length(step_label)<=160),
 completed integer NOT NULL DEFAULT 0 CHECK (completed>=0),
 total integer NOT NULL CHECK (total BETWEEN 1 AND 2000 AND completed<=total),
 version integer NOT NULL DEFAULT 1 CHECK (version>0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id,guide)
);
ALTER TABLE public.guide_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.guide_progress FROM anon,authenticated;
GRANT SELECT ON public.guide_progress TO authenticated;
CREATE POLICY own_progress ON public.guide_progress FOR SELECT TO authenticated USING ((SELECT auth.uid())=user_id);
CREATE FUNCTION public.my_guide_progress() RETURNS SETOF public.guide_progress LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT * FROM public.guide_progress WHERE user_id=(SELECT auth.uid()) ORDER BY updated_at DESC
$$;
CREATE FUNCTION public.save_guide_progress(p_guide text,p_state jsonb,p_label text,p_completed integer,p_total integer,p_version integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); result public.guide_progress%rowtype;
BEGIN
 IF uid IS NULL OR NOT coalesce(private.has_product(uid,'guide_'||p_guide) OR private.is_admin(uid),false) THEN RAISE EXCEPTION 'ไม่มีสิทธิ์บันทึกไกด์นี้'; END IF;
 IF p_guide NOT IN ('bandit','assassin','mage') OR p_state IS NULL OR jsonb_typeof(p_state)<>'object' OR octet_length(p_state::text)>65536 OR p_total IS NULL OR p_total NOT BETWEEN 1 AND 2000 OR p_completed IS NULL OR p_completed NOT BETWEEN 0 AND p_total OR p_version IS NULL OR p_version<0 OR p_label IS NULL OR length(p_label)>160 THEN RAISE EXCEPTION 'ข้อมูลความคืบหน้าไม่ถูกต้อง'; END IF;
 IF jsonb_typeof(p_state->'i') IS DISTINCT FROM 'number' OR (p_state->>'i')!~'^[0-9]+$' OR (p_state->>'i')::numeric>=p_total OR jsonb_typeof(p_state->'done') IS DISTINCT FROM 'object' OR coalesce(p_state->>'tab','') NOT IN ('route','intro','opt','money','builds') THEN RAISE EXCEPTION 'รูปแบบจุดอ่านไม่ถูกต้อง'; END IF;
 IF p_version=0 THEN
  INSERT INTO public.guide_progress(user_id,guide,state,step_label,completed,total) VALUES(uid,p_guide,p_state,p_label,p_completed,p_total) ON CONFLICT DO NOTHING RETURNING * INTO result;
 ELSE
  UPDATE public.guide_progress SET state=p_state,step_label=p_label,completed=p_completed,total=p_total,version=version+1,updated_at=now() WHERE user_id=uid AND guide=p_guide AND version=p_version RETURNING * INTO result;
 END IF;
 IF result.user_id IS NULL THEN RETURN jsonb_build_object('conflict',true); END IF;
 RETURN jsonb_build_object('version',result.version,'updated_at',result.updated_at);
END $$;
REVOKE ALL ON FUNCTION public.my_guide_progress(),public.save_guide_progress(text,jsonb,text,integer,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.my_guide_progress(),public.save_guide_progress(text,jsonb,text,integer,integer,integer) TO authenticated;
COMMIT;
