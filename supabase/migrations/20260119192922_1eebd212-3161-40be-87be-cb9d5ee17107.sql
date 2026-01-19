-- Remove the old unique constraint (account_id, transaction_id)
ALTER TABLE public.bank_statement_entries 
DROP CONSTRAINT IF EXISTS bank_statement_entries_account_id_transaction_id_key;

-- Create a new unique constraint based on Bank (account_id), Type, Date, Amount, and Description
-- This allows same FITID from different banks and handles banks that don't provide FITID
CREATE UNIQUE INDEX bank_statement_entries_composite_key 
ON public.bank_statement_entries (account_id, type, date, amount, description);