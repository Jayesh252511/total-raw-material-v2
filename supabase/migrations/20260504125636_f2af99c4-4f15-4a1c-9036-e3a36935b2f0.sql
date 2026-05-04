
-- Settings table (single-row config for total money)
CREATE TABLE public.settings (
  id INT PRIMARY KEY DEFAULT 1,
  total_money NUMERIC NOT NULL DEFAULT 0,
  low_money_threshold NUMERIC NOT NULL DEFAULT 10000,
  low_stock_threshold NUMERIC NOT NULL DEFAULT 5,
  high_txn_threshold NUMERIC NOT NULL DEFAULT 50000,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);
INSERT INTO public.settings (id, total_money) VALUES (1, 0);

-- Raw material purchases
CREATE TABLE public.raw_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number SERIAL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  name TEXT NOT NULL DEFAULT '',
  rate NUMERIC NOT NULL DEFAULT 0,
  quantity NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC GENERATED ALWAYS AS (rate * quantity) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Expenses / maintenance
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number SERIAL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  name TEXT NOT NULL DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit log
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL, -- created/updated/deleted
  entity TEXT NOT NULL, -- raw_material/expense/settings
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS with permissive policies (no auth in this app)
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Public update settings" ON public.settings FOR UPDATE USING (true);

CREATE POLICY "Public read raw_materials" ON public.raw_materials FOR SELECT USING (true);
CREATE POLICY "Public insert raw_materials" ON public.raw_materials FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update raw_materials" ON public.raw_materials FOR UPDATE USING (true);
CREATE POLICY "Public delete raw_materials" ON public.raw_materials FOR DELETE USING (true);

CREATE POLICY "Public read expenses" ON public.expenses FOR SELECT USING (true);
CREATE POLICY "Public insert expenses" ON public.expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update expenses" ON public.expenses FOR UPDATE USING (true);
CREATE POLICY "Public delete expenses" ON public.expenses FOR DELETE USING (true);

CREATE POLICY "Public read audit_logs" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Public insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER raw_materials_touch BEFORE UPDATE ON public.raw_materials
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER expenses_touch BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Indexes for performance
CREATE INDEX idx_raw_materials_date ON public.raw_materials(entry_date DESC);
CREATE INDEX idx_expenses_date ON public.expenses(entry_date DESC);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);
