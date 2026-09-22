-- ====================================================================
-- MIGRATION 005: REALTIME SUBSCRIPTIONS - ODONTOPRINT
-- ====================================================================

-- Enable publication on supabase_realtime for queue and print tracking
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.print_job_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.print_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.print_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.printers;
