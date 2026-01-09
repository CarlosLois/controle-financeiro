import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface BankAccount {
  id: string;
  user_id: string;
  organization_id: string | null;
  name: string;
  bank: string;
  type: 'checking' | 'savings' | 'investment';
  balance: number;
  color: string;
  created_at: string;
  updated_at: string;
}

export type BankAccountInsert = Omit<BankAccount, 'id' | 'user_id' | 'organization_id' | 'created_at' | 'updated_at'>;
export type BankAccountUpdate = Partial<BankAccountInsert>;

async function getOrganizationId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .single();
  return data?.organization_id ?? null;
}

export function useBankAccounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['bank_accounts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BankAccount[];
    },
    enabled: !!user,
  });
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (account: BankAccountInsert) => {
      const organizationId = await getOrganizationId(user!.id);
      
      const { data, error } = await supabase
        .from('bank_accounts')
        .insert({ 
          ...account, 
          user_id: user!.id,
          organization_id: organizationId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
      toast.success('Conta criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar conta: ' + error.message);
    },
  });
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...account }: BankAccountUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .update(account)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
      toast.success('Conta atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar conta: ' + error.message);
    },
  });
}

export function useDeleteBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
      toast.success('Conta excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir conta: ' + error.message);
    },
  });
}
