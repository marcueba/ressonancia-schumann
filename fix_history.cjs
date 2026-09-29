const fs = require('fs');
let text = fs.readFileSync('src/pages/History.tsx', 'utf8');

const importSearch = "import { SchumannTimelineChart } from '../components/SchumannTimelineChart';";
const importReplace = "import { SchumannTimelineChart } from '../components/SchumannTimelineChart';\nimport { ObservationalCalendar } from '../components/ObservationalCalendar';";
text = text.replace(importSearch, importReplace);

const calendarInjectSearch = "</Card>\n      </div>\n    </div>";
const calendarInjectReplace = "</Card>\n      </div>\n\n      <ObservationalCalendar />\n    </div>";
text = text.replace(calendarInjectSearch, calendarInjectReplace);

fs.writeFileSync('src/pages/History.tsx', text);
