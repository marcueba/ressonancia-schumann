with open('server/types.ts', 'r') as f:
    text = f.read()

text = text.replace("  timestamp: string | null;\n  dataSource: string;", "")

with open('server/types.ts', 'w') as f:
    f.write(text)

with open('server/providers/NoaaProvider.ts', 'r') as f:
    text2 = f.read()

# Make sure the assignment to solarData matches what is actually needed
with open('server/providers/NoaaProvider.ts', 'w') as f:
    f.write(text2)

