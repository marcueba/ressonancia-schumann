import re

with open('src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = re.sub(
    r'\{eri \? eri\.score : \'\-\-\'\} <span className="text-xl text-text-muted">/100<\/span>',
    r'{eri ? eri.score : <span className="text-xl text-text-muted">Não calculado</span>} {eri && <span className="text-xl text-text-muted">/100</span>}',
    code
)

code = code.replace(
    '''{isLoading && !current ? (
              <div className="text-sm text-text-muted">Buscando...</div>
            ) : (!current || current.fundamental.frequency === null) ? (
              <div className="text-sm text-rose-400">Leitura não disponível no momento.</div>
            )''',
    '''{isLoading && !current ? (
              <div className="text-sm text-text-muted">Buscando...</div>
            ) : (!current || current.fundamental.frequency === null) ? (
              <div className="text-sm text-rose-400">Aguardando novos dados...</div>
            )'''
)

code = code.replace(
    '''{isLoading && !geo ? (
               <div className="text-sm text-text-muted">Buscando...</div>
            ) : !geo ? (
               <div className="text-sm text-rose-400">Dados geomagnéticos temporariamente indisponíveis.</div>
            )''',
    '''{isLoading && !geo ? (
               <div className="text-sm text-text-muted">Buscando...</div>
            ) : !geo ? (
               <div className="text-sm text-rose-400">Fonte secundária aguardando conexão.</div>
            )'''
)

code = code.replace(
    '''{isLoading && !solar ? (
               <div className="text-sm text-text-muted">Buscando...</div>
            ) : !solar ? (
               <div className="text-sm text-rose-400">Dados solares temporariamente indisponíveis.</div>
            )''',
    '''{isLoading && !solar ? (
               <div className="text-sm text-text-muted">Buscando...</div>
            ) : !solar ? (
               <div className="text-sm text-rose-400">Fonte secundária aguardando conexão.</div>
            )'''
)

with open('src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

with open('src/pages/Solar.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    '''if (error || !data) {
    return <div className="p-8 text-rose-400">Dados solares temporariamente indisponíveis.</div>;
  }''',
    '''if (error || !data) {
    return <div className="p-8 text-rose-400">Não foi possível carregar o contexto solar neste momento.</div>;
  }'''
)

with open('src/pages/Solar.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

with open('src/pages/Geomagnetic.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    '''if (error || !data) return <div className="p-8 text-center text-rose-400">Dados geomagnéticos temporariamente indisponíveis.</div>;''',
    '''if (error || !data) return <div className="p-8 text-center text-rose-400">Não foi possível carregar os dados geomagnéticos neste momento.</div>;'''
)
code = code.replace(
    '''const timeStr = dateObj ? dateObj.toLocaleTimeString('pt-BR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' }) : '--:--';''',
    '''const timeStr = dateObj ? dateObj.toLocaleTimeString('pt-BR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' }) : 'Hora desconhecida';'''
)

with open('src/pages/Geomagnetic.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

