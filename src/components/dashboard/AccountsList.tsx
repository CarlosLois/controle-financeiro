import { Building2, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BankAccount } from '@/types/finance';
import { cn } from '@/lib/utils';

interface AccountsListProps {
  accounts: BankAccount[];
  onAddAccount?: () => void;
}

export function AccountsList({ accounts, onAddAccount }: AccountsListProps) {
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

  return (
    <Card className="glass-card p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Minhas Contas</h3>
        <Button variant="ghost" size="sm" onClick={onAddAccount} className="text-primary hover:text-primary/80">
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>
      </div>

      <div className="space-y-3">
        {accounts.map((account, index) => (
          <div
            key={account.id}
            className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${account.color}20` }}
            >
              <Building2 className="h-5 w-5" style={{ color: account.color }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{account.name}</p>
              <p className="text-xs text-muted-foreground">
                {account.bank} • {getTypeLabel(account.type)}
              </p>
            </div>
            <p className={cn(
              "text-sm font-semibold",
              account.balance >= 0 ? "text-success" : "text-destructive"
            )}>
              {formatCurrency(account.balance)}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
