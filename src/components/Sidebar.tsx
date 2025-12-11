import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Receipt, 
  FileText, 
  Bell,
  Settings,
  LogOut
} from 'lucide-react';
import logo from '@/assets/logo-pcon.png';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Users, label: 'Clientes', path: '/clients' },
  { icon: CreditCard, label: 'Assinaturas', path: '/subscriptions' },
  { icon: Receipt, label: 'Pagamentos', path: '/payments' },
  { icon: FileText, label: 'Notas Fiscais', path: '/invoices' },
  { icon: Bell, label: 'Notificações', path: '/notifications' },
];

const Sidebar = () => {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 glass-card border-r border-border/50 z-50">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <img src={logo} alt="P-CON" className="h-10 w-auto" />
            <div>
              <h1 className="font-heading font-bold text-lg text-foreground">P-CON</h1>
              <p className="text-xs text-muted-foreground">Assinaturas</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'nav-item-active' : ''}`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border/50 space-y-1">
          <NavLink to="/settings" className="nav-item">
            <Settings className="w-5 h-5" />
            <span className="font-medium">Configurações</span>
          </NavLink>
          <button 
            className="nav-item w-full text-destructive hover:bg-destructive/10"
            onClick={() => window.location.href = '/'}
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
