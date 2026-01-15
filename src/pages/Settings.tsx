import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { useOrganization, useCurrentMember } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Building2, User, Shield, Calendar, Mail } from 'lucide-react';
import { formatDocument } from '@/utils/documentMask';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Settings() {
  const { user } = useAuth();
  const { data: organization, isLoading: orgLoading } = useOrganization();
  const { data: currentMember, isLoading: memberLoading } = useCurrentMember();

  if (orgLoading || memberLoading) {
    return (
      <MainLayout title="Configurações" subtitle="Informações da organização e seu vínculo">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const getRoleLabel = (role: string) => {
    return role === 'admin' ? 'Administrador' : 'Membro';
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  return (
    <MainLayout title="Configurações" subtitle="Informações da organização e seu vínculo">
      <div className="space-y-6">

        {/* Organization Info */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Organização</h2>
              <p className="text-sm text-muted-foreground">Dados da empresa ou pessoa</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Razão Social / Nome</p>
              <p className="font-medium text-foreground">{organization?.name || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">CNPJ / CPF</p>
              <p className="font-medium text-foreground font-mono">
                {organization?.document ? formatDocument(organization.document) : '-'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Cadastrado em</p>
              <p className="font-medium text-foreground">
                {organization?.created_at ? formatDate(organization.created_at) : '-'}
              </p>
            </div>
          </div>
        </Card>

        {/* User Membership Info */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-secondary/50 flex items-center justify-center">
              <User className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Seu Vínculo</h2>
              <p className="text-sm text-muted-foreground">Informações do seu acesso</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1 flex items-start gap-2">
              <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium text-foreground">{user?.email || '-'}</p>
              </div>
            </div>
            <div className="space-y-1 flex items-start gap-2">
              <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Papel</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  currentMember?.role === 'admin' 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-secondary text-secondary-foreground'
                }`}>
                  {currentMember?.role ? getRoleLabel(currentMember.role) : '-'}
                </span>
              </div>
            </div>
            <div className="space-y-1 flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Membro desde</p>
                <p className="font-medium text-foreground">
                  {currentMember?.created_at ? formatDate(currentMember.created_at) : '-'}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}