ALTER TABLE public.sells ADD COLUMN IF NOT EXISTS gadi_bhada numeric NOT NULL DEFAULT 0;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS lock_money numeric NOT NULL DEFAULT 0;
UPDATE public.settings SET lock_money = 4810000 WHERE id = 1;