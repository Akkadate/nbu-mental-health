-- 050_analytics_daily_metrics.sql
BEGIN;

CREATE TABLE IF NOT EXISTS analytics.daily_metrics (
  metric_date date NOT NULL,
  faculty varchar(128) NOT NULL,
  risk_low_count int NOT NULL DEFAULT 0,
  risk_mod_count int NOT NULL DEFAULT 0,
  risk_high_count int NOT NULL DEFAULT 0,
  risk_crisis_count int NOT NULL DEFAULT 0,
  advisor_appt_count int NOT NULL DEFAULT 0,
  counselor_appt_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (metric_date, faculty)
);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON analytics.daily_metrics(metric_date DESC);

COMMIT;