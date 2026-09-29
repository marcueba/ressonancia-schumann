import re

with open('src/pages/History.tsx', 'r') as f:
    text = f.read()

# Replace imports
imports_search = """import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

type Range = '24h' | '7d' | '30d' | '90d' | '1y';
const RANGES: { value: Range; label: string }[] = [
  { value: '24h', label: '24 horas' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: '1y', label: '1 ano' },
];"""

imports_replace = """import { SchumannTimelineChart, Range } from '../components/SchumannTimelineChart';"""

text = text.replace(imports_search, imports_replace)


# Remove formatDate and observedInterval, but keep calcStats, stats, hasDerived, qualitySummary
text = re.sub(r"  const formatDate = \(isoStr.*?return '';\n    }\n  };\n", "", text, flags=re.DOTALL)
text = re.sub(r"  const observedInterval = useMemo\(\(\) => \{.*?\}, \[data\]\);\n", "", text, flags=re.DOTALL)

# Replace rendering from return down to `<div className="grid grid-cols-1 md:grid-cols-2 gap-6">`
render_search = r'<div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">.*?</Card>'
render_replace = """<SchumannTimelineChart 
        data={data}
        loading={loading}
        error={error}
        range={range}
        onRangeChange={setRange}
        showCoverageStats={true}
      />"""

# wait, there's `</Card>` then `<div className="grid...`
# let's be careful and use regex correctly.
pattern = r'<div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">.*?</Card>\s*<div className="grid grid-cols-1 md:grid-cols-2 gap-6">'
replacement = """<SchumannTimelineChart 
        data={data}
        loading={loading}
        error={error}
        range={range}
        onRangeChange={setRange}
        showCoverageStats={true}
      />
      
      {data.length > 0 && !loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">"""

text = re.sub(pattern, replacement, text, flags=re.DOTALL)

# and since we opened a `{data.length > 0 && !loading && !error && (` condition, we need to close it where `<>` was
# wait, there's `<>` before the grid in original code!
# Let's see original code:
#      ) : (
#        <>
#          <div className={`grid grid-cols-1 sm:grid-cols-2 ${observedInterval ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4 mb-6`}>
#          ...
#        </>
#      )}

