import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Building2, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useBankAccounts, useCreateBankAccount, useUpdateBankAccount, useDeleteBankAccount, BankAccount } from '@/hooks/useBankAccounts';
import { cn } from '@/lib/utils';
import { BankLogo } from '@/components/BankLogo';
import { availableBanks } from '@/utils/bankLogos';
import { ConfirmationDialog, ConfirmationType } from '@/components/ConfirmationDialog';

export default function Accounts() {
  const { data: accounts = [], isLoading } = useBankAccounts();
  const createAccount = useCreateBankAccount();
  const updateAccount = useUpdateBankAccount();
  const deleteAccount = useDeleteBankAccount();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: ConfirmationType;
    itemName: string;
    onConfirm: () => void;
  }>({ open: false, type: 'create', itemName: '', onConfirm: () => {} });

  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const getTypeLabel = (type: BankAccount['type']) => {
    switch (type) {
      case 'checking':
        return 'Conta Corrente';
      case 'savings':
        return 'Poupança';
      case 'investment':
        return 'Investimento';
    }
  };

  const totalBalance = accounts.reduce((acc, account) => acc + Number(account.balance), 0);

  const handleSaveAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setPendingFormData(formData);
    
    const name = formData.get('name') as string;
    
    setConfirmDialog({
      open: true,
      type: editingAccount ? 'update' : 'create',
      itemName: name,
      onConfirm: () => confirmSaveAccount(formData),
    });
  };

  const confirmSaveAccount = async (formData: FormData) => {
    const accountData = {
      name: formData.get('name') as string,
      bank: formData.get('bank') as string,
      type: formData.get('type') as BankAccount['type'],
      balance: parseFloat(formData.get('balance') as string) || 0,
      color: formData.get('color') as string || '#3B82F6',
    };

    if (editingAccount) {
      await updateAccount.mutateAsync({ id: editingAccount.id, ...accountData });
    } else {
      await createAccount.mutateAsync(accountData);
    }

    setIsDialogOpen(false);
    setEditingAccount(null);
    setPendingFormData(null);
  };

  const handleDeleteAccount = (account: BankAccount) => {
    setConfirmDialog({
      open: true,
      type: 'delete',
      itemName: account.name,
      onConfirm: async () => {
        await deleteAccount.mutateAsync(account.id);
      },
    });
  };

  const openEditDialog = (account: BankAccount) => {
    setEditingAccount(account);
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Contas Bancárias</h1>
            <p className="text-muted-foreground mt-1">Gerencie suas contas e saldos</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingAccount(null);
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Conta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingAccount ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveAccount} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Conta</Label>
                  <Input id="name" name="name" defaultValue={editingAccount?.name} placeholder="Ex: Conta Principal" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank">Banco</Label>
                  <Select name="bank" defaultValue={editingAccount?.bank || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o banco" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBanks.map((bank) => (
                        <SelectItem key={bank.name} value={bank.name}>
                          <div className="flex items-center gap-2">
                            <img src={bank.logo} alt={bank.name} className="h-5 w-5 object-contain" />
                            <span>{bank.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Conta</Label>
                  <Select name="type" defaultValue={editingAccount?.type || 'checking'}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">Conta Corrente</SelectItem>
                      <SelectItem value="savings">Poupança</SelectItem>
                      <SelectItem value="investment">Investimento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="balance">Saldo Inicial</Label>
                  <Input id="balance" name="balance" type="number" step="0.01" defaultValue={editingAccount?.balance} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Cor</Label>
                  <Input id="color" name="color" type="color" defaultValue={editingAccount?.color || '#3B82F6'} className="h-10 w-full" />
                </div>
                <Button type="submit" className="w-full" disabled={createAccount.isPending || updateAccount.isPending}>
                  {(createAccount.isPending || updateAccount.isPending) ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  {editingAccount ? 'Salvar Alterações' : 'Criar Conta'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Total Balance Card */}
        <Card className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Patrimônio Total</p>
              <p className={cn(
                "text-4xl font-bold mt-1",
                totalBalance >= 0 ? "text-success" : "text-destructive"
              )}>
                {formatCurrency(totalBalance)}
              </p>
            </div>
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
        </Card>

        {/* Accounts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.length === 0 ? (
            <Card className="glass-card p-8 col-span-full text-center">
              <p className="text-muted-foreground">Nenhuma conta cadastrada. Clique em "Nova Conta" para começar.</p>
            </Card>
          ) : (
            accounts.map((account) => (
              <Card key={account.id} className="glass-card p-6 hover:shadow-xl transition-shadow animate-fade-in">
                <div className="flex items-start justify-between mb-4">
                  <BankLogo bankName={account.bank} fallbackColor={account.color} size="lg" />
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(account)}>
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteAccount(account)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground">{account.name}</h3>
                  <p className="text-sm text-muted-foreground">{account.bank} • {getTypeLabel(account.type)}</p>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">Saldo Atual</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    Number(account.balance) >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {formatCurrency(Number(account.balance))}
                  </p>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        onConfirm={confirmDialog.onConfirm}
        type={confirmDialog.type}
        itemName={confirmDialog.itemName}
      />
    </MainLayout>
  );
}
