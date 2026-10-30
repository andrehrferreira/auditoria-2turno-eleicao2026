# Rastreio de `docs/pericia/00-coleta-completa.md`

Índice técnico do que saiu do texto do tópico 0 quando o relatório passou a ser independente do processo (pedido do André, 30/10/2026). **Este arquivo não entra no relatório.** Nenhum número, rótulo ou conclusão mudou.

## Resposta curta (linha "Fonte")

Texto retirado:

> Fonte: a lista oficial de seções do TSE (`data/raw/<turno>/config/*-cs.json`) cruzada, seção por seção, com a conferência de cada seção (`data/manifest/<turno>/cobertura/`). [...] Detalhes técnicos no [doc 03](../03-coleta-bus-logs.md).

- Lista oficial de seções: `data/raw/<turno>/config/*-cs.json`.
- Conferência de cada seção: `data/manifest/<turno>/cobertura/`.
- Detalhes técnicos da coleta: [`docs/03-coleta-bus-logs.md`](../../03-coleta-bus-logs.md).
- Entrou a frase "Cada número desta página foi recontado por uma segunda verificação independente, feita com programa próprio sobre todas as seções dos dois turnos". A segunda verificação é `scripts/auditoria/verifica-pericia-coleta.mjs` (comandos abaixo, com `--rehash`).

## De onde vieram os arquivos

- "a lista oficial do que deveria existir lá (o `aux.json`)" virou "(aqui chamada de lista oficial da seção)". O arquivo é o `aux.json` de cada seção, no endereço público da seção no portal do TSE.

## Limites

- "a lista oficial de cada seção (`aux.json`)" virou "a lista oficial de cada seção". Mesmo arquivo.

## Como repetir (seção retirada, texto integral)

```
node src/coleta.js --turno 2          # baixa, extrai e confere (doc 03)
node src/coleta.js --turno 1
node scripts/auditoria/verifica-pericia-coleta.mjs --turno 2 --rehash   # recontagem independente deste tópico
node scripts/auditoria/verifica-pericia-coleta.mjs --turno 1 --rehash
```
