import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Plus, Pencil, Trash2, Home, Utensils, Car, Gamepad2, Heart, GraduationCap } from 'lucide-react';
import { mockCategories, mockTransactions } from '@/data/mockData';
import { ExpenseCategory } from '@/types/finance';

const iconMap: Record<string, React.ElementType> = {
  Home,
  Utensils,
  Car,
  Gamepad2,
  Heart,
  GraduationCap,
};

export default function Categories() {
  const [categories, setCategories] = useState<ExpenseCategory[]>(mockCategories);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  // Calculate spent amount per category
  const getSpentAmount = (categoryId: string) => {
    return mockTransactions
      .filter(t => t.categoryId === categoryId && t.type === 'expense' && t.status === 'completed')
      .reduce((acc, t) => acc + t.amount, 0);
  };

  const handleSaveCategory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const newCategory: ExpenseCategory = {
      id: editingCategory?.id || Date.now().toString(),
      name: formData.get('name') as string,
      icon: formData.get('icon') as string || 'Home',
      color: formData.get('color') as string || '#3B82F6',
      budget: parseFloat(formData.get('budget') as string) || undefined,
    };

    if (editingCategory) {
      setCategories(categories.map(c => c.id === editingCategory.id ? newCategory : c));
    } else {
      setCategories([...categories, newCategory]);
    }

    setIsDialogOpen(false);
    setEditingCategory(null);
  };

  const handleDeleteCategory = (id: string) => {
    setCategories(categories.filter(c => c.id !== id));
  };

  const openEditDialog = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setIsDialogOpen(true);
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Categorias</h1>
            <p className="text-muted-foreground mt-1">Organize suas despesas por categoria</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingCategory(null);
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Categoria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveCategory} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Categoria</Label>
                  <Input id="name" name="name" defaultValue={editingCategory?.name} placeholder="Ex: Alimentação" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="icon">Ícone</Label>
                  <select 
                    id="icon" 
                    name="icon" 
                    defaultValue={editingCategory?.icon || 'Home'}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="Home">Casa</option>
                    <option value="Utensils">Alimentação</option>
                    <option value="Car">Transporte</option>
                    <option value="Gamepad2">Lazer</option>
                    <option value="Heart">Saúde</option>
                    <option value="GraduationCap">Educação</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget">Orçamento Mensal</Label>
                  <Input id="budget" name="budget" type="number" step="0.01" defaultValue={editingCategory?.budget} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Cor</Label>
                  <Input id="color" name="color" type="color" defaultValue={editingCategory?.color || '#3B82F6'} className="h-10 w-full" />
                </div>
                <Button type="submit" className="w-full">
                  {editingCategory ? 'Salvar Alterações' : 'Criar Categoria'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => {
            const Icon = iconMap[category.icon] || Home;
            const spent = getSpentAmount(category.id);
            const budget = category.budget || 0;
            const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
            const isOverBudget = spent > budget && budget > 0;

            return (
              <Card key={category.id} className="glass-card p-6 hover:shadow-xl transition-shadow animate-fade-in">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    <Icon className="h-6 w-6" style={{ color: category.color }} />
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(category)}>
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteCategory(category.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground">{category.name}</h3>
                  {budget > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Orçamento: {formatCurrency(budget)}
                    </p>
                  )}
                </div>

                {budget > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Gasto</span>
                      <span className={isOverBudget ? "text-destructive font-medium" : "text-foreground"}>
                        {formatCurrency(spent)}
                      </span>
                    </div>
                    <Progress 
                      value={percentage} 
                      className={`h-2 ${isOverBudget ? '[&>div]:bg-destructive' : ''}`}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      {percentage.toFixed(0)}% do orçamento utilizado
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
