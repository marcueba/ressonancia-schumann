import re

with open('src/pages/Geomagnetic.tsx', 'r') as f:
    text = f.read()

import_search = "import { Card } from '../components/ui/Card';"
import_replace = "import { Card } from '../components/ui/Card';\nimport { KpChart } from '../components/KpChart';"
text = text.replace(import_search, import_replace)

geo_status_search = """              <div className="text-4xl font-light text-primary mb-1">{data.currentKp}</div>
              <p className="text-sm text-text-muted mt-2">{data.status}</p>"""

geo_status_replace = """              <div className="text-4xl font-light text-primary mb-1">
                {data.currentKp !== null ? data.currentKp.toFixed(2) : '--'}
              </div>
              <p className="text-sm text-text-muted mt-2">
                {data.status}
                {data.currentKp !== null && data.currentKp >= 5 && (
                  <span className="ml-2 font-semibold text-red-500">
                    (G{Math.floor(data.currentKp) - 4})
                  </span>
                )}
              </p>
              {data.timestamp && (
                <p className="text-[10px] text-text-muted mt-4 border-t border-border/50 pt-2 w-full text-center">
                  Atualizado: {new Date(data.timestamp).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}"""
text = text.replace(geo_status_search, geo_status_replace)

chart_section = """
      <div className="mt-12 mb-6">
        <h2 className="text-xl font-medium tracking-wide text-text-main border-b border-border pb-2">HISTÓRICO KP (ÚLTIMAS 72 HORAS)</h2>
        <p className="text-sm text-text-muted mt-3 mb-6">
          O índice planetário Kp representa a atividade geomagnética global em uma escala de 0 a 9. Valores a partir de 5 são classificados pela escala G da NOAA (G1 a G5) como tempestades geomagnéticas.
          <br /><br />
          <strong>Nota:</strong> Os dados geomagnéticos são apresentados como contexto. Coincidência temporal com alterações nas observações Schumann não implica, por si só, relação causal.
        </p>

        <div className="bg-surface border border-border/50 rounded-lg p-4">
          <KpChart data={data.history || []} />
        </div>
      </div>
"""

text = re.sub(
    r'(<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">.*?</Card>\s*</div>)',
    r'\1\n' + chart_section,
    text,
    flags=re.DOTALL
)

with open('src/pages/Geomagnetic.tsx', 'w') as f:
    f.write(text)

