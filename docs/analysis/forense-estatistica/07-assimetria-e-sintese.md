# 07. Assimetria entre candidatos e síntese

`node scripts/auditoria/forense-assimetria.mjs 2` (depois dos docs 02, 03 e 05) → `forense/assimetria-2t.json`.

**Método.** Para cada classe de anomalia: quantas favorecem o 13 e quantas o 22, comparado com (i) a parcela nacional do 13 nos válidos (51,79% no 2º turno), com valor-p binomial bilateral exato, e (ii) o esperado do modelo nulo do próprio teste, quando existe. O nulo (i) é ingênuo: as anomalias não se distribuem como o voto, porque aldeias e presídios não são uma amostra do país. Por isso o (ii) é o que importa.

## Resultado, 2º turno (Fato)

| Classe | 13 | 22 | Fração 13 | Esperado no modelo (13 / 22) |
|---|---|---|---|---|
| A3: 100% dos válidos | 106 | 4 | 0,96 | 8,0 / 4,1 |
| A3: 100%, só seções comuns | 45 | 4 | 0,92 | 5,9 / 2,8 |
| A4: ≥ 90% | 6.899 | 384 | 0,95 | 4.664 / 615 |
| A4: ≥ 90%, só comuns | 6.153 | 366 | 0,94 | 4.477 / 560 |
| A4: surpreendentes (Bonferroni) | 125 | 7 | 0,95 | — |
| Klimek: canto ≥ 95% × ≥ 95% | 64 | 2 | 0,97 | 6,6 / 0,1 |
| Klimek: canto ≥ 90% × ≥ 90% | 761 | 90 | 0,89 | 271 / 27 |
| Klimek: zonas com r > 0,5 | 20 | 69 | 0,23 | ~0 / ~0 |
| z ≥ 5 acima da zona, bruto | 715 | 135 | 0,84 | — |
| z ≥ 5 acima da zona, com controles | **318** | **325** | **0,49** (p = 0,25) | — |
| Comparecimento z ≥ 5: seção vencida por | 35 | 5 | 0,88 | 26,4 / 13,6 (pela zona) |
| Comparecimento z ≥ 5 com controles | 17 | 3 | 0,85 | 13,4 / 6,6 |

**1º turno (15 UFs, parcela do 13 = 54,35%):** A3 30 × 1; A4 2.893 × 84 (modelo 1.419 × 214); canto 95/95 22 × 0; z com controles 252 × 206 (p = 0,81); comparecimento z ≥ 5 23 × 16 (modelo 19,7 × 19,3).

## Leitura

- **Fato:** as anomalias de **concentração** (100%, ≥ 90%, canto de Klimek) favorecem o 13 muito acima do esperado, nos dois turnos. No 1º turno, nas mesmas 10 UFs, o excesso relativo ao modelo foi **maior** (1,85×) que no 2º (1,46×).
- **Fato:** essa assimetria some quando se controla o perfil do eleitorado (z com controles: 318 × 325) e fica concentrada em aldeias, quilombos e presídios (doc 02). A assimetria das zonas com r > 0,5 vai para o outro lado (22: 69 × 13: 20), concentrada no Sul.
- **Fato:** comparecimento extremamente alto (z ≥ 5) aparece mais em seções vencidas pelo 13 (35 × 5) do que a composição das zonas prevê (26 × 14). São 40 seções pequenas. As 12 com 100% foram conferidas no arquivo e têm voto dividido. É uma diferença pequena em número absoluto, mas é a assimetria que **não** foi explicada pelos controles nesta rodada.
- **Hipótese:** a concentração do 13 vem de comunidades homogêneas (voto em bloco) já presentes no 1º turno. Para refutar: a mesma assimetria deveria aparecer em 2022 nas mesmas seções. Se aparecer, é padrão regional estável. Se for nova, vira item de investigação.

## Síntese dos seis testes (2º turno, presidente)

| # | Teste | Resultado | Rótulo |
|---|---|---|---|
| 1 | A3/A4 | 110 seções com 100% (106 do 13), 7.283 com ≥ 90%. Acima da beta-binomial para o 13 (6.899 × 4.664), abaixo para o 22 (384 × 615). Concentrado em aldeias, quilombos e presídios, e estável desde o 1º turno | Fato (contagem); explicação benigna = Hipótese forte |
| 2 | Klimek | Sem comparecimento > 100%, sem segundo aglomerado em (100, 100), correlação dentro da zona fraca (r = −0,08 para o 13). Cauda pequena de comparecimento alto pendendo para o 13 (1.214 seções ≥ 94%) | Fato; a cauda é Hipótese a explicar |
| 3 | Dígitos | Último dígito: 0 de 56 contra o modelo sem fraude. 2º dígito: 9 de 56 contra o modelo (desvios suaves, também no 1º turno). 1º dígito de Benford inválido (o modelo limpo reprova 56 de 56) | Fato; 2º dígito = Hipótese de desajuste do modelo |
| 4 | z na zona | 850 extremos brutos (715 a favor do 13); com controles, 318 × 325, simétrico. 40 de comparecimento alto, conferidos | Fato |
| 5 | Redondos | Sem excesso no 2º turno (z entre −1,7 e +0,7). 1º turno: 22 ×10, z +3,7, espalhado | Fato; o caso do 1º turno é Hipótese fraca |
| 6 | Assimetria | Concentração favorece o 13; com controles, simétrico; Klimek r > 0,5 favorece o 22 | Fato |

**Conclusão honesta.** Nenhum dos seis testes mostra a assinatura estatística clássica de fraude em larga escala (enchimento de urna, números inventados, números redondos). As anomalias que aparecem estão nos lugares onde a geografia e o perfil do eleitorado as explicam, e se repetem no 1º turno. O arquivo assinado pela urna confere com o banco em todas as 25 seções extremas checadas. Isso **não prova** que não houve fraude: estes métodos não detectam alteração pequena e espalhada, nem fraude que preserve as distribuições (por exemplo, voto de terceiro liberado sem biometria em proporção ao voto local, que é objeto de H02 e H05 nos logs). E anomalia estatística, onde existe, também não prova fraude.

## Pendências

1. Rodar de novo o 1º turno com todas as UFs (estavam 15 de 28) e comparar seção a seção (D5).
2. Comparar com 2022 nas mesmas seções (repositório de 2022), principalmente as 110 seções com 100% e a cauda de comparecimento alto.
3. Ipixuna-AM 0045/0063 (aldeia Piau): 22 caiu de 61 para 2 entre os turnos. Encaminhar ao auditor de logs (doc 02).
4. CE 15989/0055/0160: lacre não conferido por erro de leitura do certificado ("DER: comprimento ausente"). Encaminhar a H04.
5. Nulo mais flexível para o 2º dígito (doc 04) e reamostragem para os redondos do 1º turno (doc 06).
6. Controle de renda (Censo por setor) para as zonas do Sul com r > 0,5 para o 22, e categorização de aldeias por coordenada (terras indígenas, quilombos).
7. Governador (2º turno em 12 UFs) não foi testado. Os mesmos scripts servem, trocando o cargo em `forense-base.mjs`.
