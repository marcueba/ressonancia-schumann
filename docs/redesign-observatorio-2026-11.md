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

## Correção das imagens na prévia — 15/11/2026

Pacote local sobre `fd475032a268acc79b9ed7e25b9147e03f500241`, sem commit, push, merge ou deploy.

- A Home passa a incorporar o componente BGS existente, com canais Norte/Leste, antes do painel secundário de Tomsk. O gráfico histórico e a separação entre estações são preservados.
- O endpoint fixo SOS-70 foi observado respondendo HTTP 200 e `Content-Type: text/html; charset=UTF-8`, embora o corpo seja um JPEG JFIF válido de 1540 × 460. Essa incompatibilidade de cabeçalho causava a rejeição da imagem. A exceção é limitada ao endpoint já fixado e ao tipo `text/html`; todos os bytes continuam sujeitos à decodificação JPEG integral e aos limites de tamanho, dimensões, memória e tempo. HTML verdadeiro continua rejeitado. A resposta ao navegador mantém `image/jpeg` e `nosniff`.
- As duas imagens BGS originais foram baixadas da fonte oficial em 16/11/2026 por volta de 00h21 UTC (15/11 à noite em São Paulo). Os títulos dos próprios gráficos identificam **2026-11-14**, respectivamente North/X e East/Y. Não houve recorte, recoloração, inferência de data pelo download ou alteração dos créditos.
- O arquivo local e o manifesto foram atualizados para 14/11. Os hashes anteriormente aprovados continuam no registro de verificação. Imagens futuras desconhecidas permanecem bloqueadas até verificação; esta correção não cria validação diária automática.

| Arquivo original | SHA-256 verificado |
| --- | --- |
| BGS Norte / `currentSpectrogramCH1.jpg` | `a196b588f08ce71a314f89050c0c2df1ceddcf4cc99de2a48babd1fbe0e766f6` |
| BGS Leste / `currentSpectrogramCH2.jpg` | `0982eca5554ca49d2aef3a8bc19352c22dc74690e1be880462b2661253d01ebd` |
| Tomsk / `provider.php?file=shm.jpg` (amostra de diagnóstico, não incluída como fallback) | `18de36d8d841e60726d781062e6b7a9d0f09f214ca2bde801fae9baa48b180c2` |

### Verificação desta correção

- TypeScript aprovado (`npm run lint`), 129 testes aprovados com o runner nativo do Node e build completo aprovado, incluindo 13 pré-renderizações.
- `node scripts/validate-artifact.cjs` aprovado em 28 verificações de rotas estáticas, nos tamanhos 1440 e 390 px. Esse teste não substitui a conferência visual das novas imagens na Home do Mac.
- O JPEG real baixado de Tomsk, com seu cabeçalho incorreto reproduzido no teste, foi decodificado integralmente e devolvido sem alteração dos bytes.
- No servidor Linux isolado, os dois canais BGS responderam HTTP 200, `image/jpeg`, com os novos hashes e período 14/11/2026. O teste ao vivo de Tomsk nessa mesma execução recebeu `upstream_timeout`/HTTP 504; não é evidência de imagem carregada no Mac.
- A aplicação à worktree do Mac e a validação visual desktop/mobile ficam a cargo do Codex local. Não houve alteração do `.env`, Supabase, credenciais, dependências ou lockfile nesta correção.

## Escopo da candidata à publicação

A Visão geral apresenta Dados ELF, Histórico ELF, Atividade solar e Atividade geomagnética em duas colunas no desktop e uma no mobile. Histórico abre com 90 dias e Estações separa as fontes usadas das referências. Tomsk mantém a última imagem validada enquanto consulta uma substituição e usa os mesmos bytes para exibição e ampliação.

As imagens BGS desta versão são as cópias verificadas de 14/11/2026. A aplicação serve os JPEGs por URL com SHA-256 e informa a data observacional e o crédito. A candidata usa somente o arquivo local e mantém publicação de outros materiais sujeita a verificação humana. Os pilotos por pixels e AFQ e a automação BGS seguem na worktree de pesquisa. O Histórico continua em leitura no aplicativo e o adaptador existente mantém a hora estimada separada do timestamp observacional.

Na pré-renderização, a página estática mantém a estrutura e os estados de carregamento. No navegador, os dados são consultados normalmente. A API pública não usa leitura de corpos JSON, por isso a candidata retira esse middleware global sem atualizar dependências.
