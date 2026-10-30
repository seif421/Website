-- Messages sent through the public contact form.
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 200),
  order_number text CHECK (order_number IS NULL OR char_length(order_number) <= 60),
  message text NOT NULL CHECK (char_length(message) BETWEEN 5 AND 3000),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','answered')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.contact_messages FROM anon, authenticated;
GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.contact_messages TO authenticated;

CREATE POLICY "anyone can send a message" ON public.contact_messages
  FOR INSERT TO anon, authenticated WITH CHECK (status = 'new');

CREATE POLICY "staff read messages" ON public.contact_messages
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "staff update messages" ON public.contact_messages
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "staff delete messages" ON public.contact_messages
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
