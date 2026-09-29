import re

with open('server/providers/NoaaProvider.ts', 'r') as f:
    text = f.read()

# Replace getGeomagnetic logic
geo_logic_search = """const data: NoaaKp[] = await response.json();
        
        if (!Array.isArray(data) || data.length === 0) throw new Error('NOAA returned empty dataset');

        const recentItems = data.slice(-8);
        const recentKp = recentItems.map(item => ({
          time: item.time_tag,
          kp: parseFloat(item.Kp)
        }));
        const currentKpObj = data[data.length - 1];
        const currentKp = currentKpObj && currentKpObj.Kp !== undefined ? parseFloat(currentKpObj.Kp) : null;

        if (currentKp === null || isNaN(currentKp)) {
           throw new Error('Valor Kp indisponível na fonte');
        }

        const geoData: GeoData = {
          currentKp,
          recentKp: recentKp.filter(k => !isNaN(k.kp)),
          status: this.getStatusFromKp(currentKp)
        };

        const result = { success: true, data: geoData, timestamp: currentKpObj.time_tag || new Date().toISOString() };
        apiCache.set(cacheKey, result, 300);"""

geo_logic_replace = """const data: NoaaKp[] = await response.json();
        
        if (!Array.isArray(data) || data.length === 0) throw new Error('NOAA returned empty dataset');

        // Extract the last 72 hours (since it's 3-hour data, that's 24 items)
        const recentItems = data.slice(-24);
        
        const history = recentItems.map(item => ({
          time_tag: item.time_tag,
          kp: parseFloat(item.Kp)
        })).filter(k => !isNaN(k.kp));

        const recentKp = history.slice(-8).map(h => ({ time: h.time_tag, kp: h.kp }));

        const currentKpObj = data[data.length - 1];
        const currentKp = currentKpObj && currentKpObj.Kp !== undefined ? parseFloat(currentKpObj.Kp) : null;

        const geoData: GeoData = {
          currentKp,
          recentKp,
          history,
          status: currentKp !== null ? this.getStatusFromKp(currentKp) : 'Indisponível'
        };

        const result = { success: true, data: geoData, timestamp: currentKpObj?.time_tag || new Date().toISOString() };
        apiCache.set(cacheKey, result, 900); // 15 minutos cache para janela de 3h"""

text = text.replace(geo_logic_search, geo_logic_replace)

with open('server/providers/NoaaProvider.ts', 'w') as f:
    f.write(text)

print("Fixed logic.")
