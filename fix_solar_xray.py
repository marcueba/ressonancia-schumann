import re

with open('src/pages/Solar.tsx', 'r') as f:
    text = f.read()

import_search = "import { Card } from '../components/ui/Card';"
import_replace = "import { Card } from '../components/ui/Card';\nimport { XRayChart } from '../components/XRayChart';"
text = text.replace(import_search, import_replace)

goes_section = """
      <div className="mt-12 mb-6">
        <h2 className="text-xl font-medium tracking-wide text-text-main border-b border-border pb-2">RAIOS X SOLARES — GOES</h2>
        <p className="text-sm text-text-muted mt-3 mb-6">
          O fluxo de raios X medido pelos satélites GOES é utilizado para monitorar a atividade solar e classificar flares nas classes A, B, C, M e X. 
          <br /><br />
          <strong>Nota:</strong> Os dados solares são apresentados como contexto heliogeofísico e não constituem medições da Ressonância Schumann.
        </p>

        {data.currentXRay && (
          <Card className="flex flex-col items-center justify-center py-6 px-4 text-center mb-8 max-w-sm mx-auto border-primary/20">
            <div className="text-xs tracking-widest text-text-muted uppercase mb-2">Classe Atual</div>
            <div className="text-4xl font-light text-primary mb-1">{data.currentXRay.flareClass}</div>
            <p className="text-sm text-text-muted mt-2">
              Fluxo: {data.currentXRay.flux.toExponential(2)} W/m²
            </p>
            <p className="text-[10px] text-text-muted mt-2 border-t border-border/50 pt-2 w-full">
              Satélite: GOES-{data.currentXRay.satellite} ({data.currentXRay.energy})<br/>
              Atualizado: {new Date(data.currentXRay.timestamp).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}
            </p>
          </Card>
        )}

        <div className="bg-surface border border-border/50 rounded-lg p-4">
          <div className="text-xs tracking-widest text-text-muted uppercase mb-4 text-center">Fluxo de Raios X (24 Horas)</div>
          <XRayChart data={data.xrayHistory || []} />
        </div>
      </div>
"""

# Insert right after the VENTO SOLAR section
text = re.sub(
    r'(<div className="mt-12 mb-6">.*?</Card>\s*</div>\s*</div>)',
    r'\1\n' + goes_section,
    text,
    flags=re.DOTALL
)

with open('src/pages/Solar.tsx', 'w') as f:
    f.write(text)

print("Solar.tsx updated with GOES section.")
