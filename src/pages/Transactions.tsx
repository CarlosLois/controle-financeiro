import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ArrowUpRight, ArrowDownLeft, Search, Filter, Loader2 } from 'lucide-react';
import { useTransactions, useCreateTransaction, Transaction } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ConfirmationDialog, ConfirmationType } from '@/components/ConfirmationDialog';

export default function Transactions() {
  const { data: transactions = [], isLoading } = useTransactions();
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useBankAccounts();
  const createTransaction = useCreateTransaction();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: ConfirmationType;
    itemName: string;
    onConfirm: () => void;
  }>({ open: false, type: 'create', itemName: '', onConfirm: () => {} });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const getCategory = (categoryId?: string | null) => {
    return categories.find(c => c.id === categoryId);
  };

  const getAccount = (accountId: string) => {
    return accounts.find(a => a.id === accountId);
  };

  const handleSaveTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const description = formData.get('description') as string;
    
    setConfirmDialog({
      open: true,
      type: 'create',
      itemName: description,
      onConfirm: () => confirmSaveTransaction(formData),
    });
  };

  const confirmSaveTransaction = async (formData: FormData) => {
    const transactionData = {
      description: formData.get('description') as string,
      amount: parseFloat(formData.get('amount') as string),
      type: formData.get('type') as Transaction['type'],
      category_id: (formData.get('category') as string) || null,
      account_id: formData.get('account') as string,
      date: formData.get('date') as string,
      status: formData.get('status') as Transaction['status'],
      is_recurring: false,
    };

    await createTransaction.mutateAsync(transactionData);
    setIsDialogOpen(false);
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const pendingTransactions = filteredTransactions.filter(t => t.status === 'pending');
  const completedTransactions = filteredTransactions.filter(t => t.status === 'completed');

  const TransactionRow = ({ transaction }: { transaction: Transaction }) => {
    const category = getCategory(transaction.category_id);
    const account = getAccount(transaction.account_id);

    return (
      <div className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors border-b border-border last:border-0">
        <div className={cn(
          "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
          transaction.type === 'income' ? "bg-success/10" : "bg-destructive/10"
        )}>
          {transaction.type === 'income' ? (
            <ArrowDownLeft className="h-5 w-5 text-success" />
          ) : (
            <ArrowUpRight className="h-5 w-5 text-destructive" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{transaction.description}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{category?.name || 'Sem categoria'}</span>
            <span>•</span>
            <span>{account?.name || 'Conta desconhecida'}</span>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {format(new Date(transaction.date), "dd 'de' MMM", { locale: ptBR })}
          </p>
        </div>

        <div className="text-right">
          <p className={cn(
            "text-sm font-semibold",
            transaction.type === 'income' ? "text-success" : "text-destructive"
          )}>
            {transaction.type === 'income' ? '+' : '-'} {formatCurrency(Number(transaction.amount))}
          </p>
          <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
            {transaction.status === 'completed' ? 'Efetivado' : 'Previsto'}
          </Badge>
        </div>
      </div>
    );
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
            <h1 className="text-3xl font-bold text-foreground">Transações</h1>
            <p className="text-muted-foreground mt-1">Gerencie suas receitas e despesas</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" disabled={accounts.length === 0}>
                <Plus className="h-4 w-4" />
                Nova Transação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Transação</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveTransaction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input id="description" name="description" placeholder="Ex: Supermercado" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor</Label>
                    <Input id="amount" name="amount" type="number" step="0.01" placeholder="0.00" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo</Label>
                    <Select name="type" defaultValue="expense">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Receita</SelectItem>
                        <SelectItem value="expense">Despesa</SelectItem>
                        <SelectItem value="transfer">Transferência</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select name="category">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account">Conta</Label>
                  <Select name="account" defaultValue={accounts[0]?.id}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Data</Label>
                    <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue="completed">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="completed">Efetivado</SelectItem>
                        <SelectItem value="pending">Previsto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createTransaction.isPending}>
                  {createTransaction.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Criar Transação
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {accounts.length === 0 && (
          <Card className="glass-card p-6 border-warning/50 bg-warning/5">
            <p className="text-warning text-sm">
              Você precisa cadastrar pelo menos uma conta bancária antes de criar transações.
            </p>
          </Card>
        )}

        {/* Filters */}
        <Card className="glass-card p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar transações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="income">Receitas</SelectItem>
                  <SelectItem value="expense">Despesas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="completed">Efetivados</SelectItem>
                  <SelectItem value="pending">Previstos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Transactions List */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">Todos ({filteredTransactions.length})</TabsTrigger>
            <TabsTrigger value="pending">Previstos ({pendingTransactions.length})</TabsTrigger>
            <TabsTrigger value="completed">Efetivados ({completedTransactions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <Card className="glass-card">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map(t => <TransactionRow key={t.id} transaction={t} />)
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhuma transação encontrada
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="pending">
            <Card className="glass-card">
              {pendingTransactions.length > 0 ? (
                pendingTransactions.map(t => <TransactionRow key={t.id} transaction={t} />)
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhuma transação prevista
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="completed">
            <Card className="glass-card">
              {completedTransactions.length > 0 ? (
                completedTransactions.map(t => <TransactionRow key={t.id} transaction={t} />)
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhuma transação efetivada
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
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
