# 31. H14 e H19: plano final, só com dados públicos (registrado antes de rodar)

Estatístico eleitoral, **02/11/2026**. O dono decidiu não esperar o TSE: cada hipótese precisa de uma conclusão final. Este plano foi escrito **antes** de qualquer conta nova. O registro vale pelo commit deste arquivo, feito antes da etapa 2. Os cortes, os modelos e as regras de decisão não mudam depois de ver os dados. O que entrar depois fica marcado como **exploratório** no resultado ([32](32-h14-h19-resultado-final.md)).

Rótulos: **Fato** (contagem ou teste declarado sobre o universo completo, com script do repo), **Estimativa** (sai de modelo), **Hipótese**, **Pendente**.

## Ponto de partida (já medido, não se repete)

**H14** (doc [07](07-urnas-reserva-1t-2t.md), parecer cético [30](../cetico-revisor/30-h14-urnas-reserva.md)):
- 5.714 seções votaram com reserva no 2º turno: 2.818 trocas novas, 2.893 herdadas do 1º turno e 3 com a própria urna recarregada.
- Trocas novas × controle da zona (diferença-em-diferenças, ou DiD): parcela do 13 −0,047 p.p. (IC95 −0,121 a +0,027), comparecimento −0,026, brancos + nulos +0,030. Nada passa.
- Poder analítico: 0,122 p.p. na parcela do 13 (866 votos). Vale para desvio uniforme e diferente entre os turnos. Para desvio igual nos dois turnos, o teste de nível do parecer 30 enxerga cerca de 0,22 p.p. (cerca de 1.500 votos).
- Herdadas: comparecimento 0,75 p.p. abaixo das vizinhas do local no 1º turno e igual no 2º. A causa é Pendente.
- Reservas quase sem digital: 14 de 2.590 reservas H14 contra 152 de 489.983 seções com a mesma urna (critério do parecer 30). Os votos não se mexem. O mecanismo é Pendente.
- Escala: os 742.671 votos do 13 nas 5.714 seções não mudam o vencedor, nem no pior caso.

**H19** (docs [20](20-h19-plano.md) e [21](21-h19-resultado.md), parecer cético [45](../cetico-revisor/45-h19-falha-induzida.md)):
- A falha ficou estável entre os turnos (7,07% → 7,16%).
- A variação da falha não prevê o voto em nenhuma das 33 unidades (99 testes).
- O sinal do Sudeste (S↑) some quando o salto é medido contra a própria seção.
- 26.933 seções ficaram fora dos testes por serem as únicas do prédio com aquele modelo de urna.
- Liberações sem nenhum dedo lido: 172.318 (1º turno) e 212.171 (2º turno), contadas seção a seção por dois contadores que concordam em todas as 497.897 seções. A análise delas ainda não foi feita.
- O desenho mede só a **mudança** entre os turnos.

## Margem de referência

- No 2º turno de Presidente, o 13 teve 64.256.232 votos e o 22 teve 59.826.041. A diferença é de **4.430.191**.
- Um voto **inserido** para o 13 (no lugar de um ausente) muda a diferença em 1.
- Um voto **desviado** do 22 para o 13 muda a diferença em 2.
- Para mudar o vencedor, seria preciso: mais de 4.430.191 votos inseridos, ou mais de 2.215.095 votos desviados, ou uma combinação equivalente.

---

## H14. Urnas reserva

### H14(a). Tamanho mínimo de desvio que o teste enxerga: poder por simulação

**Pergunta.** Com os dados reais, qual é o menor desvio nas seções com reserva que os testes já feitos detectariam com 80% de chance? A pergunta vale para desvios de formas diferentes, não só para o desvio uniforme do cálculo analítico do doc 07.

**Método: placebo com injeção.** É o desenho de Bertrand, Duflo e Mullainathan (2004).
- O ruído vem dos dados reais. Nada é inventado: só o efeito é injetado.
- Em cada réplica:
  1. Sorteio, entre as **491.843 seções de controle**, um conjunto placebo do mesmo tamanho do grupo tratado, estratificado como a permutação do doc 07 (zona × modelo da urna do 1º turno, com a mesma contagem por estrato).
  2. Injeto o desvio nos votos do placebo.
  3. Refaço o teste original e anoto se ele rejeita.
- As seções realmente trocadas ficam **fora** da amostra das simulações, para não somar o efeito delas ao injetado.
- Os 32 estratos sem controle sorteiam na mesma zona, em qualquer modelo. Esse número é declarado.

**Testes refeitos em cada réplica.** São idênticos aos originais.

| Grupo tratado | Teste | Regra de rejeição (fixada agora) |
|---|---|---|
| 2.818 trocas novas | DiD do doc 07: MQP com peso, efeito fixo de zona, modelo do 1º turno, log dos aptos, erro agrupado por zona (CR1) | qualquer um dos 3 desfechos com p < 0,05/3 (Bonferroni do confirmatório) |
| 2.818 trocas novas | Seções extremas do doc 07: resíduo da zona, escala pelo MAD (desvio absoluto mediano) do controle por decil de tamanho, p empírico | pelo menos 1 seção placebo passa o Bonferroni de 21.999 testes |
| 2.818 trocas novas | Excesso de cauda: número de placebo com \|z\| > 3 contra o esperado pelo controle (binomial unilateral) | p < 0,05/3 |
| 2.893 herdadas | Nível contra as vizinhas do mesmo local, nos dois turnos (parecer 30): efeito fixo de local, log dos aptos, peso, erro agrupado por zona | 2º turno, qualquer desfecho com p < 0,05/3 |

**Formas de desvio injetadas.**

| Forma | O que se injeta | Desfechos que mudam |
|---|---|---|
| F1. Desvio de votos para o 13 | em cada seção atingida, X ~ Binomial(v22, π) votos passam do 22 para o 13, com π escolhido para que a parcela do 13 suba δ em média | parcela do 13 |
| F2. Desvio para o 22 | o espelho de F1 | parcela do 13 |
| F3. Voto inserido para o 13 | M ~ Poisson(λ) abstenções viram voto no 13, limitado à abstenção da seção; λ escolhido para que a parcela suba δ | comparecimento e parcela |
| F4. Troca por branco ou nulo | votos do 22 viram nulos | brancos + nulos e parcela |

- **Concentração:** a fração ρ das seções tratadas recebe o desvio, com ρ ∈ {100%, 20%, 5%, 1%}. Com ρ < 100%, o desvio por seção é δ/ρ, limitado ao que a seção comporta. Assim o total de votos fica o mesmo para cada δ.
- **Turnos:**
  - nas trocas novas, o desvio entra só no 2º turno;
  - nas herdadas, entra igual nos dois turnos. É o caso que a DiD não vê.
- **Grade de δ** (média sobre as seções tratadas, em p.p. da parcela do 13): 0; 0,02; 0,05; 0,08; 0,10; 0,12; 0,15; 0,20; 0,30; 0,50; 1,0.
- **Réplicas:** 1.000 por ponto da grade. A semente é fixa: 20261102. O erro de Monte Carlo do poder de 80% fica em ±1,3 ponto.
- **Calibração (obrigatória antes de ler o poder):** com δ = 0, a taxa de rejeição deve ficar perto do α nominal (entre 0,5 e 2 vezes o α). Se não ficar, relato isso e uso o α empírico das réplicas nulas como corte.

**Medidas relatadas.**
- Curva de poder por forma × concentração × teste.
- **MDE (efeito mínimo detectável):** o menor δ com poder ≥ 80%, achado por interpolação linear na grade. Vem em p.p. e em votos: δ × Σ(13 + 22) das seções tratadas, e para F3 também em eleitores inseridos.
- O **detector combinado:** rejeita se qualquer um dos testes da tabela rejeitar. Ele é o que a auditoria tem de fato.
- Por modelo de urna (4) e por UF (28): MDE só para F1, ρ = 100%, no Bonferroni das famílias do doc 07 (q de BH não entra na simulação). São 500 réplicas por ponto.

**Conferência antes de simular:** o estimador sem injeção, nos dados reais, precisa reproduzir o doc 07 (−0,047; −0,026; +0,030) e o parecer 30 (herdadas no 2º turno: −0,06). Se não reproduzir, paro e relato.

### H14(b). Por que as herdadas tiveram menos comparecimento no 1º turno

**Pergunta.** O déficit de 0,75 p.p. no 1º turno vem da falha da urna no dia 04/10 (interrupção, fila)? Ou aparece também onde a reserva já estava instalada antes do dia?

**Universo.** Todas as seções cujo BU do 1º turno é de urna reserva, pela tabela `secoes.csv` do doc 07 (`tipo1 = reservaSecao`). São **3.033** seções:
- 2.893 herdadas;
- 44 que voltaram para urna de seção no 2º turno;
- 37 reserva → outra reserva;
- 36 e 10 com contingência no 2º turno;
- 13 com a mesma urna recarregada.

Isto é uma contagem de universo, não um resultado.

**Leitura nova:** o diário do pacote do **1º turno** de cada uma das 3.033 seções. Entram o `logd.dat` da reserva e os `.jez` aninhados da urna original, até 3 níveis, e só as linhas da seção declarada. O caminho é o pacote extraído em `data/raw/1t/urnas/<uf>/<mun>/<zona>/<secao>/`, achado pelo caminho da seção (sem varrer `data/raw`).

**Medidas por seção (1º turno, dia 04/10/2026):**
- **classe da troca:**
  - C1: contingência no dia, com votos na original antes da falha;
  - C2: contingência no dia, antes do 1º voto;
  - C3: reserva instalada antes de 04/10 (a original não tem atividade no dia);
  - C4: sem registro de contingência legível.
  O critério é o mesmo do doc 07: atividade da urna original no relógio do dia. A data da contingência no log da reserva, que é o critério do engenheiro, fica como robustez. As divergências são contadas.
- hora da falha (último voto ou última linha da original) e hora do 1º voto da reserva;
- **D, minutos perdidos:** o maior intervalo sem voto computado entre 08:00 e o último voto do dia, na união das urnas da seção. Também conta à parte o intervalo da troca: último voto da original → 1º voto da reserva (C1) ou 08:00 → 1º voto da reserva (C2);
- votos na original e na reserva;
- votos por hora antes e depois da troca;
- hora do último voto do dia;
- taxa de falha da digital e tentativas por reconhecido na reserva. Isso mede uma reserva mais lenta sem interrupção.

**Desfecho.** Comparecimento do 1º turno sobre os aptos, em nível, contra as seções sem reserva do **mesmo local de votação**. O modelo é o do parecer 30: MQP com peso pelos aptos, efeito fixo de local, log dos aptos e erro agrupado por zona. As seções sem vizinha no local entram com efeito fixo de zona, e o número delas é declarado.

**Testes (família B, 4 testes, Bonferroni α = 0,05/4, |z| ≥ 2,50):**
1. β(C1): déficit de comparecimento nas contingências com votos;
2. β(C2): déficit nas contingências antes do 1º voto;
3. β(C3): déficit nas reservas instaladas antes do dia;
4. inclinação do déficit em D (p.p. por hora perdida), dentro de C1 + C2.

**Regra de decisão (fixada agora):**
- **Explicado pela falha no dia (Fato)** exige as três condições:
  - (i) a inclinação em D é negativa e passa no corte;
  - (ii) β(C3) não passa no corte e |β(C3)| < 0,375 p.p., metade do déficit total;
  - (iii) o déficit previsto pelas classes C1 e C2 soma pelo menos 50% do déficit total em eleitores.
- **Fato que pede explicação:** β(C3) negativo passa no corte. Seria um déficit sem falha no dia.
- **Não decidível com dados públicos:** qualquer outro caso. O dado que falta é a ata da mesa de 04/10 (hora da interrupção e fila).

**Comparação (exploratória):** o mesmo modelo para as contingências do **2º turno** (doc 07: sem déficit). Serve para medir se a assimetria entre os turnos acompanha D. A hipótese a examinar é que o 1º turno tinha mais cargos e voto mais demorado.

**Conferência:** as 5 seções de maior D e as 5 de maior déficit são conferidas no BU bruto do 1º turno antes de serem citadas:
`node src/exportar.js --turno 1 --uf .. --municipio .. --zona .. --secao .. --log nao --stdout`.

### H14(c). Reservas que liberaram quase todos sem digital: o que o diário mostra do leitor

**Pergunta.** Nessas reservas, o leitor não lia dedo nenhum? Lia, mas não casava a digital do eleitor? Ou lia e casava normalmente, e a mesa liberou?

**Universo.** O critério do parecer 30, igual para os dois lados, recalculado do zero no script:
- ≥ 50 votos na reserva e no 1º turno, fora do exterior;
- mais de 50% sem digital na reserva;
- menos de 50% no 1º turno.

São três grupos:
- **G1:** reservas H14 (o parecer achou 14 de 2.590);
- **G2:** seções com a mesma urna de seção nos dois turnos (152 de 489.983);
- **G3 (exploratório):** herdadas, pelo mesmo critério.

As 7 do engenheiro entram todas, marcadas. Se a recontagem não der 14 e 152, relato a diferença antes de seguir.

**Leitura:** o diário bruto do dia da votação de cada seção. No caso de contingência no dia, a urna original e a reserva são lidas separadas. Não grava título nem CPF: os mesários viram M1, M2… por seção.

**Medidas por urna (só para os eleitores a quem a urna pediu a digital):**
- **tentativas:** capturas (`Capturada a digital`) e tempos esgotados (`Timeout de reconhecimento do dedo`);
- **escores:** o escore de batimento (`Batimento de digitais retornou o score #` e os 4 escores de `Digital capturada não corresponde…`). Relato a mediana, a fração de escore 0 e a fração acima do escore mediano dos reconhecidos no país;
- **autorização:** mesário registrado, dedo novo, dedo já visto;
- **registro de mesários:** `Registrando mesários antes/durante/após a votação` e `Mesário # registrado`;
- **erros do leitor:** `Falha na captura da digital` e `ERROR opening the biometric reader`;
- **horário:** reconhecidos e falhas por hora, e o teste de sequências (rachas) para falhas em blocos;
- **antes e depois da troca:** nas contingências no dia, a fração de reconhecidos na original e na reserva com os mesmos eleitores da seção.

**Classificação (regras fixadas agora, aplicadas a cada urna na ordem abaixo):**

| Classe | Regra | Leitura |
|---|---|---|
| L0. Leitor que não lê | ≥ 80% das tentativas dos eleitores terminam em tempo esgotado, ou há erro de abertura ou captura do leitor | Defeito do leitor |
| L1. Lê, mas não casa ninguém | ≥ 80% das tentativas são capturas, a mediana do escore dos eleitores é 0 (ou ≥ 90% com escore 0), e o dedo de quem autoriza também é "novo" em ≥ 80% das vezes | Casamento de digitais quebrado (leitor ou programa) |
| L2. Lê o dedo da mesa, não casa o eleitor | como L1 nos eleitores, mas o dedo de quem autoriza é reconhecido (mesário registrado ou dedo já visto) em ≥ 50% das liberações | O leitor funciona. Falta ou está errada a **base de digitais dos eleitores** na urna. É um fato técnico da carga |
| L3. Lê e casa com escores normais | capturas com escore distribuído como no país, eleitores reconhecidos às vezes, falhas espalhadas | A contagem não separa leitor fraco de mesa que desiste ou libera (princípio 8) |
| L4. Outra | nenhuma das regras acima | Descrita caso a caso |

**Testes (família C, 2 testes, Bonferroni α = 0,025):** teste exato de Fisher para G1 × G2 na fração de L2 e na fração de L0 + L1.

**Regra de decisão para H14(c):**
- **Fato que pede explicação:** a maioria de G1 é L2 e a fração de L2 em G1 passa no teste contra G2. Seria uma reserva sem a base biométrica dos eleitores da seção. Isso é uma explicação técnica que não envolve voto, mas que o TSE precisa explicar.
- **Explicado como defeito do leitor (Fato):** a maioria de G1 é L0 ou L1.
- **Não decidível com dados públicos:** a maioria é L3. O dado que falta é a ata da mesa e o registro de manutenção do leitor da reserva.
- Em todos os casos, os votos dessas seções já foram testados (parecer 30: −2 votos, |z| ≤ 1,6). Este item não refaz o teste de votos.

**Conferência:** toda seção citada é conferida no BU bruto do dia (`--log nao`) e, para o horário, no diário (`--log dia`), sem gravar título.

---

## H19. Falha de digital provocada

### H19(a). As 26.933 seções que são as únicas do prédio com aquele modelo de urna

**Problema.** Sem vizinha do mesmo prédio e modelo, o desenho do doc 21 não as testa.

**Comparação alternativa (fixada agora):** **g' = zona × modelo da urna do 2º turno**, com todas as outras seções da zona com o mesmo modelo, inclusive as não isoladas. A razão: a falha depende do modelo (UE2013 e UE2015 falham quase o dobro), e as isoladas são sobretudo locais pequenos de uma seção, que na zona ficam ao lado de outros locais pequenos. A robustez usa **município × modelo**.

**Exclusões:** as do plano 20, menos a regra "sozinha no grupo", que vira "sozinha na zona × modelo". As seções nessa situação são contadas e ficam declaradas como não testáveis.

**Parte 1-iso (detecção).** O salto da **própria** seção é medido contra a variação de g', como recomendou o parecer 45:
- J' = [logit(f₂) − logit(f₁)]ₛ − [logit(f₂) − logit(f₁)] de g' sem a seção, com +0,5 em cada casela;
- a variância é binomial;
- o τ² de sobredispersão vem do MAD de J' por UF, como no plano 20;
- o z é robusto pela mediana.

Os testes vão um por seção isolada elegível, bicaudais, com Bonferroni sobre o número testado e BH ao lado. Relato as subidas e as quedas, a urna trocada, o leitor pior e as falhas a mais (E). As 5 maiores subidas são conferidas no BU bruto dos dois turnos.

**Parte 2-iso (confirmatória).**
- **M1-iso:** ΔY ~ Δa + Δf + Δh + controles do M1 do plano 20. Os controles são:
  - perfil;
  - urna trocada;
  - f₁ e a₁;
  - Δ(ano de nascimento ÷ votos).
- A amostra é a de todas as seções elegíveis, isoladas ou não, com efeito fixo de g'. As três inclinações são estimadas **separadas** para isoladas e não isoladas. Testo só as inclinações das isoladas.
- Peso: 13 + 22 do 2º turno. Erro agrupado por município, porque as isoladas são quase sempre um local por seção.
- **M2-iso:** ΔY ~ S↑' + S↓' + controles. S↑' = 1 se o z de J' ≥ 3 **e** Δf da seção − Δf de g' ≥ +0,05. Só S↑' das isoladas entra na família.
- **Unidades:** Brasil e 5 regiões. As UFs isoladas não têm poder: a média é de cerca de 1.000 seções por UF. Elas entram só como exploratório.

**Família A: 3 × 6 + 6 = 24 testes.** Bonferroni bicaudal α = 0,05/24, ou seja, |z| ≥ 3,08. BH ao lado.

**Placebo (fora da família):** M1-iso e M2-iso com Y do 1º turno (nível) como desfecho.

**Rastro do mecanismo (fixado agora, consequência do parecer 45):** o mesmo modelo com Δcomparecimento ÷ aptos como desfecho. Voto posto no lugar de ausente sobe o comparecimento.

**Critério "compatível com H19"** (conjunção; faltando uma, o resultado é inconclusivo):
1. um coeficiente passa no corte de 3,08;
2. o placebo da mesma unidade tem |z| < 2 ou sinal oposto;
3. o sinal sobrevive sem as urnas trocadas (mesmo sinal, |z| ≥ 2);
4. o Δcomparecimento vai no mesmo sentido com |z| ≥ 2.

**MDE:** β_MDE = (3,08 + 0,84) × erro. Em votos, pela injeção do plano 20: uma fração φ das falhas a mais (E⁺) vira voto no candidato, lançada como liberação manual. Daí sai φ_MDE e o número de votos, a favor do 13 e a favor do 22.

**Sensibilidade (exploratória):** o mesmo desenho (salto próprio contra zona × modelo) em **todas** as seções. É o desenho que o parecer 45 recomendou para o país inteiro.

### H19(b). Liberações sem nenhum dedo lido, seção a seção

**Dados (já contados, não se relê o diário):** `estatistico/h19/captura/<t>t/<uf>.jsonl` (`cap[0]`, autorização) e `cetico/45/captura/<uf>.jsonl` (`F0cap` por autorização e `bioTmo`, os reconhecidos com algum tempo esgotado). Os dois contadores concordam em todas as 497.897 seções. O script confere essa concordância de novo antes de seguir.

**Medidas por seção e turno:**
- Z = liberações à mão sem nenhum dedo lido;
- B = pedidos de digital;
- F = liberações à mão;
- quem autorizou as Z;
- T_R = reconhecidos com algum tempo esgotado ÷ reconhecidos. É a linha de base do próprio leitor: dedo frio, seco ou leitor que não detecta.

**Contagem no universo (Fato):**
- a distribuição de Z por seção (0, 1, 2–4, 5–9, 10–19, 20 ou mais), por turno;
- a mesma distribuição por UF, por modelo e por região;
- a concentração: a fração das Z nas 1% de seções com mais Z;
- quantas seções têm Z ≥ 10 nos dois turnos.

**Modelo de referência:** beta-binomial por seção, Z ~ BB(B; μ_g, ρ_g), com g = UF × modelo da urna × turno.
- μ e ρ vêm pelo método dos momentos robusto: a mediana das taxas e o MAD para a sobredispersão.
- O teste é a cauda superior por seção: P(Z ≥ z | B, μ, ρ).
- A beta-binomial é usada no lugar da binomial porque a taxa varia de verdade entre seções (leitor, clima, eleitorado). A binomial marcaria milhares de seções só por isso.
- **Bonferroni** sobre o número de seções com B ≥ 20, somado nos dois turnos. BH ao lado.

**Padrão "liberação sem tentar" (fixado agora):** numa seção e turno, vale quando há as três condições:
- Z ≥ 10;
- Z ≥ 50% de F;
- T_R ≤ o percentil 90 de T_R em g.

Ou seja: os eleitores reconhecidos quase não tiveram tempo esgotado, mas as liberações à mão foram quase todas sem dedo lido. É o rastro de mesa que pula as tentativas sem o eleitor pôr o dedo. Leitor ruim ou dedo frio fariam o tempo esgotado aparecer também nos reconhecidos.

Relato a contagem dessas seções, quem autorizou e o horário. As 20 de menor p beta-binomial e todas as do padrão (até 40) são lidas no diário bruto. Lá vejo se as Z vêm em blocos, de um mesmo autorizador (M1, M2… ou dedo já visto) e em que horário.

**Testes de voto (família Bz, 12 testes, |z| ≥ 2,87):**
- M3: ΔY ~ Δ(Z ÷ B) + controles do M1, com efeito fixo de local × modelo, peso 13 + 22 e erro agrupado por local;
- o mesmo modelo com Δcomparecimento ÷ aptos como desfecho;
- unidades: Brasil e 5 regiões;
- total: 6 unidades × 2 desfechos.
- Placebo (fora da família): Y do 1º turno.

**MDE:** pela injeção, com voto inserido como liberação sem dedo lido. Relato em votos.

**Regra de decisão para H19(b):**
- **Fato que pede explicação (por seção):** cada seção no padrão "liberação sem tentar" ou que passa no Bonferroni da beta-binomial. Isso vale **mesmo sem efeito no voto**, por ser uma lacuna de controle. A lista vai para a conferência de campo.
- **Sinal compatível com H19:** um teste da família Bz passa, com placebo |z| < 2 e Δcomparecimento no mesmo sentido.
- **Sem sinal no voto:** nada passa. Nesse caso relato o MDE.

### H19(c). O que o teste não vê: falha alta e igual nos dois turnos. Linha de base de 2022

**Ideia.** Uma falha provocada igual nos dois turnos de 2026 some na diferença entre os turnos. Mas ela deveria aparecer como falha **acima da de 2022** na mesma seção, contra as vizinhas, e vir com voto diferente do de 2022.

**Onde:** MG, PR, SC e RS, as únicas UFs com diário de 2022 baixado (`data/raw/2022/<t>t/zip/`, 8 zips, SHA-512 conferido nos docs 24 e 26). As outras 23 UFs e o exterior ficam declarados como não cobertos.

**Leitura nova de 2022 (universo das 4 UFs, dois turnos).** A contagem por seção é a mesma do `estatistico-h19-captura.mjs`:
- dedos lidos por liberação (0 a 4);
- tempo esgotado entre os reconhecidos;
- quem autorizou;
- o número de tentativas configurado.

O texto das mensagens de 2022 é traduzido pela tabela `TRADUCAO` do `estatistico-h13-v2-diario2022.mjs`, que já está documentada. A leitura do zip usa as mesmas funções (`textos7z`, `juntarCopias` com a união das cópias).

**Conferências obrigatórias:**
- as liberações à mão por seção devem bater com V3m + V3s do `secoes-<uf>-2022-diario.csv` já gravado (docs 24 e 26);
- os reconhecidos devem bater com V1;
- as divergências são contadas;
- se passarem de 0,5% das seções de uma UF, essa UF sai e o motivo fica declarado.

**Ligação 2022 ↔ 2026.**
- A chave é a mesma: UF/município/zona/seção.
- Filtros de qualidade:
  - os aptos de 2026 entre 0,75 e 1,33 vezes os de 2022;
  - em 2026 nenhuma das duas é seção agregada nova.
- A robustez exige o mesmo código de local nos dois anos.
- Conto as ligadas, as perdidas e o motivo.
- Marco se a urna física (número interno) é a mesma em 2022 e 2026.

**Medidas:**
- f₂₂ e f₂₆, as taxas de falha somando os dois turnos de cada ano;
- Z/B em cada ano;
- **excesso persistente:** E_s = [logit f₂₆ − logit f₂₆ de g] − [logit f₂₂ − logit f₂₂ de g], com g = local × modelo de 2026 e as somas das vizinhas excluindo a seção. A variância é binomial, e o τ² vem do MAD por UF.
- **Voto:** ΔY = parcela do 13 no 2º turno de 2026 − parcela do 13 no 2º turno de 2022, sobre 13 + 22. Os dois números são os mesmos partidos. ΔC = comparecimento do 2º turno de 2026 − o de 2022.

**Contagens (Fato):**
- (c1) **Persistência:** a correlação de logit f₂₆ com logit f₂₂ dentro de local × modelo, e a fração das seções com falha alta nos dois turnos de 2026 que já tinham falha alta em 2022. "Falha alta" quer dizer z de nível contra a vizinhança ≥ 3. Relato a mesma fração esperada sob independência.
- (c2) **Seções novas no topo:** quantas seções têm falha alta nos dois turnos de 2026 **e** falha normal em 2022 (z₂₂ < 1). Elas são lidas no diário dos dois anos (as 20 de maior E_s).

**Testes de voto (família C22, 12 testes, |z| ≥ 2,87):**
- ΔY ~ E_s + controles, e ΔC ~ E_s + controles.
- Os controles são: perfil de 2026, mudança de modelo de urna entre 2022 e 2026, mesma urna física, log dos aptos e f₂₂.
- Efeito fixo de local × modelo de 2026, peso 13 + 22 de 2026, erro agrupado por local.
- Unidades: MG, PR, SC, RS, Sul (PR + SC + RS) e as 4 juntas. São 6 unidades × 2 desfechos.
- Não há placebo limpo: o 1º turno de 2026 recebe a mesma falha. O controle f₂₂ faz esse papel em parte. Esse limite fica declarado.

**Critério "compatível com H19 igual nos dois turnos":**
- E_s passa no corte para ΔY;
- ΔC vai no mesmo sentido com |z| ≥ 2;
- o sinal fica igual com o filtro do mesmo local.

**MDE:** pela injeção, com uma fração φ de E⁺ convertida em voto inserido no 13 (e no 22) nos dois turnos de 2026. Vem em votos, por unidade.

**Exploratório (Brasil inteiro, sem linha de base):** nível de f de 2026 (dois turnos somados) contra o nível de Y do 2º turno, dentro de local × modelo, com perfil. A idade explica falha e voto ao mesmo tempo, e não há placebo. Por isso este teste **não** decide nada. Ele só aponta onde olhar.

**Regra de decisão para H19(c):**
- **Sem sinal nas 4 UFs:** nada passa. Relato o MDE.
- **Fato que pede explicação:** passa com ΔC no mesmo sentido.
- **Não coberto nas outras 23 UFs:** o dado que falta é público e não foi baixado. São os diários de 2022 das outras UFs (arquivos transmitidos para totalização, 2022). Não é dado do TSE a pedir: é coleta a fazer.

---

## Efeito máximo e o vencedor do 2º turno

Para cada hipótese, a conta é feita duas vezes.

1. **Limite por contagem (Fato):** o maior número de votos que o mecanismo poderia ter tocado, contado no universo.
   - **H14:** os votos do 13 e do 22 nas 5.714 seções com reserva no 2º turno. O pior caso é o desvio total (cada voto conta 2) e o voto inserido (cada voto conta 1).
   - **H19:** contagens do 2º turno:
     - liberações à mão (F);
     - liberações sem mesário identificado;
     - liberações sem nenhum dedo lido (Z);
     - Z nas seções do padrão "liberação sem tentar".
     Para cada uma, a pergunta é se ela passa de 4.430.191 (voto inserido).
2. **Limite estatístico (Estimativa):** o extremo do IC95 a favor do 13, em votos, e o MDE de cada teste, convertidos em mudança na diferença.
   - Para o desvio igual nos dois turnos sem linha de base (23 UFs na H19), não há limite estatístico. Vale só o de contagem.

**Regra:** "o efeito máximo **pode** mudar o vencedor" só quando um mecanismo, no tamanho que os testes **não** excluem, passa de 4.430.191 em voto inserido ou de 2.215.095 em voto desviado. Se o único limite que passa é o de contagem bruta (por exemplo, todas as liberações à mão do país), o resultado diz isso com as palavras certas: a contagem não exclui, e os testes excluem até X.

## Forma da conclusão final (fixada agora)

Para cada item, (a), (b) e (c), e depois para cada hipótese, uma das quatro formas:

| Forma | Quando |
|---|---|
| **Refutada** | A premissa observável da hipótese é contrariada por um **fato** de contagem, não só por um teste nulo. Exemplos: o evento não aconteceu, ou o mecanismo previsto deixaria um rastro obrigatório que tem sinal oposto e passa no corte |
| **Sem sinal nos dados públicos, com o tamanho mínimo que o teste enxerga** | Os testes declarados não passam, e o MDE de (a) e dos testes de voto está calculado. Vai junto o limite do que o teste não vê |
| **Fato que pede explicação** | Um item cumpre a regra de "fato que pede explicação" do próprio item. Pode ser técnico, sem efeito no voto |
| **Não decidível com dados públicos** | Nenhuma das anteriores. Digo exatamente qual dado falta e quem o tem |

**Na hipótese inteira:**
- vale a forma do teste de **voto**, que é o que a hipótese afirma;
- os fatos técnicos de (b) e (c) vêm listados ao lado, com a forma de cada um;
- a parte "de propósito" da H19 e "programa adulterado e assinado" da H14 ficam declaradas como **não decidíveis com dados públicos**, com o dado que falta:
  - **H19:** ata da mesa, manutenção do leitor e identidade de quem autorizou;
  - **H14:** a medição independente do programa da urna, que nenhum arquivo público traz.

## Número de testes (declarado agora)

| Família | Testes | Corte | Natureza |
|---|---|---|---|
| H14(a) | nenhum teste novo sobre os dados reais. A simulação refaz os testes do doc 07 e do parecer 30 com os mesmos cortes | — | Poder |
| H14(b) B | 4 | Bonferroni, \|z\| ≥ 2,50 | Confirmatório |
| H14(c) C | 2 | Fisher, p < 0,025 | Confirmatório |
| H19(a) A | 24 | Bonferroni, \|z\| ≥ 3,08 | Confirmatório |
| H19(a) Parte 1-iso | 1 por isolada elegível | Bonferroni sobre o número testado | Detecção |
| H19(b) beta-binomial | 1 por seção × turno com B ≥ 20 | Bonferroni sobre o total | Detecção |
| H19(b) Bz | 12 | Bonferroni, \|z\| ≥ 2,87 | Confirmatório |
| H19(c) C22 | 12 | Bonferroni, \|z\| ≥ 2,87 | Confirmatório |

- Cada família tem sua própria correção.
- O resultado declara o total de testes feitos, inclusive placebos e sensibilidades.
- BH a 5% é relatado ao lado só como gerador de hipótese.

## Arquivos que vou ler

**Banco e tabelas já gravadas:**
- cópia de leitura do banco (`data/db/leitura/atual.json` → `eleicao2026-20261029T105000.sqlite`), por `abrirLeitura()`: BU, `voto_oficial`, seção, local e modelo;
- `data/parsed/auditoria/reservas-1t2t/secoes.csv` e `dados.json` (doc 07);
- `data/parsed/auditoria/reservas-rastro/secoes-rastro.jsonl`, `biometria-por-urna.json` e `grupos.jsonl` (engenheiro, doc 06);
- `data/parsed/auditoria/cetico-revisor/h14-votos.json` e `h14-bio-outra-zona.json` (parecer 30, só para conferir);
- `data/parsed/auditoria/estatistico/h19/medidas.csv.gz`, `testes.csv` e `resultado.json` (doc 21);
- `data/parsed/auditoria/estatistico/h19/captura/<t>t/<uf>.jsonl` (adendo do doc 21);
- `data/parsed/auditoria/cetico/45/captura/<uf>.jsonl` (parecer 45);
- `data/parsed/auditoria/estatistico-eleitoral/leitor/<uf>.jsonl` (doc 08);
- `data/parsed/auditoria/estatistico/h08/<t>t/*.secoes.jsonl` (doc 17);
- perfil do eleitorado: `forense/perfil/<uf>.csv` e `estatistico/h13-v2/perfil-idade.csv`;
- `data/parsed/auditoria/estatistico/h13-v2/secoes-2022.csv` e `secoes-<uf>-2022-diario.csv` (docs 24 e 26);
- `data/parsed/auditoria/estatistico/h13-comp/secoes-2022.csv` (doc 25: local e modelo de 2022).

**Diários brutos (leitura nova, pelo caminho da seção, sem varrer `data/raw`):**
- `data/raw/1t/urnas/<uf>/<mun>/<zona>/<secao>/`: as 3.033 seções com reserva no 1º turno (H14b);
- `data/raw/2t/urnas/...` e `data/raw/1t/urnas/...`: as seções de G1, G2 e G3 (H14c) e as seções listadas na H19(a), (b) e (c);
- `data/raw/2022/<t>t/zip/bu_imgbu_logjez_rdv_vscmr_2022_<t>t_<UF>.zip`: MG, PR, SC e RS, 1º e 2º turno (H19c).

Não leio `data/private/` nem a base de CPFs. Os zips de 2026, que estão em L:, não são necessários: tudo sai dos pacotes extraídos no F:.

## Scripts e saídas (etapa 2)

| Script | O que faz |
|---|---|
| `estatistico-h14-h19-final-lib.mjs` | Funções comuns: MQP com efeito fixo pela transformação interna e erro CR1, beta-binomial, Bonferroni/BH, injeção |
| `estatistico-h14-h19-final-poder.mjs` | H14(a) |
| `estatistico-h14-h19-final-diario1t.mjs` | H14(b), leitura dos diários do 1º turno das 3.033 |
| `estatistico-h14-h19-final-reservas1t.mjs` | H14(b), testes |
| `estatistico-h14-h19-final-semdigital.mjs` | H14(c) |
| `estatistico-h14-h19-final-isoladas.mjs` | H19(a) |
| `estatistico-h14-h19-final-semdedo.mjs` | H19(b) |
| `estatistico-h14-h19-final-2022-captura.mjs` | H19(c), leitura de 2022 |
| `estatistico-h14-h19-final-2022.mjs` | H19(c), testes |
| `estatistico-h14-h19-final-escala.mjs` | Efeito máximo × diferença de 4.430.191 |

- As saídas ficam em `data/parsed/auditoria/estatistico/h14-h19-final/`.
- O resultado vai no doc 32.
- Os docs 27 a 30 e os scripts de outras frentes não são tocados.

**Recursos e regras:**
- no máximo 2 processos Node pesados ao mesmo tempo;
- sem rede;
- nenhum CPF nem número de título gravado: mesários viram M1, M2… e números com 8 dígitos ou mais viram `#`;
- toda seção citada no doc 32 é conferida antes no BU bruto, com `node src/exportar.js --turno <1|2> --uf .. --municipio .. --zona .. --secao .. --log nao --stdout`.
- Em 2022, a conferência é feita pelo `.bu` lido por `estatistico-h13-v2-bu2022.mjs`.

## Riscos declarados agora

- **Placebo com injeção:** o poder vale para o ruído das seções de controle. Se as seções com reserva forem mais ruidosas (o doc 07 viu cauda um pouco maior no comparecimento), o poder real é um pouco menor. Relato também a curva com o sorteio restrito às seções de controle com urna UE2013 e UE2015, que são as mais trocadas.
- **H14(b):** o relógio da urna pode estar errado. O doc 07 tratou isso como risco pequeno, e o parecer 30 viu relógio errado mais vezes nas reservas. As seções com retrocesso de relógio no dia são contadas e testadas também fora da amostra.
- **H19(a):** a zona é uma vizinhança mais larga que o prédio. O perfil diferente das isoladas (rurais) entra como controle, mas não fecha. Isso fica declarado.
- **H19(c):** a renumeração de seções, a revisão do cadastro e a troca de urna entre 2022 e 2026 mudam quem vota em cada seção. O filtro de aptos e a marca de mesma urna física reduzem esse risco, mas não o eliminam. As 4 UFs não representam o Brasil.
- **Nenhum desenho aqui separa** sabotagem de desgaste, nem falha escolhida de mesa que desiste rápido. Também não vê programa adulterado e assinado. Isso fica dito na conclusão, com o dado que falta.
