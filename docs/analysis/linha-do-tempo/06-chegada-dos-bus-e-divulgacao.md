# 06. Chegada dos BUs ao TSE × divulgação da apuração (2º turno, Presidente)

Perfil: estatístico eleitoral. Pedido do coordenador em 29/10/2026. Hipótese testada, do André:

> "Às 19h, quando a divulgação foi liberada, mais de 90% dos BUs já tinham sido enviados ao TSE, mas foram liberados ao público de forma controlada, com variações e quedas impossíveis numa apuração aleatória."

**Universo: completo.** As 499.248 seções do 2º turno (as mesmas 499.248 do 1º), todas com hora de recebimento e de totalização no arquivo oficial. Nenhuma ficou de fora dos itens a e b. Exclusões, com contagem e motivo, estão no fim.

> **Revisão cética ([parecer 28](../cetico-revisor/28-chegada-dos-bus.md), 30/10/2026): números reproduzem bit a bit; sustentado com ressalvas.** Correções que valem sobre o texto abaixo:
> - "Recebimento" é a hora em que o TSE **registrou** o BU, em lotes, não a hora de chegada: o primeiro registro cai no mesmo segundo (17:05:10) em 15 UFs de fusos diferentes; de 19:30 a 19:40, 292 dos 600 segundos sem registro (dispersão 68); teto de vazão de 19:03 a 21:09. Havia BUs prontos à espera (5.651 em 19 s); onde esperaram não é público.
> - Há uma segunda parada, de 19:48 a 19:50 (0 registros e 0 totalizações), omitida abaixo.
> - "Os mesmos degraus do 1º turno" é exagero: o que se repete é a cadência de cerca de 6 minutos e o registro em lotes.
> - O efeito por zona (z = −5,5) some com a hora de fim da votação e a ordem do 1º turno (z = +1,17). O teste **não** enxerga reordenar lugares inteiros nem UFs: entre UFs, a correlação entre hora de recebimento e parcela do 22 é −0,28 (p = 0,16) no 2º turno e −0,49 (p = 0,010) no 1º.
> - Trocando os horários de **locais inteiros** dentro da zona, a curva ainda sai do leque (p = 0,005): pesa a ordem geográfica dos locais, não só os blocos. O maior salto e a maior queda do 2º turno são comuns em todas essas trocas (p de 0,25 a 1): "quedas impossíveis" fica refutada com mais força.
> - O lote das 19:03 com UFs mais 22 primeiro (Hipótese) também aparece no primeiro lote do 1º turno (−0,43, p = 0,045): não é próprio do 2º turno.
> - MT no 1º turno: 35 casos em 90069, 13 em 90905, 5 em 90921; o relógio dessas urnas está em hora de Brasília (lido como local, 55 de 78 seções teriam BU recebido antes de gerado). Nessas 78 seções, 842 votos depois das 17h de Brasília no 1º turno, que a linha do tempo converte com −1 h (Hipótese para a H06).
> - 10.774 seções têm no aux um registro "Recebido" posterior à totalização, 3.109 dias depois: Pendente.

A hipótese tem três partes, e o resultado de cada uma é diferente.

| Parte da hipótese | Resultado | Números |
|---|---|---|
| "Às 19h, mais de 90% dos BUs já existiam" | **Sustentada** (Fato) | Às 19h, 98,64% dos BUs do Brasil já tinham sido emitidos pela urna. |
| "...e já tinham sido enviados ao TSE" | **Não dá para ver nos arquivos públicos** (Pendente) | O TSE registra como recebidos só 0,38% até as 19h. O horário de envio não está em nenhum arquivo público. |
| "...liberados de forma controlada" | **Sustentada no ritmo, não no conteúdo** | O recebimento parou das 17:08 às 19:03 e voltou em degraus de capacidade, iguais aos do 1º turno. A ordem de liberação não depende do voto da seção dentro do mesmo local de votação. |
| "...variações e quedas impossíveis numa apuração aleatória" | **Refutada** | A apuração não é aleatória, porque segue a geografia. Embaralhando as seções dentro de cada local de votação, as curvas embaralhadas têm a mesma forma, os mesmos saltos e as mesmas quedas da real (p = 0,32 e p = 0,83). |

O que sobra é uma **Hipótese** pequena: nos primeiros 74 segundos de totalização (19:03:53 a 19:05:07), as UFs com mais voto no 22 foram processadas antes (p = 0,037). Esse resultado é exploratório e não sobrevive à correção por múltiplos testes. Ele só mexe no primeiro 1% da curva.

## Fontes e método

- **Fim da votação:** emissão do BU na tabela `secao` do banco, no relógio local da urna, convertida para Brasília com `fuso-municipio.csv` ([01](01-fuso-horario.md)). O exterior não tem fuso conhecido (1.351 seções sem esse horário).
- **Recebimento pelo TSE:** `DT_RECEBIMENTO_BU_HOR_TSE` do `detalhe_votacao_secao_2026.zip` (dados abertos do TSE, arquivo `_BR.csv`, linhas de Presidente dos dois turnos). Esse campo existe e cobre 100% das seções, por isso é a fonte principal.
  - **Conferência com o `aux.json`:** o `dr`/`hr` do aux foi lido nas 499.248 seções (todos os aux existem no disco; o banco só tinha 156.979). Ele é igual ao segundo ao campo oficial em 479.332 seções (96,0%). Nas outras 19.875 ele difere: em 19.739 é mais tarde (até 2,8 dias, a maioria com status `Recebida`) e em 136 é mais cedo. Toda seção tem um hash só.
  - **Fuso, Fato:** o campo está em hora de Brasília. O primeiro recebimento é 17:05:10 em quase todas as UFs, inclusive no AC (−2 h) e no AM. Se o campo usasse a hora local, o AC teria recebido às 19:05 de Brasília.
- **Totalização:** `DT_PRIM_TOT_PARCIAL_HOR_TSE`, a primeira entrada da seção na totalização. O arquivo não tem `DT_ULT_TOT`.
- **Votos:** tabela `voto_oficial` (13 e 22). "Parcela do 22" = votos do 22 ÷ (votos do 13 + votos do 22).
- **Linha de base:** os mesmos campos do 1º turno (04/10/2026, sem prorrogação), nas mesmas seções. No 1º turno, a parcela do 22 é calculada só entre 13 e 22.
- **Histórico da divulgação em tempo real: não existe no repositório.** `data/raw/2t/referencia/br-c0001-e006258-u.json` é só o arquivo final (gerado às 23:27:02). Por isso "divulgação" aqui quer dizer a hora de totalização de cada seção, não o que o site mostrou a cada instante (ver Pendente).

## a) Quanto já tinha sido emitido, recebido e totalizado em cada horário

**Fato.** "Até HH:MM" quer dizer antes desse horário de Brasília. Emitidas: % das 497.897 seções do Brasil com hora de emissão conhecida. Recebidas e totalizadas: % das 499.248 seções. Votantes: % do comparecimento.

| Até | 2T emitidas | 2T recebidas (seções) | 2T recebidas (votantes) | 2T totalizadas | 1T emitidas | 1T recebidas | 1T totalizadas |
|---|---|---|---|---|---|---|---|
| 17:30 | 98,28% | 1.876 (0,38%) | 0,39% | 0,37% | 81,49% | 2,39% | 2,34% |
| 18:00 | 98,48% | 1.884 (0,38%) | 0,39% | 0,37% | 90,83% | 15,04% | 13,14% |
| 19:00 | **98,64%** | **1.909 (0,38%)** | 0,39% | **0,37%** | 98,18% | **60,81%** | 58,43% |
| 19:30 | 100,00% | 27.549 (5,52%) | 5,55% | 5,47% | 99,26% | 84,58% | 84,29% |
| 20:00 | 100,00% | 111.942 (22,42%) | 22,29% | 22,27% | 99,71% | 86,13% | 84,96% |
| 20:30 | 100,00% | 271.075 (54,30%) | 53,88% | 53,84% | 99,89% | 91,70% | 91,48% |
| 21:00 | 100,00% | 442.470 (88,63%) | 88,27% | 88,23% | 99,96% | 98,29% | 98,20% |
| 22:00 | 100,00% | 499.131 (99,98%) | 99,98% | 99,98% | 99,99% | 99,76% | 99,75% |

- **Quem entrou antes das 19h (Fato):** 1.909 seções. São 1.092 do Brasil (a partir de 17:05:10) e 778 do exterior (a partir de 17:03:25), todas recebidas até 17:10, mais 39 registros do exterior de seções **não instaladas** (sem BU nem votos). Entre 17:10 e 19:03, nenhum BU com votos foi recebido.
- **O recebimento parou e voltou (Fato):** essas 1.870 seções foram totalizadas logo, até 17:10. Depois, nenhum BU com votos foi recebido até as **19:03:37** (os 39 registros de seções não instaladas entraram na totalização às 19:02:54). Nesse minuto entraram 5.651 seções de 26 UFs **em 19 segundos** (19:03:37 a 19:03:56), um lote acumulado.
- **A retomada foi em degraus (Fato):** por minuto, 19:05–19:11 ≈ 100; 19:12–19:13 ≈ 209; 19:14–19:17 ≈ 490; 19:18–19:23 ≈ 960; 19:24–19:29 ≈ 1.850; 19:30–19:40 ≈ 2.790. O máximo foi 5.871 às 20:30. Os degraus duram cerca de 6 minutos.
- **O 1º turno tem os mesmos degraus (Fato):** 17:14–17:26 ≈ 470/min, depois ≈ 960, 1.430, 1.920, 2.400 e 2.880, também a cada ~6 min. Houve ainda uma pausa de 18:01 a 18:07 (1 recebimento). Dentro dos patamares, a variação de minuto a minuto é menor do que a de chegadas livres: o índice de dispersão (variância ÷ média; chegadas independentes dão perto de 1) fica entre 0,06 e 0,57 em 5 das 6 janelas medidas e em 1,51 numa.
  - **Hipótese benigna:** o horário "de recebimento" é a hora em que o TSE processa o BU numa fila de capacidade limitada, que aumenta em degraus. Não é a hora em que o BU sai do local de votação. Como isso vale nos dois turnos, o ritmo controlado é do sistema, não algo próprio do 2º turno.

**Comparação rotulada:** às 19h do 1º turno, o TSE já tinha recebido 60,81% das seções. No 2º turno, 0,38%. A diferença é a parada entre 17:08 e 19:03, que coincide com a prorrogação até as 19h determinada pela liminar do STF (Rcl 101.673/BA; [perícia 08](../../pericia/08-virada-do-2-turno.md), item 4).

## b) Atrasos e ordem

**Fato:**

| Medida | 2º turno | 1º turno |
|---|---|---|
| Emissão → recebimento, mediana | **200,5 min** (p10 151; p90 235) | 88,0 min |
| Recebimento → totalização, mediana | **24 s** (p90 40 s; p99 61 s; p99,9 220 s) | 115 s (p99 654 s) |
| Recebimento → totalização, máximo | 6.755 s (registro de seção não instalada do exterior) | 2.038 s |
| Totalização antes do recebimento | 0 | — |

- **Onde ficou o represamento (Fato):** dos 491.127 BUs emitidos antes das 19h, **490.035 (99,78%; 99,79% dos votantes)** só foram recebidos depois das 19h. Depois de recebido, o BU entrou na totalização em segundos. **Nenhum ficou "recebido e parado" esperando liberação.** O represamento aconteceu **antes** do registro de recebimento: na transmissão, nos TREs ou numa fila antes do registro, e os arquivos públicos não dizem qual.
- **A totalização seguiu a ordem de recebimento (Fato):** nas 497.339 seções recebidas a partir das 19h:
  - correlação de postos = 0,99998;
  - 0,19% dos pares com horários de recebimento diferentes saem em ordem invertida (238.232.694 de 123.631.771.064);
  - 2.721 seções (0,55%) foram ultrapassadas por alguma recebida mais de 60 s depois delas;
  - **nenhuma** foi ultrapassada por seção recebida mais de 5 min depois.
- **Por UF (Fato, `resumo.json`, `b_porUf`):** a emissão mediana fica entre 17:03 e 17:06 em todas as UFs.
  - Mediana de recebimento: as primeiras foram TO (19:38), PB (19:39), DF (19:34) e AM (19:45). As últimas foram RJ (20:59), SE (20:55), SP, BA e MG (20:31–20:40).
  - Antes das 19h, o RJ, o SP e o SE não tiveram nenhuma seção recebida. O PA teve 252, o PR 205 e o AM 152.
  - A ordem das UFs se parece com a do 1º turno: correlação de postos entre as medianas dos dois turnos de **0,72** (27 UFs).
- **Ordem dentro do município entre turnos (Fato):** a correlação da posição de recebimento de cada seção nos dois turnos é 0,34 dentro do município, 0,32 dentro da zona e 0,14 dentro do local. A ordem fina mudou bastante de um turno para o outro, o que se espera quando todos esperam até as 19h e transmitem juntos.

## c) A liberação dependeu do voto da seção?

**Hipótese nula:** dentro do mesmo grupo (local, zona, município ou UF), a hora de totalização não depende da parcela do 22. **Explicação benigna de um efeito:** dentro da zona ou do município, locais urbanos e próximos do cartório chegam antes e votam diferente dos rurais. **Linha de base:** a mesma conta no 1º turno, sem prorrogação. O efeito é dado em minutos de atraso para cada 10 pontos percentuais a mais de 22. O erro-padrão é agrupado por município. O teste principal (local de votação) foi escolhido antes de rodar; os outros recortes são exploratórios.

**Fato:**

| Teste | Seções | Efeito (por +10 pp de 22) | z | Leitura |
|---|---|---|---|---|
| c1. Atraso recebimento → totalização, dentro de município × minuto de recebimento | 499.205 | −0,13 s | −1,37 | nenhum efeito |
| **c2. Hora de totalização, dentro do local** (principal; emitidas antes das 19h) | 491.127 | **−0,04 min (−2,7 s)** | **−1,37** | nenhum efeito |
| c2 + fim da votação + hora de recebimento no 1º turno, dentro do local | 491.127 | −0,01 min | −0,43 | nenhum efeito |
| c2 com a virada (p22 do 2T − p22 do 1T), dentro do local | 491.127 | 0,00 min | −0,04 | nenhum efeito |
| c2 dentro da zona | 491.127 | −0,70 min | −5,54 | o 22 chega um pouco **antes** |
| c2 dentro do município | 491.127 | −0,61 min | −4,04 | idem |
| c2 dentro da UF | 491.127 | −1,29 min | −3,55 | idem |
| **Base 1º turno**, dentro do local | 497.897 | −0,67 min | −9,08 | o 22 chega antes |
| Base 1º turno, dentro da zona | 497.897 | −5,46 min | −19,92 | idem, mais forte |
| Base 1º turno, dentro do município | 497.897 | −4,82 min | −7,97 | idem |

- Correlação de postos (dentro do grupo) entre hora de totalização e parcela do 22: no local, 2T +0,007 e 1T −0,010; na zona, 2T −0,051 e 1T −0,104.
- **Leitura.** Dentro do mesmo local de votação, o 2º turno não mostra nenhuma dependência. Dentro da zona e do município existe uma dependência pequena, mas no sentido de o 22 chegar **antes**, e ela é menor do que no 1º turno, em que não houve represamento. Isso combina com a geografia (o lugar onde se vota define quando o BU chega), não com uma liberação moldada no 2º turno.
- **Poder (Fato, efeito injetado):** atrasei artificialmente, em cada local, as seções com parcela do 22 acima da mediana do local e medi o z do teste principal e o deslocamento máximo da curva (a partir de 2% apurado):

  | Atraso injetado | z | Quanto a curva muda |
  |---|---|---|
  | 15 s | 7,1 | 0,07 pp |
  | 1 min | 31,8 | 0,20 pp |
  | 5 min | 133 | 0,69 pp |
  | 10 min | 192 | 1,26 pp |
  | 30 min | 238 | 2,57 pp |

  Uma manipulação dentro do local que mudasse a curva em 0,07 pp já seria detectada com folga.
- **Limite:** o teste não separa uma manipulação feita na **ordem dos locais, zonas, municípios ou UFs** da ordem geográfica natural. Contra isso só há a comparação com o 1º turno. Ela mostra a mesma ordem de UFs (0,72) e uma dependência menor no 2º turno.

## d) Curvas da parcela do 22 × % apurado, nas três ordens

**Fato** (Brasil, 497.897 seções; `por-percentual.csv`):

| % apurado | Ordem real de totalização | Ordem de recebimento | Ordem de fim da votação | Real com exterior | 1º turno, ordem real |
|---|---|---|---|---|---|
| 0,5% | 52,41% (19:04) | 48,63% | 48,71% | 47,33% | 58,17% |
| 1% | 50,92% (19:04) | 48,77% | 49,37% | 48,81% | 55,55% |
| 5% | 49,17% (19:29) | 49,18% | 52,30% | 48,83% | 55,46% |
| 10% | 49,68% (19:38) | 49,70% | 52,12% | 49,50% | 55,81% |
| 25% | 50,59% (20:03) | 50,59% | 51,34% | 50,51% | 55,53% |
| 50% | 49,90% (20:27) | 49,91% | 50,20% | 49,88% | 54,65% |
| 75% | 48,94% (20:48) | 48,94% | 49,34% | 48,92% | 53,42% |
| 90% | 48,45% (21:02) | 48,46% | 48,77% | 48,43% | 52,26% |
| 100% | 48,22% | 48,22% | 48,22% | 48,21% | 51,02% |

- **(i) e (ii) coincidem:** a partir de 1,5% apurado, a diferença máxima entre a ordem real e a de recebimento é **0,08 pp**. A divulgação seguiu a chegada. A diferença de até 3,78 pp aparece só no primeiro 1%, dentro do lote das 19:03 (ver abaixo).
- **(iii) ordem de fim da votação:** se a apuração seguisse a hora em que cada urna fechou, o 22 teria ido mais alto no começo (52,35% aos 5,5%). Isso acontece porque as urnas que fecharam às 19h (RJ, SP, BA, PE e PB) ficariam todas no fim.
- **Curva por minuto, com o exterior (Fato, `resumo.json`, `e_curvaPorMinuto`):** às 19:02 o acumulado era 44,47% para o 22 (só as 1.909 seções de antes das 19h). O 22 passou à frente às **19:44** (13,9% totalizadas), chegou ao máximo de **50,52% às 20:02** (25,0%) e o 13 voltou à frente às **20:24** (48,0%). Essa subida seguida de queda também aparece no 1º turno: começo alto para o 22 e descida contínua até o fim.

**Teste de embaralhamento:** mantém a sequência real de grupos e os horários reais, troca as seções de lugar só dentro do grupo e repete 200 vezes. Se a curva real ficar dentro do leque das embaralhadas, a ordem dentro do grupo não depende do voto.

| Embaralhar dentro de | 2T: maior desvio da média | 2T: pontos fora do leque de 95% | 2T: p (desvio máx.) | 2T: p (maior salto por minuto) | 1T: p (desvio máx.) |
|---|---|---|---|---|---|
| UF (27) | −2,13 pp (1,5%) | 195 de 200 | < 0,005 | 0,085 | < 0,005 |
| município (5.571) | −1,03 pp | 180 de 200 | < 0,005 | 0,010 | < 0,005 |
| zona (6.106) | −1,13 pp | 196 de 200 | < 0,005 | 0,005 | < 0,005 |
| **local (94.046)** | **0,06 pp** | **13 de 200** | **0,32** | **0,83** | < 0,005 (desvio de só 0,08 pp) |

- **Leitura.** Embaralhar dentro da UF, do município ou da zona quebra os blocos de seções do mesmo local, que chegam juntas e votam parecido. Por isso essas curvas embaralhadas variam menos do que a real. É o que já se via no [parecer 16](../cetico-revisor/16-topico-8-virada.md). Quando se mantém o local junto, a curva real do 2º turno fica dentro do leque. O maior salto real, de **0,17 pp num minuto**, é do tamanho do salto típico das embaralhadas (mediana 0,18 pp). A maior queda, de −0,12 pp num minuto, também (p = 0,13). As "variações e quedas" são as esperadas para a ordem geográfica de chegada. No 1º turno, até a ordem dentro do local se afasta um pouco do acaso (0,08 pp), e mesmo assim não é sinal de nada.
- **Contagem aleatória de verdade** (todas as seções embaralhadas): a curva fica reta em 48,2% (48,17% em 1%, 48,22% em 10%), e o maior salto por minuto é de 0,07 pp. A apuração real **não** é desse tipo em nenhum dos dois turnos, porque chega por lugar. Por isso, comparar com uma contagem aleatória não serve como teste.
- **O lote das 19:03 (Hipótese, exploratório):** as 5.651 seções recebidas em 19 s foram totalizadas entre 19:03:53 e 19:05:07.
  - A primeira metade totalizada tinha 51,78% de 22, e a segunda, 45,69%. Pela ordem de recebimento, as duas metades tinham 49,16% e 48,59%.
  - Entre as 26 UFs, a hora mediana de totalização dentro do lote tem correlação de postos de −0,41 com a parcela do 22 da UF (p = 0,037 por permutação). RR, RO e DF foram as primeiras; CE, MA, AC, PI, RN e AP, as últimas.
  - Dentro do município, nada (+0,35 s por 10 pp; z = 0,89).
  - Com 44 testes neste estudo, o corte de Bonferroni é p < 0,0011, e esse resultado não passa. O efeito vale só para o primeiro 1,5% da curva brasileira, até 19:11.
  - Com o exterior e as 1.870 seções de antes das 19h, o acumulado das 19:03 e das 19:04 era 47,5% e 47,8% para o 22: o 13 continuava à frente.

## e) Arquivos para o gráfico (`data/parsed/auditoria/chegada-bu/`)

| Arquivo | Linhas | Conteúdo |
|---|---|---|
| `por-minuto.csv` | 601 (17:00 de um dia até 03:00 do outro) | Um minuto por linha, com valores acumulados até o **fim** do minuto, em hora de Brasília (`hora`; `+1d` depois da meia-noite). Colunas: `emitidas_acum`, `emitidas_pct` (Brasil); `recebidas_no_minuto`, `recebidas_acum`, `recebidas_pct`, `recebidas_votantes_pct`; `totalizadas_no_minuto`, `totalizadas_acum`, `totalizadas_pct`, `totalizadas_votantes_pct`; `p22_`/`p13_ordem_totalizacao`, `p22_`/`p13_ordem_recebimento` (todas as seções, com o exterior) e `p22_`/`p13_ordem_fim` (só Brasil); `t1_recebidas_no_minuto`, `t1_recebidas_acum`, `t1_recebidas_pct`, `t1_totalizadas_acum`, `t1_totalizadas_pct` (1º turno, mesmo relógio em 04/10). Parcela = fração entre 0 e 1, só entre 13 e 22. |
| `por-percentual.csv` | 200 (passos de 0,5%) | Curva × % das seções apuradas (Brasil, 497.897). `hora_ordem_*` (hora em que se chega àquele %), `p22_ordem_totalizacao`, `p22_ordem_recebimento`, `p22_ordem_fim`, `p22_totalizacao_com_exterior`, `p22_ordem_aleatoria`; o leque do embaralhamento `env_<UF|municipio|zona|local>_p2_5`, `_media`, `_p97_5`; e o 1º turno `t1_p22_ordem_totalizacao`, `t1_env_municipio_p2_5`, `t1_env_municipio_p97_5`. |
| `por-uf-minuto.csv` | 16.828 (28 UFs × 601 min) | Formato longo: `uf`, `minuto`, `hora`, `secoes_uf`, `recebidas_acum`, `recebidas_pct`, `totalizadas_acum`, `t1_recebidas_acum`, `t1_recebidas_pct`, `p22_uf_ordem_totalizacao`. |
| `resumo.json` | — | Todos os números deste documento: `a_*`, `b_*`, `c_*`, `d_*`, `e_curvaPorMinuto`. |
| `secoes.csv` | 499.248 | Uma linha por seção: os três horários dos dois turnos, o `aux.json`, aptos, comparecimento, votos 13/22 e local. Base para outros cortes. |
| `aux-horarios.csv` | 499.248 | `dr`/`hr` de cada hash do aux, status e hora de geração do aux. |

Sugestão para o gráfico: eixo x com a hora (`por-minuto.csv`) e três linhas acumuladas (emitidas, recebidas, totalizadas), com a curva do 1º turno em cinza. No segundo painel, x = % apurado (`por-percentual.csv`), com as três ordens e o leque `env_local_*` sombreado.

## Testes feitos e múltiplas comparações

- **44 testes** no total: c1 (1); c2 no 2º turno (6); c2 na base do 1º turno (3); curvas do 2º turno (4 agrupamentos × 4 estatísticas = 16); curvas do 1º turno (16); lote das 19:03 (2).
- Corte de Bonferroni: p < 0,05/44 ≈ 0,0011. Com 200 permutações, o menor p possível é 0,005. Por isso, nos testes de curva, "< 0,005" quer dizer que a curva real ficou fora das 200 embaralhadas, com estatística de desvio máximo padronizado de 22 a 96. Esses resultados não dependem do corte.
- **Confirmatório:** o c2 por local, escolhido antes de rodar. **Exploratório:** todos os outros, sobretudo o lote das 19:03, que foi visto nos dados antes de ser testado.

## Exclusões (contagem e motivo)

- **Hora de fim:** sem ela, 1.351 seções do exterior (1.310 sem fuso conhecido e 41 não instaladas). Ficam fora da ordem (iii) e dos testes c2 e d, que usam só o Brasil (497.897 seções).
- **Sem votos 13/22:** 43 seções, todas do exterior.
- **Recebimento antes da emissão:** 8 seções do 2º turno (7 no PA e 1 no PR), por menos de 1 minuto, explicadas pelo relógio da urna adiantado.
  - Conferido no bruto: PA 04057/0016/0023 tem emissão às 17:06:05 no relógio da urna e `recebidoTSE` às 17:05:13.
  - No 1º turno são 60 casos, 53 deles em MT 90069 (diferença de até 54 min). **Pendente:** fuso dessa seção no 1º turno.

## Limites

1. **Hora de envio.** Os arquivos públicos não têm a hora em que o BU saiu do local de votação ou do ponto de transmissão. Só têm a hora em que o TSE o registrou. "Mais de 90% já tinham sido enviados às 19h" não pode ser confirmado nem negado com eles. O que se confirma é que já tinham sido **emitidos** (98,64%).
2. **Divulgação ao público.** Sem o histórico dos arquivos de resultado publicados minuto a minuto, a "divulgação" foi medida pela hora de totalização. O que o site mostrou e quando é **Pendente**.
3. **Os testes medem a ordem, não os votos.** Como no [parecer 16](../cetico-revisor/16-topico-8-virada.md), todas as curvas usam os mesmos votos e só mudam a ordem. Este estudo testa se a **liberação** foi moldada pelo voto. Não testa se os votos estão certos, e esse controle é de outros tópicos (assinaturas, coerência BU × RDV × log).
4. **Manipulação na ordem de lugares inteiros** (locais, zonas, municípios) se confunde com a geografia. Contra ela só há a comparação com o 1º turno.

## Recomendações

1. Pedir ao TSE os registros de transmissão: hora de envio de cada BU pelo ponto de transmissão (JE-Connect), hora de chegada ao TRE e ao TSE, e a fila de recepção entre 17:08 e 19:03. Só com eles dá para saber onde os BUs ficaram e se a fila foi atendida por ordem de chegada.
2. Pedir o ato do TSE que suspendeu o recebimento depois da liminar e o horário dele, e cruzar com a parada observada às 17:08.
3. Pedir o histórico dos arquivos de resultado publicados (`br-c0001-e006258-u.json`, com `hg` e `idg` de cada versão) para medir a divulgação real minuto a minuto.
4. Perguntar ao TSE como foi definida a ordem de processamento dentro do primeiro lote (19:03:53 a 19:05:07), por UF.

## Pendente

- O que o site de resultados mostrou entre 19:00 e 19:15, sem número até haver histórico oficial.
- Os 60 casos do 1º turno com recebimento antes da emissão (MT 90069).

## Reprodução

```bash
node scripts/auditoria/estatistico-chegada-bu-aux.mjs                                    # ~85 s; lê os 499.248 aux.json pelo caminho (sem varredura)
node --max-old-space-size=8192 scripts/auditoria/estatistico-chegada-bu-dados.mjs         # ~65 s; secoes.csv
node --max-old-space-size=8192 scripts/auditoria/estatistico-chegada-bu.mjs [--replicas 200]   # ~135 s; resumo.json e CSVs dos gráficos
node src/exportar.js --uf pa --municipio 04057 --zona 0016 --secao 0023 --log nao --stdout   # conferência no bruto
```

O gerador aleatório é o mulberry32 com semente fixa (2026), como recomenda o parecer 16. Os resultados se repetem a cada execução.
