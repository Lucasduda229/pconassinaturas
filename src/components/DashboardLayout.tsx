import { ReactNode, useState } from 'react';
import Sidebar, { MobileHeader } from './Sidebar';
import AnimatedBackground from './AnimatedBackground';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const DashboardLayout = ({ children, title, subtitle }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <AnimatedBackground />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
      
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8">
          <header className="mb-6 lg:mb-8 animate-fade-in">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-sm sm:text-base text-muted-foreground mt-1">{subtitle}</p>
            )}
          </header>
          
          <div className="animate-fade-in stagger-1">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
