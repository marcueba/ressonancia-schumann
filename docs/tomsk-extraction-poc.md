# Tomsk Spectrogram Extraction PoC

Este documento valida a extração independente de frequências de Schumann diretamente da imagem do espectrograma do observatório de Tomsk, sem depender de fontes JSON de terceiros.

## 1. Dados Iniciais Obtidos
- **Imagem Analisada:** `shm.jpg` (Tomsk - via sos70.ru/provider.php)
- **Hash SHA-256:** `4138f3b1d6b52080b6c68efe20834cd6e491c09f662480a74a9f0c4c5e59a179`
- **Dimensões:** 1540 x 460 pixels
- **Referência Secundária (JSON RessonânciaHoje):**
  - Timestamp: 2026-09-24T12:23:04+00:00
  - Fundamental (F1): 7.6 Hz (Intensidade: 34.4)
  - Harmônica 2 (F2): 13.7 Hz

## 2. Geometria Detectada Programaticamente
Através de script de varredura de contraste, determinamos a área útil da imagem e a escala matemática do espectrograma:
- Eixo temporal (X): Inicia em X=60 e vai até X=1539.
- Eixo de frequências (Y): Inicia em Y=35 (0 Hz) e vai até Y=435 (40 Hz).
- Fator de conversão: Exatamente 10 pixels por 1 Hz (`1 Hz = 10 px`).
- Coordenada: `Freq_Hz = (Y_pixel - 35) / 10.0`

## 3. Extração e Tratamento (Algoritmo Próprio)
Para evitar que a leitura fosse distorcida pelas linhas de grade horizontais brancas/cinzas (que cruzam Y=75, Y=115, etc.), criamos uma função de penalidade colorimétrica `max(0, R + G - B*2)`. Como as ressonâncias se manifestam em cores puras (Verde, Amarelo, Vermelho), esse filtro anula o fundo e as grades (valores RGB idênticos) isolando apenas o sinal físico.

Buscando os picos globais no perfil Y, encontramos:
- **Nosso F1:** Y=108 -> **7.30 Hz**
- **Nosso F2:** Y=171 -> **13.60 Hz**
- **Nosso F3:** Y=228 -> **19.30 Hz** (JSON secundário não reportou o limite exato, "pico_no_limite")

## 4. Validação vs JSON Secundário
- **F1 Diff:** Abs(7.30 - 7.60) = **0.30 Hz**
- **F2 Diff:** Abs(13.60 - 13.70) = **0.10 Hz**

## 5. Intensidade Relativa
A intensidade pode ser obtida escalando matematicamente o somatório dos canais R e G na vizinhança do pico e normalizando de 0 a 100 com base na linha base de fundo. Contudo, essa extração só deve ser denominada `intensidade relativa` e nunca "pT" ou "amplitude física".

## 6. Resultado da Avaliação: PARTIAL / PASS
O algoritmo foi bem-sucedido na determinação orgânica sem _hardcoding_.
- O erro de F2 foi incrivelmente baixo (0.10 Hz).
- O erro de F1 foi 0.30 Hz (exatamente no limiar). Notou-se que qualquer variação de 2 ou 3 pixels de _offset_ da origem Y adotada por OCRs de terceiros causa essa exata diferença (se o JSON assumiu 0 Hz em Y=32, a mesma linha lida resulta em 7.6 Hz).

## 7. Limitações e Repetibilidade
- **Limitação de Histórico:** Não foi possível iterar o script em imagens de ontem/semana passada pois a origem serve apenas a imagem estática sobrescrita (`shm.jpg`), não havendo catálogo/feed dinâmico nativo de Tomsk.
- A intensidade carece de uma calibração absoluta contra a paleta inferior.

## 8. Conclusão Conceitual Atualizada
- Recomendamos **NÃO** publicar no site valores processados via raspagem de imagem (`derived_from_image`) em tempo real, dada a variação potencial.
- O JSON do `ressonanciaschumannhoje` usa algoritmo muito semelhante ao aqui provado.
- **BGS Eskdalemuir:** Classificado como fonte instrumental científica **excelente** para calibração histórica, porém inviável para _feed live_ dado o encapsulamento dos dados e ausência de API em tempo real.
- **HeartMath:** Classificado como ferramenta visual valiosa cujo modelo fechado / licença impede integração em _backend_, exigindo trâmites de assinatura para obtenção dos dados brutos reais.
