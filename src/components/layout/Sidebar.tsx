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
  Settings,
  ChevronLeft,
  ChevronRight,
  FileUp
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
  { icon: FileUp, label: 'Importar Extrato', path: '/import-statement' },
  { icon: Users, label: 'Usuários', path: '/users', adminOnly: true },
  { icon: Settings, label: 'Configurações', path: '/settings' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { data: currentMember } = useCurrentMember();
  
  const isAdmin = currentMember?.role === 'admin';

  return (
    <aside className={cn(
      "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
          {!collapsed ? (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary shrink-0">
                  <TrendingUp className="h-5 w-5 text-sidebar-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-sidebar-foreground">FinanceApp</h1>
                  <p className="text-xs text-sidebar-foreground/60">Controle Financeiro</p>
                </div>
              </div>
              <button
                onClick={onToggle}
                className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              onClick={onToggle}
              className="w-full flex justify-center p-1.5 rounded-md hover:bg-sidebar-accent transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
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
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && item.label}
                </Link>
              );
            })}
        </nav>

        {/* User & Logout */}
        <div className="border-t border-sidebar-border px-3 py-4 space-y-2">
          {!collapsed && (
            <p className="text-xs text-sidebar-foreground/60 px-3 truncate">{user?.email}</p>
          )}
          <Button
            variant="ghost"
            onClick={signOut}
            className={cn(
              "w-full gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              collapsed ? "justify-center px-2" : "justify-start"
            )}
            title={collapsed ? "Sair" : undefined}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && "Sair"}
          </Button>
        </div>
      </div>
    </aside>
  );
}
