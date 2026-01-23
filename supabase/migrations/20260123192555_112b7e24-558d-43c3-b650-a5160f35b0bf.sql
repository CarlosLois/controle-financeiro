-- Create function to update bank account balance based on completed transactions
CREATE OR REPLACE FUNCTION public.update_bank_account_balance()
RETURNS TRIGGER AS $$
DECLARE
  amount_change numeric;
BEGIN
  -- Calculate the amount change based on the operation
  IF TG_OP = 'INSERT' THEN
    -- Only count completed transactions
    IF NEW.status = 'completed' THEN
      IF NEW.type = 'income' THEN
        amount_change := NEW.amount;
      ELSE
        amount_change := -NEW.amount;
      END IF;
      
      UPDATE bank_accounts 
      SET balance = balance + amount_change,
          updated_at = now()
      WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status change from pending to completed
    IF OLD.status = 'pending' AND NEW.status = 'completed' THEN
      IF NEW.type = 'income' THEN
        amount_change := NEW.amount;
      ELSE
        amount_change := -NEW.amount;
      END IF;
      
      UPDATE bank_accounts 
      SET balance = balance + amount_change,
          updated_at = now()
      WHERE id = NEW.account_id;
    -- Handle status change from completed to pending (reversal)
    ELSIF OLD.status = 'completed' AND NEW.status = 'pending' THEN
      IF OLD.type = 'income' THEN
        amount_change := -OLD.amount;
      ELSE
        amount_change := OLD.amount;
      END IF;
      
      UPDATE bank_accounts 
      SET balance = balance + amount_change,
          updated_at = now()
      WHERE id = OLD.account_id;
    -- Handle amount change for completed transactions
    ELSIF OLD.status = 'completed' AND NEW.status = 'completed' THEN
      -- Revert old amount
      IF OLD.type = 'income' THEN
        amount_change := -OLD.amount;
      ELSE
        amount_change := OLD.amount;
      END IF;
      
      UPDATE bank_accounts 
      SET balance = balance + amount_change,
          updated_at = now()
      WHERE id = OLD.account_id;
      
      -- Apply new amount
      IF NEW.type = 'income' THEN
        amount_change := NEW.amount;
      ELSE
        amount_change := -NEW.amount;
      END IF;
      
      UPDATE bank_accounts 
      SET balance = balance + amount_change,
          updated_at = now()
      WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Only revert completed transactions
    IF OLD.status = 'completed' THEN
      IF OLD.type = 'income' THEN
        amount_change := -OLD.amount;
      ELSE
        amount_change := OLD.amount;
      END IF;
      
      UPDATE bank_accounts 
      SET balance = balance + amount_change,
          updated_at = now()
      WHERE id = OLD.account_id;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic balance updates
DROP TRIGGER IF EXISTS update_balance_on_transaction ON public.transactions;
CREATE TRIGGER update_balance_on_transaction
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bank_account_balance();