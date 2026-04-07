CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'pending' CHECK (role IN ('super_admin','admin','user','pending')),
  brl_rate NUMERIC(6,2) NOT NULL DEFAULT 5.50,
  plan_cost_usd NUMERIC(8,2) NOT NULL DEFAULT 200.00,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
