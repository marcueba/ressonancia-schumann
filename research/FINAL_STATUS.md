# Status Final do Observatório Schumann (Fase de Pesquisa)

## 1. Arquitetura Final
O observatório está estruturado com um backend **Express** e um frontend **React (Vite)**, operando sob uma camada rigorosa de metadados de proveniência (`source_type`, `processing_method`, `is_demo`, etc.). A arquitetura está 100% pronta para plugar fontes de dados ELF em tempo real, sem corromper as tipagens de exibição ou confundir a metodologia.

## 2. Status do Modo Demo
* **DATA_MODE:** Mantido rigidamente como `demo` (`is_demo: true`).
* **Visual:** Banners globais em tom de alerta (`amber-400`) reforçam categoricamente que os dados exibidos são ilustrativos. O gerador local cria flutuações aleatórias (Random Walk) apenas para preencher o espectro da UI. 
* **Transparência:** Nenhuma fonte simulada é apresentada falsamente como Hz reais da Terra. O dashboard isola as variáveis reais (NOAA, SunGeo) dos *Mocks*.

## 3. Fontes Efetivamente Utilizadas (Agregadas/Contextuais)
* **NOAA SWPC:** Fornece o Kp geomagnético e o fluxo solar (dados vivos e reais).
* **SunGeo:** Integrada corretamente. **Ressalva cumprida:** É classificada abertamente na interface como *Fonte agregada/contextual* e não emite frequências em Hz, mas sim o seu "SunGeo Score".

## 4. Fontes Investigadas e Descartadas para a PoC
* **BGS Eskdalemuir (HHZ Sísmico):** Provamos através de script local que os picos 7.13 Hz e 26.25 Hz eram estáticos (desvio padrão 0.00). São ruídos mecânicos/antropogênicos e **não capturam a Ressonância de Schumann**. Fonte descartada para o espectro eletromagnético. A fonte BGS de Indução Eletromagnética real exige login corporativo do NERC (fechada para bots).
* **Sierra Nevada ELF Station (Zenodo 6348690 / Digibug 71563):** Base excepcional com dados RAW em CC BY 4.0. No entanto, descartada para extração imediata e granular, pois os autores agruparam todos os dados em arquivos `.zip` massivos de 3,3 GB a 26,7 GB.

## 5. Limitações Científicas e de Acesso (Barreiras Encontradas)
* **WAF / Cloudflare:** Repositórios como o Zenodo bloqueiam tentativas de HTTP Range Requests automatizados vindas de data centers em nuvem (Error 403), inutilizando soluções cirúrgicas sem o download dos 26.7 GB.
* **Agrupamento Monolítico:** A academia científica não tem o hábito de expor APIs fragmentadas de séries temporais; publicam os dados agregados anualmente, o que sobrecarrega qualquer motor serverless ou observatório real-time sem um *Data Lake* intermediário.

## 6. Rotas da API (Verificadas e Corrigidas)
* `/api/current`: Retorna o array de modos preenchido pelo gerador Mock ou provedor offline, injetando os metadados corretos.
* `/api/history`: Funcional, emitindo série de dados retrospectivos de 24h.
* `/api/stations` e `/api/stations/:id`: Funcionais, exibindo os status "Alta, Média, Baixa, Demo, Offline".
* `/api/geomagnetic` e `/api/solar`: Injetam dados reais das fontes contextuais.
* `/api/eri`: Emitindo o cálculo semântico experimental mesclando Kp e distorções simuladas.

## 7. Tabelas Supabase
O Schema relacional está consolidado (`stations`, `data_sources`, `measurements`, `schumann_modes`, `geomagnetic_data`, `solar_data`, `eri_scores`). O endpoint de teste `/api/test-db` validou as rotinas de Inserção, Leitura e Deleção com sucesso. Nenhum registro demo foi persistido para sujar as tabelas definitivas.

## 8. Próximos Passos
O único próximo passo necessário para transformar o *Modo Demo* num observatório real é a **Arquitetura de Ingestão de Fundo (Background Ingestion)**. Em vez de a API Express buscar e processar dados "sob demanda", será necessário configurar uma infraestrutura (ex: `cron` rodando em máquina virtual, AWS S3, ou bucket local) que baixe periodicamente os ZIPs pesados da Sierra Nevada ou Tomsk, descompacte-os silenciosamente, e alimente o banco do Supabase, que então servirá a API atual de forma nativa e enxuta.
