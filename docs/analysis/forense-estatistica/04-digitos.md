# 04. Testes de dígitos: último dígito, 2º dígito de Benford e por que o 1º dígito não serve

`node scripts/auditoria/forense-digitos.mjs 2` → `forense/digitos-2t.json` (frequências observadas e do modelo, χ², valor-p e valor-p de Holm por UF × candidato). Log: `forense/log-digitos-2t.txt`.

**Método.** Votos do 13 e do 22 por seção. χ² com 9 gl por UF e candidato (56 testes por família no 2º turno), Holm–Bonferroni dentro de cada família, α = 0,05. Cada teste tem **dois esperados**: o teórico (uniforme ou Benford) e o de um **modelo sem fraude**, em que os votos de cada seção são sorteados 10 vezes de uma beta-binomial com a taxa e a sobredispersão da zona. O χ² contra o modelo desconta o ruído da simulação (fator 1 + n/n_sim).

**Hipótese nula.** Os dígitos seguem o que contagens honestas, do tamanho das seções brasileiras, produziriam.

## Por que o 1º dígito de Benford não serve (Fato, medido)

A lei de Benford vale para números que se espalham por várias ordens de grandeza. Votos por seção ficam presos entre ~0 e ~400 (o tamanho da seção), então o 1º dígito depende do tamanho das seções e da força do candidato, não da honestidade da contagem. Medido: o modelo **sem fraude por construção** reprova contra Benford no 1º dígito em **56 de 56** testes (Brasil: χ² = 286.706 para o 13), quase o mesmo χ² dos dados reais (297.064). Um teste que reprova dados limpos não detecta fraude (doc 07, D8).

## Resultado, 2º turno (Fato)

| Teste | Significativos após Holm | Brasil 13 | Brasil 22 |
|---|---|---|---|
| Último dígito × uniforme (votos ≥ 100) | 17 de 56 | χ² 347, p 2e−69, desvio médio 0,28 p.p. | χ² 271, p 4e−53 |
| Último dígito × modelo sem fraude | **0 de 56** | χ² 6,8, p 0,65 | χ² 12,9, p 0,17 |
| 2º dígito × Benford (votos ≥ 10) | 52 de 56 | χ² 6.731 | χ² 6.461 |
| 2º dígito × modelo sem fraude | 9 de 56: AL, AM, AP, CE, MG, PA, PB, PI, RJ, **todos do 13** | χ² 8,5, p 0,49 | χ² 18,4, p 0,03 |

- **Último dígito:** a "reprovação" contra a uniforme é um degrau suave (0: 10,5% … 9: 9,6% no Brasil, para o 13) e vem da distribuição das contagens, que cai de 100 a 400 votos. Dentro de cada dezena, o dígito menor tem um pouco mais de seções. O modelo sem fraude reproduz isso: 0 de 56 depois de Holm. Não há sinal de número inventado.
- **2º dígito × Benford:** reprova quase tudo, e o próprio modelo sem fraude também reprova contra Benford. Pelo mesmo motivo do 1º dígito, a 2BL não é a referência certa para seções do tamanho das brasileiras.
- **2º dígito × modelo:** nas 9 UFs, os desvios são ondas suaves de até 2,6 p.p. espalhadas por vários dígitos (AP: +2,6 no 4, −1,8 no 6), sem pico num dígito só. É a forma de erro de ajuste do modelo (beta-binomial única na zona, em estados onde o 13 tem 60–90% com seções muito diferentes), não de número escrito à mão. Só aparece no candidato com parcela alta e desigual nessas UFs.

## Linha de base: 1º turno (Fato, 15 UFs)

Último dígito × modelo: 0 de 30 significativos. 2º dígito × modelo: 10 de 30 (AC/22, AM/13, AP/13, AP/22, BA/13, CE/13, ES/22, MA/13, MG/13, PB/13). 1º dígito do modelo sem fraude × Benford: 30 de 30. O mesmo tipo de desvio já existia no 1º turno e também atinge o 22. Isso reforça que é falta de ajuste do modelo, e não algo do 2º turno.

## Interpretação honesta

- **Fato:** com o nulo certo, o último dígito não tem anomalia em nenhuma UF.
- **Hipótese (inconclusiva):** os desvios do 2º dígito contra o modelo em 9 UFs vêm do ajuste do modelo. Para testar: refazer com um nulo mais flexível (mistura de duas beta-binomiais por zona, ou reamostrar a parcela de cada seção, como no doc 06) e ver se somem.
- Testes de dígitos, mesmo limpos, têm poder baixo contra fraude feita por sistema que altera totais de forma proporcional. Eles pegam sobretudo número inventado à mão.
