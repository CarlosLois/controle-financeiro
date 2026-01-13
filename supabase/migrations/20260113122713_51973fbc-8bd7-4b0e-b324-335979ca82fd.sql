-- Drop existing policies on organizations
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

-- Recreate policies with correct roles
CREATE POLICY "Authenticated users can create organizations" 
ON public.organizations 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can view their own organization" 
ON public.organizations 
FOR SELECT 
TO authenticated
USING (id = get_user_organization_id(auth.uid()));

CREATE POLICY "Admins can update their organization" 
ON public.organizations 
FOR UPDATE 
TO authenticated
USING (id = get_user_organization_id(auth.uid()) AND has_org_role(auth.uid(), 'admin'::org_role));