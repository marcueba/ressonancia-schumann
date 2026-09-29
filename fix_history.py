import re

with open('src/pages/History.tsx', 'r') as f:
    text = f.read()

# Replace imports
text = re.sub(
    r"import \{[\s\S]*?\} from 'recharts';\n\ntype Range = '24h' \| '7d' \| '30d' \| '90d' \| '1y';\nconst RANGES: \{ value: Range; label: string \}.*?\];",
    "import { SchumannTimelineChart, Range } from '../components/SchumannTimelineChart';",
    text,
    flags=re.DOTALL
)

# Remove formatDate and observedInterval
text = re.sub(r"  const formatDate = \(isoStr.*?return '';\n    }\n  };\n\n", "", text, flags=re.DOTALL)
text = re.sub(r"  const observedInterval = useMemo\(\(\) => \{.*?\}, \[data\]\);\n  \n", "", text, flags=re.DOTALL)


# Replace everything from `return (` until `<div className="grid grid-cols-1 md:grid-cols-2 gap-6">`
# wait, actually the start of return is:
#  return (
#    <div className="space-y-6 animate-in fade-in duration-700">
#      <div className="mb-8">

# We can replace everything inside `<div className="space-y-6 animate-in fade-in duration-700">` 
# up to `<div className="grid grid-cols-1 md:grid-cols-2 gap-6">`

new_return_start = """  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-wide text-text-main mb-2">Histórico</h1>
        <p className="text-text-muted max-w-3xl leading-relaxed">
          Explore o histórico de variações na frequência observada.
        </p>
      </div>

      <SchumannTimelineChart 
        data={data}
        loading={loading}
        error={error}
        range={range}
        onRangeChange={setRange}
        showCoverageStats={true}
      />
      
      {data.length > 0 && !loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">"""

text = re.sub(r'  return \([\s\S]*?<div className="grid grid-cols-1 md:grid-cols-2 gap-6">', new_return_start, text)

# Need to close the curly brace at the end if I opened one with `{data.length > 0 && !loading && !error && (`
# The original code ended with:
#             </Card>
#           </div>
#         </>
#       )}
#     </div>
#   );
# }

text = re.sub(r'        </>\n      \)}\n    </div>', '          </div>\n      )}\n    </div>', text)

with open('src/pages/History.tsx', 'w') as f:
    f.write(text)

print("History updated.")
