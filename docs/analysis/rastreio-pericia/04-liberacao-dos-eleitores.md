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

## Atualização de 31/10/2026 (item 6.4, sinal V2 no Sul e no RS comparado com 2022)

- Revisão: [parecer 51](../cetico-revisor/51-v2-sul-2022.md), sobre o [estatístico 26](../estatistico-eleitoral/26-h13-v2-sul-2022-diario.md) e o adendo 6 do [plano 16](../estatistico-eleitoral/16-h13-log-plano.md). Vereditos: itens 1, 2, 3 e 6 **sustentados**; itens 4 e 5 **sustentados com ressalvas**; item 7 **Fato** no bruto. O texto para leigos é o do item 9 do parecer, com os ajustes abaixo. "Segunda verificação independente" = parecer 51 (7-Zip oficial, classificador próprio de vias, leitura do `.bu` por tag e do BU impresso, regressão própria).
- Registro que faltava neste índice (texto já no tópico desde 30/10/2026): o parágrafo "Minas Gerais: o padrão já aparecia em 2022" vem do [parecer 48](../cetico-revisor/48-h13-v2-mg-2022.md) (32,4% e 11,5%: §"Para o redator", item 4, `cetico-48-bu2022.mjs`); o sinal fora do Nordeste e os 452.147 / 3.978.044, do [parecer 46](../cetico-revisor/46-h13-v2-fora-nordeste.md) (`cetico-46-pior-caso.mjs`).

| Número ou frase no texto | Fonte |
|---|---|
| 69.164 seções por turno (PR 25.721, SC 16.242, RS 27.201), todas completas contra o `.vsc` da seção | estatístico 26, §1 (`conferencia-<uf>-<t>t.json`); parecer 51, itens 1 e 2 |
| "diário bate com o boletim em quase todas as seções; diferença quase sempre de 1 ou 2" | parecer 51, item 2 (`vias.json`): V2 igual em 98,75% a 99,84% das seções por UF e turno; fora das 5 de diário curto, o diário conta 1 a 4 a mais, nunca menos (1 exceção em SC) |
| 5 seções com diário que não cobre o dia; 4 com falha ou troca de urna | parecer 51, item 7 (PR 75833/0043/0074 e 77275/0167/0100; RS 88013/0002/0199 e 88013/0114/0336 no 1º turno; RS 87912/0060/0322 nos dois turnos) |
| "Em 2022 aparece a mesma ligação... não é novidade de 2026" (Sul e RS) | parecer 51, itens 3 e 4 (T1 positivo e acima do corte no Sul e no RS); nenhum coeficiente, z ou intervalo no texto (consenso T22) |
| "não tem precisão para dizer se cresceu, nem se é o mesmo fenômeno" | parecer 51, item 4.3 (T2 e T4 sem poder) e veredito 4 |
| Sul 10,1% (2022) e 4,6% (2026); RS 12,5% e 8,1% | parecer 51, item 9: Sul 2022 1.863.145 ÷ 18.373.519 nas 69.162 seções com `.bu` da urna (comparecimento − tag `[2]`, 2º turno); Sul 2026 861.228 ÷ 18.711.280 em todas as 72.015 seções (`sem_biometria` do boletim, parecer 46, "Magnitude"); RS 864.312 ÷ 6.930.603 e 559.431 ÷ 6.889.638. Pelo diário, as proporções arredondadas são as mesmas (estatístico 26, §2) |
| "já eram poucas em 2022 as seções com mais da metade sem digital" | parecer 51, item 5.1 (peso de 2022 acima de 50% sem biometria: 6,9% no Sul, contra 55% em MG) |
| "resultado de 2022 vai na mesma direção, mas não chega à régua do teste" (seções com proporção parecida) | parecer 51, itens 4.4 e 5.1 (T3 repesado: z abaixo do corte nos dois caminhos; empate no limite, não indício de diferença) |
| PR e SC sozinhos sem padrão claro em 2026 | parecer 51, item 4.1 (z de 2026 abaixo de 2) e item 6 |
| Pendente: seção do RS com diário sem votação nem falha; casos assim em 2026 | parecer 51, item 7 e "Para o coordenador" (RS 87912/0060/0322; começar pelas 2 seções de 2026 do RS com "diário diferente do BU" no painel do estatístico 26) |
| Fonte: 2 seções do 2º turno fora da proporção de 2022 (SC e RS) | estatístico 26, §1 (seções do Sistema de Apuração, `vscsa`); parecer 51, item 9 |

Ajustes em relação ao texto pronto do item 9 do parecer:

- "por falha ou troca de urna" passou a valer só para 4 das 5 seções: a quinta (RS 87912/0060/0322) não tem marca de falha (parecer 51, item 7), e entrou como **Pendente**.
- Saíram "No Rio Grande do Sul, o tamanho é parecido com o de 2026" e "No Sul como um todo, o de 2022 é um pouco menor": são comparações de tamanho do teste, e o pedido do coordenador deixou fora o "do mesmo tamanho"; a analogia da balança ficou num item próprio de limite.
- "não passa a régua fixada antes de rodar" virou "não chega à régua do teste": o parecer 51, item 4.2, diz que o registro prévio do adendo 6 não é verificável (entrou no mesmo commit que o resultado).
- "as seções de 2022 já eram parecidas com as de 2026 nessa proporção" virou "já eram poucas em 2022 as seções com mais da metade sem digital", para não parecer contradizer 10,1% contra 4,6% (parecer 51, item 5.1).
- Fica fora (parecer 51, item 9): coeficientes, z, intervalos, "veria", faixas, "do mesmo tamanho", "estrutural", "mais próximo do mesmo padrão", a V2 do diário do PR como número, as hipóteses sobre a tag `[2]` e a identificação das 5 seções de 2022.

Comandos (parecer 51 e estatístico 26):

```
node scripts/auditoria/coleta-2022-mg.mjs --uf pr --turno 1 --etapas conferir       # 69.164 por turno: idem para cada UF e turno
node scripts/auditoria/estatistico-h13-v2-diario2022.mjs --uf pr --turno 1          # vias do diário, idem para cada UF e turno; --juntar
node scripts/auditoria/estatistico-h13-v2-bu2022.mjs --uf pr                        # diário × boletim de 2022, idem sc e rs
node --max-old-space-size=12000 scripts/auditoria/estatistico-h13-v2-sul2022-analise.mjs   # modelo do autor
node scripts/auditoria/cetico-51-bruto.mjs --amostra 40 --divergentes 15 \
  --extra pr/75833/0043/0074,pr/77275/0167/0100,rs/87912/0060/0322,rs/88013/0002/0199,rs/88013/0114/0336 --tmp <dir>
node scripts/auditoria/cetico-51-caso.mjs --secao rs/87912/0060/0322 --turno 1 --tmp <dir>   # idem turno 2 e as outras 4
node scripts/auditoria/cetico-51-vias.mjs                                          # vias × boletim no universo; somaV2bu do 2º turno = numeradores de 2022
node --max-old-space-size=8000 scripts/auditoria/cetico-51-modelo.mjs              # regressão própria (2022 e 2026)
node --max-old-space-size=8000 scripts/auditoria/cetico-46-dados.mjs               # V2 de 2026 pelo boletim (861.228; 559.431)
```

Saídas: `data/parsed/auditoria/cetico/51/` (`bruto.json`, `vias.json`, `modelo.json`).

Conferência do redator (31/10/2026), só leitura: somando `comp` e `comp − compBio` do 2º turno em `data/parsed/auditoria/estatistico/h13-v2/sul2022/bu2022-{pr,sc,rs}.csv` saem 69.162 seções, 18.373.519 votantes e 1.863.145 sem biometria no Sul; no RS, 27.200, 6.930.603 e 864.312. Bate com o parecer 51, item 9.
