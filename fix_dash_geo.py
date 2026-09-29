with open('src/pages/Dashboard.tsx', 'r') as f:
    text = f.read()

# dashboard displays geomagnetic:
# <div className="text-2xl font-light text-text-main">{geo.currentKp}</div>
# let's change to {geo.currentKp !== null ? geo.currentKp.toFixed(2) : '--'}

geo_kp_search = '<div className="text-2xl font-light text-text-main">{geo.currentKp}</div>'
geo_kp_replace = '<div className="text-2xl font-light text-text-main">{geo.currentKp !== null && geo.currentKp !== undefined ? geo.currentKp.toFixed(2) : \'--\'}</div>'

text = text.replace(geo_kp_search, geo_kp_replace)

with open('src/pages/Dashboard.tsx', 'w') as f:
    f.write(text)

