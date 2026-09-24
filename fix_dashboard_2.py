import re

with open('src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Remove spectrumData initialization
code = re.sub(r'const spectrumData = current \? \[.*?\] : \[\];', '', code, flags=re.DOTALL)

# Remove ScatterChart card entirely
code = re.sub(r'<Card>\s*<CardHeader>\s*<div className="flex items-center gap-2">\s*<Activity className="w-5 h-5 text-text-muted" \/>\s*<CardTitle as="h2">Espectro em Tempo Real.*?<\/Card>', '', code, flags=re.DOTALL)

with open('src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
