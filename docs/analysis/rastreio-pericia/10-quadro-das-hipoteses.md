# Rastreio: docs/pericia/10-quadro-das-hipoteses.md

Índice do que saiu do tópico 10 do relatório na reescrita de 30/10/2026 (relatório independente do processo, regra em CLAUDE.md, seção "Relatório de perícia"). Este arquivo **não** entra no relatório. Versão anterior completa: `git show f33a89f:docs/pericia/10-quadro-das-hipoteses.md`.

Convenção da reescrita: "parecer (cético) N" virou "conferência independente" e o rótulo "**(revisado)**"; "recontado nesta verificação" ficou (é a recontagem de `scripts/auditoria/verifica-pericia-quadro.mjs`). Todos os pareceres estão em `docs/analysis/cetico-revisor/`.

## Situação (cabeçalho)

- H14 pelo parecer cético 30; H09 pelo parecer cético 29; H25 pelo parecer cético 33.
- Registro de hipóteses: `docs/hipoteses.md`. Pareceres: `docs/analysis/cetico-revisor/`.
- Conferência deste tópico: `scripts/auditoria/verifica-pericia-quadro.mjs`.

## Como ler o quadro

- Status: link `docs/hipoteses.md`; frase retirada "Só o coordenador muda o status".
- "Revisão cética" (revisor, parecer, autor) virou "Conferência independente", com sim / em parte / não.
- Universo completo: link `docs/01-premissas.md` (princípio 9) trocado por link ao tópico 7.

## O quadro: coluna "Revisão cética" → "Conferência independente"; coluna "Onde ler mais"

| # | Pareceres retirados | Valor novo | Link retirado de "Onde ler mais" (substituto) |
|---|---|---|---|
| H01 | 02 (`02-centenarios-excesso-cadastro.md`), 03 (`03-centenarios-nao-votam.md`) | sim, sustentado com ressalvas | — |
| H02 | 01 (`01-b1a-sem-biometria-acima-do-cadastro.md`) | sim, a parte do excesso sobre o cadastro, sustentado com ressalvas | — |
| H03 | 05 (`05-h10-crescimento-cabe-no-disponivel.md`), 08 (`08-votos-sem-log-contingencia.md`), 25 (`25-votos-sem-log-reconciliacao.md`), 26 (`26-h03-1turno-todos-cargos.md`) | sim: Presidente, votos sem rastro e 1º turno todos os cargos | — |
| H04 | 24 (`24-integridade-h04-h11.md`); "método do parecer", "código do revisor" | sim: 2º turno sustentado; 1º turno com o mesmo método e o programa da conferência independente | — |
| H05 | 27 (`27-h05-28ufs.md`), 06 (substituído), 10 (`10-a7-comparecimento-alto-sem-digital.md`) | sim: divisão do voto a mais e comparecimento muito alto | — |
| H06 | 28 (`28-chegada-dos-bus.md`) | em parte: votos tardios não; apuração sim | `docs/analysis/linha-do-tempo/02-votos-apos-17h.md` (fica só tópico 3, item 12) |
| H07 | — | não | `docs/analysis/biometria-mesarios/06-h07-modelo-urna.md` (→ tópico 4, item 5) |
| H08 | 25 | em parte: intervalos não; votos sem rastro sim | `docs/analysis/linha-do-tempo/03-intervalos-minimos.md` (→ tópico 3, item 5) |
| H09 | 29 (`29-h09-sigilo.md`) | sim, sustentado com ressalvas | — |
| H10 | 05 | sim, sustentado com ressalvas | — |
| H11 | 24 | sim, sustentado com ressalvas | — |
| H12 | — | não | `docs/hipoteses.md` (→ "item H12, abaixo") |
| H13 | 15 (`15-h13-liberacao-mesario.md`) | sim (estimativas) | — |
| H14 | 30 (`30-h14-urnas-reserva.md`) | sim, sustentado com ressalvas | — |
| H25 | 33 (`33-h25-certificado-ac-urna.md`) | sim, sustentado com ressalvas | — |

## Hipótese por hipótese

- **H01:** parecer 02 (excesso descontadas as mortes).
- **H02:** "o revisor conferiu", "estimativas do revisor" (parecer 01).
- **H03:** pareceres 05, 26, 25, 08; `scripts/auditoria/verifica-pericia-coerencia-topicos.mjs --turno 1`; `scripts/auditoria/verifica-pericia-coerencia-munzona.mjs --turno 2`; `docs/analysis/coerencia-contagem/01-bu-x-oficial.md`. O nome do arquivo público do TSE `votacao_candidato_munzona` ficou, com o nome em português.
- **H04:** parecer 24, itens 1, 2, 4, 10 a 13 ("o revisor alterou de propósito um único bit"; "código do revisor cético"; "previu os 37.440").
- **H05:** parecer 27 (e 06, substituído).
- **H06:** parecer 28; minuta "guardada no repositório" (`data/raw/stf/rcl-101673-zanin-25out26.pdf`).
- **H07:** `docs/analysis/biometria-mesarios/06-h07-modelo-urna.md` ("o autor do achado" → "a análise original").
- **H08:** `scripts/auditoria/t15-quadro-hipoteses.mjs` (SP 64777/0395/0298, 27 s; agora "recontado numa revisão posterior"); `docs/analysis/linha-do-tempo/03-intervalos-minimos.md`; parecer 25.
- **H09:** parecer cético 29.
- **H11:** parecer 24, itens 5, 6, 7, 8, 9, 16, 17 e 19.
- **H12:** "fora do repositório" → "fora dos arquivos da auditoria".
- **H13:** `docs/analysis/hipotese-liberacao-mesario/00-sintese.md`; parecer 15 ("revisado pelo cético").
- **H14:** parecer 30.
- **H25:** parecer 33.

## Testes revisados sem número de hipótese

- Eleitores acima da população: `docs/analysis/cetico-revisor/04-eleitorado-acima-populacao.md` (parecer 04).
- Concentração de votos: `docs/analysis/forense-estatistica/07-assimetria-e-sintese.md`.

## Limites deste quadro

- "ainda não têm parecer do revisor cético".

## Seção "Como repetir" (retirada inteira)

Cada parecer do revisor cético traz, no fim, os comandos que refazem as contas. Os principais:

```
node scripts/auditoria/cetico-centenarios-excesso-consolidacao.mjs        # H01, excesso no cadastro
node scripts/auditoria/cetico-centenarios-nao-votam-oficial.mjs           # H01, comparecimento oficial dos 100+
node scripts/auditoria/cetico-b1a-definicoes.mjs --turno 2                # H02, excesso sobre o cadastro
node --max-old-space-size=4096 scripts/auditoria/cetico-h10-consolidacao.mjs   # H10 e H03 do 1º turno
node --max-old-space-size=8000 scripts/auditoria/matematico-h03-1turno.mjs        # H03 do 1º turno, todos os cargos (109 totais e nulo técnico)
node --max-old-space-size=8000 scripts/auditoria/cetico-h03-1turno.mjs            # H03 do 1º turno, conferência do parecer 26
node --max-old-space-size=6144 scripts/auditoria/cetico-h05-28ufs.mjs 20               # H05, divisão do voto a mais, 28 UFs (parecer 27)
node --max-old-space-size=6144 scripts/auditoria/cetico-h05-28ufs-covariaveis.mjs       # H05, o resultado com cada característica da seção (parecer 27)
node scripts/auditoria/cetico-a7-reproducao.mjs                           # H05, comparecimento alto
node scripts/auditoria/cetico-vsl-consolidacao.mjs                        # H03, votos sem rastro no diário (parecer 08)
node scripts/auditoria/cetico-vsr25-universo.mjs --turno 2 --procs 2      # H03 e H08, votos sem rastro no diário, dois turnos (parecer 25; e --turno 1)
node scripts/auditoria/cetico-eleitorado-acima-populacao-consolidacao.mjs # eleitores acima da população
node scripts/auditoria/cetico-integridade-recontagem.mjs --turno 2        # H04 e H11, 2º turno
node scripts/auditoria/cetico-integridade-recontagem.mjs --turno 1 --dir data/parsed/auditoria/integridade/1t-identificadores   # H11, 1º turno
node scripts/auditoria/cetico-integridade-controle.mjs                    # H04, adulteração de propósito
node scripts/auditoria/cetico-integridade-casos.mjs                       # H04 (162 e 842 seções) e H11 (Recuperador de Dados)
node scripts/auditoria/cetico-integridade-boot-do-erro.mjs --turno 2      # H04, nenhum voto na inicialização do erro
node scripts/auditoria/cetico-integridade-trocas-modelo.mjs               # H11, troca de urna por modelo
node --max-old-space-size=8192 scripts/auditoria/cetico-chegada-bu.mjs --replicas 200   # H06, chegada dos boletins ao TSE (parecer 28)
node --max-old-space-size=4096 scripts/auditoria/grafico-chegada-bu-dados.mjs          # H06, recontagem por seção e dados dos gráficos (tópico 3, item 12)
node --max-old-space-size=8192 scripts/auditoria/cetico-h14-votos.mjs                  # H14, teste de nível, outra zona e escala (parecer 30)
node --max-old-space-size=4096 scripts/auditoria/grafico-h14-dados.mjs                 # H14, confere os números do tópico 11 e grava os dados dos gráficos
```

Os comandos da varredura completa de lacres, autoverificação e números de série estão nos tópicos 1 e 2 (ver os rastreios desses tópicos).

A conferência deste tópico (cópia de leitura do banco e perfis por seção dos dois turnos; H03 Presidente do 2º turno, H05 aumento de comparecimento, H06, H07 e H08; a parte de H11 que ela imprime é só do Acre e foi substituída pelo país inteiro) e a das assinaturas em seções de exemplo (AC, ES e os sete arquivos de H09):

```
node --max-old-space-size=8192 scripts/auditoria/verifica-pericia-quadro.mjs
node src/lacres.js data/raw/2t/urnas/ac
node src/lacres.js data/raw/2t/urnas/es/57037/0055/0372
node src/lacres.js data/raw/2t/urnas/es/57037/0055/0364
node --max-old-space-size=8192 scripts/auditoria/verifica-pericia-coerencia-topicos.mjs --turno 1   # H03, 1º turno completo
unzip -Z1 data/raw/2t/zip/<pacote da UF>.zip | grep -E "(jufa\.dat|imgze\.dat|-hash\.dat|mr\.ver|wsq(bio|man|mes)\.jez)$"
```

## Próximos passos

- "revisão cética de H03 ... H06 (a apuração já tem o parecer 28) ... H09 tem o parecer 29" → "conferência independente ...".
- H13: "depois que os perfis dos logs forem regerados" → "depois que a leitura dos diários for refeita".
