-- Create a safe RPC to create an organization + membership atomically
-- This avoids RLS issues when inserting organizations without being able to SELECT them yet.

CREATE OR REPLACE FUNCTION public.create_organization_for_current_user(
  _document text,
  _name text
)
RETURNS public.organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  org public.organizations;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Only allow users without an organization to create a new one
  IF public.get_user_organization_id(auth.uid()) IS NOT NULL THEN
    RAISE EXCEPTION 'user_already_has_organization';
  END IF;

  INSERT INTO public.organizations (document, name)
  VALUES (_document, _name)
  RETURNING * INTO org;

  INSERT INTO public.organization_members (organization_id, user_id, role, password_set)
  VALUES (org.id, auth.uid(), 'admin', true);

  RETURN org;
END;
$$;

-- Allow authenticated users to call the RPC
GRANT EXECUTE ON FUNCTION public.create_organization_for_current_user(text, text) TO authenticated;
