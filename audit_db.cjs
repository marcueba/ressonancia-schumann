require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl.startsWith('http')) {
  supabaseUrl = `https://${supabaseUrl}.supabase.co`;
}

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('measurements')
    .select('*')
    .eq('station_id', 'tomsk')
    .order('timestamp', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  const n = data.length;
  console.log(`Total de observações: ${n}`);
  if (n === 0) return;

  console.log(`Primeira observação: ${data[0].timestamp}`);
  console.log(`Última observação: ${data[n-1].timestamp}`);

  const days = new Set(data.map(d => d.timestamp.split('T')[0]));
  console.log(`Dias distintos: ${days.size}`);

  let gaps = [];
  let f1 = [], f2 = [], f3 = [];
  
  const last7Days = {};
  
  for (let i = 0; i < n; i++) {
    const d = data[i];
    const date = d.timestamp.split('T')[0];
    if (!last7Days[date]) last7Days[date] = { count: 0, first: d.timestamp, last: d.timestamp };
    last7Days[date].count++;
    last7Days[date].last = d.timestamp;
    
    if (d.f1_hz !== null) f1.push(d.f1_hz);
    if (d.f2_hz !== null) f2.push(d.f2_hz);
    if (d.f3_hz !== null) f3.push(d.f3_hz);
    
    if (i > 0) {
      const prev = new Date(data[i-1].timestamp).getTime();
      const curr = new Date(d.timestamp).getTime();
      const diffMin = Math.round((curr - prev) / (1000 * 60));
      gaps.push(diffMin);
    }
  }

  gaps.sort((a, b) => a - b);
  const medianGap = gaps.length > 0 ? gaps[Math.floor(gaps.length / 2)] : 0;
  
  console.log(`Menor intervalo: ${gaps[0]} min`);
  console.log(`Maior intervalo: ${gaps[gaps.length - 1]} min`);
  console.log(`Intervalo mediano: ${medianGap} min`);
  
  const gaps2h = gaps.filter(g => g > 120).length;
  const gaps6h = gaps.filter(g => g > 360).length;
  const gaps12h = gaps.filter(g => g > 720).length;
  const gaps24h = gaps.filter(g => g > 1440).length;
  
  console.log(`Gaps > 2h: ${gaps2h}`);
  console.log(`Gaps > 6h: ${gaps6h}`);
  console.log(`Gaps > 12h: ${gaps12h}`);
  console.log(`Gaps > 24h: ${gaps24h}`);
  
  console.log('\n--- Últimos 7 dias ---');
  const recentDays = Object.keys(last7Days).sort().slice(-7);
  for (const date of recentDays) {
    console.log(`${date} | N=${last7Days[date].count} | First: ${last7Days[date].first} | Last: ${last7Days[date].last}`);
  }
  
  const asc = (arr) => arr.sort((a,b) => a-b);
  const median = (arr) => arr.length > 0 ? arr[Math.floor(arr.length/2)] : null;
  
  asc(f1); asc(f2); asc(f3);
  
  console.log(`\nF1: min=${f1[0]} med=${median(f1)} max=${f1[f1.length-1]} | Missing: ${n - f1.length}`);
  console.log(`F2: min=${f2[0]} med=${median(f2)} max=${f2[f2.length-1]} | Missing: ${n - f2.length}`);
  console.log(`F3: min=${f3[0]} med=${median(f3)} max=${f3[f3.length-1]} | Missing: ${n - f3.length}`);
}

run();
