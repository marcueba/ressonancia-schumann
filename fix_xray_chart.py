with open('src/components/XRayChart.tsx', 'r') as f:
    text = f.read()

tooltip_search = """    const data = payload[0].payload;
    const flux = data.flux;
    
    // Classify"""

tooltip_replace = """    const data = payload[0].payload;
    const flux = data.flux;
    
    if (flux === null || flux === undefined) return null;
    
    // Classify"""

text = text.replace(tooltip_search, tooltip_replace)

with open('src/components/XRayChart.tsx', 'w') as f:
    f.write(text)

