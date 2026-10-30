# Rastreio: docs/pericia/09-padroes-estatisticos.md

Índice do que saiu do tópico 9 do relatório na reescrita de 30/10/2026 (relatório independente do processo, regra em CLAUDE.md, seção "Relatório de perícia"). Este arquivo **não** entra no relatório. Versão anterior completa: `git show f33a89f:docs/pericia/09-padroes-estatisticos.md`.

## Situação (cabeçalho)

- Fonte da análise: `docs/analysis/forense-estatistica/01` a `07`.
- "Ainda não há parecer do revisor cético sobre este tópico (`docs/analysis/cetico-revisor/`)" → "ainda não passou pela segunda verificação independente".
- Recontagem independente: `node scripts/auditoria/verifica-pericia-09-padroes.mjs` (cópia de leitura do banco e brutos do TSE) e `node scripts/auditoria/verifica-pericia-09-conferencia.mjs` (arquivos das urnas).
- 1º turno: `node --max-old-space-size=4096 scripts/auditoria/t15-padroes-estatisticos.mjs` (agora "refeitos numa revisão posterior").

## Que dados foram usados

- "Script do autor": `node scripts/auditoria/forense-base.mjs 2`.

## O que foi encontrado

| Trecho | O que saiu |
|---|---|
| Enchimento de urna, comparecimento por seção | `node scripts/auditoria/forense-klimek.mjs 2` → `data/parsed/auditoria/forense/klimek-2t.json`; gráfico `klimek-2t-13.svg` (não está em `docs/pericia/graficos/`) |
| Números inventados | `node scripts/auditoria/forense-digitos.mjs 2` → `data/parsed/auditoria/forense/digitos-2t.json` |
| Números redondos | `node scripts/auditoria/forense-redondos.mjs 2` → `data/parsed/auditoria/forense/redondos-2t.json` |
| Seções com 90% a 100% | `node scripts/auditoria/forense-a3a4.mjs 2` → `data/parsed/auditoria/forense/a3a4-2t.json` e `a3a4-2t-secoes.csv` |
| Seções muito diferentes da zona | `node scripts/auditoria/forense-zscore.mjs 2` → `data/parsed/auditoria/forense/zscore-2t.json` e `zscore-2t-cauda.csv`; problema do z com perfil apontado por `scripts/auditoria/cetico-forense-reproducao-zctrl.mjs` ("script do revisor cético", "código do autor") |
| Para que lado pendem | `node scripts/auditoria/forense-assimetria.mjs 2` → `assimetria-2t.json` |

## Comparação com o 1º turno

- `node --max-old-space-size=4096 scripts/auditoria/t15-padroes-estatisticos.mjs` → `data/parsed/auditoria/t15/09-padroes-estatisticos.json`.

## Seções conferidas no arquivo da urna

- `node scripts/auditoria/forense-conferir.mjs 2 <seção>` → `conferencia-2t.json`; refeito por `node scripts/auditoria/verifica-pericia-09-conferencia.mjs`.
- Seção do CE (zona 55, seção 160): `docs/analysis/cetico-revisor/24-integridade-h04-h11.md`, item 2 (parecer 24); `data/parsed/auditoria/integridade/2t/reverificacao.jsonl`, de `node scripts/auditoria/integridade-reverificar.mjs --turno 2`.

## Verificação dos próprios testes

- "As simulações dos scripts do autor usam semente fixa" → "da primeira análise".

## Seção "Como repetir" (retirada inteira)

```
node scripts/auditoria/forense-base.mjs 2 && node scripts/auditoria/forense-base.mjs 1
node scripts/auditoria/forense-eleitorado.mjs perfil && node scripts/auditoria/forense-eleitorado.mjs local
for t in 2 1; do
  for s in a3a4 klimek digitos zscore redondos; do node scripts/auditoria/forense-$s.mjs $t; done
  node scripts/auditoria/forense-assimetria.mjs $t
done
node scripts/auditoria/forense-conferir.mjs 2 <uf/município/zona/seção> ...
```

Conferência independente (não usa os scripts nem os arquivos intermediários do autor):

```
node --max-old-space-size=8192 scripts/auditoria/verifica-pericia-09-padroes.mjs
node scripts/auditoria/verifica-pericia-09-conferencia.mjs
```

Saídas em `data/parsed/auditoria/forense/` (autor) e `data/parsed/auditoria/verifica-pericia/` (conferência). Detalhes técnicos em `docs/analysis/forense-estatistica/01-dados-e-metodo.md`.

## Próximos passos

- Item 1: "parecer do revisor cético" → segunda verificação independente.
- Item 7: parecer 24 (recomendação); correção pendente em `src/lacres.js`, usado por `scripts/auditoria/verifica-pericia-09-conferencia.mjs`.
