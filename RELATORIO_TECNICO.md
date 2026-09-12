# RELATÓRIO TÉCNICO E DE INTEGRAÇÃO

Este relatório detalha a arquitetura construída na Etapa 2 de migração para dados reais.

## Fontes Conectadas e Validadas
* **NOAA SWPC (Atividade Geomagnética)**
  * **API:** `https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json`
  * **Status:** Totalmente Integrado.
  * **Dados Obtidos:** Índice Kp Planetário.
  * **Formato:** JSON em array bidimensional.

## Fontes Pendentes
Apesar de serem famosas fontes de dados, estas não fornecem APIs REST/JSON simples e abertas. Na arquitetura construída (via `SchumannProviders`), elas foram mapeadas mas configuradas para retornar `"Conexão Pendente"` no modo `LIVE`.

* **Tomsk (SOSRFF)**
  * **Barreira:** Não possui API JSON. A interface russa é gerada com imagens (`.png` / `.gif`) desenhadas via scripts GNUplot/Python.
  * **Solução Futura Requerida:** Um microserviço em Python para fazer Web Scraping, extrair as imagens e usar Visão Computacional (OCR / análise de pixel) para derivar o JSON.
* **BGS (Eskdalemuir)**
  * **Barreira:** A API pública WDC fornece apenas dados geomagnéticos standard, e os dados específicos do espectro ELF (Schumann) estão frequentemente restritos a parceiros de pesquisa.
* **HeartMath (GCI)**
  * **Barreira:** Sem API pública oficial para integração externa não autorizada.

## Dados Disponíveis no Banco e Interfaces (Modelagem)
Foi criado o script `supabase-schema.sql` para preparar o Supabase (Etapa 5). As seguintes entidades estão mapeadas e prontas para uso via REST API própria:
* `stations`
* `data_sources`
* `measurements`
* `schumann_modes`
* `geomagnetic_data`
* `solar_data`
* `eri_scores`

## Licenciamento
* O `DATA_SOURCES.md` foi atualizado registrando os direitos. As tabelas do banco de dados incluem colunas explícitas para `commercial_use` e `requires_attribution`.

## Variáveis de Ambiente Necessárias
As seguintes vars foram configuradas no arquivo `.env.example`:
```env
APP_URL="MY_APP_URL"
DATA_MODE="demo" # ou "live"
SUPABASE_URL="sua-url"
SUPABASE_ANON_KEY="sua-chave"
```

## Como adicionar uma nova estação
1. A arquitetura de interface já está desacoplada.
2. Basta criar um novo provider em `server/providers/`. Exemplo: `CriarNovoProvider.ts`
3. Implementar a interface `NormalizedSchumannData`.
4. Instanciar o Provider e chamá-lo no `server.ts` dentro da rota `/api/current`.

**NOTA SOBRE MODO DEMO E LIVE:**
Ao rodar com `DATA_MODE="live"`, o Geomagnético será real, e o Schumann exibirá falhas propositais indicando a ausência da API na fonte original, cumprindo o critério absoluto de *NÃO FABRICAR OU SIMULAR DADOS NUMA CONEXÃO REAL*.
