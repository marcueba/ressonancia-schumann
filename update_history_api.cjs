const fs = require('fs');
let text = fs.readFileSync('server.ts', 'utf8');

const searchStr = `    const allowedRanges = ['24h', '7d', '30d', '90d', '1y'];
    const range = req.query.range as string || '24h';
    
    if (!allowedRanges.includes(range)) {
      return res.status(400).json({ error: "Invalid range" });
    }`;

const replaceStr = `    const allowedRanges = ['24h', '7d', '30d', '90d', '1y'];
    const range = req.query.range as string;
    const monthQuery = req.query.month as string; // format YYYY-MM
    
    if (range && !allowedRanges.includes(range)) {
      return res.status(400).json({ error: "Invalid range" });
    }
    
    if (monthQuery && !/^\\d{4}-\\d{2}$/.test(monthQuery)) {
      return res.status(400).json({ error: "Invalid month format. Expected YYYY-MM" });
    }`;

const searchStr2 = `      let msRange = 24 * 3600 * 1000;
      if (range === '7d') msRange = 7 * 24 * 3600 * 1000;
      if (range === '30d') msRange = 30 * 24 * 3600 * 1000;
      if (range === '90d') msRange = 90 * 24 * 3600 * 1000;
      if (range === '1y') msRange = 365 * 24 * 3600 * 1000;
      
      const { data, error } = await supabase
         .from('measurements')
         .select('timestamp, f1_hz, f2_hz, f3_hz, quality, source_type, derived_from_image, processor')
         .gte('timestamp', new Date(Date.now() - msRange).toISOString())
         .order('timestamp', { ascending: true });`;

const replaceStr2 = `      let query = supabase
         .from('measurements')
         .select('timestamp, f1_hz, f2_hz, f3_hz, quality, source_type, derived_from_image, processor')
         .order('timestamp', { ascending: true });

      if (monthQuery) {
        // America/Sao_Paulo is UTC-3. 
        // 2026-09-01T00:00:00-03:00 -> 2026-09-01T03:00:00Z
        const [year, month] = monthQuery.split('-').map(Number);
        
        // Local start of month
        const startDateStr = \`\${year}-\${month.toString().padStart(2, '0')}-01T00:00:00-03:00\`;
        
        // Local start of next month
        let nextYear = year;
        let nextMonth = month + 1;
        if (nextMonth > 12) {
          nextMonth = 1;
          nextYear++;
        }
        const endDateStr = \`\${nextYear}-\${nextMonth.toString().padStart(2, '0')}-01T00:00:00-03:00\`;
        
        query = query.gte('timestamp', new Date(startDateStr).toISOString())
                     .lt('timestamp', new Date(endDateStr).toISOString());
      } else {
        const activeRange = range || '24h';
        let msRange = 24 * 3600 * 1000;
        if (activeRange === '7d') msRange = 7 * 24 * 3600 * 1000;
        if (activeRange === '30d') msRange = 30 * 24 * 3600 * 1000;
        if (activeRange === '90d') msRange = 90 * 24 * 3600 * 1000;
        if (activeRange === '1y') msRange = 365 * 24 * 3600 * 1000;
        query = query.gte('timestamp', new Date(Date.now() - msRange).toISOString());
      }
      
      const { data, error } = await query;`;

text = text.replace(searchStr, replaceStr);
text = text.replace(searchStr2, replaceStr2);

fs.writeFileSync('server.ts', text);
