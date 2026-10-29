# 02. Eleitorado apto × população adulta, por município

Comando: `node --max-old-space-size=8192 scripts/auditoria/demografo-analise.mjs` (seção `t1_eleitorado_x_populacao` de `resumo.json`; lista completa em `municipios.tsv`).

## Teste

- **Medida:** razão R = eleitores do perfil (16+, julho/2026) ÷ população com 12 anos ou mais no Censo 2022 (a coorte que tem 16+ em 2026).
- **Hipótese nula:** o cadastro reflete a população residente; R fica abaixo de 1, porque parte dos adultos não é eleitor e parte da coorte morreu entre 2022 e 2026.
- **Explicações que não envolvem fraude:** migração (o eleitor muda e mantém o título na cidade de origem); domicílio eleitoral diferente da residência (lei permite vínculo afetivo, profissional ou familiar); crescimento da população depois de 2022; subenumeração do Censo em cidades pequenas.
- **Princípio 8:** a limpeza de quem se mudou ou morreu depende de procedimento humano (revisão do eleitorado, comunicação do cartório). Se não for feita, os títulos ficam aptos. Por isso um R alto é **risco a medir**, não algo que a regra resolve.

## Resultados (Fato, 29/10/2026)

| Medida | Valor |
|---|---|
| Eleitores 16+ (perfil) | 157.822.264 (sem exterior) |
| População 12+ no Censo 2022 | 171.206.952 |
| R nacional | 0,922 (18+ ÷ 14+: 0,943) |
| R por município, mediana | 1,006 (p5 0,84; p95 1,35; p99 1,59; máx. 2,53) |
| Municípios com R > 1 | 2.898 de 5.570 (52%) |
| R > 1,25 / > 1,5 / > 2 | 571 / 109 / 5 |
| Eleitores acima da população 12+, somados onde R > 1 | 2.486.880 |

Maiores R: Davinópolis (GO) 2,53 (4.156 eleitores, 1.640 residentes 12+ em 2022); Itaubal (AP) 2,18; Anhanguera (GO) 2,16; Chapada de Areia (TO) 2,08; Tibau (RN) 2,02. Os 25 maiores estão em `resumo.json`.

## Leitura

- **Fato:** em metade dos municípios há mais eleitores do que residentes na faixa de idade correspondente. O fenômeno é concentrado em municípios pequenos do interior.
- **Hipótese:** a maior parte vem de migração com título mantido na origem e de domicílio eleitoral por vínculo. O excesso de 2,5 milhões mede o tamanho do cadastro que **não corresponde a residentes**. Esse estoque inclui títulos de quem se mudou e de quem morreu sem a baixa. Pelos dados agregados não dá para separar os dois.
- **Fato:** no nível municipal, R mais alto vem com comparecimento **menor** no 2º turno: coeficiente −0,046 por unidade de R na regressão do doc 05 (controlando mortalidade e parcela de 70+). É o sinal esperado se os títulos em excesso faltam, e o contrário do esperado se fossem usados em massa. A regressão explica pouco (R² 0,07), então não exclui uso localizado.
- **O que isto não prova:** R > 1 não mostra uso dos títulos. O uso se testa no comparecimento (docs 03, 04 e 06).
- **Limitações:** a população é de 2022, sem projeção por idade e município para 2026. A estimativa total de 2025 (tabela 6579) existe, mas não tem corte por idade. Municípios criados ou com limites alterados depois de 2022 podem distorcer a razão. 1 município sem par no IBGE.

## Recomendação

- Cruzar os municípios com R > 1,5 com o comparecimento e com a habilitação sem biometria (doc 04). Se o excesso de títulos for de quem se mudou, ele deve aparecer como abstenção. Comparecimento alto onde R é alto seria sinal de uso.
- Pedir ao cientista político o contexto dos 25 maiores (cidades-dormitório, pólos de migração, histórico de transferência em massa de títulos).
