-- Create function to find organization by document
CREATE OR REPLACE FUNCTION public.find_organization_by_document(_document text)
RETURNS TABLE (id uuid, name text, document text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, name, document
  FROM public.organizations
  WHERE document = _document
  LIMIT 1
$$;