import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ExpenseCategory {
  id: string;
  user_id: string;
  organization_id: string | null;
  name: string;
  icon: string;
  color: string;
  parent_id: string | null;
  budget: number | null;
  created_at: string;
  updated_at: string;
}

export type CategoryInsert = Omit<ExpenseCategory, 'id' | 'user_id' | 'organization_id' | 'created_at' | 'updated_at'>;
export type CategoryUpdate = Partial<CategoryInsert>;

async function getOrganizationId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .single();
  return data?.organization_id ?? null;
}

export function useCategories() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['expense_categories', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as ExpenseCategory[];
    },
    enabled: !!user,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (category: CategoryInsert) => {
      const organizationId = await getOrganizationId(user!.id);
      
      const { data, error } = await supabase
        .from('expense_categories')
        .insert({ 
          ...category, 
          user_id: user!.id,
          organization_id: organizationId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense_categories'] });
      toast.success('Categoria criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar categoria: ' + error.message);
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...category }: CategoryUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('expense_categories')
        .update(category)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense_categories'] });
      toast.success('Categoria atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar categoria: ' + error.message);
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense_categories'] });
      toast.success('Categoria excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir categoria: ' + error.message);
    },
  });
}
