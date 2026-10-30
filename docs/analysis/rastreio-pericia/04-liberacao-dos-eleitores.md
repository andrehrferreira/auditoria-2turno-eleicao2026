# Rastreio — tópico 4 (Como os eleitores foram liberados para votar)

Índice do que foi retirado de `docs/pericia/04-liberacao-dos-eleitores.md` em 30/10/2026, quando o relatório passou a ser um documento independente do processo (premissa do André, CLAUDE.md, seção "Relatório de perícia"). Nenhum número, rótulo ou conclusão mudou; só saíram referências a pareceres, papéis, scripts, comandos, arquivos e links. **Este índice não entra no relatório.**

No texto, "(revisado)" = sustentado por parecer do `cetico-revisor`; "(recalculado)" = refeito por `scripts/auditoria/verifica-pericia-liberacao.mjs` (e, no item 7, `scripts/auditoria/verifica-pericia-liberacao-logs.mjs`).

## Bloco "Situação" (agora "Como os números foram conferidos")

- Pareceres: [01](../cetico-revisor/01-b1a-sem-biometria-acima-do-cadastro.md), [10](../cetico-revisor/10-a7-comparecimento-alto-sem-digital.md) e [27](../cetico-revisor/27-h05-28ufs.md); o 27 substitui o [06](../cetico-revisor/06-comparecimento-extra-sem-vies-biometria.md) no item 6.1.
- Recálculo: `scripts/auditoria/verifica-pericia-liberacao.mjs`; casos do item 7: `scripts/auditoria/verifica-pericia-liberacao-logs.mjs`.
- "Revisão de 30/10/2026" do item 6.1 = parecer 27.

## Resposta curta

- 12,4% sem digital no Brasil: parecer 10 + recálculo.
- 16.011 seções com excesso de "sem biometria": parecer 01.
- Teste do eleitor a mais (6.1): parecer 27.

## Item 1 (Quantos votaram com e sem digital)

- Conta do autor: `node scripts/habilitacao-1t-2t.mjs`; reprodução: `node scripts/auditoria/verifica-pericia-liberacao.mjs` → `data/parsed/auditoria/verifica-pericia/liberacao.json`.
- 12,4% / 12,2%: parecer 10 + recálculo.
- Acre, log × boletim: [../06-leitura-bu-rdv-log.md](../../06-leitura-bu-rdv-log.md).

## Item 2 (Quem liberou)

- RN, 2.890 seções, mediana 91,7%: parecer 10 + recálculo.
- Digital que falhou × dedo trocado: parecer 10.

## Item 3 (Excesso de "sem biometria")

- Todo o item: [parecer 01](../cetico-revisor/01-b1a-sem-biometria-acima-do-cadastro.md). O defeito nas seções agregadas do 1º turno foi apontado pelo revisor (parecer 01).
- Números das comparações com vizinhas e por horário (estimativas de modelo): parecer 01.

## Item 4 (Exterior)

- Fonte: [../biometria-mesarios/07-exterior-sem-biometria.md](../biometria-mesarios/07-exterior-sem-biometria.md), reproduzido por `verifica-pericia-liberacao.mjs`.

## Item 5 (Modelos de urna, H07)

- "Perfil do projeto" que não leu o log de SP 64777/0395/0298 = perfis de `src/perfil-secoes.js`; "banco do projeto" = banco SQLite da auditoria.
- Comparação com controles de perfil, ainda não reproduzida: feita pelo primeiro autor (biometria-mesarios).
- Fonte: [../biometria-mesarios/06-h07-modelo-urna.md](../biometria-mesarios/06-h07-modelo-urna.md) e `verifica-pericia-liberacao.mjs` (regressão por seção, com efeito fixo de UF e zona, sem peso).

## Item 6.1 (Quem foi votar só no 2º turno)

- Estudo do estatístico eleitoral com as 28 UFs: [../estatistico-eleitoral/06-h05-28ufs.md](../estatistico-eleitoral/06-h05-28ufs.md).
- Revisão: [parecer 27](../cetico-revisor/27-h05-28ufs.md), sustentado com ressalvas; o revisor refez a conta do autor e chegou ao mesmo arquivo, byte a byte; caminho próprio dá os mesmos valores em BR, SP, PR e MG. Substitui o [parecer 06](../cetico-revisor/06-comparecimento-extra-sem-vies-biometria.md) (25 UFs).
- Todos os "Fato (revisado)" e a "Hipótese" do perfil da seção: parecer 27.
- Números de simulação dos pontos cegos: pareceres 06 e 27.

## Item 6.2 (Pendente)

- Conta do primeiro autor: [../biometria-mesarios/05-a9-regressao.md](../biometria-mesarios/05-a9-regressao.md); sem parecer do cético.

## Item 6.3 (Comparecimento muito alto)

- Todo o item: [parecer 10](../cetico-revisor/10-a7-comparecimento-alto-sem-digital.md); o limite estatístico de votos no lugar de ausentes está nele.

## Item 6.4 (H13, limites aritméticos)

- Conta principal: `node scripts/auditoria/h13-limites-banco.mjs` → [../hipotese-liberacao-mesario/06-limites-pelo-banco.md](../hipotese-liberacao-mesario/06-limites-pelo-banco.md), com a tabela por UF.
- Segunda conta, pelos perfis dos boletins: `scripts/auditoria/liberacao-limites-deterministicos.mjs`.
- Estimativas estatísticas (fora do relatório): [../hipotese-liberacao-mesario/00-sintese.md](../hipotese-liberacao-mesario/00-sintese.md), com os pareceres [15](../cetico-revisor/15-h13-liberacao-mesario.md), [18](../cetico-revisor/18-h13-liberacao-reproducao.md) e [19](../cetico-revisor/19-h13-liberacao-poder.md).
- "Resumos dos logs refeitos" = perfis dos logs regerados com a ordem das linhas corrigida.

## Item 7 ("O eleitor identificado já votou")

- "Lidas pelo programa de leitura" = as 499.177 seções lidas pelo perfil.
- Caso AC 01007/0009/0440: [../../casos/ac-01007-z0009-s0440.md](../../casos/ac-01007-z0009-s0440.md).
- Caso ES 57037/0055/0364: [../../casos/es-57037-z0055-s0364.md](../../casos/es-57037-z0055-s0364.md).

## Item 8 (Liberação manual em massa)

- Fonte: `node scripts/auditoria/liberacao-manual-em-massa.mjs` → [../virada-sem-digital/02-liberacao-manual-em-massa.md](../virada-sem-digital/02-liberacao-manual-em-massa.md), com a lista das 97 seções.
- Contagem do primeiro autor (96 seções pelo log): [../biometria-mesarios/04-mesarios.md](../biometria-mesarios/04-mesarios.md).

## Item 9 (Virada sem digital)

- Fonte: `node scripts/auditoria/virada-sem-digital.mjs` → [../virada-sem-digital/01-resultado.md](../virada-sem-digital/01-resultado.md).
- Caminho (a): perfis dos boletins, `scripts/auditoria/cetico-t8-extrair.mjs` (499.207 seções pareadas); caminho (b): banco, tabelas `secao` e `voto_bu`.

## Contraprova

- Limite "log e boletim do mesmo programa": registrado pelo revisor (o texto original não dava o número do parecer).
- Item 3: caso ES 52/0033 conferido pelo revisor, não olhado pelo autor; marcador da foto medido por dois revisores (parecer 01).
- Item 3, poder: parecer 01, errata de 29/10/2026.
- Item 6.1: tabelas de simulação dos pareceres 06 e 27 (o 27 com 20 rodadas e outro sorteio); conferência das 3 seções no BU original pelo revisor: `scripts/auditoria/cetico-e2bio-bu-bruto.mjs`.
- Item 6.3: parecer 10.

## Prova, Limites

- "Pendente" do item 6.1 e limite 6: parecer 27.
- Limite 4, "caso do RN": parecer 10 (RN 17132/0010/0145 e 0183; o texto agora remete ao item 6.3).

## Princípio 8

- Link retirado: [../01-premissas.md](../../01-premissas.md).

## Seção "Como repetir" (retirada inteira)

```
node --max-old-space-size=8000 scripts/auditoria/verifica-pericia-liberacao.mjs   # itens 1, 2, 4, 5, 6.4 e 7: recálculo de todas as seções
node src/exportar.js --uf es --municipio 57037 --zona 0055 --secao 0364 --saida <dir>   # item 7: log bruto (idem para as 9 seções)
node scripts/auditoria/verifica-pericia-liberacao-logs.mjs <dir>                  # item 7: rajadas e atraso depois do voto
node scripts/habilitacao-1t-2t.mjs                                   # item 1: conta do autor
node --max-old-space-size=4096 scripts/auditoria/cetico-b1a-consolidacao.mjs   # item 3: revisão
node scripts/auditoria/cetico-b1a-log.mjs --turno 2 --por-zona 5 --controles 40  # item 3: marcador da foto
node --max-old-space-size=6144 scripts/auditoria/estatistico-h05.mjs 5             # item 6.1: conta do autor, 28 UFs
node --max-old-space-size=6144 scripts/auditoria/cetico-h05-28ufs.mjs 20           # item 6.1: revisão (parecer 27)
node --max-old-space-size=6144 scripts/auditoria/cetico-h05-28ufs-covariaveis.mjs  # item 6.1: o resultado com cada característica da seção
node scripts/auditoria/cetico-e2bio-bu-bruto.mjs pr 74993 0159 0009            # item 6.1: boletim original dos dois turnos (idem PR 77399/0124/0080 e MG 52752/0268/0068)
node scripts/auditoria/cetico-a7-consolidacao.mjs                    # item 6.3: revisão
node scripts/ja-votou-por-voto.mjs                                   # item 7: conta do autor
```

Detalhes técnicos: [../biometria-mesarios/](../biometria-mesarios/01-metodo-e-dados.md) e pareceres [01](../cetico-revisor/01-b1a-sem-biometria-acima-do-cadastro.md), [06](../cetico-revisor/06-comparecimento-extra-sem-vies-biometria.md), [10](../cetico-revisor/10-a7-comparecimento-alto-sem-digital.md) e [27](../cetico-revisor/27-h05-28ufs.md).

## Próximos passos

- "Revisão independente" dos itens 6.2 e 5, e das contagens dos itens 1, 2, 4, 5 e 7 = parecer do `cetico-revisor`.
- Item 6.1 refeito com todas as UFs: parecer 27.
- Varredura das rajadas de "já votou": [../biometria-mesarios/03-rajadas-ja-votou.md](../biometria-mesarios/03-rajadas-ja-votou.md).
- Seções do PR e reclassificação por falha do leitor: parecer 27, recomendação 7.
