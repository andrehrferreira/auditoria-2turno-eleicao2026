# Comparação 1º × 2º turno: resultado nacional

Método v2 ([01-metodo.md](01-metodo.md)), rodado em 29/10/2026 sobre o commit `a2da470` mais as mudanças locais em `src/comparar-turnos.js`. **Os alertas são triagem: apontam seções para olhar, não provam nada.**

- Registro completo, uma suspeita por linha com identificador `S00001`…: `data/parsed/comparacao-turnos/suspeitas.jsonl`.
- Por UF: `<uf>.jsonl` (todas as seções) e `<uf>.resumo.json`.
- Totais: `resumo-nacional.json`.
- Para reproduzir: `node src/comparar-turnos.js`.

## Cobertura

499.176 seções comparadas nas 28 UFs (27 + exterior). Ficaram de fora as seções com BU de apuração (29 no exterior, 2 em MG). **13.766 seções com alerta (2,8%)**, e 233 delas tiveram a urna trocada entre os turnos.

| Tipo de alerta | Seções |
|---|---|
| estatístico | 13.766 |
| contábil (migração obrigatória ≥ 10 entre finalistas) | **1** (PI 11878/0028/0099: 22 precisa de 24 eleitores vindos do 13; mesma urna, mesmos mesários) |
| consistência (soma dos votos ≠ comparecimento) | **0**, nos dois turnos, em todas as seções |
| cadastral (aptos da seção mudam > 5) | 0 |

| Métrica com alerta estatístico | Seções |
|---|---|
| `manualSemMesario` (liberação manual com digital não associada a mesário) | 11.341 |
| `residuo13` (ganho do 13 além das fontes líquidas) | 993 |
| `jaVotou` ("eleitor já votou") | 451 |
| `comparecimento` | 431 |
| `ganho13` / `ganho22` | 312 / 216 |
| `semBiometriaCadastrada` | 271 |
| `residuo22` | 4 |

Por UF, a parcela de seções com alerta vai de 0,8% (exterior) a 5,1% (AC). SP: 1.405 de 103.656.

## As de maior pontuação

| ID | Seção | Motivo |
|---|---|---|
| S00001 | SP 67911/0012/0031 | "já votou" 255 abaixo das vizinhas (muitos no 1º turno, poucos no 2º) |
| S00002 | ES 57037/0055/0364 (Vila Velha) | "já votou" 388 acima das vizinhas no 2º turno; caso em [docs/casos](../../casos/es-57037-z0055-s0364.md) |
| S00003 | SP 68977/0219/0482 | resíduo do 13 |
| S00004–S00014 | SP, PI, RJ, MT, SE, AM, CE | "já votou" com variação extrema entre turnos |

O "já votou" em rajada aparece nos dois turnos e nos dois sentidos. A causa mais comum descrita até agora é o mesário redigitando o eleitor anterior ([caso AC 01007/0009/0440](../../casos/ac-01007-z0009-s0440.md)), o que **não** é controle técnico (premissa 8). Precisa de leitura seção a seção.

## O que fica para depois

- Regenerar a comparação depois da correção de `src/perfil-secoes.js`: logs duplicados no pacote e log de outra seção trazido pelo RED, apontados pelo Auditor A em [coerencia-contagem/03](../coerencia-contagem/03-coerencia-interna.md). Isso afeta as métricas de log (`manualSemMesario`, `jaVotou`, `semBiometriaCadastrada`), não os votos, que vêm do BU.
- Ler as 50 primeiras suspeitas no log bruto.
- Calibrar o limiar |z| ≥ 5 por simulação.
