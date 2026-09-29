const fs = require('fs');

let xray = fs.readFileSync('src/components/XRayChart.tsx', 'utf8');
xray = xray.replace(/const CustomTooltip = \(\{ active, payload \}: any\) => \{/, 'const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: XRayDataPoint }[] }) => {');
fs.writeFileSync('src/components/XRayChart.tsx', xray);

let kp = fs.readFileSync('src/components/KpChart.tsx', 'utf8');
kp = kp.replace(/const CustomTooltip = \(\{ active, payload \}: any\) => \{/, 'const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: KpDataPoint }[] }) => {');
fs.writeFileSync('src/components/KpChart.tsx', kp);
