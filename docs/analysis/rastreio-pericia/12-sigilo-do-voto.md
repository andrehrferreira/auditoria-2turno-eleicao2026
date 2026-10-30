# Rastreio: docs/pericia/12-sigilo-do-voto.md

Índice do que foi retirado do tópico 12 em 30/10/2026, quando o relatório passou a ser independente do processo (CLAUDE.md, "Relatório de perícia"). Nenhum número, rótulo ou conclusão mudou; só saíram as referências abaixo. Este arquivo não entra no relatório.

## Fontes da hipótese H09

- Revisão cética: [parecer 29](../cetico-revisor/29-h09-sigilo.md) (sustentado com ressalvas). O tópico usa as "afirmações revisadas" do parecer; por decisão dele ficam fora do relatório a frase "o diário liga o título ao voto nulo", a contagem de sessões que terminam em voto nulo e qualquer contagem de "eleitores identificados".
- Achado original: [engenheiro de segurança, doc 05](../engenheiro-seguranca-urna/05-h09-sigilo.md).
- "Primeiro programa" no relatório = `scripts/auditoria/seguranca-h09-sigilo.mjs` (engenheiro). "Segundo programa" / "segunda verificação" = `scripts/auditoria/cetico-h09-sigilo.mjs` (revisor, dois turnos juntos).
- Conferência de cada número do tópico: `scripts/auditoria/grafico-h09-dados.mjs` (contra as saídas dos dois programas e o banco).
- "Banco de dados da auditoria" no relatório = tabela `voto_rdv` da cópia de leitura do banco.

## Referências retiradas, seção por seção

| Seção do tópico | Texto no relatório agora | Referência retirada |
|---|---|---|
| Situação | "segunda verificação independente [...] A conclusão dessa verificação: sustentado, com ressalvas" | parecer cético 29; engenheiro doc 05; `docs/analysis/` como destino do que ficou fora; `grafico-h09-dados.mjs`; "ver Como repetir" |
| Como foi feito, universo | "Dois programas independentes, escritos à parte"; "banco de dados da auditoria" | parecer 29 (0 falha de leitura); `seguranca-h09-sigilo.mjs` (engenheiro); `cetico-h09-sigilo.mjs` (revisor); tabela `voto_rdv` |
| Privacidade | "A base privada de CPFs que a auditoria guarda à parte não foi usada, nem nenhum outro arquivo privado" | pasta `data/private/` |
| Como foi feito, item 2 | "A segunda verificação comparou" | "O revisor comparou"; `scripts/auditoria/cetico-h09-cedula.mjs` |
| Item 1, fonte | "contagem da segunda verificação independente" | parecer 29, item 1; `docs/pericia/graficos/dados/h09-rdv-ordem.csv` |
| Item 1, gráfico | (sem link de dados) | `docs/pericia/graficos/dados/h09-rdv-ordem.csv` |
| Item 2 | "A segunda verificação mediu" | "O revisor mediu"; parecer 29, item 2 |
| Item 3, fonte | "contagem da segunda verificação independente [...] primeiro programa e banco de dados da auditoria" | parecer 29, item 3; "programa do engenheiro"; `voto_rdv`; `grafico-h09-dados.mjs`; `docs/pericia/graficos/dados/h09-secoes-unanimes-por-uf.csv` |
| Item 4, fonte | "contagem da segunda verificação independente" | parecer 29, item 4.1; `docs/pericia/graficos/dados/h09-suspensao-por-papel.csv` |
| Item 4, "não é erro de leitura" | (frase sem fonte) | parecer 29, item 4.2 |
| Item 4, gráfico | (sem link de dados) | `docs/pericia/graficos/dados/h09-suspensao-por-papel.csv` |
| Item 5 | "A segunda verificação aponta três sinais" | parecer 29, item 4.3 |
| Item 6 | "essa contagem fica fora do relatório até a confirmação"; (sem fonte) | "o parecer 29 tirou essa contagem"; parecer 29, item 1 |
| Item 7 | "números do primeiro programa, revisados pela segunda verificação" | "programa do engenheiro, revisados no parecer 29, item 5" |
| Item 8 | "conferido nos dois programas" | "conferido no programa do engenheiro e pelo revisor" |
| Contraprova, âncora | (sem link de dados) | `docs/pericia/graficos/dados/h09-ancora.csv` |
| Contraprova, rotas independentes | "primeiro programa e banco de dados da auditoria"; "os dois programas batem" | "programa do engenheiro"; `voto_rdv`; "programa do revisor e o do engenheiro"; parecer 29 |
| Pendentes | "fora do relatório até a confirmação do dono"; "medido, mas ainda não passou pela segunda verificação" | parecer 29; "medido pelo engenheiro e não foi revisado pelo cético" |
| Recomendação ao TSE | (sem fonte) | parecer 29, Recomendações |
| Próximos passos | "com segunda verificação independente"; "Segunda verificação independente do canal do voto nulo" | link para o parecer 29; "Revisão cética do canal" |

## Seção "Como repetir" (retirada inteira)

```
# leitura dos dois turnos (engenheiro de segurança, doc 05): ~40 min por turno
node scripts/auditoria/seguranca-h09-sigilo.mjs --turno 2 --procs 6
node scripts/auditoria/seguranca-h09-sigilo.mjs --turno 1 --procs 6

# revisão cética (parecer 29): os dois turnos juntos, 46 min; cédulas de MG; conferência rápida no AC
node scripts/auditoria/cetico-h09-sigilo.mjs --turnos 1,2 --procs 4
node scripts/auditoria/cetico-h09-cedula.mjs
node scripts/auditoria/cetico-h09-sigilo.mjs --turnos 1,2 --uf ac

# tabelas e gráficos deste tópico (confere cada número contra as saídas acima e o banco; ~5 min)
node --max-old-space-size=4096 scripts/auditoria/grafico-h09-dados.mjs
node scripts/auditoria/grafico-h09.mjs
```

Saídas em `data/parsed/auditoria/engenheiro-seguranca-urna/h09/` e `data/parsed/auditoria/cetico-revisor/h09/`, só com contagens. Nenhum número de título ou de CPF é gravado, e o script deste tópico se recusa a gravar um CSV com sequência de 10 ou mais dígitos.

## Gráficos (continuam no relatório)

- `docs/pericia/graficos/h09-rdv-ordem.svg`, `h09-suspensao-por-papel.svg`, gerados por `scripts/auditoria/grafico-h09.mjs` a partir dos CSVs acima.
