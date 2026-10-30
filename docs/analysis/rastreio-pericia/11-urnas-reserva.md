# Rastreio: docs/pericia/11-urnas-reserva.md

Índice do que foi retirado do tópico 11 em 30/10/2026, quando o relatório passou a ser independente do processo (CLAUDE.md, "Relatório de perícia"). Nenhum número, rótulo ou conclusão mudou; só saíram as referências abaixo. Este arquivo não entra no relatório.

## Fontes da hipótese H14

- Revisão cética: [parecer 30](../cetico-revisor/30-h14-urnas-reserva.md) (sustentado com ressalvas). As "afirmações revisadas" 1, 2 e 4 e o item D do parecer são as frases usadas no tópico.
- Votos: [estatístico eleitoral, doc 07](../estatistico-eleitoral/07-urnas-reserva-1t-2t.md).
- Rastro técnico: [engenheiro de segurança, doc 06](../engenheiro-seguranca-urna/06-h14-rastro-das-reservas.md).
- Conferência de cada número do tópico: `scripts/auditoria/grafico-h14-dados.mjs` (contra as saídas dos autores, do revisor e do banco).

## Referências retiradas, seção por seção

| Seção do tópico | Texto no relatório agora | Referência retirada |
|---|---|---|
| Situação | "segunda verificação independente" | parecer cético 30; estatístico doc 07; engenheiro doc 06; `grafico-h14-dados.mjs`; "ver Como repetir" |
| Como foi feito, abertura | "Duas frentes, ambas refeitas pela segunda verificação" | "revisadas pelo cético no parecer 30" |
| Como foi feito, universo | (frase sem fonte) | doc 07, seção "Dados e universo" |
| Quando a troca nova foi feita | "definição recomendada pela segunda verificação" | parecer 30 (recomendação da definição pela data da contingência); parecer 30, item A (definição alternativa, 133 seções) |
| Teste 2 | "a segunda verificação acrescentou outro teste" | "o revisor fez outro teste" (teste de nível: `scripts/auditoria/cetico-h14-votos.mjs`) |
| Item 1 | "tabela da primeira análise" | "tabela do estatístico" (doc 07) |
| Item 1, gráfico | (sem link de dados) | `docs/pericia/graficos/dados/h14-parcela-13-1t-2t.csv`; `docs/pericia/graficos/dados/h14-votos-por-grupo.csv` |
| Item 2 | "Fato:" / "a segunda verificação refez a conta" | parecer 30, afirmação revisada 1; parecer 30, V1 e V3 (o revisor refez); parecer 30, V8 (57 seções no boletim original, `scripts/auditoria/estatistico-reservas-1t2t-bruto.mjs`) |
| Item 2, Pendente | "fica fora deste relatório" | tamanho mínimo de desvio em doc 07 |
| Item 3 | "Fato:" | parecer 30, afirmação revisada 2; parecer 30, V4 |
| Item 3, Pendente brancos + nulos | "a segunda verificação marcou o ponto como exploratório" | "o parecer marca o ponto como exploratório" |
| Item 4 | "resultado oficial publicado pelo TSE" | tabela `voto_oficial` da cópia de leitura do banco |
| Item 5 (Aracaju) | "conferido no arquivo original" | parecer 30, R4; "conferido pelo revisor"; parecer 30, C1 e V3; comandos `seguranca-h14-dump-log.mjs --secao se/31054/0001/0130` e `src/exportar.js --uf se --municipio 31054 --zona 0001 --secao 0130` |
| Item 6, gráfico | (sem link de dados) | `docs/pericia/graficos/dados/h14-carga-reserva.csv` |
| Item 6 | "Fato:" / "Fato (votos):" | parecer 30, R3; parecer 30, afirmação revisada 4; digital nas reservas de outra zona: `scripts/auditoria/cetico-h14-bio-outra-zona.mjs`, saída `data/parsed/auditoria/cetico-revisor/h14-bio-outra-zona.json`; caso AM: `seguranca-h14-dump-log.mjs --secao am/02550/0032/0848` |
| Item 6, Risco | "regra desta auditoria: o que depende só de pessoas não conta como controle" | "premissa 8" (docs/01-premissas.md, princípio 8) |
| Item 7 | "Conclusão:" / "Fato:" | parecer 30, item D (lista de sinais e afirmação revisada); parecer 30, R1 (6 seções, 6,56 esperadas); parecer 30, R9 (114 × 116,08); parecer 24 (versão 10.23.0.0) |
| Item 7, gráfico | (sem link de dados) | `docs/pericia/graficos/dados/h14-rastro-sinais.csv` |
| Contraprova | "a segunda verificação rodou de novo [...] os programas das duas frentes"; "idêntico até o último caractere" | parecer 30, itens C e E; parecer 30, V5; "o revisor rodou de novo os programas dos dois autores"; "saída do estatístico"; "do engenheiro, idêntica byte a byte"; "o script deste tópico" (`grafico-h14-dados.mjs`); mesmo conjunto de 2.818: `scripts/auditoria/cetico-h14-grupos.mjs` |
| Limites, item 6 | "decidido por pessoas (e, pela regra desta auditoria, ...)" | "(premissa 8)" |
| Pendentes, digital | "a contagem fica fora deste relatório" | `docs/analysis/cetico-revisor/30-h14-urnas-reserva.md`, item C2 |
| Pendentes, 04/10 | "Já existe uma contagem, mas ela não foi conferida caso a caso pela segunda verificação" | engenheiro doc 06, item 5; "não foi revista uma a uma pelo revisor" |
| Próximos passos | "com segunda verificação independente" | link para o parecer 30 |

## Seção "Como repetir" (retirada inteira)

```
# votos (estatístico, doc 07)
node --max-old-space-size=8192 scripts/auditoria/estatistico-reservas-1t2t-dados.mjs   # ~45 s: secoes.csv
node --max-old-space-size=8192 scripts/auditoria/estatistico-reservas-1t2t.mjs         # ~2 min: diferença-em-diferenças, sorteio, por UF, modelo, zona e seção
node scripts/auditoria/estatistico-reservas-1t2t-bruto.mjs --n 15                      # boletim original dos dois turnos: extremas e Aracaju

# rastro técnico (engenheiro de segurança, doc 06)
node scripts/auditoria/seguranca-h14-varrer.mjs --procs 4                              # 51 min: todos os diários do 2º turno
node scripts/auditoria/seguranca-h14-grupos.mjs
node --max-old-space-size=8192 scripts/auditoria/seguranca-h14-itens.mjs               # carga, assinaturas, relógio, histórico, lacres
node scripts/auditoria/seguranca-h14-biometria-por-urna.mjs                            # reserva × urna substituída
node scripts/auditoria/seguranca-h14-dump-log.mjs --secao se/31054/0001/0130 --filtro "Zona Eleitoral|contingência"
node scripts/auditoria/seguranca-h14-dump-log.mjs --secao am/02550/0032/0848 --filtro "Turno|Seção|contingência" --dia 25/10/2026
node src/exportar.js --uf se --municipio 31054 --zona 0001 --secao 0130 --log nao --stdout

# revisão cética (parecer 30)
node scripts/auditoria/cetico-h14-grupos.mjs                                           # as duas metades usam as mesmas 2.818
node --max-old-space-size=8192 scripts/auditoria/cetico-h14-votos.mjs                  # ~70 s: teste de nível, outra zona, escala
node scripts/auditoria/cetico-h14-bio-outra-zona.mjs                                   # ~4 min: digital nas reservas de outra zona

# tabelas e gráficos deste tópico (confere cada número contra as saídas acima e o resultado oficial)
node --max-old-space-size=4096 scripts/auditoria/grafico-h14-dados.mjs
node scripts/auditoria/grafico-h14.mjs
```

Saídas dos autores em `data/parsed/auditoria/reservas-1t2t/` e `data/parsed/auditoria/reservas-rastro/`; do revisor, em `data/parsed/auditoria/cetico-revisor/` (`h14-votos.json`, `h14-bio-outra-zona.json`). Nenhum título de eleitor ou de mesário é gravado.

## Gráficos (continuam no relatório)

- `docs/pericia/graficos/h14-parcela-13-1t-2t.svg`, `h14-carga-reserva.svg`, `h14-rastro-sinais.svg`, gerados por `scripts/auditoria/grafico-h14.mjs` a partir dos CSVs acima.
