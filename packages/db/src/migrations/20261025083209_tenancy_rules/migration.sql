-- RLS is forced, so even the table owner gets no rows without a policy.
ALTER TABLE "workspace" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "numbering_counter" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "catalog_item" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "package" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "customer" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lead" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "invoice" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "invoice_line" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payment" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "booking" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "job" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "message_template" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "message" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "device" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "activity_log" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- The app role reads and writes rows; it never owns or alters tables.
GRANT USAGE ON SCHEMA public TO biz4kit_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO biz4kit_app;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO biz4kit_app;--> statement-breakpoint
-- Members are soft-deleted (DI:191); number counters are never deleted (D60).
REVOKE DELETE ON "member", "numbering_counter" FROM biz4kit_app;--> statement-breakpoint

-- A number counter never goes down and never changes its key.
CREATE FUNCTION numbering_counter_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.next < OLD.next THEN
    RAISE EXCEPTION 'numbering_counter: next cannot go down (% to %)', OLD.next, NEW.next;
  END IF;
  IF (NEW.workspace_id, NEW.series, NEW.fy) IS DISTINCT FROM (OLD.workspace_id, OLD.series, OLD.fy) THEN
    RAISE EXCEPTION 'numbering_counter: workspace, series and year cannot change';
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER numbering_counter_guard BEFORE UPDATE ON "numbering_counter"
  FOR EACH ROW EXECUTE FUNCTION numbering_counter_guard();--> statement-breakpoint

-- invoice_line.invoice_cancelled mirrors invoice.cancelled, so a partial unique
-- index can keep serials unique only among live invoices (D85).
CREATE FUNCTION invoice_line_copy_cancelled() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  SELECT i.cancelled INTO NEW.invoice_cancelled
    FROM invoice i WHERE i.workspace_id = NEW.workspace_id AND i.id = NEW.invoice_id;
  NEW.invoice_cancelled := coalesce(NEW.invoice_cancelled, false);
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER invoice_line_copy_cancelled BEFORE INSERT OR UPDATE OF invoice_id, invoice_cancelled ON "invoice_line"
  FOR EACH ROW EXECUTE FUNCTION invoice_line_copy_cancelled();--> statement-breakpoint
CREATE FUNCTION invoice_cancel_lines() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE invoice_line SET invoice_cancelled = NEW.cancelled
    WHERE workspace_id = NEW.workspace_id AND invoice_id = NEW.id;
  RETURN NULL;
END
$$;--> statement-breakpoint
CREATE TRIGGER invoice_cancel_lines AFTER UPDATE OF cancelled ON "invoice"
  FOR EACH ROW WHEN (OLD.cancelled IS DISTINCT FROM NEW.cancelled)
  EXECUTE FUNCTION invoice_cancel_lines();
