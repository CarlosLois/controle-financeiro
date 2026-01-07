import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface BalanceCardProps {
  title: string;
  value: number;
  type: 'total' | 'income' | 'expense';
  percentChange?: number;
}

export function BalanceCard({ title, value, type, percentChange }: BalanceCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const getIcon = () => {
    switch (type) {
      case 'income':
        return <TrendingUp className="h-5 w-5" />;
      case 'expense':
        return <TrendingDown className="h-5 w-5" />;
      default:
        return <Wallet className="h-5 w-5" />;
    }
  };

  const getIconBgClass = () => {
    switch (type) {
      case 'income':
        return 'bg-success/10 text-success';
      case 'expense':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-primary/10 text-primary';
    }
  };

  const getValueClass = () => {
    switch (type) {
      case 'income':
        return 'text-success';
      case 'expense':
        return 'text-destructive';
      default:
        return 'text-foreground';
    }
  };

  return (
    <Card className="glass-card p-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={cn("text-2xl font-bold mt-1", getValueClass())}>
            {formatCurrency(value)}
          </p>
          {percentChange !== undefined && (
            <p className={cn(
              "text-xs mt-2 flex items-center gap-1",
              percentChange >= 0 ? "text-success" : "text-destructive"
            )}>
              {percentChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(percentChange)}% vs mês anterior
            </p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", getIconBgClass())}>
          {getIcon()}
        </div>
      </div>
    </Card>
  );
}
