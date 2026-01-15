import { createContext, useContext, useState, ReactNode } from 'react';

interface AccountFilterContextType {
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string | null) => void;
}

const AccountFilterContext = createContext<AccountFilterContextType | undefined>(undefined);

export function AccountFilterProvider({ children }: { children: ReactNode }) {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  return (
    <AccountFilterContext.Provider value={{ selectedAccountId, setSelectedAccountId }}>
      {children}
    </AccountFilterContext.Provider>
  );
}

export function useAccountFilter() {
  const context = useContext(AccountFilterContext);
  if (context === undefined) {
    throw new Error('useAccountFilter must be used within an AccountFilterProvider');
  }
  return context;
}
