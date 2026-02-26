-- 023_public_audit_log.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  actor_role role_enum,
  action varchar(128) NOT NULL,
  object_type varchar(64),
  object_id uuid,
  ip inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_object ON public.audit_log(object_type, object_id);

COMMIT;