# Rastreio — tópico 3 (Linha do tempo da urna)

Índice do que foi retirado de `docs/pericia/03-linha-do-tempo.md` em 30/10/2026, quando o relatório passou a ser um documento independente do processo (premissa do André, CLAUDE.md, seção "Relatório de perícia"). Nenhum número, rótulo ou conclusão mudou; só saíram referências a pareceres, papéis, scripts, comandos, arquivos e links. **Este índice não entra no relatório.**

## Seção "Situação da verificação" (agora "Como os números foram conferidos")

- Itens 1 a 11 sem parecer do `cetico-revisor` (`docs/analysis/cetico-revisor/`).
- Recálculo independente de 29/10/2026: `scripts/auditoria/verifica-pericia-linha-do-tempo.mjs` (lê boletins e perfis dos diários no banco, cópia de leitura, e os perfis completos do 1º turno; não usa as saídas dos scripts do auditor de linha do tempo).
- Casos de exemplo no diário original: `scripts/auditoria/verifica-pericia-linha-do-tempo-bruto.mjs`.
- Item 12: [parecer 28](../cetico-revisor/28-chegada-dos-bus.md), sustentado com ressalvas; o revisor refez as contas do autor e chegou aos mesmos arquivos, byte a byte. O texto usa a "afirmação revisada" do parecer.
- Recontagem do item 12: `scripts/auditoria/grafico-chegada-bu-dados.mjs` (confere minuto a minuto com a conta do autor, 0 diferença, e com os arquivos do parecer).

## Item 2 (Preparação) e item 4 (Volta Redonda)

- Lacres das 5 urnas carregadas no dia e das 20 seções de Volta Redonda: [parecer 24](../cetico-revisor/24-integridade-h04-h11.md) (texto agora diz "conferido por uma segunda verificação independente").

## Item 5 (Ritmo dos votos)

- Programa de leitura com o erro nas 3 seções: função `lerLogs`, em `src/perfil-secoes.js`.
- Governador no 2º turno em 6 UFs: `scripts/auditoria/verifica-pericia-coerencia-topicos.mjs` (e tópico 9).
- "Apareceram 339 intervalos" passou a "foram encontrados 339 intervalos" (só para a busca de conferência não acusar "parecer" dentro de "apareceram").

## Item 7 (Seções abertas até 19h)

- Cópia da decisão do STF (Rcl 101.673/BA): PDF em `data/raw/stf/`, documento "Minuta_ Decisão Liminar".
- Registro da hipótese: `docs/hipoteses.md`, H06.

## Item 10 (Encerramento e emissão)

- RS 89060/0017/0191, atendimento pela metade: [parecer 25](../cetico-revisor/25-votos-sem-log-reconciliacao.md).
- "Os 50 votos": [parecer 08](../cetico-revisor/08-votos-sem-log-contingencia.md) (texto agora remete ao tópico 2).

## Item 11 (Ipixuna-AM)

- O caso foi examinado "a pedido de outro auditor" (frase retirada; o motivo, o boletim, ficou).

## Item 12 (Apuração na noite do 2º turno)

- A hipótese foi levantada por "um auditor" (texto agora: "apresentada à auditoria").
- Estudo original do estatístico eleitoral: [linha do tempo 06](../linha-do-tempo/06-chegada-dos-bus-e-divulgacao.md).
- Revisão: [parecer 28](../cetico-revisor/28-chegada-dos-bus.md) (item 1: registros "Recebido" posteriores e recomendação de perguntar ao TSE; item 7: relógio de MT no 1º turno).
- Arquivo dos dados abertos: `detalhe_votacao_secao`; campos `DT_RECEBIMENTO_BU_HOR_TSE` (registro como recebido) e `DT_PRIM_TOT_PARCIAL_HOR_TSE` (totalização).
- Arquivo de acompanhamento: `aux.json`.
- Dados da tabela hora a hora: `docs/pericia/graficos/dados/chegada-bu-por-hora.csv`.
- Dados minuto a minuto dos gráficos: `docs/pericia/graficos/dados/chegada-bu-por-minuto.csv`; marcos: `docs/pericia/graficos/dados/chegada-bu-marcos.csv`.
- Gráficos: `scripts/auditoria/grafico-chegada-bu.mjs`.

## Contraprova

- "O script deste relatório" = `scripts/auditoria/grafico-chegada-bu-dados.mjs`; compara com a contagem por minuto do autor e com o arquivo do revisor (parecer 28).
- "Princípio 9" = `docs/01-premissas.md`, princípio 9 (universo completo, sem amostra).

## Princípio 8

- Link retirado: [../01-premissas.md](../../01-premissas.md), princípio 8.

## Limites

- Correção pendente do programa de leitura: `src/perfil-secoes.js`.
- "Contagem da coordenação" de votos tardios (34.066 / 1.960 / 33.668): `scripts/h06-votos-apos-17h.mjs`.
- Relógio de MT no 1º turno: [parecer 28](../cetico-revisor/28-chegada-dos-bus.md), item 7; correção das 81 seções em [linha do tempo 07](../linha-do-tempo/07-fuso-mt-1turno.md).

## Seção "Como repetir" (retirada inteira)

```
node scripts/auditoria/verifica-pericia-linha-do-tempo.mjs       # todos os números deste tópico, do universo completo
node scripts/auditoria/verifica-pericia-linha-do-tempo-bruto.mjs --turno 2 --secao uf/municipio/zona/secao [--filtro re] [--de hh:mm --ate hh:mm]   # confere um caso no diário original
```

Item 12 (chegada dos boletins ao TSE):

```
node --max-old-space-size=4096 scripts/auditoria/grafico-chegada-bu-dados.mjs   # reconta seção a seção, confere com o autor e o revisor, grava os CSVs
node scripts/auditoria/grafico-chegada-bu.mjs                                   # gera os dois gráficos
node scripts/auditoria/estatistico-chegada-bu-aux.mjs                           # autor: lê os aux.json
node --max-old-space-size=8192 scripts/auditoria/estatistico-chegada-bu-dados.mjs   # autor: arquivo por seção (secoes.csv)
node --max-old-space-size=8192 scripts/auditoria/estatistico-chegada-bu.mjs         # autor: contagens por minuto e resumo
node --max-old-space-size=8192 scripts/auditoria/cetico-chegada-bu.mjs --replicas 200   # revisor (parecer 28)
```

Saídas: `data/parsed/auditoria/verifica-pericia/linha-do-tempo.json`; item 12 em `docs/pericia/graficos/dados/chegada-bu-*.csv`. Análises originais do auditor de linha do tempo: `docs/analysis/linha-do-tempo/01` a `05` e `scripts/auditoria/tempo-*.mjs`.

## Próximos passos

- "Revisão cética dos itens 1 a 11" (`docs/analysis/cetico-revisor/`); o item 12 já tem o parecer 28.
- "Feito": lacres das 5 + 20 seções pelo [parecer 24](../cetico-revisor/24-integridade-h04-h11.md).
