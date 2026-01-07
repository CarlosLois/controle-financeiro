import { MainLayout } from '@/components/layout/MainLayout';
import { BalanceCard } from '@/components/dashboard/BalanceCard';
import { AccountsList } from '@/components/dashboard/AccountsList';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { CreditCardWidget } from '@/components/dashboard/CreditCardWidget';
import { ExpenseChart } from '@/components/dashboard/ExpenseChart';
import { mockAccounts, mockTransactions, mockCategories, mockCreditCards } from '@/data/mockData';

export default function Dashboard() {
  // Calculate totals
  const totalBalance = mockAccounts.reduce((acc, account) => acc + account.balance, 0);
  
  const totalIncome = mockTransactions
    .filter(t => t.type === 'income' && t.status === 'completed')
    .reduce((acc, t) => acc + t.amount, 0);
  
  const totalExpenses = mockTransactions
    .filter(t => t.type === 'expense' && t.status === 'completed')
    .reduce((acc, t) => acc + t.amount, 0);

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
            percentChange={12.5}
          />
          <BalanceCard
            title="Receitas do Mês"
            value={totalIncome}
            type="income"
            percentChange={8.2}
          />
          <BalanceCard
            title="Despesas do Mês"
            value={totalExpenses}
            type="expense"
            percentChange={-3.1}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            <RecentTransactions
              transactions={mockTransactions}
              categories={mockCategories}
            />
            <ExpenseChart
              transactions={mockTransactions}
              categories={mockCategories}
            />
          </div>

          {/* Right Column - 1/3 */}
          <div className="space-y-6">
            <AccountsList accounts={mockAccounts} />
            <CreditCardWidget cards={mockCreditCards} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
