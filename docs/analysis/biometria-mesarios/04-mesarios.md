# Mesários: liberações manuais, mesário em mais de uma seção e fim do dia

**Resposta curta.**
- No 2º turno, 8,63 milhões de votos (6,7%) foram liberados manualmente depois de 4 falhas de digital. Em 2,79 milhões desses, um terço, **a urna não registra quem liberou**: a digital usada não está associada a nenhum mesário.
- Achado principal: **96 seções com liberação manual em massa**, de 50% a 99% dos votos e 23.019 votos ao todo, todas em UE2013 ou UE2015. Em 79 delas a falha começa no primeiro eleitor e dura o dia todo. Em 62 o mesmo ocorre no 1º turno com a mesma urna. O padrão é de sensor ou de digital incompatível, não de falha seletiva, e não se associa a nenhum finalista.
- Mesário registrado em mais de uma seção: 4.826, 92% no mesmo local de votação. Só 60 liberaram eleitores em duas seções.
- Concentração anômala de liberação manual na última hora: 4 seções no país.

## Hipótese nula e premissa

- **H0:** a liberação manual acompanha a falha técnica de leitura, distribuída ao longo do dia e entre seções.
- **Risco (B1/H05):** eleitor substituído. A digital do substituto não confere com a do eleitor, e a mesa libera com dado pessoal e uma digital qualquer. Rastros esperados:
  - falha **seletiva** (biometria normal para os outros eleitores);
  - concentração num horário ou num mesário;
  - `já votou` depois (o eleitor verdadeiro chegando);
  - desvio de voto.
- Pela premissa 8, "mesário conferiu o documento" não conta. Só contam a sequência do log, a hora e o 1º turno da mesma urna.

## Números nacionais (Fato, 29/10/2026; `biometria-mesarios.mjs`)

| | 2º turno | 1º turno (mesmo log) |
|---|---|---|
| Seções | 499.000 | 497.211 |
| Liberação manual, mesário identificado | 5.838.665 | 5.097.613 |
| Liberação manual, sem associação nominal | 2.789.912 | 3.207.171 |
| Ano de nascimento, sem biometria na urna | 7.629.118 | 7.254.242 |
| Maior número de liberações de um mesário na seção: mediana / p99 / máximo | 8 / 36 / 265 | 7 / 33 / 267 |
| Seções com um mesário com 40 ou mais | 2.917 | 1.889 |
| Maior número de um mesário em 10 min: p99 / máximo | 5 / 12 | 4 / 9 |
| Seções com 8 ou mais de um mesário em 10 min | 79 | 4 |
| Parcela do mesário principal (seções com 10 ou mais liberações identificadas): mediana | 0,91 | 0,91 |
| Liberação por título não registrado como mesário no dia | 0 | 0 |

- A urna só aceita como "mesário" uma digital registrada no início do dia (0 liberações por título não registrado). A brecha é a outra via: `Digital coletada bate com uma digital gravada após o registro inicial de mesário. Não é possível associar...` e `Não encontrou digital coletada...`. Nela, **qualquer dedo** que a urna gravou serve, e o log não diz de quem é.
## Liberação manual em massa (Fato; `biometria-manual-massa.mjs`)

Critério: 50 ou mais votos e pelo menos 50% liberados manualmente.

| | Valor |
|---|---|
| Seções / votos | 96 / 23.019 |
| Modelo | UE2013 83, UE2015 13 (nenhuma UE2020/2022) |
| UFs | BA 31, SP 11, PR 8, RJ 7, CE 7, PA 6, PE 5, RS 5, SC 4, outras 12 |
| Mesmo padrão (≥ 50% manual) no 1º turno, mesma urna | 62 de 91 |
| No 1º turno abaixo de 20% manual (falha nova no 2º turno) | 16 |
| Primeiro eleitor do dia já sem reconhecimento | 79 de 96 |
| `já votou` no 2º turno, somando as 96 | 18 (para 23.019 votos; a média nacional é 0,09% dos votos, ~21 esperados) |
| Votos 1º → 2º turno nas 91 com 1º turno | 20.672 → 21.792 (+5%) |
| Parcela do 13 menos a mediana da zona | média +0,2 ponto; 52 acima, 44 abaixo |

**Conferência no log bruto (BA 36854/0180/0202, UE2013, 25/10).**
- 348 votos: 11 por biometria, 35 por ano de nascimento, 302 manuais.
- Em cada eleitor, a urna pede a digital 4 vezes, **captura** a imagem (`Capturada a digital`) e não reconhece (`Número de tentativas de reconhecimento do dedo`). Em seguida pede dado pessoal (`Dado digitado confere`) e a digital do mesário.
- A digital do mesário é reconhecida com score 60 a 168, contra 3 a 9 dos outros mesários. Esse mesário habilitou 265 eleitores.
- A mesma zona tem outras 5 seções no padrão (0236, 0280, 0331, 0386, 0547).

**Leitura.**
- **Fato:** a falha é quase universal e começa no primeiro eleitor. Em 2/3 das seções ela se repete no 1º turno com a mesma urna e se concentra nos modelos antigos. Um substituto de eleitor faria a digital falhar só para ele, não para 95% da seção.
- **Fato:** nessas seções, o eleitor verdadeiro não aparece depois em escala (18 `já votou`), o comparecimento acompanha o 1º turno e o voto não se desvia da zona.
- **Hipótese (técnica):** sensor degradado ou incompatível com as digitais do cadastro. A digital do mesário passa porque foi gravada **naquela mesma urna** de manhã, e o batimento é contra poucos registros. Teste: comparar os scores do eleitor (`Digital capturada não corresponde... [score N]`, quando gravados) por modelo e por urna.
- **Hipótese (risco):** nessas seções, a identificação de ~23 mil eleitores ficou só com controle humano: dado pessoal e um mesário. As 16 seções com falha nova no 2º turno são as primeiras a conferir. A mesma urna funcionou no 1º turno.

| Seção (falha nova) | Manual 1º → 2º turno | Parcela do 13: seção / zona |
|---|---|---|
| SP 70750/0174/0447 | 16% → 94% | 0,48 / 0,60 |
| BA 34290/0127/0335 | 14% → 90% | 0,83 / 0,84 |
| GO 96539/0110/0116 | 12% → 88% | 0,40 / 0,45 |
| RJ 58637/0221/0178 | 9% → 87% | 0,46 / 0,46 |
| RJ 60011/0188/0082 | 14% → 85% | 0,65 / 0,53 |
| BA 36854/0180/0175 | 17% → 77% | 0,74 / 0,70 |

Nas 16: 1 `já votou` no 2º turno; votos 3.959 → 4.180; parcela do 13 +0,3 ponto sobre a zona, em média; falha desde o primeiro eleitor em 8. Lista completa em `data/parsed/auditoria/biometria/manual-massa.json`. 11 das 16 já estão entre as suspeitas de [comparacao-turnos](../comparacao-turnos/01-metodo.md), pelo alerta de liberação manual.

## Fim do dia (B1)

- Na última hora antes do encerramento, a liberação manual foi 5,6% dos votos da hora (328.223 de 5,89 milhões). No dia todo, 6,7%: **não há aumento nacional no fim do dia**.
- Seções com mais liberação manual na última hora do que o esperado pela proporção de votos da hora (Poisson, p < 10⁻⁶; 474.146 seções testadas): **4** no 2º turno e 1 no 1º.

| Seção | Modelo | Votos | Manuais no dia | Votos na última hora | Manuais na última hora (esperado) |
|---|---|---|---|---|---|
| RS 87866/0107/0089 | UE2022 | 330 | 15 | 12 | 10 (0,5) |
| SP 64777/0394/0417 | UE2013 | 317 | 86 | 27 | 27 (7,3) |
| RS 87866/0107/0066 | UE2022 | 327 | 14 | 22 | 10 (0,9) |
| CE 15415/0044/0183 | UE2013 | 208 | 31 | 26 | 18 (3,9) |

**Conferência no log bruto (RS 87866/0107/0089 e 0066, mesmo local de votação 1074, UE2022).**
- Entre 16:29 e 17:00, quase todo eleitor teve 4 falhas de digital e foi liberado com `Digital coletada bate com uma digital gravada após o registro inicial de mesário. Não é possível associar a habilitação a um mesário`.
- Ou seja, um dedo gravado pela urna durante o dia, de pessoa não identificada, liberou eleitores em sequência no fim da votação, nas duas urnas.
- Testei a simultaneidade entre as duas urnas: só 1 das 15 liberações manuais da 0089 cai a até 5 s de uma liberação da 0066. Votos coincidentes: 36, para ~37 esperados ao acaso. **Não há sincronia.**
- **Hipótese:** sensor que piorou no fim do dia (calor, sujeira) nas duas urnas, ou mudança de quem operava a mesa. Pela premissa, a identidade de quem liberou não está no log. **Recomendação:** apuração de campo com o caderno das duas seções. Os outros mesários dessas seções podem ser identificados pelo log público.

## A13: mesmo mesário em mais de uma seção no mesmo dia (Fato)

| | 2º turno | 1º turno |
|---|---|---|
| Mesários registrados (pseudônimos distintos) | 1.987.665 | 1.979.140 |
| Registrados em 2 ou mais seções | 4.826 (4.718 em 2; 89 em 3; 17 em 4; 2 em 5) | 7.197 (máximo 10 seções) |
| Todas as seções no mesmo local de votação | 4.457 (92%) | 6.717 |
| Na mesma zona / no mesmo município | 4.802 / 4.804 | 7.119 / 7.138 |
| Em zonas diferentes | 24 | 78 |
| **Liberaram eleitores em 2 ou mais seções** | **60** | 141 |

- **Hipótese (técnica):** mesário de apoio do local, registrado em mais de uma urna. Ser registrado não exige liberar; 98,8% dos repetidos não liberaram em mais de uma seção.
- **Risco:** os 60 que liberaram em duas ou mais seções são o caso em que uma mesma pessoa abriu a brecha manual em urnas diferentes. Os 24 em zonas diferentes pedem explicação. A lista com pseudônimo está no `mesarios-resumo.json` (`a13.exemplos`). O título correspondente se acha no log público da seção.

## Recomendações

1. Pedir ao TSE o critério que permite liberar com digital "gravada após o registro inicial de mesário" sem associação nominal. É a brecha em que o log não identifica ninguém: 2,79 milhões de votos no 2º turno.
2. Inspeção técnica das urnas das 96 seções de liberação em massa, começando pelas 16 com falha nova no 2º turno.
3. Apuração de campo em RS 87866/0107/0066 e 0089, SP 64777/0394/0417 e CE 15415/0044/0183, e nas 60 seções em que um mesário liberou em mais de uma urna.
