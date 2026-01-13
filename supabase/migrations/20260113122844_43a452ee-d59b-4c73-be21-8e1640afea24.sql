-- Tighten organizations INSERT policy to avoid overly-permissive WITH CHECK (true)
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

CREATE POLICY "Authenticated users can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (get_user_organization_id(auth.uid()) IS NULL);
