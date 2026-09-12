# Fontes de Dados (Data Sources) - AUDITORIA

Este documento mapeia as fontes de dados analisadas para a plataforma, estabelecendo limites técnicos e direitos de uso.

## 1. Monitoramento Eletromagnético (Ressonância de Schumann)

### 1.1 Sistema de Observação Espacial de Tomsk (Rússia)
* **URL:** http://sosrff.tsu.ru/
* **API Pública:** NÃO. Apenas imagens geradas estaticamente.
* **Endpoint:** N/A.
* **Necessidade de Autenticação:** N/A.
* **Licença:** Educacional / Acadêmica.
* **Uso Comercial Permitido:** USO COMERCIAL NÃO VERIFICADO (Provavelmente restrito).
* **Atribuição:** Necessária.
* **Status:** Conexão pendente (Requer desenvolvimento de scraper customizado).

### 1.2 British Geological Survey (BGS) - Eskdalemuir
* **URL:** https://geomag.bgs.ac.uk/
* **API Pública:** Sim (para dados geomagnéticos), NÃO (para bandas ELF/Schumann).
* **Endpoint:** N/A para Schumann em tempo real.
* **Licença:** Open Government Licence (OGL).
* **Uso Comercial Permitido:** Sim.
* **Atribuição:** Necessária.
* **Status:** Conexão pendente (Dados não disponíveis publicamente via API JSON).

### 1.3 Observatórios Independentes (Cumiana, ETNA, SunGeo)
* **API Pública:** NÃO possuem APIs REST JSON públicas. Dados geralmente compartilhados via arquivos diretos ou gráficos.
* **Uso Comercial Permitido:** USO COMERCIAL NÃO VERIFICADO.
* **Status:** Conexão pendente.

### 1.4 HeartMath Institute (GCI)
* **URL:** https://www.heartmath.org/gci/
* **API Pública:** Fechada / Proprietária. 
* **Uso Comercial Permitido:** USO COMERCIAL NÃO VERIFICADO.
* **Status:** Conexão pendente.

## 2. Atividade Geomagnética e Solar (NOAA SWPC)

### 2.1 NOAA Space Weather Prediction Center (SWPC)
* **URL:** https://www.swpc.noaa.gov/
* **API Pública:** SIM. JSON endpoints.
* **Endpoint Geomagnético:** `https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json`
* **Limites:** Caching recomendado, sem limite estrito bloqueante publico.
* **Licença:** Domínio Público (Governo dos EUA).
* **Uso Comercial Permitido:** Sim.
* **Atribuição:** Recomendada/Necessária.
* **Status:** CONECTADO.
