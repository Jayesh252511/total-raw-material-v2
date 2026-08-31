ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS phonepay_txn_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS expenses_phonepay_txn_id_idx ON public.expenses (phonepay_txn_id) WHERE phonepay_txn_id IS NOT NULL;
