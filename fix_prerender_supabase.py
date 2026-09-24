import re

with open('server.ts', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    '''if (process.env.DATA_MODE === 'live') {''',
    '''if (process.env.DATA_MODE === 'live') {
      if (process.env.PRERENDER === 'true') {
        return res.json([]);
      }'''
)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(code)
