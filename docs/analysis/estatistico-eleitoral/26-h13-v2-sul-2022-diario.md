# 26. H13, sinal V2 no Sul: teste direto com os diários de urna de 2022 (PR, SC e RS)

Estatístico eleitoral, **31/10/2026**. O plano foi fixado antes de ler qualquer diário de 2022 dessas UFs e antes de rodar, no **adendo 6** do [plano 16](16-h13-log-plano.md). O que veio depois de ver o resultado está marcado **exploratório**. Este doc repete no Sul o teste que o [doc 24](24-h13-v2-mg-2022-diario.md) fez em MG, com as três correções do [parecer cético 48](../cetico-revisor/48-h13-v2-mg-2022.md): vias conferidas pelo boletim, "compatível com" no lugar de "do mesmo tamanho" e comparação com população repesada pela fração sem biometria.

## Resposta curta

- **Teste declarado (parte própria da V2, pontos de parcela do 13 por 100% do cadastro; entre parênteses, o z):**

  | Unidade | 2026 | 2022 | 2022 repesado | Leitura pela regra do adendo 6 |
  |---|---|---|---|---|
  | **Sul** | +8,38 (4,34) | **+5,73 (3,78)** | +6,21 (2,87) | não é novidade de 2026; na população comparável, inconclusivo |
  | **RS** | +9,66 (3,69) | **+8,72 (3,56)** | +11,49 (2,60) | não é novidade de 2026; na população comparável, inconclusivo |
  | PR | +9,05 (1,32) | +6,57 (2,31) | +8,93 (1,56) | sem sinal de 2026 para comparar; medida não confirmada |
  | SC | +6,38 (1,92) | +2,32 (0,86) | +0,84 (0,18) | sem sinal de 2026 para comparar |

  - Corte de Bonferroni para os 16 testes: |z| ≥ 2,96. Passam só os dois T1 em negrito (Sul e RS em 2022).
  - Nenhuma diferença 2026 − 2022 passa, nem a bruta nem a repesada, em nenhuma unidade.
  - Os dados são **compatíveis com o mesmo tamanho**, mas sem poder para ver diferenças menores que o próprio sinal. No Sul, a diferença bruta vai de −2,2 a +7,5 (IC 95%) e a repesada de −3,5 a +7,9.
- **2026 reproduz o doc 22 exatamente:** Sul +8,38 (z 4,34) e RS +9,66 (z 3,69), com as mesmas 66.768 e 24.405 seções.
- **Leitura:** no Sul e no RS, a associação já existia em 2022. A comparação com a população repesada fica um pouco abaixo do corte (Sul z 2,87; RS z 2,60), com o mesmo sinal e um tamanho parecido.
  - Diferente de MG (parecer 48, item 4), no Sul o repeso **não** derruba 2022: ele fica em +6,2, contra +1,7 em MG.
  - **Exploratório:** na faixa abaixo de 15% sem biometria, onde está 79% do peso do Sul em 2026, os dois anos dão quase o mesmo: +10,9 (z 3,4) em 2026 e +9,6 (z 3,7) em 2022.
- **PR e SC sozinhos não têm sinal de 2026** que passe de z 2. No PR, a V2 de 2026 é só 0,7% dos votos (2,6% do cadastro sem biometria), então quase não varia, e o erro é grande (6,85).
- **Coleta (Fato):**
  - 6 zips, 25.088.641.365 bytes, em 79,0 min de transferência (cerca de 86 min com as pausas), sem nenhum HTTP 429;
  - todo arquivo de todas as seções tem SHA-512 igual ao do `.vsc` da própria seção;
  - as seções do zip são as mesmas do `detalhe_votacao_secao_2022`: 25.721 no PR, 16.242 em SC e 27.201 no RS, por turno.
- **Vias × boletim (Fato):** pelo critério fixado, a V2 do diário fica confirmada em SC e no RS e **não** no PR (98,7% e 98,9% das seções iguais, contra o corte de 99%). A diferença é a mesma de MG: o diário conta 1 ou 2 eleitores a mais na V2. No PR ela pesa mais porque a V2 é pequena. Com a V2 tirada do boletim, o resultado do PR não muda (+6,67 contra +6,57).

## Comandos e arquivos

```bash
node scripts/auditoria/coleta-2022-mg.mjs --uf pr,sc,rs --etapas catalogo         # 1 pedido ao catálogo oficial
node scripts/auditoria/coleta-2022-mg.mjs --uf pr,sc,rs --etapas zips --pausa-s 30  # 6 zips, um por vez, com retomada
node scripts/auditoria/coleta-2022-mg.mjs --uf pr --turno 1 --etapas conferir       # idem para cada UF e turno
node scripts/auditoria/estatistico-h13-v2-diario2022.mjs --uf pr --turno 1          # idem para cada UF e turno
node scripts/auditoria/estatistico-h13-v2-diario2022.mjs --uf pr --juntar           # → h13-v2/secoes-pr-2022-diario.csv
node scripts/auditoria/estatistico-h13-v2-mensagens2022.mjs --uf pr                 # mensagens da UF × MG
node scripts/auditoria/estatistico-h13-v2-bu2022.mjs --uf pr                        # vias do diário × boletim de 2022
node --max-old-space-size=12000 scripts/auditoria/estatistico-h13-v2-sul2022-analise.mjs
```

- **Código mudado:**
  - `coleta-2022-mg.mjs` aceita `--uf` (padrão `mg`). Para MG, os nomes de arquivo e de manifesto não mudaram.
  - `estatistico-h13-v2-diario2022.mjs` aceita `--uf` (padrão `mg`). Conferido: o `--juntar` de MG regrava `secoes-mg-2022-diario.csv` byte a byte igual.
- **Código novo:**
  - `estatistico-h13-v2-bu2022.mjs`: a leitura do `.bu` por tag do parecer 48, por UF. Rodado em MG, reproduz o parecer exatamente: V2 igual em 49.639 e 49.725 seções, com as mesmas somas;
  - `estatistico-h13-v2-mensagens2022.mjs` e `estatistico-h13-v2-sul2022-analise.mjs`.
- **Saídas** em `data/parsed/auditoria/estatistico/h13-v2/`:
  - `secoes-<uf>-2022-diario.csv`;
  - `diario2022/<uf>-<t>t.jsonl` e `.mensagens.json`;
  - `sul2022/`: `bu2022-<uf>.csv`, `bu2022-x-diario-<uf>.json`, `mensagens-<uf>.json`, `resultado-sul-2022-diario.json` e os logs.
- **Manifesto** em `data/manifest/2022/`: `zips.jsonl`, `catalogo-pr-sc-rs.json`, `conferencia-<uf>-<t>t.json` e `ocorrencias.jsonl`. A lista de arquivos vai em [26-arquivos-baixados.csv](26-arquivos-baixados.csv).

## 1. Coleta (Fato)

- As URLs foram conferidas no catálogo oficial de dados abertos, conjunto `resultados-2022-arquivos-transmitidos-para-totalizacao` (56 recursos), consultado em 31/10/2026: "PR/SC/RS – Arquivos transmitidos para totalização – Primeiro turno – 06.10.2022" e "… Segundo turno – 02.11.2022".
- O catálogo não publica hash desses arquivos.
- A base das URLs é `https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2022/arqurnatot/`.

| Arquivo | Bytes | Tempo | Velocidade | SHA-256 (início) | Last-Modified |
|---|---|---|---|---|---|
| `bu_imgbu_logjez_rdv_vscmr_2022_1t_PR.zip` | 4.119.095.578 | 14,3 min | 4,6 MB/s | 938be1cdd010361d… | 07/10/2022 |
| `bu_imgbu_logjez_rdv_vscmr_2022_2t_PR.zip` | 5.104.981.100 | 14,5 min | 5,6 MB/s | 642357c0fe3fefa6… | 02/11/2022 |
| `bu_imgbu_logjez_rdv_vscmr_2022_1t_SC.zip` | 2.631.645.506 | 9,2 min | 4,6 MB/s | 491ef818f389be97… | 07/10/2022 |
| `bu_imgbu_logjez_rdv_vscmr_2022_2t_SC.zip` | 3.382.518.530 | 9,3 min | 5,8 MB/s | d2967618a79f2927… | 02/11/2022 |
| `bu_imgbu_logjez_rdv_vscmr_2022_1t_RS.zip` | 4.335.586.129 | 16,1 min | 4,3 MB/s | 592a85efb5f4e5df… | 07/10/2022 |
| `bu_imgbu_logjez_rdv_vscmr_2022_2t_RS.zip` | 5.514.814.522 | 15,7 min | 5,6 MB/s | 89dfd5ee166ab185… | 02/11/2022 |
| **Total** | **25.088.641.365** | **79,0 min** | 5,0 MB/s | | |

- **Como foi baixado:** um pedido por vez, com 30 s de pausa entre os arquivos e retomada (`.part` + If-Range), das 06:05 às 07:31 (UTC) de 31/10/2026. Não houve nenhum 429, e o log não mostra nenhum download recomeçado. A rede só foi usada para o TSE e só para essas 3 UFs.
- **SHA-256, ETag e URL completos:** em `zips.jsonl` e em [26-arquivos-baixados.csv](26-arquivos-baixados.csv).
- **Guarda:** os zips estão em `data/raw/2022/<t>t/zip/` e não foram extraídos. Tudo foi lido direto do zip, com o CRC-32 de cada entrada conferido.

**Conferência (`conferencia-<uf>-<t>t.json`):**

| | PR 1º | PR 2º | SC 1º | SC 2º | RS 1º | RS 2º |
|---|---|---|---|---|---|---|
| Seções no zip | 25.721 | 25.721 | 16.242 | 16.242 | 27.201 | 27.201 |
| Seções da UF com comparecimento no detalhe (`_BR.csv`, presidente) | 25.721 | 25.721 | 16.242 | 16.242 | 27.201 | 27.201 |
| No detalhe sem zip / no zip sem detalhe | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| Completas (todo arquivo com SHA-512 igual ao do `.vsc` da seção) | 25.721 | 25.721 | 16.242 | 16.242 | 27.201 | 27.201 |
| Apuradas pelo Sistema de Apuração (`vscsa`) | 1 | 0 | 0 | 1 | 1 | 1 |
| Entradas fora de seção | `leiame.pdf` | idem | idem | idem | idem | idem |

- Diferente de MG, nenhuma seção ficou incompleta.
- Das 4 seções do Sistema de Apuração, 2 trazem também o `.logjez` da urna (SC e RS no 2º turno). As outras 2 (PR e RS no 1º turno) trazem só o `logsajez`, que não é lido.
- **Limite:** a assinatura do `.vsc` não foi verificada, só os resumos que ele lista. E não há hash oficial do zip.

## 2. O diário de 2022 no Sul e as vias (Fato)

**Mensagens.** A contagem de todas as mensagens do dia de cada UF foi comparada com a de MG (`mensagens-<uf>.json`) antes do modelo, como pede o adendo 6.

- As marcas de via têm **o mesmo texto** de MG nas três UFs e nos dois turnos. As marcas de 2026 (`Identificador do eleitor digitado`, `Ano de nascimento digitado é igual`, `Dado digitado confere`, `Foto do eleitor apresentada`) dão 0.
- Mensagens com pelo menos 1 por 1.000 votos que existem numa UF e não na outra:
  - o nome do computador que gerou a mídia (`MR gerada pelo computador: …`), diferente por UF;
  - no 2º turno de SC e do RS, `Voto confirmado para [Governador]` (houve 2º turno estadual) e `… [Prefeito]` (34.650 em SC e 87.438 no RS; provavelmente eleições suplementares no mesmo dia, o que não foi conferido).
- Nenhuma dessas toca a via. O ciclo com mais de uma confirmação já era tratado (o 1º turno tem 5 cargos). A tradução do doc 24 foi usada sem mudança.

**Leitura:** 0 erros nas 138.328 leituras (25.721 + 16.242 + 27.201 seções por turno) e 0 votos em "outra" nos dois turnos.

**Diário × boletim de 2022, como no parecer 48** (`bu2022-x-diario-<uf>.json`; seções com `.bu` da urna):

| | PR 1º | PR 2º | SC 1º | SC 2º | RS 1º | RS 2º |
|---|---|---|---|---|---|---|
| Seções comparadas | 25.720 | 25.721 | 16.242 | 16.241 | 27.200 | 27.200 |
| Votos do diário = comparecimento do BU | 25.714 | 25.717 | 16.239 | 16.240 | 27.195 | 27.198 |
| V3 do diário (V3m + V3s) = `[1]` | 25.717 | 25.719 | 16.242 | 16.241 | 27.196 | 27.198 |
| **V2 do diário = comparecimento − `[2]`** | **25.398 (98,75%)** | **25.449 (98,94%)** | 16.125 (99,28%) | 16.214 (99,83%) | 27.021 (99,34%) | 27.156 (99,84%) |
| Diferença absoluta da V2 ÷ soma da V2 | **0,130%** | 0,062% | 0,023% | 0,005% | 0,034% | 0,008% |
| Soma da V2: diário / BU | 451.254 / 451.188 | 456.610 / 456.328 | 531.312 / 531.192 | 542.533 / 542.505 | 859.662 / 859.592 | 864.333 / 864.312 |
| V2 confirmada (≥ 99% e ≤ 0,1%) | não | não | sim | sim | sim | sim |

- **O PR não passa no critério fixado,** e a leitura dele leva a marca **"medida não confirmada"**. A causa é a mesma de MG (parecer 48, item 1.1): entre as seções com votos iguais, o diário põe 1 eleitor a mais na V2 do que o boletim em 314 seções e 2 a mais em 6 (no 2º turno, 262 e 10). Nenhuma diferença vai no outro sentido.
  - Em MG, essas seções eram 0,5% a 0,7% do total. No PR são 1,1% a 1,2%.
  - No 1º turno, 260 das 586 diferenças vêm de 2 seções em que o diário tem muito menos votos que o boletim: 75833/0043/0074, com 0 contra 307, e 77275/0167/0100, com 23 contra 326. Essas seções saem do painel por "diário diferente do BU".
  - Sem elas, a diferença fica em 0,072%. Isso não muda a regra: a marca fica.
- **Sem peso no modelo:** com a V2 do boletim no lugar da do diário em 2022 (seção 5), o coeficiente do PR vai de +6,57 para +6,67.
- **Diário menor que o BU (Fato, Pendente de explicação):** além das duas do PR, RS 87912/0060/0322 tem diário com 0 votos nos dois turnos (o BU tem 300 e 309), e RS 88013/0002/0199 (196 contra 288) e 88013/0114/0336 (14 contra 259) estão no 1º turno. Todas saem do painel.

**Parcela da V2 nos votantes, pelo boletim do universo (Fato):**

| | 2022, 1º turno | 2022, 2º turno | 2026, 2º turno |
|---|---|---|---|
| PR | 6,61% | 6,61% | 0,70% |
| SC | 11,84% | 11,94% | 5,31% |
| RS | 12,48% | 12,47% | 8,12% |
| Sul | — | 10,14% | 4,60% |
| MG (parecer 48, para comparar) | — | 32,4% | 11,5% |

- 2022: comparecimento − `[2]` sobre o comparecimento das seções com `.bu` da urna.
- 2026: `sem_biometria` sobre o comparecimento do banco.
- No Sul, a diferença entre os anos é bem menor que em MG.

## 3. Amostra

| | PR 2026 | PR 2022 | SC 2026 | SC 2022 | RS 2026 | RS 2022 | Sul 2026 | Sul 2022 |
|---|---|---|---|---|---|---|---|---|
| Seções no painel | 27.137 | 25.687 | 17.304 | 16.198 | 27.515 | 27.166 | 71.956 | 69.051 |
| No modelo (local com 2 ou mais seções) | 26.142 | 24.607 | 16.221 | 14.943 | 24.405 | 23.657 | 66.768 | 63.207 |
| Locais | 3.816 | 3.555 | 2.377 | 2.201 | 4.662 | 4.482 | 10.855 | 10.238 |
| Fora: sem a seção nos dois turnos | 0 | 153 | 0 | 563 | 0 | 222 | 0 | 938 |
| Fora: sem perfil | 2 | 23 | 19 | 36 | 23 | 23 | 44 | 82 |
| Fora: diário diferente do BU | 0 | 11 | 0 | 5 | 2 | 8 | 2 | 24 |
| Fora: menos de 20 votos em 13 + 22 | 3 | 0 | 3 | 3 | 7 | 4 | 13 | 7 |
| Sem biometria no cadastro (média ponderada) | 2,6% | 7,5% | 10,2% | 22,6% | 12,8% | 21,7% | 8,3% | 16,6% |

- As linhas de 2022 "sem a seção nos dois turnos" (153, 563 e 222) são exatamente as linhas do perfil sem seção com urna. Todas as seções com urna estão contadas, como em MG.
- **Modelos de urna:** a base é UE2022 em 2026 e UE2020 em 2022. As seções de 2022 sem modelo no detalhe ficam na base (846 no Sul).
- O Sul de 2026 é o mesmo do doc 22 (71.956 seções; 66.768 no modelo).

## 4. Resultado (teste declarado)

Modelo do doc 22, igual nos dois anos. Os valores são pontos de parcela do 13 por 100% do cadastro. Entre parênteses vai o z; "erro" é o erro-padrão CR1 por local.

| Termo | PR 2026 | PR 2022 | SC 2026 | SC 2022 | RS 2026 | RS 2022 | Sul 2026 | Sul 2022 |
|---|---|---|---|---|---|---|---|---|
| **e_V2** | +9,05 (1,32) | +6,57 (2,31) | +6,38 (1,92) | +2,32 (0,86) | **+9,66 (3,69)** | **+8,72 (3,56)** | **+8,38 (4,34)** | **+5,73 (3,78)** |
| erro de e_V2 | 6,85 | 2,84 | 3,33 | 2,69 | 2,62 | 2,45 | 1,93 | 1,52 |
| e_V3m | +1,14 (1,72) | −0,26 (−0,57) | +0,05 (0,06) | −0,92 (−1,50) | −0,18 (−0,25) | +0,21 (0,41) | +0,44 (1,04) | −0,27 (−0,89) |
| e_V3s | +1,27 (1,75) | −0,60 (−1,33) | +0,21 (0,23) | −0,37 (−0,61) | +0,42 (0,58) | +0,10 (0,21) | +0,75 (1,69) | −0,27 (−0,91) |
| Δc | +7,67 (9,96) | +3,37 (4,04) | +8,55 (8,77) | +1,68 (1,58) | +5,53 (6,49) | −1,48 (−1,58) | +7,15 (14,5) | +1,37 (2,54) |

**Testes: 16; Bonferroni |z| ≥ 2,96.** "Veria" é o efeito que o teste veria com 80% de poder, (2,96 + 0,84) × erro.

| Unidade | Teste | Valor | Erro | z | p | Passa? | Veria | IC 95% |
|---|---|---|---|---|---|---|---|---|
| PR | T1: 2022 | +6,57 | 2,84 | 2,31 | 0,021 | não | 10,8 | |
| PR | T2: 2026 − 2022 | +2,48 | 7,41 | 0,33 | 0,74 | não | 28,1 | −12,1 a +17,0 |
| PR | T3: 2022 repesado | +8,93 | 5,71 | 1,56 | 0,12 | não | 21,7 | |
| PR | T4: 2026 − 2022 repesado | +0,12 | 8,91 | 0,01 | 0,99 | não | 33,8 | −17,4 a +17,6 |
| SC | T1 | +2,32 | 2,69 | 0,86 | 0,39 | não | 10,2 | |
| SC | T2 | +4,06 | 4,28 | 0,95 | 0,34 | não | 16,2 | −4,3 a +12,4 |
| SC | T3 | +0,84 | 4,55 | 0,18 | 0,85 | não | 17,3 | |
| SC | T4 | +5,54 | 5,64 | 0,98 | 0,33 | não | 21,4 | −5,5 a +16,6 |
| RS | T1 | **+8,72** | 2,45 | **3,56** | 0,00037 | **sim** | 9,3 | |
| RS | T2 | +0,94 | 3,59 | 0,26 | 0,79 | não | 13,6 | −6,1 a +8,0 |
| RS | T3 | +11,49 | 4,42 | 2,60 | 0,0093 | não | 16,8 | |
| RS | T4 | −1,83 | 5,13 | −0,36 | 0,72 | não | 19,5 | −11,9 a +8,2 |
| Sul | T1 | **+5,73** | 1,52 | **3,78** | 0,00016 | **sim** | 5,8 | |
| Sul | T2 | +2,66 | 2,46 | 1,08 | 0,28 | não | 9,3 | −2,2 a +7,5 |
| Sul | T3 | +6,21 | 2,16 | 2,87 | 0,0041 | não | 8,2 | |
| Sul | T4 | +2,18 | 2,90 | 0,75 | 0,45 | não | 11,0 | −3,5 a +7,9 |

**Repeso (T3 e T4).** Os pesos de 2022 foram refeitos por faixas de 5 pontos de sem biometria, até a distribuição ficar igual à de 2026. Saem as seções de 2022 em faixas sem nenhuma seção de 2026; de 2026 não sai nenhuma.

| | PR | SC | RS | Sul |
|---|---|---|---|---|
| Sem biometria médio: 2022 original → repesado → 2026 | 7,5% → 2,9% → 2,6% | 22,6% → 10,3% → 10,2% | 21,7% → 12,7% → 12,8% | 16,6% → 8,4% → 8,3% |
| Seções de 2022 fora do suporte comum | 160 | 352 | 43 | 111 |

**Leitura pela regra do adendo 6:**

- **Sul: "não é novidade de 2026; na população comparável, inconclusivo".** T1 passa (+5,73, z 3,78). T3 dá +6,21 (z 2,87), positivo mas abaixo do corte de 2,96. T2 e T4 não passam.
  - O Sul contém o PR, cuja V2 não passou no critério do boletim. Com a V2 do boletim em 2022, o Sul dá +5,69 (z 3,76).
- **RS: "não é novidade de 2026; na população comparável, inconclusivo".** T1 passa (+8,72, z 3,56). T3 dá +11,49 (z 2,60), acima do valor bruto, mas com erro maior, e não passa. T2 e T4 não passam.
- **PR: "sem sinal de 2026 para comparar"** (z 1,32), com a marca "medida não confirmada". Em 2022 o PR tem +6,57 (z 2,31), sem passar.
  - O erro de 2026 (6,85) é o maior das quatro unidades: com 2,6% do cadastro sem biometria, a V2 quase não varia entre seções.
- **SC: "sem sinal de 2026 para comparar"** (z 1,92). Em 2022, +2,32 (z 0,86).
- **Tamanho:** em nenhuma unidade a diferença passa. Os dados são **compatíveis com o mesmo tamanho**, sem poder para ver diferenças menores que o próprio sinal: no Sul, o teste da diferença só veria 9,3 pontos com 80%, mais que o sinal de 2026 (8,38).

## 5. Relatado sem teste (declarado no adendo 6)

| | PR 2026 | PR 2022 | SC 2026 | SC 2022 | RS 2026 | RS 2022 | Sul 2026 | Sul 2022 |
|---|---|---|---|---|---|---|---|---|
| e_V2 descontada a regressão à média (Y e x_V2 do 1º turno) | +6,57 (1,01) | +5,56 (2,02) | +6,67 (2,07) | +2,60 (1,00) | +7,79 (3,11) | +7,81 (3,35) | +6,35 (3,46) | +5,19 (3,56) |
| 2022 com a V2 do boletim (V3m e V3s do diário) | | +6,67 (2,35) | | +2,30 (0,85) | | +8,57 (3,50) | | +5,69 (3,76) |

- A regressão à média não muda a leitura. No RS, 2022 e 2026 ficam iguais (+7,8).
- A V2 do boletim dá o mesmo que a do diário: o leitor de 7z e a tradução não mudam o resultado de 2022.

**Uma inclinação de e_V2 por faixa de sem biometria no cadastro** (as faixas do parecer 48; coeficiente, z e parte do peso; faixas com menos de 50 seções ficam fora):

| Faixa | Sul 2026 | Sul 2022 | RS 2026 | RS 2022 |
|---|---|---|---|---|
| menos de 15% | **+10,88 (3,43)**, 79% | **+9,62 (3,68)**, 65% | +12,55 (2,64), 64% | +13,81 (2,45), 51% |
| 15% a 30% | +6,45 (2,64), 18% | +3,48 (1,16), 14% | +8,04 (2,58), 29% | +3,49 (0,68), 16% |
| 30% a 50% | +11,46 (2,76), 3% | +6,02 (2,35), 15% | +12,90 (2,75), 7% | +11,05 (3,11), 21% |
| 50% ou mais | fora (26 seções) | +1,79 (0,56), 7% | fora (21 seções) | +5,83 (1,36), 11% |

**Exploratório (lido depois de ver):**

- **O Sul não repete a divergência de MG.** Em MG (parecer 48, item 4), na faixa onde está o sinal de 2026 (15% a 50%), 2022 dava só +1,5, e o agregado de 2022 vinha da faixa acima de 50%.
  - No Sul, a faixa de maior peso nos dois anos é a mesma (menos de 15%), e nela os dois anos dão quase o mesmo: +10,9 e +9,6.
  - Isso combina com o repeso, que no Sul quase não muda 2022 (+5,7 → +6,2), enquanto em MG levava a +1,7.
- **PR e SC por faixa:** o PR de 2026 tem 99,6% das seções abaixo de 15% sem biometria. Em SC 2026, a faixa abaixo de 15% dá +10,83 (z 2,02), e em 2022, +6,03 (z 1,14).
- **V3m:** o achado de MG (V3m +1,93 em 2026) não aparece no Sul: de −0,92 a +1,14, sem nenhum z acima de 1,8 em nenhum ano.
- **Δc** é bem maior em 2026 que em 2022 em todas as unidades: Sul +7,15 (z 14,5) contra +1,37 (z 2,5).
  - Neste modelo, porém, Δc mede o ganho do 13 por votante a mais **pela digital** (V1), porque as outras vias entram separadas. E o modelo não tem o nível de partida (c1 e Y1).
  - O parecer 48, adendo 1, mostrou que isso não responde à pergunta do comparecimento; o doc 25 tem a especificação certa e não cobre o Sul.
  - Fica só como descrição, sem leitura.

## Leitura

- **Sul e RS, sinal V2:** do 1º para o 2º turno, as seções onde mais eleitores sem digital voltaram a votar ganharam mais voto no 13, dentro do mesmo prédio. Isso já acontecia em 2022: +5,7 no Sul e +8,7 no RS, contra +8,4 e +9,7 em 2026.
  - **Por isso, no Sul e no RS, esse padrão não é uma novidade de 2026.**
- **Comparando com a população repesada,** o resultado vai na mesma direção, sem passar o corte: +6,2 (z 2,87) no Sul e +11,5 (z 2,60) no RS. Pela regra, isso fica **inconclusivo**.
  - **Exploratório:** é mais próximo de "o mesmo padrão" do que em MG. Os anos batem na faixa de sem biometria em que está quase todo o eleitorado de 2026.
- **PR e SC sozinhos** não têm sinal de 2026 que passe de z 2, então não há o que comparar. No PR, isso vem sobretudo de quase não haver eleitor sem biometria em 2026 (0,7% dos votos).
- **Sobre inserção:** nada aqui a exclui. Uma fraude com o mesmo formato de um padrão antigo não seria vista. E, em 2022, a urna liberava o eleitor sem digital só pelo título (parecer 48, item 1.2). Mas, somado aos docs 19, 22 e 24, o argumento "o sinal é novo em 2026" deixa de valer também no Sul e no RS.

## O que isto permite e o que não permite afirmar

**Permite:**

- **Fato:** os arquivos de urna de 2022 do PR, de SC e do RS estão completos e conferidos. São 25.721, 16.242 e 27.201 seções por turno, as mesmas do detalhe oficial, e todo arquivo de toda seção tem o resumo do `.vsc` conferido.
- **Fato:** pelo boletim de 2022, sem diário, a V2 do diário fica confirmada em SC e no RS. No PR ela difere em 1,1% a 1,3% das seções, quase sempre por 1 eleitor, e não passa no critério fixado.
- **Fato (teste declarado):** no Sul e no RS, a parte própria da V2 em 2022 é positiva e passa o corte: +5,73 (z 3,78) e +8,72 (z 3,56). Nenhuma diferença 2026 − 2022 passa.

**Não permite:**

- dizer que é o mesmo fenômeno nos dois anos: na população repesada, o teste não passa (z 2,87 e 2,60);
- dizer "do mesmo tamanho": o teste da diferença não veria diferenças menores que o próprio sinal;
- dizer que o sinal de 2026 é comportamento demonstrado, ou que não houve fraude;
- tirar conclusão sobre PR ou SC sozinhos: sem sinal de 2026 para comparar.

## Pendências

- Revisão independente deste doc, sobretudo:
  - o critério do PR (a marca "medida não confirmada" e a variante pelo boletim);
  - a leitura do repeso no Sul, comparada à de MG.
- As 5 seções com diário muito menor que o boletim (PR 75833/0043/0074 e 77275/0167/0100; RS 87912/0060/0322, 88013/0002/0199 e 88013/0114/0336): ver no bruto se falta trecho do diário no zip oficial.
- Δc maior em 2026 no Sul: só com a especificação do doc 25 (nível de partida e Δc total), se o coordenador quiser.
