import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Wallet, 
  Tags, 
  ArrowLeftRight, 
  CreditCard,
  LogOut,
  TrendingUp,
  Users,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentMember } from '@/hooks/useOrganization';
import { Button } from '@/components/ui/button';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Wallet, label: 'Contas', path: '/accounts' },
  { icon: Tags, label: 'Categorias', path: '/categories' },
  { icon: ArrowLeftRight, label: 'Transações', path: '/transactions' },
  { icon: CreditCard, label: 'Cartões', path: '/cards' },
  { icon: Users, label: 'Usuários', path: '/users', adminOnly: true },
  { icon: Settings, label: 'Configurações', path: '/settings' },
];

export function Sidebar() {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { data: currentMember } = useCurrentMember();
  
  const isAdmin = currentMember?.role === 'admin';

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary">
            <TrendingUp className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">FinanceApp</h1>
            <p className="text-xs text-sidebar-foreground/60">Controle Financeiro</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {menuItems
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
        </nav>

        {/* User & Logout */}
        <div className="border-t border-sidebar-border px-3 py-4 space-y-2">
          <p className="text-xs text-sidebar-foreground/60 px-3 truncate">{user?.email}</p>
          <Button
            variant="ghost"
            onClick={signOut}
            className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </Button>
        </div>
      </div>
    </aside>
  );
}
