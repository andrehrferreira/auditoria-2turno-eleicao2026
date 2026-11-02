# 58. Parecer cético: fechamento da H14 (urnas reserva) e da H19 (falha de digital provocada)

Revisor cético, **02/11/2026**. Material revisado:
- plano [31](../estatistico-eleitoral/31-h14-h19-plano-final.md) (commit 067d1a7);
- resultado [32](../estatistico-eleitoral/32-h14-h19-resultado-final.md) (commit c50f361);
- scripts `estatistico-h14-h19-final-*.mjs` e as saídas em `data/parsed/auditoria/estatistico/h14-h19-final/`.

A base anterior são os pareceres [30](30-h14-urnas-reserva.md) e [45](45-h19-falha-induzida.md). Também conferi o defeito de denominador do parecer [54](54-h13-fechamento.md).

Rótulos: **Fato** (conta no universo ou conferência no arquivo bruto, com script), **Estimativa** (sai de modelo ou simulação) e **Hipótese**.

## Vereditos

| Item | Conclusão do doc 32 | Veredito | Motivo em uma linha |
|---|---|---|---|
| H14(a), tamanho mínimo | trocas novas: 0,10 ponto, 857 votos; herdadas: 0,19 ponto, 1.487 votos | **Sustentado com ressalvas** | Os votos das trocas reproduzem (868), mas os pontos estão subestimados em cerca de 20%: o certo é 0,12. Nas herdadas, o placebo tem viés de +0,05 a favor do 13, e o número simétrico é de cerca de 2.000 votos |
| H14(a), corte empírico da cauda | desvio aplicado pela regra do plano | **Sustentado** | Estava previsto no plano e não muda nenhuma decisão |
| H14(b), déficit do 1º turno | explicado pela interrupção do dia | **Sustentado com ressalvas** | Reproduz exatamente. A "C3" mistura 107 trocas feitas durante a votação, e a inclinação em D é em parte mecânica. A dose pelo intervalo da troca é monótona e segura a conclusão |
| H14(c), reservas quase sem digital | não decidível | **Sustentado.** O exploratório do escore 0 fica mais forte | No bruto de 2 das 8, o comparador funciona (escores de 3 a 218) e dá **exatamente 0** só contra os mesários registrados na urna original. É desenho técnico, não de pessoa |
| **H14, conclusão** | sem sinal nos dados públicos | **Sustentado com ressalvas** (as correções do item a) | Os números corrigidos continuam milhares de vezes abaixo da diferença |
| H19(a), 0 de 24 | sem sinal | **Sustentado** | Reprodução exata. O defeito do perfil não muda nada (maior \|z\| 1,79) |
| H19(b), Norte z 3,15 | passa sem o rastro de comparecimento, logo não é compatível | **Sustentado.** O descarte é justo e tem poder | Se fosse voto inserido, o comparecimento teria coeficiente de cerca de 23,8. O observado é 2,5, com IC de −4,9 a +9,9 (z −5,6 contra a inserção). A troca de voto sem comparecimento a mais também não deixa o rastro que deveria ("já votou") |
| H19(b), ES 56995/0053/0316 (1º turno) | fato que pede explicação | **Sustentado e reforçado** | No bruto: 47 liberações com 4 tempos esgotados cada. Nos mesmos minutos, o leitor leu o dedo do mesário 47 vezes. Não é leitor parado |
| **H19, conclusão** | sem sinal nos dados públicos | **Sustentado com ressalvas** | Os fatos por seção ficam ao lado. A cobertura de 2022 é parcial e a parte "de propósito" não é decidível |

---

## 1. Reprodução com código próprio

Os scripts são meus e não importam `estatistico-h14-h19-final-lib.mjs` nem `estatistico-h19-lib.mjs`. A regressão (MQP com um efeito fixo e erro CR1), o sorteio, a injeção, o salto J' e a contagem estão em `cetico-58-lib.mjs` e nos scripts de cada item. As entradas são as tabelas de universo já gravadas: `reservas-1t2t/secoes.csv`, `h19/medidas.csv.gz`, `cetico/45/captura/` (o meu contador do parecer 45) e o diário do 1º turno lido pelo autor. O diário entra só para a classe e o D de cada seção.

### 1.1 H14(a): um ponto da grade (trocas novas, desvio do 22 para o 13, ρ = 100%)

`cetico-58-poder.mjs`, 400 réplicas por ponto, estratificação zona × modelo do 1º turno, corte |z| ≥ 2,394.

| | Aproximação normal arredondada (a do autor) | Binomial exata (inversão) |
|---|---:|---:|
| δ nominal 0,10: poder | **0,81** (autor: 0,816) | 0,65 |
| δ nominal 0,10: desvio realmente injetado | **0,122 ponto**, 864 votos | 0,100 ponto, 709 votos |
| δ 0,123: poder | 0,95 | **0,805**, 868 votos |
| Nulo: rejeição / média de β / erro médio | 1,75% / −0,0004 / 0,0382 | igual |

- **O que reproduz (Estimativa):** o MDE em **votos** das trocas novas. O autor dá 857; a minha simulação exata dá 868 (0,123 ponto).
- **Defeito (Fato do código):**
  - Para n ≥ 50, o sorteio binomial do autor usa round(np + √(np(1−p))·N), cortado em 0 (`binomial` da lib).
  - Com np ≈ 0,3 voto por seção, o arredondamento injeta em média cerca de 22% a mais que o pedido.
  - Por isso o δ "0,10" da grade é, de fato, 0,12. Os **pontos** da tabela do doc 32 estão subestimados nas linhas de δ pequeno. Os **votos** saem certos, porque o autor conta os votos realmente movidos.
- O MDE correto em pontos, 0,12, é o mesmo do cálculo analítico do doc 07 (0,122). O erro do placebo (0,0382) é igual ao do teste real (0,0381). Aqui a simulação não traz informação nova.
- **"Fica menor, e não maior" (risco no doc 32) está errado:**
  - Na robustez UE2013/UE2015, o MDE vai de 0,098 para 0,142 ponto. Em pontos, ele **piora**.
  - Os "650 votos" foram contados nas seções placebo de urna velha, que são menores.
  - Na base das trocas reais (708.479 votos 13 + 22), 0,142 ponto dá cerca de 1.006 votos, mais que 857.

### 1.2 H14(a): herdadas

| Medida | Valor |
|---|---:|
| Erro do teste real (parecer 30) | 0,0839 |
| Erro médio do placebo | 0,0853 |
| Média de β no **nulo** do placebo | **+0,049** (dp 0,075; 200 réplicas) |
| Poder com binomial exata, δ 0,188 / 0,200 / 0,272 | 0,72 / 0,78 / 0,96 |
| MDE analítico simétrico, (2,394 + 0,842) × 0,084 | **0,27 ponto, cerca de 1.976 votos** (base 727.744) |

- O placebo das herdadas não é centrado. Ele é sorteado por zona × modelo, e o teste de nível não controla o modelo. Com isso, sai +0,05 ponto a favor do 13 sem desvio nenhum.
- Por isso a forma F1 (para o 13) parece mais fácil de ver (0,188), e a F2 mais difícil (0,296).
- O número honesto, sem a ajuda do viés, é de cerca de **2.000 votos** nos dois sentidos. Em vez de "1.490 do 22 para o 13 e 2.230 no sentido contrário", o certo é "cerca de 1.500 a 2.200, conforme o sentido; 2.000 sem o viés do placebo".
- Isso não muda nenhuma decisão. Todos os números ficam milhares de vezes abaixo de 2.215.095 votos desviados.

### 1.3 H14(b): déficit −1,03 e inclinação −1,50 por hora

`cetico-58-h14b.mjs`: 472.722 seções, 72.317 locais, 6.174 zonas.

| Coeficiente | Doc 32 | Meu (graus de liberdade como o autor) | Meu (efeito fixo aninhado na zona) |
|---|---|---|---|
| C1 | −1,03 (z −9,51) | **−1,034 (−9,51)** | (−10,33) |
| C2 | −0,48 (−2,25) | −0,477 (−2,25) | (−2,45) |
| C3 | +0,02 (0,07) | +0,022 (0,07) | (0,08) |
| D (pontos por hora) | −1,50 (−6,55) | **−1,498 (−6,55)** | (−7,12) |
| Déficit em eleitores | 7.747 | **7.747** (C1 −7.022, C2 −799, C3 +31) | |

Reprodução exata. O autor usa N − K − G no ajuste do erro, que é mais conservador. Com o ajuste aninhado, os z sobem um pouco, C2 continua abaixo de 2,50 e nada muda de lado.

### 1.4 H19(a): 0 de 24

`cetico-58-h19.mjs`:
- elegíveis 497.411; isoladas 26.933; isoladas sozinhas na zona × modelo 366;
- Parte 1: 26.567 testadas, corte 4,77; sobem 9, descem 22, S↑ 45, S↓ 56;
- as 5 maiores subidas são as mesmas do doc 32 (GO 96539/0110/0116, z 12,1, …);
- família A: **0 de 24**, maior |z| = **2,09** (Norte, Δf).

Tudo igual ao doc 32.

### 1.5 H19(b): Norte z 3,15

| Unidade | Voto z | Comparecimento z | Placebo z |
|---|---:|---:|---:|
| Brasil | −1,06 | −1,27 | −1,46 |
| Nordeste | −1,07 | −0,85 | 0,29 |
| **Norte** | **3,15** (β 12,40) | 0,67 | −1,50 |
| Centro-Oeste | −0,01 | 0,10 | −2,02 |
| Sudeste | −1,11 | 0,44 | −0,54 |
| Sul | −1,22 | −2,02 | 0,25 |

Reprodução exata dos 18 números do doc 32.

## 2. O corte empírico da cauda: estava previsto?

**Sim.** O plano 31 diz: "com δ = 0, a taxa de rejeição deve ficar perto do α nominal (entre 0,5 e 2 vezes o α). Se não ficar, relato isso e uso o α empírico das réplicas nulas como corte."
- A implementação é o quantil 95% do maior z de cauda entre os 3 desfechos nas réplicas nulas.
- Isso equivale ao α de família de 5% que o plano pedia (0,05/3 por desfecho). Não é desvio.
- O doc 32 lista a troca entre os desvios só por transparência.

**Muda alguma decisão? Não.**
- A cauda só entra no detector combinado. O MDE da conclusão é o da diferença-em-diferenças.
- O teste real de cauda do doc 07 (39 seções contra 28 esperadas no comparecimento, z ≈ 2,1) não passava no Bonferroni binomial (p 0,11) e também não passa no corte empírico (2,81).

**Ressalva.** O "combinado calibrado" do doc 32 tem rejeição nula de 11,8% a 14,6%. Os MDEs dele, por exemplo 474 votos com ρ = 1%, valem a cerca de 13% de falso alarme, e não a 5%. Eles não entram na conclusão, mas a tabela não avisa isso na linha. Recomendação: marcar essa linha como "a 13% de falso alarme" ou tirá-la.

## 3. O sinal do Norte e a regra que o descarta

### 3.1 O descarte tem poder, não é só "não passou"

- Se o ganho do 13 viesse de voto inserido (k votos onde Z/B subiu), a parcela subiria 100·k·(1 − Y₂)/n e o comparecimento 100·k/aptos.
- No Norte, a razão média ponderada n/(aptos·(1 − Y₂)) é **1,92**.
- Logo o coeficiente esperado no comparecimento seria 12,40 × 1,92 ≈ **23,8**.
- O observado é **2,5**, com IC95 de −4,9 a +9,9. A inserção como causa da associação fica rejeitada com z = −5,6 (Estimativa).
- A regra do plano descarta o Norte com justiça. O teste do rastro tinha poder de sobra para ver o comparecimento que a inserção exigiria.

### 3.2 Outras leituras de fraude sem comparecimento a mais

| Leitura | O que ela exige | Testado? | Resultado |
|---|---|---|---|
| Voto em nome de eleitor que depois aparece (troca, não inserção) | O eleitor verdadeiro chega e a urna diz `O eleitor identificado já votou`. Isso sobe onde Z/B sobe | **Sim** (desfecho: Δ"já votou" por 100 votos, perfil_log do banco) | Norte β −1,30 (z −0,88); Brasil −0,43 (z −1,68). Sem sinal, e o sentido é o oposto |
| Mesário vota no lugar do eleitor presente | O voto é digitado na cabine pelo eleitor; a liberação não escolhe candidato | Não testável no log | Isso é coação, não falha da urna. O princípio 8 manda tratar como risco, mas nada no log liga isso a Z |
| Programa que troca votos, ligado ou não à falha | Programa adulterado e assinado | Não testável com dados públicos | Fica não decidível, como o doc 32 já declara |

### 3.3 A associação continua sem explicação (Hipótese de baixo peso)

- Ela vem do PA: z 2,88; sem o PA, o Norte cai para z 1,52. AC, AM, AP, RO, RR e TO ficam entre −0,4 e 1,7.
- Ela resiste:
  - sem as 294 seções do Norte com perfil quebrado: z 3,19;
  - sem as 1.373 que recebem agregada: 3,38;
  - sem as urnas trocadas: 3,19.
- Sem os controles de perfil, ela cai para 2,59.
- **Tamanho:** ΔZ/B no Norte vai de −0,008 (p1) a +0,010 (p99). Os votos implicados positivos somam **cerca de 900**. O autor dá 846; a diferença vem da soma.
- **Leitura:** a associação passa no corte, mas sem nenhum dos dois rastros que uma fraude por liberação deixaria (comparecimento ou "já votou"). Concordo com o doc 32: fica como Hipótese de baixo peso, com o PA como foco. Não é compatível com a H19.

## 4. Conferência no arquivo bruto

`cetico-58-bruto.mjs` lê pelo `src/exportar.js`, com as ACs carregadas, e usa um contador de ciclo próprio. Mesários viram M1, M2…; nenhum título foi gravado.

### 4.1 ES 56995/0053/0316, 1º turno (Fato)

| Medida | Bruto (meu contador) | Doc 32 |
|---|---|---|
| BU: comparecimento / biometria / biografia / sem biometria | 259 / 63 / 54 / 142; aptos 326; 13 = 128, 22 = 101; lacres 25/25 | — |
| Liberações à mão / sem dedo lido (Z) | 54 / **47** (as 47 com 4 tempos esgotados) | 54 / 47 |
| Reconhecidos com tempo esgotado | **0 de 63** | 0 de 63 |
| Quem autorizou as Z | **M1 em 47 de 47** (M1 em 53 de 54 liberações) | 53 de 54 |
| Horário das Z | 08h 5, 09h 8, 10h 10, 11h 10, 12h 11, 13h 3, depois 0 | 8 h às 13 h |
| Rachas (Z × outros votos com digital) | z −9,3 | −7,9 (outra sequência; os dois em blocos) |

O bruto também mostra o que o doc 32 não disse:
- **Não é leitor parado.**
  - Em cada uma das 47 liberações, o leitor leu o dedo do mesário: `Biometria do mesário … encontrada em eleitores`, 53 vezes.
  - Os 4 mesários foram registrados com leitura de dedo às 07:41–07:43.
  - O mesmo aparelho, no mesmo período, leu o dedo de quem autorizou, mas não detectou nenhum dedo de eleitor em 188 tentativas.
- O ciclo Z leva em mediana **84 s** até a liberação à mão, o que dá 4 tempos esgotados inteiros. A liberação à mão com dedo capturado leva 37 s.
- A urna foi desligada pela chave às 08:17 e religada às 08:18. Das 08:23 às 12:39 não houve nenhum reconhecimento. O primeiro veio às 12:39:43, sem reinício, erro de leitor ou registro no log que explique a volta.
- **Voto (Fato):**
  - 1º turno: comparecimento 79,4% contra 76,6% das 15 vizinhas do local (faixa de 70,6% a 82,7%); parcela do 13 55,9% contra 57,2%.
  - 2º turno, com a mesma urna e 0 Z: 80,4% contra 79,3%; parcela 59,3% contra 59,1%.
  - Nada fora da faixa do local.
- **Veredito:** fato que pede explicação, como lacuna de controle e sem efeito visível no voto. **Sustentado e reforçado:**
  - o desenho de "leitor que não lê" fica excluído para esse período;
  - sobra "eleitor que não pôs o dedo" ou "dedo não detectado só nos eleitores";
  - pelo princípio 8, a ata da mesa não fecha isso; só o registro técnico do leitor e a auditoria do caderno fecham.

**Ressalva de método (exploratória).** A regra "liberação sem tentar" usa T_R do dia inteiro. Um leitor que parasse por algumas horas sem nenhum reconhecido nesse período também passaria nela. Neste caso a leitura do dedo do mesário resolve; nas outras 10 seções do padrão, eu não conferi.

### 4.2 Duas das 8 reservas de "escore 0" (Fato)

| Seção, 2º turno | Original (1º turno) → reserva | BU 2º turno | Liberações à mão no log da reserva | Comparações com mesário registrado | Escores contra dedos gravados no dia pela própria reserva |
|---|---|---|---|---|---|
| RJ 60011/0188/0082 | UE2015 (n.º 1774197) → UE2013 (1667962), contingência às 09:41 | 269 votos; 10 bio, 228 biografia; 13 = 170, 22 = 91 | 228: dedo novo 12, dedo já visto 216, mesário 0 | **912, todas com escore 0** | 3 a 124 (casa: 20 a 124) |
| BA 37150/0078/0158 | UE2015 (1766785) → UE2013 (1657116), contingência às 10:05 | 198 votos; 73 bio, 121 biografia; 13 = 158, 22 = 33 | 111: novo 10, já visto 101 | **444, todas com escore 0** | 3 a 218 (casa: 20 a 218) |
| *Mesmas seções no 1º turno, urna original* | — | — | RJ 37 (M1 17, M2 15); BA 17 | RJ 69 (escore 0 em 5); BA 77 (0 em 2) | — |
| *ES 56995/0053/0316, 2º turno (urna comum)* | — | — | 18 | 27 (0 em 0; 3 a 10) | — |

- No RJ, os mesários foram registrados na original. A tentativa de registrar de novo às 17:00 deu `Mesário … já registrado` 4 vezes.
- **O que isso muda no exploratório do doc 32:**
  - Numa urna comum, comparar o dedo de quem autoriza com outro mesário dá escore baixo, mas **não zero**: 3 a 16, com zero em cerca de 3% a 7%.
  - Na reserva, o comparador funciona contra o que ela mesma gravou no dia: escores de 3 a 218, casando a partir de 20.
  - Contra os moldes registrados na urna original, ele dá **sempre exatamente 0**: 1.356 de 1.356 nas duas seções.
  - Uma pessoa não registrada pondo o dedo daria escores baixos e positivos, não zero em sequência.
- **Leitura (Hipótese):** os moldes de mesário vindos da original UE2015 não são comparáveis na reserva UE2013. As causas possíveis são formato, mídia ou leitor.
  - A segunda leitura do doc 32 ("nenhum mesário registrado pôs o dedo em centenas de autorizações") **perde força**.
  - Ela não cai de todo: o log não diz quem pôs o dedo.
- A falha também atinge os eleitores: no RJ, só 7 reconhecidos em 235 ciclos com dedo capturado. O mecanismo não está explicado, porque só 9 das 314 trocas UE2015 → UE2013 passam de 50% sem digital (doc 32). Fica não decidível. O dado que falta é o registro técnico da contingência e do leitor dessas reservas.
- Conferi só 2 das 8 no bruto. O "8 de 14 × 0 de 149" (p 2,9 × 10⁻¹⁰, que reproduzo) continua exploratório: a medida foi criada depois de ver o primeiro caso.

## 5. O defeito de denominador do parecer 54 atinge esta frente?

**Não muda nenhuma decisão (Fato, com script).**

| Onde | Usa o perfil? | Teste |
|---|---|---|
| H14(a), (b), (c) | Não. Aptos e comparecimento vêm do BU | — |
| H19(a), exposição | Não. Δa, Δf e Δh vêm do diário | O perfil entra só nos controles |
| H19(a), seções com perfil abaixo da metade dos aptos | 3.891 elegíveis (1.081 isoladas) | Sem elas: 0 de 24, maior \|z\| 1,79 |
| H19(b), Bz | Só nos controles | Sem as seções de perfil quebrado: Brasil −1,06; Nordeste −1,15; Norte 3,19; Centro-Oeste −0,12; Sudeste −1,03; Sul −1,25 |
| H19(c), 2022 | Controles do perfil de 2026 | O autor já tira as 1.507 que recebem agregada em 2026, que são a causa do defeito (parecer 54, adendo) |

## 6. H14(b): o que testei além da reprodução

| Teste | Resultado | Leitura |
|---|---|---|
| **A C3 é mesmo "reserva instalada antes do dia"?** | Das 399, 182 têm contingência registrada em 04/10 na urna do BU. **107 delas depois da abertura** (troca durante a votação, sem linhas da original no pacote) e 75 antes | O rótulo do doc 32 está errado para 107 seções |
| C3 dividida | sem contingência no dia (217): **+0,34** (z 0,76, IC −0,54 a +1,22); contingência antes da abertura: −0,16 (−0,37); **depois da abertura: −0,56 (−1,38)** | A parte contaminada tende ao déficit, como devia. A C3 limpa fica sem déficit. A regra (ii) continua atendida |
| D é endógeno? (placebo: D dentro da C3 limpa, sem troca no dia) | inclinação **−8,1 por hora (z −2,8)** | Uma parte da relação D × comparecimento é mecânica: com menos eleitores, os intervalos entre votos ficam maiores. A condição (i) é fraca como teste causal |
| Medida menos endógena: intervalo da troca, por faixa | menos de 15 min −0,46 (z −2,3, 339 seções); 15 a 30 min −0,70 (−4,7, 998); 30 a 60 min −0,89 (−6,4, 857); 60 min ou mais **−1,94** (−9,5, 440) | **Dose monótona.** Ela segura a conclusão sem depender de D |
| Sem as 5 seções com diário incompleto / D limitado a 4 h | inclinação −1,52 (−7,46) / −1,54 (−7,52) | Não depende do caso BA 39934/0183/0175 (D de 330 min com metade dos votos no diário) |
| Poder do teste de C3 | erro 0,29; um déficit de −0,75 daria z −2,58; o IC de C3 (−0,55 a +0,59) **exclui** −0,75 | A ausência de déficit na C3 tem poder |

**Veredito:** sustentado com ressalvas.
- A conclusão "explicado pela interrupção do dia" fica de pé.
- A prova mais forte é a dose pelo intervalo da troca, não a inclinação em D.
- O doc 32 deve corrigir o rótulo de C3 (107 trocas durante a votação) e dizer que a inclinação em D tem uma parte mecânica.
- Explicações alternativas:
  - "a reserva derruba o comparecimento por si": testada, não vale (C3 limpa +0,34);
  - "a fila e a desistência no 1º turno, com mais cargos": suposta, não testada no voto a voto. Não muda a conclusão.

## 7. Explicações alternativas: testadas e só supostas

| Achado | Testado aqui | Só suposto (no doc 32 ou aqui) |
|---|---|---|
| H14(a) MDE | ruído do placebo = ruído real (sim nas trocas, sim nas herdadas); viés do placebo (+0,05 nas herdadas); viés de arredondamento | formas fora de F1 a F4 (desvio que acompanha o perfil ou o tipo de local) |
| H14(b) | C3 contaminada, D mecânico, dose pelo intervalo, diário incompleto | fila e desistência como mecanismo |
| H14(c) | escore 0 contra registrados × escore positivo contra o dia (2 de 8) | incompatibilidade de moldes UE2015 → UE2013 (Hipótese) |
| H19 Norte | inserção (rejeitada com poder), troca com "já votou" (sem sinal), perfil, agregadas, trocadas, UF a UF | causa da associação no PA |
| ES 0316 | leitor parado (excluído pelo dedo do mesário lido) | eleitor que não pôs o dedo × dedo não detectado. O princípio 8 impede fechar pela ata |

## 8. Conclusões finais que sustento

**H14: sem sinal nos dados públicos, com o tamanho mínimo que o teste enxerga.**
- Os tamanhos corrigidos são cerca de 870 votos (0,12 ponto) nas trocas novas e cerca de 1.500 a 2.200 nas herdadas, conforme o sentido (cerca de 2.000 sem o viés do placebo).
- Ao lado:
  - (b) é Fato, explicado pela interrupção do dia;
  - (c) é não decidível, com desenho técnico de comparação quebrada nas reservas de escore 0 (Hipótese);
  - "programa adulterado e assinado" é não decidível.
- *Frase simples:* "Nas seções em que a urna foi trocada por uma reserva, os votos se comportaram como nas seções vizinhas. O teste perceberia um desvio a partir de algumas centenas a 2 mil votos, e a diferença entre os candidatos foi de 4,4 milhões."

**H19: sem sinal nos dados públicos, com o tamanho mínimo que o teste enxerga.**
- Ao lado:
  - as seções com liberação sem dedo lido são fato que pede explicação, por lacuna de controle e sem efeito visível no voto. ES 56995/0053/0316 no 1º turno é o caso mais forte, e o bruto exclui leitor parado;
  - o Norte é uma associação pequena (cerca de 900 votos), sem o rastro que voto inserido ou voto trocado deixaria. É Hipótese de baixo peso;
  - a falha igual nos dois turnos não está coberta em 23 UFs;
  - a parte "de propósito" é não decidível.
- *Frase simples:* "Onde a leitura da digital falhou mais, o voto não pendeu para nenhum candidato além do acaso. No Norte apareceu uma ligação pequena, de cerca de 900 votos, mas sem o aumento de comparecimento que um voto posto no lugar de um ausente deixaria. Algumas seções, como uma da Serra (ES) no 1º turno, liberaram dezenas de eleitores sem nenhuma leitura de dedo e precisam de explicação, mas sem sinal de efeito no voto."

## 9. Correções pedidas ao doc 32 (não editei o doc)

1. **H14(a):**
   - os pontos do MDE em δ pequeno estão subestimados pela aproximação normal arredondada da binomial (0,10 → 0,12 nas trocas). Dar o MDE em pontos pelo desvio realmente injetado, ou trocar o sorteio pela binomial exata;
   - os votos ficam;
   - herdadas: declarar o viés de +0,05 do placebo e o número simétrico (cerca de 2.000 votos);
   - apagar "fica menor, e não maior" (na base das trocas, 0,142 ponto é cerca de 1.006 votos).
2. **H14(a):** marcar o "combinado calibrado" como de cerca de 13% de falso alarme.
3. **H14(b):**
   - C3 não é "reserva instalada antes do dia" em 107 de 399 seções;
   - citar a dose pelo intervalo da troca como prova principal;
   - dizer que a inclinação em D tem uma parte mecânica (placebo na C3 limpa: −8,1 por hora).
4. **H14(c):** incluir no exploratório o contraste "escore 0 contra registrados × escore positivo contra os dedos do dia" (2 de 8 conferidas). Rever a frase "a outra leitura possível é que nenhum mesário registrado pôs o dedo".
5. **H19(b):**
   - no Norte, acrescentar o coeficiente de comparecimento esperado sob inserção (≈ 23,8) e o teste do "já votou";
   - no ES, acrescentar que o leitor leu o dedo do mesário nas 47 liberações;
   - avisar que a regra T_R não separa leitor parado por algumas horas.

## Conferências rodadas

```bash
node --max-old-space-size=8192 scripts/auditoria/cetico-58-poder.mjs --reps 400            # aproximação do autor
node --max-old-space-size=8192 scripts/auditoria/cetico-58-poder.mjs --reps 400 --exato    # binomial exata
node --max-old-space-size=8192 scripts/auditoria/cetico-58-h14b.mjs
node scripts/sql.mjs "select turno, uf, municipio, zona, secao, sum(ja_votou) jv, sum(votos_computados) vc, count(*) np from perfil_log group by turno, uf, municipio, zona, secao" --formato csv --limite 2000000 > data/parsed/auditoria/cetico-revisor/58/javotou.csv
node --max-old-space-size=12000 scripts/auditoria/cetico-58-h19.mjs
node scripts/auditoria/cetico-58-bruto.mjs 1:es/56995/0053/0316 2:es/56995/0053/0316 2:rj/60011/0188/0082 2:ba/37150/0078/0158 1:rj/60011/0188/0082 1:ba/37150/0078/0158
node src/exportar.js --turno 1|2 --uf .. --municipio .. --zona .. --secao .. --log dia --stdout   # sequências de escore e eventos do leitor
```

- Saídas: `data/parsed/auditoria/cetico-revisor/58/` (`poder.json`, `poder-exato.json`, `h14b.json`, `h19.json`, `bruto.json`, `javotou.csv`).
- Nenhum título nem CPF gravado. Não li `data/private/`.

## Riscos que ficam

- O "já votou" vem do `perfil_log`, somado por seção entre os pacotes. Numa contingência, pode haver contagem dupla. As trocadas são 1% da amostra do Norte (339 de 39.915), e o teste do "já votou" não foi refeito sem elas.
- Conferi no bruto 2 das 8 reservas de escore 0 e 1 das 11 seções do padrão "sem tentar".
- Não reproduzi a H19(c) (2022), a beta-binomial nem os MDEs por injeção da H19.
- A simulação das herdadas usa 200 réplicas por ponto. O erro de Monte Carlo do poder fica em cerca de ±3 pontos.
