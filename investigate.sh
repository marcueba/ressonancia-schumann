echo "=== 1. VERIFICAR GIT ==="
git status
git log -5 --oneline
git branch --show-current
git rev-parse HEAD
git ls-remote origin main

echo "\n=== 2. VERIFICAR RENDER ==="
if [ -f "render.yaml" ]; then
    cat render.yaml
else
    echo "No render.yaml found."
fi
# We don't have direct access to Render's dashboard via CLI unless we have an API key, 
# so we will just check local files.

echo "\n=== 3. VERIFICAR DIST LOCAL ==="
echo "Searching for old strings in dist..."
grep -r "Status de Produção" dist/ || echo "Not found"
grep -r "Fonte ELF primária não conectada" dist/ || echo "Not found"
grep -r "\-\- Hz" dist/ || echo "Not found"

echo "Searching for new strings in dist..."
grep -r "Frequência fundamental observada" dist/ || echo "Not found"

echo "\n=== 4. VERIFICAR COMMIT df6704b ==="
git show --stat df6704b
git show --name-only df6704b | grep -E "src/pages/|server.ts|server/services/"

echo "\n=== 5 & 6. VERIFICAR PRODUCAO ==="
curl -s https://ressonanciaschumann.com/ | grep -o "Status de Produção" || echo "Status de Produção not found in prod"
curl -s -I https://ressonanciaschumann.com/ | grep -i -E "x-render|cf-cache"

echo "\nAPI: current Schumann"
curl -s https://ressonanciaschumann.com/api/current | head -n 10
echo "\nAPI: history 24h"
curl -s "https://ressonanciaschumann.com/api/history?range=24h" | head -n 10
echo "\nAPI: history INVALID"
curl -s -I "https://ressonanciaschumann.com/api/history?range=INVALID" | head -n 1
