import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Receipt, 
  FileText, 
  Bell,
  LogOut,
  Menu,
  X,
  FileSignature,
  Gift,
  UserPlus,
  Rocket,
  Ticket,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo-pcon-grande.png';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Users, label: 'Clientes', path: '/clients' },
  { icon: CreditCard, label: 'Assinaturas', path: '/subscriptions' },
  { icon: Receipt, label: 'Pagamentos', path: '/payments' },
  { icon: FileSignature, label: 'Contratos', path: '/contracts' },
  { icon: FileText, label: 'Notas Fiscais', path: '/invoices' },
  { icon: MessageSquare, label: 'WhatsApp', path: '/whatsapp' },
  { icon: Rocket, label: 'Implantações', path: '/implementations' },
  { icon: Ticket, label: 'Cupons', path: '/coupons' },
  { icon: Gift, label: 'Indicações', path: '/referrals' },
  { icon: UserPlus, label: 'Afiliados', path: '/affiliates' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useAdminNotifications();

  const handleLogout = () => {
    logout();
    toast.success('Logout realizado com sucesso!');
    navigate('/');
  };

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 h-screen w-64 glass-card border-r border-border/50 z-50 transition-transform duration-300 ease-in-out",
        "lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 lg:p-6 border-b border-border/50 flex items-center justify-between">
            <img src={logo} alt="P-CON" className="h-12 lg:h-14 w-auto" />
            <button 
              onClick={onClose}
              className="lg:hidden p-2 rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 lg:p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'nav-item-active' : ''}`
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}
            
            {/* Notifications with badge */}
            <NavLink
              to="/notifications"
              onClick={handleNavClick}
              className={({ isActive }) =>
                `nav-item relative ${isActive ? 'nav-item-active' : ''}`
              }
            >
              <Bell className="w-5 h-5" />
              <span className="font-medium">Notificações</span>
              {unreadCount > 0 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-destructive text-destructive-foreground text-xs font-bold rounded-full animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>
          </nav>

          {/* Footer */}
          <div className="p-3 lg:p-4 border-t border-border/50">
            <button 
              className="nav-item w-full text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

// Mobile Header Component
export const MobileHeader = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const { unreadCount } = useAdminNotifications();
  
  return (
    <header className="fixed top-0 left-0 right-0 h-14 glass-card border-b border-border/50 z-30 lg:hidden flex items-center justify-between px-4">
      <div className="flex items-center">
        <button 
          onClick={onMenuClick}
          className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <img src={logo} alt="P-CON" className="h-8 w-auto ml-3" />
      </div>
      
      {unreadCount > 0 && (
        <NavLink 
          to="/notifications" 
          className="relative p-2 rounded-lg hover:bg-secondary/50 transition-colors"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        </NavLink>
      )}
    </header>
  );
};

export default Sidebar;
