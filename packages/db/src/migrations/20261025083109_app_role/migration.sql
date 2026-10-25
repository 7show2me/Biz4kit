-- The role that serves requests (no BYPASSRLS, owns no table). Created here
-- without login so policies can name it on any branch; the login password is
-- set out of band by `pnpm --filter @Biz4kit/db db:app-role`, never in git.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'biz4kit_app') THEN
    CREATE ROLE biz4kit_app NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
$$;
--> statement-breakpoint

-- The workspace and user of the current transaction, set by withWorkspace and
-- withUser (packages/db/src/index.ts). Unset → null, so policies match nothing.
CREATE FUNCTION app_workspace_id() RETURNS uuid
LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.workspace_id', true), '')::uuid $$;--> statement-breakpoint
CREATE FUNCTION app_user_id() RETURNS text
LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.user_id', true), '') $$;
