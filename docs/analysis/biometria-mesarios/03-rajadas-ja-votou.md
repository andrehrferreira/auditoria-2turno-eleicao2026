# Rajadas de "O eleitor identificado já votou" sem voto entre elas

**Resposta curta.** Rajadas grandes são raras: no 2º turno, 88 seções em 499.000 têm 10 ou mais `já votou` seguidos sem voto entre eles, e 706 têm 5 ou mais. O 1º turno, lido no mesmo log, tem quantidade parecida: 57 e 871. A maioria começa no fim do dia (40 das 88 entre 16h e 18h locais), sem voto depois, e isso combina com conferência de lista. Em 21 seções a rajada é uma **consulta**: títulos digitados a cada ~10 s, em que quem já votou dá `já votou` e quem não votou abre a habilitação, com foto na tela, e é cancelado em seguida. Isso revela à mesa quem ainda não votou. ES 57037/0055/0364 (70 cancelamentos) e MG 50393/0223/0066 (48) concentram o padrão, que não existe no 1º turno dessas seções. **Não há sinal de uso posterior:** depois das rajadas, o eleitor seguinte é habilitado por biometria em 71–76% dos casos, e a fração sem biometria depois da primeira rajada (15,0%) fica perto da de antes (13,7%).

## Hipótese nula e definições

- **Rajada:** sequência de eventos `O eleitor identificado já votou` sem nenhum `O voto do eleitor foi computado` entre eles. Recusas de outro tipo no meio não quebram a sequência.
- **H0:** rajadas resultam de redigitação, eleitor de volta e conferência de lista. Sob H0, elas não se concentram e não são seguidas de liberação sem biometria acima da taxa da seção.
- **Risco testado (H05/H-b):** alguém usa a urna para achar títulos que ainda não votaram e depois vota por eles. Sob H-b, espera-se habilitação aberta e cancelada dentro da rajada, seguida de mais votos sem biometria.
- Pela premissa 8, "o mesário conferiu o caderno" não explica nada. Só conta o que o log registra.

## Distribuição nacional (Fato, 29/10/2026; `biometria-rajadas.mjs`)

| Maior rajada da seção | 2º turno (25/10) | 1º turno (04/10, mesmo log) |
|---|---|---|
| 0 | 425.786 | 430.643 |
| 1 | 60.042 | 49.114 |
| 2–4 | 12.466 | 16.583 |
| 5–9 | 618 | 814 |
| 10–19 | 64 | 42 |
| 20–49 | 23 | 11 |
| 50 ou mais | 1 (ES 57037/0055/0364, 59) | 4 (máximo SP 67911/0012/0031, 243) |

- `já votou` no total: 113.929 (2º turno) e 118.929 (1º). Desses, 39.510 e 57.246 vêm até 60 s depois de um voto: redigitação do eleitor que acabou de votar ([caso AC 0440](../../casos/ac-01007-z0009-s0440.md)).
- Seções com rajada de 5 ou mais nos dois dias: 40 de 497.211. O padrão quase nunca se repete na mesma seção, o que pesa contra treinamento ou hábito local fixo.
- SP 67911/0012/0031, no 1º turno: 243 títulos seguidos, todos `já votou`, das 17:00:43 às 17:41:37, depois do último voto. É conferência depois do fim da votação, sem como virar voto.
- Hora de início da maior rajada nas 88 seções com 10 ou mais: 08–11h 12; 12–15h 36; 16–17h 40.
- **Concentração (2º turno, rajada de 5 ou mais):** SP 71072/0373, com 9 seções de 499 (0,7 esperada; p = 6 × 10⁻⁸); BA 34436/0066, 4 de 185; MG 46175/0128, 3 de 74. Fora isso, o padrão se espalha. O p não tem correção para múltiplas zonas (6 mil).

## O eleitor seguinte (Fato)

| Tamanho da rajada | Biometria | Ano de nascimento | Manual com mesário | Manual sem associação | Sem voto depois (fim do dia) |
|---|---|---|---|---|---|
| 1 | 72,1% | 5,8% | 4,0% | 2,2% | 15,9% |
| 5–9 | 47,2% | 4,2% | 4,0% | 3,9% | 40,7% |
| 10–19 | 70,8% | 2,8% | 2,8% | 0 | 23,6% |
| 20–49 | 76,3% | 5,3% | 5,3% | 0 | 13,2% |
| Todos os votos do país | 87,3% | 6,0% | 4,6% | 2,2% | — |

Entre os votos que vêm depois, a parte sem biometria não sobe com o tamanho da rajada.

## Padrão de consulta (Fato; `biometria-rajadas-alvo.mjs`, 144 seções com rajada de 10 ou mais num dos dias)

- 2º turno: 88 seções, 2.640 atendimentos dentro de rajadas, 2.396 `já votou`, 2.554 por título. Dentro das rajadas, 181 habilitações foram **abertas e canceladas** sem voto (165 com `Foto do eleitor apresentada`), em 21 seções.
- Votos dessas seções antes da primeira rajada: 13,7% sem biometria (4.332 de 31.526). Depois: 15,0% (592 de 3.931). No 1º turno das mesmas seções: 13,9% (4.774 de 34.467).

| Seção | Consulta no 2º turno (`já votou` / canceladas) | 1º turno | Sem biometria antes → depois |
|---|---|---|---|
| ES 57037/0055/0364 | 345 / 70 em 13 rajadas | sem rajada | 7% → 6% |
| MG 50393/0223/0066 | 144 / 48 em 8 rajadas | sem rajada | 7% → 10% |
| SP 65110/0211/0049 | 54 / 17 | sem rajada | 8% → 11% (9 votos) |
| PE 23817/0106/0215 | 35 / 11 | sem rajada | 14% → 10% |
| CE 15377/0009/0064 | 63 / 10 | sem rajada | 17% → (2 votos) |

**Conferência no log bruto (MG 50393/0223/0066, 25/10, Fato).**
- 265 `já votou`, 113 `Habilitação cancelada durante confirmação de dado do eleitor` e 418 `Foto do eleitor apresentada`, para 309 votos. No 1º turno da mesma urna: 2 `já votou`.
- Trecho das 13:59:27 às 14:00:24: títulos a cada 10 s, cada um dá `já votou`. Às 14:00:08 um título abre a habilitação com foto e é cancelado 5 s depois. A rajada maior (44) vai das 13:59 às 14:15.
- Cada uma das 16 rajadas de 5 ou mais termina num eleitor habilitado **por biometria**.

## Leitura

- **Fato:** em 21 seções, a urna foi usada para consultar se eleitores já tinham votado. O log não grava o número digitado, então não se sabe se foram títulos diferentes ou o mesmo repetido. Os cancelamentos com foto mostram que eram títulos de eleitores aptos que ainda não tinham votado.
- **Hipótese (risco):** saber quem não votou é o primeiro passo de H05. Nas seções conferidas, o passo seguinte, votar no lugar sem biometria, não aparece em escala: a fração sem biometria depois quase não muda, e o eleitor seguinte é biométrico. Mas cada caso pode ser um voto. O log não liga o título consultado ao voto seguinte.
- **Hipótese (benigna, técnica):** busca de eleitores que faltaram (lista de ausentes), feita pela mesa na urna em vez do caderno. Pela premissa 8, isso não absolve. Só explica o padrão.
- **Recomendação:** encaminhar ES 57037/0055/0364 e MG 50393/0223/0066 para apuração de campo (MPE/TRE), com o caderno de votação: quem assinou e em que ordem. Perguntar ao TSE se a consulta repetida de títulos sem voto é prevista e se a aplicação limita isso.
