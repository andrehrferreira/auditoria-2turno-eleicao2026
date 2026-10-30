# 30. Parecer: H14, urnas trocadas por reserva no 2º turno

Achados revisados:

- **Votos:** [estatistico-eleitoral/07-urnas-reserva-1t-2t.md](../estatistico-eleitoral/07-urnas-reserva-1t-2t.md), scripts `estatistico-reservas-1t2t*.mjs` (commit fa3fc15), saídas em `data/parsed/auditoria/reservas-1t2t/`.
- **Rastro técnico:** [engenheiro-seguranca-urna/06-h14-rastro-das-reservas.md](../engenheiro-seguranca-urna/06-h14-rastro-das-reservas.md), scripts `seguranca-h14-*.mjs` (commit 6a801e0), saídas em `data/parsed/auditoria/reservas-rastro/`.

Data: 30/10/2026. Base: cópia de leitura `eleicao2026-20261029T105000` (28 UFs nos dois turnos). Rótulos: **Fato** (sai de script do repo sobre arquivo público, universo completo), **Hipótese**, **Recomendação**, **Pendente**.

## Resposta curta

- **Os números das duas metades se reproduzem exatamente.** Rodei de novo, em cópia isolada, o script principal do estatístico e o script de itens do engenheiro. O `resultado.json` saiu idêntico ao do autor (só muda a data). O `itens.json` e o `secoes-rastro.jsonl` saíram idênticos byte a byte.
- **As duas metades falam das mesmas 2.818 seções** (2.818 de 2.818 em comum). Mas elas dividem essas seções em "antes do dia" e "no dia" de jeitos diferentes. Em **134 seções** a classificação diverge. São 133 trocas feitas na manhã de 25/10 em que a urna original não ligou nesse dia: o estatístico as chama de "troca antes do dia", e o engenheiro de "no dia". O total e o teste confirmatório não mudam. Os subgrupos e o texto da perícia precisam de uma definição única.
- **O teste de votos é justo e sem sinal, mas não vê "reserva manipulada igual nos dois turnos".** Fiz o teste que faltava para isso: comparar o **nível** de cada turno com as seções vizinhas do **mesmo local de votação**.
  - Nas 2.893 reservas herdadas, a parcela do 13 no 2º turno fica igual à das vizinhas: −0,06 p.p. (IC95 −0,21 a +0,09). Em votos, isso vai de 1.472 a menos a 637 a mais para o 13.
  - O comparecimento das herdadas no 2º turno também é igual ao das vizinhas (−0,01 p.p.). No 1º turno ficou 0,75 p.p. **abaixo**.
  - Ou seja, o "+0,74 p.p." do estatístico é falta de eleitor no 1º turno, não excesso no 2º. A hipótese benigna dele ganha apoio.
- **(c) Votos das 125 com reserva de outra zona e das 7 "quase sem digital": nenhuma anomalia que sobreviva à correção.**
  - **As 125:** o 13 cresceu um pouco **menos** que na zona: −0,27 p.p., −86 votos (IC95 −170 a −2), p = 0,044. O comparecimento também cresceu menos: −0,43 p.p., −176 eleitores, p = 0,017. Nenhum dos dois passa na correção para 15 testes (limite p < 0,0033). A queda do comparecimento vem do 1º turno, quando essas seções ainda tinham a urna original: ali elas estavam 0,98 p.p. acima das vizinhas.
  - **As 7:** a parcela do 13 se moveu como na zona: −0,10 p.p., −2 votos (IC95 −27 a +23).
  - **Comparecimento das 7:** nenhuma das 7 tem comparecimento acima do esperado no 2º turno. O caso BA 0149 é explicado pelo 1º turno baixo.
- **O "7 reservas quase sem digital (p = 2,1 × 10⁻⁵)" está mal resumido. O fenômeno real é maior.**
  - O p vale para **3 seções**, não para 7 reservas.
  - Uma das 7, BA 36854/0180/0547, já tinha 67% sem digital no 1º turno, e a urna original teve 83% no próprio dia 25/10. Não é efeito da reserva.
  - Com um critério igual para os dois lados, o salto para mais da metade sem digital aparece em **14 de 2.590 reservas H14**, contra **152 de 489.983 seções com a mesma urna**. É cerca de 17 vezes mais comum.
  - **Os votos dessas seções não se mexem.** Fica como lacuna de controle e pedido de ata, não como sinal de voto.
- **A reserva de outra zona funcionou como reserva da própria zona.** Ao ler o cartão de memória da seção (MV), a reserva passa a gravar a zona e a seção da MV. A biometria funcionou: 11,2% dos votos sem digital nas 125 reservas, contra 12,4% nas mesmas seções no 1º turno. Nenhuma das 125 reservas passou de 50% sem digital.
  - A lacuna "a contingência aceita reserva de outra zona" é real como falta de **bloqueio**.
  - Existe **rastro**: a zona da carga fica no log, e o código de carga fica no BU. Foi esse rastro que permitiu achar as 125.
- **"Nenhuma marca de software adulterado" está grande demais.** Os testes olham mensagens que o próprio software grava sobre si mesmo. O tamanho certo é: "nenhuma das marcas que um software adulterado **sem a assinatura do TSE**, ou uma verificação pulada, deixaria no log". Software adulterado e assinado passa em todos os testes.
- **Conta que dá a escala (Fato, universo completo):**
  - as 5.714 seções votaram com urna reserva no 2º turno e deram 742.671 votos ao 13;
  - a diferença oficial foi de 4.430.191 votos;
  - mesmo que todos esses 742.671 votos tivessem sido tirados do 22, a diferença cairia 1.485.342 votos e o resultado não mudaria.
  - Isso **não** prova ausência de manipulação. Só mostra que a H14 sozinha não poderia ter decidido a eleição.

## Vereditos

### Metade 1: votos (estatístico, doc 07)

| # | Afirmação | Veredito |
|---|---|---|
| V1 | 2.818 trocas novas × controle da zona: parcela do 13 −0,047 p.p. (IC95 −0,121 a +0,027); comparecimento −0,026; brancos + nulos +0,030; nada passa | **Sustentado.** Reproduzido exatamente, por permutação também. O desenho (efeito fixo de zona, modelo do 1º turno, tamanho) é justo. Nenhum filtro silencioso: as 72 exclusões estão contadas (41 sem arquivo, 31 do Sistema de Apuração) |
| V2 | Poder: enxerga 0,12 p.p. = 866 votos | **Sustentado com ressalvas.** Número certo. O poder vale para um desvio **diferente entre os turnos**. Para o desvio igual nos dois turnos, o teste da DiD tem poder zero. O teste de nível deste parecer cobre esse caso: enxerga cerca de 0,22 p.p., uns 1.500 votos |
| V3 | Por grupo, modelo, UF, zona, seção e Aracaju: nada passa | **Sustentado.** Reproduzido. A divisão "antes do dia × no dia" diverge da do engenheiro em 134 seções (item A). Os subgrupos ficam todos nulos com qualquer das duas definições, mas o rótulo precisa ser único |
| V4 | Reserva herdada: comparecimento +0,74 p.p. (6.945 eleitores, p = 10⁻⁴⁶); hipótese benigna de falha no 1º turno | **Sustentado, e a hipótese benigna ganha apoio (Fato novo):** no nível, a herdada fica 0,75 p.p. **abaixo** das vizinhas do local no 1º turno e igual a elas no 2º (−0,01 p.p.). O efeito é falta no 1º turno, não excesso no 2º. A causa da falta (fila, interrupção) continua Pendente: falta a varredura do 1º turno |
| V5 | "Esse achado mostra que o método detecta um efeito real" | **Sustentado com ressalvas.** O achado só mostra que o método vê efeito no **comparecimento**, de 0,74 p.p., seis vezes o limite de detecção. Não há controle positivo para a parcela do 13 |
| V6 | Manipulação igual nos dois turnos fica "coberta por outros testes (Klimek, H03, H05)" | **Refutado como redação.** Esses testes comparam seções e zonas do país inteiro. Não isolam as reservas. O teste certo é o nível contra vizinhas do mesmo local, feito aqui (item B): nada aparece nas herdadas |
| V7 | Pista do H05 em MG: Δd +0,062 (t 3,4); com perfil, +0,042 (t 2,3) | **Sustentado.** Reproduzido em cópia isolada (ver "Reproduzido"). Exploratório, cerca de 40 votos, não entra na perícia |
| V8 | 57 extremas conferidas no BU bruto, 0 divergências | **Sustentado.** Conferi mais uma, SE 31054/0001/0130, no BU e no log brutos: bate com o `secoes.csv` |

### Metade 2: rastro técnico (engenheiro, doc 06)

| # | Afirmação | Veredito |
|---|---|---|
| R1 | "Nenhuma marca de software adulterado na reserva" | **Sustentado com ressalvas (redação grande demais).** Todos os números se reproduzem: 0 boots com etapa falhada, 0 falhas de lacre, 6 erros de assinatura no log da reserva contra 6,56 esperados. Mas os testes leem o que o software grava sobre si mesmo. Texto revisado no item D |
| R2 | A carga da reserva é diferente da carga da urna de seção, mas igual à das herdadas | **Sustentado.** Reproduzido. A comparação com as herdadas é um bom controle |
| R3 | 125 seções com reserva de outra zona (4,4% × 1,56% nas herdadas); nenhuma de outra UF | **Sustentado com ressalvas.** Números exatos (78 entre turnos + 47 no dia; 45 de 2.893 nas herdadas). O excesso está nas trocas **entre turnos** (9,2%; p = 7 × 10⁻²³ contra as herdadas). Nas trocas no dia, a taxa é 2,4%, contra 1,56% nas herdadas (p = 0,04, sem correção). É o perfil de troca planejada com reservas de um depósito central, como em Aracaju |
| R4 | Aracaju: troca entre as zonas 0001 e 0002 em 17/10 e 19/10, registrada no log | **Sustentado.** Conferido no bruto (item C) |
| R5 | Lacuna: "a contingência aceita reserva de outra zona; nada impede" e "a carga é tecnicamente equivalente" | **Sustentado com ressalvas.** A falta de bloqueio é Fato nos 170 casos aceitos (125 + 45). "Nada impede" vai além do dado: um caso recusado não deixaria pacote. A equivalência foi **testada** aqui pela biometria e confirmada no efeito. O motivo (o cadastro vem da MV ou a carga cobre mais que a zona) é Hipótese. Existe rastro técnico: zona da carga no log, código e histórico de carga no BU |
| R6 | Modo de habilitação não piorou: sem biometria −0,20 p.p. [−0,53; +0,14] | **Sustentado.** Reproduzido (`item4-votos-log.json`) |
| R7 | 7 reservas quase sem digital; padrão 75× mais comum (3 em 2.805 × 7 em 490.250; p = 2,1 × 10⁻⁵) | **Sustentado com ressalvas, e corrigido.** (a) O p é de 3 seções, não de 7 reservas. (b) BA 36854/0180/0547 não é efeito da reserva: 67% sem digital no 1º turno e 83% na urna original no dia. Pelo critério do próprio engenheiro aplicado à reserva, são 6. (c) O limiar (≥ 100 votos, ≥ 90%) foi escolhido depois de ver os casos. Com um limiar mais largo e igual para os dois lados, o excesso continua: 14 de 2.590 × 152 de 489.983. (d) A afirmação "contra 12% a 15% na urna anterior ou no 1º turno" está errada para a 0547 |
| R8 | "A urna original votou antes da troca em 1.357 seções (148.826 votos)" (item 5) | **Corrigido.** O próprio doc, no item 4, e o `biometria-por-urna.json` dão **1.423 seções e 155.894 votos**. O item 5 conta só os votos da urna do 1º turno no log aninhado e perde 93 seções em que a urna substituída no dia era outra, ou que tinham mais de um log aninhado |
| R9 | O relógio da reserva fica errado mais vezes, como na herdada; ADH no dia em 2 casos | **Sustentado.** Reproduzido |

## A. As duas metades usam os mesmos grupos? (pedido a)

Comando: `node scripts/auditoria/cetico-h14-grupos.mjs` (e a parte `cruzamentoGrupos` de `cetico-h14-votos.mjs`).

| Estatístico \ Engenheiro | h14Antes | h14Dia | h14SemRegistro |
|---|---:|---:|---:|
| Contingência no dia, com votos (1.425) | 0 | 1.423 | 2 |
| Contingência no dia, antes do 1º voto (413) | 1 | 412 | 0 |
| Troca antes do dia, seção → reserva (943) | 814 | **129** | 0 |
| Troca antes do dia, reserva → reserva (37) | 33 | **4** | 0 |

- **Fato:** o conjunto das 2.818 é o mesmo nas duas metades.
- **Fato:** o controle é o mesmo, com uma diferença de definição. O estatístico usa 491.843 seções; o engenheiro, 491.489, porque tira 354 recargas da mesma urna.
- **Fato:** 2 seções do Sistema de Apuração entram no grupo "outro" do engenheiro, que diz excluí-las. Isso não afeta a H14.
- **Fato (as 133 divergentes):**
  - O estatístico decide pela atividade da urna **original** em 25/10. O engenheiro decide pela data da contingência gravada no log da **reserva**.
  - Nas 133, a contingência foi feita na manhã de 25/10, mas a original não gravou nada nesse dia.
  - Exemplo no bruto: AM 02550/0032/0848. O log da original termina em 24/10 11:29. A reserva liga às 05:45:57 de 25/10 e inicia a contingência às 05:50:34.
  - As duas definições são defensáveis. O efeito por grupo dá nulo nas duas.
- **Recomendação:** a perícia deve usar uma definição só. Proponho a do engenheiro (data da contingência no log da reserva), porque ela tem rastro direto, e citar a outra como robustez.

## B. A DiD não vê reserva manipulada igual nos dois turnos. Quanto isso pesa? (pedido b)

A diferença-em-diferenças subtrai o 1º turno do 2º na mesma seção. Se a mesma reserva tivesse o mesmo desvio nos dois turnos, o desvio sumiria na conta. É o caso das 2.893 **herdadas**: muitas assumiram ainda antes do 1º turno (exemplo: AC 01392/0001/0441, troca em 03/10).

**Teste que falta e que fiz:** o nível de cada turno contra as seções de controle do **mesmo local de votação**.

- Método: efeito fixo do local (município × zona × local), log dos aptos, peso pelo denominador do turno, erro-padrão agrupado por zona.
- Entram 2.730 das 2.893 herdadas. As outras 163 estão em locais sem outra seção.
- Comando: `node --max-old-space-size=8192 scripts/auditoria/cetico-h14-votos.mjs` (`nivel.local`).

| Desfecho | Herdada, 1º turno | Herdada, 2º turno | Troca nova, 1º turno (urna ainda original) | Troca nova, 2º turno |
|---|---|---|---|---|
| Parcela do 13 (p.p., IC95) | −0,10 (−0,26 a +0,06) | **−0,06 (−0,21 a +0,09)** | −0,00 (−0,17 a +0,16) | −0,06 (−0,21 a +0,10) |
| Em votos do 13 | −590 (−1.567 a +387) | **−417 (−1.472 a +637)** | −22 | −386 (−1.440 a +667) |
| Comparecimento (p.p.) | **−0,75 (−0,93 a −0,58), p = 3 × 10⁻¹⁷** | −0,01 (−0,16 a +0,14) | −0,04 | −0,07 |
| Brancos + nulos (p.p.) | −0,09 (−0,15 a −0,03), p = 0,002 | −0,04 (−0,09 a +0,01) | −0,02 | +0,04 |
| Poder de 80% na parcela do 13 (α 5%) | 0,23 p.p. ≈ 1.397 votos | 0,22 p.p. ≈ 1.507 votos | 0,24 p.p. | 0,22 p.p. |

**Leitura:**

- **Fato:** a herdada, a mesma urna reserva nos dois turnos, dá ao 13 a mesma parcela que as vizinhas do local, nos dois turnos. Uma reserva que movesse em média mais de cerca de 0,2 p.p. (cerca de 1.500 votos no conjunto, meio voto por seção) teria sido vista com 80% de chance.
- **Fato:** o comparecimento das herdadas é normal no 2º turno e baixo no 1º. O +0,74 p.p. da DiD é a recuperação de um 1º turno deprimido. Isso é o que a hipótese benigna do estatístico prevê (falha da urna no 1º turno). Não há eleitor a mais no 2º turno.
- **Exploratório:** brancos + nulos das herdadas ficam 0,09 p.p. abaixo no 1º turno (641 votos; p = 0,002). Isso fica no limite da correção para os 24 testes desta tabela (0,05/24 = 0,0021). Não passa com o efeito fixo de local no 2º turno. Não envolve 13 × 22. **Pendente**, sem número na perícia.
- **Limite que continua:**
  - Desvio menor que 0,2 p.p. por reserva não é visto.
  - Desvio igual em **todas** as urnas do local também não, porque aí não há vizinha honesta para comparar. Isso já não é H14, e sim H03 ou Klimek.
  - O "teste do nível" usa vizinhas de um mesmo local, que costumam ter perfil parecido, mas não idêntico.
- **Escala (Fato):**
  - as 5.714 seções que votaram com reserva no 2º turno (2.818 novas, 2.893 herdadas e 3 da mesma urna recarregada) somam 742.671 votos no 13 e 694.314 no 22. A soma vem do BU no banco e bate com a do `secoes.csv`;
  - a diferença oficial no 2º turno foi de 64.256.232 − 59.826.041 = 4.430.191 votos;
  - no pior caso, todo voto do 13 nessas seções teria sido do 22. A diferença cairia 1.485.342 votos e o 13 ainda venceria por 2.944.849.
  - Isto limita o que a H14 **pode** ter feito ao resultado. Não diz que nada foi feito.

## C. Votos das 125 com reserva de outra zona e das reservas quase sem digital (pedido c)

Comando: `node --max-old-space-size=8192 scripts/auditoria/cetico-h14-votos.mjs` → `data/parsed/auditoria/cetico-revisor/h14-votos.json`.

**Desenho:**

- A mesma DiD do estatístico: Δ do 1º para o 2º turno, efeito fixo de zona, modelo da urna do 1º turno, log dos aptos, peso do 2º turno, erro-padrão por zona.
- As 2.818 entram separadas em três grupos: 125 de outra zona, 7 quase sem digital e as demais. As 45 herdadas de outra zona ficam à parte.
- São 5 subgrupos × 3 desfechos = 15 testes. Bonferroni: p < 0,0033.
- Também se mede o nível contra as vizinhas do local e o resíduo de cada seção, isto é, o Δ menos a média do controle da zona. A escala é o MAD do controle, e o p é empírico sobre as 491.843 seções de controle.

### C1. As 125 com reserva carregada para outra zona

| Medida | Parcela do 13 | Comparecimento | Brancos + nulos |
|---|---|---|---|
| DiD contra a zona (p.p., IC95) | −0,27 (−0,53 a −0,01), p = 0,044 | −0,43 (−0,79 a −0,08), p = 0,017 | +0,25 (−0,02 a +0,52), p = 0,069 |
| Em votos | −86 (−170 a −2) | −176 eleitores | +83 |
| DiD: outra zona − demais trocas | −0,23, p = 0,095 | −0,43, p = 0,021 | +0,23, p = 0,10 |
| Nível × vizinhas do local, 1º turno | +0,60 (−0,13 a +1,34) | **+0,98 (+0,32 a +1,64), p = 0,0035** | −0,07 |
| Nível × vizinhas do local, 2º turno | +0,30 (−0,41 a +1,01) | +0,62 (−0,05 a +1,29) | +0,16 |
| Seções com \|z\| > 3 (esperado pelo controle) | 0 (1,0) | 2 (1,5) | 2 (1,2) |

- **Fato:** nada passa na correção.
- **Fato:** o sinal nominal da parcela do 13 é **contra** o 13: −86 votos em 125 seções, menos de 1 voto por seção.
- **Fato:** a queda relativa do comparecimento vem do 1º turno. Antes da troca, com a urna original, essas seções estavam 0,98 p.p. acima das vizinhas. No 2º turno, ficaram 0,62 acima. Uma reserva que inserisse eleitores **aumentaria** o comparecimento do 2º turno.
- **Fato:** nenhuma seção das 125 é extrema na parcela do 13. As cinco com maior |z| são de comparecimento ou de brancos + nulos, com p empírico de 0,004 a 0,015. Nesse nível há milhares de seções de controle iguais.
- **Fato (Aracaju, SE 31054/0001 ← zona 0002, 16 seções):** a parcela do 13 foi de 60,38% para 63,48%, ou +3,10 p.p. O controle da zona subiu +3,42.
- **Fato (no bruto, SE 31054/0001/0130):**
  - log da reserva 01794072: carga em 28/09 09:50 com "Zona Eleitoral: 0002", computador `RSEWGM04`;
  - "Início do procedimento de contingência" em 17/10 14:14:22;
  - "Serial da MV original… 52FCA1D2" e, às 14:19:47, "Zona Eleitoral: 0001";
  - a urna original (01770705) foi carregada em 25/09 pelo `RSEWGM01`, para a seção 0130 da zona 0001;
  - BU (`node src/exportar.js --uf se --municipio 31054 --zona 0001 --secao 0130 --log nao --stdout`): tipo `reservaSecao`, urna 1794072, 266 votantes, 13 = 158, 22 = 90, brancos 4, nulos 14. Bate com o `secoes.csv`;
  - o BU impresso traz o "Histórico de código de carga" com 3 códigos.

### C2. Reservas quase sem digital

| Seção | Δ parcela do 13: seção × controle da zona (p.p.) | z (p empírico) | Comparecimento 2º turno: seção × vizinhas do local | Reserva: votos / sem digital |
|---|---|---|---|---|
| BA 36854/0180/0149 | −0,20 × +2,99 | −1,6 (0,12) | 81,6% × 82,8% (1º turno: 64,7% × 77,2%) | 236 / 233 |
| BA 36854/0180/0547 | +2,35 × +2,99 | −0,3 (0,74) | 85,8% × 81,9% | 195 / 191 (1º turno: 67% sem digital) |
| BA 37150/0078/0158 | +2,72 × +1,59 | +0,6 (0,56) | 80,5% × 83,8% | 114 / 113 |
| RJ 60011/0188/0082 | +5,41 × +4,44 | +0,5 (0,62) | 72,9% × 78,6% | 265 / 258 |
| RJ 58637/0221/0178 | +4,76 × +4,68 | +0,0 (0,97) | 83,1% × 80,5% (caiu de 87,3% no 1º turno) | 211 / 203 |
| RS 87173/0118/0143 | +3,45 × +2,53 | +0,5 (0,64) | 89,0% × 90,2% | 123 / 121 |
| RS 89770/0088/0113 | +2,54 × +1,77 | +0,4 (0,69) | 85,7% × 87,5% | 294 / 287 |

- **DiD das 7 juntas:**
  - parcela do 13: −0,10 p.p. (−1,38 a +1,18), −2 votos (−27 a +23);
  - comparecimento: +0,84 p.p. (−2,97 a +4,66);
  - brancos + nulos: −0,27 p.p.;
  - nada passa.
- **Fato:** em nenhuma das 7 a parcela do 13 foge do controle da zona: |z| ≤ 1,6.
- **Fato:** o comparecimento do 2º turno não fica acima das vizinhas do local em 5 das 7. Nas outras duas, fica 3,8 e 2,5 p.p. acima. Na RJ 58637 o comparecimento **caiu** do 1º para o 2º turno.
- **Fato (BA 0149):** o único z alto é o do comparecimento, +5,9 (p empírico 0,0009).
  - O comparecimento do 2º turno é normal para o local. O baixo é o do 1º turno.
  - O estatístico já registra que a seção usou reserva no 1º turno (doc 07, item 3).
- **O que isso diz sobre o risco M3 (mesa liberando eleitor com digital de outra pessoa):**
  - Se a liberação sem digital tivesse servido para votar no lugar de **ausentes**, o comparecimento subiria. Não subiu.
  - Também não houve mudança na divisão 13 × 22.
  - Os dados são compatíveis com o leitor da reserva não reconhecendo os eleitores que estavam lá.
  - O log não separa isso de uma mesa usando a própria digital para liberar eleitores **presentes**.
  - **Hipótese benigna mais forte; risco não excluído.**
- **As 2 do mesmo padrão fora da H14 também não têm sinal de voto:**
  - RJ 60011/0008/0074, herdada: z da parcela do 13 = +0,9;
  - BA 34290/0127/0336, outra urna de seção: z = −0,3.
- **Fato (o fenômeno é mais largo que "7"):** usei o mesmo critério dos dois lados. Exigi ≥ 50 votos na reserva e no 1º turno, fora do exterior, mais de 50% sem digital na reserva e menos de 50% no 1º turno.
  - Resultado: **14 de 2.590 reservas H14 × 152 de 489.983 seções com a mesma urna de seção** (0,54% × 0,031%).
  - Com o critério do engenheiro (≥ 100 votos, ≥ 90%): **6 de 2.590 × 7 de 489.983**.
  - Nenhuma das 118 reservas elegíveis de outra zona está entre essas 14.
  - Comando: `node scripts/auditoria/cetico-h14-bio-outra-zona.mjs`.
  - O p exato não vai para a perícia: o limiar foi escolhido depois de ver os dados. A razão é grande demais para ser acaso, mas a causa é desconhecida.

## D. "Nenhuma marca de software adulterado": o tamanho certo (pedido d)

O que os testes enxergam:

- etapa de verificação de assinatura com falha, faltando ou fora de ordem no boot de votação;
- mensagem de erro de assinatura no log da reserva;
- versão diferente;
- lacre do pacote quebrado;
- relógio mexido;
- carga no dia ou fora do padrão das reservas.

O que eles **não** enxergam:

1. **Software adulterado e assinado** com a chave do TSE. Ele grava as mesmas mensagens de SUCESSO e a mesma versão.
2. **Software adulterado que finge a verificação.** O log é escrito pelo próprio software que ele descreve. "34 etapas com SUCESSO" é uma declaração do software, não uma medição de fora.
3. **O lacre (assinatura do pacote).** Ele prova que o pacote saiu daquela urna com aquela chave. Não prova que o programa da urna era o oficial.
4. **Nenhum arquivo público traz o hash do programa medido por um componente independente do software.**

Afirmação revisada: "Nas 2.818 seções, o log da reserva não mostra nenhum dos sinais que uma adulteração **sem a assinatura do TSE**, ou uma verificação de assinatura pulada, deixaria. Também não há pacote com lacre quebrado nem versão diferente. Os arquivos públicos não permitem detectar software adulterado e assinado com a chave oficial."

## E. A lacuna "a contingência aceita reserva de outra zona" (pedido e)

- **Fato:** em 170 seções (125 H14 e 45 herdadas), a reserva carregada para outra zona da mesma UF foi aceita e votou. Não há caso de outra UF.
- **Fato (no bruto):** depois de ler a MV da seção, a reserva grava a zona e a seção da MV. Em AM 02550/0032/0848, "Seção Eleitoral: 0000" passa a "Seção Eleitoral: 0848". Em SE 31054/0001/0130, a zona 0002 passa a 0001.
- **Fato (biometria, teste da equivalência):** nas 125 reservas de outra zona, 11,2% dos votos saíram sem digital (3.222 de 28.884). Nas mesmas seções, no 1º turno, com a urna original, foram 12,4% (4.120 de 33.287). Nas demais reservas H14 foram 15,3%. Nenhuma das 125 passou de 50%.
  - Se a carga de outra zona não tivesse as digitais dos eleitores da seção, a liberação sem digital teria disparado.
  - Na prática, a reserva de outra zona funcionou como reserva da própria zona.
- **Hipótese (mecanismo):** o cadastro da seção chega pela MV, ou a carga da reserva cobre mais que a zona. O log não diz qual dos dois.
- **Revisão da lacuna:**
  - Falta um **bloqueio** técnico: Fato nos casos aceitos.
  - "Nada impede" não pode ser afirmado. Uma tentativa recusada não deixaria pacote, então não sabemos se a urna recusaria outra UF.
  - **Existe rastro técnico de detecção:** a zona e o computador da carga ficam no log, e o código e o histórico de carga ficam no BU. A auditoria achou as 170 por esse rastro.
  - Pela premissa 8, quem decide usar a reserva de outra zona é gente. O controle que conta é o rastro, e ele existe.
- **Recomendação (mantida do engenheiro):** pedir ao TSE a regra de uso de reserva de outra zona e a lista de reservas por zona. Pedir ao TRE-SE o registro das trocas de 17/10 e 19/10.

## Explicações alternativas: testadas × supostas

| Explicação | Situação |
|---|---|
| Diferença de perfil das seções que trocam (UE2013, lugar) | **Testada** (estatístico; e aqui, pelo nível no local no 1º turno das trocas novas: −0,00 p.p.) |
| Falha no 1º turno deprimiu o comparecimento das herdadas | **Testada em parte** aqui (nível: −0,75 no 1º turno, normal no 2º). A causa (fila, interrupção) é **suposta**; falta a varredura do 1º turno |
| Troca planejada de urnas antigas em Aracaju | **Suposta.** O log mostra a troca, mas não o motivo. Pedido ao TRE-SE |
| Reserva de outra zona é tecnicamente equivalente | **Testada** pelo efeito (biometria normal); o mecanismo é suposto |
| Leitor biométrico da reserva com defeito ou incompatível (quase sem digital) | **Suposta.** Compatível com comparecimento e voto normais, mas o log não separa defeito de dedo de outra pessoa. Pedir atas e manutenção |
| "O mesário conferiu", "o técnico fez a troca certa" | **Recusada** (premissa 8). Não usada como explicação em nenhum veredito |

## Reproduzido (Fato)

| Item | Autor | Revisor | Comando |
|---|---|---|---|
| `resultado.json` do estatístico | — | idêntico, exceto `geradoEm` | cópia isolada de `estatistico-reservas-1t2t.mjs` lendo o mesmo `secoes.csv` |
| Confirmatório: parcela do 13, comparecimento, brancos + nulos | −0,047 / −0,026 / +0,030 | −0,0472 / −0,0256 / +0,0304 | idem |
| Herdada, comparecimento | +0,74, 6.945, p = 10⁻⁴⁶ | +0,741, 6.945, p = 1,1 × 10⁻⁴⁶ | idem |
| Extremas: 0 passam; 4 com p < 10⁻⁴ (2,2 esperadas) | — | igual | idem |
| `mg-biometria.json` (pista MG) | Δd +0,062; com perfil +0,042 (t 2,3) | idêntico, exceto `geradoEm`: +0,0622 (t 3,43); com perfil +0,0417 (t 2,28) | cópia isolada de `estatistico-reservas-1t2t-mg.mjs` |
| `itens.json` e `secoes-rastro.jsonl` do engenheiro | — | idênticos byte a byte | cópia isolada de `seguranca-h14-itens.mjs` |
| 125 de outra zona; 45 herdadas de outra zona | 125; 1,56% | 78 + 47 = 125; 45 de 2.893 | `secoes-rastro.jsonl` |
| Votos do 13 em seções com reserva no 2º turno | — | 742.671 (BU no banco e `secoes.csv`) | `node scripts/sql.mjs "select ... tipo_urna in ('reservaSecao','reservaEncerrandoSecao')"` |
| Diferença oficial no 2º turno | — | 4.430.191 | `node scripts/sql.mjs "select turno, numero, sum(quantidade) from voto_oficial where cargo=1 and numero in (13,22) group by 1,2"` |

Nota (MG): o `estatistico-lib.mjs` que o script importa está hoje sem alteração local (git limpo nesse arquivo). Mesmo assim, a saída bateu com a gravada pelo autor. O risco de "lib com mudanças de outro agente", declarado no doc 07, não se materializou.

## Afirmações revisadas, prontas para a perícia

Só número completo e conferido. O resto vai como Pendente, sem número.

1. **Fato:** no 2º turno, 2.818 seções votaram com uma urna reserva diferente da urna do 1º turno.
   - Comparadas com as seções sem troca da mesma zona, a variação do 1º para o 2º turno foi a mesma no comparecimento, na parcela do 13 entre 13 + 22 e em brancos + nulos.
   - Parcela do 13: −0,05 ponto percentual, intervalo de 95% de −0,12 a +0,03. Isso equivale a 335 votos a menos para o 13, com intervalo de 860 a menos a 190 a mais, num total de 708.479 votos em 13 + 22 nessas seções.
2. **Fato:** 2.893 seções usaram nos dois turnos a mesma urna reserva.
   - A parcela do 13 nelas, no 2º turno, foi igual à das outras seções do mesmo local de votação: −0,06 ponto, intervalo de −0,21 a +0,09.
   - O comparecimento delas foi igual ao das vizinhas no 2º turno e 0,75 ponto menor no 1º.
3. **Fato:** nas 5.714 seções que votaram com urna reserva no 2º turno, o 13 teve 742.671 votos. A diferença oficial entre os dois candidatos foi de 4.430.191 votos. Mesmo que todos esses votos tivessem sido tirados do 22, o resultado seria o mesmo. Isso limita o tamanho possível do efeito; não prova que não houve manipulação.
4. **Fato:** em 125 dessas seções, a reserva tinha sido carregada para outra zona da mesma UF. A urna aceitou a troca e gravou a zona da carga no log, e o BU traz o código de carga.
   - A identificação por digital funcionou nelas: 11,2% dos votos sem digital, contra 12,4% nas mesmas seções no 1º turno.
   - Os votos dessas seções variaram como os da zona, sem diferença que resista à correção para múltiplos testes.
   - **Lacuna de controle:** a contingência não bloqueia reserva de outra zona; só a registra.
5. **Fato:** no log da urna reserva das 2.818 seções não aparece nenhum dos sinais que uma adulteração **sem a assinatura do TSE**, ou uma verificação pulada, deixaria: 0 boots com etapa falhada, 0 pacotes com lacre quebrado, versão igual à do resto do país, erros de assinatura na mesma taxa das urnas comuns.
   - **Limite:** os arquivos públicos não permitem detectar um programa adulterado que tenha a assinatura oficial, porque o próprio programa escreve o log.
6. **Pendente (sem número):**
   - reservas que liberaram quase todos os eleitores sem digital: o padrão é mais comum nas reservas que nas urnas comuns, mas os votos dessas seções não mudaram. Faltam as atas e o registro de manutenção do leitor;
   - a causa do comparecimento menor no 1º turno das seções com reserva herdada: falta a varredura de logs do 1º turno;
   - o motivo das trocas entre as zonas 1 e 2 de Aracaju: pedido ao TRE-SE.

## Correções pedidas aos autores (sem editar os documentos deles)

- **Estatístico, doc 07:**
  - declarar a divergência das 133 seções "antes do dia" que foram trocadas na manhã de 25/10;
  - trocar "coberto por outros testes (Klimek, H03, H05)" por uma referência ao teste de nível deste parecer;
  - deixar claro que o controle positivo (herdada) vale para o comparecimento, não para a parcela do 13.
- **Engenheiro, doc 06:**
  - item 4: o p = 2,1 × 10⁻⁵ é de 3 seções. Corrigir "contra 12% a 15%" para a BA 36854/0180/0547, que deve sair da lista de efeito da reserva (são 6). Declarar que o limiar foi escolhido depois de ver os casos;
  - item 5: trocar 1.357 seções / 148.826 votos por 1.423 / 155.894, como no item 4;
  - resposta curta, item 1: redação revisada do item D;
  - limites: "nada impede" → "não há bloqueio nos casos aceitos; há rastro no log e no BU";
  - grupos: 2 seções do Sistema de Apuração estão em "outro".

## Riscos desta revisão

- O teste de nível depende do local de votação como vizinhança. Ficam fora 163 herdadas e 150 trocas novas em locais de uma seção só. Com efeito fixo de zona, entram todas e o resultado é o mesmo (herdada no 2º turno: −0,005 p.p.).
- A conta de "quase sem digital" do controle usa o `perfil_log` do pacote inteiro. A das reservas usa só as linhas da reserva (`biometria-por-urna.json`). No controle, há uma urna por pacote, então as duas contas medem a mesma coisa. Nas reservas de contingência com votos, a medida é da reserva sozinha.
- Rodei de novo os scripts dos autores **em cópias isoladas** (pasta temporária), para não sobrescrever as saídas deles. Não rodei de novo a varredura de 51 minutos do engenheiro (`seguranca-h14-varrer.mjs`) nem o `estatistico-reservas-1t2t-dados.mjs`. Usei as saídas deles e conferi um caso no bruto, que bateu.

## Como reproduzir

```
node scripts/auditoria/cetico-h14-grupos.mjs                                   # pedido (a): cruzamento dos grupos
node --max-old-space-size=8192 scripts/auditoria/cetico-h14-votos.mjs          # ~70 s: (b) nível, (c) DiD por subgrupo, fichas → cetico-revisor/h14-votos.json
node scripts/auditoria/cetico-h14-bio-outra-zona.mjs                           # ~4 min: (c)/(e) biometria das 125 e salto sem digital → cetico-revisor/h14-bio-outra-zona.json
node scripts/auditoria/seguranca-h14-dump-log.mjs --secao se/31054/0001/0130 --filtro "Zona Eleitoral|contingência"
node scripts/auditoria/seguranca-h14-dump-log.mjs --secao am/02550/0032/0848 --filtro "Turno|Seção|contingência" --dia 25/10/2026
node src/exportar.js --uf se --municipio 31054 --zona 0001 --secao 0130 --log nao --stdout
```

Saídas em `data/parsed/auditoria/cetico-revisor/` (`h14-votos.json`, `h14-bio-outra-zona.json`). Nenhum título de eleitor ou de mesário foi gravado.
