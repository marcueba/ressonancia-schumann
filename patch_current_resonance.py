import re

with open("src/pages/CurrentResonance.tsx", "r") as f:
    content = f.read()

# Add imports
if "ShareCardModal" not in content:
    content = content.replace(
        "import { SchumannSpectrogramPanel } from '../components/SchumannSpectrogramPanel';",
        "import { SchumannSpectrogramPanel } from '../components/SchumannSpectrogramPanel';\nimport { ShareCardModal } from '../components/ShareCardModal';\nimport { Share2 } from 'lucide-react';"
    )

# Add state
if "isShareModalOpen" not in content:
    content = content.replace(
        "const [loading, setLoading] = useState(true);",
        "const [loading, setLoading] = useState(true);\n  const [isShareModalOpen, setIsShareModalOpen] = useState(false);"
    )

# Replace header
header_original = """      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-wide text-text-main mb-2">Painel Observacional</h1>
        <p className="text-text-muted max-w-3xl leading-relaxed">
          Monitoramento derivado da atividade eletromagnética ELF associada às Ressonâncias de Schumann.
        </p>
      </div>"""

header_new = """      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-light tracking-wide text-text-main mb-2">Painel Observacional</h1>
          <p className="text-text-muted max-w-3xl leading-relaxed">
            Monitoramento derivado da atividade eletromagnética ELF associada às Ressonâncias de Schumann.
          </p>
        </div>
        <button 
          onClick={() => setIsShareModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-surface border border-border hover:border-gold/50 text-gold text-sm font-medium rounded-lg transition-colors uppercase tracking-widest whitespace-nowrap"
        >
          <Share2 className="w-4 h-4" />
          <span>Criar Share Card</span>
        </button>
      </div>"""

content = content.replace(header_original, header_new)

# Add modal at the end
modal_code = """
      <ShareCardModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)}
        data={{
          f1: data?.fundamental?.frequency ?? null,
          f2: data?.mode2?.frequency ?? null,
          f3: data?.mode3?.frequency ?? null,
          intensity: data?.relativeIntensity?.value ?? null,
          timestamp: data?.timestamp ?? null
        }}
      />
    </div>
"""

content = re.sub(r'    </div>\n  \);\n}\n?$', modal_code + '  );\n}\n', content)

with open("src/pages/CurrentResonance.tsx", "w") as f:
    f.write(content)
