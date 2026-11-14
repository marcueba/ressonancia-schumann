# Redesign do Observatório — novembro de 2026

## Escopo desta entrega

- Alteração visual e de apresentação nas rotas `/` e `/atual`, sem deploy e sem mudança de contratos de API, banco, RLS, coletores ou licenças.
- Hierarquia responsiva **ELF → Atividade solar → Atividade geomagnética**, incluindo a navegação lateral.
- Resumo ELF com dois cartões principais: frequência F1 derivada (F2/F3 como contexto) e amplitude física indisponível (`--`), sem converter cor em pT.
- Retirada do ERI da Home. A rota experimental e o recurso existente são preservados.
- Histórico, espectrogramas de referência, fontes BGS, GOES/NOAA, Kp, artigos e Share Cards preservados.
- Melhor distinção visual entre espectrogramas instrumentais BGS e estimativas da fonte secundária Tomsk.
- A consulta Schumann não bloqueia a exibição do painel independente BGS em `/atual`.

## Novas informações fornecidas pelo BGS

Em resposta ao responsável pelo projeto, o BGS confirmou que:

1. Podemos apresentar PNGs ou JPEGs, mantendo as condições de atribuição e uso não comercial já informadas; monetização ou uso comercial das imagens exigem autorização específica.
2. Em sua rotina normal, os dados do dia anterior são coletados às 10h UTC, e as imagens costumam ser atualizadas por volta de 10h15 UTC (7h15 de Brasília). **Isso não prova o período representado por uma imagem específica.**
3. A instrumentação de 2025 operou em 01/01–14/05 e 03/10–31/12, com interrupção de 15/05–02/10 após falha na fiação. Não interpolar esse intervalo.
4. O depósito de 2025 contém 220 arquivos segundo a equipe. Os dois intervalos de datas somam 224 dias civis; confirmar quais dias/arquivos explicam a diferença antes de falar em cobertura integral.
5. A operação é de melhor esforço, não um serviço com SLA de atualização. Não apresentar espectrogramas como tempo real.

A interface apresenta apenas o calendário geral e a lacuna de 2025. Ela continua condicionando a publicação de novas imagens a verificação de data, conteúdo, hash e atribuição; não houve ativação de atualização automática de materiais desconhecidos.

## Verificação técnica

- `npm run lint`
- `node --import tsx --test tests/*.test.ts` (alternativa ao CLI `tsx`, que apresentou restrição de pipe no ambiente local)
- `npm run build` (inclui pré-renderização)
- `node scripts/validate-artifact.cjs`
- Conferência visual em 1440 px e 390 px, sem transbordamento horizontal

## Próximos portões

1. Revisão e aprovação visual pelo responsável, incluindo os estados em que as APIs estão indisponíveis.
2. CI Linux remoto no SHA final da branch de redesign, depois revisão de diffs.
3. Esclarecimento BGS sobre os 220 arquivos contra 224 datas possíveis, e verificação das datas efetivas de cada artefato.
4. Avaliação separada da estratégia de dados BGS diários e de histórico bruto 128 Hz, com testes de procedência, autorização, retenção e cronograma. Não integrá-los a F1–F3 sem processamento e validação instrumentais.
5. Publicação controlada somente após os portões anteriores; não há autorização para alterar Supabase/RLS ou coletores nesta entrega.
