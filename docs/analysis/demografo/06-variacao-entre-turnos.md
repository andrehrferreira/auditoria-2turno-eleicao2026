# 06. Variação do comparecimento entre os turnos nos grupos que costumam faltar

Comando: `node --max-old-space-size=8192 scripts/auditoria/demografo-analise.mjs` (seção `t4_entre_turnos` de `resumo.json`; lista `secoes-variacao-turnos.tsv`).

## Teste

- **Unidade:** a mesma seção principal nos dois turnos, com a mesma composição de agregadas (497.508 pares; a composição não mudou em nenhum). Comparecimento de Presidente do `detalhe_votacao_secao`.
- **Grupos que costumam faltar:** 70+ (voto facultativo), 16–17 (facultativo) e eleitores sem biometria cadastrada (mais velhos, mais mudados e, pela H01, onde estariam os títulos de mortos).
- **Hipótese nula:** a variação Δ = comparecimento 2º − 1º turno não depende da composição da seção, ou depende pouco e de forma suave.
- **Sinal de uso:** subida forte e concentrada onde há muitos idosos ou muitos sem biometria; ou subida da taxa do grupo sem biometria maior que a do grupo com biometria.
- **Explicações que não envolvem fraude:** mobilização de campanha no 2º turno, transporte gratuito, segundo turno estadual na mesma data, clima.

## Resultados (Fato, 29/10/2026)

Δ por seção: mediana +1,9 ponto; p5 −3,0; p95 +5,8; p99 +7,8; máximo +25,9.

| Parcela de 70+ na seção | Seções | Comp. 1º turno | Comp. 2º turno | Δ |
|---|---|---|---|---|
| 0–5% | 110.212 | 80,0% | 81,1% | +1,1 |
| 5–10% | 159.133 | 80,6% | 82,2% | +1,6 |
| 10–15% | 102.730 | 79,9% | 81,9% | +2,0 |
| 15–20% | 63.716 | 78,0% | 80,4% | +2,5 |
| 20–25% | 34.545 | 75,3% | 78,1% | +2,7 |
| 25–30% | 15.938 | 73,1% | 76,0% | +2,9 |
| 30–35% | 6.198 | 71,3% | 74,5% | +3,1 |
| 35–40% | 2.490 | 69,6% | 73,2% | +3,5 |
| 40–45% | 1.196 | 68,7% | 72,6% | +3,9 |
| 45%+ | 1.350 | 66,8% | 71,4% | +4,6 |

Regressão de Δ (R² 0,07): intercepto +0,010; parcela 70+ **+0,068**; parcela 16–17 −0,177; parcela sem biometria +0,016. Desvio-padrão do resíduo: 2,8 pontos.

**Grupo sem biometria (BU, 15 UFs com o 1º turno carregado, 228.090 seções pareadas):**

| | 1º turno | 2º turno | Δ |
|---|---|---|---|
| Sem biometria cadastrada | 48,1% | 49,9% | +1,7 |
| Com biometria | 83,3% | 84,7% | +1,4 |

Por seção (grupo ≥ 20): Δ do grupo sem biometria com mediana +1,8 ponto e desvio-padrão 5,8; 21 seções subiram mais de 30 pontos (lista em `resumo.json`, `sem_biometria.top_subida`).

## Leitura

- **Fato:** o comparecimento subiu mais onde há mais idosos: +4,6 pontos nas seções com 45%+ de 70+, contra +1,1 nas de 0–5%. A subida é **suave e monotônica** ao longo das faixas. Não há salto concentrado.
- **Fato:** no grupo sem biometria, a subida (+1,7) é quase igual à do grupo com biometria (+1,4). Não há sinal agregado de que o caminho "só ano de nascimento" tenha sido usado mais no 2º turno.
- **Fato:** nenhuma seção passou de um limite inferior de comparecimento dos 80+ abaixo de 50% no 1º turno para acima de 80% no 2º.
- **Hipótese (que não envolve fraude):** idosos faltaram mais no 1º turno e foram mais mobilizados no 2º (campanha polarizada; facultativo). O efeito tem o tamanho de poucos pontos e aparece em todas as faixas.
- **Seções atípicas:** 185 seções subiram mais de 4 desvios acima do previsto e 2.358 caíram mais de 4 desvios abaixo. As subidas se concentram em MS (47: Amambai 15, Caarapó 9, Dourados 9, Paranhos 5), BA (41), MG (18) e SP (16). **Hipótese:** em MS, são municípios com grandes aldeias indígenas, onde o comparecimento depende do transporte e oscila muito entre turnos. Isso é contexto para o cientista político, não conclusão. Nas 10 maiores subidas a parcela de 70+ é baixa (0–18%), então a subida não vem dos idosos. No conjunto das 185 ela vai até 48%.

## Recomendação

- Repetir o par sem biometria/com biometria quando o 1º turno estiver completo (PE, PI, PR, RJ, RN, RO, RR, RS, SC, SE, SP e TO ainda não entravam).
- Para as 21 seções em que o grupo sem biometria subiu mais de 30 pontos: ver no log o horário das habilitações `Ano de nascimento digitado é igual ao do cadastro` e se houve rajadas no 2º turno (H05).
