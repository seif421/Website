-- New orders are numbered RV-XXXXXXXX (the store is now called Rivvo). Existing orders keep their numbers.
ALTER TABLE public.orders ALTER COLUMN order_number SET DEFAULT ('RV-' || upper(substr(gen_random_uuid()::text, 1, 8)));
