export function ERI() {
  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-wide text-text-main mb-2">Earth Resonance Index (ERI)</h1>
        <p className="text-text-muted max-w-3xl leading-relaxed">
          O ERI é um indicador experimental em fase de demonstração. Ele busca correlacionar a atividade geomagnética (Kp) e a distorção do espectro ELF. <strong>Não é uma métrica acadêmica consolidada.</strong>
        </p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-8 flex flex-col items-center justify-center text-center py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gold-muted blur-[100px] rounded-full opacity-20 pointer-events-none" />
        
        <div className="text-[120px] font-light leading-none text-gold tracking-tighter mb-4">
          67<span className="text-4xl text-text-muted">/100</span>
        </div>
        
        <div className="text-2xl font-light text-text-main tracking-widest uppercase mb-12">
          Atividade Moderada
        </div>

        <div className="w-full max-w-2xl">
          <div className="flex justify-between text-xs text-text-muted mb-2 tracking-widest uppercase">
            <span>Muito Baixa (0)</span>
            <span>Muito Elevada (100)</span>
          </div>
          <div className="h-2 w-full bg-background rounded-full overflow-hidden flex">
            <div className="h-full bg-border w-[20%]" />
            <div className="h-full bg-border w-[20%]" />
            <div className="h-full bg-gold w-[20%]" />
            <div className="h-full bg-border w-[20%]" />
            <div className="h-full bg-border w-[20%]" />
          </div>
          <div className="flex justify-between text-xs text-text-muted mt-2">
            <span className="w-1/5 text-center">0-20</span>
            <span className="w-1/5 text-center">21-40</span>
            <span className="w-1/5 text-center text-gold">41-60</span>
            <span className="w-1/5 text-center">61-80</span>
            <span className="w-1/5 text-center">81-100</span>
          </div>
        </div>
      </div>
    </div>
  );
}
