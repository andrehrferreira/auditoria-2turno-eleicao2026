# Rastreio — tópico 14 (Outras formas de fraude testadas)

Índice técnico de `docs/pericia/14-outras-formas-de-fraude.md`. **Este arquivo não entra no relatório.** Por enquanto cobre só a atualização de 31/10/2026 da H27 (seções novas). As demais partes do tópico 14 (H18, H19, H20, H21, H22, H23, H24 e o restante da H27) não tinham rastreio próprio quando este arquivo foi criado; os pareceres delas estão em [`docs/analysis/cetico-revisor/`](../cetico-revisor/).

## H27, seções novas (atualização de 31/10/2026)

- Achado: [demografo/11](../demografo/11-secoes-novas-2022-2026.md) (antes: [demografo/08](../demografo/08-secoes-novas-e-h01-2turno.md), item 5).
- Revisão: [parecer 50](../cetico-revisor/50-secoes-novas-2022-2026.md), texto para leigos "Para o tópico 14", que substitui a linha "Pendente: comparar com o comparecimento das mesmas seções em 2022". "Segunda verificação independente" = parecer 50.
- Trechos alterados no tópico 14:
  - Cabeçalho (Situação): frase sobre a atualização de 31/10/2026.
  - Resposta curta, H27: frase das seções novas.
  - "Como foi feito": universo (resultado por seção de 2018, 2020 e 2022 e perfil por seção de 2022 e 2026) e item 6.
  - Item 6, "Fato (seções novas)": definição corrigida para "não existiam em 2022 nem em 2024" (igual ao tópico 6); três Fatos, três Hipóteses e um Pendente novos. A Hipótese antiga ("seção nova tem eleitorado recente, sem eleitores que morreram ou se mudaram") foi substituída pelas três do parecer 50.
  - Contraprova da H27: duas fontes para o comparecimento de 2026 e o total de 2022 em dois arquivos.
  - Pendentes, Pedidos ao TSE (item "Seções novas (H27)", igual ao pedido 10 do tópico 6) e Próximos passos.
- Ficou fora (Estimativa): os mesmos itens listados no rastreio do tópico 6 (esperados, excessos, razões, decomposição, 2,2 pontos, régua de TTE).

| Número no texto | Fonte |
|---|---|
| 433 de 40.740 novas e 206 de 458.438 antigas com 95%+ (2º turno de 2026) | `data/parsed/auditoria/cetico-revisor/50/cruzamento-resumo.json`, `contagens.2t.2026`; parecer 43 e parecer 50 |
| 118 de 85.893 e 114 de 386.182 (2022); 41 de 81.749 e 171 de 379.447 (2026) | `novas-resumo.json`, `A_2t_bu2026` |
| Local novo: 62 de 4.585 e 16 de 4.302 (2º turno); 100 de 4.603 e 21 de 4.330 (1º turno) | `contagens.{2t,1t}.2022["nova | local novo"]`; `A_{2t,1t}_bu2026.excesso2026mesmasPorLocal2022["local novo"]` (só `novas` e `obs`) |
| 239 com trânsito, 25 só de trânsito, 385 com cadastro todo com biometria | `contagens.2t["2026 TTE"]`, `transito.2026_2t.porTipo`, `contagens.2t["2026 sem biometria no cadastro"]` |
| 6,38%, 9,24% e 6,73% | `B_2t_bu2026.liberacao` e a soma de `secoes-2026.tsv` (comando no rastreio do tópico 6) |
| 499.176 e 499.178 seções iguais nas duas fontes; 156.454.011 | `novas-resumo.json`, `detalhe2026xBU`; `perfil-resumo-2022.json` e `regua2022.*.somaAptos` |

Comandos: os mesmos do rastreio do tópico 6, "Atualização de 31/10/2026: seções novas de 2022 até 2026 (H27)".

```
node scripts/auditoria/cetico-50-perfil.mjs 2022 2026
node --max-old-space-size=6000 scripts/auditoria/cetico-50-novas.mjs
node scripts/auditoria/cetico-50-cruzamento.mjs
```
