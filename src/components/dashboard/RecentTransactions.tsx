import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Transaction, ExpenseCategory } from '@/types/finance';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RecentTransactionsProps {
  transactions: Transaction[];
  categories: ExpenseCategory[];
  onViewAll?: () => void;
}

export function RecentTransactions({ transactions, categories, onViewAll }: RecentTransactionsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const getCategory = (categoryId?: string) => {
    return categories.find(c => c.id === categoryId);
  };

  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'income':
        return <ArrowDownLeft className="h-4 w-4 text-success" />;
      case 'expense':
        return <ArrowUpRight className="h-4 w-4 text-destructive" />;
      case 'transfer':
        return <ArrowLeftRight className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <Card className="glass-card p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Transações Recentes</h3>
        <Button variant="ghost" size="sm" onClick={onViewAll} className="text-primary hover:text-primary/80">
          Ver todas
        </Button>
      </div>

      <div className="space-y-3">
        {transactions.slice(0, 5).map((transaction, index) => {
          const category = getCategory(transaction.categoryId);
          return (
            <div
              key={transaction.id}
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center",
                transaction.type === 'income' ? "bg-success/10" : 
                transaction.type === 'expense' ? "bg-destructive/10" : "bg-primary/10"
              )}>
                {getTransactionIcon(transaction.type)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{transaction.description}</p>
                <p className="text-xs text-muted-foreground">
                  {category?.name || 'Sem categoria'} • {format(new Date(transaction.date), "d 'de' MMM", { locale: ptBR })}
                </p>
              </div>
              <div className="text-right">
                <p className={cn(
                  "text-sm font-semibold",
                  transaction.type === 'income' ? "text-success" : "text-destructive"
                )}>
                  {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
                </p>
                <p className={cn(
                  "text-xs",
                  transaction.status === 'completed' ? "text-success" : "text-warning"
                )}>
                  {transaction.status === 'completed' ? 'Efetivado' : 'Previsto'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
