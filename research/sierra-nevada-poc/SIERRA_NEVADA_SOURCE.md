# Sierra Nevada ELF Station - Source Investigation

## Informações Científicas e Referências (Via Navegação)
* **Autores Oficiais:** Alfonso Salinas, Jesús Rodríguez-Camacho, Jorge Portí, Maria C. Carrión, Jesús Fornieles-Callejón, Sergio Toledo-Redondo (Department of Electromagnetism, University of Granada).

### Dataset RAW (Dados Brutos Horários)
* **DOI:** `10.5281/zenodo.6348690` (Version DOI: `10.5281/zenodo.6348691`)
* **Repositório:** Zenodo.
* **Arquivo Inspecionado:** `2014.zip`
* **Tamanho do Arquivo:** **26.7 GB** (24.86 GiB)
* **Licença (Metadata JSON-LD):** Creative Commons Attribution 4.0 International (`CC BY 4.0`)
* **Formato Interno:** Arquivos de 1.8 MB (ex: `smplGRTU1_sensor_0_1412010430`), porém agrupados.

### Dataset PROCESSADO (Parâmetros NPZ)
* **DOI:** `10.30827/digibug.71563`
* **Repositório:** Digibug (DSpace da UGR).
* **Arquivo Inspecionado:** `Npz.zip`
* **Tamanho do Arquivo:** **3.333 GB**
* **Licença (Metadata DSpace):** Creative Commons Attribution-NonCommercial-NoDerivs 3.0 License (`CC BY-NC-ND 3.0`)
* **Formato Interno:** Arquivos `.npz` mensais processados.

### Dataset SUPLEMENTAR
* **DOI:** `10.30827/digibug.78098`
* **Repositório:** Digibug (DSpace da UGR).
* **Arquivo Inspecionado:** `Study_of_Anomalies.zip`
* **Tamanho do Arquivo:** **574.4 MB**

## Investigação de Acesso Individual

As diretrizes do projeto ditavam não baixar as dezenas de GB e buscar ativamente amostras individuais (prioridade 1: um RAW de ~1.8 MB; prioridade 2: um NPZ mensal de ~43 MB).

### URLs e Endpoints Investigados
1. **Zenodo API / HTML Download Links (`/records/6348691/files/2014.zip`)**
2. **Digibug DSpace 7 REST API (`/server/api/core/items/...`)**
3. **Digibug OAI-PMH (`/oai/request?verb=GetRecord...`)**
4. **Digibug HTML Scrape (`/handle/10481/71563` e `78098`)**

### Resultados (Se foi possível baixar amostras isoladas)
**Fracasso de Disponibilidade Avulsa.** 

Em ambos os repositórios (Zenodo e Digibug), os pesquisadores e a infraestrutura institucional optaram por agrupar **100% dos dados anuais e mensais dentro de arquivos `.zip` monolíticos**. 
* **Arquivo individual encontrado:** **NENHUM**. Não há mapeamento avulso de bitstreams (arquivos isolados) em nenhuma das três publicações. O Digibug HTML expôs estritamente `<a href="/bitstream/handle/10481/71563/Npz.zip">` como o único recurso atachado ao registro (payload único). O mesmo ocorre no Zenodo.

**Método de acesso tentado:** 
Além das buscas na interface HTML por links menores, tentei acessar as camadas REST e OAI-PMH do Digibug para verificar estruturas internas de metadados de arquivos, porém a arquitetura subjacente DSpace confirma que os datasets foram submetidos pelos autores exclusivamente encapsulados nos ZIPs macro. A tentativa de transferir o ZIP suplementar de 574 MB utilizando `python urllib` obteve queda na rede institucional ("retrieval incomplete: got only 81410 out of 602339037 bytes").

## Conclusão de Engenharia de Dados
O objetivo científico estrito foi alcançado: confirmamos que o artigo possui os repositórios com os dados exatos (sem usar dados simulados ou sísmicos), mapeamos suas descrições internas e suas respectivas licenças (CC BY 4.0 para os RAWs, CC BY-NC-ND para os Processados). 

No entanto, para consumo operacional automatizado na PoC (sem transferir os 26.7 GB ou 3.3 GB inteiros), esgotamos as rotas. A recuperação seletiva é tecnicamente inviável pois não existem *endpoints* que disponibilizem os arquivos horários (RAW) ou mensais (NPZ) fora da respectiva cápsula ZIP, a qual também não pode ser acessada parcialmente devido ao bloqueio da Cloudflare no Zenodo e empacotamento no Digibug.
