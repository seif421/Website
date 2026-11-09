-- Answer contact-form messages from the admin Support page. The answer is emailed to the customer.

ALTER TABLE public.contact_messages ADD COLUMN IF NOT EXISTS reply text;
ALTER TABLE public.contact_messages ADD COLUMN IF NOT EXISTS replied_at timestamptz;

-- Staff only: saves the answer and returns what the server needs to email it. One answer per message.
CREATE OR REPLACE FUNCTION public.claim_support_reply(p_id uuid, p_reply text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE m record; v_reply text := btrim(coalesce(p_reply, ''));
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_any_staff_role(auth.uid()) THEN RAISE EXCEPTION 'Not allowed.'; END IF;
  IF char_length(v_reply) < 2 THEN RAISE EXCEPTION 'Write your answer first.'; END IF;
  IF char_length(v_reply) > 5000 THEN RAISE EXCEPTION 'The answer is too long.'; END IF;
  SELECT * INTO m FROM public.contact_messages WHERE id = p_id AND status <> 'answered' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This message was already answered.'; END IF;
  UPDATE public.contact_messages SET status = 'answered', reply = v_reply, replied_at = now() WHERE id = m.id;
  RETURN jsonb_build_object('name', m.name, 'email', m.email, 'order_number', m.order_number,
                            'message', m.message, 'reply', v_reply);
END $$;

-- Puts the message back if the email could not be sent, so the answer can be sent again.
CREATE OR REPLACE FUNCTION public.release_support_reply(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_any_staff_role(auth.uid()) THEN RAISE EXCEPTION 'Not allowed.'; END IF;
  UPDATE public.contact_messages SET status = 'read', reply = NULL, replied_at = NULL WHERE id = p_id;
END $$;

REVOKE ALL ON FUNCTION public.claim_support_reply(uuid, text), public.release_support_reply(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_support_reply(uuid, text), public.release_support_reply(uuid) TO authenticated;
