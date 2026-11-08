import { NavLink } from 'react-router-dom';
import { 
  Activity,
  BookOpen, 
  BarChart3, 
  Globe2, 
  Sun, 
  Compass, 
  Database,
  Menu,
  X,
  Radio
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
  { path: '/artigos', label: 'Artigos', icon: BookOpen },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => {
    setIsOpen(false);
    menuButtonRef.current?.focus();
  };

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();
    const navigate = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSidebar();
      if (event.key !== 'Tab' || window.matchMedia('(min-width: 64rem)').matches) return;
      const controls = sidebarRef.current?.querySelectorAll<HTMLElement>('button, a[href]');
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };
    window.addEventListener('keydown', navigate);
    return () => window.removeEventListener('keydown', navigate);
  }, [isOpen]);

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden min-w-0 flex items-center justify-between gap-3 p-4 bg-surface border-b border-border sticky top-0 z-40">
        <div className="min-w-0 flex items-center gap-2 font-semibold text-text-main tracking-wider">
          <Globe2 className="w-5 h-5 shrink-0 text-primary" />
          <span className="min-w-0 break-words">RESSONÂNCIA SCHUMANN</span>
        </div>
        <button ref={menuButtonRef} onClick={toggleSidebar} aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={isOpen} aria-controls="primary-navigation" className="min-h-10 min-w-10 shrink-0 flex items-center justify-center rounded-md text-text-muted hover:text-text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
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
      <aside ref={sidebarRef} className={cn(
        "fixed lg:sticky top-0 left-0 h-screen w-64 max-w-full bg-surface border-r border-border flex flex-col transition-transform duration-300 ease-in-out z-50",
        isOpen ? "visible translate-x-0" : "invisible -translate-x-full lg:visible lg:translate-x-0"
      )}>
        <div className="flex justify-end p-3 lg:hidden">
          <button ref={closeButtonRef} onClick={closeSidebar} aria-label="Fechar menu" className="min-h-10 min-w-10 flex items-center justify-center rounded-md text-text-muted hover:text-text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 hidden lg:flex items-center gap-3 border-b border-border">
          <Globe2 className="w-6 h-6 text-primary" />
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-widest text-text-main leading-tight">RESSONÂNCIA</span>
            <span className="font-light text-xs tracking-[0.2em] text-text-muted">SCHUMANN</span>
          </div>
        </div>

        <nav id="primary-navigation" aria-label="Menu principal" className="flex-1 min-w-0 overflow-y-auto py-6 px-3 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeSidebar}
              className={({ isActive }) => cn(
                "min-w-0 flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-text-muted hover:bg-surface-hover hover:text-text-main"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="min-w-0 break-words">{item.label}</span>
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
