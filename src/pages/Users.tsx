import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Users as UsersIcon, 
  Plus, 
  Trash2, 
  Loader2,
  Building2,
  Shield,
  User
} from 'lucide-react';
import { useOrganization, useOrganizationMembers, useInviteMember, useRemoveMember, useCurrentMember } from '@/hooks/useOrganization';
import { toast } from 'sonner';

export default function Users() {
  const { data: organization, isLoading: orgLoading } = useOrganization();
  const { data: members, isLoading: membersLoading } = useOrganizationMembers();
  const { data: currentMember } = useCurrentMember();
  const inviteMember = useInviteMember();
  const removeMember = useRemoveMember();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; email: string } | null>(null);

  const isAdmin = currentMember?.role === 'admin';
  const isLoading = orgLoading || membersLoading;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!organization) {
      toast.error('Organização não encontrada');
      return;
    }

    await inviteMember.mutateAsync({ 
      email, 
      organizationId: organization.id 
    });
    
    setEmail('');
    setIsDialogOpen(false);
  };

  const handleRemove = async () => {
    if (memberToRemove) {
      await removeMember.mutateAsync(memberToRemove.id);
      setMemberToRemove(null);
    }
  };

  if (isLoading) {
    return (
      <MainLayout title="Usuários" subtitle="Gerencie os usuários da organização">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Usuários" subtitle="Gerencie os usuários da organização">
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-end">
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Convidar Usuário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Convidar Novo Usuário</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleInvite} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email do Usuário</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="usuario@email.com"
                      required
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    O usuário deverá definir sua senha no primeiro acesso.
                  </p>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={inviteMember.isPending}>
                      {inviteMember.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Convidando...
                        </>
                      ) : (
                        'Convidar'
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Organization Info */}
        {organization && (
          <Card className="p-6 glass-card">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{organization.name}</h2>
                <p className="text-muted-foreground">{organization.document}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Members List */}
        <Card className="glass-card overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Membros da Organização</h2>
              <Badge variant="secondary" className="ml-2">
                {members?.length || 0}
              </Badge>
            </div>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Membro desde</TableHead>
                {isAdmin && <TableHead className="w-[100px]">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members?.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {member.email || `Usuário ${member.user_id.slice(0, 8)}`}
                        </span>
                        {member.user_id === currentMember?.user_id && (
                          <span className="text-xs text-muted-foreground">Você</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                      <Shield className="h-3 w-3 mr-1" />
                      {member.role === 'admin' ? 'Administrador' : 'Membro'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.password_set ? 'outline' : 'secondary'}>
                      {member.password_set ? 'Ativo' : 'Pendente'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(member.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {member.user_id !== currentMember?.user_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setMemberToRemove({ 
                            id: member.id, 
                            email: member.email || `Usuário ${member.user_id.slice(0, 8)}` 
                          })}
                          disabled={removeMember.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Remove Member Confirmation Dialog */}
        <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover usuário</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover <strong>{memberToRemove?.email}</strong> da organização? 
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemove}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {removeMember.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Removendo...
                  </>
                ) : (
                  'Remover'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
