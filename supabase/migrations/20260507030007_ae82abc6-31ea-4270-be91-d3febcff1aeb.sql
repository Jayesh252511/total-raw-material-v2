ALTER TABLE public.sells ADD COLUMN IF NOT EXISTS vehicle_number text NOT NULL DEFAULT '';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS sell_money numeric NOT NULL DEFAULT 0;