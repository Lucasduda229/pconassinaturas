import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import AnimatedBackground from './AnimatedBackground';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const DashboardLayout = ({ children, title, subtitle }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen">
      <AnimatedBackground />
      <Sidebar />
      
      <main className="ml-64 p-8">
        <header className="mb-8 animate-fade-in">
          <h1 className="font-heading text-3xl font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-muted-foreground mt-1">{subtitle}</p>
          )}
        </header>
        
        <div className="animate-fade-in stagger-1">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
