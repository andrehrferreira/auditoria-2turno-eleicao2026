# 06. Números e percentuais redondos

`node scripts/auditoria/forense-redondos.mjs 2` → `forense/redondos-2t.json`.

**Método.** (a) Contagens: quantas seções têm votos do 13, do 22, brancos, nulos e comparecimento em múltiplos de 10, 50 e 100. O esperado de cada valor redondo v é a média do histograma em v−2, v−1, v+1 e v+2. (b) Percentuais (Kobak, Shpilkin e Pshenichnikov 2016): seções com parcela ou comparecimento num múltiplo de 5% (± 0,05 p.p.), sem contar 0% e 100%. O esperado vem de reamostrar cada seção com o mesmo n e a mesma parcela (binomial, 20×). Isso já inclui frações simples como 1/2 e 3/4 em seções pequenas.

**Hipótese nula.** Números honestos não preferem valores redondos. Quem inventa número à mão prefere.

## Resultado, 2º turno (Fato)

| Contagem | ×10 obs/esp (z) | ×50 obs/esp (z) | ×100 obs/esp (z) |
|---|---|---|---|
| 13 | 50.046 / 49.917 (+0,6) | 10.088 / 10.016 (+0,7) | 5.566 / 5.532 (+0,5) |
| 22 | 49.741 / 49.676 (+0,3) | 9.681 / 9.738 (−0,6) | 4.273 / 4.274 (0,0) |
| Comparecimento | 50.007 / 49.962 (+0,2) | 9.857 / 9.960 (−1,0) | 5.189 / 5.311 (−1,7) |
| Branco / nulo | déficit (z −25 e −13) | — | — |

| Percentual múltiplo de 5% | Observado | Esperado ± dp | z |
|---|---|---|---|
| Parcela do 13 | 10.972 | 10.894 ± 115 | +0,5 |
| Parcela do 22 | 10.972 | 10.910 ± 98 | +0,4 |
| Comparecimento | 8.548 | 8.608 ± 120 | −0,4 |

- Nenhum excesso de número redondo para os finalistas nem para o comparecimento.
- O "déficit" de brancos e nulos em múltiplos de 10 é um artefato do método: esses números são pequenos (0 a ~30) e o histograma cai em curva. A média dos vizinhos superestima o valor do meio. Não é sinal.

## Linha de base: 1º turno (Fato, 15 UFs)

Sem excesso para o 13 nem para o comparecimento. **22 em múltiplos de 10: 23.218 / 22.655 (razão 1,025, z +3,7).** O excesso está espalhado (12 de 15 UFs positivas, a maior MG com z +2,8) e não aparece no 2º turno nas mesmas UFs (z −0,3). Múltiplos de 50 e 100 do 22 e o percentual redondo do 22 no 1º turno: sem excesso.

- **Hipótese (fraca):** variação ao acaso ou artefato do método de vizinhos numa distribuição de forma diferente no 1º turno, em que o 22 tinha mais votos baixos. Com ~30 testes nesta família, z = 3,7 ainda passa de Bonferroni (p ≈ 0,006), então não dá para descartar. Porém o último dígito do 22 no 1º turno (contagens ≥ 100), que inclui o dígito 0, não tem desvio contra o modelo (doc 04, p = 0,49).
- **Recomendação:** refazer com o 1º turno completo e com o esperado por reamostragem (como no item b), em vez dos vizinhos.

## Interpretação

**Fato:** não há preferência por número redondo no 2º turno. Isso afasta números escritos à mão em escala, mas não diz nada sobre alteração proporcional feita por sistema.
