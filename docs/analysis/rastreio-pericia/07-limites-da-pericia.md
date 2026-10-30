# Rastreio: docs/pericia/07-limites-da-pericia.md

Índice do que saiu do tópico 7 do relatório na reescrita de 30/10/2026 (relatório independente do processo, regra em CLAUDE.md, seção "Relatório de perícia"). Este arquivo **não** entra no relatório. Versão anterior completa: `git show f33a89f:docs/pericia/07-limites-da-pericia.md`.

Convenção da reescrita: "parecer do revisor cético N" virou "segunda verificação independente"; "conferido nesta revisão" ficou (é a recontagem de `scripts/auditoria/verifica-pericia-07-limites.mjs` e `verifica-pericia-coerencia-topicos.mjs`).

## Situação (cabeçalho)

- Pareceres: `docs/analysis/cetico-revisor/` (todos os citados abaixo).
- Recontagem "conferido nesta revisão": `scripts/auditoria/verifica-pericia-07-limites.mjs`.

## Por que este tópico existe

- Link retirado: `docs/01-premissas.md` (princípios 8 e 9).

## Como foi feito

- Item 1: "pareceres do revisor cético" → `docs/analysis/cetico-revisor/`.
- Item 3: simulação de poder feita pelo revisor cético (pareceres 01, 03, 06/27, 10).
- Item 4: links retirados: `docs/analysis/integridade-nacional/06-riscos-fora-da-criptografia.md` (riscos fora da criptografia) e `docs/analysis/engenheiro-seguranca-urna/01-matriz-ataques.md` (matriz de ataques do engenheiro de segurança, sem parecer cético).
- Item 5: recontagem com a cópia de leitura do banco e os perfis por seção, por `scripts/auditoria/verifica-pericia-07-limites.mjs`.

## Tabela 1 (coluna "Fonte" virou "Onde ler mais")

| Linha | O que saiu |
|---|---|
| Arquivos de todas as urnas | `scripts/auditoria/verifica-pericia-coleta.mjs --rehash`; `data/manifest/<turno>/resumo.json` |
| Lacres 2º turno | `docs/analysis/cetico-revisor/24-integridade-h04-h11.md` (parecer 24); `node scripts/auditoria/integridade-lacres.mjs --turno 2`; `node src/lacres.js <pasta da seção>` |
| Soma dos boletins, Presidente, 2º turno | `docs/analysis/cetico-revisor/05-h10-crescimento-cabe-no-disponivel.md` (parecer 05); `node scripts/h03-bu-x-oficial.mjs 2` |
| O mesmo, 1º turno | "lido direto do CSV do TSE", "por outro script" (tópico 8: `scripts/bu-x-oficial-1t-presidente.mjs`); parecer 05 (389.857 seções, 25 UFs); `node scripts/auditoria/verifica-pericia-coerencia-topicos.mjs --turno 1` |
| Boletim = registro dos votos | `scripts/auditoria/verifica-pericia-07-limites.mjs` (entrou "Tópico 2" como onde ler mais) |
| Boletim × oficial por município e zona | `node scripts/auditoria/verifica-pericia-coerencia-munzona.mjs --turno 2` |
| Boletim × oficial, todos os cargos, 1º turno | `docs/analysis/cetico-revisor/26-h03-1turno-todos-cargos.md` (parecer 26); `node scripts/auditoria/matematico-h03-1turno.mjs` |
| Boletim × oficial, campos de comparecimento, 2º turno (Pendente) | `docs/analysis/coerencia-contagem/01-bu-x-oficial.md` |
| Mais votantes que aptos | `docs/analysis/cetico-revisor/10-a7-comparecimento-alto-sem-digital.md` (parecer 10); `node scripts/auditoria/contagem-a7.mjs --turno 2` (entrou "Tópico 2") |
| Conta da virada | parecer 05 |
| Menor intervalo | `docs/analysis/linha-do-tempo/03-intervalos-minimos.md` (entrou "Tópico 3, item 5") |
| Votos depois das 17h | `node scripts/auditoria/verifica-pericia-linha-do-tempo.mjs`; `docs/analysis/linha-do-tempo/02-votos-apos-17h.md`; `scripts/h06-votos-apos-17h.mjs` (a conta de 34.066, agora "uma segunda conta") |
| Títulos 100+ sem pessoa | `docs/analysis/cetico-revisor/02-centenarios-excesso-cadastro.md` (parecer 02) |
| 100+ que votaram no 1º turno | `docs/analysis/cetico-revisor/03-centenarios-nao-votam.md` (parecer 03) |
| Exterior sem digital | `docs/analysis/biometria-mesarios/07-exterior-sem-biometria.md` (entrou "Tópico 4") |
| Número de título fora do papel de mesário | `docs/analysis/cetico-revisor/29-h09-sigilo.md` (parecer 29) |

"O que estes fatos não provam": pareceres 24 e 05 (`docs/analysis/cetico-revisor/05-h10-crescimento-cabe-no-disponivel.md`).

## Tabela 2 (coluna "Rótulo e fonte" virou "Rótulo")

| Linha | O que saiu |
|---|---|
| Balanço entre turnos | parecer 05 |
| Eleitor a mais com e sem digital | `docs/analysis/cetico-revisor/27-h05-28ufs.md` (parecer 27, sustentado com ressalvas); "substitui o parecer 06" (agora "a verificação anterior, de 25 UFs") |
| Títulos 100+ no 2º turno | parecer 03 (estimativa aproximada do limite) |
| "Sem biometria" acima do cadastro | `docs/analysis/cetico-revisor/01-b1a-sem-biometria-acima-do-cadastro.md` (parecer 01 e sua errata) |
| Comparecimento alto sem digital | parecer 10 (estimativa estatística) |
| Municípios com mais eleitores que moradores | `docs/analysis/cetico-revisor/04-eleitorado-acima-populacao.md` (parecer 04, estimativa de modelo) |
| Teste de Integridade | `docs/analysis/teste-integridade/01-poder-de-deteccao.md` |

## Tabela 3

- Título específico votou: link `docs/04-hipotese-titulos-falecidos.md` ("doc 04", consulta por CPF; agora "a consulta por CPF prevista no plano da auditoria").
- Totalização: parecer 24; link `docs/07-checklist-auditoria.md`, item C3.
- Votos sem nenhuma linha no log: `docs/analysis/cetico-revisor/08-votos-sem-log-contingencia.md` (parecer 08) e `docs/analysis/cetico-revisor/25-votos-sem-log-reconciliacao.md` (parecer 25).

## Riscos que dependem de pessoas

- Liberação por ano de nascimento: fonte era `docs/07-checklist-auditoria.md`, item B1b (o rótulo ficou só "**Fato**").
- Domicílio eleitoral: parecer 04.
- Teste de Integridade: `docs/analysis/teste-integridade/01-poder-de-deteccao.md`.

## Contraprova

- Parecer 27 (28 UFs, 20 rodadas; "resultado qualitativo do autor" virou "do teste original"); comandos `scripts/auditoria/cetico-h05-28ufs.mjs 20` e `cetico-h05-28ufs-covariaveis.mjs`.
- Parecer 03; `scripts/auditoria/cetico-centenarios-poder.mjs`.
- Parecer 01 e errata; `scripts/auditoria/cetico-b1a-poder.mjs`.

## Limites deste tópico

- Item 1: `scripts/auditoria/verifica-pericia-07-limites.mjs` e `scripts/auditoria/verifica-pericia-coerencia-topicos.mjs`.
- Item 3: "engenheiro de segurança" (agora "matriz de ataques à urna"): `docs/analysis/engenheiro-seguranca-urna/01-matriz-ataques.md`.

## Seção "Como repetir" (retirada inteira)

```
node --max-old-space-size=8192 scripts/auditoria/verifica-pericia-07-limites.mjs # conferência dos números marcados "conferido nesta revisão"
node src/lacres.js data/raw/2t/urnas/ac                                       # lacres do AC, 2º turno (tópico 1)
node src/lacres.js data/raw/1t/urnas/ac --data 2026-10-04                     # lacres do AC, 1º turno
node scripts/h03-bu-x-oficial.mjs 2                                          # boletins × oficial, 2º turno (tópico 5)
node --max-old-space-size=4096 scripts/auditoria/cetico-h10-consolidacao.mjs # balanço entre turnos e boletins × oficial no 1º turno (parecer 05)
node --max-old-space-size=8192 scripts/auditoria/verifica-pericia-coerencia-topicos.mjs --turno 1 # boletins × oficial, 1º turno completo
node --max-old-space-size=6144 scripts/auditoria/cetico-h05-28ufs.mjs 20     # voto do eleitor a mais e simulação de poder, 28 UFs (parecer 27)
node --max-old-space-size=6144 scripts/auditoria/cetico-h05-28ufs-covariaveis.mjs # o resultado com cada característica da seção (parecer 27)
node --max-old-space-size=4096 scripts/auditoria/cetico-centenarios-poder.mjs  # poder do teste dos títulos de 100+ (parecer 03)
node scripts/auditoria/cetico-b1a-poder.mjs                                  # poder do teste "sem biometria" acima do cadastro (parecer 01)
node scripts/auditoria/contagem-a7.mjs --turno 2                             # comparecimento acima dos aptos (parecer 10)
```

## Próximos passos

- Lacres do 2º turno: parecer 24.
