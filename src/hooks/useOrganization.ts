import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Organization {
  id: string;
  document: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'admin' | 'member';
  password_set: boolean;
  created_at: string;
  updated_at: string;
}

export function useOrganization() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['organization', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .single();

      if (error) throw error;
      return data as Organization;
    },
    enabled: !!user,
  });
}

export function useOrganizationMembers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['organization_members', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as OrganizationMember[];
    },
    enabled: !!user,
  });
}

export function useCurrentMember() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['current_member', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (error) throw error;
      return data as OrganizationMember;
    },
    enabled: !!user,
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, organizationId }: { email: string; organizationId: string }) => {
      // Create user with random password (they'll set their own on first login)
      const tempPassword = crypto.randomUUID();
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: { emailRedirectTo: window.location.origin },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Falha ao criar usuário');

      // Add to organization_members
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organizationId,
          user_id: authData.user.id,
          role: 'member',
          password_set: false,
        });

      if (memberError) throw memberError;

      return authData.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization_members'] });
      toast.success('Usuário convidado com sucesso! Ele receberá um email para definir a senha.');
    },
    onError: (error) => {
      toast.error('Erro ao convidar usuário: ' + error.message);
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization_members'] });
      toast.success('Usuário removido da organização!');
    },
    onError: (error) => {
      toast.error('Erro ao remover usuário: ' + error.message);
    },
  });
}

export function useUpdateMemberPasswordStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('organization_members')
        .update({ password_set: true })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current_member'] });
    },
  });
}
