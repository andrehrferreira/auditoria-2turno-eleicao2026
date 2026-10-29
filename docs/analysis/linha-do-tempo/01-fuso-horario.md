# 01. Fuso horário por município (2º turno, 25/10/2026)

Auditor C (linha do tempo). Base para todos os testes de horário (doc 07: A2, A10, B3; hipóteses H06 e H08).

## Método

- O log e o BU usam o relógio **local** da urna (doc 06). A votação vai das 8h às 17h **de Brasília** em todo o país (Fato: nenhuma seção encerrou antes das 17h de Brasília, ver [02](02-votos-apos-17h.md)).
- Diferença local − Brasília de cada município = hora local mais frequente de `Urna pronta para receber votos` − 8.
- Comando: `node scripts/auditoria/tempo-perfil.mjs --turno 2` → `data/parsed/auditoria/tempo/2t/fuso-municipio.csv` e `resumo.json` (campo `fuso`).

## Resultado

**Fato (29/10/2026, 499.207 seções com BU; 497.896 com log e fuso conhecido):**

| Diferença para Brasília | Onde | Seções |
|---|---|---|
| −2 h | AC (22 municípios, todas as 2.270 seções às 06h locais) e 11 municípios do AM: Guajará, Atalaia do Norte, Benjamin Constant, Eirunepé, Envira, Ipixuna, Jutaí, São Paulo de Olivença, Amaturá, Itamarati, Tabatinga | 2.270 + 556 |
| −1 h | AM (outros 51 municípios), MS, MT, RO, RR | 7.600 + 7.106 + 8.287 + 4.698 + 1.519 |
| +1 h | Fernando de Noronha (PE 30015) | 13 seções às 09h locais |
| 0 | demais UFs | resto |

- Nenhuma UF tem horário de verão em 25/10/2026 (todas as urnas abrem na hora esperada).
- Dentro de cada município, a hora modal vale para quase todas as seções. As exceções são aberturas atrasadas, não outro fuso: 88 seções abriram 1 h ou mais depois das 8h de Brasília (18 depois das 10h; a pior, MG 46477/0134/0295, às 13:08; ver [04](04-linha-do-tempo-da-urna.md)).
- **Exterior (ZZ):** 1.310 seções. 1.279 abrem às 08h e 2 às 09h **locais**: a urna usa a hora do país. O repositório não tem tabela país → fuso, então a diferença para Brasília fica **sem fuso conhecido em 1.281 seções**. As outras 29 têm tipo de urna 3 (`contingencia`, BU de apuração) e não registram `Urna pronta`. No relógio local, o exterior teve 417 votos depois das 17h em 252 seções, e 3 encerramentos às 18h locais.

**Hipótese:** a lista dos municípios do AM com −2 h confere com a lei federal de fusos (Lei 12.876/2013) **[a confirmar]**. A lista acima é empírica: vem do relógio configurado na carga da urna. Boca do Acre, Lábrea e Pauini aparecem com −1 h.

## Recomendações

1. O exemplo A2 do doc 09 converte o horário pela UF inteira. Para o AM e para Fernando de Noronha, use o `fuso-municipio.csv`; sem ele, 556 seções do AM e 13 de Noronha ficam com o horário errado em 1 h.
2. Para o exterior, montar a tabela cidade → fuso (IANA) e conferir com o `recebido_tse` do aux (hora de Brasília), antes de qualquer teste de horário em ZZ.
