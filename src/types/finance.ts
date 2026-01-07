export interface BankAccount {
  id: string;
  name: string;
  bank: string;
  type: 'checking' | 'savings' | 'investment';
  balance: number;
  color: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  parentId?: string;
  budget?: number;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  categoryId?: string;
  accountId: string;
  date: string;
  status: 'pending' | 'completed';
  isRecurring?: boolean;
}

export interface CreditCard {
  id: string;
  name: string;
  lastDigits: string;
  limit: number;
  currentInvoice: number;
  dueDay: number;
  closingDay: number;
  color: string;
}
