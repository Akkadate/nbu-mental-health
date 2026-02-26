
-- 000_init.sql
BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Optional helpful extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE role_enum AS ENUM ('student','advisor','counselor','admin','supervisor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE risk_level_enum AS ENUM ('low','moderate','high','crisis');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE appt_status_enum AS ENUM ('scheduled','completed','cancelled','no_show');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE case_status_enum AS ENUM ('open','acked','contacted','follow_up','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE priority_enum AS ENUM ('high','crisis');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mode_enum AS ENUM ('online','onsite');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;