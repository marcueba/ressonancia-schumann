# ELF Source Proof of Concept (PoC)

Este documento sumariza a investigação de viabilidade técnica de fontes reais de dados para o Observatório da Terra, focando na integração automatizada de telemetria científica.

## Matriz de Fontes Analisadas

| Fonte | Tipo de instrumento/dado | Está atual? | Último timestamp | Formato | Endpoint/URL real | Automatizável? | Frequência de atualização | Frequência Numérica? | Amplitude? | Espectrograma? | Licença | Atribuição | Confiabilidade |
|-------|--------------------------|-------------|------------------|---------|-------------------|----------------|---------------------------|----------------------|------------|----------------|---------|------------|----------------|
| **NOAA SWPC** | Fluxo F10.7, Sunspots, Flares | Sim | 2026-08-28T20:00:00 | JSON | `services.swpc.noaa.gov/json/*` | Sim (APIs robustas) | Diária/Minutos (varia) | N/A (Solar) | Sim (Fluxo/Raio-X) | Não | Domínio Público | NOAA SWPC | Altíssima |
| **RessonânciaHoje** | Dado derivado de Imagem (Tomsk) | Sim | 2026-09-24T12:23:04 | JSON | `ressonanciaschumannhoje.com/dados/schumann.json` | Sim (CORS OK) | Horária | Sim (Estimada) | Sim (0-100 RGB) | Sim (URL Base) | Não clara | Sim | Baixa (Derivada) |
| **Tomsk (SOSRFF)** | Bobina de Indução (Espectrograma) | Sim | (Embutido na img) | JPEG | `sos70.ru/provider.php?file=shm.jpg` | Parcial (via OCR/CV) | Diária/Horária | Não | Não | Sim | Acadêmica | TSU (Tomsk) | Média/Visual |
| **BGS Eskdalemuir** | Bobina de Indução (ELF) | Não (Direta) | Desconhecido | HTML/Binário | `geomag.bgs.ac.uk` | Não (Ausência de API ELF) | Desc. | Não | Não | Não | OGL | BGS | Alta (se houvesse) |
| **HeartMath** | Magnetômetros GCI | Não (Fechada) | - | HTML/Custom | `nocc.heartmath.org/spectrogram/` | Não | - | Não | Não | Sim (Fechado) | Proprietária | GCI | Média |

---

## Análise de Fontes

### 1. BGS Eskdalemuir
- **Classificação:** `REJECT` (Para ingestão em tempo real ELF)
- **Justificativa:** O canal sísmico `HHZ` (velocidade) não representa o campo magnético. As bobinas de indução genuínas da BGS são enviadas "hora a hora para Edimburgo", mas **não há endpoint JSON/CSV público** para telemetria em tempo real das frequências de Schumann. Os FTPs não disponibilizam dados ELF em tempo real no formato adequado.

### 2. Tomsk (SOSRFF / sos70.ru)
- **Classificação:** `CONTEXTUAL ONLY`
- **Justificativa:** O domínio antigo `sosrff.tsu.ru` faz redirect para `sos70.ru`. A imagem atual (`shm.jpg`) está disponível via `provider.php`. Não há API de dados. A única forma de usar é exibindo a imagem bruta (com os devidos créditos) ou empregando processamento de imagem (Computer Vision) no servidor para raspar pixels, o que introduz alto grau de ruído.

### 3. Ressonanciaschumannhoje.com
- **Classificação:** `SECONDARY / VALIDATION`
- **Justificativa:** Eles realizam o rasping da imagem de Tomsk e publicam um JSON excelente e fácil de consumir. Contudo, os dados são **derivados da imagem**, o que significa que a escala de intensidade não é física (pico-Tesla), mas "0-100 na escala RGB" (`"escala": "intensidade 0-100 na escala de cor..."`). Nunca deve ser vendido ao público como medição bruta. Pode ser integrado marcando a flag `derived_from_image = true`.

### 4. HeartMath / Global Coherence
- **Classificação:** `REJECT`
- **Justificativa:** Plataforma proprietária, painéis restritos (raw data requires login/subscription), sem API aberta.

### 5. NOAA SWPC (Space Weather)
- **Classificação:** `PRIMARY CANDIDATE` (Para contexto Solar)
- **Justificativa:** APIs governamentais sólidas, limpas e bem mantidas.
  - **Fluxo F10.7:** `f107_cm_flux.json` (Campo: `flux` da primeira linha onde `time_tag` é mais recente).
  - **Manchas Solares (Sunspots):** `sunspot_report.json` (Agrupar/Somar `Numspot` ou utilizar registros recentes filtrados).
  - **Eventos/Flares:** `edited_events.json` (Filtrar por `"type": "XRA"` para raios-X e olhar `"particulars1"` para a classe do flare, ex: "M1.7").

---

## Proposta Arquitetural (Tomsk-Derived via JSON Secundário)

Se decidirmos prosseguir com a ingestão do JSON derivado para a Ressonância, a arquitetura deve isolar o frontend da origem frágil:

`Source (sos70.ru JPG / ressonanciaschumannhoje.com JSON)`
  ↓
`Collector (Node.js Cron / Edge Function no backend)`: Faz polling a cada hora.
  ↓
`Validation (Zod/TypeScript)`: Verifica se os campos `pico_hz` estão coerentes (ex: 7 a 8Hz para fundamental) e previne anomalias.
  ↓
`Supabase (Tabela "measurements")`: Salva com `derived_from_image = true`, `source_url`, e timestamps estritos.
  ↓
`API (Express /api/schumann)`: Serve apenas os dados contidos no banco de dados. Nunca repassa requests dinâmicos.
  ↓
`Frontend (React)`: Lê a API interna, exibindo os dados com um "Disclaimer" visual claro sobre a origem computacional.

## Recomendação Final
**HOJE**, a única integração primária viável técnica e cientificamente sem hardware próprio ou parcerias acadêmicas fechadas são os dados espaciais do **NOAA SWPC** (Primary). 
Para os dados diretos da Ressonância de Schumann, o feed JSON do *Ressonanciaschumannhoje* é o caminho tecnicamente mais viável, contanto que classificado como secundário (`derived_from_image = true`) e não como medição eletromagnética direta.
