-- Run in Supabase SQL Editor after supabase_setup.sql
-- Ensures all app tables exist with safe public API access patterns.

-- job_posts / job_dates (optional detail; public read when parent job is live)
ALTER TABLE IF EXISTS job_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS job_dates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS job_posts_public_read ON job_posts;
CREATE POLICY job_posts_public_read ON job_posts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM jobs j WHERE j.id = job_posts.job_id AND j.status = 'live')
  );

DROP POLICY IF EXISTS job_dates_public_read ON job_dates;
CREATE POLICY job_dates_public_read ON job_dates
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM jobs j WHERE j.id = job_dates.job_id AND j.status = 'live')
  );

-- sources: public read for transparency (no secrets in this table)
ALTER TABLE IF EXISTS sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sources_public_read ON sources;
CREATE POLICY sources_public_read ON sources
  FOR SELECT USING (true);

-- raw_ingest: backend service role only (no anon policies)
ALTER TABLE IF EXISTS raw_ingest ENABLE ROW LEVEL SECURITY;

-- Grant anon/authenticated read on jobs + sources (Supabase API)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON jobs TO anon, authenticated;
GRANT SELECT ON sources TO anon, authenticated;
GRANT SELECT ON job_posts TO anon, authenticated;
GRANT SELECT ON job_dates TO anon, authenticated;
GRANT INSERT ON alert_subscriptions TO anon, authenticated;
