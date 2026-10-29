# 05. Invariantes medidos no banco (aptos, comparecimento por eleição, detalhamento, janela)

Matemático forense, 29/10/2026. Script: `scripts/auditoria/matematico-banco.mjs`, lendo a cópia imutável do banco (`src/banco-leitura.js`, cópia de 29/10 10:50 UTC, com as 28 UFs dos dois turnos). I6 e I7 também foram medidos pelo auditor A (C4, C5). Aqui eles são uma repetição independente, e o foco está no que não estava coberto: I8, I9 e I14.

## Resultado

**Fato.**

| # | Invariante | 2º turno: testadas / violações | 1º turno: testadas / violações |
|---|---|---|---|
| I6 | detalhamento = comparecimento | 497.897 / **0** | 497.895 / **0** |
| I7 | aptos = aptos da seção + TTE | 539.817 / **0** | 997.114 / **0** |
| I8 | aptos da seção iguais nas eleições federal e estadual | 39.739 / **0** | 497.897 / **0** |
| I9a | comparecimento federal = comparecimento do BU | 499.207 / 27 | 499.207 / 30 |
| I9b | 0 ≤ comp. federal − estadual ≤ aptos federal − aptos estadual | 39.739 / **0** | 497.897 / **0** |
| I9c | comparecimento majoritário = proporcional (eleição estadual, 1º turno) | — | 497.897 / **0** |
| I4 | Σ votos do cargo = escolhas × comparecimento | 539.815 / **0** | 2.490.804 / **0** |
| I13a | log: biometria + ano de nascimento + dado pessoal = votos computados | 499.207 / 3 | 499.207 / 11 |
| I13b | log = detalhamento do BU, classe a classe | 497.897 / 7 | 497.895 / 13 |
| I14 | votos fora da janela de votação | 499.207 / **0** | 499.207 / **0** |

## As violações

- **I9a (27 + 30), Fato, formato do arquivo, não é achado:** todas são BU do Sistema de Apuração: no 2º turno, 27 do exterior (`saManual`); no 1º, 28 do exterior e 2 de MG (`saMistaBUImpressoCedula`). No SA, o BU grava `qtdEleitoresCompareceram = 0` e traz o comparecimento só por eleição. O auditor A conferiu isso em ZZ 29173/0001/0494. Fora do SA, 0 violação.
- **Sem detalhamento:** as seções do exterior (1.310 nos dois turnos) e as 2 do SA misto em MG no 1º turno não têm `detalhamentoComparecimento`. I6 não se aplica a elas.
- **I13a e I13b no 2º turno (10 seções), Fato:** são as mesmas do [doc 02](02-ciclo-do-eleitor.md) e do auditor A. Três vêm de erro de leitura do perfil (`src/perfil-secoes.js` soma cópias do mesmo log, ou log de outra seção): BA 39870/0133/0184, MG 40690/0016/0264, ES 57932/0009/0085. As outras sete são as interrupções que viraram voto e os votos sem rastro no log. Lendo direto dos brutos, sem cópias, a conta do log fecha.
- **I13a e I13b no 1º turno (24 linhas, 19 seções), Fato:**
  - **10 são erro de leitura do perfil:** GO 95095/0131/0065, MG 44458/0103/0221, MG 47830/0165/0031, PA 04855/0031/0087, PR 74713/0078/0261, PR 75353/0002/0574, PR 76570/0010/0273, RJ 58041/0155/0190, RJ 60011/0214/0022 e 0024.
    - Nos brutos, deduplicando e lendo cada urna na ordem do arquivo, os votos computados batem com o BU em todas, e as confirmações por cargo também (I11 sem violação).
    - Há duas causas no perfil: somar as cópias MI/ME do mesmo log (de 1.650 a 4.253 linhas repetidas nesses pacotes) e ordenar por hora os logs de duas urnas, o que mistura os ciclos.
  - **9 são as seções de I11 do [doc 02](02-ciclo-do-eleitor.md):**
    - 6 interrupções que viraram voto: ES 56995/0053/0211, RJ 58971/0087/0184, RN 16039/0029/0028, SP 63614/0227/0305, SP 64254/0291/0346 e SP 71072/0260/0037;
    - 3 contingências com votos sem rastro no log: BA 39934/0183/0175, SP 71072/0002/0035 e RS 89036/0083/0044.

## Leitura pelo princípio 8

- I8 e I9b testam a carga do cadastro na urna, que é feita por pessoas, e deram 0 violação. Nenhuma seção tem eleitor original apto numa eleição e não na outra. Nenhuma tem mais eleitores votando só para presidente do que eleitores em trânsito de outra UF.
- I14 com 0 violação diz que nenhum voto foi computado antes de `Urna pronta` nem depois de `Inicio do Encerramento`. Mas a janela usa o relógio da urna, e o operador pode ajustar esse relógio no dia (doc 02, cuidado 2). Um teste completo da janela precisa também dos ajustes de relógio (doc 07, D4), que estão com o auditor da linha do tempo.

## Reproduzir

```bash
node src/banco-leitura.js --publicar               # (coordenador) cópia de leitura nova, quando a carga avançar
node scripts/auditoria/matematico-banco.mjs        # → data/parsed/auditoria/matematico/banco-invariantes.json
```

O JSON traz, por turno e invariante, as seções testadas, as violações e até 20 exemplos, além do ponteiro da cópia usada (`copiaLeitura`).
