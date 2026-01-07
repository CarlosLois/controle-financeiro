import { BankAccount, ExpenseCategory, Transaction, CreditCard } from '@/types/finance';

export const mockAccounts: BankAccount[] = [
  { id: '1', name: 'Conta Principal', bank: 'Nubank', type: 'checking', balance: 8450.00, color: '#8B5CF6' },
  { id: '2', name: 'Reserva de Emergência', bank: 'Inter', type: 'savings', balance: 15000.00, color: '#F97316' },
  { id: '3', name: 'Investimentos', bank: 'XP', type: 'investment', balance: 32500.00, color: '#10B981' },
];

export const mockCategories: ExpenseCategory[] = [
  { id: '1', name: 'Moradia', icon: 'Home', color: '#3B82F6', budget: 2500 },
  { id: '2', name: 'Alimentação', icon: 'Utensils', color: '#F59E0B', budget: 1200 },
  { id: '3', name: 'Transporte', icon: 'Car', color: '#8B5CF6', budget: 800 },
  { id: '4', name: 'Lazer', icon: 'Gamepad2', color: '#EC4899', budget: 500 },
  { id: '5', name: 'Saúde', icon: 'Heart', color: '#EF4444', budget: 400 },
  { id: '6', name: 'Educação', icon: 'GraduationCap', color: '#06B6D4', budget: 300 },
];

export const mockTransactions: Transaction[] = [
  { id: '1', description: 'Salário', amount: 8500, type: 'income', accountId: '1', date: '2026-01-05', status: 'completed' },
  { id: '2', description: 'Aluguel', amount: 1800, type: 'expense', categoryId: '1', accountId: '1', date: '2026-01-10', status: 'pending' },
  { id: '3', description: 'Supermercado', amount: 450, type: 'expense', categoryId: '2', accountId: '1', date: '2026-01-06', status: 'completed' },
  { id: '4', description: 'Uber', amount: 85, type: 'expense', categoryId: '3', accountId: '1', date: '2026-01-06', status: 'completed' },
  { id: '5', description: 'Netflix', amount: 55.90, type: 'expense', categoryId: '4', accountId: '1', date: '2026-01-07', status: 'completed' },
  { id: '6', description: 'Farmácia', amount: 120, type: 'expense', categoryId: '5', accountId: '1', date: '2026-01-04', status: 'completed' },
  { id: '7', description: 'Curso Online', amount: 197, type: 'expense', categoryId: '6', accountId: '1', date: '2026-01-03', status: 'completed' },
  { id: '8', description: 'Freelance', amount: 2500, type: 'income', accountId: '1', date: '2026-01-15', status: 'pending' },
];

export const mockCreditCards: CreditCard[] = [
  { id: '1', name: 'Nubank Platinum', lastDigits: '4532', limit: 12000, currentInvoice: 3450.80, dueDay: 15, closingDay: 8, color: '#8B5CF6' },
  { id: '2', name: 'Inter Gold', lastDigits: '7821', limit: 8000, currentInvoice: 1250.00, dueDay: 20, closingDay: 13, color: '#F97316' },
];
