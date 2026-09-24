import re
import json

def fix_dashboard():
    with open('src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
        code = f.read()
    
    # Remove "--" from Schumann
    code = re.sub(
        r'\{current\.fundamental\.frequency\?\.toFixed\(2\) \?\? \'\-\-\'\}',
        r'{current.fundamental.frequency.toFixed(2)}',
        code
    )
    code = re.sub(
        r'<div className="text-sm font-medium">\{current\.fundamental\.quality \|\| \'\-\-\'\}<\/div>',
        r'{current.fundamental.quality && <div className="text-sm font-medium">{current.fundamental.quality}</div>}',
        code
    )
    code = re.sub(
        r'<div className="text-3xl font-light text-text-main mb-1">Kp \{geo\.currentKp \?\? \'\-\-\'\}<\/div>',
        r'<div className="text-3xl font-light text-text-main mb-1">Kp {geo.currentKp}</div>',
        code
    )
    code = re.sub(
        r'<div className="text-3xl font-light text-text-main mb-1">Fluxo \{solar\.solarFlux \?\? \'\-\-\'\}<\/div>',
        r'<div className="text-3xl font-light text-text-main mb-1">Fluxo {solar.solarFlux}</div>',
        code
    )
    code = code.replace(
        "geo.dataSource || '--'", "geo.dataSource"
    ).replace(
        "solar.dataSource || '--'", "solar.dataSource"
    )

    with open('src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
        f.write(code)


def fix_solar():
    with open('src/pages/Solar.tsx', 'r', encoding='utf-8') as f:
        code = f.read()

    # Solar Flux
    code = code.replace("{data.solarFlux != null ? `${data.solarFlux} sfu` : 'Não disponível'}", "{data.solarFlux != null && `${data.solarFlux} sfu`}")
    
    # Active Regions
    code = re.sub(
        r'<div className="text-3xl md:text-5xl font-light text-text-main mb-4">\{data\.sunspots != null \? data\.sunspots : \'Não disponível\'\}<\/div>',
        r'<div className="text-3xl md:text-5xl font-light text-text-main mb-4">{data.sunspots != null ? data.sunspots : <span className="text-xl text-rose-400">Dados ausentes na fonte</span>}</div>',
        code
    )
    
    # Flares
    code = re.sub(
        r'<div className="text-3xl md:text-4xl font-light text-primary mb-4">\{data\.flares \|\| \'Não disponível\'\}<\/div>',
        r'<div className="text-3xl md:text-4xl font-light text-primary mb-4">{data.flares || <span className="text-xl text-rose-400">Dados ausentes na fonte</span>}</div>',
        code
    )

    with open('src/pages/Solar.tsx', 'w', encoding='utf-8') as f:
        f.write(code)


def fix_stations():
    with open('src/pages/Stations.tsx', 'r', encoding='utf-8') as f:
        code = f.read()

    # Update Sierra Nevada and others
    code = code.replace('name: "Sierra Nevada",\n      country: "EUA",', 'name: "Sierra Nevada",\n      country: "Espanha",')
    code = code.replace('latitude: 39.0,\n      longitude: -120.0,', '')
    code = code.replace('latitude: 37.1232,\n      longitude: -122.1234,', '')
    code = code.replace('latitude: 44.9791,\n      longitude: 7.3787,', '') # Cumiana
    code = code.replace('latitude: 56.4977,\n      longitude: 84.9744,', 'latitude: 56.4977,\n      longitude: 84.9744,') # Tomsk - keeping assuming correct for now, but to be safe we will make UI conditional

    # Make UI conditional for coordinates
    ui_coords = r'''<div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Latitude</div>
                  <div className="text-sm font-medium">{station.latitude.toFixed(4)}°</div>
                </div>
                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Longitude</div>
                  <div className="text-sm font-medium">{station.longitude.toFixed(4)}°</div>
                </div>
              </div>'''
    ui_coords_new = r'''{station.latitude !== undefined && station.longitude !== undefined && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Latitude</div>
                  <div className="text-sm font-medium">{station.latitude.toFixed(4)}°</div>
                </div>
                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Longitude</div>
                  <div className="text-sm font-medium">{station.longitude.toFixed(4)}°</div>
                </div>
              </div>
              )}'''
    
    code = code.replace(ui_coords, ui_coords_new)

    with open('src/pages/Stations.tsx', 'w', encoding='utf-8') as f:
        f.write(code)


def fix_history():
    with open('src/pages/History.tsx', 'r', encoding='utf-8') as f:
        code = f.read()
    
    code = code.replace(
        "As observações da nova fonte estão sendo armazenadas. O gráfico aparecerá assim que houver dados suficientes.",
        "O histórico será exibido à medida que novas observações forem registradas."
    )
    with open('src/pages/History.tsx', 'w', encoding='utf-8') as f:
        f.write(code)

if __name__ == "__main__":
    fix_dashboard()
    fix_solar()
    fix_stations()
    fix_history()
