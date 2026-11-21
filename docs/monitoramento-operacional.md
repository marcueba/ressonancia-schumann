# Monitoramento operacional do SCHUMANN

A candidata parte do commit de produção `1a768a6e60bbb6ce3c65bdb41fac88a717d4020e`, deploy `dep-dc105n6417fc73b279og`. O pacote inclui um endpoint de saúde e um executor de uma rodada, recuperados do protótipo testado em 21/11/2026. O workflow existente valida a candidata no PR. A agenda, os serviços externos e os canais de alerta dependem de aprovação posterior.

## Saúde HTTP

`GET /healthz` responde `200`, `Content-Type: application/json; charset=utf-8`, `Cache-Control: no-store` e `{"status":"ok"}`. `HEAD` mantém status e cabeçalhos, com corpo vazio. A rota termina antes do caminho das APIs científicas e do fallback HTML. O teste do bundle bloqueia `fetch` no processo e comprova GET e HEAD no servidor compilado.

Após publicação autorizada, verificar os dois métodos no domínio e registrar a configuração atual do serviço. No Render, definir **Health Check Path** como `/healthz` em uma ação separada. Essa sonda mede a capacidade de responder por HTTP. Uma fonte científica degradada, um arquivo antigo ou a indisponibilidade de armazenamento não devem retirar a instância da rotação. O Render considera 2xx ou 3xx em até cinco segundos como sucesso. [Health Checks do Render](https://render.com/docs/health-checks)

## Disponibilidade externa

A primeira opção é uma sonda de palavra-chave do UptimeRobot Free na [Home](https://ressonanciaschumann.com/), com a expressão **Visão geral**, a cada cinco minutos. Ela roda fora do Render, do GitHub Actions e do Mac. Registre eventos e latência no painel. Um problema observado por um único cliente de DNS, TLS ou rede merece confirmação. Configure o monitor sem contatos nem integrações de notificações durante o piloto. O serviço aplica sua própria regra de reconfirmação. O plano gratuito tem restrições de alertas avançados e a conta pode ser desativada após seis meses sem login. [Plano gratuito](https://uptimerobot.com/pricing/) · [Canais de notificação](https://help.uptimerobot.com/en/articles/11360978-understanding-notification-channels-in-uptimerobot) · [Política de inatividade](https://help.uptimerobot.com/en/articles/11620927-how-to-delete-your-uptimerobot-account-step-by-step)

## Verificação científica

O executor `scripts/monitoramento/monitor.mjs` lê em série um conjunto fixo de URLs públicas do site ou de loopback, com limites de tempo e de bytes. Cada rodada devolve o estado, os tempos de consulta, os campos observacionais disponíveis e eventos de abertura ou recuperação. Evidências guardam códigos HTTP, motivos, datas, contagens e hashes. A sonda descarta corpos brutos e usa destinos fixos.

| Sinal | Cadência proposta | Interpretação |
| --- | --- | --- |
| Home, backend e saúde | 5 min no monitor de disponibilidade | Separar página errada, erro do backend e falha de transporte da sonda. Três amostras qualificadas abrem incidente. Cinco amostras válidas em pelo menos 2 s sinalizam latência. |
| NOAA GOES, vento, densidade, Bz e Bt | 1 h | Verificar o relógio por produto. Limiar inicial de frescor de 60 min. |
| NOAA Kp, F10.7 e regiões | 1 h | Limiar inicial de 6 h para Kp, 48 h para F10.7 com hora explícita, e três dias civis para datas diárias de F10.7 e regiões. Um catálogo válido sem flares não caracteriza falha. |
| Tomsk | 1 h | Verificar disponibilidade numérica e envelope JPEG separadamente. Hash identifica a imagem. Horários de consulta, de publicação e de estimativa conservam seus significados. A falta conhecida de F3 ou de horário observacional fica informativa. |
| BGS Norte e Leste | 1 h | Verificar metadados por canal, incluindo data verificada, origem arquivada, crédito e URL por hash. Idade da cópia aprovada é informativa. A verificação de bytes e hashes dos JPEGs continua no CI e na homologação da versão. |
| Histórico ELF | 1 h | Falha de leitura do histórico e ausência de novas observações são estados independentes. A janela móvel e o horário legado dos registros não comprovam perda, escrita recente ou nova observação. A escrita sem relógio observacional continua bloqueada. |
| Coletor ELF | 1 h | Consultar os metadados públicos das execuções agendadas do workflow existente. Analisar criação, conclusão, sucesso e demora. O limiar de partida é 135 min. Uma reexecução atualiza o estado de um run antigo e não comprova que houve novo disparo agendado. |

Abre-se uma ocorrência científica após três amostras qualificadas. Duas amostras válidas indicam recuperação. A deduplicação usa a identidade do sinal e o estado do episódio. A repetição em menos de meia cadência não avança contadores. Uma lacuna acima de 2,5 cadências interrompe a sequência. As condições justificadas de BGS arquivado, relógio desconhecido do Tomsk e escrita ELF bloqueada não geram incidentes de frescor. Uma falha real de leitura continua classificável. Os limiares são critérios da operação, sujeitos a ajuste após a semana silenciosa.

O coletor e o futuro executor científico são processos separados. Para o piloto, usar um workflow de ciência próprio, horário fora do início da hora, por exemplo no minuto 07, uma execução por vez e credenciais de produção ausentes. O job deve carregar o checkpoint da última execução válida do mesmo escopo e conservar as evidências de cada rodada por pelo menos sete dias. Manter um sinal externo de atraso do executor, separado dos sinais sobre os dados. O GitHub pode atrasar ou descartar disparos e desativar agendas em repositórios públicos inativos. Um watchdog do Healthchecks.io pode observar a cadência do piloto e usar o painel durante a semana silenciosa. [Agendamentos do GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule) · [Healthchecks.io](https://healthchecks.io/pricing/)

## Validação local

Com o build em execução apenas em loopback, verificar `GET` e `HEAD` e rodar a sonda somente de disponibilidade.

```sh
curl -i http://127.0.0.1:3000/healthz
curl -I http://127.0.0.1:3000/healthz
node scripts/monitoramento/monitor.mjs --loopback=http://127.0.0.1:3000 --scope=site --inspect-health
```

O modo `site` limita a sonda à Home, à configuração pública e à saúde HTTP. O padrão de escopo `all` só consulta as fontes quando a Home e o backend estão confirmados. A lista do coletor pode ser injetada localmente com `--collector=arquivo.json`. A consulta a GitHub exige a opção explícita `--inspect-collector` no modo `--public`. Os testes usam simuladores e loopback. `npm test` inclui a suíte existente e a do monitor. `node scripts/validate-artifact.cjs` verifica HTTP, rotas, BGS e a proteção dos arquivos internos no build.

`--policy=arquivo.json` aceita overrides sobre a política de partida. Um arquivo com `{"failureSamples":4,"collectorDelayMs":9000000}` altera o número de falhas e a tolerância do coletor em milissegundos. `--previous=estado.json` reaproveita somente um estado compatível com a origem, o escopo e a política. `--output=estado.json` grava o resultado completo de forma atômica. O executor futuro deve rodar em série, conservar a última evidência válida e manter flags, escopo e política consistentes. Uma alteração de política começa uma nova linha de base explícita.

## Piloto silencioso de sete dias

1. Após nova aprovação, publicar a candidata e validar `/healthz` antes de modificar o Render. Registrar o instante de início do piloto em UTC e manter os três sinais separados, disponibilidade pública, ciência e cadência.
2. Executar a sonda de disponibilidade a cada 5 min e a ciência a cada hora. Em sete dias completos, a referência é 2.016 sondas de disponibilidade e 168 ciclos científicos. Registrar atrasos e ciclos perdidos sem preencher lacunas.
3. Manter desligados os destinos de alerta. Guardar incidentes, recuperações, atrasos, condições suprimidas, duração e eventuais falhas de transporte no histórico de cada serviço e em evidências resumidas. O executor local apenas produz eventos.
4. Após sete dias, revisar o volume e a recorrência, a cadência real, a classificação de NOAA, as condições esperadas e a recuperação. Se a agenda estiver irregular, corrigir o executor ou ampliar a observação. Qualquer ativação de contato requer aprovação posterior.

## Custo e reversão

O piloto tem custo adicional estimado de **US$ 0/mês** com UptimeRobot Free, runner Linux padrão do GitHub no repositório público e watchdog Healthchecks.io Hobbyist opcional. O Render mantém o compute atual de 0.5 CPU e 512 MB. O watchdog gratuito guarda até 100 entradas por job. Usar as evidências do executor para reter a semana toda. Render Cron é uma alternativa a partir de US$ 1/mês, com armazenamento externo para o estado e no mesmo provedor do site. Nenhum valor é compromisso de contratação. [Preços do UptimeRobot](https://uptimerobot.com/pricing/) · [Cobrança do GitHub Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions) · [Preços do Render](https://render.com/pricing) · [Render Cron](https://render.com/docs/cronjobs)

Se uma verificação gerar instabilidade, pausar o executor ou a sonda responsável e conservar as evidências. Para retornar a um build sem `/healthz`, restaurar primeiro o health check TCP anterior no Render. O deploy `dep-dc105n6417fc73b279og` é o ponto de retorno desta candidata, com a proteção dos arquivos internos e o layout atual.
