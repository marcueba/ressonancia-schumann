import { AlertTriangle, Activity } from 'lucide-react';
import { useEffect, useState } from 'react';
import { dataProvider } from '../data/dataProvider';

export function DemoBanner() {
  const [mode, setMode] = useState<string>('demo');

  useEffect(() => {
    dataProvider.getConfig().then(c => setMode(c.mode)).catch(console.error);
  }, []);

  return (
    <div className="bg-amber-900/20 border-b border-amber-800/40 text-amber-500/90 px-4 py-2 flex items-center justify-center text-xs sm:text-sm font-medium tracking-wide">
      <AlertTriangle className="w-4 h-4 mr-2" />
      Status de Produção: As medições eletromagnéticas ELF primárias ainda não estão conectadas.
    </div>
  );
}
