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

## Parte 4 (por que mais idosos votaram em 2026), acrescentada em 30/10/2026

- Achado: [demografo/09](../demografo/09-salto-votantes-85-99.md), `scripts/auditoria/demografo-85-99-salto.mjs`.
- Revisão: [parecer 43](../cetico-revisor/43-salto-85-99-secoes-novas.md) (itens 1 e 2: sustentado; explicações alternativas refutadas uma a uma). "Segunda verificação independente" = parecer 43.
- Gráfico "Parte dos eleitores de 70 anos ou mais que foi votar": `docs/pericia/graficos/h01-comparecimento-idosos.svg`, dados em `docs/pericia/graficos/dados/`, script `scripts/auditoria/grafico-h01-idosos.mjs`.

```
node --max-old-space-size=6000 scripts/auditoria/demografo-85-99-salto.mjs   # autor: série, Censo, UF, municípios, zonas, piso sem digital
node --max-old-space-size=6000 scripts/auditoria/cetico-43-pca.mjs           # revisor: BRASIL.csv de 2018, 2022 e 2026; detalhe por seção; BU
node --max-old-space-size=6000 scripts/auditoria/cetico-43-analise.mjs       # revisor: série, coorte, Censo, UF, municípios, zonas
node --max-old-space-size=6000 scripts/auditoria/cetico-43-extra.mjs         # revisor: 2022 entre turnos, piso/teto, municípios × Censo
node scripts/auditoria/grafico-h01-idosos.mjs                                # gráfico
```

Saídas: `data/parsed/auditoria/demografo/salto-85-99-*` e `data/parsed/auditoria/cetico-revisor/p43/`.

## Seções novas com comparecimento muito alto

- Achado: [demografo/08](../demografo/08-secoes-novas-e-h01-2turno.md), item 5b, `scripts/auditoria/demografo-secoes-novas.mjs`.
- Revisão: [parecer 43](../cetico-revisor/43-salto-85-99-secoes-novas.md), §5 e §5c (as 56 seções novas com 98% ou mais, uma a uma).

```
node --max-old-space-size=6000 scripts/auditoria/cetico-43-novas.mjs   # tamanho, juventude, limiar, 56 seções
```

## Parte 5 (salto dos eleitores de 100+ de 2018 para 2022), acrescentada em 31/10/2026

- Achado: [demografo/10](../demografo/10-aptos-100-mais-2018-2022.md), scripts `scripts/auditoria/demografo-aptos-100-{serie,analise,baixar-censo2010}.mjs`.
- Revisão: [parecer 44](../cetico-revisor/44-aptos-100-2018-2022.md). Vereditos usados no texto: item 2 (forma de contar, sustentado com ressalvas), 2a (idade numa data fixa, forma fraca), 2b (idades inválidas), 2c (regeração com regras diferentes, refutada para 2018 → 2022), 3a (títulos já no cadastro em 2018, Fato só com o TSE), 4 (efeito quanto a voto). A decomposição com mortalidade (item 3, Estimativa) ficou fora do relatório.
- "Segunda verificação independente" na Parte 5 = parecer 44 (descompressão com `unzip -p`, leitura do `BRASIL.csv` e dos CSV por UF nos 4 anos, 1º × 2º turno célula a célula).
- Números e fonte de cada um:

| Número no texto | Fonte |
|---|---|
| 21.271 / 39.026 / 184.330 / 297.977 aptos de 100+ (2014–2026) | parecer 44, série; `44-brasil.json` |
| 72.726 / 272.334 / 466.703 / 337.136 aptos de 95 a 99; votantes 4.682 / 5.082 / 7.591 / 14.661 e 2.528 / 1.506 / 1.675 / 2.141 | idem |
| 199.608 e 400; 145.304 e 169; 113.647 e 466 (títulos e votantes a mais) | diferença da tabela anterior |
| 139.929 / 135.828 / 136.897 combinações sem diferença entre turnos | parecer 44, item 2 |
| Totais × detalhe por seção (407; 1.723; 2.381) | parecer 44, `44-detalhe.json` |
| Idade inválida 4.828 / 2.907 / 1.987 / 1.209 | parecer 44, item 2b |
| 16-17 anos: 1.638.469 / 1.400.236 / 2.114.946 | parecer 44, item 2a |
| Censo 2022: 37.814 (100+) e 16.428 (99 anos) | Censo 2022, SIDRA 9514; parecer 44 |
| Tabela por estado (27 UFs × 4 anos) | parecer 44, `44-uf.json` |

- Gráfico "Eleitores aptos de 95 a 99 e de 100 anos ou mais, e quantos votaram, 1º turno" (inserido em 31/10/2026, logo depois da tabela da onda): `docs/pericia/graficos/h01-onda-95-mais.svg`, dados `docs/pericia/graficos/dados/h01-onda-95-mais.csv` (iguais, linha a linha, à tabela da Parte 5), script `scripts/auditoria/grafico-h01-onda.mjs` (commit 3cb8843).

```
node --max-old-space-size=6144 scripts/auditoria/cetico-44-serie.mjs brasil    # ~2 min: <ano>_BRASIL.csv de 2014, 2018, 2022 e 2026
node --max-old-space-size=6144 scripts/auditoria/cetico-44-serie.mjs uf        # ~2 min: CSV por UF dos 4 anos
node --max-old-space-size=6144 scripts/auditoria/cetico-44-serie.mjs detalhe   # ~1 min: detalhe_votacao_secao, 2018, 2022 e 2026
node scripts/auditoria/cetico-44-analise.mjs                                    # segundos
node scripts/auditoria/cetico-44-municipios.mjs                                 # tetos municipais com janela estrita
node --max-old-space-size=4096 scripts/auditoria/demografo-aptos-100-serie.mjs  # autor
node scripts/auditoria/demografo-aptos-100-analise.mjs                          # autor
node scripts/auditoria/grafico-h01-onda.mjs                                     # gráfico da onda
```

Saídas: `data/parsed/auditoria/cetico-revisor/44-*.json` e `data/parsed/auditoria/demografo/aptos100-*.json`.

## "Um município que pede exame: Campinápolis (MT)", acrescentada em 31/10/2026

- Achado: [engenheiro-seguranca-urna/12](../engenheiro-seguranca-urna/12-campinapolis-100-mais.md), scripts `scripts/auditoria/seguranca-campinapolis-{logs,perfil,censo,cruzamento}.mjs`.
- Revisão: [parecer 49](../cetico-revisor/49-campinapolis-contraprovas.md), item 1, **sustentado com ressalvas**. Ressalvas levadas ao texto:
  - R1: "20 idosos com digital" = digital **no cadastro**, não voto pela digital (texto: "têm digital no cadastro; isso não quer dizer que votaram pela digital").
  - R2: coorte de Campinápolis (teto de 79 contra 224) e comparação de 2022 (144/42; 145/52; MT 1.576/492 e 6.991/5.513). O exagero de idade não fecha a diferença (Hipótese).
  - Tabela "Onde Campinápolis destoa, e onde não" (Brasil sem exterior 184.330/37.814 = 4,9 e 738.244/579.729 = 1,27; MT 3,2 e 1,27; Campinápolis 3,4 e 2,8): errata do parecer 49 (commit 4ae2457), `node scripts/auditoria/cetico-49-cadastro.mjs`.
  - Gráfico `h01-campinapolis.svg` (224 títulos 100+ por raça/cor, votantes e soma do Censo 75 + 4 = 79): `node scripts/auditoria/grafico-h01-campinapolis.mjs`, que recalcula dos arquivos oficiais e confere com o tópico 6 antes de gravar.
  - R3: 108 títulos em escolas de aldeia e 84 em quatro escolas da cidade (30, 29, 19 e 6). Os nomes das escolas ficaram fora do texto. Corrigida a lista das cinco seções com mais 100+ sem digital: a quinta é a 0094 (11), urbana.
  - R4: votos depois das 17h da urna no 1º turno (seis seções de Campinápolis e duas de Nova Xavantina); parte sem digital de 14,5% depois das 16h contra 16,1% no dia. A leitura "fila" foi posta como Hipótese (princípio 8).
  - R5: seção 0094, com a terceira leitura (eleitor que descobre que alguém votou no lugar dele) e a recomendação da ata com três perguntas.
- "Segunda verificação independente" = parecer 49 (`cetico-49-diarios.mjs`, contagem por linha; `cetico-49-cadastro.mjs`, colunas pelo nome do cabeçalho).
- Números e fonte de cada um:

| Número no texto | Fonte |
|---|---|
| 224 aptos de 100+; 32 votaram (14,3%); 30/20, 192/12, 2/0 por raça/cor; 30, 0 e 2 com digital | parecer 49, §1.1 (perfil por seção 2026, MT, e perfil de comparecimento 2026); `cetico-49-cadastro.mjs` |
| 0,72% no país | tópico 6, Parte 2 (parecer 03) |
| Censo: 42 (100+), 37 (95–99), 52 (90–94); 23 e 114 por 100 | parecer 49, §1.1 (SIDRA 9514, arquivo guardado) |
| Coorte: 96: 10; 97: 6; 98: 7; 99: 10; 100+: 42 (75); 95 anos: 4; teto 79 | parecer 49, R2 |
| 2022: 144/42 (3,4); MT 1.576/492 (3,2); 145/52 (2,8); MT 6.991/5.513 (1,27) | parecer 49, R2 (comparecimento 2022) |
| 108 e 84 títulos; 30, 29, 19, 6; 79% a 97% e 2% a 15% de indígenas | parecer 49, R3 (`perfil.json` do engenheiro) |
| 8.377 / 7.029 / 747 / 227 / 374 / 15; 8.497 / 7.069 / 785 / 350 / 293 / 29 | parecer 49, §1.1 (38 diários, por linha) |
| Diário = boletim nos 6 pares município × turno | parecer 49, §1.1 (soma do BU na tabela `secao`) |
| 14% a 18% por hora; máximo 6 em 10 min e 5 seguidos; vizinhos 5 e 4 | parecer 49, §1.1 |
| 20,8%, 6,0% e 12,0% dos aptos sem digital | parecer 49, textos para leigos (perfil por seção, MT) |
| Seções 0197 (91, último 19:54:58), 0207 (56), 0199 (21), 0198 (15), 0203 (12), 0159 (1); Nova Xavantina 0037 (15) e 0039 (48); 79 de 544 (14,5%) contra 16,1% | parecer 49, R4 |
| Seção 0094: abertura 07:00:01, encerramento 16:01; 246 votos (206 / 29 / 11); linha do tempo; 10 recusas, 3 CPFs, 2 votos; 12 no dia; 0 no 1º turno | parecer 49, §1.4 (diário bruto) |
| País, 2º turno: 179 seções com 12+ "já votou", 245 com 10+, máximo 388, em 499.177 seções com voto | parecer 49, §1.4 (`perfil_log`) |

- Pedidos 8 e 9 da LAI: parecer 49, Pendente do texto para leigos e §1.4 (recomendação da ata e recomendação complementar).

```
node scripts/auditoria/cetico-49-diarios.mjs --secao 2/98655/0094   # ~10 s: 216 diários da zona 0026 de MT, contagem por linha; linha do tempo da 0094
node scripts/auditoria/cetico-49-cadastro.mjs                       # ~30 s: perfil por seção 2026 (MT), comparecimento 2026 e 2022, Censo 2022
node scripts/sql.mjs "select turno, municipio, sum(comparecimento), sum(por_biometria), sum(sem_biometria), sum(por_biografia) from secao where uf='mt' and zona='0026' group by 1,2"
node scripts/sql.mjs "select count(*), sum(ja_votou>=10), sum(ja_votou>=12), max(ja_votou) from perfil_log where turno=2 and votos_computados>0"
node scripts/auditoria/seguranca-campinapolis-logs.mjs              # autor: 216 diários
node scripts/auditoria/seguranca-campinapolis-perfil.mjs            # autor: perfil e comparecimento (~5 min)
node scripts/auditoria/seguranca-campinapolis-censo.mjs             # autor: Censo (usa o arquivo guardado)
node scripts/auditoria/seguranca-campinapolis-cruzamento.mjs        # autor: tabelas
```

Saídas do autor em `data/parsed/auditoria/engenheiro-seguranca-urna/campinapolis/`. Os dois scripts `cetico-49-*` só imprimem no console.
