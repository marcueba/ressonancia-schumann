import re

with open('src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

sungeo_regex = r'<div>\s*<div className="font-bold text-text-main mb-2 tracking-wider">SUNGeo<\/div>.*?<\/div>\s*<\/div>'
code = re.sub(sungeo_regex, '', code, flags=re.DOTALL)

with open('src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
