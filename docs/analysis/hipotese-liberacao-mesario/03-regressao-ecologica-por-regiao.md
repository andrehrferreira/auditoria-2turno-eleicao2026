# 03. H13: regressão ecológica por região (os liberados sem biometria votam mais no 13?)

Estatístico eleitoral, 29/10/2026. Presidente: 2º turno (13 × 22, 25/10/2026). Linha de base: 1º turno (04/10/2026). Rótulos: **Fato** (sai do script abaixo), **Hipótese**, **Recomendação**. Este trabalho amplia o A9 do Auditor B ([biometria-mesarios/05](../biometria-mesarios/05-a9-regressao.md)). O A9 regride a parcela do 13 na taxa de liberação. Aqui o modelo é o de contagem por grupo, que estima o voto de cada grupo: liberados e biométricos.

## Resposta curta

- **Fato.** Sem controle nenhum, a regressão diz que os liberados votam muito mais no 13 do que os biométricos. No Nordeste a diferença é de +18 pontos (L2) e de +42 pontos (L1). Com L1 a regressão chega a dar ao 13 **109% dos votos dos liberados**, o que é impossível.
- **Fato.** Comparando seções da mesma zona e com o mesmo perfil de eleitorado, a diferença no Nordeste cai para **+0,8 ponto [−0,5; +2,1] (L2)** e **−0,5 ponto [−1,8; +0,8] (L1)**. Os dois intervalos contêm zero. A mesma conta no 1º turno dá +1,3 e +0,5. A variação do 1º para o 2º turno é −0,5 e −0,9.
- **Fato.** O resultado se mantém por região. Fora do Nordeste, os liberados votam **menos** no 13 do que os biométricos da mesma zona e perfil: −3,1 pontos no país (L2) e −4,0 (L1).
- **Hipótese.** A diferença bruta é quase toda **efeito de lugar e de perfil**. Os liberados se concentram onde todo mundo vota mais no 13. O teste não acha voto extra para o 13 vindo dos liberados acima do que o perfil explica, nem no Nordeste nem num aumento do 1º para o 2º turno. Uma fraude espalhada por igual numa zona inteira ficaria escondida no efeito de zona (ver Limites).

## Pergunta, hipótese nula e o que é confirmatório

- **H13 (do usuário):** os votos dos eleitores liberados sem biometria pelo mesário foram majoritariamente para o 13, principalmente no Nordeste.
- **O que separa fraude de perfil.** Os liberados votarem mais no 13 não é, por si só, sinal de fraude. Eles são mais idosos, de menor escolaridade e se concentram no Nordeste, um perfil que já vota mais no 13. O teste relevante é se os liberados votam no 13 **acima** do que explicam a zona, o perfil do eleitorado e os biométricos da mesma seção.
- **H0:** com efeito fixo de zona e os controles de perfil, a diferença condicional de parcela do 13 entre liberados e biométricos é zero.
- **Princípio 8 (doc 01).** A liberação pelo mesário é uma brecha a medir. Nenhum procedimento humano entra como explicação benigna. Os controles aceitos são só demográficos (cadastro do TSE) e geográficos (zona).
- **Confirmatórios, declarados antes de rodar (4 testes, Bonferroni sobre 4):** no Nordeste, diferença condicional M2 do 2º turno = 0, para L1 e para L2; variação do 2º para o 1º turno = 0, para L1 e para L2.
- **Exploratórios:** os demais 82 testes (Brasil, 5 regiões e 9 UFs do Nordeste, cada um × 2 definições × {2º turno, 1º turno, 2º − 1º}). Ao todo são **86 testes**, com Bonferroni e Benjamini-Hochberg sobre os 86. Eles servem para gerar hipótese, não para confirmar.

## O limite que não some: o voto é secreto

O log registra **como** cada eleitor foi habilitado, mas não registra o voto. O RDV embaralha os votos e não liga voto a eleitor. Por isso o voto dos liberados **não é observado**. Ele só pode ser estimado por inferência ecológica: comparar seções com mais e menos liberados e supor que o comportamento de cada grupo é parecido entre as seções comparadas. Tudo abaixo é estimativa de modelo, não contagem.

## Dados e definições

| Item | Fonte | 2º turno | 1º turno |
|---|---|---|---|
| Seções usadas (BU completo, ≥ 20 votantes, com perfil, sem exterior) | banco, cópia de leitura `eleicao2026-20261029T092711.sqlite` | 497.500 | 338.804 (22 UFs: faltam RS, SC, SE, SP, TO) |
| Comparecimento | `secao.comparecimento` | 127.800.643 | 84.706.950 |
| **L2** = `sem_biometria` + `por_biografia` (todo habilitado sem digital) | BU | 15.879.844 (12,4%) | 10.638.069 |
| **L1** = `habilitados_pelo_mesario` ("Mesário … habilitou o eleitor" e o voto computado) | log (`perfil_log`) | 5.839.375 (4,6%), 497.499 seções | 3.443.090, 330.471 seções (21 UFs: falta AM) |
| Biométricos = `por_biometria` | BU | 111.920.799 | 74.068.881 |
| Votos 13 e 22 | `voto_bu`, `cargo = 1`, nominal | 64.023.501 / 59.634.008 | 39.512.302 / 35.563.623 |
| Perfil do eleitorado (cadastro de julho/2026) | `perfil_eleitor_secao_2026_<UF>.zip` via `forense/perfil/<uf>.csv`, com as agregadas somadas à principal | | |
| Local indígena/quilombola | `forense/locais.csv` + `categoria()` de `forense-lib.mjs` | | |

- **Fato.** No banco, L1 nunca passa de L2 (0 seções inconsistentes) e `dado_pessoal_confere` = `por_biografia` no total (8.632.446 × 8.632.488). L1 é uma parte do `por_biografia`: a liberação manual com digital de mesário identificado.
- **Fato.** O log do 1º turno da BA não está no banco. Ele veio da varredura do Auditor B, que lê o dia do 1º turno no log cumulativo do 2º turno, só quando a urna é a da mesma seção. Para validar: no 2º turno, a classe "mesário identificado" da varredura é **igual** a `habilitados_pelo_mesario` nas 35.457 seções da BA.
- No modelo L1, os outros habilitados sem digital (L2 − L1) formam um terceiro grupo, à parte. Nos dois modelos, a referência são os biométricos.

## Modelo

Para cada seção *s*, candidato *c* ∈ {13, 22} e comparecimento *n*:

```
v_c / n = α_zona + Σ_g d_{c,g} · (G_g / n) + γ_c' X + erro      (mínimos quadrados ponderados por n)
```

- Isso equivale ao modelo de contagem `votos_c = a_c·liberados + b_c·biométricos + controles`, com variância proporcional a *n*. `d = a − b` é a diferença de parcela entre o grupo e os biométricos da mesma seção.
- **M0** é o Goodman puro, sem controle e com intercepto. **M1** acrescenta efeito fixo de zona (uf/município/zona). **M2** acrescenta, além da zona, os controles: % sem biometria no cadastro, % com 60 anos ou mais, % de 16 a 24, % de escolaridade baixa, % com superior, % indígena, % quilombola, log do eleitorado, local indígena e local quilombola. **M2s** é o M2 sem o % sem biometria cadastrada (teste de sensibilidade, ver Limites).
- **Parcela de cada grupo:** a média, ponderada pelo tamanho do grupo, da parcela prevista na seção do próprio grupo. A parcela entre 13 + 22 é a₁₃ / (a₁₃ + a₂₂).
- **Decomposição:** a diferença total (liberados − biométricos) se divide em duas partes. A **condicional** compara liberados e biométricos na mesma seção e com o mesmo perfil. É a única que poderia indicar voto anômalo. A de **composição** mede o quanto os liberados estão em seções que já votam mais no 13.
- **Incerteza:** bootstrap por município, com 1.000 réplicas e semente 2026. Os municípios são sorteados com reposição e as zonas ficam dentro do município. O sorteio é o mesmo para os dois turnos e para todos os modelos. Isso dá intervalo de confiança também para as diferenças entre turnos e entre modelos. O valor-p vem da aproximação normal com o erro-padrão do bootstrap.

## Resultados (Fato, salvo indicação)

Os números estão em pontos percentuais de parcela do 13 entre os votos em 13 + 22. A coluna em negrito é a diferença condicional, liberados − biométricos. A parcela do 22 é o complemento, então todo sinal vale invertido para o 22.

### L2: todo habilitado sem digital (BU)

| Subconjunto | Liberados no 2º turno (% do comparecimento) | Parcela do 13 (13+22): liberados × biométricos, M2 | Bruta M0 | Zona M1 | **Zona + controles M2 [IC 95%]** | M2 sem % sem biometria cadastrada | 1º turno, M2 [IC 95%] | 2º − 1º, M2, mesmas UFs [IC 95%] |
|---|---|---|---|---|---|---|---|---|
| **Brasil** | 15.879.844 (12,4%) | 49,7% × 52,1% | +9,0 | +2,6 | −3,1 [−5,1; −1,1] | −10,3 | −2,0 [−3,9; −0,2] | −0,3 [−0,8; +0,2] |
| **Nordeste** | 4.266.835 (11,8%) | 70,7% × 69,2% | +18,1 | +7,3 | **+0,8 [−0,5; +2,1]** | −1,4 | +1,3 [−0,1; +2,6] | −0,5 [−1,1; +0,2] |
| Norte | 936.732 (9,1%) | 50,2% × 50,0% | +19,8 | +5,7 | −0,5 [−4,1; +3,3] | −1,8 | +0,0 [−4,5; +5,4] | −1,3 [−3,9; +1,1] |
| Centro-Oeste | 993.513 (10,4%) | 45,3% × 39,4% | +10,1 | +11,3 | +5,8 [+2,3; +9,3] | +1,6 | +4,7 [+1,3; +8,2] | +1,1 [−0,6; +2,8] |
| Sudeste | 7.388.865 (14,0%) | 43,2% × 47,9% | +10,4 | −3,9 | −5,8 [−8,6; −2,6] | −14,1 | −5,1 [−7,7; −2,2] | −1,0 [−1,8; −0,1] |
| Sul | 2.293.899 (12,3%) | 35,0% × 37,8% | +33,4 | +7,5 | −4,7 [−7,4; −2,2] | −2,2 | −2,1 [−5,4; +0,7] | −1,9 [−4,3; +0,3] |
| AL | 205.753 (10,5%) | 63,4% × 60,5% | +72,8 | +7,9 | +0,1 [−3,6; +4,2] | +2,3 | +1,3 [−1,7; +5,5] | −1,2 [−5,0; +1,8] |
| BA | 1.154.721 (12,3%) | 71,5% × 71,3% | +19,0 | +5,8 | −0,5 [−2,3; +1,5] | −1,3 | +0,1 [−1,6; +2,0] | −0,6 [−1,4; +0,4] |
| CE | 672.732 (11,2%) | 74,1% × 68,3% | +43,6 | +14,1 | +4,6 [+0,7; +7,2] | −0,5 | +6,0 [+2,1; +8,3] | −1,4 [−3,3; +0,6] |
| MA | 409.837 (9,9%) | 71,7% × 69,3% | +7,8 | +10,9 | +2,3 [−2,3; +5,3] | −1,0 | +0,8 [−3,6; +3,9] | +1,5 [−0,6; +3,5] |
| PB | 281.162 (10,3%) | 71,4% × 67,0% | −7,9 | +10,7 | +4,7 [+0,3; +7,0] | +2,1 | +3,3 [−2,3; +5,9] | +1,4 [−0,7; +4,3] |
| PE | 877.009 (14,3%) | 71,9% × 68,8% | +4,5 | +3,3 | +3,0 [+0,3; +5,6] | −3,4 | +3,1 [+0,3; +5,9] | −0,1 [−1,6; +1,3] |
| PI | 246.195 (11,0%) | 74,5% × 76,1% | +26,9 | +6,1 | −2,5 [−6,3; +1,8] | −5,3 | −2,6 [−7,3; +2,5] | +0,1 [−2,7; +2,8] |
| RN | 264.666 (11,9%) | 64,5% × 65,9% | +16,2 | +8,9 | −1,8 [−5,9; +4,4] | +1,7 | −3,1 [−8,1; +4,8] | +1,3 [−2,3; +4,2] |
| SE | 154.760 (10,6%) | 69,6% × 69,5% | +5,1 | +6,4 | −0,1 [−4,4; +8,4] | −0,2 | – | – |

### L1: habilitados pelo mesário (log)

| Subconjunto | Liberados no 2º turno (% do comparecimento) | Parcela do 13 (13+22): liberados × biométricos, M2 | Bruta M0 | Zona M1 | **Zona + controles M2 [IC 95%]** | M2 sem % sem biometria cadastrada | 1º turno, M2 [IC 95%] | 2º − 1º, M2, mesmas UFs [IC 95%] |
|---|---|---|---|---|---|---|---|---|
| **Brasil** | 5.839.375 (4,6%) | 48,5% × 52,1% | +15,6 | +0,1 | −4,0 [−5,5; −2,5] | −7,9 | −2,8 [−4,4; −1,3] | −0,4 [−1,1; +0,3] |
| **Nordeste** | 1.793.877 (4,9%) | 69,9% × 69,2% | +42,4 | +9,3 | **−0,5 [−1,8; +0,8]** | −2,1 | +0,5 [−1,0; +1,8] | −0,9 [−1,8; +0,0] |
| Norte | 385.794 (3,7%) | 46,7% × 49,9% | −17,9 | +1,8 | −2,7 [−7,4; +1,6] | −4,2 | −2,7 [−8,1; +3,1] | −0,6 [−3,9; +2,8] |
| Centro-Oeste | 425.741 (4,4%) | 41,2% × 39,3% | −1,1 | +0,6 | +2,0 [−1,2; +5,4] | −1,5 | +1,6 [−1,0; +4,7] | +0,3 [−2,0; +2,6] |
| Sudeste | 2.218.908 (4,2%) | 42,1% × 47,9% | −2,6 | −4,9 | −5,9 [−7,8; −3,8] | −10,2 | −5,5 [−7,9; −2,8] | −0,3 [−1,7; +1,3] |
| Sul | 1.015.055 (5,4%) | 31,4% × 37,7% | −4,7 | −3,6 | −6,2 [−8,9; −3,7] | −5,1 | −2,2 [−5,6; +0,9] | −2,4 [−5,3; +0,2] |
| AL | 96.549 (4,9%) | 65,0% × 60,5% | +136,4 | +9,7 | +0,3 [−4,0; +4,5] | +1,5 | +2,5 [−1,2; +6,6] | −2,2 [−6,2; +1,3] |
| BA | 441.493 (4,7%) | 69,9% × 71,2% | +23,8 | +4,3 | −2,2 [−4,1; −0,4] | −3,0 | −1,5 [−3,4; +0,4] | −0,7 [−1,9; +0,7] |
| CE | 307.274 (5,1%) | 73,4% × 68,2% | +73,0 | +19,7 | +3,1 [−0,5; +5,8] | −0,4 | +6,2 [+2,5; +8,4] | −3,1 [−5,4; −0,7] |
| MA | 169.739 (4,1%) | 68,8% × 69,3% | −1,1 | +7,1 | −0,4 [−5,1; +2,4] | −2,9 | −1,0 [−6,3; +2,2] | +0,6 [−2,1; +3,5] |
| PB | 147.186 (5,4%) | 70,9% × 67,0% | +5,6 | +15,0 | +3,7 [−0,5; +5,8] | +1,7 | +3,1 [−2,7; +5,9] | +0,6 [−1,9; +4,1] |
| PE | 283.625 (4,6%) | 72,6% × 68,7% | +61,3 | +10,3 | +2,3 [−0,1; +5,0] | −0,8 | +2,8 [+0,3; +6,0] | −0,5 [−2,4; +1,3] |
| PI | 138.526 (6,2%) | 74,5% × 76,1% | +44,9 | +8,1 | −3,0 [−7,1; +1,2] | −5,0 | −3,7 [−8,8; +1,6] | +0,6 [−2,5; +4,1] |
| RN | 135.317 (6,1%) | 65,4% × 65,9% | +37,0 | +11,9 | −1,3 [−4,8; +4,6] | +1,0 | −3,0 [−8,4; +6,2] | +1,6 [−3,4; +5,2] |
| SE | 74.168 (5,1%) | 67,6% × 69,5% | +0,4 | +3,7 | −1,9 [−6,2; +7,1] | −2,7 | – | – |

Notas: "–" quer dizer sem 1º turno no banco. No 1º turno de AM não há log (só L2). Não há BU de SE no 1º turno.

### Nordeste em destaque

- **A H13 descritiva é verdadeira, e trivial.** Os liberados do Nordeste votam no 13 em cerca de 70% (70,7% em L2 e 69,9% em L1, pela estimativa M2). Mas os biométricos da mesma região também votam 69,2%. A maioria pelo 13 é a da região, não a dos liberados.
- **A H13 de excesso não se sustenta.** Comparando com os biométricos da mesma zona e do mesmo perfil, a diferença fica entre −1,8 e +2,1 pontos (IC 95%, as duas definições). Em votos, o saldo 13 − 22 atribuível aos liberados acima dos biométricos (M2) é de **+66.304 [−38.139; +176.908] (L2)** e **−17.062 [−61.473; +26.408] (L1)**. Para comparar: a margem nacional do 2º turno nesta amostra é de 4.389.493.
- **Quanto da diferença bruta some.**
  - L2: dos +18,1 pontos do Goodman puro, o efeito de zona leva 60% (fica +7,3). Os controles demográficos levam mais 36 pontos percentuais da diferença original, sobrando +0,8. **Somem 96% ao todo.**
  - L1: dos +42,4 pontos, a zona leva 78% (fica +9,3) e os controles levam o resto (−0,5). **Somem 101%.**
  - A diferença total M2 se divide entre composição e parte condicional. Em L2, os +1,5 são +0,7 de composição e +0,8 condicionais. Em L1, os +0,8 são +1,3 de composição e −0,5 condicionais.
- **Linha de base.** No 1º turno, nas mesmas UFs, a diferença condicional é +1,3 (L2) e +0,5 (L1). A variação de 2º − 1º é **−0,5 [−1,1; +0,2]** e **−0,9 [−1,8; +0,0]**: a diferença não cresce no 2º turno. Isso repete, com outro modelo, o que o A9 achou na variação dentro da mesma seção (β = 0,017).
- **Testes confirmatórios (Bonferroni sobre 4).** 2º turno L2: z = 1,16, p = 0,25. 2º turno L1: z = −0,75, p = 0,45. Variação de turno L2: z = −1,34, p = 0,18. Variação de turno L1: z = −2,12, p = 0,034 (0,14 com a correção), e no sentido **contrário** ao da H13. Nenhum rejeita H0.
- **UFs (exploratório).**
  - Os intervalos M2 positivos estão em CE (L2 +4,6), PB (L2 +4,7) e PE (L2 +3,0). A BA tem um negativo (L1 −2,2).
  - **Nenhuma UF do Nordeste passa por Bonferroni no 2º turno.**
  - O CE é o caso mais forte, e ele é **maior no 1º turno** (L1 +6,2 e L2 +6,0, os dois passam por Bonferroni sobre 86) do que no 2º (L1 +3,1 e L2 +4,6). Pela premissa 8, ser maior no 1º turno não absolve. Mas não é o padrão de quem frauda o 2º turno.
- **Grupo "outros sem digital" no modelo L1** (ano de nascimento e liberação manual sem mesário associado; exploratório): no Nordeste, M2 dá +2,4 pontos [+0,8; +4,0]. É o resíduo de L2 − L1, sem teste declarado, e fica como hipótese para a frente de cadastro.

### Fora do Nordeste (exploratório)

- **Fato.** No Sudeste, no Sul e no país, os liberados votam **menos** no 13 do que os biométricos da mesma zona e perfil. Sudeste: L2 −5,8, L1 −5,9. Sul: −4,7 e −6,2. Brasil: −3,1 e −4,0. Esses são 7 dos 9 testes que passam por Bonferroni sobre 86. O sinal se repete no 1º turno.
- **Fato.** O Centro-Oeste é a única região com M2 positivo e intervalo acima de zero (L2 +5,8 [+2,3; +9,3]). Ele já aparece no 1º turno (+4,7) e cai para +1,6 em M2s. Não passa por Bonferroni.
- **Hipótese.** Se houvesse fraude via liberação a favor do 13, o esperado seria o mesmo sinal positivo em todo lugar onde o mesário libera. O sinal muda de região para região e é negativo nas que mais liberam (Sudeste, 7,4 milhões em L2). Isso é mais compatível com heterogeneidade de perfil que os controles não captam.

## Coeficientes fora de [0, 1] (falha da suposição ecológica)

- **Fato.**
  - O Goodman puro (M0) dá parcelas impossíveis em L1 no Nordeste. A parcela do 13 entre os liberados sai 105,5% do comparecimento e a do 22 sai −8,6%.
  - Também dá parcelas impossíveis em AL (L1: 182% para o 13 e −85% para o 22), CE, PE, PI e RN, nos dois turnos.
  - Esses números **não são contagem**. Eles mostram que o M0 confunde "seção com mais liberados" com "liberado vota no 13". É a falácia ecológica em estado puro.
  - Por isso a coluna "Bruta M0" serve só para medir quanto o controle tira, não como estimativa do voto dos liberados.
- **Fato.** Com M2, nenhuma parcela agregada sai de [0, 1]. Na seção, a parcela implícita dos liberados sai de [0, 1] em 179 das 497.500 seções do país (L2) e em 58 das 140.653 do Nordeste. A maior concentração é no MA: 76 seções em L2 e 40 em L1, de 18.050. A suposição de diferença constante vale mal ali.

## Seções extremas conferidas no BU bruto (Fato)

São as maiores taxas de L1 no Nordeste com pelo menos 100 votantes (`ecologico-extremas.csv`). Foram conferidas com `node src/exportar.js --turno 2 --uf .. --municipio .. --zona .. --secao .. --log dia --stdout`. O BU bruto bate com o banco nos três casos.

| Seção | Comparecimento | BU: sem biometria / biometria / biografia | L1 (banco; no log bruto, "habilitou" com e sem voto) | 13 × 22 (2º t) | 13 na zona (2 cand.) | 1º turno: biometria / biografia; 13 × 22 |
|---|---|---|---|---|---|---|
| ma/08494 (Paço do Lumiar)/0093/0328 | 195 | 5 / 2 / 188 | 188 (190) | 96 × 92 (51,1%) | 64,2% | 51 / 137; 77 × 91 |
| ce/13510 (Camocim)/0032/0175 | 182 | 3 / 12 / 167 | 167 (170) | 108 × 66 (62,1%) | 70,0% | 6 / 175; 101 × 65 |
| ba/34290 (Candeias)/0127/0335 | 314 | 26 / 7 / 281 | 279 (281) | 256 × 51 (83,4%) | 83,6% | 219 / 39; 210 × 49 |

- **Fato.** Na seção do MA, com 96% dos votantes liberados pelo mesário, os liberados deram **entre 89 e 96 votos ao 13**: 96 menos, no máximo, os 7 votantes que não são L1. Isso é 47% a 51% deles, abaixo dos 64% da zona. Na de Camocim o 13 fica 8 pontos abaixo da zona. Na de Candeias, a liberação manual passou de 39 para 281 do 1º para o 2º turno. A parcela do 13 foi de 81,1% para 83,4%, igual à da zona.
- **Hipótese.** As seções com liberação quase total pelo mesário não votam acima da zona no 13. Elas são casos da brecha do princípio 8 (quase ninguém habilitado por digital) e cabem à frente de biometria (falha de leitor × liberação em massa, `biometria-manual-massa.mjs`). Não são evidência a favor da H13.
- **Fato (ferramenta).** Na seção de Candeias, o `exportar.js` mostra `DER: comprimento ausente` na verificação de lacre. É o defeito de leitura já anotado em [cetico-revisor/08](../cetico-revisor/08-votos-sem-log-contingencia.md), não falha de assinatura.

## Múltiplas comparações

- **Fato.**
  - Foram feitos 86 testes de diferença condicional M2: 15 subconjuntos × 2 definições × {2º turno, 1º turno, 2º − 1º}, menos 4 sem o 1º turno de SE.
  - Passam por Bonferroni (α = 0,05/86): 9 testes. Sete são **negativos** (liberados votam menos no 13): Sudeste L1 2º t, Brasil L1 2º t, Sul L1 2º t, Sudeste L1 1º t, Sudeste L2 2º t, Sul L2 2º t e Sudeste L2 1º t. Dois são positivos e são do **1º turno do CE** (L1 e L2).
  - **Nenhuma variação de 2º − 1º turno passa**, em nenhum subconjunto.
  - Pelo critério de Benjamini-Hochberg a 5%, entram mais 7. Os negativos são Brasil L1 1º t (−2,8), Brasil L2 2º t (−3,1) e CE L1 2º − 1º (−3,1). Os positivos são Centro-Oeste L2 2º t (+5,8), PB L2 2º t (+4,7), Centro-Oeste L2 1º t (+4,7) e CE L2 2º t (+4,6).
- Ajustes de modelo, contados à parte: 4 especificações × 2 definições × 3 amostras (2º turno, 1º turno, 2º turno nas UFs do 1º) × 15 subconjuntos. São 360 ajustes, cada um com 1.000 réplicas.

## Limites

1. **Falácia ecológica.** O modelo supõe que, dentro da zona e com o mesmo perfil, a diferença de voto entre liberados e biométricos é constante entre seções. O voto individual não é observável (RDV embaralhado). O resultado é estimativa de modelo.
2. **O efeito fixo de zona e os controles podem esconder fraude (falso negativo).** Uma fraude espalhada por igual em toda uma zona, ou correlacionada com o perfil (por exemplo, só em zonas rurais pobres), é absorvida por α_zona ou por γ. O teste detecta excesso **dentro da zona**, entre seções com mais e menos liberação. O teto, se nenhum controle demográfico for aceito, é o M1: Nordeste +7,3 (L2) e +9,3 (L1). Em votos, isso daria uma margem extra 13 − 22 de +596.078 [+469.562; +749.436] e +315.822 [+238.323; +395.409]. Esse teto mistura perfil e qualquer efeito real, e **não** é estimativa de fraude.
3. **Sensibilidade ao controle de cadastro.** O % sem biometria cadastrada quase determina `sem_biometria`. Sem ele (M2s), o Nordeste vai a −1,4 (L2) e −2,1 (L1), e o Sudeste a −14,1. A estimativa do país muda até 7 pontos entre M2 e M2s. Isso mostra que a identificação ecológica é frágil fora do Nordeste. No Nordeste, as duas versões ficam entre −2 e +1 ponto.
4. **Faltam renda, urbano/rural e raça confiável por seção.** O cadastro não traz esses dados (A9; [forense-estatistica/01](../forense-estatistica/01-dados-e-metodo.md)). Os controles de escolaridade e idade são substitutos parciais.
5. **Linha de base incompleta.** No 1º turno faltam RS, SC, SE, SP e TO (BU), AM (log), e o log da BA vem da varredura. A variação de 2º − 1º usa só as UFs com os dois turnos. Uma fraude **igual nos dois turnos** não aparece na variação (o mesmo limite do A9).
6. **Valor-p pela aproximação normal** com o erro-padrão do bootstrap. Em UFs com poucos municípios (SE, 75), o intervalo percentil é assimétrico. Ele é o que vale.
7. **Exterior fora:** o BU do exterior não traz o detalhamento ([biometria-mesarios/07](../biometria-mesarios/07-exterior-sem-biometria.md)).

## Leitura

- **Fato.** Os liberados sem biometria votaram majoritariamente no 13 no Nordeste (~70%), como os biométricos da região (69%). No país, a estimativa M2 dá menos de 50% (48,5% a 49,7%).
- **Fato.** Na mesma zona e com o mesmo perfil, a diferença liberados − biométricos no Nordeste é indistinguível de zero nas duas definições. Ela não cresce do 1º para o 2º turno, e fica negativa no Sudeste e no Sul.
- **Hipótese (benigna, demográfica e geográfica).** A associação bruta entre liberação e voto no 13 vem de onde os liberados estão e do perfil deles, não de voto extra.
- **Hipótese (risco, não descartada).** Uma fraude constante nos dois turnos e espalhada por igual numa zona inteira, ou alinhada ao perfil rural pobre, não seria vista por este método. Para ela servem os limites determinísticos por seção (outro método desta pasta) e a análise de rajadas e mesários do Auditor B.
- **Recomendação.**
  - Investigar o CE (excesso de +3 a +6 pontos nos dois turnos) com renda e urbano/rural por local de votação (IBGE por setor censitário).
  - Rodar de novo quando o 1º turno de SP, RS, SC, SE e TO entrar no banco.
  - Tratar as seções com liberação manual quase total (as da tabela acima) na frente de biometria, como brecha do princípio 8. São um tema de falha de leitor ou de procedimento, não de direção do voto.

## Como reproduzir

```bash
node --max-old-space-size=12000 scripts/auditoria/liberacao-ecologico-regressao.mjs --reps 1000 --semente 2026   # ~4 min
```

Requer a cópia de leitura do banco (`src/banco-leitura.js`). Também usa `data/parsed/auditoria/forense/perfil/*.csv` e `locais.csv` (`forense-eleitorado.mjs`) e, para o 1º turno da BA, `data/parsed/auditoria/biometria/varredura/ba.jsonl`.

Saídas em `data/parsed/auditoria/liberacao/`:

- `ecologico-resumo.json`: estimativas, IC, testes com Bonferroni e BH, coeficientes fora de [0, 1], cobertura e descartes;
- `ecologico-tabela.csv`: todas as estatísticas por subconjunto, modelo, definição, especificação e grupo;
- `ecologico-extremas.csv`: as 20 maiores taxas de L1 no Nordeste.

Nas chaves do CSV, `difCond` é a diferença condicional, `difComp` a de composição, `tp` a parcela do 13 entre 13 + 22, `margemExtra` o saldo 13 − 22 implícito, `2tR` o 2º turno restrito às UFs do 1º e `delta2t1t` a diferença 2º − 1º.
