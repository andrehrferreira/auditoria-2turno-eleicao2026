# 32. H14 e H19: resultado final, só com dados públicos

Estatístico eleitoral, **02/11/2026**. Este doc executa o plano [31](31-h14-h19-plano-final.md), registrado no **commit 067d1a7** antes de qualquer conta nova. Os cortes, os modelos e as regras de decisão são os do plano. O que o plano não previa está na seção "Desvios do plano". O que veio depois de ver os resultados está marcado **exploratório**.

Rótulos:
- **Fato:** contagem ou teste declarado sobre o universo completo, com script do repo.
- **Estimativa:** sai de modelo ou de simulação.
- **Hipótese.**
- **Pendente.**

Definição das conclusões (a do plano, confirmada pelo coordenador em 02/11):
- **refutada** só vale com um fato de contagem que contrarie a hipótese;
- um teste nulo leva a **sem sinal nos dados públicos**, acompanhado do tamanho mínimo que o teste enxerga.

## Resposta curta

### H14. Urnas trocadas por reserva no 2º turno teriam sido manipuladas

**Conclusão final: sem sinal nos dados públicos, com o tamanho mínimo que o teste enxerga.**

- **(a) Tamanho mínimo (Estimativa, simulação nos dados reais).** Com 80% de chance, o teste da diferença-em-diferenças enxerga:
  - nas 2.818 trocas novas: desvio de cerca de **860 votos** do 22 para o 13 (0,10 ponto), 910 no sentido contrário, ou **1.190 eleitores** inseridos no 13;
  - nas 2.893 reservas herdadas, com desvio **igual nos dois turnos** (o caso que a diferença-em-diferenças não vê): cerca de **1.490 votos** do 22 para o 13 (0,19 ponto), 2.230 no sentido contrário, ou 2.130 eleitores inseridos;
  - concentrar o desvio em 1% das seções quase não muda esses números.
- **(b) Comparecimento menor das reservas herdadas no 1º turno (Fato, teste declarado).** Ele é explicado pela interrupção da votação no dia 04/10, e não pela reserva:
  - leitura do diário do 1º turno das **3.033** seções que votaram com reserva, com 0 erro de leitura;
  - o déficit aparece só onde a urna original falhou no próprio dia: −1,03 ponto quando ela já tinha votos e −0,48 quando falhou antes do 1º voto;
  - onde a reserva já estava instalada antes do dia (399 seções), o déficit é zero: +0,02 ponto, intervalo de −0,60 a +0,64;
  - o déficit cresce com o tempo parado: −1,50 ponto por hora sem votação (z = −6,5);
  - as três condições da regra de decisão foram atendidas.
- **(c) Reservas que liberaram quase todos sem digital: não decidível com dados públicos.**
  - O diário mostra que o leitor **lê** o dedo: 99% das tentativas são capturas, e não tempo esgotado.
  - O leitor não casa a digital do eleitor. A liberação foi autorizada, quase sempre, por um dedo que a própria urna tinha gravado naquele dia ("dedo já visto").
  - As 14 reservas têm todas esse desenho. Mas ele também é o da maioria das 152 urnas comuns com o mesmo salto (117 delas), e a diferença entre os grupos não passa no corte (Fisher p = 0,043; corte 0,025).
  - **Exploratório:** em 8 das 14 reservas, toda comparação do dedo de quem autorizou com os mesários registrados deu escore 0. Nas 149 urnas comuns isso acontece em 0.
  - As 8 são todas urna original UE2015 trocada no dia por reserva UE2013.
  - O dado que falta: o registro de manutenção do leitor dessas reservas e a ata da mesa (TSE e TREs).
- **Escala (Fato):** os 742.671 votos do 13 nas 5.714 seções com reserva não mudam o vencedor, nem no pior caso. Se todos tivessem saído do 22, a diferença ainda seria de 2.944.849 votos.
- **Fica não decidível** um programa adulterado e assinado com a chave oficial. Nenhum arquivo público traz uma medição do programa da urna feita fora do próprio programa.

### H19. Falha de digital provocada de propósito nas seções escolhidas

**Conclusão final: sem sinal nos dados públicos, com o tamanho mínimo que o teste enxerga.**

- **(a) As 26.933 seções sozinhas no prédio com aquele modelo de urna**, comparadas com a zona × modelo:
  - 0 dos 24 testes confirmatórios passa o corte (|z| ≥ 3,08);
  - o maior é Norte, Δf, com z = 2,09;
  - o teste enxerga, no Brasil, a partir de cerca de **5.500 votos** a favor do 13 e **3.800** a favor do 22, postos como liberação à mão;
  - no salto de cada seção, 9 sobem e 22 descem além do acaso, e 8 das 9 subidas tiveram a urna trocada.
- **(b) Liberações sem nenhum dedo lido**, seção a seção (Fato):
  - 172.318 no 1º turno e 212.171 no 2º;
  - 14,6% e 13,5% delas estão em 1% das seções.
  - Pela beta-binomial (Bonferroni sobre 995.665 testes), **5 seções** ficam fora do esperado. Em 4 delas, os eleitores reconhecidos também tiveram muito tempo esgotado: é o desenho de leitor ou dedo, não de mesa.
  - No padrão "liberação sem tentar", fixado antes de ver os dados, ficam **11 seções**. Elas pedem explicação por seção, como lacuna de controle e sem efeito no voto.
  - Nos testes de voto, 1 dos 12 passa: Norte, z = 3,15. Mas ele vem **sem** o comparecimento a mais que o mecanismo exige (z = 0,67). Pelo critério do plano, não é compatível com H19. O tamanho é de cerca de 1 voto por seção.
- **(c) Falha alta e igual nos dois turnos**, com 2022 como linha de base. A cobertura é MG, PR, SC e RS, com **112.026** seções ligadas entre os anos.
  - Nenhum teste de voto passa.
  - O comparecimento das seções com mais falha que em 2022 **caiu** (4 UFs juntas: z = −4,24). É o **oposto** do rastro de voto posto no lugar de ausente.
  - A falha da seção persiste entre os anos (correlação 0,43). Das seções com falha alta nos dois turnos de 2026, 11,8% já eram altas em 2022, contra 0,4% esperados por acaso.
  - O teste enxerga a partir de cerca de **12.500 votos** a favor do 13 nas 4 UFs.
  - As outras 23 UFs ficam **não cobertas**. O dado que falta é público: os diários de urna de 2022 dessas UFs, que não foram baixados por decisão do coordenador.
- **Fica não decidível** a parte "de propósito". O diário não separa sabotagem de desgaste do leitor, nem falha escolhida de mesa que desiste rápido, nem diz quem pôs o dedo.
  - O dado que falta: ata da mesa, registro de manutenção do leitor e identificação de quem autorizou (TSE e TREs).

### O efeito máximo pode mudar o vencedor do 2º turno?

**H14: não (Fato de contagem).**

**H19: só numa forma que nenhum teste vê.**
- A contagem bruta não exclui. Há 8.632.471 liberações à mão no 2º turno, mais que a diferença de 4.430.191.
- Mas as formas que os testes enxergam ficam limitadas a algumas dezenas de milhares de votos.
- As liberações sem nenhum dedo lido (212.171) não mudariam o resultado nem se fossem todas votos inseridos.

Detalhes na seção "Efeito máximo".

---

## H14(a). Tamanho mínimo de desvio que o teste enxerga (poder por simulação)

**Método:** placebo com injeção, nos dados reais.
- Em cada réplica, sorteio entre as 491.843 seções de controle um conjunto do tamanho do grupo tratado, estratificado por zona × modelo da urna do 1º turno.
- Injeto o desvio e refaço o teste original.
- O estimador é a mesma regressão do doc 07 e do parecer 30, calculada por somas (Frisch-Waugh-Lovell). Conferido contra a regressão completa no mesmo conjunto: diferença de 10⁻¹⁶ em β e no erro.
- São 1.000 réplicas por ponto (500 por UF e modelo), com semente 20261102.
- 33 das 2.818 trocas e 284 das 2.721 herdadas elegíveis tiveram de sortear placebo na mesma zona, em outro modelo.

**Reprodução antes de simular (Fato):**
- doc 07: −0,047 (IC −0,122 a +0,027), −0,026 e +0,030;
- parecer 30, herdadas no 2º turno: −0,064 (IC −0,23 a +0,10), contra −0,06 (−0,21 a +0,09). A diferença vem da amostra: aqui entram só controle e herdadas.

**Calibração (δ = 0):**

| Detector | Rejeição nula observada | Nominal | Calibrado? |
|---|---:|---:|---|
| DiD, trocas novas (qualquer um dos 3 desfechos com p < 0,05/3) | 3,6% a 6,1% | cerca de 5% | sim |
| Seções extremas (Bonferroni 21.999) | 1,9% a 3,9% | cerca de 5% | sim |
| Excesso de cauda (binomial, por desfecho) | **17% a 19%** | cerca de 5% | **não** |
| Excesso de cauda com corte empírico (z ≥ 2,81) | 5,1% a 6,1% | 5% | sim (pela regra do plano) |
| Nível das herdadas (qualquer desfecho com p < 0,05/3) | 2,9% a 4,6% | cerca de 5% | sim |
| Por modelo (Bonferroni 12) | 0,2% a 0,6% | 0,42% | sim |
| Por UF (Bonferroni 28; nominal 0,18%) | 0 a 7,0% | 0,18% | não nas UFs com poucas trocas (ver "Riscos") |

- O excesso de cauda binomial rejeita demais porque as seções de uma mesma zona não são independentes.
- Pela regra do plano, passei a usar o corte empírico: o quantil 95% do maior z de cauda entre os 3 desfechos nas réplicas nulas. A curva "combinada calibrada" usa esse corte. A rejeição nula dela é de 11,8% a 14,6%, porque junta 3 detectores.

**MDE: o menor desvio visto com 80% de chance (Estimativa).** O δ é a média, em pontos da parcela do 13, sobre as seções tratadas. Os votos são os votos médios realmente movidos nas réplicas.

| Grupo e detector | Forma | ρ = 100% | ρ = 20% | ρ = 5% | ρ = 1% |
|---|---|---|---|---|---|
| Trocas novas, DiD | F1, 22 → 13 | 0,098 p.p. / **857 votos** | 0,117 / 859 | 0,121 / 859 | 0,143 / 997 |
| | F2, 13 → 22 | 0,103 / 906 | 0,120 / 882 | 0,132 / 933 | 0,154 / 1.078 |
| | F3, voto inserido no 13 | 0,063 / 1.185 eleitores | 0,064 / 1.196 | 0,065 / 1.223 | 0,080 / 1.270 |
| | F4, 22 → nulo | 0,044 / 825 votos | 0,048 / 776 | 0,051 / 789 | 0,070 / 916 |
| Trocas novas, seções extremas | F1 | não chega a 80% até 1 p.p. | idem | idem | 0,278 / 1.868 |
| Trocas novas, cauda calibrada | F1 | 0,870 / 6.257 | 0,414 / 2.937 | 0,162 / 1.145 | 0,070 / 489 |
| Trocas novas, combinado calibrado | F1 | 0,097 / 841 | 0,115 / 845 | 0,114 / 805 | 0,068 / 474 |
| | F3 | 0,062 / 1.150 eleitores | 0,061 / 1.143 | 0,057 / 1.068 | 0,042 / 747 |
| **Herdadas, nível (igual nos dois turnos)** | F1 | 0,188 / **1.487 votos** | 0,219 / 1.511 | 0,230 / 1.571 | 0,274 / 1.791 |
| | F2 | 0,296 / 2.231 | 0,359 / 2.463 | 0,382 / 2.617 | 0,477 / 2.867 |
| | F3 | 0,124 / 2.133 eleitores | 0,124 / 2.163 | 0,126 / 2.250 | não chega a 80% até 1 p.p. |
| | F4 | 0,041 / 738 votos | 0,041 / 654 | 0,043 / 641 | 0,050 / 670 |

- Robustez: sorteando o placebo só entre urnas UE2013 e UE2015, as mais trocadas, o MDE da DiD em F1 fica em 0,142 ponto (650 votos).
- **Por modelo** (F1, DiD, Bonferroni 12):
  - UE2013 (416 trocas): 0,38 ponto, 382 votos;
  - UE2015 (894): 0,23, 599 votos;
  - UE2020 (970): 0,23, 620 votos;
  - UE2022 (538): 0,33, 477 votos.
- **Por UF** (F1, DiD, Bonferroni 28):
  - SP 0,44 ponto (462 votos); RJ 0,46 (389); BA 0,49 (302); RS 0,50 (281); PR 0,69 (349); SC 0,76 (290); MG 0,80 (330); MA 0,80 (276);
  - nas UFs com 4 a 7 trocas (AC, AP, RR, TO), 3,8 a 5,9 pontos;
  - a lista completa está em `poder/poder-uf-modelo.json`.

**Leitura:**
- O desvio que esses testes deixariam passar fica abaixo de **cerca de 1.300 votos** nas trocas novas e de **cerca de 2.900 votos** nas herdadas, nas formas e concentrações testadas.
- A exceção é o voto inserido concentrado em 1% das herdadas (27 seções). Ali a abstenção da seção limita o que se pode inserir, e o teste não chega a 80% de poder.
- Na escala da eleição, isso é menos de 0,07% da diferença de 4.430.191.
- O detector de seções extremas sozinho é quase cego: só vê desvio concentrado, de dezenas de votos por seção. Quem vê é o teste da média.

## H14(b). Por que as reservas tiveram menos comparecimento no 1º turno

**Universo (Fato):**
- as 3.033 seções cujo BU do 1º turno é de urna reserva, com o diário do dia 04/10 lido de novo;
- 0 erro de leitura;
- os votos contados no diário são iguais aos do BU em 3.029 seções.

As 4 diferenças são de 1 a 136 votos e não mudam a classe. Em BA 39934/0183/0175, o diário só tem metade dos votos. O BU bruto foi conferido: 272.

| Classe (critério do doc 07: atividade da urna original no dia) | Seções | Herdadas | Aptos | Mediana de D, o maior intervalo sem voto (min) | Mediana do intervalo da troca (min) |
|---|---:|---:|---:|---:|---:|
| C1. Troca no dia, a original já tinha votos | 2.114 | 2.011 | 678.870 | 33,1 | 28,3 |
| C2. Troca no dia, antes do 1º voto | 520 | 495 | 167.541 | 37,1 | 36,7 |
| C3. Reserva instalada antes do dia | 399 | 387 | 136.866 | 15,2 | — |
| C4. Sem linhas da urna do BU | 0 | 0 | 0 | — | — |

- O critério do engenheiro usa a data da contingência gravada no log da reserva. Por ele, 182 das 399 C3 têm contingência registrada em 04/10. São o mesmo caso das 133 seções do parecer 30: a original não gravou nada no dia.
- **Abertura (desvio, ver adiante):** D é medido a partir das 8 h de Brasília no relógio local da urna (AC −2 h; AM, RO, RR, MT e MS −1 h).

**Modelo:**
- desfecho: comparecimento ÷ aptos do 1º turno, em pontos;
- contra as seções de controle do mesmo local de votação;
- MQP com peso pelos aptos, efeito fixo de local, log dos aptos, erro agrupado por zona;
- 472.722 seções, 72.317 locais, 6.174 zonas.

**Família B (Fato, 4 testes, Bonferroni |z| ≥ 2,50):**

| Teste | Efeito (pontos) | IC95 | z | Passa |
|---|---:|---|---:|---|
| β(C1) | −1,03 | −1,25 a −0,82 | −9,51 | sim |
| β(C2) | −0,48 | −0,89 a −0,06 | −2,25 | não |
| β(C3) | +0,02 | −0,60 a +0,64 | +0,07 | não |
| Inclinação em D, dentro de C1 + C2 (pontos por hora) | −1,50 | −1,95 a −1,05 | −6,55 | sim |

**Regra de decisão:**
- (i) a inclinação é negativa e passa: sim;
- (ii) β(C3) não passa e |β(C3)| < 0,375: sim (0,02);
- (iii) C1 + C2 respondem por ≥ 50% do déficit em eleitores: sim, 101%.

O déficit total é de **7.747 eleitores** (todas as reservas do 1º turno: −0,79 ponto, z = −8,1). Por classe:
- C1: −7.022;
- C2: −799;
- C3: +31.

**→ Explicado pela interrupção da votação no dia (Fato, teste declarado).**
- Com D no modelo, o efeito de C1 cai para −0,08 (z = −0,5): o tempo parado explica tudo.
- As herdadas sozinhas dão o mesmo resultado: C1 −1,01 (z = −9,3); C3 +0,05 (z = 0,2).

**Robustez (exploratório):**

| Variante | C1 | C2 | C3 | Inclinação |
|---|---|---|---|---|
| Efeito fixo de zona, todas as seções | −0,97 (z −8,9) | −0,73 (−3,3) | −0,16 (−0,5) | — |
| Intervalo da troca no lugar de D | — | — | +0,02 (0,1) | −1,25/h (−5,7) |
| Sem as 4 com relógio voltando no dia | −1,06 (−10,0) | −0,48 (−2,3) | +0,07 (0,2) | — |
| Critério do engenheiro (contingência no dia × antes) | no dia −0,89 (−9,4) | — | antes +0,34 (0,7) | — |
| As mesmas seções, comparecimento do 2º turno | −0,08 (−0,9) | +0,05 (0,3) | +0,27 (0,9) | — |

**Comparação com o 2º turno (exploratório):**
- nas 1.837 contingências do dia 25/10, o comparecimento fica igual ao das vizinhas: +0,22, z = 1,15;
- a inclinação em D é mais fraca: −0,53 por hora, z = −1,97;
- a assimetria acompanha o tempo de voto. No 1º turno o eleitor vota em vários cargos, a fila cresce mais e quem desiste não volta.

**Conferidas no BU bruto (1º turno, 10 seções, 0 divergência):**
- as 5 de maior D: BA 39934/0183/0175, PR 74748/0045/0184, BA 34290/0127/0055, BA 34290/0127/0213 e MS 91235/0005/0168. Nesta última, a abertura no BU é 10:14;
- os 5 maiores déficits contra o local: BA 35157/0156/0131, SP 66192/0065/0428, PE 23515/0054/0079, PR 76317/0064/0050 e MT 91910/0030/0102.

## H14(c). Reservas que liberaram quase todos sem digital

**Seleção (Fato).** O critério do parecer 30 foi recalculado do zero e reproduz o parecer:
- G1: 14 de 2.590 reservas H14;
- G2: 152 de 489.983 seções com a mesma urna de seção;
- G3 (exploratório): 1 de 2.861 herdadas.
- Das 7 do engenheiro, 6 estão em G1. BA 36854/0180/0547 não está, como o parecer 30 já tinha dito.

**Leitura:**
- o diário do dia 25/10 de cada seção foi lido de novo;
- quando a troca foi no dia, a urna original e a reserva foram contadas separadas;
- 0 título gravado: os mesários viram M1, M2…

**Achado do diário que muda o critério:** o diário de 2026 **não grava escore** nas tentativas do eleitor. O escore só aparece no batimento do dedo de quem autoriza ("Batimento de digitais retornou o score N", seguido de "Biometria coletada não é do mesário" ou de "dedo já visto"). O critério de escore do eleitor saiu (ver "Desvios").

| Classe | G1 (14) | G2 (152) |
|---|---:|---:|
| L0. Leitor que não lê (≥ 80% tempo esgotado ou erro do leitor) | 0 | 1 |
| L1. Lê, mas não casa ninguém (quem autoriza é "dedo novo" ≥ 80%) | 0 | 25 |
| L2. Lê o dedo da mesa, não casa o eleitor (quem autoriza reconhecido ≥ 50%) | **14** | 117 |
| L3. Lê e casa às vezes | 0 | 8 |
| L4. Outra | 0 | 1 |

**Família C (Fato, 2 testes, Fisher, corte 0,025):**
- fração L2, G1 × G2: 14/14 × 117/152, p = 0,043, **não passa**;
- fração L0 + L1: 0/14 × 26/152, p = 0,13, não passa.

**→ Não decidível com dados públicos.** A maioria de G1 é L2, mas sem diferença de G2 no corte.

O que o diário mostra (Fato, contagem nas 14):
- 2.562 votos, 2.105 sem digital;
- a mediana das tentativas que leram um dedo é 99%;
- em 11 das 14, menos de 10% das liberações foram autorizadas por mesário registrado. Nas urnas comuns de G2, a mediana é 66%;
- a liberação é autorizada, sobretudo, por um dedo que a urna gravou naquele dia e passou a reconhecer.

Os votos dessas seções já foram testados (parecer 30): −2 votos, |z| ≤ 1,6.

**Exploratório (feito depois de ver os casos):**
- em **8 das 14** reservas, **todas** as comparações do dedo de quem autoriza com os mesários registrados deram escore 0, de 148 a 912 comparações por urna;
- nas 149 urnas de G2 com comparação, isso não acontece em nenhuma (Fisher p = 2,9 × 10⁻¹⁰);
- as 8 são todas troca **no dia** de urna original UE2015 por reserva UE2013: BA 37150/0078/0158, BA 34819/0061/0007, CE 13510/0032/0189, MG 53414/0262/0042, RJ 60011/0180/0113, RJ 60011/0188/0082, RJ 58637/0221/0178 e RS 87173/0118/0143;
- não é o par de modelos em si. Nas 314 trocas UE2015 → UE2013 do dia, a reserva liberou 18,3% sem digital, contra 16,3% na original. Só 9 passaram de 50%.

**Leitura (Hipótese):**
- nessas 8, a reserva casa o que ela mesma gravou no dia, mas nenhuma digital vinda de fora: nem a do eleitor, nem a do mesário registrado;
- o desenho é de leitor ou casamento de digitais defeituoso na reserva;
- a outra leitura possível é que nenhum mesário registrado pôs o dedo em centenas de autorizações. O log não separa as duas;
- o registro de manutenção dessas 8 reservas decide.

**Conferidas no BU bruto:** as 14 do G1 no 2º turno; todas são reserva, com 0 divergência.

## H19(a). As 26.933 seções sozinhas no prédio com aquele modelo

**Elegibilidade (Fato):**
- as exclusões do plano 20, iguais às do doc 21 (17, 4, 137, 8, 320), deixam 497.411 seções;
- **26.933** estão sozinhas no prédio com o modelo, o mesmo número do doc 21;
- dessas, 366 também estão sozinhas na zona × modelo e ficam sem comparação.

**Parte 1-iso: salto da própria seção contra a zona × modelo (Fato quanto à contagem):**
- 26.567 seções testadas, Bonferroni |z| ≥ 4,77;
- τ² = 0 na maioria das UFs, como no doc 21.

| Salto | Seções | Urna trocada | Leitor pior (+0,3 tentativa) | Salto médio (pontos de f) | Falhas a mais (soma de E) |
|---|---:|---:|---:|---:|---:|
| Sobe (Bonferroni) | 9 | 8 | 3 | +55,5 | +1.033 |
| Desce (Bonferroni) | 22 | 9 | 0 | −49,8 | −2.467 |
| S↑ (z ≥ 3 e ≥ 5 pontos) | 45 | 22 | 5 | +21,3 | +2.015 |
| S↓ | 56 | 14 | 0 | −27,8 | −3.436 |

- As quedas são o dobro das subidas, como no doc 21.
- **As 5 maiores subidas** (conferidas no BU bruto dos dois turnos, 0 divergência):

| Seção | Urna | Reconhecidos / falhas, 1º → 2º | Parcela do 13, 1º → 2º | Leitura |
|---|---|---|---|---|
| GO 96539/0110/0116 | mesma, UE2013 | 157/21 → 17/157 | 36,8% → 40,0% | o leitor parou de reconhecer; 152 liberações sem mesário identificado |
| RJ 60011/0188/0082 | trocada no dia, UE2015 → UE2013 | 195/37 → 10/228 | 59,7% → 65,1% | é uma das 8 reservas de escore 0 da H14(c) |
| SE 31054/0001/0265 | reserva → outra reserva | 259/22 → 101/181 | 58,3% → 61,0% | Aracaju (troca registrada em 17/10) |
| RJ 58637/0221/0178 | trocada, UE2015 → UE2013 | 187/21 → 11/188 | 41,5% → 46,3% | também uma das 8 |
| RJ 60011/0009/0262 | trocada, UE2015 → UE2013 | 247/34 → 106/200 | 38,3% → 40,0% | reserva |

**Família A (Fato, 24 testes, |z| ≥ 3,08):** passam **0**, e 0 são compatíveis com H19.

| Unidade | Isoladas | Δa β (z) | Δf β (z) | Δh β (z) | S↑ β (z) | MDE Δf (pontos por 100%) | MDE S↑ (pontos) |
|---|---:|---|---|---|---|---:|---:|
| Brasil | 26.933 | +0,03 (0,15) | +0,67 (1,43) | −0,22 (−0,66) | +0,16 (0,50) | 1,85 | 1,21 |
| Nordeste | 10.983 | +0,27 (1,11) | −0,59 (−0,87) | −0,11 (−0,23) | −0,01 (−0,03) | 2,64 | 1,66 |
| Norte | 3.815 | −0,63 (−1,17) | +4,47 (2,09) | +0,81 (0,50) | +1,58 (1,12) | 8,37 | 5,55 |
| Centro-Oeste | 813 | +0,88 (0,73) | +0,66 (0,22) | −0,10 (−0,04) | −0,25 (−0,45) | 11,89 | 2,23 |
| Sudeste | 5.536 | −0,10 (−0,25) | +1,59 (1,40) | −0,33 (−0,39) | +0,03 (0,04) | 4,43 | 2,73 |
| Sul | 5.786 | +0,05 (0,13) | +0,09 (0,10) | −0,58 (−0,93) | +0,51 (0,73) | 3,56 | 2,74 |

- Placebo, rastro do comparecimento, "sem trocadas" e município × modelo estão em `isoladas.json`. Nenhum muda a leitura.
- O Brasil Δa tem Δcomparecimento com z = −2,47. Isso fica fora da família e tem sentido oposto ao do mecanismo.

**MDE em votos (Estimativa, injeção de voto no lugar de liberação à mão):**

| Unidade | Δf, a favor do 13 | Δf, a favor do 22 | S↑, a favor do 13 | S↑, a favor do 22 |
|---|---:|---:|---:|---:|
| Brasil | 5.456 | 3.767 | 299 | 225 |
| Nordeste | 5.784 | 1.604 | 310 | 100 |
| Norte | 2.671 | 1.563 | 174 | 50 |
| Centro-Oeste | 464 | 777 | 19 | 23 |
| Sudeste | 2.098 | 1.930 | 169 | 169 |
| Sul | 1.929 | 3.587 | 53 | 201 |

**→ Sem sinal nos dados públicos.** No Brasil, o teste das isoladas enxerga a partir de cerca de 5.500 votos a favor do 13 e 3.800 a favor do 22, como liberação à mão.

## H19(b). Liberações sem nenhum dedo lido (Z)

**Conferência (Fato):** as duas contagens independentes, a do parecer 45 e a do doc 21, são iguais em todas as 995.794 seções × turno: Z e F, com 0 diferença.

**No universo (Fato, 497.897 seções por turno):**

| Seções por Z | 1º turno | 2º turno |
|---|---:|---:|
| 0 | 385.062 | 365.930 |
| 1 | 77.407 | 86.558 |
| 2 a 4 | 32.966 | 41.490 |
| 5 a 9 | 2.342 | 3.698 |
| 10 a 19 | 113 | 212 |
| 20 ou mais | 7 | 9 |
| **Total de Z** | **172.318** | **212.171** |
| Parte das Z no 1% de seções com mais Z | 14,6% | 13,5% |
| Autorizadas por mesário registrado / dedo novo / dedo já visto | 116.821 / 20.095 / 35.402 | 151.161 / 21.094 / 39.916 |

- **Por modelo (Fato):** o UE2015 quase não tem Z. Fica em 0,05% das liberações à mão, contra 2,6% a 3,5% nos outros modelos, nos dois turnos. É característica do aparelho, não da mesa.
- **Por região:** o Sul tem 5,4% das liberações sem dedo lido, e o Nordeste 1,1% (2º turno).
- Seções com Z ≥ 10 nos dois turnos: 23.

**Beta-binomial (Fato quanto à contagem):**
- grupos UF × modelo × turno; 995.665 testes com B ≥ 20; Bonferroni p < 5,0 × 10⁻⁸;
- **7 seção × turno (5 seções)** passam, com 151 Z contra 3,6 esperadas;
- BH a 5%: 12.

| Seção | Turno | Z / F | Reconhecidos com tempo esgotado (seção × p90 do grupo) | Quem autorizou as Z |
|---|---|---|---|---|
| SP 62936/0344/0060 | 2º e 1º | 34/56 e 17/28 | 14,6% × 2,1% | mesário 15, dedo novo 4, já visto 15 |
| PE 25739/0013/0087 | 2º | 22/35 | 4,4% × 1,3% | mesário 20 |
| RJ 58653/0072/0374 | 1º e 2º | 17/38 e 18/43 | 9,7% × 2,1% | 2º: já visto 18 |
| SC 81256/0082/0104 | 2º | 31/56 | 18,5% × 2,9% | mesário 11, já visto 19 |
| CE 13757/0013/0523 | 1º | 12/70 | 1,4% × 1,6% | mesário 12 |

- Em 4 das 5, os eleitores **reconhecidos** também tiveram muito mais tempo esgotado que o grupo. É o desenho de leitor que não detecta o dedo, ou de dedo frio ou seco, e não de mesa que pula as tentativas.
- Nenhuma tem as falhas em blocos: o teste de rachas da sequência reconhecido × falha dá z de −2,8 a +0,9, acima do corte de −3.
- Em SP 0060, a seção usou reserva no fim do dia do 2º turno.

**Padrão "liberação sem tentar" (fixado no plano):**
- **11 seções × turno.** São 165 Z, contra 15 esperadas, e 125 delas foram autorizadas por mesário registrado;
- nenhuma é também Bonferroni.

O caso mais forte é **ES 56995/0053/0316, 1º turno**:
- 47 das 54 liberações à mão sem dedo lido;
- 0 dos 63 reconhecidos com tempo esgotado;
- 53 das 54 liberações autorizadas pelo mesmo mesário registrado (M1);
- falhas em blocos das 8 h às 13 h (rachas z = −7,9).

No 2º turno, com a mesma urna, essa seção tem 0 Z. As outras 10 têm 10 a 15 Z, espalhadas no dia (lista em `semdedo-secoes.csv`).

**→ Fato que pede explicação, por seção (lacuna de controle).** São 5 seções da beta-binomial e 11 do padrão. O pedido é a ata e o registro de manutenção, sobretudo de ES 56995/0053/0316 no 1º turno.

**Família Bz (Fato, 12 testes, |z| ≥ 2,87): passa 1, compatível com H19: 0.**

| Unidade | Voto: β (pontos por 100%), z | Placebo z | Comparecimento z | MDE em votos, a favor do 13 / do 22 |
|---|---|---:|---:|---|
| Brasil | −0,82 (−1,06) | −1,46 | −1,27 | 19.597 / 23.644 |
| Nordeste | −2,42 (−1,07) | +0,29 | −0,85 | 14.865 / 5.556 |
| **Norte** | **+12,40 (3,15)** | −1,50 | **+0,67** | 4.641 / 5.089 |
| Centro-Oeste | −0,02 (−0,01) | −2,02 | +0,10 | 5.163 / 10.852 |
| Sudeste | −1,36 (−1,11) | −0,54 | +0,44 | 12.503 / 15.111 |
| Sul | −1,57 (−1,22) | +0,25 | −2,02 | 9.431 / 15.829 |

- **Norte:** passa o corte (q de BH = 0,019), com placebo |z| < 2, mas **sem** o comparecimento a mais (z = 0,67). Pelo critério do plano, **não é compatível com H19**.
- O tamanho é pequeno (exploratório): uma seção que passou de 0 para 9 Z em 240 pedidos teria cerca de +0,46 ponto na parcela do 13, ou 1 voto.
- A soma dos desvios positivos implicados no Norte é de **846 votos**.
- O resultado não depende das seções extremas: sem as 10 e sem as 50 de maior |ΔZ/B|, o z fica em 3,13 e 3,25.
- Vem sobretudo do PA (z = 2,88). Nenhuma outra UF do Norte passa de 1,8.
- O plano não previa este caso (passa sem o rastro do mecanismo). Ver "Desvios".

## H19(c). Falha alta e igual nos dois turnos: linha de base de 2022

**Leitura nova de 2022 (Fato):**
- MG, PR, SC e RS, nos dois turnos: 119.145 seções por turno, 0 erro;
- as liberações à mão e os reconhecidos batem com V1 e V3m + V3s dos docs 24 e 26 em **238.290 de 238.290** seções × turno;
- nenhuma UF saiu;
- a urna de 2022 pede 4 tentativas, como em 2026.

**Ligação 2022 ↔ 2026 (Fato).** Das 124.077 seções de 2026 nas 4 UFs:

| Motivo | Seções |
|---|---:|
| Sem a mesma chave em 2022 | 4.950 |
| Sem diário de 2022 | 1.676 |
| Aptos fora de 0,75 a 1,33 vezes | 3.800 |
| Recebe agregada em 2026 | 1.507 |
| Poucos votos | 118 |
| **Ligadas** | **112.026** |
| Com vizinha no local × modelo de 2026 | 104.197 |

A mesma urna física nos dois anos aparece em 1.979 seções. O número de urna quase sempre muda entre os anos.

**(c1) Persistência (Fato):**

| | Seções | Correlação do nível de falha 2026 × 2022 (contra as vizinhas) | Falha alta nos dois turnos de 2026 | Destas, já alta em 2022 | Esperado por acaso | Alta em 2026 e normal em 2022 |
|---|---:|---:|---:|---:|---:|---:|
| MG | 43.804 | 0,44 | 29 | 2 (6,9%) | 0,38% | 7 |
| PR | 23.571 | 0,42 | 16 | 3 (18,8%) | 0,37% | 9 |
| SC | 13.935 | 0,37 | 12 | 0 | 0,37% | 8 |
| RS | 22.887 | 0,43 | 19 | 4 (21,1%) | 0,43% | 5 |
| **4 UFs** | **104.197** | **0,43** | **76** | **9 (11,8%)** | **0,39%** | **29** |

- A falha alta de uma seção tende a se repetir de uma eleição para outra, 30 vezes mais que o acaso. É o que se espera de eleitorado e local estáveis.
- **(c2) As 20 com maior excesso sobre 2022** foram lidas no diário dos dois anos. Em 18 delas a urna mudou de modelo entre 2022 e 2026.
  - Nas 6 primeiras (PR 79294/0019/0052, RS 85316/0007/0050, RS 87734/0077/0093, SC 81639/0091/0005, PR 79332/0098/0100 e PR 78530/0109/0002), a falha vai de 8% a 20% em 2022 para 62% a 93% em 2026. As falhas vêm em blocos, e o leitor quase não reconhece ninguém. É leitor quebrado.
  - A parcela do 13 varia entre −8,0 e +4,0 pontos de 2022 para 2026, para os dois lados.
  - As 5 primeiras foram conferidas no BU bruto dos dois turnos de 2026, com 0 divergência.

**Família C22 (Fato, 12 testes, |z| ≥ 2,87):**

| Unidade | ΔY: β (pontos por unidade de logit), z | ΔY, mesmo local, z | ΔC: β, z | MDE em votos no 2º turno, a favor do 13 / do 22 |
|---|---|---:|---|---|
| MG | +0,005 (0,16) | 0,24 | **−0,123 (−3,64)** | 9.768 / 9.080 |
| PR | −0,053 (−1,09) | −0,97 | −0,035 (−0,69) | 5.014 / 8.329 |
| SC | +0,036 (0,63) | 0,86 | +0,009 (0,15) | 3.793 / 9.279 |
| RS | +0,027 (0,56) | 0,33 | **−0,166 (−3,61)** | 5.920 / 8.684 |
| Sul | −0,003 (−0,11) | −0,05 | **−0,085 (−2,88)** | 8.527 / 14.864 |
| 4 UFs | +0,004 (0,18) | 0,29 | **−0,095 (−4,24)** | 12.542 / 16.876 |

- **Voto:** nenhum dos 6 testes passa.
- **Comparecimento:** 4 passam, todos com sinal **negativo**. Onde a falha subiu mais que em 2022, o comparecimento de 2026 subiu menos. Isso vale também com o mesmo local (z de −2,8 a −4,3).
- Voto posto no lugar de ausente faria o contrário. O que se vê é compatível com fila e desistência quando o leitor falha, sem mudança no voto.
- Compatível com H19 pelo critério do plano: 0.

**→ Sem sinal nos dados públicos nas 4 UFs.**
- O teste enxerga a partir de cerca de 12.500 votos a favor do 13 e 16.900 a favor do 22 no 2º turno, inseridos como liberação à mão.
- O rastro que um voto inserido deixaria aparece com o sinal oposto.
- **Nas outras 23 UFs e no exterior, a falha igual nos dois turnos não está coberta.** O dado que falta é público: os diários de urna de 2022 dessas UFs (arquivos transmitidos para totalização). Não foram baixados por decisão do coordenador.

## Efeito máximo e o vencedor do 2º turno

Diferença oficial (`voto_oficial`, conferida pelo script): 13 = 64.256.232, 22 = 59.826.041, **diferença 4.430.191**.
- Voto inserido para o 13: cada um muda a diferença em 1.
- Voto desviado do 22 para o 13: cada um muda em 2 (o limiar é 2.215.095).

### H14

| Conta | Votos | Muda a diferença em | Diferença que sobra | Muda o vencedor? |
|---|---:|---:|---:|---|
| **Contagem (Fato):** todos os votos do 13 nas 5.714 seções com reserva no 2º turno, como se fossem desviados do 22 | 742.671 | 1.485.342 | 2.944.849 | não |
| Idem, como se fossem votos inseridos | 742.671 | 742.671 | 3.687.520 | não |
| **Estatístico (Estimativa):** limite do IC95 a favor do 13, trocas novas | +193 | — | — | não |
| Idem, herdadas no nível do 2º turno | +734 | — | — | não |
| MDE da simulação, pior caso entre as formas e concentrações | cerca de 2.900 | — | — | não |

**→ H14 não pode ter mudado o vencedor (Fato de contagem).** Nem todos os votos do 13 nas seções com reserva, somados, chegariam lá.

### H19

| Conta | Votos | Passa de 4.430.191 (inserido)? | Passa de 2.215.095 (desviado)? |
|---|---:|---|---|
| **Contagem (Fato):** liberações à mão no 2º turno | 8.632.471 | sim | sim |
| Liberações sem mesário identificado | 2.791.363 | não | sim |
| Liberações sem nenhum dedo lido | 212.171 | não | não |
| Liberações sem dedo lido nas seções marcadas (beta-binomial e padrão "sem tentar") | 316 | não | não |
| **Estatístico (Estimativa), MDE, a favor do 13 / do 22:** | | | |
| Variação da falha, seções com vizinha no prédio (doc 21) | 24.803 / 21.750 | não | não |
| Seções isoladas, zona × modelo | 5.456 / 3.767 | não | não |
| Liberação sem dedo lido | 19.597 / 23.644 | não | não |
| Falha igual nos dois turnos, contra 2022 (só MG, PR, SC e RS) | 12.542 / 16.876 | não | não |

- A liberação à mão não escolhe o voto: o eleitor escolhe na cabine. O mecanismo da H19 é **voto inserido** no lugar de ausente, e cada um muda a diferença em 1. O desvio só entra na liberação sem mesário identificado se ela fosse usada para votar pelo eleitor presente, o que o log não registra.
- **Resposta:** pela contagem bruta, só o total de liberações à mão (8,6 milhões) passa da diferença. Para mudar o vencedor, mais da metade de todas as liberações à mão do país teria de ser voto inserido para o 13.
- Nas formas que os testes enxergam, o limite fica em algumas dezenas de milhares de votos:
  - variação entre os turnos;
  - seções isoladas;
  - liberação sem dedo lido;
  - falha igual nos dois turnos nas 4 UFs com 2022.
- Isso também exige comparecimento a mais. Esse rastro não aparece; nas 4 UFs, aparece com o sinal oposto.
- **O que não está excluído:** voto inserido em massa por liberação à mão, igual nos dois turnos, espalhado de forma parecida em todas as seções de cada prédio, nas 23 UFs sem diário de 2022. Esse caso só a linha de base de 2022 dessas UFs (dado público) ou a conferência física dos cadernos de votação decidiriam.

---

## Exploratório (depois de ver os resultados)

- **Norte, família Bz:** tamanho, UFs e retirada das seções extremas. Está na seção H19(b) e em `exploratorio.json`.
- **H14(c), escore 0 contra os mesários registrados:** 8 de 14 × 0 de 149, e o par de modelos. Está na seção H14(c).
- **Taxa sem digital da reserva por par de modelos** em todas as contingências do dia (`exploratorio.json`, `paresDeModelo`):
  - UE2013 → UE2013: 19,9% na reserva contra 34,5% na original, que falhou;
  - UE2015 → UE2013: 18,3% contra 16,3%;
  - UE2020 → UE2020: 12,1% contra 11,6%.
  - A reserva não piora a biometria, em média.

## Desvios do plano

1. **H14(b), abertura:** o plano media D a partir das 08:00 no relógio da urna. Desde 2022 o horário é o de Brasília, e a urna grava a hora local. Usei 8 h de Brasília convertida (AC −2 h; AM, RO, RR, MT e MS −1 h; o oeste do AM fica com −1 h). Sem isso, as seções do AC teriam 2 h a menos de D.
2. **H14(b), seções sem vizinha no local:** o plano dizia que elas entrariam "com efeito fixo de zona". Implementei como duas especificações: a principal, com efeito fixo de local (as seções sem vizinha saem); e a robustez, com efeito fixo de zona e todas as seções. As duas dão a mesma leitura.
3. **H14(c), escore do eleitor:** o diário de 2026 não grava escore nas tentativas do eleitor. Ficaram, nas regras L1 e L2, a fração de capturas (≥ 80%) e quem autorizou. O L3 virou "captura ≥ 80% e nenhuma das regras anteriores". A distribuição nacional de escores não foi medida.
   - A medida "toda comparação com os mesários deu escore 0" foi criada depois de ler o primeiro caso, RJ 60011/0188/0082. Por isso é **exploratória**.
4. **H14(c), regra de decisão:** o plano não previa "maioria L2 sem diferença de G2 no corte". Apliquei o caso geral: não decidível.
5. **H19(b), Norte:** o plano não previa um teste que passa sem o rastro do comparecimento. Pelo critério do plano, ele não é compatível com H19. Classifiquei a H19(b) como "sem sinal no voto, com um teste que passa sem o rastro do mecanismo", e o tamanho (cerca de 1 voto por seção) vai como exploratório.
6. **H19(c), injeção:** a fração φ de E⁺ foi dividida em partes iguais entre os dois turnos de 2026. O MDE em votos é o do 2º turno (φ × ΣE⁺ ÷ 2).
7. **H14(a), peso fixo:** na forma F3 (voto inserido), o peso de cada seção, que é o denominador, fica o original. A diferença é desprezível para δ pequeno e um pouco conservadora para ρ = 1%.
8. **H14(a), poder por modelo:** usei Bonferroni de 12 (a família de modelos do doc 07). No doc 07, o MDE por modelo tinha sido calculado a 5% sem correção.
9. **H14(a), calibração:**
   - o excesso de cauda binomial não ficou calibrado (17% a 19% contra 5%). Segui a regra do plano e passei ao corte empírico;
   - as curvas sem calibração continuam no JSON, marcadas;
   - por UF, a calibração falha nas UFs com poucas trocas, e o corte empírico não pode ser estimado com 500 réplicas a α = 0,18%. Ficam marcadas como otimistas.
10. **H14(a), indicadores de modelo por UF:** em BA, CE e PR, um indicador de modelo ficou quase colinear com o efeito fixo de zona, e o erro explodia. O motor passou a tirar a coluna pelo complemento de Schur, como faz a regressão do doc 07. A simulação por UF e a das trocas foram rodadas de novo depois disso. A validação do motor continua exata.
11. **Recursos:** por cerca de 3 horas rodaram 3 processos Node ao mesmo tempo (as duas leituras de 2022 e uma análise), e não 2. Isso não muda nenhum número.
12. **H19(c), placebo:** o plano já dizia que não há placebo limpo; não houve.

## Testes feitos

| Bloco | Testes | Natureza |
|---|---:|---|
| H14(a), simulação | 164.000 réplicas nas trocas, 11.000 na robustez UE2013/UE2015, 164.000 nas herdadas e 232.000 por UF e modelo. Cada réplica refaz os testes do doc 07 e do parecer 30 | Poder (não são testes sobre os dados reais) |
| H14(b), família B | 4 | Confirmatório |
| H14(b), robustez e 2º turno | 6 especificações (19 coeficientes) + 2 | Exploratório |
| H14(c), família C | 2 | Confirmatório |
| H14(c), escore 0 | 1 | Exploratório |
| H19(a), Parte 1-iso | 26.567 | Detecção (Bonferroni, BH) |
| H19(a), família A | 24 | Confirmatório |
| H19(a), placebo, rastro, sem trocadas, município × modelo | 4 × 24 | Exploratório |
| H19(b), beta-binomial | 995.665 | Detecção (Bonferroni, BH) |
| H19(b), família Bz | 12 | Confirmatório |
| H19(b), placebos | 6 | Fora da família |
| H19(b), Norte | 10 especificações | Exploratório |
| H19(c), família C22 | 12 | Confirmatório |
| H19(c), mesmo local | 12 | Robustez |

## Conferências rodadas

- **Reprodução de números anteriores:**
  - doc 07: −0,047 (IC −0,122 a +0,027), −0,026 e +0,030, iguais;
  - parecer 30, herdadas no 2º turno: −0,064 (IC −0,23 a +0,10), contra −0,06 (−0,21 a +0,09) no parecer. O parecer põe também as outras classes na amostra; aqui entram só controle e herdadas;
  - 26.933 isoladas e exclusões do doc 21, iguais;
  - 14 e 152 do parecer 30, iguais;
  - 172.318 e 212.171 liberações sem dedo lido, iguais.
- **Motor esparso da simulação × regressão completa** no mesmo conjunto: diferença de 10⁻¹⁶ em β e no erro, nos 3 desfechos, para a DiD e para o nível.
- **Contagens independentes:**
  - Z e F do parecer 45 × doc 21: 995.794 de 995.794 iguais;
  - 2022 nova × vias dos docs 24 e 26: 238.290 de 238.290 iguais.
- **Diário × BU (1º turno das reservas):** 3.029 de 3.033 seções com os mesmos votos.
- **Margem:** recalculada de `voto_oficial` pelo script de escala.
- **BU bruto** (`node src/exportar.js … --log nao --stdout`, pelo `estatistico-h14-h19-final-conferir.mjs`), sempre com 0 divergência em tipo e número da urna, aptos, comparecimento e votos 13 e 22:
  - 10 seções da H14(b);
  - 14 da H14(c);
  - 5 × 2 turnos da H19(a);
  - 9 seção × turno da H19(b);
  - 5 × 2 turnos da H19(c).

## Comandos e arquivos

```bash
node --max-old-space-size=6144 scripts/auditoria/estatistico-h14-h19-final-2022-captura.mjs --uf mg --turno 1   # e 2; pr, sc, rs (~25–50 min cada)
node --max-old-space-size=4096 scripts/auditoria/estatistico-h14-h19-final-diario1t.mjs --turno 1                # e --turno 2 (~2 min)
node --max-old-space-size=8192 scripts/auditoria/estatistico-h14-h19-final-reservas1t.mjs
node --max-old-space-size=8192 scripts/auditoria/estatistico-h14-h19-final-semdigital.mjs
node --max-old-space-size=12000 scripts/auditoria/estatistico-h14-h19-final-isoladas.mjs                        # ~2 min
node --max-old-space-size=12000 scripts/auditoria/estatistico-h14-h19-final-semdedo.mjs                         # ~2 min
node --max-old-space-size=12000 scripts/auditoria/estatistico-h14-h19-final-2022.mjs
node --max-old-space-size=8192 scripts/auditoria/estatistico-h14-h19-final-poder.mjs --reps 1000 --parte trocas # e herdadas, uf
node scripts/auditoria/estatistico-h14-h19-final-casos.mjs --lista <ids> [--anos 2026,2022] --saida <nome>
node scripts/auditoria/estatistico-h14-h19-final-conferir.mjs --lista <t:id,...> --saida <nome>
node --max-old-space-size=8192 scripts/auditoria/estatistico-h14-h19-final-exploratorio.mjs
node scripts/auditoria/estatistico-h14-h19-final-escala.mjs
```

- O código comum está em `scripts/auditoria/estatistico-h14-h19-final-lib.mjs`. Ele contém o contador do ciclo do eleitor, a MQP com um efeito fixo e erro CR1, a beta-binomial e o gerador com semente.
- As saídas ficam em `data/parsed/auditoria/estatistico/h14-h19-final/`:
  - `poder/`, `captura2022/`, `diario-reservas-<t>t.jsonl`;
  - `reservas1t.json`, `semdigital.json`;
  - `isoladas.json`, `isoladas-saltos.csv`;
  - `semdedo.json`, `semdedo-secoes.csv`;
  - `linha2022.json`, `linha2022-topo.csv`;
  - `casos-*.json`, `conferencia-*.json`, `exploratorio.json`, `escala.json`;
  - `logs/`.
- Nenhum título nem CPF foi gravado. Os mesários aparecem como M1, M2… por seção.

## Riscos que ficam

- **Nenhum desenho separa** sabotagem do leitor de desgaste, nem falha escolhida de mesa que desiste, nem diz quem pôs o dedo. O princípio 8 manda tratar isso como lacuna de controle. Os pedidos de ata e manutenção (TSE e TREs) continuam sendo o único caminho.
- **Programa adulterado e assinado** com a chave oficial passa em todos os testes de rastro (parecer 30).
- **H19(c)** cobre 4 UFs: 124.077 das 497.897 seções do 2º turno estão nelas, e 112.026 foram ligadas a 2022. As outras 23 dependem de baixar os diários de 2022.
  - A ligação entre os anos usa a chave da seção. Renumeração e mudança do cadastro mudam quem vota em parte das seções.
  - A queda de comparecimento onde a falha subiu é associação ecológica: idade e local podem explicar parte dela.
- **H14(a):** o poder vale para o ruído das seções de controle. As seções com troca têm cauda um pouco maior no comparecimento (doc 07).
  - Sorteando só urnas UE2013 e UE2015, o MDE da DiD em F1 vai de 857 para 650 votos: fica menor, e não maior.
  - **Por UF, o teste é anticonservador** nas UFs com poucas trocas: a rejeição nula vai de 0,4% a 7,0%, contra 0,18% nominal (AC, AP, RR e TO passam de 3%). Com 500 réplicas não dá para estimar um corte empírico a 0,18%. Nessas UFs, o MDE da tabela é otimista.
  - As formas F1 a F4 não esgotam tudo o que alguém poderia fazer. Por exemplo, um desvio que acompanha o perfil da seção, ou só em seções de um tipo de local, não foi simulado.
- **H19(b), Norte:** a associação passa no corte confirmatório. É pequena e sem rastro de comparecimento, mas não foi explicada. Fica como Hipótese de baixo peso, com o PA como foco.
- **H14(c):** o escore 0 em 8 reservas é exploratório e precisa de revisão adversarial antes de qualquer uso.
- **Não revisado:** este doc ainda não passou por revisão cética.
