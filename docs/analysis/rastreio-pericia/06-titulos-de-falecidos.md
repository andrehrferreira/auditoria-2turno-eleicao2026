# Rastreio — tópico 6 (Títulos de pessoas falecidas)

Índice do que foi retirado de `docs/pericia/06-titulos-de-falecidos.md` em 30/10/2026, quando o relatório passou a ser um documento independente do processo (premissa do André, CLAUDE.md, seção "Relatório de perícia"). Nenhum número, rótulo ou conclusão mudou; só saíram referências a pareceres, papéis, scripts, comandos, arquivos e links. **Este índice não entra no relatório.**

Pareceres que sustentam o tópico: [01](../cetico-revisor/01-b1a-sem-biometria-acima-do-cadastro.md), [02](../cetico-revisor/02-centenarios-excesso-cadastro.md), [03](../cetico-revisor/03-centenarios-nao-votam.md) e [04](../cetico-revisor/04-eleitorado-acima-populacao.md). Achados originais do demógrafo: [../demografo/](../demografo/). Hipótese H01 em [../../hipoteses.md](../../hipoteses.md).

## "O que os arquivos permitem saber"

- Links retirados: [../04-hipotese-titulos-falecidos.md](../../04-hipotese-titulos-falecidos.md) e princípio 8 de [../01-premissas.md](../../01-premissas.md).

## Parte 1 (estoque)

- Perfil do eleitorado: arquivo `perfil_eleitor_secao` (gerado em 14/07/2026).
- Estimativa com mortalidade (fora do relatório): parecer 02.
- Biometria por faixa de idade, recontada em todas as seções: `scripts/auditoria/verifica-pericia-06-titulos-falecidos.mjs` (saída `data/parsed/auditoria/coordenador/verifica-pericia-06.json`).
- Contraprova "Reprodução independente": feita pelo revisor (parecer 02), com `scripts/auditoria/cetico-centenarios-dados.mjs`.

## Parte 2 (uso)

- Comparecimento por idade: `data/raw/dadosabertos/perfil_comparecimento_abstencao/perfil_comparecimento_abstencao_2026.zip` (arquivo `perfil_comparecimento_abstencao`, gerado em 13/10/2026).
- Testes indiretos do 2º turno e simulações: [parecer 03](../cetico-revisor/03-centenarios-nao-votam.md).
- Arame (MA), seção 0070 da zona 0104: apontada antes pelo demógrafo (`docs/analysis/demografo/`).
- Na tabela de comparecimento, "Compareceram" passou a "Votaram" (só para o texto não coincidir com a palavra "parecer" na busca de conferência; o sentido é o mesmo).

## Parte 3 (sem biometria)

- Seções excluídas da conta das 16.011: lista no parecer 01.
- "Na revisão independente, procurou-se no diário..." e "as revisões independentes a fizeram só em amostras" = revisores do parecer 01 (B1a).
- Simulação de votos falsos (28% e 5% das seções): parecer 01, `scripts/auditoria/cetico-b1a-poder.mjs`.

## Fenômeno vizinho (eleitores acima da população)

- "Detalhes no parecer 04"; estimativa de comparecimento dos títulos excedentes: modelo do revisor, [parecer 04](../cetico-revisor/04-eleitorado-acima-populacao.md).
- Fonte: parecer 04.

## Limites

- Frente por CPF: [doc 04](../../04-hipotese-titulos-falecidos.md).

## Pedidos pela LAI

- Item 5: arquivo `perfil_comparecimento_abstencao` do 2º turno.

## Pendente

- Comparecimento oficial dos idosos por município e por biometria, 1º turno: `docs/analysis/demografo/07-comparecimento-oficial-idosos.md` (sem parecer).
- Comparecimento × mortes recentes: `docs/analysis/demografo/05-mortalidade.md`; variação entre turnos: `docs/analysis/demografo/06-variacao-entre-turnos.md` (sem parecer).

## Seção "Como repetir" (retirada inteira; resumida em "Como os números foram conferidos")

Parte 1 (estoque):

```
node scripts/auditoria/cetico-centenarios-dados.mjs                       # lê os arquivos brutos do TSE e do IBGE (10 a 20 min)
node scripts/auditoria/cetico-centenarios-coorte.mjs                      # coorte com mortalidade por idade; concentração por estado e capital
node scripts/auditoria/cetico-centenarios-excesso-consolidacao.mjs        # piso de 148.553 e sensibilidade ao Censo
```

Saídas: `data/parsed/auditoria/cetico/centenarios-dados.json`, `centenarios-coorte.json` e `centenarios-excesso-consolidacao.json`.

Parte 2 (uso):

```
node scripts/auditoria/cetico-centenarios-nao-votam-oficial.mjs           # comparecimento oficial do 1º turno por faixa e município (0,72% e 0,26%)
node scripts/auditoria/cetico-centenarios-nao-votam-reproducao.mjs        # testes indiretos, simulação de uso, caso RJ 0005/0001
node --max-old-space-size=4096 scripts/auditoria/cetico-centenarios-poder.mjs
node scripts/auditoria/cetico-centenarios-nao-votam-consolidacao.mjs      # 14.912 e 29.824 votos esperados com uso de 5% e 10%
```

Saídas: `data/parsed/auditoria/cetico/centenarios-oficial.json`, `centenarios-oficial-municipios.tsv`, `centenarios-reproducao.json`, `centenarios-poder.json` e `centenarios-consolidacao.json`.

Parte 3 (sem biometria):

```
node scripts/auditoria/cetico-b1a-alternativas.mjs                        # 16.011 seções e 36.340 eleitores direto do banco
node scripts/auditoria/cetico-b1a-definicoes.mjs --turno 2                # marca da foto no diário das 378 seções com excesso de 10+, datas da mídia
node scripts/auditoria/cetico-b1a-poder.mjs                               # simulação de votos falsos
```

Saídas: `data/parsed/auditoria/cetico/b1a-*.json`, `b1a-*.jsonl` e `b1a-*.stdout`.

Conferência dos números que os pareceres não refizeram (biometria por faixa de idade, tabela por estado, proporção de homens, casos RJ 0005/0001 e Indaiatuba 0211/0438, estrato das 378 seções):

```
node scripts/auditoria/verifica-pericia-06-titulos-falecidos.mjs          # lê todos os zips do perfil (10 a 20 min)
```

Saída: `data/parsed/auditoria/coordenador/verifica-pericia-06.json`.

## Próximos passos

- "Incluir a análise do comparecimento oficial dos idosos" = "Incluir o doc 07 do demógrafo depois do parecer do revisor".
- Livro de evidências: [../../pericia/evidencias/README.md](../../pericia/evidencias/README.md).
