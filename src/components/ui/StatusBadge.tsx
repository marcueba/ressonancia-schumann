import { cn } from '../../utils/cn';

interface StatusBadgeProps {
  status: 'online' | 'atraso' | 'offline' | 'Alta' | 'Média' | 'Baixa' | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  let colorClass = "bg-border text-text-muted";
  let dotClass = "bg-text-muted";

  const s = status.toLowerCase();
  
  if (s === 'online' || s === 'alta' || s === 'calma') {
    colorClass = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    dotClass = "bg-emerald-400";
  } else if (s === 'atraso' || s === 'média' || s === 'instável' || s === 'moderada') {
    colorClass = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    dotClass = "bg-amber-400";
  } else if (s === 'offline' || s === 'baixa' || s === 'ativa' || s === 'elevada' || s === 'tempestade geomagnética') {
    colorClass = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
    dotClass = "bg-rose-400";
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium tracking-wide", colorClass, className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", dotClass)} />
      {status}
    </span>
  );
}
