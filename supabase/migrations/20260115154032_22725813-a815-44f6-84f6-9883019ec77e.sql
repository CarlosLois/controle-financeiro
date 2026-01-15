-- Create table to store imported bank statement transactions (from OFX files)
CREATE TABLE public.bank_statement_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- OFX transaction data
  transaction_id TEXT, -- FITID from OFX (unique identifier from bank)
  date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('C', 'D')), -- C = Credit, D = Debit
  description TEXT NOT NULL,
  memo TEXT,
  check_number TEXT,
  
  -- Reconciliation status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reconciled', 'ignored')),
  matched_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  reconciled_at TIMESTAMP WITH TIME ZONE,
  reconciled_by UUID,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Prevent duplicate imports
  UNIQUE(account_id, transaction_id)
);

-- Enable Row Level Security
ALTER TABLE public.bank_statement_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Members can view organization statement entries"
ON public.bank_statement_entries
FOR SELECT
USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Members can create organization statement entries"
ON public.bank_statement_entries
FOR INSERT
WITH CHECK (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Members can update organization statement entries"
ON public.bank_statement_entries
FOR UPDATE
USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Members can delete organization statement entries"
ON public.bank_statement_entries
FOR DELETE
USING (organization_id = get_user_organization_id(auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_bank_statement_entries_updated_at
BEFORE UPDATE ON public.bank_statement_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_bank_statement_entries_account ON public.bank_statement_entries(account_id);
CREATE INDEX idx_bank_statement_entries_status ON public.bank_statement_entries(status);
CREATE INDEX idx_bank_statement_entries_date ON public.bank_statement_entries(date);