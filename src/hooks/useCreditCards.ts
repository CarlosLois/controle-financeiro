import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  last_digits: string;
  credit_limit: number;
  current_invoice: number;
  due_day: number;
  closing_day: number;
  color: string;
  created_at: string;
  updated_at: string;
}

export type CreditCardInsert = Omit<CreditCard, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type CreditCardUpdate = Partial<CreditCardInsert>;

export function useCreditCards() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['credit_cards', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as CreditCard[];
    },
    enabled: !!user,
  });
}

export function useCreateCreditCard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (card: CreditCardInsert) => {
      const { data, error } = await supabase
        .from('credit_cards')
        .insert({ ...card, user_id: user!.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
      toast.success('Cartão criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar cartão: ' + error.message);
    },
  });
}

export function useUpdateCreditCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...card }: CreditCardUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('credit_cards')
        .update(card)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
      toast.success('Cartão atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar cartão: ' + error.message);
    },
  });
}

export function useDeleteCreditCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('credit_cards')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
      toast.success('Cartão excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir cartão: ' + error.message);
    },
  });
}
