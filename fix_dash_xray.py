import re

with open('src/pages/Dashboard.tsx', 'r') as f:
    text = f.read()

dashboard_solar_card = """                  <div className="grid grid-cols-2 gap-4 mb-4 mt-2">
                    <div>
                      <div className="text-[10px] text-text-muted uppercase mb-1">Vento Solar</div>
                      <div className="text-2xl font-light text-text-main">{solar.solarWindSpeed != null ? `${solar.solarWindSpeed}` : '--'} <span className="text-sm text-text-muted">km/s</span></div>
                    </div>
                    <div>
                      <div className="text-[10px] text-text-muted uppercase mb-1">IMF (Bz)</div>
                      <div className="text-2xl font-light text-text-main">{solar.bz != null ? `${solar.bz}` : '--'} <span className="text-sm text-text-muted">nT</span></div>
                    </div>
                  </div>"""

dashboard_solar_replace = """                  <div className="grid grid-cols-3 gap-4 mb-4 mt-2">
                    <div>
                      <div className="text-[10px] text-text-muted uppercase mb-1">Vento Solar</div>
                      <div className="text-2xl font-light text-text-main">{solar.solarWindSpeed != null ? `${solar.solarWindSpeed}` : '--'} <span className="text-[10px] text-text-muted">km/s</span></div>
                    </div>
                    <div>
                      <div className="text-[10px] text-text-muted uppercase mb-1">IMF (Bz)</div>
                      <div className="text-2xl font-light text-text-main">{solar.bz != null ? `${solar.bz}` : '--'} <span className="text-[10px] text-text-muted">nT</span></div>
                    </div>
                    <div>
                      <div className="text-[10px] text-text-muted uppercase mb-1">Raios X</div>
                      <div className="text-2xl font-light text-text-main">{solar.currentXRay?.flareClass || '--'}</div>
                    </div>
                  </div>"""

text = text.replace(dashboard_solar_card, dashboard_solar_replace)

with open('src/pages/Dashboard.tsx', 'w') as f:
    f.write(text)

print("Dashboard updated.")
