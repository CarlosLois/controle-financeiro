
-- Allow any authenticated user to create an organization (for new signups)
CREATE POLICY "Users can create organizations"
ON public.organizations
FOR INSERT
WITH CHECK (true);

-- Allow users to add themselves to an organization they just created
CREATE POLICY "Users can add themselves as first member"
ON public.organization_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);
