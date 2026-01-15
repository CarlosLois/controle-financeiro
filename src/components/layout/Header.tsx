import { Bell, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useAccountFilter } from '@/contexts/AccountFilterContext';
import { BankLogo } from '@/components/BankLogo';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [hasNotifications] = useState(true);
  const { data: bankAccounts = [] } = useBankAccounts();
  const { selectedAccountId, setSelectedAccountId } = useAccountFilter();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const userName = user?.email?.split('@')[0] || 'Usuário';
  
  const selectedAccount = bankAccounts.find(acc => acc.id === selectedAccountId);

  const handleAccountChange = (value: string) => {
    setSelectedAccountId(value === "all" ? null : value);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      {/* Left: Title and Subtitle */}
      <div className="flex items-center gap-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Account Selector */}
        <div className="flex items-center gap-2">
          {selectedAccount && (
            <BankLogo bankName={selectedAccount.bank} size="sm" />
          )}
          <Select
            value={selectedAccountId || "all"}
            onValueChange={handleAccountChange}
          >
            <SelectTrigger className="w-[220px] bg-muted/50 border-0">
              <SelectValue placeholder="Todas as contas" />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border shadow-lg z-50">
              <SelectItem value="all">Todas as contas</SelectItem>
              {bankAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  <div className="flex items-center gap-2">
                    <BankLogo bankName={account.bank} size="sm" />
                    <span>{account.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Theme Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          </TooltipContent>
        </Tooltip>

        {/* Notifications */}
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-foreground relative"
                >
                  <Bell className="h-5 w-5" />
                  {hasNotifications && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                      2
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 bg-popover border border-border shadow-lg z-50">
                <div className="p-3 border-b border-border">
                  <h4 className="font-semibold text-sm">Notificações</h4>
                </div>
                <DropdownMenuItem className="p-3 cursor-pointer focus:bg-muted">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">Bem-vindo ao FinanceApp!</p>
                    <p className="text-xs text-muted-foreground">
                      Comece adicionando suas contas bancárias.
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-3 cursor-pointer focus:bg-muted">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">Fatura próxima do vencimento</p>
                    <p className="text-xs text-muted-foreground">
                      Sua fatura vence em 3 dias.
                    </p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipTrigger>
          <TooltipContent>Notificações</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
