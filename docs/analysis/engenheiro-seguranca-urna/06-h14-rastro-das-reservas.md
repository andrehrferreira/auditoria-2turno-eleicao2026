# 06. H14: a urna reserva do 2º turno deixou rastro de manipulação?

Perfil `engenheiro-seguranca-urna`, hipótese H14 ([hipoteses.md](../../hipoteses.md)): "urnas trocadas por reserva no 2º turno podem ter sido manipuladas". O estatístico testa os **votos** dessas seções. Este documento testa o **rastro técnico**: se a reserva tivesse sido adulterada, que marca isso deixaria nos arquivos públicos, e essa marca aparece?

Universo completo do 2º turno: 499.207 pacotes e 512.173 logs (principal e aninhados), sem falha de leitura, mais o 1º turno das mesmas seções. **Ainda não revisado pelo cético.**

## Resposta curta

1. **Fato: nenhuma marca de software adulterado na reserva.** Em nenhuma das 2.818 seções H14 a reserva votou num boot com etapa de verificação de assinatura falhada. Nenhum pacote falha no lacre. As versões são as mesmas do resto do país (doc [04](04-versao-e-verificacao-de-assinatura.md)). Erros de assinatura **no log da própria reserva** ocorrem na mesma taxa das urnas de seção da mesma UF e do mesmo modelo: 6 observados, 6,56 esperados.
2. **Fato: a carga da reserva é diferente da carga da urna de seção, mas igual à das reservas do 1º turno.** Mídia de carga fora do lote da zona, carga em dia separado e município da sede da zona são o jeito normal de carregar reserva. A prova é que as reservas herdadas do 1º turno têm as mesmas taxas.
3. **Fato: em 125 seções H14, a reserva foi carregada para outra zona da mesma UF.** É 4,4% das seções H14, contra 1,6% das reservas herdadas. Nenhuma veio de outra UF.
   - O maior bloco é Aracaju. Em 17/10, 10 seções da zona 0001 receberam reservas carregadas para a zona 0002, numa tarde (13:01 a 16:22).
   - Em 19/10, a zona 0002 recebeu 10 reservas, 9 delas carregadas naquele dia.
   - É uma troca de equipamento entre as duas zonas, registrada no log. Ela explica boa parte do excesso de trocas de Aracaju apontado no parecer [24](../cetico-revisor/24-integridade-h04-h11.md), item 18.
4. **Fato: na mesma seção, o modo de habilitação do eleitor não piorou com a reserva.**
   - Votos sem biometria, diferença-em-diferenças contra o controle: −0,20 p.p. [−0,53; +0,14].
   - No dia, a reserva liberou sem biometria 15,0% dos votos, e a urna que ela substituiu, 16,4%.
   - A troca não criou voto sem rastro: os 3 casos de voto no BU sem linha no log já eram conhecidos (doc 04) e são contingência em cadeia.
5. **Fato, fora do padrão (pequeno):** em 7 seções H14, a reserva habilitou quase todos os eleitores sem digital: 90% a 99% dos votos, contra 12% a 15% na urna anterior ou no 1º turno.
   - Na maioria, a liberação foi por uma digital que a urna grava como "não associada a mesário" (linha M3 da [matriz](01-matriz-ataques.md)).
   - Medido por seção, o padrão é 75 vezes mais comum nas seções H14 que no controle (3 em 2.805 × 7 em 490.250; Fisher p = 2,1 × 10⁻⁵).
   - O log não distingue leitor biométrico com defeito de mesa que usa dedo de outra pessoa (premissa 8).
6. **Limite:** um software alterado e assinado com a chave do TSE gera log normal e passaria em todos estes testes. O mesmo vale para votos inseridos por mesário dentro do procedimento normal. Isso fica em "O que o teste não enxerga".

Gráficos: [carga](graficos/h14-carga.svg), [assinaturas](graficos/h14-assinaturas.svg), [relógio](graficos/h14-relogio.svg), [mesma seção, 1º × 2º turno](graficos/h14-votos-1t-2t.svg), [onde a reserva estava no 1º turno](graficos/h14-historico-reserva.svg).

## O ataque que a H14 descreve, visto pelo atacante

Alguém prepara uma urna reserva adulterada e faz com que ela substitua a urna da seção. A troca precisa de gente: alguém declara a falha e executa a contingência. Pela premissa 8, isso não conta como controle. Conta o que a urna grava.

| Variante | O que o atacante precisa ter | Rastro esperado nos arquivos públicos | Item |
|---|---|---|---|
| A. Reserva com software alterado | Acesso às reservas no cartório; mídia de carga com software alterado **e assinado** (chave CEPESC), ou um jeito de pular a verificação na carga e em cada boot | Carga fora do lote da zona; computador gerador estranho; carga perto da votação; etapa de verificação faltando, fora de ordem ou com erro; relógio mexido para disfarçar a hora | 1, 2, 3 |
| B. Reserva certa, usada para encobrir votos inseridos pela mesa (eleitor ausente) | Mesa conivente; acesso à reserva e à MV da seção | Liberação sem biometria e pelo mesário acima do 1º turno na mesma seção; rajadas; voto no BU sem linha no log | 4 |
| C. Reserva vinda de outro lugar, já usada ou preparada fora | Acesso a urnas de outra zona ou município | Carga gravada com outra zona; mídia de carga que nenhuma urna da zona usou; a urna aparece em outra seção no 1º turno | 1, 5 |
| D. Pacote trocado depois | Acesso ao caminho até a totalização | Falha de lacre | 6 |

## Método

**Grupos** (`seguranca-h14-grupos.mjs`, seções com urna nos dois turnos, Sistema de Apuração de fora):

| Grupo | Definição | Seções |
|---|---|---|
| Controle | urna de seção (`tipoUrna` 1) nos dois turnos, mesma urna, mesmo código de carga | 491.489 |
| **H14 entre turnos** | 2º turno em reserva (`tipoUrna` 4 ou 6) com nº interno diferente do 1º turno; a última "Início do procedimento de contingência" no log da reserva é anterior a 25/10 | 848 |
| **H14 no dia** | idem, contingência em 25/10 | 1.968 |
| H14 sem registro | idem, sem contingência no log da reserva (os 2 RED de ES e SP, `tipoUrna` 6) | 2 |
| Herdada | reserva nos dois turnos, mesma urna (assumiu no 1º turno e ficou) | 2.893 |
| Outra urna de seção | `tipoUrna` 1 nos dois turnos, urna diferente | 1.562 |
| Recarga | mesma urna, código de carga novo | 357 |

O total H14 é 848 + 1.968 + 2 = **2.818**, o mesmo do parecer 24, item 17. Por tipo (1º → 2º turno): seção → reserva 2.733, reserva → reserva 83, seção → reserva encerrando 2.

**Teste.** Cada rastro vira um indicador sim/não por seção. Ele é comparado entre o grupo H14 e o controle por:

- diferença de proporções com IC 95% de Newcombe;
- teste exato de Fisher;
- observado/esperado com o esperado padronizado pela taxa do controle na mesma UF e no mesmo modelo de urna (o modelo da urna que votou no 2º turno);
- comparação com as reservas **herdadas**. Elas são reservas carregadas do mesmo jeito; o que é efeito de "ser reserva" aparece nelas também.

No item 4, o contraste é na **mesma seção**: valor do 2º turno menos valor do 1º turno, H14 menos controle (diferença-em-diferenças, IC 95% de Welch). Também se usa o controle só das zonas que têm seção H14 (254.485 seções).

**Hipótese nula.** A reserva deixa no log o mesmo rastro de uma urna de seção, descontado o que a própria contingência produz (um log a mais no pacote, uma carga como "urna de contingência", um reinício).

**Múltiplas comparações.** São cerca de 45 indicadores × 3 grupos. Com Bonferroni, só p < 4 × 10⁻⁴ conta como achado isolado. Diferença que a própria contingência produz não conta como sinal, mesmo com p pequeno.

## Item 1. Carga da reserva

O log da carga (aplicativo SCUE) grava: hora do relógio interno, hora digitada pelo operador, "Seção informada pelo operador" (`0000 - Urna de contingência` na reserva), município, zona, mídia de carga (identificador, computador que a gerou e data da geração) e código de carga. Em 499.178 de 499.178 pacotes com urna, o código de carga do BU foi achado numa carga do log da própria urna.

| Indicador | Controle | H14 entre turnos | H14 no dia | Herdada | H14 − controle, p.p. [IC 95%] | Fisher | H14 × herdada | Obs./esp. UF × modelo |
|---|---|---|---|---|---|---|---|---|
| Carregada até 04/10 (carga do 1º turno) | 100% | 779 (91,9%) | 1.765 (89,7%) | 100% | −9,65 [−10,80; −8,62] | ~0 | 3,4e-87 | 2.528 / 2.800 |
| Carregada de 05/10 a 23/10 | 0% | 68 (8,0%) | 193 (9,8%) | 0% | +9,26 [+8,25; +10,39] | ~0 | 1,4e-83 | 261 / 0 |
| Carregada em 24/10 (véspera) | 0% | 1 (0,12%) | 10 (0,51%) | 0% | +0,39 [+0,22; +0,70] | 2,0e-25 | 0,0004 | 11 / 0 |
| Carregada em 25/10 | 0% | 0 | 0 | 0 | — | 1 | 1 | — |
| Hora da carga fora de 6h–20h | 0,24% | 9 (1,06%) | 32 (1,63%) | 1,94% | +1,22 [+0,84; +1,73] | 3,2e-19 | **0,18** | 41 / 13,31 |
| Dia sem carga de urna de seção da zona | 0,18% | 270 (31,8%) | 537 (27,3%) | 20,0% | +28,46 [+26,82; +30,16] | ~0 | 3,6e-14 | 801 / 19,68 |
| **Zona da carga ≠ zona da seção** | 0% | 78 (9,2%) | 47 (2,4%) | 1,56% | +4,44 [+3,74; +5,26] | 1,9e-282 | **8,3e-11** | 119 / 0 |
| Município da carga ≠ município da seção | 0% | 167 (19,7%) | 356 (18,1%) | 18,0% | +18,59 [+17,20; +20,07] | ~0 | **0,58** | 524 / 0 |
| Mídia de carga que nenhuma urna de seção da zona usou | 0,04% | 225 (26,5%) | 414 (21,0%) | 19,7% | +22,67 [+21,16; +24,25] | ~0 | 0,005 | 634 / 12,95 |
| Mídia de carga usada por urna de seção de outra zona | 0% | 214 (25,2%) | 378 (19,2%) | 19,2% | +21,04 [+19,58; +22,59] | ~0 | **0,08** | 587 / 0 |
| **Computador gerador da mídia que não gerou mídia de nenhuma urna de seção da zona** | 0,016% | 70 (8,3%) | 52 (2,6%) | 2,04% | +4,31 [+3,62; +5,13] | 3,5e-218 | **7,3e-7** | 116 / 8,06 |
| Mídia de carga gerada a partir de 05/10 | 0% | 1 | 1 | 0 | +0,07 | 3,2e-5 | 0,24 | 2 / 0 |

As tabelas completas, geradas pelo script, estão em `reservas-rastro/tabelas.md`. "~0" = p menor que 10⁻³⁰⁰.

- **Fato:** nenhuma urna H14 foi carregada no dia da votação. As 5 cargas no dia do 2º turno (doc 04) são de urnas de seção.
- **Fato:** 2.546 das 2.818 reservas H14 (90%) foram carregadas para o 1º turno (até 04/10), ficaram guardadas e assumiram no 2º. Outras 272 foram carregadas depois: 261 entre 05/10 e 23/10, e 11 na véspera. Todas as 11 da véspera gravam "0000 - Urna de contingência" e a própria zona da seção. Exemplos: CE 14818/0079/0214 (24/10 13:33) e SC 82210/0106/0019 (24/10 14:18).
- **Fato (explicação benigna testada):** reserva é carregada à parte, em outro dia e, muitas vezes, com mídia de carga e computador próprios da sede da zona. As reservas herdadas do 1º turno mostram o mesmo. Hora fora de 6h–20h: H14 1,5%, herdada 1,9%. Município da sede: 18,6% × 18,0%. Mídia de carga usada em outra zona: 21,0% × 19,2%.
- **Fato:** o que fica acima até da herdada é **zona da carga diferente** (125 seções) e **computador gerador fora da zona** (122). Os dois casos são em boa parte os mesmos. Todos são da mesma UF. Os blocos maiores:

  | Seções H14 | Seção recebeu reserva carregada para | Entre turnos / no dia |
  |---|---|---|
  | 16 | SE Aracaju 31054/0001 ← zona 0002 (computador `RSEWGM04`) | 10 / 6 |
  | 15 | 13 municípios de SE ← Aracaju 31054/0027 (`RSEWGM07`), trocas de 12 a 16/10 | 14 / 1 |
  | 15 | AM Manaus 02550, zonas 0031 a 0065 ← zona 0001 (`RAMWSEVIN44126`) | 5 / 10 |
  | 14 | GO: 13 entre zonas de Goiânia 93734 (`RGOWGED001` a `003`) e 1 entre municípios | 13 / 1 |
  | 23 | RJ: 20 entre zonas do mesmo município (59013, 60011, 58696, 58335) e 3 entre municípios | 14 / 9 |
  | 10 | MA: 7 entre municípios (ex.: 08877/0075 ← 07277/0022) e 3 no mesmo município (09210) | 5 / 5 |
  | 7 | DF 97012 ← zona 0006 (`ZDF012WKS02`) | 6 / 1 |
  | 25 | AL 7, BA 5, MT 5, RR 3, MS 2, AC, AP, RO 1 cada | — |

  Total: 125 seções, 89 na mesma cidade (zonas diferentes do mesmo município) e 36 em outro município.

  Computadores com prefixo `R` (por exemplo `RSEWGM04`, `RGOWGED001`) aparecem em toda a carga da zona e parecem ser do TRE. Os de prefixo `Z` têm o número da zona no nome (`ZRJ088STD93`). A leitura dos nomes é **Hipótese**.
- **Fato (Aracaju, a troca entre zonas):**
  - Zona 0001, 17/10: 10 contingências entre 13:01 e 16:22. As reservas foram carregadas em 28/09 como reservas da zona 0002, pelo computador `RSEWGM04`. Em 9 delas, uma UE2013 deu lugar a uma UE2015.
  - Em 5 das 10, o log da urna original termina em 04/10: ela não foi ligada antes de ser substituída. Em 1, o log da original não está no pacote. Nas outras 4, o log vai até minutos antes da troca.
  - Zona 0002, 19/10: 10 contingências, e mais 4 em 24/10. 9 das reservas de 19/10 foram carregadas naquele mesmo dia, como reservas da zona 0002, pelo computador `RSEWGM04`. 7 reservas da zona 0002 são urnas que aparecem na zona 0001 no 1º turno.
  - Trecho do log da reserva da seção 31054/0001/0130 (urna 01794072):

    ```
    28/09/2026 09:47:22  SCUE  Seção informada pelo operador: 0000 - Urna de contingência
    28/09/2026 09:50:04  SCUE  Mídia de carga gerada pelo computador (nome - tpm - instalação): RSEWGM04 - …
    28/09/2026 09:50:04  SCUE  Zona Eleitoral: 0002
    17/10/2026 14:14:22  GAP   Início do procedimento de contingência
    17/10/2026 14:16:01  GAP   Serial da MV original da urna que está registrada na MI: 52FCA1D2
    17/10/2026 14:16:09  GAP   Contingência executada com sucesso
    ```
- **Hipótese (benigna):** troca planejada de urnas antigas (UE2013) entre as zonas 0001 e 0002 de Aracaju na preparação do 2º turno, feita pelo procedimento de contingência. Isso explicaria o excesso de trocas dessas duas zonas (parecer 24, item 18) sem falha de urna. Confirmar exige o registro de ocorrências do TRE-SE (**Recomendação**).
- **Fato (controle técnico que falta):** a urna aceita, na contingência, uma reserva carregada para outra zona. O log grava a zona da carga, mas nada impede a troca. No 2º turno de 2026, o conteúdo da carga é o mesmo para toda a UF (presidente e governador). Uma reserva de outra zona da UF é, portanto, tecnicamente equivalente. O que limita a troca é só o procedimento humano.
- **Fato:** 2 reservas H14 usaram mídia de carga gerada depois do 1º turno (14/10, `ZSP186STD03`, zona da própria seção): SP 70173/0186/0120 e 0207.

## Item 2. Assinaturas e autoverificação

Fontes: boots de votação e etapas de `seguranca-varrer-logs.mjs`, erros de etapa de `integridade-autoverificacao.mjs` (doc 07 da integridade), mensagens de erro de `seguranca-erros-assinatura.mjs` e catálogo de `.vsu`. O que importa é o log **da urna que votou** (a reserva). O pacote H14 traz também o log da urna substituída, que falhou; por isso há mais erros "em qualquer log".

| Indicador | Controle | H14 entre turnos | H14 no dia | Herdada | Fisher (H14 × controle) | H14 × herdada | Obs./esp. UF × modelo |
|---|---|---|---|---|---|---|---|
| Boot de votação com etapa sem SUCESSO | 0 | 0 | 0 | 0 | 1 | 1 | 0 / 0 |
| Boot de votação com sequência de etapas fora do comum | 16 | 0 | 1 | 3 | 0,09 | 0,63 | 1 / 0,11 |
| Boot de votação sem a etapa `-lo.vsc` (os 26 do parecer 24) | 16 | 0 | **7** | 3 | 4,4e-11 | 0,22 | 7 / 0,11 |
| Verificação da mídia externa ≠ 0 no boot de votação | 235 | 3 | 3 | 0 | 0,003 | 0,014 | 6 / 2,17 |
| Etapa [ERRO] no log da urna que votou | 143 | 1 | 0 | 1 | 0,56 | 1 | 1 / 0,62 |
| Etapa [ERRO] em qualquer log do pacote | 143 | 2 | 5 | 12 | 2,8e-5 | 0,36 | 7 / 0,62 |
| Erro de assinatura/integridade no log da urna que votou | 767 | 5 | 1 | 4 | **0,46** | 0,54 | **6 / 6,56** |
| Erro de assinatura/integridade em qualquer log | 767 | 14 | 17 | 24 | 2,1e-16 | 0,34 | 31 / 6,56 |
| Arquivo de estado (`.vsu`) com erro e restaurado | 51 | 1 | 2 | 2 | 0,004 | 0,68 | 3 / 0,75 |
| Troca de cartão de votação (contingência de MV) em 25/10 | 20 | 0 | 1 | 3 | 0,11 | 0,63 | 1 / 0,17 |
| Urna que votou sem boot de votação registrado | 0 | 0 | 5 | 0 | 3,4e-14 | 0,014 | 6 / 0 |
| Pacote com falha de lacre | 0 | 0 | 0 | 0 | 1 | 1 | 0 / 0 |

- **Fato:** nenhuma reserva H14 votou num boot com etapa sem SUCESSO.
- **Fato:** o erro de assinatura no log **da reserva** ocorre na taxa esperada: 6 observados e 6,56 esperados, contra 0,16% no controle. O excesso "em qualquer log" (31 × 6,56) está no log da urna substituída: ela falhou, e por isso foi trocada.
- **Fato (os 26 boots sem a etapa `-lo.vsc`, 3.320 votos):** 7 são de seções H14 no dia (293 votos), 3 de herdadas (580) e 16 do controle (2.447). Todos vêm logo depois de uma contingência de MV (cartão de votação novo), procedimento com rastro.
  - Em 6 dos 7 casos H14, o boot é da **urna original** (log aninhado): ela trocou o cartão, recebeu de 1 a 73 votos e depois foi substituída pela reserva. Exemplo: SP 65455/0201/0045, 73 votos no boot das 07:34, troca às 10:08.
  - Só 1 é da reserva: PE 23531/0023/0099, com 199 votos. Contingência às 09:14:47, "Mídia externa ausente" duas vezes, contingência de MV às 09:24:31 com o cartão `3E29B3E7`, urna pronta às 09:26:20.
- **Fato (urna que votou sem boot de votação, 5 + 1):** são contingências feitas depois de 17h (PA 04278/0098/0294 às 18:17, PA 05290/0036/0441 às 17:50, PB 19933/0003/0259 às 18:11, RJ 58971/0068/0154 às 17:24, RS 84913/0138/0014 às 17:26). A reserva só encerrou a seção; não recebeu voto. A sexta é o RED de ES 57932/0009/0112.
- **Fato (os 6 erros de assinatura no log da própria reserva, conferidos no bruto):** em todos, a reserva votou depois num boot com 34 etapas e SUCESSO.
  - RJ 60011/0233/0033 (assumiu em 15/10): na véspera, 24/10 às 15:03:41, `GAP erro 83 | Validação do VOTA | Erro verificando assinatura do arquivo /uenux/bin/vota.of em /uenux/bin/avusrbinof.vst. Desligue a urna e faça uma nova carga.` A urna foi desligada às 15:04:24, sem nova carga. Em 25/10 às 07:03 as 34 etapas passaram, e ela votou 253 vezes. É o padrão "erro → boot seguinte verifica tudo", já visto em 746 seções do controle (doc 04). O log não distingue falha de leitura de arquivo trocado e destrocado.
  - SC 81671/0039/0027: `infomidia.vsc` [ERRO] às 07:29:45 de 25/10, depois de "Mídia externa ausente" duas vezes (cartão mal encaixado). SUCESSO às 07:32.
  - GO 96253/0049/0006 (`rdv.vsu` em 24/10), RS 85758/0148/0343 (MR do 2º turno em 13/10), RS 85685/0110/0147 (`MSD com problema ao assinar`, 28/09) e SP 66230/0223/0046 (leitura da MV em 06/10).

## Item 3. Relógio

| Indicador | Controle | H14 entre turnos | H14 no dia | Herdada | Fisher (H14 × controle) | H14 × herdada | Obs./esp. UF × modelo |
|---|---|---|---|---|---|---|---|
| Relógio voltou sem ajuste registrado (log da urna que votou) | 4,40% | 35 (4,1%) | 79 (4,0%) | 5,2% | **0,38** | 0,04 | **114 / 116,08** |
| Relógio voltou sem ajuste (qualquer log do pacote) | 4,40% | 68 (8,0%) | 161 (8,2%) | 10,4% | 5,8e-18 | 0,004 | 229 / 116,08 |
| ADH (ajuste de data e hora) no log da urna que votou | 0,11% | 3 | 3 | 0,41% | 0,08 | 0,24 | 6 / 2,65 |
| ADH em 25/10 | 38 | 0 | 2 | 2 | 0,02 | 1 | 2 / 0,13 |
| Relógio interno a mais de 1 h da hora digitada na carga | 3,50% | 50 (5,9%) | 98 (5,0%) | 6,5% | 2,1e-6 | 0,05 | 148 / 110,59 |
| Relógio interno a mais de 1 dia da hora digitada | 3,13% | 36 (4,2%) | 93 (4,7%) | 5,6% | 3,5e-5 | 0,08 | 129 / 97,9 |

"Relógio voltou" = linha com hora anterior à maior já vista no log, sem ajuste nas 30 linhas anteriores (ajuste = hora digitada, "Data e hora atualizada", ADH, religamento).

- **Fato:** no log da urna que votou, relógio fora de ordem ocorre na mesma taxa do controle (114 × 116,1 esperados). A taxa "em qualquer log" dobra só porque há dois logs no pacote.
- **Fato:** o relógio interno da reserva está mais vezes errado no momento da carga (5,3% × 3,5%). A herdada, que é reserva, tem 6,5%. É efeito de urna guardada, não de manipulação: a hora que vale é a digitada, e ela é a mesma do procedimento normal.
- **Fato (ADH no dia, 2 casos):** MT 90603/0021/0198 (contingência às 07:26) e ZZ 29980/0001/3651 (07:19, exterior). O software bloqueia o ADH depois da zerésima (doc 04).
- **Fato (exemplo de relógio da reserva):** PE 23531/0023/0099. O relógio interno marcava 20/10 16:17 e o operador digitou 17/10 09:06 (3 dias para trás). A partir daí o log segue a hora digitada.

## Item 4. Votos no log × BU e modo de habilitação: mesma seção, 1º × 2º turno

Este é o contraste mais forte: mesma seção, mesmos eleitores, urna diferente. Fonte: `perfil_log` (perfil do dia de todos os logs do pacote) e `secao` (BU), cópia de leitura do banco de 29/10 10:50.

| Indicador | Controle 1º → 2º | H14 entre turnos 1º → 2º | H14 no dia 1º → 2º | Dif.-em-dif. entre turnos, p.p. [IC 95%] | Dif.-em-dif. no dia | H14 × controle das mesmas zonas |
|---|---|---|---|---|---|---|
| Votos sem biometria (% dos votos) | 12,44 → 12,66 | 15,19 → 15,35 | 15,35 → 15,45 | −0,29 [−0,79; +0,22] | −0,16 [−0,58; +0,27] | −0,20 [−0,53; +0,14] |
| Liberação pelo mesário (% dos votos) | 4,08 → 4,54 | 4,84 → 5,71 | 5,18 → 4,94 | +0,31 [−0,03; +0,65] | −0,78 [−1,13; −0,44] | −0,44 [−0,70; −0,18] |
| "Eleitor já votou" (por 100 votos) | 0,10 → 0,09 | 0,09 → 0,09 | 0,09 → 0,09 | +0,02 [−0,02; +0,05] | +0,02 [−0,00; +0,03] | +0,01 [−0,00; +0,03] |
| BU com voto sem linha no log (% seções) | 0,00 → 0,00 | 0 → 0 | 0,05 → 0,15 | 0 | +0,10 [−0,10; +0,30] | +0,07 [−0,07; +0,21] |
| Rajada de 10+ sem biometria em 10 min (% seções) | 0,17 → 0,41 | 0,94 → 1,65 | 0,20 → 1,22 | +0,47 [−0,10; +1,03] | +0,77 [+0,33; +1,22] | +0,63 [+0,27; +0,99] |
| Menor intervalo entre votos < 20 s (% seções) | 0,00 → 0,04 | 0 → 0 | 0,05 → 0,20 | −0,04 | +0,11 [−0,11; +0,33] | +0,06 [−0,09; +0,22] |
| Voto fora da janela de votação | 0 → 0 | 0 → 0 | 0 → 0 | 0 | 0 | 0 |
| Reinício durante a votação (% seções) | 2,88 → 2,35 | 14,74 → 4,13 | 22,61 → 77,18 | −10,08 | +55,10 | — |
| Linhas ERRO no dia (por 100 votos) | 0,01 → 0,42 | 0,08 → 0,45 | 0,15 → 2,28 | −0,04 | +1,83 | — |

- **Fato:** liberação sem biometria e liberação pelo mesário **não** subiram nas seções H14 além do controle. No dia da troca, a liberação pelo mesário até caiu (−0,78 p.p.).
- **Fato (reserva × urna substituída, no mesmo dia; `seguranca-h14-biometria-por-urna.mjs`):**

  | No dia 25/10, seções H14 no dia | Votos | Sem biometria | Pelo mesário | Linhas ERRO do leitor biométrico |
  |---|---|---|---|---|
  | Urna substituída (antes da troca) | 155.894 | 16,42% | 6,71% | 2.226 |
  | Reserva (depois da troca) | 356.354 | 14,97% | 4,16% | 40 |

  Em 759 seções com 50 ou mais votos em cada urna, a reserva liberou mais sem biometria que a substituída em 336 e menos em 420. Os erros do leitor ficam na urna substituída. A causa mais comum da troca no dia, pela última mensagem ERRO/ALERTA da original, é a MR (823) ou o leitor biométrico (176 "Falha na captura da digital", 71 "ERROR opening the biometric reader", 24 + 17 + 11 + 7 de outros erros do leitor).
- **Fato:** "reinício" e "linhas ERRO" sobem no dia da troca por construção: a contingência é um reinício, e a urna que falha grava erro. Nas seções H14 entre turnos, os reinícios do **1º turno** já eram altos (14,7% × 2,9% no controle): a urna que falhava no 1º turno foi a trocada. É evidência a favor da explicação benigna.
- **Fato (rajadas de 10+ sem biometria):** 38 seções H14 no 2º turno, contra 25,5 esperadas por UF e modelo (P de Poisson = 0,012). No 1º turno, as mesmas seções tinham 12 contra 8,9 esperadas.
  - Não passa na correção de múltiplas comparações.
  - Concentra-se no ES, onde a liberação sem biometria é alta (15 seções que tinham 6 a 8 no 1º turno e passaram a 10 ou 11), e no exterior, onde 100% é sem biometria por desenho (13).
  - Contando por urna (39 seções, incluindo o RED de ES sem registro de contingência):
    - a rajada foi só na reserva em 29. Em 14 delas a troca foi entre turnos, e a reserva é a única urna do dia;
    - só na urna anterior em 7;
    - nas duas em 3.
  - No exterior a habilitação é sempre sem biometria, e qualquer seção com fila tem rajada.
- **Fato:** os 3 BUs H14 com voto sem linha no log são os casos de contingência em cadeia já descritos no doc 04 (MA 08893/0047/0609: 36 votos; BA 35653/0173/0235: 13; RS 89060/0017/0191: 2). Nenhum caso novo.

### Fora do padrão: reserva quase sem digital

Definição: seção fora do exterior, com 100 ou mais votos no dia, 90% ou mais sem biometria no 2º turno e menos de 50% no 1º (`seguranca-h14-urna-sem-digital.mjs`).

| Grupo | Seções com o padrão | Taxa | Razão × controle | Fisher |
|---|---|---|---|---|
| Controle | 7 de 490.250 | 0,0014% | 1 | — |
| H14 (total) | 3 de 2.805 | 0,107% | 75 | 2,1 × 10⁻⁵ |
| Herdada | 1 de 2.864 | 0,035% | 24 | 0,046 |
| Outra urna de seção | 1 de 1.562 | 0,064% | 45 | 0,025 |

O padrão aparece sempre que a urna muda, não só com reserva. Contado por urna, há 7 reservas H14 nessa situação:

| Seção | Grupo | Reserva: votos / sem digital | Liberados por "digital não associada a mesário" | Urna anterior (mesmo dia) ou 1º turno |
|---|---|---|---|---|
| BA 36854/0180/0149 | no dia | 236 / 233 | 203 | anterior: 83 votos, 10 sem digital |
| BA 36854/0180/0547 | no dia | 195 / 191 | 26 (162 por mesário identificado) | anterior: 160 / 133 |
| BA 37150/0078/0158 | no dia | 114 / 113 | 101 | anterior: 84 / 12 |
| RJ 60011/0188/0082 | no dia | 265 / 258 | 216 | 1º turno: 262 / 67 |
| RJ 58637/0221/0178 | no dia | 211 / 203 | 181 | 1º turno: 227 / 40 |
| RS 87173/0118/0143 | no dia | 123 / 121 | 114 | anterior: 208 / 28 |
| RS 89770/0088/0113 | entre turnos | 294 / 287 | 87 (187 por mesário identificado) | 1º turno: 292 / 66 |

Trecho do log da reserva de BA 36854/0180/0149 (urna 01666960, 25/10). O eleitor tenta 4 vezes, a digital não confere, e a liberação vem de uma digital gravada depois do registro dos mesários:

```
11:50:09  Solicita digital. Tentativa [1] de [4]
11:50:42  Número de tentativas de reconhecimento do dedo. Tentativa [4] de [4]
11:50:44  Solicitação de dado pessoal do eleitor para habilitação manual
11:50:51  Dado digitado confere
11:50:51  Solicita digital do mesário
11:51:00  Batimento de digitais retornou o score 8
11:51:00  Biometria coletada não é do mesário #
11:51:08  Batimento de digitais retornou o score 105
11:51:08  Digital coletada bate com uma digital gravada após o registro inicial de mesário. Não é possível associar a habilitação a um mesário.
11:51:10  Eleitor foi habilitado
11:51:18  O voto do eleitor foi computado
```

- **Fato:** nessas reservas, a digital do eleitor quase nunca confere (escores de 5 a 8), e nem a dos mesários registrados. A liberação passa por uma digital gravada depois, que a urna não liga a nenhum mesário.
- **Hipótese (benigna):** leitor biométrico da reserva com defeito ou incompatível com as digitais registradas na urna anterior. A digital do mesário registrada na original não confere na reserva. A urna grava uma digital nova, e as liberações seguintes saem como "não associada a mesário". Isso explica por que o padrão acompanha a troca de urna.
- **Hipótese (risco, premissa 8):** é também exatamente o rastro de uma mesa liberando eleitores com a digital de uma pessoa qualquer (linha M3 da matriz). O log não separa as duas. As 7 reservas receberam 1.438 votos.
- **Não é prova de fraude.** É lugar para pedir a ata da seção e o registro de manutenção do leitor dessas urnas (**Recomendação**).

## Item 5. De onde veio a reserva

Fonte: identificadores dos dois turnos (`integridade-resumo.mjs`). "Aparece" = é a urna do BU, ou tem linhas no log principal ou num log aninhado de alguma seção do 1º turno.

| A reserva H14 no 1º turno | Seções |
|---|---|
| Não aparece em nenhuma seção (ficou guardada) | 2.660 |
| Aparece em log aninhado de seção (era urna de seção trocada ou recarregada) | 121 |
| Votou como urna do BU de outra seção | 33 |
| Aparece no log principal de outra seção | 4 |

- **Fato:** nenhuma reserva H14 veio de outra UF. 51 aparecem no 1º turno em outra zona (32 em outro município); 105 na mesma zona.
- **Fato:** das 33 que votaram em outra seção no 1º turno, todas foram recarregadas depois de 05/10 (21 na mesma zona, 12 em outra). Uma urna não pode ser reserva no 2º turno sem nova carga, e o log mostra essa carga em todos os casos.
- **Fato:** a urna substituída aparece num log de outra seção do 2º turno em 2.731 casos (quase sempre é o próprio log aninhado no pacote da reserva). Em 34, ela votou como urna de outra seção no 2º turno, depois de recarregada.
- **Fato:** 21 trocas H14 "entre turnos" foram feitas em 04/10, depois das 17h, com a seção já encerrada no 1º turno pela urna original (o BU do 1º turno é dela). A reserva ficou na seção para o 2º turno. Exemplos: AL 27871/0031/0082 (20:31), MA 09210/0002/0146 (17:52), RJ 60011/0214/0061 (18:14). Uma troca está datada de 01/01/2000 03:13 (BA 34134/0170/0105, relógio zerado).
  - **Pendente:** por que a contingência foi feita depois do encerramento. Pedir as atas.
- **Fato (quando a troca foi feita):**
  - Entre turnos: de 12/10 a 24/10, com picos em 15/10 (146) e 24/10 (136).
  - No dia: das 04h às 23h, com pico entre 8h e 10h (1.074 de 1.968).
  - No dia, a urna original votou antes da troca em 1.357 seções (148.826 votos) e não votou em 611.

## Item 6. Lacres

- **Fato:** 0 falha de lacre nas 2.818 seções H14, nas herdadas e no controle. Conta feita depois da reverificação dos 37.457 certificados UE2013/UE2015 com bytes de sobra (doc 02 da integridade, parecer 24, item 2). Antes dela, o leitor acusava falha em 7,4% do controle e 18,6% do H14; a diferença é só o parque de UE2013/UE2015, mais comum entre as trocadas.

## O que o teste não enxerga (Limites)

- **Software alterado e assinado.** Quem tem a chave de assinatura de software do TSE (CEPESC) gera uma mídia de carga que passa em todas as etapas e grava a versão oficial. Carga, assinaturas e relógio ficariam iguais aos de uma reserva honesta. Nenhum teste deste documento pega isso (linha S2 da matriz; R5 de [integridade-nacional/06](../integridade-nacional/06-riscos-fora-da-criptografia.md)).
- **O log é escrito pelo software que ele descreve.** Um software adulterado pode gravar "SUCESSO", "Seção informada 0000", a zona certa e a hora certa.
- **Votos inseridos dentro do procedimento normal.** Um mesário que libera eleitores ausentes com o ano de nascimento, em ritmo normal e sem rajada, gera o mesmo log de uma liberação legítima, em qualquer urna. O teste do item 4 só pega excesso em relação ao 1º turno da mesma seção.
- **Por que a urna foi trocada.** O log grava a falha que antecede a troca (MR, leitor, bateria), mas não a decisão. A troca planejada (Aracaju) e a troca por falha usam o mesmo procedimento.
- **Leitor biométrico.** O escore baixo não diz se o dedo é de outra pessoa ou se o leitor falhou.
- **Reservas que não votaram.** Os pacotes só trazem as urnas que gravaram a MV da seção. Uma reserva preparada e não usada não aparece.
- **Carga da reserva para outra zona.** A urna aceita e grava; não há controle técnico que a impeça (item 1).

## Recomendações

- Pedir ao TRE-SE o registro das trocas de urna das zonas 0001 e 0002 de Aracaju em 17/10 e 19/10 de 2026.
- Pedir aos TREs de BA, RJ e RS as atas e o registro de manutenção do leitor biométrico das 7 reservas "quase sem digital" (tabela do item 4).
- Pedir ao TSE a regra que permite usar, na contingência, reserva carregada para outra zona, e a lista de reservas por zona.
- Repetir este teste no 1º turno, com as reservas que assumiram em 04/10 (os scripts aceitam a troca de diretório).
- Ao estatístico: as 125 seções com reserva de outra zona e as 7 "quase sem digital" são subgrupos a olhar nos votos (H14).

## Pendente

- Atas das 21 contingências feitas em 04/10 depois do encerramento (item 5).
- Revisão do cético.
- Versão do 1º turno (reservas que assumiram em 04/10, com o 2º turno como "depois").

## Como reproduzir

Todos os scripts são Node 24, sem dependências; no máximo 4 processos.

```
node scripts/auditoria/seguranca-h14-varrer.mjs --procs 4          # 51 min: 499.248 seções, 499.207 pacotes, 512.173 logs, 0 falhas
node scripts/auditoria/seguranca-h14-grupos.mjs                    # 13 s
node --max-old-space-size=8192 scripts/auditoria/seguranca-h14-itens.mjs   # 40 s: itens 1, 2, 3, 5 e 6
node scripts/auditoria/seguranca-h14-votos-log.mjs                 # ~3 min: item 4 (banco, cópia de leitura)
node scripts/auditoria/seguranca-h14-biometria-por-urna.mjs        # 1 min: reserva × urna substituída, no bruto
node scripts/auditoria/seguranca-h14-urna-sem-digital.mjs          # ~1 min: reserva quase sem digital × controle
node scripts/auditoria/seguranca-h14-tabelas.mjs                   # tabelas deste doc
node scripts/auditoria/seguranca-h14-graficos.mjs                  # SVGs em graficos/
node scripts/auditoria/seguranca-h14-dump-log.mjs --secao se/31054/0001/0130 --filtro "Zona Eleitoral|contingência"   # conferência no bruto
```

Saídas em `data/parsed/auditoria/reservas-rastro/`:

- `varredura/<uf>.jsonl`: carga, contingência, relógio e dia, por log.
- `grupos.jsonl` e `grupos-resumo.json`.
- `itens.json`, `secoes-rastro.jsonl` (indicadores por seção fora do controle) e `casos-itens.json` (casos H14 de cada indicador).
- `item4-votos-log.json`, `biometria-por-urna.json`, `urna-sem-digital.json` e `tabelas.md`.
- `*.stdout`: saída de cada execução.

Entradas reaproveitadas, sem refazer:

- `integridade/2t/<uf>.jsonl` e `reverificacao.jsonl` (lacres);
- `integridade/2t/autoverificacao.jsonl`;
- `integridade/{2t,1t-identificadores}/secoes.jsonl`;
- `engenheiro-seguranca-urna/2t/<uf>.secoes.jsonl`, `etapas-versao-2t.json`, `erros-assinatura-2t.json` e `catalogo-nacional-2t.json`.

Nenhum título de eleitor ou de mesário é gravado. Nas mensagens guardadas, números de 10 ou mais dígitos viram `#`.
