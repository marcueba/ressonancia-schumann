import re

with open('src/pages/Dashboard.tsx', 'r') as f:
    text = f.read()

# Add imports
imports = """import { useSEO } from '../hooks/useSEO';
import { useEffect, useState } from 'react';
import { dataProvider } from '../data/dataProvider';
import { CurrentResonanceData, EarthResonanceIndex, GeomagneticData, SolarData, HistoricalDataPoint } from '../types';
import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Activity, Radio, Sun, Compass, Globe2 } from 'lucide-react';
import { SchumannTimelineChart, Range } from '../components/SchumannTimelineChart';
"""
text = re.sub(r"import \{ useSEO.*?'lucide-react';", imports, text, flags=re.DOTALL)


# Add states
states_search = "const [solar, setSolar] = useState<SolarData | null>(null);"
states_add = """const [solar, setSolar] = useState<SolarData | null>(null);
  
  const [historyData, setHistoryData] = useState<HistoricalDataPoint[]>([]);
  const [historyRange, setHistoryRange] = useState<Range>('7d');
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(false);"""
text = text.replace(states_search, states_add)


# Add fetch effect for history
effect_search = """    const interval = setInterval(load, 300000); // 5 mins
    return () => clearInterval(interval);
  }, []);"""
effect_add = """    const interval = setInterval(load, 300000); // 5 mins
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setHistoryLoading(true);
    setHistoryError(false);
    dataProvider.getHistoricalData(historyRange)
      .then(res => {
        setHistoryData(res);
        setHistoryLoading(false);
      })
      .catch(err => {
        console.error(err);
        setHistoryError(true);
        setHistoryLoading(false);
      });
  }, [historyRange]);"""
text = text.replace(effect_search, effect_add)


# Render component
chart_render = """
      <div className="mt-8 mb-8">
        <SchumannTimelineChart 
          data={historyData}
          loading={historyLoading}
          error={historyError}
          range={historyRange}
          onRangeChange={setHistoryRange}
          showCoverageStats={false}
        />
      </div>
      
      <div className="space-y-4 mt-8 mb-8">"""

text = text.replace('<div className="space-y-4 mt-8 mb-8">', chart_render)

with open('src/pages/Dashboard.tsx', 'w') as f:
    f.write(text)

print("Dashboard updated.")
