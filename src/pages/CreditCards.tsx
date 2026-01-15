import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { CreditCard as CreditCardIcon, Plus, Pencil, Trash2, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { useCreditCards, useCreateCreditCard, useUpdateCreditCard, useDeleteCreditCard, CreditCard } from '@/hooks/useCreditCards';
import { cn } from '@/lib/utils';
import { ConfirmationDialog, ConfirmationType } from '@/components/ConfirmationDialog';

export default function CreditCards() {
  const { data: cards = [], isLoading } = useCreditCards();
  const createCard = useCreateCreditCard();
  const updateCard = useUpdateCreditCard();
  const deleteCard = useDeleteCreditCard();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  
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

  const totalLimit = cards.reduce((acc, card) => acc + Number(card.credit_limit), 0);
  const totalUsed = cards.reduce((acc, card) => acc + Number(card.current_invoice), 0);
  const totalAvailable = totalLimit - totalUsed;

  const handleSaveCard = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const name = formData.get('name') as string;
    
    setConfirmDialog({
      open: true,
      type: editingCard ? 'update' : 'create',
      itemName: name,
      onConfirm: () => confirmSaveCard(formData),
    });
  };

  const confirmSaveCard = async (formData: FormData) => {
    const cardData = {
      name: formData.get('name') as string,
      last_digits: formData.get('lastDigits') as string,
      credit_limit: parseFloat(formData.get('limit') as string),
      current_invoice: parseFloat(formData.get('currentInvoice') as string) || 0,
      due_day: parseInt(formData.get('dueDay') as string),
      closing_day: parseInt(formData.get('closingDay') as string),
      color: formData.get('color') as string || '#8B5CF6',
    };

    if (editingCard) {
      await updateCard.mutateAsync({ id: editingCard.id, ...cardData });
    } else {
      await createCard.mutateAsync(cardData);
    }

    setIsDialogOpen(false);
    setEditingCard(null);
  };

  const handleDeleteCard = (card: CreditCard) => {
    setConfirmDialog({
      open: true,
      type: 'delete',
      itemName: card.name,
      onConfirm: async () => {
        await deleteCard.mutateAsync(card.id);
      },
    });
  };

  const openEditDialog = (card: CreditCard) => {
    setEditingCard(card);
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
            <h1 className="text-3xl font-bold text-foreground">Cartões de Crédito</h1>
            <p className="text-muted-foreground mt-1">Gerencie seus cartões e faturas</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingCard(null);
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Cartão
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCard ? 'Editar Cartão' : 'Novo Cartão'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveCard} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Cartão</Label>
                  <Input id="name" name="name" defaultValue={editingCard?.name} placeholder="Ex: Nubank Platinum" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lastDigits">Últimos 4 dígitos</Label>
                    <Input id="lastDigits" name="lastDigits" maxLength={4} defaultValue={editingCard?.last_digits} placeholder="0000" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="limit">Limite</Label>
                    <Input id="limit" name="limit" type="number" step="0.01" defaultValue={editingCard?.credit_limit} placeholder="0.00" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentInvoice">Fatura Atual</Label>
                  <Input id="currentInvoice" name="currentInvoice" type="number" step="0.01" defaultValue={editingCard?.current_invoice} placeholder="0.00" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="closingDay">Dia de Fechamento</Label>
                    <Input id="closingDay" name="closingDay" type="number" min="1" max="31" defaultValue={editingCard?.closing_day} placeholder="1" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDay">Dia de Vencimento</Label>
                    <Input id="dueDay" name="dueDay" type="number" min="1" max="31" defaultValue={editingCard?.due_day} placeholder="10" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Cor</Label>
                  <Input id="color" name="color" type="color" defaultValue={editingCard?.color || '#8B5CF6'} className="h-10 w-full" />
                </div>
                <Button type="submit" className="w-full" disabled={createCard.isPending || updateCard.isPending}>
                  {(createCard.isPending || updateCard.isPending) ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  {editingCard ? 'Salvar Alterações' : 'Criar Cartão'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card p-6">
            <p className="text-sm font-medium text-muted-foreground">Limite Total</p>
            <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(totalLimit)}</p>
          </Card>
          <Card className="glass-card p-6">
            <p className="text-sm font-medium text-muted-foreground">Total Utilizado</p>
            <p className="text-2xl font-bold text-destructive mt-1">{formatCurrency(totalUsed)}</p>
          </Card>
          <Card className="glass-card p-6">
            <p className="text-sm font-medium text-muted-foreground">Disponível</p>
            <p className="text-2xl font-bold text-success mt-1">{formatCurrency(totalAvailable)}</p>
          </Card>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {cards.length === 0 ? (
            <Card className="glass-card p-8 col-span-full text-center">
              <p className="text-muted-foreground">Nenhum cartão cadastrado. Clique em "Novo Cartão" para começar.</p>
            </Card>
          ) : (
            cards.map((card) => {
              const limit = Number(card.credit_limit);
              const invoice = Number(card.current_invoice);
              const usagePercent = (invoice / limit) * 100;
              const isHighUsage = usagePercent > 80;
              const available = limit - invoice;

              return (
                <Card key={card.id} className="glass-card overflow-hidden animate-fade-in">
                  {/* Card Header with gradient */}
                  <div
                    className="p-6 relative overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${card.color}, ${card.color}99)` }}
                  >
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <CreditCardIcon className="h-8 w-8 text-white/80" />
                          <div>
                            <h3 className="text-lg font-semibold text-white">{card.name}</h3>
                            <p className="text-sm text-white/60">**** **** **** {card.last_digits}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20" onClick={() => openEditDialog(card)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20" onClick={() => handleDeleteCard(card)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-white/80">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">Fecha dia {card.closing_day}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm">Vence dia {card.due_day}</span>
                        </div>
                      </div>
                    </div>

                    {/* Decorative circles */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                  </div>

                  {/* Card Details */}
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-muted-foreground">Fatura Atual</p>
                        <p className="text-2xl font-bold text-foreground">{formatCurrency(invoice)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Disponível</p>
                        <p className={cn(
                          "text-lg font-semibold",
                          isHighUsage ? "text-destructive" : "text-success"
                        )}>
                          {formatCurrency(available)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-2">
                        <span>Limite utilizado</span>
                        <span className={isHighUsage ? "text-destructive" : ""}>{usagePercent.toFixed(0)}%</span>
                      </div>
                      <Progress 
                        value={usagePercent} 
                        className={`h-2 ${isHighUsage ? '[&>div]:bg-destructive' : ''}`}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Limite: {formatCurrency(limit)}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })
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
