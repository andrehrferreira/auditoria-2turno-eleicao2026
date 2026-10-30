# 07. H14: urnas trocadas no 2º turno × a mesma seção no 1º turno

Estatístico eleitoral, 30/10/2026. Pedido do André: "o total de votos dessas urnas reservas do segundo turno, comparado à mesma seção no primeiro turno, e ver se encontramos alguma anomalia". Hipótese H14 de [hipoteses.md](../../hipoteses.md). Rótulos: **Fato** (sai de script do repo sobre arquivo público), **Hipótese**, **Recomendação**, **Pendente**.

## Resposta curta

- **Fato:** nas 2.818 seções que votaram no 2º turno com uma urna reserva diferente da urna do 1º turno, a variação do 1º para o 2º turno é **igual** à das seções sem troca da mesma zona. Isso vale para os três desfechos testados:
  - comparecimento;
  - parcela do 13 entre 13 + 22;
  - brancos + nulos.
- **Fato:** o maior desvio possível compatível com os dados (limite do intervalo de 95%) é pequeno: o 13 teria entre 860 votos a menos e 190 a mais nessas seções, num total de 708 mil votos em 13 + 22.
- **Fato:** o teste tinha poder para ver pouca coisa. Ele enxergaria, com 80% de chance, um desvio de 0,12 ponto percentual na parcela do 13. Isso equivale a 866 votos passados do 22 para o 13 no conjunto das 2.818 seções, em média 0,3 voto por seção.
- **Fato:** nenhuma UF, nenhum modelo de urna e nenhuma zona fica fora do esperado depois da correção para comparações múltiplas. As duas zonas de Aracaju com excesso de trocas (parecer cético 24) também não mostram desvio nos votos.
- **Fato:** nenhuma seção com troca fica fora da curva depois da correção. As 57 seções citadas foram conferidas no BU bruto dos dois turnos: 0 divergências.
- **Hipótese (não rejeitada, limite declarado):** o teste não enxerga manipulação **igual nos dois turnos** na mesma seção. Também não enxerga um efeito menor que o poder indicado acima. Abaixo disso, o resultado é "não detectado", não "provado ausente".
- **Achado lateral (Fato):** nas 2.893 seções que mantiveram no 2º turno a reserva já usada no 1º, o comparecimento subiu 0,74 ponto a mais que na zona (6.945 eleitores; p = 10⁻⁴⁶). É a mesma urna nos dois turnos, então a troca do 2º turno não explica o efeito.
  - **Hipótese benigna:** a falha de urna no 1º turno derrubou o comparecimento daquele dia (fila, interrupção), e no 2º turno ele voltou ao normal.
  - Esse achado mostra que o método **detecta** um efeito real de troca de urna quando ele existe.
- **Pista do H05 em MG (exploratório):** nas trocadas de MG, o eleitor a mais sem biometria divide o voto de outro jeito (Δd = +0,062; t = 3,4). Com o perfil da seção nas inclinações, cai para +0,042 (t = 2,3) e não passa em nenhuma correção. São da ordem de 40 votos. O voto das mesmas seções de MG não se mexe: parcela do 13 +0,10 p.p., IC95 −0,21 a +0,40.

## H0, o que rejeitaria e o que sustentaria H14

- **H0 (declarada antes de rodar):** dentro da mesma zona, a variação 1º → 2º turno nas seções com troca nova de urna é igual à das seções sem troca. Isso vale para:
  - comparecimento por apto;
  - parcela do 13 em 13 + 22;
  - brancos + nulos por comparecimento.
- **Sustentaria H14:**
  - um efeito diferente de zero no teste confirmatório (Bonferroni por 3 desfechos);
  - ou um excesso de seções extremas nas trocadas em relação ao controle;
  - ou zonas e UFs com desvio concentrado que passem na correção.
- **Rejeitaria H14 (no tamanho que o teste enxerga):** os três efeitos com intervalo em torno de zero e menores que o poder, sem cauda extra e sem zona que passe na correção. É o que aconteceu.
- **Limites (o que o teste não vê):**
  - **Manipulação igual nos dois turnos.** A diferença-em-diferenças cancela tudo o que é constante na seção, inclusive um desvio que existisse nos dois turnos. Esse caso é coberto por outros testes (Klimek, H03, H05), não por este.
  - **Efeito menor que o poder:** 0,12 p.p. no Brasil (866 votos), 0,18 a 0,28 p.p. por modelo, 0,42 a 5,0 p.p. por UF (tabela `efeito-uf.csv`).
  - **Manipulação que move 13 e 22 juntos** sem mudar a parcela nem o comparecimento: por exemplo, trocar votos de candidato por brancos e nulos dos dois lados. O desfecho de brancos + nulos cobre parte disso.
- **Premissa 8:** a troca de urna é decidida e feita por gente (mesário, técnico, cartório). Por isso a decisão não conta como controle. O teste olha só o resultado, que é o rastro técnico.

## Dados e universo (Fato)

Comandos em "Como reproduzir". Fonte: cópia de leitura `eleicao2026-20261029T105000.sqlite`, com 28 UFs nos dois turnos.

- **Votos:** BU (`voto_bu`, presidente). A soma por turno é **igual** à do resultado oficial (`voto_oficial`) em 13, 22, demais, brancos e nulos, nos dois turnos (`dados.json`, `conferenciaBuOficial`).
- **Universo:** 499.176 seções com BU nos dois turnos. Ficam de fora 72:
  - 41 sem arquivo (exterior, não instaladas);
  - 31 do Sistema de Apuração.
- **Tipo da troca:** sai do BU (tipo e nº interno da urna nos dois turnos).
  - Nas 5.714 seções com reserva no 2º turno, a varredura de logs do engenheiro (`engenheiro-seguranca-urna/2t/*.secoes.jsonl`, 5.714 de 5.714 lidas) diz se a urna original (log aninhado) ligou no dia 25/10/2026.
  - Diz também quantos votos ela computou.
- **Local e agregação:** nenhuma seção do universo mudou de local de votação entre os turnos. As 2 seções com local diferente estão entre as excluídas. Nenhuma agregação de seções mudou (17.931 nos dois turnos, a mesma lista). Os aptos mudam mais de 10 em 234 seções de controle e em 1 trocada.

| Grupo | Definição | Seções |
|---|---|---|
| Controle | mesma urna de seção nos dois turnos | 491.843 |
| Contingência no dia, com votos | 2º turno com reserva nova; a urna original computou votos em 25/10 antes de falhar | 1.425 |
| Contingência no dia, antes do 1º voto | reserva nova; a original ligou em 25/10, mas falhou antes de computar voto | 413 |
| Troca antes do dia: seção → reserva | reserva nova; a original não tem atividade em 25/10 | 943 |
| Troca antes do dia: reserva → outra reserva | idem, e no 1º turno a seção já usava reserva | 37 |
| **Trocas novas por reserva (soma das 4 acima)** | = as 2.818 do parecer cético 24, item 17 | **2.818** |
| Outra urna de seção no 2º turno | tipo "seção" nos dois turnos, nº interno diferente, sem contingência no BU | 1.562 |
| Reserva → urna de seção | reserva no 1º turno, urna de seção (outra) no 2º | 44 |
| Reserva herdada | a mesma reserva do 1º turno ficou no 2º (mesmo nº interno) | 2.893 |
| Mesma urna, tipo mudou | mesma urna, recarregada como reserva ou como seção | 16 |

- **Fato:** nas 1.838 contingências no dia, a urna original é a urna do 1º turno em 1.795 casos e outra urna em 43.

## 1. Totais por grupo, presidente, mesma seção nos dois turnos (Fato)

Arquivo: `tabela-grupos.csv`.

**2º turno**

| Grupo | Seções | Aptos | Comparecimento | 13 | 22 | Brancos | Nulos |
|---|---|---|---|---|---|---|---|
| Controle (sem troca) | 491.843 | 156.386.425 | 126.338.167 | 63.301.298 | 58.943.764 | 1.409.528 | 2.683.577 |
| Contingência no dia, com votos | 1.425 | 458.132 | 370.063 | 187.785 | 170.271 | 4.074 | 7.933 |
| Contingência no dia, antes do 1º voto | 413 | 133.911 | 108.302 | 53.807 | 50.895 | 1.183 | 2.417 |
| Troca antes do dia: seção → reserva | 943 | 305.016 | 243.564 | 118.113 | 118.185 | 2.479 | 4.787 |
| Troca antes do dia: reserva → reserva | 37 | 11.648 | 9.710 | 5.155 | 4.268 | 114 | 173 |
| **Trocas novas por reserva** | **2.818** | **908.707** | **731.639** | **364.860** | **343.619** | **7.850** | **15.310** |
| Outra urna de seção | 1.562 | 489.796 | 396.677 | 201.623 | 181.799 | 4.571 | 8.684 |
| Reserva → seção | 44 | 14.740 | 12.132 | 7.552 | 4.200 | 122 | 258 |
| Reserva herdada | 2.893 | 936.738 | 751.414 | 377.364 | 350.380 | 8.348 | 15.322 |
| Mesma urna, tipo mudou | 16 | 5.739 | 4.554 | 2.765 | 1.613 | 55 | 121 |

**1º turno (as mesmas seções)**

| Grupo | Aptos | Comparecimento | 13 | 22 | Demais candidatos | Brancos | Nulos |
|---|---|---|---|---|---|---|---|
| Controle (sem troca) | 156.386.464 | 123.432.688 | 53.082.245 | 55.280.063 | 9.186.841 | 2.267.587 | 3.615.952 |
| Contingência no dia, com votos | 458.132 | 360.369 | 157.559 | 159.673 | 25.929 | 6.650 | 10.558 |
| Contingência no dia, antes do 1º voto | 133.914 | 105.473 | 44.832 | 47.460 | 7.992 | 2.025 | 3.164 |
| Troca antes do dia: seção → reserva | 305.042 | 238.800 | 99.613 | 111.213 | 17.853 | 3.839 | 6.282 |
| Troca antes do dia: reserva → reserva | 11.644 | 9.461 | 4.319 | 3.960 | 777 | 170 | 235 |
| **Trocas novas por reserva** | **908.732** | **714.103** | **306.323** | **322.306** | **52.551** | **12.684** | **20.239** |
| Outra urna de seção | 489.746 | 387.328 | 169.064 | 170.882 | 28.407 | 7.344 | 11.631 |
| Reserva → seção | 14.740 | 11.443 | 6.302 | 3.917 | 678 | 189 | 357 |
| Reserva herdada | 936.724 | 724.781 | 312.791 | 325.348 | 53.112 | 12.897 | 20.633 |
| Mesma urna, tipo mudou | 5.740 | 4.144 | 2.189 | 1.435 | 293 | 76 | 151 |

**Taxas, 1º → 2º turno (%)**

| Grupo | Comparecimento | 13 / (13 + 22) | (Brancos + nulos) / comparecimento |
|---|---|---|---|
| Controle | 78,93 → 80,79 | 48,99 → 51,78 | 4,77 → 3,24 |
| Contingência no dia, com votos | 78,66 → 80,78 | 49,67 → 52,45 | 4,78 → 3,24 |
| Contingência no dia, antes do 1º voto | 78,76 → 80,88 | 48,58 → 51,39 | 4,92 → 3,32 |
| Troca antes do dia: seção → reserva | 78,28 → 79,85 | 47,25 → 49,98 | 4,24 → 2,98 |
| Troca antes do dia: reserva → reserva | 81,25 → 83,36 | 52,17 → 54,71 | 4,28 → 2,96 |
| **Trocas novas por reserva** | **78,58 → 80,51** | **48,73 → 51,50** | **4,61 → 3,17** |
| Outra urna de seção | 79,09 → 80,99 | 49,73 → 52,59 | 4,90 → 3,34 |
| Reserva → seção | 77,63 → 82,31 | 61,67 → 64,26 | 4,77 → 3,13 |
| Reserva herdada | 77,37 → 80,22 | 49,02 → 51,85 | 4,63 → 3,15 |
| Mesma urna, tipo mudou | 72,20 → 79,35 | 60,40 → 63,16 | 5,48 → 3,86 |

**Leitura:** a parcela do 13 sobe 2,77 pontos nas trocas novas e 2,80 no controle (51,782294 − 48,985894; uma versão anterior dizia 2,79, por subtrair valores já arredondados). Os níveis já eram diferentes no 1º turno: as seções trocadas são de outros lugares. Por isso o teste compara a **variação**, dentro da mesma zona.

- **Sobre o −0,12 p.p. do engenheiro (doc 03 dele, não revisado):** ele comparou o **nível** do 2º turno, todas as 5.714 reservas contra a zona.
  - Na variação 1º → 2º turno, as trocas novas ficam em −0,047 p.p. (IC95 −0,121 a +0,027).
  - A reserva herdada fica em −0,005 p.p.
  - Ou seja, a diferença de nível já existia no 1º turno, na mesma seção. É perfil do lugar, não efeito da troca.

## 2. Teste justo: diferença-em-diferenças (confirmatório)

**Modelo.** Para cada seção, Δ = valor do 2º turno − valor do 1º turno, em pontos percentuais.

- Regressão de Δ em: indicadores de cada grupo de troca, efeito fixo de zona (6.175 zonas, município × zona), modelo da urna do 1º turno (UE2013 como base) e log dos aptos.
- Peso pelo denominador do 2º turno (aptos, 13 + 22 ou comparecimento). Assim o efeito vale por voto e converte direto em votos.
- Erro-padrão agrupado por zona (CR1).
- **Inferência de reforço, sem normalidade:** teste de permutação, 5.000 sorteios.
  - Dentro de cada estrato (zona × modelo do 1º turno), as trocas são redistribuídas ao acaso entre as seções do estrato.
  - 32 trocas ficam fora porque o estrato não tem nenhuma seção de controle.
  - Os dois métodos dão o mesmo resultado.
- **Decisão (declarada antes):** Bonferroni bilateral sobre os 3 desfechos (α = 0,0167). Poder de 80% nesse α.

**Resultado (Fato), 2.818 trocas novas × controle da mesma zona:**

| Desfecho | Efeito (p.p.) | IC95 (p.p.) | Em votos (IC95) | p (regressão) | p (permutação) | p Bonferroni (3) | Poder 80%: enxerga a partir de |
|---|---|---|---|---|---|---|---|
| Comparecimento / aptos | −0,026 | −0,108 a +0,057 | −232 eleitores (−985 a +520) | 0,55 | 0,64 | 1,00 | 0,137 p.p. = 1.243 eleitores |
| 13 / (13 + 22) | −0,047 | −0,121 a +0,027 | −335 votos do 13 (−860 a +190) | 0,21 | 0,22 | 0,63 | 0,122 p.p. = 866 votos |
| (Brancos + nulos) / comparecimento | +0,030 | −0,028 a +0,089 | +222 (−203 a +648) | 0,31 | 0,14 | 0,92 | 0,096 p.p. = 702 votos |

- Base de conversão nas 2.818 seções: 908.707 aptos; 708.479 votos em 13 + 22; 731.639 comparecimentos.
- **Leitura:** nenhum desfecho difere do controle. O sinal da parcela do 13 é **negativo** (o 13 sobe um pouco menos nas trocadas), e o intervalo inclui o zero.

### Por tipo de troca (exploratório; 8 grupos × 3 desfechos = 24 testes; Bonferroni a 0,05/24)

| Grupo | Seções | Comparecimento (p.p., IC95) | 13 / (13 + 22) (p.p., IC95) | Brancos + nulos (p.p., IC95) |
|---|---|---|---|---|
| Contingência no dia, com votos | 1.425 | −0,05 (−0,16 a +0,07) | −0,04 (−0,14 a +0,06) | +0,03 (−0,05 a +0,11) |
| Contingência no dia, antes do 1º voto | 413 | −0,07 (−0,27 a +0,13) | −0,09 (−0,28 a +0,09) | −0,02 (−0,17 a +0,13) |
| Troca antes do dia: seção → reserva | 943 | +0,02 (−0,13 a +0,16) | −0,03 (−0,16 a +0,09) | +0,05 (−0,05 a +0,15) |
| Troca antes do dia: reserva → reserva | 37 | +0,35 (−0,22 a +0,92) | −0,17 (−0,71 a +0,38) | +0,19 (−0,17 a +0,55) |
| Outra urna de seção | 1.562 | +0,14 (+0,03 a +0,25), p = 0,011 | −0,01 (−0,11 a +0,09) | 0,00 (−0,09 a +0,09) |
| Reserva → seção | 44 | +1,83 (+0,55 a +3,10), p = 0,005 | −0,06 (−0,60 a +0,47) | +0,15 (−0,28 a +0,58) |
| **Reserva herdada** | 2.893 | **+0,74 (+0,64 a +0,84), p = 10⁻⁴⁶** | −0,005 (−0,08 a +0,07) | +0,05 (−0,01 a +0,11) |
| Mesma urna, tipo mudou | 16 | +3,38 (+0,49 a +6,27), p = 0,022 | −0,29 (−0,90 a +0,33) | −0,07 (−0,75 a +0,61) |

- **Fato:** só a reserva herdada passa no Bonferroni (24 testes). O efeito é no comparecimento, não no voto: +0,74 p.p., cerca de 6.945 eleitores a mais no 2º turno.
- **Hipótese benigna (testável, Pendente):** a falha no 1º turno derrubou o comparecimento daquele dia. Os grupos em que o 1º turno teve reserva (reserva → seção, mesma urna com tipo mudado) mostram o mesmo sinal. Para confirmar, é preciso a varredura de logs do 1º turno: hora da falha e duração da interrupção em 04/10.
- **Fato:** a contingência **no dia 25/10** não derrubou o comparecimento do 2º turno de forma detectável: −0,05 p.p., IC95 −0,16 a +0,07, nas 1.425 com votos na original. A assimetria com o 1º turno fica como **Hipótese**: votação mais curta no 2º turno (1 ou 2 cargos), interrupção mais curta.
- **Sem sinal de voto em nenhum grupo:** a parcela do 13 varia entre −0,29 e −0,005 p.p., com todos os intervalos cruzando o zero.

### Por modelo da urna do 1º turno (interação troca × modelo; 4 × 3 = 12 testes; BH)

| Modelo | Trocas novas | 13 / (13 + 22) (p.p., IC95) | Em votos | q (BH) | Poder 80% (p.p.) | Comparecimento (p.p.) | Brancos + nulos (p.p.) |
|---|---|---|---|---|---|---|---|
| UE2013 | 416 | −0,17 (−0,36 a +0,03) | −175 | 0,30 | 0,28 | +0,10 (q 0,66) | +0,06 (q 0,31) |
| UE2015 | 894 | +0,02 (−0,10 a +0,15) | +52 | 0,96 | 0,18 | −0,05 (q 0,66) | +0,03 (q 0,47) |
| UE2020 | 970 | −0,09 (−0,22 a +0,03) | −228 | 0,30 | 0,18 | −0,03 (q 0,66) | +0,07 (q 0,31) |
| UE2022 | 538 | +0,01 (−0,17 a +0,19) | +12 | 0,96 | 0,26 | −0,06 (q 0,66) | −0,08 (q 0,41) |

O q usa o p da permutação. **Fato:** nenhum modelo difere. A urna velha (UE2013) troca 12,9 vezes mais que a UE2022 (cético 24), mas não traz voto diferente.

### Por UF (regressão dentro da UF e permutação; 28 UFs × 3 = 84 testes; BH e Bonferroni por desfecho)

- **Fato:** nenhuma UF passa. Os menores q de BH são:
  - comparecimento: q = 0,49 (MS +1,14 p.p. e AL −0,64 p.p.);
  - parcela do 13: q = 0,52 (AC −2,82 p.p., em 5 trocas);
  - brancos + nulos: q = 0,85.
- **Poder por UF:** no Bonferroni de 28 testes, com 80% de poder, o teste enxerga, na parcela do 13:
  - 0,42 a 0,70 p.p. nas UFs com mais trocas (SP 393 trocas: 0,42; RJ 297: 0,47; BA 230: 0,48; RS 220: 0,54; PR 196: 0,57; MG 169: 0,70);
  - 2,8 a 5,0 p.p. nas que têm poucas trocas (exterior 13, AP 7, AC 5, RR 5, TO 4).
- **MG:** 169 trocas novas.
  - Parcela do 13: +0,10 p.p. (IC95 −0,21 a +0,40; +39 votos).
  - Comparecimento: −0,08 p.p.
  - Brancos + nulos: +0,03 p.p.
  - Nada difere.
- Tabela completa: `efeito-uf.csv`, com efeito, IC, p, q, Bonferroni, poder e votos.

### Aracaju, SE 31054/0001 e 0002 (cético 24: excesso de trocas; 2 zonas × 3 desfechos = 6 testes)

| Zona | Seções | Trocas novas (modelo do 1º turno) | Comparecimento (p.p., IC95 perm.) | 13 / (13 + 22) | Brancos + nulos | Poder 80% (Bonf. 6) |
|---|---|---|---|---|---|---|
| 31054/0001 | 418 | 21 (11 UE2015, 10 UE2013): 8 contingências com votos, 3 antes do 1º voto, 9 reserva → reserva, 1 seção → reserva | −1,17 (−2,35 a 0,00), p = 0,048, Bonf. 0,29 | −0,40 (−1,60 a +0,80), p = 0,51 | +0,01, p = 0,98 | cerca de 2,1 p.p. |
| 31054/0002 | 508 | 21 (14 UE2015, 7 UE2013): 3 + 3 contingências, 9 seção → reserva, 6 reserva → reserva | +0,16 (−0,80 a +1,13), p = 0,74 | −0,21 (−1,13 a +0,72), p = 0,66 | −0,24, p = 0,55 | cerca de 1,7 p.p. |

- **Fato:** nas duas zonas, nada passa no Bonferroni de 6 testes.
  - O voto no 13 nas trocadas varia como no resto da zona: −12 e −7 votos.
  - Na zona 0001, o comparecimento das trocadas sobe 1,2 ponto **menos** que na zona (−44 eleitores). Isso fica no limite do acaso sem correção (p = 0,048) e não passa com ela.
- **Fato (BU bruto, 42 trocas das duas zonas):** BU = banco em todas.
  - Em 16 das 42, a seção já usava reserva no 1º turno (urnas de nº 1654xxx a 1679xxx). Em 15 delas, a reserva do 2º turno é de outra faixa (1751xxx a 1795xxx).
  - **Hipótese:** substituição de reservas antigas entre os turnos.
- **Recomendação (mantida do cético 24):** pedir ao TRE-SE os registros de troca de urna das zonas 1 e 2 de Aracaju. O pedido serve para explicar a frequência das trocas. Os votos dessas seções não mostram anomalia.

## 3. Seções e zonas mais fora da curva

**Método:**
- Resíduo = Δ observado − controles − média da zona nas seções sem troca.
- Escala robusta: MAD do controle por decil de tamanho.
- O p de cada seção é **empírico**: a fração das 491.843 seções de controle com |z| maior ou igual. As caudas reais são mais grossas que a normal.
- Testes:
  - Bonferroni sobre 3 desfechos × 7.333 seções com qualquer troca = 21.999 testes;
  - zonas: Stouffer dos z calibrados das trocas da zona, Bonferroni sobre 3 × 1.561 zonas = 4.683 testes.

**Resultados (Fato):**
- **Nenhuma seção com troca passa no Bonferroni.** O menor p empírico possível é 2,0 × 10⁻⁶.
  - Há 4 seções com p < 10⁻⁴, contra 2,2 esperadas pelo acaso.
- **Nenhuma zona passa** (0 de 1.561 nos três desfechos).
- **Cauda:** nas trocas novas, a fração com |z| > 3 é 1,38% no comparecimento, contra 0,99% no controle (39 seções contra 28 esperadas; p = 0,036 sem correção, 0,11 com Bonferroni 3).
  - A cauda é simétrica: 18 acima e 21 abaixo.
  - Na parcela do 13 a fração é 0,75% contra 0,57% (p = 0,22).
  - Em brancos + nulos é 0,92% contra 0,78% (p = 0,38).
  - **Leitura:** as seções com troca são um pouco mais **ruidosas** no comparecimento, nos dois sentidos. É o que se espera de uma urna que falha: atraso, fila, interrupção. Não há desvio para um lado.

**As mais extremas (todas conferidas no BU bruto dos dois turnos, `conferencia-bruto.json`: 57 seções, 0 divergências com o banco):**

| Seção | Grupo | O que mudou (1º → 2º turno) | z (p empírico) | Motivo possível |
|---|---|---|---|---|
| AM 02399/0045/0063 (Ipixuna) | reserva herdada (mesma urna 2018717 nos dois turnos) | 13: 135 → 167; 22: 61 → 2; nulos 19 → 28; comparecimento 227 → 197; parcela do 13: 68,9% → 98,8% | +10,1 (1,8 × 10⁻⁵; Bonf. 0,40) | Mesma urna nos dois turnos: a troca não explica. **Hipótese:** dinâmica política local. **Recomendação:** cientista político (comunidade, apoio local) |
| PR 75833/0043/0397 | outra urna de seção | comparecimento 51 → 38 | −7,6 (1,9 × 10⁻⁴) | Urna carregada no próprio dia 25/10; abertura às 10:51 (engenheiro, doc 03) |
| BA 35157/0156/0131 | reserva → seção | comparecimento 199 → 253 | +7,6 (1,9 × 10⁻⁴) | Reserva no 1º turno (falha no 1º turno) |
| RS 85065/0031/0157 | contingência antes do 1º voto | brancos + nulos 14 → 2 em 92 → 96 votantes; 22: 61 → 81 | −6,3 (7,3 × 10⁻⁵) | Seção pequena; eleitor dos eliminados e do branco migrou para o 22 |
| BA 36854/0180/0149 | contingência com votos (83 na original até 09:59) | comparecimento 253 → 319 | +6,1 (5,0 × 10⁻⁴) | Já usava reserva no 1º turno: comparecimento do 1º turno baixo |
| BA 34193/0053/0274 | contingência com votos (46 na original até 12:27) | 13: 41 → 60; 22: 53 → 42; nulos 10 → 1 | +5,7 na parcela do 13 (8,1 × 10⁻⁵; Bonf. 1,0) | Nenhum conhecido; cerca de 11 votos. Dentro do acaso depois da correção |
| PA 04898/0099/0062 | contingência com votos (121 na original até 13:46; 58 na reserva) | comparecimento 236 → 179 | −5,4 (7,7 × 10⁻⁴) | **Hipótese:** interrupção à tarde |
| PA 05754/0079/0117 | troca antes do dia | comparecimento 227 → 197 | −5,4 (7,3 × 10⁻⁴) | Abertura normal; sem explicação nos arquivos |
| AP 06041/0010/0461 | contingência antes do 1º voto (original falhou às 07:42) | comparecimento 211 → 119 | −4,8 (1,1 × 10⁻³) | Abriu às 08:10; a queda não se explica pelo horário. **Recomendação:** ata da seção |
| AM 02070/0035/0051 | troca antes do dia | comparecimento 215 → 172 | −4,7 (1,3 × 10⁻³) | Sem explicação nos arquivos |

- Nenhuma dessas seções mudou de local, de agregação ou de aptos (mais de 10). A coluna "motivo" do `extremas-secoes.csv` fica vazia nelas.
- **Leitura:** o p empírico de 10⁻³ a 10⁻⁴ quer dizer que há de 50 a 500 seções **sem troca** tão extremas quanto essas. Elas não são raras no conjunto.
- Lista completa: `extremas-secoes.csv` (300 linhas) e `extremas-zonas.csv` (200).

## 4. Explicações alternativas (Fato, cada uma testada)

| Explicação | Teste | Efeito na parcela do 13 (p.p.) | Comparecimento | Brancos + nulos |
|---|---|---|---|---|
| Nenhum controle (diferença bruta de médias) | — | −0,063 | +0,074 | +0,083 |
| Só a UF como efeito fixo (sem zona) | — | −0,060 (IC −0,14 a +0,02) | −0,023 | +0,031 |
| Zona, sem o modelo da urna | — | −0,045 | −0,019 | +0,045 |
| **Principal: zona + modelo do 1º turno + tamanho** | — | **−0,047** | **−0,026** | **+0,030** |
| + mudança de local, de agregação e de aptos como controles | — | −0,048 | −0,026 | +0,031 |
| Sem as seções com mudança de local, agregação ou aptos (sai 1 troca) | — | −0,047 | −0,025 | +0,030 |
| Permutação dentro de zona × modelo | — | −0,047 | −0,019 | +0,045 |

- **Urnas antigas em lugares de perfil diferente:**
  - O nível do 13 no 1º turno já difere: 48,73% nas trocadas contra 48,99% no controle. Por isso o teste usa a variação dentro da zona.
  - Com ou sem o controle de modelo, o efeito fica em −0,045 a −0,047.
  - Por modelo, nenhum difere.
  - O controle de zona e de modelo muda pouco o resultado, porque a variação 1º → 2º turno quase não depende do perfil fixo.
- **Mudança de local:** nenhuma seção do universo mudou de local entre os turnos (Fato, banco).
- **Agregação ou desmembramento:** nenhuma mudou. A lista de agregadas é idêntica nos dois turnos.
- **Aptos que mudam:** 1 troca nova e 234 controles mudam mais de 10 aptos. Excluí-los não muda nada.
- **Contingência no dia × troca antes:** separadas na tabela por tipo. Nenhuma tem sinal de voto.

## 5. Pista do H05 em MG: a troca ou o perfil? (exploratório)

O doc [06](06-h05-28ufs.md) achou, nas 4.409 seções com nº de urna diferente entre os turnos, um d diferente das demais. O d mede como o eleitor a mais sem biometria divide o voto 13 × 22, contra o habilitado por biometria. Em MG: +0,070, t = 7,5, em 214 seções comparáveis.

- **Script:** `estatistico-reservas-1t2t-mg.mjs`, modelo E2 do `estatistico-lib.mjs`.
  - Peso c1, efeito fixo de município, EP agrupado por município.
  - Interação T × (as duas inclinações). Δd = d(trocadas) − d(mesma urna) no mesmo município.
- **Volume da pista:** 105 estimativas exploratórias (3 recortes × 2 finalistas × 10 especificações + 45 de composição).

| MG, ganho do 13 | Δd (ep; t) | Leitura |
|---|---|---|
| d nas trocadas sozinhas (reproduz o doc 06) | +0,070 (0,009; 7,5), 214 seções | — |
| Interação no mesmo município | +0,062 (0,018; 3,4) | O t cai à metade quando se compara com o mesmo município |
| Pareado: zona com troca, mesmo modelo do 1º turno, efeito fixo de zona | +0,063 (0,019; 3,2) | A troca, não o modelo |
| + perfil nas inclinações (UE2013, tamanho do município, 60+, escolaridade, biometria cadastrada) | **+0,042 (0,018; 2,3)** | Um terço do efeito é perfil; o resto não passa em correção |
| Só reserva nova (169) | +0,080 (0,014; 5,7) | Concentrado na reserva |
| Só outra urna de seção (154) | −0,081 (0,078; −1,0) | Nada |
| Sem as 7 trocadas com troca de modo (Δbio ≤ −10 e Δsem bio ≥ +10) | +0,063 (0,018; 3,5) | Não vem da troca de modo |
| Placebo: UE2013 no lugar da troca | +0,019 (0,047; 0,4) | O modelo velho sozinho não dá d alto |

- **Fato (MG):**
  - Nas 326 trocadas de MG, o Δ sem biometria líquido é +639; o Δ por biometria, +2.143; o Δ do 13, +7.471; o do 22, +3.061.
  - O Δd de +0,06 aplicado aos 639 eleitores a mais sem biometria dá **cerca de 40 votos** de diferença na divisão 13 × 22.
  - O teste direto de voto (item 2) dá, nas 169 trocas novas de MG, +39 votos (IC95 −86 a +163). As duas medidas concordam.
- **Fato (SP):** Δd = +0,024 (t = 3,1). Com o perfil, +0,008 (t = 0,9): some.
- **Fato (Brasil):** Δd = +0,010 (t = 2,1). Com o perfil, +0,004 (t = 0,9): some.
- **Fato (composição da habilitação, efeito fixo de zona):** a troca não muda a parcela habilitada sem biometria. Em MG, contingência com votos: −0,64 p.p. (ep 0,99). No Brasil: −0,17 (ep 0,29).
  - O único grupo que muda é a reserva herdada no Brasil: −0,56 p.p. (t = −4,4). É o mesmo grupo cujo comparecimento do 1º turno foi deprimido.
- **Fato (troca de modo):** existe, mas é rara. São 190 trocadas no Brasil com Δ por biometria ≤ −10 e Δ sem biometria ≥ +10 na mesma seção. Juntas, somam +6.693 sem biometria e −5.992 por biometria: os mesmos eleitores, habilitados de outro jeito. Em MG são 7.
- **Leitura (Hipótese):** a pista de MG é real no ajuste simples, mas pequena (cerca de 40 votos). Ela não sobrevive ao controle de perfil sob nenhuma correção para as 105 estimativas (|t| ≥ 3,5) e não aparece no voto da seção. Não é sinal de inserção pela troca de urna.
  - Em MG, ela fica entre "perfil das seções que trocaram" e acaso.
  - **Recomendação:** a frente de biometria pode olhar as 12 trocadas de MG com maior Δ sem biometria (`mg-biometria.json`, `topDeltaSemBio`). São 9 com contingência no dia, e as 5 primeiras têm Δ por biometria negativo, de −22 a −51 (troca de modo).

## Gráficos

Em `data/parsed/auditoria/reservas-1t2t/`. Cada gráfico tem título que diz o resultado, eixos com unidade, legenda e "como ler".

- `hist-s13.svg`: distribuição da variação da parcela do 13 (resíduo da zona, p.p.), trocas novas (barras) × controle (linha). As duas formas coincidem.
- `hist-comp.svg` e `hist-bn.svg`: o mesmo para comparecimento e para brancos + nulos.
- `forest-uf-s13.svg` e `forest-uf-comp.svg`: efeito por UF com intervalo de 95% da permutação e q de BH; linha do Brasil embaixo.
- `grupos.svg`: efeito de cada tipo de troca nos três desfechos. Só a reserva herdada, no comparecimento, sai do zero.

Os SVGs ficam fora do git (`data/parsed/` é ignorado). Para a perícia, o redator copia para `docs/pericia/graficos/`.

## Quantos testes (Fato)

**Script principal: 26.811 testes.**

| Teste | Quantidade | Tipo |
|---|---|---|
| Confirmatório | 3 | Confirmatório |
| Por grupo | 24 | Exploratório |
| Por modelo | 12 | Exploratório |
| Por UF | 84 | Exploratório |
| Zonas | 4.683 | Exploratório |
| Seções | 21.999 | Exploratório |
| Aracaju | 6 | Exploratório |

**Script de MG:** 105 estimativas exploratórias.

**Correções:**
- Bonferroni em cada família;
- BH para UF e modelo;
- p empírico nas seções e nas zonas.

## Como reproduzir

```bash
node --max-old-space-size=8192 scripts/auditoria/estatistico-reservas-1t2t-dados.mjs   # ~45 s: secoes.csv, dados.json
node --max-old-space-size=8192 scripts/auditoria/estatistico-reservas-1t2t.mjs         # ~2 min: DiD, permutação, resíduos, SVGs
node scripts/auditoria/estatistico-reservas-1t2t-bruto.mjs --n 15                      # BU bruto dos dois turnos: extremas + Aracaju
node --max-old-space-size=8192 scripts/auditoria/estatistico-reservas-1t2t-mg.mjs      # ~1,5 min: pista do H05 (MG, SP, Brasil)
```

**Entradas:**
- cópia de leitura do banco;
- `engenheiro-seguranca-urna/2t/*.secoes.jsonl` (varredura de logs);
- `estatistico-eleitoral/pares-banco.csv` e o perfil do eleitorado (só o script de MG).

**Saídas em `data/parsed/auditoria/reservas-1t2t/`:**
- `secoes.csv`
- `tabela-grupos.csv`
- `resultado.json`
- `efeito-uf.csv`
- `efeito-modelo.csv`
- `extremas-secoes.csv`
- `extremas-zonas.csv`
- `conferencia-bruto.json`
- `mg-biometria.json`
- os SVGs
- `log-analise.txt` e `log-mg.txt`

## Pendentes e riscos

- **Pendente:** a varredura de logs do 1º turno (hora e duração da falha em 04/10). Serve para confirmar que o +0,74 p.p. das reservas herdadas é comparecimento perdido no 1º turno. Hoje é Hipótese, apoiada pelo sinal dos grupos com reserva no 1º turno.
- **Pendente:** a ata das seções AP 06041/0010/0461 (comparecimento 211 → 119) e PA 04898/0099/0062 (236 → 179).
- **Pendente:** o pedido ao TRE-SE sobre a frequência de trocas nas zonas 1 e 2 de Aracaju. Os votos já foram testados aqui: nada.
- **Risco do método:**
  - O efeito fixo de zona compara com vizinhos. Se toda a zona fosse manipulada igual, o teste não vê. A comparação entre zonas fica com o Klimek e o H03.
  - As 32 trocas em estratos sem controle ficam fora da permutação, mas dentro da regressão.
- **Risco da classificação:** "contingência no dia" quer dizer que a urna original tem atividade no relógio de 25/10. Um relógio errado mudaria a classe de poucas seções, não o total de 2.818.
- **Risco do script de MG:** ele importa `estatistico-lib.mjs`, que tinha alterações não commitadas de outro agente quando rodou. As funções usadas (`testeE2` e `mqEfeitoFixo`) são as mesmas que o doc 06 usou.
- **Não revisado:** este doc ainda não passou pelo cetico-revisor.
