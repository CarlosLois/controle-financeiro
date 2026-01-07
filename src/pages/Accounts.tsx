import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Building2, Plus, Pencil, Trash2 } from 'lucide-react';
import { mockAccounts } from '@/data/mockData';
import { BankAccount } from '@/types/finance';
import { cn } from '@/lib/utils';

export default function Accounts() {
  const [accounts, setAccounts] = useState<BankAccount[]>(mockAccounts);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

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

  const totalBalance = accounts.reduce((acc, account) => acc + account.balance, 0);

  const handleSaveAccount = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const newAccount: BankAccount = {
      id: editingAccount?.id || Date.now().toString(),
      name: formData.get('name') as string,
      bank: formData.get('bank') as string,
      type: formData.get('type') as BankAccount['type'],
      balance: parseFloat(formData.get('balance') as string) || 0,
      color: formData.get('color') as string || '#3B82F6',
    };

    if (editingAccount) {
      setAccounts(accounts.map(a => a.id === editingAccount.id ? newAccount : a));
    } else {
      setAccounts([...accounts, newAccount]);
    }

    setIsDialogOpen(false);
    setEditingAccount(null);
  };

  const handleDeleteAccount = (id: string) => {
    setAccounts(accounts.filter(a => a.id !== id));
  };

  const openEditDialog = (account: BankAccount) => {
    setEditingAccount(account);
    setIsDialogOpen(true);
  };

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
                  <Input id="bank" name="bank" defaultValue={editingAccount?.bank} placeholder="Ex: Nubank" required />
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
                <Button type="submit" className="w-full">
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
          {accounts.map((account) => (
            <Card key={account.id} className="glass-card p-6 hover:shadow-xl transition-shadow animate-fade-in">
              <div className="flex items-start justify-between mb-4">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${account.color}20` }}
                >
                  <Building2 className="h-6 w-6" style={{ color: account.color }} />
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(account)}>
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteAccount(account.id)}>
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
                  account.balance >= 0 ? "text-success" : "text-destructive"
                )}>
                  {formatCurrency(account.balance)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
