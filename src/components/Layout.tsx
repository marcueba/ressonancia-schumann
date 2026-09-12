import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { DemoBanner } from './DemoBanner';

export function Layout() {
  return (
    <div className="min-h-screen bg-background text-text-main flex flex-col lg:flex-row">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <DemoBanner />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
          
          <footer className="max-w-7xl mx-auto mt-12 pt-8 pb-4 border-t border-border text-xs text-text-muted text-center lg:text-left">
            <p className="max-w-3xl">
              Os dados apresentados são observações de campos eletromagnéticos naturais. A plataforma não atribui automaticamente efeitos psicológicos, médicos ou espirituais às variações observadas.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
