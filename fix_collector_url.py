import re

with open('server/services/collector.ts', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    '''const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';''',
    '''let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  supabaseUrl = `https://${supabaseUrl}.supabase.co`;
}'''
)

with open('server/services/collector.ts', 'w', encoding='utf-8') as f:
    f.write(code)

with open('server.ts', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    '''const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';''',
    '''let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
      if (supabaseUrl && !supabaseUrl.startsWith('http')) {
        supabaseUrl = `https://${supabaseUrl}.supabase.co`;
      }'''
)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(code)
