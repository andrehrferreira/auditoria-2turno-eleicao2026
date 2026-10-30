# 03. H26: linha de base de 2018 e 2022 por zona (30/10/2026)

Pergunta: as zonas que se destacam em 2026 já se destacavam nos 2º turnos de 2018 e 2022? Script: `scripts/auditoria/virada-zonas-historico.mjs` (~3 min). Saídas: `data/parsed/auditoria/virada-zonas/historico-zonas.csv` e `historico.json`. **Aguarda revisão cética.**

## Método

- Fonte: `votacao_candidato_munzona_<ano>_BR.csv` do TSE, 2018, 2022 e 2026. O arquivo só tem votos nominais, sem brancos, nulos nem abstenção.
- Lado medido nos três anos: o 13 (PT) contra o outro finalista (17 em 2018; 22 em 2022 e 2026).
- Esperado: o mesmo de [02](02-resultado.md), com a unidade município × zona e só com os votos nominais do 1º turno. Os candidatos com 2% ou mais no país entram um a um, e os demais, somados. Ajuste por UF. As UFs com poucas unidades usam a região: AC, AP, RO, RR e DF; RO não entra nesse grupo em 2022.
- A zona é a mesma quando a UF e o número coincidem. Das 2.641 zonas de 2026, 2.615 têm o mesmo município principal em 2022 e 2.597 em 2018.

## Conferências (Fato)

| Ano | Zonas | Unidades | Preditores do 1º turno | Virada do 13 no país |
|---|---|---|---|---|
| 2018 | 2.645 | 6.240 | 13, 17, 12, 45, 30, demais | +6,49 p.p. |
| 2022 | 2.637 | 6.283 | 13, 22, 15, 12, demais | −3,43 p.p. |
| 2026 | 2.641 | 6.292 | 13, 22, 70, 14, 55, demais | +5,44 p.p. |

- Os totais do 13 e do 22 de 2026 no `munzona` são iguais aos das seções nos dois turnos.
- Método `munzona` × método por seção ([02](02-resultado.md)) em 2026: correlação de 0,716 entre os z das 2.640 zonas. A diferença vem de o `munzona` não ter brancos, nulos e abstenção.
- Nenhuma linha com coluna fora do lugar nos três arquivos.

## Resultado

**A mesma zona entre os anos** (correlação de Pearson):

| Medida | 2026 × 2018 | 2026 × 2022 | 2022 × 2018 |
|---|---|---|---|
| z da virada além do esperado | 0,288 | 0,028 | 0,213 |
| Virada bruta menos a da UF | 0,374 | −0,063 | 0,324 |

- **Fato:** a geografia da virada de 2026 lembra a de 2018 e quase nada a de 2022. Em 2018, como em 2026, o PT cresceu no 2º turno. Em 2022, quem cresceu foi o adversário. O cientista político achou o mesmo por município (correlação de 0,51 com 2018; [cientista-politico/04](../cientista-politico/04-linha-de-base-historica.md)).

**As caudas de 2026 nos anos anteriores.** Percentil da zona no seu ano: 0 = mais para o rival, 100 = mais para o 13. Por acaso, 10% das zonas de cada grupo cairiam acima de 90 e 10% abaixo de 10.

| Grupo de 2026 | Zonas | Acima de 90 em 2018 | Acima de 90 em 2022 | Abaixo de 10 em 2018 | Abaixo de 10 em 2022 | Percentil mediano 2018 / 2022 |
|---|---|---|---|---|---|---|
| z ≥ 3 para o 13 | 22 | **10** (2,2 por acaso) | 4 | 2 | 1 | 77 / 57 |
| z ≤ −3 para o 22 | 17 | 1 | 6 | 5 | **7** (1,7 por acaso) | 27 / 39 |
| Fora da curva para o 22 | 4 | 1 | 1 | 1 | 2 | 30 / 47 |

- **Fato:** 10 das 22 zonas mais fortes para o 13 em 2026 já estavam entre as 10% mais fortes para o PT em 2018. São elas: Salvador 0003, 0011 e 0014; São Paulo 0020 e 0372; Santos 0118; São Vicente 0340; Campos dos Goytacazes 0075; Ituiutaba 0141; Petrolina 0145.
- **Fato:** no Maranhão, quatro zonas do lado do 22 em 2026 estão abaixo do percentil 4 em 2018 **e** em 2022: Humberto de Campos 0032, Turiaçu 0039, Icatu 0031 e São João Batista 0063. Humberto de Campos foi a segunda zona mais extrema do país em 2022 (percentil 0,04) e a sexta em 2018 (0,19).
- **Hipótese:** as duas caudas de 2026 repetem padrões de zonas que existem desde 2018. A cauda do 13 fica em zonas urbanas onde o PT cresce no 2º turno quando está crescendo. A cauda do 22 no Maranhão fica em zonas rurais onde o comparecimento cai no 2º turno qualquer que seja o lado ([04](04-casos.md)).
- Uma parte das caudas não se repete: São Paulo 0002 era cauda do PT em 2018 e 2022 (percentis 93 e 96) e em 2026 foi para o outro lado. Águas Lindas de Goiás, Lauro de Freitas e Simões Filho não se destacavam antes.

## Limites

- O ajuste por UF com poucas unidades (AC, AP, RO, RR, DF) usa a região.
- Zonas renumeradas entre os anos são comparadas pelo número; 26 a 44 zonas mudaram de município principal.
- Sem brancos, nulos e abstenção, o esperado de 2018 e 2022 é mais simples que o de 2026 por seção.
