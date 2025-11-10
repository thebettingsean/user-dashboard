-- Setup cron job to refresh game snapshots every 15 minutes
-- Run this in your Supabase SQL Editor (in the "game storage" project)

-- First, ensure pg_cron and pg_net extensions are enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop existing job if it exists
SELECT cron.unschedule('refresh-game-snapshots');

-- Create the cron job that runs every 15 minutes
-- This will invoke the edge function without a sport parameter, so it processes both NFL and NBA
SELECT cron.schedule(
  'refresh-game-snapshots',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT net.http_post(
    url := 'https://knccqavkxvezhdfoktay.supabase.co/functions/v1/refresh-game-snapshots',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuY2NxYXZreHZlemhkZm9rdGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNTg5MDcsImV4cCI6MjA2NzkzNDkwN30.HCmUjhNxdyT8zXaAQvgHwJiipCk3q7CfJjNnvjqhP7E'
    )
  ) AS request_id;
  $$
);

-- Verify the job was created
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  active
FROM cron.job
WHERE jobname = 'refresh-game-snapshots';

