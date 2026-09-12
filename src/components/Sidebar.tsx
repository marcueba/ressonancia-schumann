import { NavLink } from 'react-router-dom';
import { 
  Activity, 
  BarChart3, 
  Globe2, 
  Sun, 
  Compass, 
  Database,
  Menu,
  X,
  Radio
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '../utils/cn';

const navItems = [
  { path: '/', label: 'Dashboard', icon: Activity },
  { path: '/atual', label: 'Ressonância Atual', icon: Radio },
  { path: '/historico', label: 'Histórico', icon: BarChart3 },
  { path: '/estacoes', label: 'Estações', icon: Globe2 },
  { path: '/indice', label: 'Índice da Terra (ERI)', icon: Activity },
  { path: '/geomagnetica', label: 'Ativ. Geomagnética', icon: Compass },
  { path: '/solar', label: 'Atividade Solar', icon: Sun },
  { path: '/metodologia', label: 'Metodologia', icon: Database },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-surface border-b border-border sticky top-0 z-40">
        <div className="flex items-center gap-2 font-semibold text-text-main tracking-wider">
          <Globe2 className="w-5 h-5 text-primary" />
          RESSONÂNCIA SCHUMANN
        </div>
        <button onClick={toggleSidebar} className="text-text-muted hover:text-text-main">
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden" 
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar Content */}
      <aside className={cn(
        "fixed lg:sticky top-0 left-0 h-screen w-64 bg-surface border-r border-border flex flex-col transition-transform duration-300 ease-in-out z-50",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-6 hidden lg:flex items-center gap-3 border-b border-border">
          <Globe2 className="w-6 h-6 text-primary" />
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-widest text-text-main leading-tight">RESSONÂNCIA</span>
            <span className="font-light text-xs tracking-[0.2em] text-text-muted">SCHUMANN</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeSidebar}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-text-muted hover:bg-surface-hover hover:text-text-main"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="text-[10px] text-text-muted uppercase tracking-widest text-center">
            Observatório Digital
          </div>
        </div>
      </aside>
    </>
  );
}
