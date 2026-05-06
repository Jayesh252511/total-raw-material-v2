
-- Add payment column to raw_materials
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS payment numeric NOT NULL DEFAULT 0;

-- Add category column to expenses (petrol_diesel, operator, other)
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other';

-- Create sells table (similar to raw_materials but reduces stock and adds money)
CREATE TABLE IF NOT EXISTS public.sells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number serial NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  name text NOT NULL DEFAULT '',
  rate numeric NOT NULL DEFAULT 0,
  quantity numeric NOT NULL DEFAULT 0,
  total_amount numeric GENERATED ALWAYS AS (rate * quantity) STORED,
  payment numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sells ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read sells" ON public.sells FOR SELECT USING (true);
CREATE POLICY "Admin insert sells" ON public.sells FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admin update sells" ON public.sells FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admin delete sells" ON public.sells FOR DELETE TO authenticated USING (is_admin());

CREATE TRIGGER touch_sells_updated_at BEFORE UPDATE ON public.sells
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.sells;
ALTER TABLE public.sells REPLICA IDENTITY FULL;
