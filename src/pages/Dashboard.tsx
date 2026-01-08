import { MainLayout } from '@/components/layout/MainLayout';
import { BalanceCard } from '@/components/dashboard/BalanceCard';
import { AccountsList } from '@/components/dashboard/AccountsList';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { CreditCardWidget } from '@/components/dashboard/CreditCardWidget';
import { ExpenseChart } from '@/components/dashboard/ExpenseChart';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useCreditCards } from '@/hooks/useCreditCards';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { data: accounts = [], isLoading: loadingAccounts } = useBankAccounts();
  const { data: transactions = [], isLoading: loadingTransactions } = useTransactions();
  const { data: categories = [], isLoading: loadingCategories } = useCategories();
  const { data: creditCards = [], isLoading: loadingCards } = useCreditCards();

  const isLoading = loadingAccounts || loadingTransactions || loadingCategories || loadingCards;

  // Calculate totals
  const totalBalance = accounts.reduce((acc, account) => acc + Number(account.balance), 0);
  
  const totalIncome = transactions
    .filter(t => t.type === 'income' && t.status === 'completed')
    .reduce((acc, t) => acc + Number(t.amount), 0);
  
  const totalExpenses = transactions
    .filter(t => t.type === 'expense' && t.status === 'completed')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  // Transform data for dashboard components
  const dashboardAccounts = accounts.map(a => ({
    id: a.id,
    name: a.name,
    bank: a.bank,
    type: a.type,
    balance: Number(a.balance),
    color: a.color,
  }));

  const dashboardTransactions = transactions.map(t => ({
    id: t.id,
    description: t.description,
    amount: Number(t.amount),
    type: t.type,
    categoryId: t.category_id || undefined,
    accountId: t.account_id,
    date: t.date,
    status: t.status,
    isRecurring: t.is_recurring || undefined,
  }));

  const dashboardCategories = categories.map(c => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    color: c.color,
    parentId: c.parent_id || undefined,
    budget: c.budget ? Number(c.budget) : undefined,
  }));

  const dashboardCards = creditCards.map(c => ({
    id: c.id,
    name: c.name,
    lastDigits: c.last_digits,
    limit: Number(c.credit_limit),
    currentInvoice: Number(c.current_invoice),
    dueDay: c.due_day,
    closingDay: c.closing_day,
    color: c.color,
  }));

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
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral das suas finanças</p>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <BalanceCard
            title="Saldo Total"
            value={totalBalance}
            type="total"
            percentChange={0}
          />
          <BalanceCard
            title="Receitas do Mês"
            value={totalIncome}
            type="income"
            percentChange={0}
          />
          <BalanceCard
            title="Despesas do Mês"
            value={totalExpenses}
            type="expense"
            percentChange={0}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            <RecentTransactions
              transactions={dashboardTransactions}
              categories={dashboardCategories}
            />
            <ExpenseChart
              transactions={dashboardTransactions}
              categories={dashboardCategories}
            />
          </div>

          {/* Right Column - 1/3 */}
          <div className="space-y-6">
            <AccountsList accounts={dashboardAccounts} />
            <CreditCardWidget cards={dashboardCards} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
