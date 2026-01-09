
-- Create enum for user roles within organization
CREATE TYPE public.org_role AS ENUM ('admin', 'member');

-- Create organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document TEXT NOT NULL UNIQUE, -- CNPJ or CPF
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organization members table (links users to organizations)
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'member',
  password_set BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user belongs to an organization
CREATE OR REPLACE FUNCTION public.get_user_organization_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id 
  FROM public.organization_members 
  WHERE user_id = _user_id 
  LIMIT 1
$$;

-- Security definer function to check if user has a specific role in their org
CREATE OR REPLACE FUNCTION public.has_org_role(_user_id UUID, _role org_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Security definer function to check if user's password is set
CREATE OR REPLACE FUNCTION public.is_password_set(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT password_set FROM public.organization_members WHERE user_id = _user_id LIMIT 1),
    false
  )
$$;

-- RLS Policies for organizations
CREATE POLICY "Users can view their own organization"
ON public.organizations
FOR SELECT
USING (id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Admins can update their organization"
ON public.organizations
FOR UPDATE
USING (
  id = public.get_user_organization_id(auth.uid()) 
  AND public.has_org_role(auth.uid(), 'admin')
);

-- RLS Policies for organization_members
CREATE POLICY "Users can view members of their organization"
ON public.organization_members
FOR SELECT
USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Admins can insert members to their organization"
ON public.organization_members
FOR INSERT
WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
  AND public.has_org_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update members of their organization"
ON public.organization_members
FOR UPDATE
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND public.has_org_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete members of their organization"
ON public.organization_members
FOR DELETE
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND public.has_org_role(auth.uid(), 'admin')
  AND user_id != auth.uid() -- Cannot delete yourself
);

-- Add organization_id to existing tables
ALTER TABLE public.bank_accounts ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.expense_categories ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.credit_cards ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Update RLS policies for bank_accounts to use organization
DROP POLICY IF EXISTS "Usuários podem ver suas próprias contas" ON public.bank_accounts;
DROP POLICY IF EXISTS "Usuários podem criar suas próprias contas" ON public.bank_accounts;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias contas" ON public.bank_accounts;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias contas" ON public.bank_accounts;

CREATE POLICY "Members can view organization accounts"
ON public.bank_accounts FOR SELECT
USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Members can create organization accounts"
ON public.bank_accounts FOR INSERT
WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Members can update organization accounts"
ON public.bank_accounts FOR UPDATE
USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Members can delete organization accounts"
ON public.bank_accounts FOR DELETE
USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Update RLS policies for expense_categories
DROP POLICY IF EXISTS "Usuários podem ver suas próprias categorias" ON public.expense_categories;
DROP POLICY IF EXISTS "Usuários podem criar suas próprias categorias" ON public.expense_categories;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias categorias" ON public.expense_categories;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias categorias" ON public.expense_categories;

CREATE POLICY "Members can view organization categories"
ON public.expense_categories FOR SELECT
USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Members can create organization categories"
ON public.expense_categories FOR INSERT
WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Members can update organization categories"
ON public.expense_categories FOR UPDATE
USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Members can delete organization categories"
ON public.expense_categories FOR DELETE
USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Update RLS policies for transactions
DROP POLICY IF EXISTS "Usuários podem ver suas próprias transações" ON public.transactions;
DROP POLICY IF EXISTS "Usuários podem criar suas próprias transações" ON public.transactions;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias transações" ON public.transactions;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias transações" ON public.transactions;

CREATE POLICY "Members can view organization transactions"
ON public.transactions FOR SELECT
USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Members can create organization transactions"
ON public.transactions FOR INSERT
WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Members can update organization transactions"
ON public.transactions FOR UPDATE
USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Members can delete organization transactions"
ON public.transactions FOR DELETE
USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Update RLS policies for credit_cards
DROP POLICY IF EXISTS "Usuários podem ver seus próprios cartões" ON public.credit_cards;
DROP POLICY IF EXISTS "Usuários podem criar seus próprios cartões" ON public.credit_cards;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios cartões" ON public.credit_cards;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios cartões" ON public.credit_cards;

CREATE POLICY "Members can view organization cards"
ON public.credit_cards FOR SELECT
USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Members can create organization cards"
ON public.credit_cards FOR INSERT
WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Members can update organization cards"
ON public.credit_cards FOR UPDATE
USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Members can delete organization cards"
ON public.credit_cards FOR DELETE
USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at
BEFORE UPDATE ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
