import { useSEO } from '../hooks/useSEO';

export function NotFound() {
  useSEO({
    title: "Página não encontrada | Observatório da Terra",
    description: "A página solicitada não foi encontrada no Observatório da Terra.",
    noindex: true
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700 py-16 text-center flex flex-col items-center justify-center">
      <div className="max-w-xl">
        <span className="text-xs uppercase tracking-widest text-text-muted font-medium px-3 py-1 bg-surface border border-border rounded-full">
          Erro 404
        </span>
        <h1 className="text-3xl md:text-4xl font-light tracking-wide text-text-main mt-4 mb-3">
          Página não encontrada
        </h1>
        <p className="text-text-muted leading-relaxed mb-8">
          O endereço solicitado não existe ou não está mais disponível no Observatório da Terra.
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-primary text-background hover:bg-primary/90 transition-colors"
        >
          Voltar ao Observatório
        </a>
      </div>
    </div>
  );
}
