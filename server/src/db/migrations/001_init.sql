CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('employee', 'manager', 'admin');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'goal_status') THEN
    CREATE TYPE goal_status AS ENUM ('draft', 'submitted', 'returned', 'approved', 'locked');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'measurement_type') THEN
    CREATE TYPE measurement_type AS ENUM ('numeric', 'percent', 'timeline', 'zero_based');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scoring_direction') THEN
    CREATE TYPE scoring_direction AS ENUM ('higher_better', 'lower_better');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'checkin_status') THEN
    CREATE TYPE checkin_status AS ENUM ('not_started', 'on_track', 'completed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'employee',
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  department TEXT NOT NULL DEFAULT 'General',
  title TEXT NOT NULL DEFAULT 'Employee',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed')),
  goal_setting_start DATE NOT NULL,
  goal_setting_end DATE NOT NULL,
  q1_start DATE NOT NULL,
  q1_end DATE NOT NULL,
  q2_start DATE NOT NULL,
  q2_end DATE NOT NULL,
  q3_start DATE NOT NULL,
  q3_end DATE NOT NULL,
  q4_start DATE NOT NULL,
  q4_end DATE NOT NULL,
  active_window TEXT NOT NULL DEFAULT 'closed',
  last_window_sync_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, year)
);

CREATE TABLE IF NOT EXISTS shared_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  thrust_area TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  measurement_type measurement_type NOT NULL,
  scoring_direction scoring_direction NOT NULL DEFAULT 'higher_better',
  unit_label TEXT,
  target_numeric NUMERIC(14, 2),
  target_date DATE,
  target_text TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  shared_goal_id UUID REFERENCES shared_goals(id) ON DELETE SET NULL,
  thrust_area TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  measurement_type measurement_type NOT NULL,
  scoring_direction scoring_direction NOT NULL DEFAULT 'higher_better',
  unit_label TEXT,
  target_numeric NUMERIC(14, 2),
  target_date DATE,
  target_text TEXT,
  weightage NUMERIC(5, 2) NOT NULL CHECK (weightage >= 10 AND weightage <= 100),
  status goal_status NOT NULL DEFAULT 'draft',
  is_shared BOOLEAN NOT NULL DEFAULT false,
  title_locked BOOLEAN NOT NULL DEFAULT false,
  target_locked BOOLEAN NOT NULL DEFAULT false,
  manager_comment TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  quarter TEXT NOT NULL CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
  planned_target_numeric NUMERIC(14, 2),
  planned_target_date DATE,
  planned_target_text TEXT,
  actual_numeric NUMERIC(14, 2),
  actual_date DATE,
  actual_text TEXT,
  status checkin_status NOT NULL DEFAULT 'not_started',
  progress_score NUMERIC(6, 2) NOT NULL DEFAULT 0,
  progress_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  employee_comment TEXT,
  manager_comment TEXT,
  manager_confidence TEXT CHECK (manager_confidence IN ('low', 'medium', 'high') OR manager_confidence IS NULL),
  blocker_flag BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (goal_id, quarter)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  before_data JSONB,
  after_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);
CREATE INDEX IF NOT EXISTS idx_goals_employee_cycle ON goals(employee_id, cycle_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_checkins_cycle_quarter ON check_ins(cycle_id, quarter);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at DESC);
