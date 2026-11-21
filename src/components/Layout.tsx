import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { DemoBanner } from './DemoBanner';

export function Layout() {
  const overview = useLocation().pathname === '/';
  return (
    <div className="min-h-screen bg-background text-text-main flex flex-col lg:flex-row">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        <DemoBanner />
        <main className={`flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 ${overview ? 'lg:p-6' : 'lg:p-8'}`}>
          <div className={`min-w-0 mx-auto ${overview ? 'max-w-[1600px]' : 'max-w-7xl'}`}>
            <Outlet />
          </div>
          
          <footer className={`mx-auto pb-4 border-t border-border text-xs text-text-muted text-center lg:text-left ${overview ? 'max-w-[1600px] mt-6 pt-4' : 'max-w-7xl mt-12 pt-8'}`}>
            <p className="max-w-3xl">
              Os dados apresentados são observações de campos eletromagnéticos naturais. A plataforma não atribui automaticamente efeitos psicológicos, médicos ou espirituais às variações observadas.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
