# H13, método 2: limites determinísticos do voto dos liberados sem biometria

**Pergunta (H13, do usuário).** Os eleitores liberados sem biometria pelo mesário votaram majoritariamente no 13 (LULA), principalmente no Nordeste? 2º turno de presidente (13 × 22, 25/10/2026), com o 1º turno (04/10) como linha de base.

**Resposta curta.**
- **Fato:** sem suposição estatística, os dados não decidem a questão. No Nordeste, no 2º turno, a parcela dos liberados que votou no 13 pode estar em qualquer ponto entre **1,0% e 100,0%** (L1, liberados pelo mesário) ou entre **3,4% e 99,9%** (L2, todo habilitado sem digital). Isso não é falha do método: a matemática garante que qualquer seção é compatível com "os liberados votaram como o resto da seção".
- **Fato:** se os liberados votaram como a própria seção, cerca de 70% deles votaram no 13 no Nordeste (70,5% em L1, 70,0% em L2, contando só 13 e 22). É praticamente o resultado do Nordeste inteiro (69,4%).
- **Fato:** as seções em que o número de liberados obriga votos num lado seguem o resultado local. No Nordeste, 1.811 seções obrigam votos no 13 e 19 obrigam votos no 22 (L1, 2º turno). Se a taxa de liberação fosse sorteada entre as seções da mesma zona, o esperado seria 1.635 e 18: há 11% a mais do que o resultado das seções explica. O excesso é maior no 1º turno (+20%) e aparece também no Sul, a favor do 22 (+52%).
- **Fato:** no pior caso para o 13, com todo liberado do Nordeste votando no 13 sempre que a seção permite e esses votos anulados, o 13 ainda vence no país por pelo menos 2,64 milhões de votos (L1) ou 0,17 milhão (L2).

## O que este método pode e não pode dizer

**Limite estrutural (vale para todo o documento).** O voto é secreto. O log grava como cada eleitor foi habilitado, mas não em quem ele votou. O RDV embaralha os votos e não liga voto a eleitor. O voto dos liberados não pode ser observado, nem seção por seção. Este método não estima esse voto: ele **cerca** o voto, isto é, calcula o mínimo e o máximo que os números da própria seção permitem.

**Princípio 8 ([01-premissas](../../01-premissas.md)).** A liberação pelo mesário é uma brecha humana a medir. A conferência de documento e a foto na tela não contam como controle. Os limites abaixo não dependem de nenhum procedimento humano: só da aritmética do BU e do log.

## Definições

Contam só as habilitações que terminaram em voto, como no detalhamento do BU ([06](../../06-leitura-bu-rdv-log.md), `src/perfil-secoes.js`).

| Sigla | Quem conta | Fonte |
|---|---|---|
| **L1** | eleitor com biometria cadastrada, digital não reconhecida, habilitado por dado pessoal com digital de **mesário identificado** (`Mesário … habilitou o eleitor`) | log: `habilitadosPeloMesario`. Só onde os votos computados no log = votos de presidente no BU |
| **L2** | **todo habilitado sem digital do eleitor**: sem biometria cadastrada (ano de nascimento) + com biometria e liberado por dado pessoal (com ou sem digital de mesário) | BU: `semBiometriaCadastrada + comBiometriaHabilitadosPorAnoNascimento`. Só onde o detalhamento soma o comparecimento |
| L2a / L2b | as duas partes de L2, separadas | BU (estão no JSON de saída, não no texto) |

Regiões: Nordeste = AL, BA, CE, MA, PB, PE, PI, RN, SE; Norte = AC, AM, AP, PA, RO, RR, TO; Centro-Oeste = DF, GO, MS, MT; Sudeste = ES, MG, RJ, SP; Sul = PR, RS, SC; exterior = ZZ.

## Método (Duncan–Davis)

Em cada seção: T = votos de presidente (um por eleitor, igual ao comparecimento), V13 e V22, e O = T − V13 − V22 (brancos, nulos e, no 1º turno, os outros candidatos). O liberado também pode ter votado branco ou nulo: O entra como "outro destino possível". Com L liberados que votaram e x13 = liberados que votaram no 13:

- **máximo:** x13 ≤ min(L, V13);
- **mínimo:** os T − L não liberados cobrem no máximo T − L votos que não são 13. Então x13 ≥ max(0, L − (T − V13)) = max(0, L − V22 − O);
- o mesmo vale para o 22.

O mínimo é positivo, ou seja, a seção **força** votos num lado, só quando há mais liberados do que votos para o outro lado somados a brancos, nulos e outros.

**Agregação.** Os limites se somam: a faixa do Nordeste é [Σmin ÷ ΣL, Σmax ÷ ΣL]. O ponto que dá o máximo ao 13 dá ao mesmo tempo o mínimo ao 22: x22 = max(0, L − V13 − O). Por isso a parcela do 13 entre os liberados que votaram 13 ou 22 também tem limites exatos, [Σmin13 ÷ (Σmin13 + Σmax22), Σmax13 ÷ (Σmax13 + Σmin22)]. A margem 13 − 22 dos **não liberados** fica entre (V13 − V22) − Σ(x13 − x22)máx e (V13 − V22) − Σ(x13 − x22)mín.

**Hipótese nula (H0) e por que os limites nunca a rejeitam.** H0: na seção, os liberados votam como o conjunto da seção (x13 = L·V13/T, o "ponto homogêneo").
- **Prova.** Como L ≤ T, vale L·V13/T ≤ min(L, V13). Também vale L·V13/T ≥ L − (T − V13), porque isso equivale a (T − L)(T − V13) ≥ 0.
- Logo o ponto homogêneo está **sempre** dentro dos limites, em qualquer seção.
- **Consequência:** limites determinísticos só derrubariam H0 numa seção impossível, com L > T. Encontramos zero (abaixo). Para comparar com H0, usamos então a contagem das seções forçadas contra um nulo de permutação.

**Nulo de permutação ("a liberação não tem relação com o voto dentro da zona").**
- Dentro de cada zona (UF + zona), a taxa L/T é embaralhada entre as seções e L' = round(taxa × T) é recalculado.
- Depois são contadas de novo as seções forçadas e os votos forçados (Σmin). São 200 repetições com semente fixa.
- O esperado responde: quantas seções forçadas o **resultado de cada seção** produziria sozinho, com a mesma distribuição de taxas de liberação na zona.
- "frac ≥" é a fração de repetições com valor maior ou igual ao observado. É um p de permutação sem correção para comparações múltiplas e serve só para ordenar.

## Invariantes conferidos antes (Fato, 29/10/2026)

| Invariante | 2º turno | 1º turno |
|---|---|---|
| L ≤ T (liberados que votaram ≤ votos de presidente), L1 e L2 | 0 violações em 499.168 / 497.897 seções | 0 em 499.161 / 497.895 |
| L1 ≤ L2b (todo liberado por mesário identificado é liberação por dado pessoal) | 0 violações | 0 violações |
| Soma do detalhamento do BU = votos de presidente | 0 diferenças | 0 |
| Totais lidos dos perfis × banco (`voto_bu`, cargo 1) | 13 = 64.256.232; 22 = 59.826.041; brancos 1.430.496; nulos 2.723.305: iguais | — |

Ficam fora:
- **L1:** 36 seções no 2º turno (45 no 1º) em que os votos do log ≠ BU.
  - 27 são seções do exterior com voto em cédula (`qtdEleitoresCompareceram` = 0 no BU, sem log de votação).
  - 9 são urnas substituídas ou recuperadas, já explicadas em [coerencia-contagem/03](../coerencia-contagem/03-coerencia-interna.md).
- **L2:** 1.308 seções do 2º turno sem detalhamento no BU, quase todas do exterior.
- **Cobertura:** o 1º turno é lido dos perfis `data/parsed/1t/perfil/`, que têm as 27 UFs (inclusive SP e SE) e 1.310 das 1.351 seções do exterior. A cópia de leitura do banco só tem 22 UFs do 1º turno.

## Resultados, 2º turno (Fato)

Coluna "13 (13+22)": parcela do 13 entre 13 e 22. "Faixa": limites determinísticos. "Homog.": valor se os liberados votassem como a própria seção. "Forçam": seções com mínimo ≥ 1 para aquele lado, observado / esperado na permutação (razão). "Margem dos não liberados": V13 − V22 entre os que **não** foram liberados, do pior ao melhor caso para o 13.

### L1, liberados pelo mesário identificado

| Grupo | Seções | L1 | L1/T | 13 (13+22) na seção | Liberados no 13, faixa (% de L1) | Homog. (13+22) | Forçam 13 | Forçam 22 | Forçam ≥ 10 votos: 13 / 22 | Margem dos não liberados |
|---|---:|---:|---:|---:|---|---:|---|---|---|---|
| Brasil | 499.168 | 5.841.016 | 4,6% | 51,8% | 0,4–99,9 | 52,1% | 2.054 / 1.943 (1,06) | 272 / 197 (1,38) | 633 / 107 | −1.401.564 a +10.216.702 |
| **Nordeste** | 140.822 | 1.794.975 | 4,9% | 69,4% | **1,0–100,0** | **70,5%** | **1.811 / 1.635 (1,11)** | **19 / 18 (1,08)** | 586 / 15 | **+11.859.905 a +15.399.877** |
| AL | 7.101 | 96.551 | 5,0% | 60,8% | 0,8–100,0 | 64,8% | 79 / 72 (1,10) | 1 / 1 | 32 / 1 | +312.004 a +502.723 |
| BA | 35.473 | 441.558 | 4,7% | 71,3% | 1,4–99,9 | 72,0% | 441 / 416 (1,06) | 8 / 7 (1,16) | 174 / 8 | +3.435.466 a +4.301.566 |
| CE | 23.765 | 307.281 | 5,1% | 68,9% | 0,9–100,0 | 70,9% | 301 / 255 (1,18) | 3 / 4 | 93 / 1 | +1.909.518 a +2.516.351 |
| MA | 18.092 | 170.033 | 4,1% | 69,5% | 1,0–99,9 | 69,4% | 269 / 258 (1,04) | 2 / 2 | 56 / 1 | +1.408.425 a +1.743.740 |
| PB | 10.711 | 147.448 | 5,4% | 67,5% | 0,2–100,0 | 67,7% | 42 / 33 (1,26) | 0 / 0 | 12 / 0 | +781.359 a +1.075.393 |
| PE | 21.418 | 283.892 | 4,6% | 69,2% | 0,7–99,9 | 70,8% | 193 / 169 (1,14) | 4 / 4 | 71 / 4 | +2.001.420 a +2.563.119 |
| PI | 10.224 | 138.588 | 6,2% | 75,9% | 2,8–100,0 | 77,2% | 454 / 407 (1,12) | 1 / 0 | 142 / 0 | +989.463 a +1.256.284 |
| RN | 8.115 | 135.318 | 6,1% | 65,7% | 0,1–100,0 | 66,5% | 16 / 13 (1,25) | 0 / 0 | 2 / 0 | +540.869 a +811.077 |
| SE | 5.923 | 74.306 | 5,1% | 69,5% | 0,2–100,0 | 69,5% | 16 / 13 (1,20) | 0 / 0 | 4 / 0 | +481.381 a +629.624 |
| Norte | 43.769 | 385.951 | 3,7% | 50,0% | 0,2–100,0 | 49,3% | 139 / 168 (0,83) | 11 / 12 (0,92) | 20 / 1 | −384.664 a +384.790 |
| Centro-Oeste | 38.048 | 425.854 | 4,4% | 40,0% | 0,1–100,0 | 39,9% | 30 / 67 (0,45) | 6 / 8 (0,74) | 8 / 1 | −2.295.594 a −1.444.649 |
| Sudeste | 203.234 | 2.219.033 | 4,2% | 47,2% | 0,1–100,0 | 47,1% | 61 / 49 (1,24) | 15 / 14 (1,09) | 14 / 11 | −5.024.342 a −590.053 |
| Sul | 72.014 | 1.015.203 | 5,4% | 37,4% | 0,0–99,6 | 36,9% | 13 / 23 (0,56) | **221 / 145 (1,52)** | 5 / 79 | −5.585.434 a −3.561.828 |

Votos forçados (Σmin), observado × esperado na permutação:
- **Nordeste:** 18.046 votos forçados no 13 contra 16.476 esperados (+1.570; frac ≥ 0,000). No 22, 681 contra 686 (0,51).
- **Sul:** 2.590 forçados no 22 contra 1.825 esperados (frac ≥ 0,000). No 13, 237 contra 368.
- **Brasil:** 20.374 forçados no 13 contra 19.466 esperados. No 22, 4.074 contra 3.430.

### L2, todo habilitado sem digital

| Grupo | Seções | L2 | L2/T | 13 (13+22) na seção | Liberados no 13, faixa (% de L2) | Homog. (13+22) | Forçam 13 | Forçam 22 | Forçam ≥ 10 votos: 13 / 22 | Margem dos não liberados |
|---|---:|---:|---:|---:|---|---:|---|---|---|---|
| Brasil | 497.897 | 15.884.298 | 12,4% | 51,8% | 1,4–98,8 | 52,2% | 14.510 / 13.995 (1,04) | 5.347 / 5.430 (0,98) | 7.603 / 3.669 | −11.147.768 a +19.729.155 |
| **Nordeste** | 140.828 | 4.269.379 | 11,8% | 69,4% | **3,4–99,9** | **70,0%** | **10.121 / 9.640 (1,05)** | **71 / 70 (1,02)** | 5.074 / 48 | **+9.389.649 a +17.555.120** |
| AL | 7.101 | 205.824 | 10,5% | 60,8% | 2,1–100,0 | 63,3% | 294 / 292 (1,01) | 1 / 2 | 149 / 1 | +202.825 a +603.150 |
| BA | 35.476 | 1.154.903 | 12,3% | 71,3% | 4,1–99,8 | 71,9% | 2.838 / 2.675 (1,06) | 33 / 34 (0,97) | 1.495 / 26 | +2.724.925 a +4.912.317 |
| CE | 23.765 | 672.758 | 11,2% | 68,9% | 2,5–100,0 | 70,0% | 1.443 / 1.299 (1,11) | 4 / 5 | 606 / 4 | +1.544.130 a +2.846.621 |
| MA | 18.093 | 410.368 | 9,9% | 69,5% | 3,0–100,0 | 69,7% | 1.246 / 1.217 (1,02) | 4 / 4 | 478 / 2 | +1.168.183 a +1.958.708 |
| PB | 10.712 | 281.701 | 10,3% | 67,5% | 0,7–100,0 | 67,3% | 212 / 181 (1,17) | 1 / 1 | 62 / 0 | +647.162 a +1.205.092 |
| PE | 21.418 | 877.756 | 14,3% | 69,2% | 5,1–99,9 | 69,5% | 2.542 / 2.516 (1,01) | 25 / 21 (1,21) | 1.580 / 14 | +1.408.412 a +3.050.734 |
| PI | 10.225 | 246.365 | 11,0% | 75,9% | 5,4–100,0 | 76,7% | 1.198 / 1.143 (1,05) | 2 / 2 | 532 / 1 | +881.804 a +1.340.723 |
| RN | 8.115 | 264.671 | 11,8% | 65,7% | 0,6–100,0 | 66,0% | 148 / 132 (1,12) | 0 / 0 | 60 / 0 | +411.516 a +935.788 |
| SE | 5.923 | 155.033 | 10,6% | 69,5% | 2,3–100,0 | 69,7% | 200 / 185 (1,08) | 1 / 1 | 112 / 0 | +400.692 a +701.987 |
| Norte | 43.769 | 937.030 | 9,1% | 50,0% | 0,9–99,7 | 50,6% | 770 / 770 (1,00) | 161 / 181 (0,89) | 300 / 82 | −930.786 a +918.035 |
| Centro-Oeste | 38.048 | 993.788 | 10,4% | 40,0% | 0,4–99,6 | 40,4% | 187 / 183 (1,02) | 251 / 361 (0,69) | 120 / 107 | −2.856.448 a −885.738 |
| Sudeste | 203.237 | 7.389.540 | 14,0% | 47,2% | 0,8–97,9 | 47,9% | 3.230 / 3.220 (1,00) | 3.383 / 3.398 (1,00) | 2.006 / 2.678 | −9.929.826 a +4.431.872 |
| Sul | 72.015 | 2.294.561 | 12,3% | 37,4% | 0,1–98,7 | 38,9% | 202 / 183 (1,11) | 1.481 / 1.420 (1,04) | 103 / 754 | −6.820.357 a −2.290.134 |

Votos forçados (Σmin), observado × esperado:
- **Nordeste:** 145.702 no 13 contra 142.925 esperados (+2.777; frac ≥ 0,000). No 22, 2.344 contra 2.696.
- **Brasil:** 217.969 no 13 contra 220.147 esperados (frac ≥ 0,985, ou seja, **abaixo** do esperado). No 22, 140.684 contra 136.568.

### Linha de base: 1º turno

| Grupo | Def. | L | 13 (13+22) na seção | Faixa (% de L) | Homog. (13+22) | Forçam 13 | Forçam 22 | Margem dos não liberados |
|---|---|---:|---:|---|---:|---|---|---|
| Brasil | L1 | 5.120.302 | 49,0% | 0,2–99,8 | 49,1% | 748 / 688 (1,09) | 172 / 120 (1,44) | −7.332.211 a +2.857.793 |
| **Nordeste** | L1 | 1.545.091 | 67,4% | 0,5–99,9 | 68,6% | **628 / 523 (1,20)** | 18 / 19 (0,93) | +9.551.926 a +12.607.407 |
| Sul | L1 | 929.302 | 34,2% | 0,0–99,3 | 33,8% | 9 / 14 | **135 / 78 (1,73)** | −5.962.686 a −4.113.669 |
| Brasil | L2 | 15.282.583 | 49,0% | 0,6–98,0 | 49,3% | 6.726 / 6.496 (1,04) | 4.072 / 4.119 (0,99) | −17.102.645 a +12.620.376 |
| **Nordeste** | L2 | 4.064.707 | 67,4% | 1,5–99,9 | 68,1% | **4.389 / 4.111 (1,07)** | 71 / 70 (1,01) | +7.039.072 a +14.895.116 |

No 1º turno, a faixa cobre todos os votos (13, 22, outros, brancos e nulos). Só 13 e 22 contam na parcela.

## Nordeste em destaque

- **Fato, faixa:** no 2º turno, entre 1,0% e 100,0% dos 1.794.975 liberados L1 do Nordeste votaram no 13 (entre 18.046 e 1.794.151 eleitores). Em L2, entre 3,4% e 99,9% dos 4.269.379 (145.702 a 4.266.391). A pergunta "foram majoritariamente para o 13?" **não tem resposta determinística**: tanto 10% quanto 95% são compatíveis com cada BU.
- **Fato, ponto homogêneo:** se votaram como a própria seção, foram cerca de 70% para o 13 (70,5% em L1, 70,0% em L2, entre 13 e 22).
  - É 1,1 ponto (L1) e 0,6 ponto (L2) acima do Nordeste inteiro (69,4%).
  - **Composição:** os liberados estão um pouco mais nas seções que votam mais no 13.
  - Em todas as UFs do Nordeste, o ponto homogêneo dá maioria ao 13: de 63,3% (AL) a 76,7% (PI) em L2.
- **Fato, seções forçadas:** 1.811 seções do Nordeste obrigam votos de liberados L1 no 13 e 19 obrigam no 22. A assimetria vem do resultado local:
  - o nulo de permutação, com o resultado de cada seção fixo, já espera 1.635 e 18;
  - o excesso é de 176 seções e 1.570 votos forçados (L1), e de 481 seções e 2.777 votos (L2);
  - é no máximo 0,02% da margem do 13 no Nordeste (13.653.375 votos).
- **Fato, linha de base:** o excesso também existe no 1º turno, e relativamente maior: 1,20 contra 1,11 no 2º turno (L1) e 1,07 contra 1,05 (L2).
- **Fato, simetria:**
  - No Sul, onde o 22 vence, as seções forçadas para o 22 excedem o esperado em 52% (L1, 2º turno) e 73% (L1, 1º turno).
  - No Centro-Oeste e no Norte, as forçadas para o 13 ficam abaixo do esperado (0,45 e 0,83 em L1).
  - O padrão é "seções com muita liberação são um pouco mais unânimes **para o lado que já vence ali**", e não "liberação favorece o 13".
- **Fato, teto de impacto:**
  - Cenário: anular todos os votos de liberados do Nordeste, supondo o pior caso para o 13 (todo liberado votou no 13 sempre que a seção permite).
  - A margem nacional do 13 (4.430.191) cairia no máximo 1.793.470 (L1) ou 4.264.047 (L2).
  - O 13 continuaria à frente por pelo menos **2.636.721** (L1) ou **166.144** (L2) votos.
  - Mesmo nesse caso extremo, a margem dos não liberados no Nordeste fica entre +11,9 e +15,4 milhões (L1) e entre +9,4 e +17,6 milhões (L2). Os liberados não explicam a vitória do 13 no Nordeste.

## Brasil: o que os limites não excluem

- **Fato:** no país, a brecha é maior do que a margem. São 5.841.016 liberados L1 e 15.884.298 L2, contra uma margem de 4.430.191 votos.
  - No pior caso para o 13 (todo liberado do país votou no 13 sempre que possível, e esses votos são retirados), a margem dos não liberados pode ir de −1,40 milhão (L1) ou −11,1 milhões (L2) até +10,2 ou +19,7 milhões.
  - Os limites determinísticos **não excluem** que os votos dos liberados tenham decidido a eleição. Também não excluem que tenham ido em peso para o 22.
  - O Nordeste responde por 31% (L1) e 27% (L2) dessa capacidade. Sozinho, ele não basta para virar o resultado (seção anterior).
- **Hipótese:** no ponto homogêneo, a margem dos não liberados L1 é de cerca de 4,19 milhões (4.430.191 − 240.631). Esse ponto não é medido: é o que H0 prevê.

## Seções extremas (conferidas no arquivo bruto)

Conferidas com `node src/exportar.js --turno 2 --uf <uf> --municipio <m> --zona <z> --secao <s> --stdout`: o BU, o RDV e o log batem com o perfil.

| Seção (2º turno) | Fato no bruto | Leitura |
|---|---|---|
| **BA 34290/0127/0335** (Candeias), UE2013 | BU: 314 votos; 13 = 256, 22 = 51, nulos 7. Detalhamento: 26 sem biometria cadastrada, **7 por biometria**, 281 por dado pessoal. RDV: 314 votos, mesmos totais. Log: 282 eleitores com 4 tentativas de digital sem reconhecimento, `Mesário … habilitou o eleitor` 279 vezes, por 2 mesários (199 e 80) | 89% dos votos liberados por mesário. Mínimo forçado: **221 liberados votaram no 13** (L1). Maior mínimo para o 13 do país em L1 |
| **PR 79111/0086/0218** (Tapejara), UE2013 | BU: 175 votos; 13 = 51, 22 = 117, brancos 2, nulos 5. Detalhamento: 3 / 19 / 153. RDV igual. Log: 146 habilitações por mesário identificado, 142 delas pelo mesmo mesário | Espelho da BA, a favor do 22: mínimo forçado de **88 liberados no 22** (L1) |
| **ES 57932/0009/0130** (Santa Maria de Jetibá), UE2015 | BU: 311 votos; 13 = 56, 22 = 252. Detalhamento: **208 sem biometria cadastrada**, 83 por biometria, 20 por dado pessoal. RDV igual | Mínimo forçado de 169 liberados L2 no 22. A liberação aqui é de quem não tem biometria no cadastro (L2a), não de falha de digital |

- **Fato (perfis do 1º e do 2º turno):** nas seções com falha quase total de digital, o resultado quase não muda entre os turnos.
  - BA 34290/0127/0336, 1º turno: 224 eleitores por biometria, 13 = 80,6% de 13 + 22.
  - Mesma seção, 2º turno: outra urna (número interno 1674389 → 1656722), 4 eleitores por biometria e 243 por dado pessoal. O 13 teve 81,6%.
  - PR 79111/0086/0218: L1 subiu de 13 para 146 e o 13 foi de 26,9% para 30,4%.
  - Uma seção que passou a liberar quase todos pelo mesário manteve o resultado: é o mesmo achado de [biometria-mesarios/05](../biometria-mesarios/05-a9-regressao.md), β = 0,017 entre turnos.
- **Fato:** RS 89770/0088/0113 (L2 = 287 de 294, mínimo de 221 no 22) e SC 81639/0091/0005 (L1 = 189 de 243, mínimo de 152 no 22) ficam no topo do lado do 22. Elas aparecem nos perfis, mas o `exportar.js` não as abre: falta o `aux.json` da coleta. Não foram conferidas no bruto e por isso não são citadas acima como Fato.
- **Recomendação (princípio 8):** seções como BA 34290/0127/0335 e PR 79111/0086/0218 liberaram mais de 80% dos eleitores pela digital de um ou dois mesários. É a brecha no máximo, nos dois lados. Elas devem entrar na lista de casos de [biometria-mesarios](../biometria-mesarios/01-metodo-e-dados.md), qualquer que seja o candidato que venceu ali.

## Hipóteses

- **Hipótese (benigna):** o pequeno excesso de seções forçadas, a favor do lado que vence localmente, vem de seções mais homogêneas (rurais, com sensores ou cadastros biométricos piores) que também concentram falhas de digital. Sem urbano/rural por seção, não dá para testar (a mesma limitação de A9).
- **Hipótese (risco):** um desvio constante nos dois turnos, sempre a favor do lado local, produziria o mesmo padrão. O método determinístico não detecta desvio que fique dentro dos limites, e o ponto homogêneo nunca sai deles. Para isso servem os métodos de estimação ([03](03-regressao-ecologica-por-regiao.md)) e a regressão A9.

## Limites

- Os limites cercam e não estimam. As faixas largas (1–100%) são o resultado honesto do método, não falta de dados.
- O nulo de permutação supõe que a taxa de liberação é trocável entre as seções da mesma zona. Zonas com seções muito diferentes (urbano e rural juntos) podem inflar ou reduzir o esperado.
- "frac ≥" não tem correção para comparações múltiplas (16 grupos × 2 definições × 2 turnos).
- L1 exige que o log e o BU tenham o mesmo número de votos. L2 depende do detalhamento do BU, que o exterior não tem.
- O 1º turno tem outros candidatos. Neles, brancos e nulos absorvem os liberados no cálculo do mínimo, o que deixa menos seções forçadas. Por isso só as razões observado ÷ esperado são comparáveis entre turnos, não as contagens.

## Reprodução

```bash
node scripts/auditoria/liberacao-limites-deterministicos.mjs --turnos 2,1 --reps 200   # ~3 min, lê data/parsed/<t>t/perfil/
node scripts/auditoria/liberacao-limites-tabela.mjs                                     # tabelas em Markdown (todas as UFs do NE e as 8 maiores seções de cada lado)
```

Saídas em `data/parsed/auditoria/liberacao/`:
- `limites-deterministicos.json`: agregados por Brasil, região e UF, para L1, L2, L2a e L2b; a permutação; e as 25 seções com maior mínimo de cada lado;
- `limites-<t>t-<def>-forcadas.csv`: toda seção com mínimo > 0 para algum lado.

A semente fixa (13) torna a permutação reproduzível. Duas execuções deram tabelas idênticas.
