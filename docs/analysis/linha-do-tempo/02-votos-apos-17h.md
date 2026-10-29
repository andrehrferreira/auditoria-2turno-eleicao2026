# 02. Votos depois das 17h de Brasília e encerramento às 19h (A2, B3, H06)

Auditor C. Fuso por município do [01](01-fuso-horario.md). Exterior fora (fuso desconhecido). Premissa 8 (doc 01): procedimento feito por pessoas **não** conta como controle. "Fila legítima" não é explicação: é uma brecha humana, e por isso é testada nos dados.

## Comandos

```bash
node scripts/auditoria/tempo-perfil.mjs --turno 2        # resumo.json, votos-apos-17h.csv (por hora, perfil)
node scripts/auditoria/tempo-extensao.mjs                # extensao-resumo.json, locais-encerramento-19h.csv (banco)
node scripts/auditoria/tempo-logs-tardios.mjs --paralelo 5   # relê 43.358 logs brutos ao segundo (≈3,5 min)
node scripts/auditoria/tempo-tardios-resumo.mjs          # logs-tardios-resumo.json
node scripts/auditoria/tempo-conferir.mjs --secao uf/mun/zona/secao   # caso a caso
```

Saídas em `data/parsed/auditoria/tempo/2t/`.

## Hipótese nula

Votos depois das 17h só vêm de quem já estava na fila às 17h. São poucos, terminam logo depois das 17h e não mudam o resultado de nenhum lado.

## Fatos (29/10/2026, 497.896 seções com log e fuso conhecido)

### 1. Trava técnica às 17h para encerrar, nenhuma para votar

- **A urna não deixa encerrar antes das 17:00 de Brasília.** Ao tentar, o log registra `Encerramento só pode ser solicitado após as 17:00:00 horas` (ex.: AL 27081/0053/0162, 09:45:57). Houve tentativa antes das 17h em 1.371 das 43.358 seções relidas, e nenhum BU tem encerramento antes das 17h. O mais cedo foi 17:00:09.
- **Não há trava para votar depois das 17h.** A urna aceita voto até o mesário encerrar. O limite das 17h para chegar à fila depende só de pessoas.
- 0 voto antes das 8h de Brasília. 0 voto depois do encerramento do BU. 0 voto antes da abertura do BU, salvo SP 71374/0172/0098: contingência, BU de abertura às 08:35:04, 1º voto às 08:31:20 no log da urna original (Hipótese: o BU traz a abertura da urna reserva).

### 2. Quantos e onde

| | Votos | Seções |
|---|---|---|
| Total de votos (log = BU) | 127.854.844 | 497.896 |
| Depois das 17:00 | **34.330 (0,027%)** | 29.854 (6,0%) |
| Depois das 18:00 | 1.993 | 1.667 |
| Depois das 19:00 | 11 | 11 |

- Por UF, entre 0,010% (SC) e 0,056% (RO) dos votos. Depois das 18h, concentrado em RJ (883), SP (641), BA (287), PE (113) e PB (41). Detalhe em `resumo.json` (`votosApos17.porUf`) e por seção em `votos-apos-17h.csv`.
- Último voto: em 26.454 seções entre 17:00 e 17:29; em 1.656 entre 18:00 e 18:59; em 11 depois das 19h (mediana de 1,25 min depois das 17h; p99 de 102 min; máximo de 126 min).

### 3. Encerramento às 19h: decisão humana, sem trava técnica

- **6.352 seções** encerraram às 19h de Brasília ou depois (6.257 entre 19:00 e 19:09). Outras 1.260 encerraram entre 17h30 e 18h59.
- Estão em 147 municípios: Rio de Janeiro (1.978 seções, 339 locais), São Paulo (1.481), Salvador (730), Petrópolis (285), João Pessoa (265), Itaboraí (237), Recife (220) e outros. São 313 locais de votação com todas as seções às 19h e 818 locais mistos, em que só parte das seções esperou até 19h (`locais-encerramento-19h.csv`).
- No 1º turno não aparece esse degrau às 19h: os encerramentos tardios das 11 UFs já carregadas vão das 18h às 22h, espalhados como fila.
- **A urna não exigiu 19h.** Em 1.025 dessas 6.352 seções, o mesário selecionou `Encerrar votação` antes das 19h (524 entre 17:00 e 17:29), respondeu `Todas as pessoas presentes já votaram? SIM` e depois cancelou (`Operador cancelou o encerramento da votação` ou `Procedimento de encerramento abortado`). Ex.: BA 38490/0002/0047 selecionou às 17:11:12, respondeu SIM às 17:11:18, cancelou às 17:11:59 e encerrou às 19:04:44. Em 16 seções o encerramento foi confirmado exatamente às 19:00:00, o que só é possível com a seleção feita antes das 19h.
- Nessas 6.352 seções houve 4.492 votos depois das 17h, 1.860 depois das 18h e 11 depois das 19h. 3.339 delas não tiveram nenhum voto depois das 17h.
- **[a confirmar] ato do TSE ou dos TREs** que tenha estendido o horário até 19h nesses locais. O log mostra só o comportamento: as urnas ficaram abertas por decisão de quem as operava. Existir ou não o ato não muda o rastro técnico.

### 4. Indícios no log de chegada depois das 17h (a brecha foi usada?)

Teste: voto tardio que vem depois de uma pausa longa, com a urna parada. Quem estava na fila às 17h é atendido em sequência. Atendimento que começa bem depois das 17h, com a urna ociosa, indica eleitor que chegou depois das 17h. Fonte: log bruto, resolução de 1 s.

| Grupo (encerramento do BU, Brasília) | Seções | Votos depois das 17h | Depois de pausa ≥ 30 min | Seções com 1º tardio atendido depois das 17:05 e urna ociosa ≥ 10 min |
|---|---|---|---|---|
| até 17h29 | 26.454 | 29.191 | 602 | 389 |
| 17h30–18h59 | 1.260 | 647 | 264 | 252 |
| 19h ou depois | 6.352 | 4.492 | 2.567 | 2.230 |

- **Fato:** em 784 seções, o mesário respondeu `SIM` a `Todas as pessoas presentes já votaram?` e houve voto **depois** dessa resposta: 580 no grupo das 17h, 32 entre 17h30 e 18h59, 172 no grupo das 19h. A declaração humana registrada no log é desmentida pelo próprio log. Exemplo extremo: BA 36854/0180/0147, último voto antes das 17h às 16:30:41 e próximo eleitor atendido às 18:25:57 (lista em `logs-tardios-resumo.json`, `casos`).
- **Habilitação dos votos tardios:**

  | Grupo | Biometria | Sem biometria cadastrada | Liberação manual |
  |---|---|---|---|
  | até 17h29 | 24.398 (83,6%) | 2.324 | 2.469 |
  | 19h ou depois | 3.915 (87,2%) | 332 | 245 |
  | média nacional do dia (BU) | 87,6% | 5,7% | 6,8% |

  No grupo das 17h, a parcela sem biometria fica 4 p.p. acima da média.
- **Hipótese:** cerca de 2.900 a 3.300 votos (a soma das pausas ≥ 30 min nos três grupos) são de eleitores que chegaram depois das 17h. Sem o ato oficial, não dá para dizer se eram permitidos. Os 1.860 votos depois das 18h no grupo das 19h são o caso mais forte.

### 5. Voto tardio favoreceu algum lado? (B3/H06)

- Não dá para saber em quem o eleitor tardio votou (sigilo do RDV, doc 06). Só dá para comparar seções.
- Comparação **dentro da mesma zona**, entre seções com voto tardio e sem voto tardio (`resumo.json`, `tardioXResultado`):
  - algum voto depois das 17h: −0,26 p.p. no % do 13 (entre 13 e 22) em 3.880 zonas. O bruto é 53,98% contra 51,63%; a diferença some dentro da zona.
  - correlação de Pearson dentro da zona entre a parcela de votos tardios e o % do 13: **+0,013** (497.830 seções).
- Locais encerrados às 19h × locais às 17h da mesma zona (`extensao-resumo.json`): −0,47 p.p. em 83 zonas. Por UF: RJ −0,03; SP −0,39; BA −1,25; PE −0,32; PB −2,97. A diferença de diferenças contra o 1º turno da mesma seção (UFs do 1º turno já no banco, sobretudo BA) dá **+0,10 p.p.**
- **Escala:** a margem nacional de presidente é de 4.430.191 votos (13: 64.256.232; 22: 59.826.041, soma dos BUs). Todos os votos depois das 17h somam 34.330 (mais 417 no exterior, no horário local). Mesmo que fossem todos de um lado, seriam 0,8% da margem.

**Conclusão (Fato, nos limites acima):** H06 não se sustenta como efeito no resultado. O voto tardio não favorece nenhum lado de forma mensurável, e o volume é pequeno demais para mudar o resultado nacional. **Risco aberto (premissa 8):** depois das 17h, a admissão de eleitores depende só do mesário, e o log mostra milhares de atendimentos que começaram com a urna ociosa e 784 declarações "todos votaram" desmentidas.

## Recomendações

1. Obter o ato (TSE/TRE) que mandou manter as seções abertas até 19h, com a lista de locais, e cruzar com `locais-encerramento-19h.csv`, incluindo os 818 locais mistos.
2. Repetir com o 1º turno quando os perfis estiverem prontos (`--turno 1` no `tempo-perfil.mjs`; os outros scripts usam o dia do 2º turno).
3. Para a parte de biometria (H05), cruzar os votos tardios sem biometria com o mesário que liberou e com as rajadas (Auditor de biometria).
