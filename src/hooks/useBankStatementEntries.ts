import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { OFXTransaction } from "@/utils/ofxParser";

export interface BankStatementEntry {
  id: string;
  organization_id: string;
  account_id: string;
  user_id: string;
  transaction_id: string | null;
  date: string;
  amount: number;
  type: 'C' | 'D';
  description: string;
  memo: string | null;
  check_number: string | null;
  status: 'pending' | 'reconciled' | 'ignored';
  matched_transaction_id: string | null;
  reconciled_at: string | null;
  reconciled_by: string | null;
  created_at: string;
  updated_at: string;
}

export type BankStatementEntryInsert = Omit<
  BankStatementEntry,
  'id' | 'created_at' | 'updated_at' | 'reconciled_at' | 'reconciled_by' | 'matched_transaction_id'
>;

export function useBankStatementEntries(accountId?: string) {
  const { user } = useAuth();

  return useQuery({
    // Include user id to avoid leaking cached data across logins
    queryKey: ['bank_statement_entries', user?.id, accountId],
    queryFn: async () => {
      let query = supabase
        .from('bank_statement_entries')
        .select('*')
        .order('date', { ascending: false });

      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as BankStatementEntry[];
    },
    enabled: !!user,
  });
}

export function usePendingStatementEntries(accountId?: string) {
  const { user } = useAuth();

  return useQuery({
    // Include user id to avoid leaking cached data across logins
    queryKey: ['bank_statement_entries', 'pending', user?.id, accountId],
    queryFn: async () => {
      let query = supabase
        .from('bank_statement_entries')
        .select('*')
        .neq('status', 'reconciled') // Exclude reconciled entries
        .order('date', { ascending: false });

      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as BankStatementEntry[];
    },
    enabled: !!user,
  });
}

export function useImportBankStatement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      accountId, 
      transactions 
    }: { 
      accountId: string; 
      transactions: OFXTransaction[];
    }) => {
      if (!user) throw new Error("Usuário não autenticado");

      // Get organization_id
      const { data: orgData, error: orgError } = await supabase
        .rpc('get_user_organization_id', { _user_id: user.id });

      if (orgError) throw orgError;
      if (!orgData) throw new Error("Organização não encontrada");

      // Fetch existing entries for this account to check for duplicates
      // Using composite key: account_id (bank), type, date, amount, description
      const { data: existingEntries, error: fetchError } = await supabase
        .from('bank_statement_entries')
        .select('date, amount, type, description')
        .eq('account_id', accountId);

      if (fetchError) throw fetchError;

      // Create a set of unique keys from existing entries for fast lookup
      // Key: type_date_amount_description (same as DB unique index)
      const existingKeys = new Set(
        (existingEntries || []).map(entry => 
          `${entry.type}_${entry.date}_${entry.amount}_${entry.description}`
        )
      );

      // Filter out duplicates by comparing: type, date, amount, description
      // This allows same FITID from different banks and handles banks without FITID
      const newTransactions = transactions.filter(tx => {
        const key = `${tx.type}_${tx.datePosted}_${tx.amount}_${tx.memo}`;
        return !existingKeys.has(key);
      });

      if (newTransactions.length === 0) {
        return { inserted: 0, skipped: transactions.length };
      }

      // Prepare entries for insertion
      const entries = newTransactions.map((tx) => ({
        organization_id: orgData,
        account_id: accountId,
        user_id: user.id,
        transaction_id: tx.fitId,
        date: tx.datePosted,
        amount: tx.amount,
        type: tx.type,
        description: tx.memo,
        memo: tx.memo,
        check_number: tx.checkNumber || null,
        status: 'pending' as const,
      }));

      const { data, error } = await supabase
        .from('bank_statement_entries')
        .insert(entries)
        .select();

      if (error) throw error;
      return { 
        inserted: data?.length || 0, 
        skipped: transactions.length - newTransactions.length 
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['bank_statement_entries'] });
      const skippedMsg = result.skipped > 0 
        ? ` (${result.skipped} duplicadas ignoradas)` 
        : '';
      toast({
        title: "Extrato importado",
        description: `${result.inserted} transações importadas${skippedMsg}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao importar",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateStatementEntryStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      entryId, 
      status,
      matchedTransactionId,
      silent = false
    }: { 
      entryId: string; 
      status: 'pending' | 'reconciled' | 'ignored';
      matchedTransactionId?: string;
      silent?: boolean;
    }) => {
      const updateData: Record<string, unknown> = { status };

      // Save matched_transaction_id regardless of status (for linking during auto/manual reconciliation)
      if (matchedTransactionId) {
        updateData.matched_transaction_id = matchedTransactionId;
      }

      // Set reconciliation metadata only when status is 'reconciled'
      if (status === 'reconciled') {
        updateData.reconciled_at = new Date().toISOString();
        updateData.reconciled_by = user?.id;
      }

      const { data, error } = await supabase
        .from('bank_statement_entries')
        .update(updateData)
        .eq('id', entryId)
        .select()
        .single();

      if (error) throw error;
      return { ...data, _silent: silent };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_statement_entries'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteStatementEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('bank_statement_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_statement_entries'] });
      toast({
        title: "Entrada removida",
        description: "A entrada do extrato foi removida",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
