import { CreditCard as CreditCardIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CreditCard } from '@/types/finance';

interface CreditCardWidgetProps {
  cards: CreditCard[];
}

export function CreditCardWidget({ cards }: CreditCardWidgetProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  return (
    <Card className="glass-card p-6 animate-fade-in">
      <h3 className="text-lg font-semibold text-foreground mb-4">Cartões de Crédito</h3>

      <div className="space-y-4">
        {cards.map((card, index) => {
          const usagePercent = (card.currentInvoice / card.limit) * 100;
          return (
            <div
              key={card.id}
              className="p-4 rounded-xl relative overflow-hidden"
              style={{ 
                background: `linear-gradient(135deg, ${card.color}, ${card.color}99)`,
                animationDelay: `${index * 100}ms`
              }}
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CreditCardIcon className="h-5 w-5 text-white/80" />
                    <span className="text-sm font-medium text-white">{card.name}</span>
                  </div>
                  <span className="text-xs text-white/60">**** {card.lastDigits}</span>
                </div>

                <div className="mb-3">
                  <p className="text-xs text-white/60 mb-1">Fatura Atual</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(card.currentInvoice)}</p>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-white/60 mb-1">
                    <span>Limite usado</span>
                    <span>{usagePercent.toFixed(0)}%</span>
                  </div>
                  <Progress 
                    value={usagePercent} 
                    className="h-1.5 bg-white/20"
                  />
                  <p className="text-xs text-white/60 mt-1">
                    Limite: {formatCurrency(card.limit)}
                  </p>
                </div>

                <div className="flex justify-between mt-4 text-xs text-white/60">
                  <span>Fecha dia {card.closingDay}</span>
                  <span>Vence dia {card.dueDay}</span>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
