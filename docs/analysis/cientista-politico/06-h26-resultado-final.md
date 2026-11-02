# 06. H26: resultado final (virada para o 13 por zona)

Cientista político, 02/11/2026. Execução do plano pré-registrado [06-h26-plano-final.md](06-h26-plano-final.md), que entrou no commit da0e969 antes de qualquer dado ser lido. Rótulos: **Fato** (sai de script do repo sobre arquivo público, universo completo), **Hipótese**, **Recomendação**, **Pendente**. Sem rede. Nada aqui depende de resposta do TSE. **Aguarda revisão cética.**

## Resposta curta

**Conclusão final da H26, pela regra da seção 7 do plano: fato que pede explicação.**

| Parte | Resultado | Lado do 13 | Lado do 22 (Fato à parte) |
|---|---|---|---|
| (a) zonas perto do corte, seção a seção | 116 zonas, 30.631 seções | **sem sinal (L)**: 6 seções extremas, contra 3,06 esperadas por acaso (p = 0,09); nenhuma zona concentrada | **sinal**: 20 seções extremas contra 3,06 (p = 1,2 × 10⁻¹⁰); 4 zonas concentradas (BA 0115, PI 0028, SP 0002, MA 0032) |
| (b) linha de base 2018 e 2022 | 12 estatísticas, 5.000 reamostragens | **sinal (S)** em B7a e B7b: em 2026 a virada bruta foi **mais uniforme** entre as zonas que em 2018 e 2022. As outras 10 ficam dentro do padrão | nenhuma estatística fora a favor do 22 |
| (c) voto depois das 17h | 34.330 votos tardios em 29.854 seções, todos com o tipo de liberação lido no diário | **sem sinal (L)**: a associação não vem da liberação sem digital nem do voto depois do "todos votaram? SIM"; ela aparece também fora da prorrogação | sem sinal |

- **O fato que pede explicação (Fato):** em 2026, o 13 melhorou a margem em 99,4% das zonas, contra 76,2% em 2018 e 88,7% em 2022 (o finalista que cresceu em cada ano). O desvio robusto da virada entre as zonas foi 0,35 vez a virada nacional, contra 0,98 e 0,76. Os intervalos de 2026 não tocam os de 2018 nem os de 2022. A medida seção a seção (nível B) dá o mesmo.
- **De onde vem a uniformidade (Fato, análise descritiva acrescentada depois de ver o resultado):** ela está na parte da virada que o 1º turno da própria zona **já prevê**. A virada esperada foi positiva em 99,66% das zonas, com dispersão de 1,70 p.p., contra 2,37 em 2022 e 6,54 em 2018. A parte que o 1º turno **não** explica tem dispersão normal: 0,95 p.p., entre 0,85 (2022) e 1,52 (2018).
- **Explicação política compatível (Hipótese):** o 2º turno de 2026 teve a maior volta de eleitores e a maior queda de brancos e nulos dos três anos. Foram +2,96 milhões no comparecimento e −1,82 milhão em brancos e nulos; em 2018, −1,43 milhão e +0,78 milhão; em 2022, +0,57 milhão e +0,25 milhão. No esperado, essa fonte de votos pesa a favor do 13 em quase todas as zonas. Em 2018, o ganho do 13 veio sobretudo dos eliminados, que tinham geografia própria. As quatro previsões dessa explicação batem com os dados (seção 4.4). Mas a mesma uniformidade é o que produziria uma troca do 22 para o 13 proporcional ao voto do 22, e esse é um ponto cego medido desta análise (seção 4.3). Por isso o fato fica **aberto**, e não absolvido pela política.
- **O que não tem sinal (Fato):** nenhuma zona ou seção puxa para o 13 fora do esperado por acaso. A dispersão, as caudas, a triagem, o peso do 13 sobre ele mesmo, a ligação com o comparecimento e o efeito de cidade estão dentro do que aconteceu em 2018 e 2022. O voto tardio não carrega liberação sem digital.
- **Anomalia estatística não é prova de fraude.** O fato é de **forma** (uniformidade), não de **excesso**: nenhuma estatística mostra o 13 ganhando além do que o 1º turno prevê.

## 1. Conferências (Fato)

| Conferência (plano, seção 6) | Resultado |
|---|---|
| `munzona` × `detalhe`, por município × zona e turno | 2018 e 2022: 0 diferença nos dois turnos. 2026, 2º turno: 0. 2026, 1º turno: o `detalhe` tem 5.246 votos nominais a mais em 2.148 unidades, que são o nº 28, omitido no `munzona` (fato conhecido, parecer cético 09). Nenhuma UF passa de 0,1%, e nenhuma sai |
| Virada do 13 no país pelo `munzona` | +6,49 (2018), −3,43 (2022) e +5,44 p.p. (2026), iguais ao doc 03 |
| Fechamento: comparecimento = nominais + brancos + nulos + anulados | 0 falha em todas as unidades dos três anos |
| `votacao_secao_2022` somado × `munzona_2022` | 81.679 células (unidade × turno × candidato) iguais, 0 diferente |
| Pares de seção de 2022 (nível B) | 472.028 seções, todas com `detalhe` e com os dois turnos |
| 2026 nível B × plano 01 | 0 zonas para o 13; para o 22, as mesmas 4 (MA 0032, SP 0002, CE 0020, BA 0105); maior diferença de z = 0,005; 13 e 22 iguais ao resultado oficial nos dois turnos |
| Parte (c): cobertura do diário | 29.854 seções e 34.330 votos tardios pelo perfil; todas no jsonl da H06, com a mesma contagem; nenhuma releitura necessária; 0 voto com liberação não identificada |
| Parte (c): sanidade | a especificação do parecer 34 dá +0,3923 (z 7,26); referência do doc 02: +0,392 |
| Parte (a): bruto | as 30 seções listadas, lidas do arquivo da urna: BU = banco = resultado oficial em todas; 0 falha de integridade além da AC ausente no ambiente. Votos no diário = comparecimento em 29; a exceção é PI 0028/0095 (206 de 227), a seção com urna trocada entre os turnos |

Exclusões: o exterior sai dos testes que comparam zonas, como no plano 01 (1.310 seções em (a); 43 e 42 cidades sem voto em 2022 e 2026; 33 unidades do `detalhe` de 2018, todas do exterior e sem comparecimento). Em (c), 1.313 seções ficam fora da regressão: o exterior e as seções sem hora ou sem comparecimento.

## 2. Parte (a): zonas perto do corte, seção a seção

**Zonas:** 116. São 114 com |z| ≥ 2,5 no plano 01, mais 2 que só aparecem nas variantes do parecer 34 (SC 0013 e SP 0371): 72 do lado do 13 e 44 do lado do 22. Seções: 30.631. A régua nacional (seções fora dessas zonas, 6.545 ou mais por estrato) põe o percentil 99,99% do t centrado entre 2,22 e 5,95, conforme o estrato.

**A1, seções extremas dentro da própria zona (Fato):**

| Lado | Observadas | Esperadas por acaso | p (Poisson) | Corte p < 0,005 |
|---|---|---|---|---|
| 13 | 6 | 3,06 | 0,090 | não |
| 22 | **20** | 3,06 | 1,2 × 10⁻¹⁰ | **sim** |

- As 6 do lado do 13: Independência (CE 0039/0027), Flores de Goiás (GO 0011/0147), Campos dos Goytacazes (RJ 0075/0068 e 0129/0094), Florianópolis (SC 0013/0193) e São José (SC 0084/0188). Todas conferem no bruto, e nenhuma tem rastro técnico.
- Comparação dos lados: as zonas do 13 têm 67,7% das seções examinadas, mas só 6 das 26 seções extremas (23%).

**A2, concentração do desvio da zona (Fato; 10.000 simulações por zona; BH q < 0,01 por lado):**

| Zona | Lado | Seções | Além do esperado | Parte das 10% seções mais extremas | q |
|---|---|---|---|---|---|
| PI 0028 (Monsenhor Hipólito, Santo Antônio de Lisboa) | 22 | 136 | −5,14 p.p. | 54,0% | 0,0011 |
| SP 0002 (São Paulo) | 22 | 439 | −3,37 p.p. | 38,4% | 0,0011 |
| BA 0115 (Pindobaçu, Caldeirão Grande) | 22 | 123 | −4,91 p.p. | 35,0% | 0,0011 |
| MA 0032 (Humberto de Campos) | 22 | 186 | −6,72 p.p. | 29,7% | 0,0011 |
| RJ 0075 (Campos dos Goytacazes), a mais concentrada do lado do 13 | 13 | 358 | +2,42 p.p. | 52,5% | 0,036 (não passa) |

**Decisão (a): sem sinal do lado do 13.**

**Fato do lado do 22:** 19 das 20 seções extremas não têm rastro técnico. Só PI 0028/0095 tem (urna trocada entre os turnos).

| Onde | Seções extremas | O que se vê |
|---|---|---|
| PI 0028, Santo Antônio de Lisboa | 9 | Inclui PI 11878/0028/0099, a seção já estudada pelo parecer cético 07, com t centrado de −8,36. As seções do mesmo local vão todas para o mesmo lado |
| SP 0002 | 6 | Todas no mesmo local de votação (local 1546, 7 seções), que como um todo vira −17,26 p.p. (errata, ver abaixo) |
| MA 0032 | 2 | Humberto de Campos e Primeira Cruz, com queda de comparecimento (doc 04 dos casos) |
| Outros | 3 | Posse (GO), Oriximiná (PA) e Vale do Sol (RS) |

- **Hipótese:** efeito político local (liderança municipal) em Santo Antônio de Lisboa e Caldeirão Grande. As seções do mesmo local andam juntas. Em 2022, 8 das 9 seções extremas de Santo Antônio de Lisboa já tinham virada contra o 13 (de −3,7 a −22,1 p.p., contra −3,43 no país); a outra teve +1,8.
- Os arquivos públicos não mostram liderança local. A explicação fica sem rastro técnico (princípio 8).
- Detalhe por seção: `h26-a-secoes.json` → `casos`.

## 3. Parte (c): voto do fim do dia

**Liberação dos 34.330 votos tardios (Fato, diário de cada urna):**
- 28.861 pela digital (84,07%), 2.707 pelo ano de nascimento e 2.762 por dado pessoal conferido pelo mesário. Sem digital, são 5.469 (15,93%); não identificados, 0.
- No total do 2º turno, 87,32% votaram pela digital.

**Associação com os controles do plano (Fato):**
- Cada voto tardio vem com +0,269 voto de margem para o 13 além do esperado (z 5,19). São **9.221 votos** no país.
- Os cerca de 12.900 do parecer 34 não tinham as parcelas tardias desde as 15h como controle. Com elas, a associação cai cerca de 30%.

| Teste | Resultado | Sinal? |
|---|---|---|
| C1: liberação sem digital × digital | por voto: digital +0,274 (z 4,67); sem digital +0,242 (z 1,83); diferença −0,031 (z −0,21). Parte sem digital: 1.325 dos 9.221 votos (14%) | **não** |
| C2: votos depois do "todos votaram? SIM" (784 seções, 912 votos) | +0,277 por voto (z 0,92) | **não** (nem do lado do 22) |
| C3: onde fica a associação | G1 (Salvador, Feira de Santana, Lauro de Freitas; 1.994 votos tardios): +0,28 (z 1,04). G2 (outras seções que encerraram às 19h ou depois; 3.770): +0,02 (z 0,12). **G3 (resto do país; 28.566): +0,315 (z 5,76)** | não gera sinal; aponta E3 |

- **Limite aritmético (Fato):**
  - a associação (9.221) é maior que todos os votos tardios sem digital (5.469), então a liberação manual sozinha não a explica;
  - mesmo que os 34.330 votos tardios fossem todos do 13, seriam 0,77% da margem.
- **Por região (descritivo; coeficiente por voto pela digital):** N +0,67 (z 3,3), CO +0,65 (3,7), SE +0,19 (2,0), NE +0,15 (1,6), S +0,29 (1,3).

**Decisão (c): sem sinal de processo.**
- **Hipótese (E3, a que sobra pelo C3):** o eleitor que chega no fim do dia é diferente do que vota cedo, e a diferença pende para o 13 em todo o país, não só onde houve prorrogação.
- **Previsão de E2 (prorrogação por falta de transporte):** concentração em G1 e G2. Não bate: G3 carrega a associação.
- Pelo sigilo do voto, nenhum arquivo público mostra em quem o eleitor tardio votou. A explicação fica como Hipótese.

## 4. Parte (b): linha de base de 2018 e 2022

### 4.1 Resultado da família (Fato)

Nível A: município × zona, mesmo modelo nos três anos. Intervalos de 99,58%, por 5.000 reamostragens. "Quem cresceu": 13 em 2018, 22 em 2022, 13 em 2026.

| Estatística | 2018 | 2022 | 2026 | Situação de 2026 | Nível B (2022 → 2026) |
|---|---|---|---|---|---|
| B1 dispersão da virada além do esperado (p.p.) | 1,52 [1,31; 1,59] | 0,85 [0,71; 0,89] | 0,95 [0,82; 0,99] | dentro | 0,96 → 1,03 |
| B2g zonas com z ≥ 3 do lado de quem cresceu | 19 [6; 35] | 19 [9; 42] | 12 [3; 29] | dentro | 19 → 22 |
| B2p zonas com z ≤ −3 | 23 [14; 53] | 14 [4; 33] | 32 [14; 56] | dentro | 17 → 17 |
| B3g zonas no corte, lado de quem cresceu | 4 [0; 19] | 5 [0; 17] | 0 [0; 9] | dentro | 3 → 0 |
| B3p zonas no corte, outro lado | 11 [2; 27] | 2 [0; 16] | 8 [0; 28] | dentro | 6 → 4 |
| B4g peso de quem cresceu sobre ele mesmo | 0,980 [0,963; 0,996] | 1,048 [1,037; 1,055] | 1,024 [1,011; 1,036] | **entre** os dois anos (sem direção; não é sinal) | 1,031 → 1,015 |
| B4p peso do outro finalista sobre ele mesmo | 1,024 [1,015; 1,034] | 0,979 [0,973; 0,987] | 1,004 [0,997; 1,016] | dentro | 0,966 → 1,000 |
| B5 ganho além do esperado por p.p. de comparecimento | 0,31 [0,16; 0,42] | −0,09 [−0,17; −0,03] | 0,17 [0,10; 0,26] | dentro | 0,00 → 0,23 |
| B6a semelhança das zonas da mesma cidade (ICC) | 0,47 [0,23; 0,59] | 0,41 [0,21; 0,51] | 0,32 [0,11; 0,43] | dentro | 0,45 → 0,30 |
| B6b municípios no corte, lado de quem cresceu | 16 [3; 36] | 20 [6; 42] | 13 [2; 25] | dentro | 36 → 30 |
| **B7a zonas em que quem cresceu melhorou (%)** | 76,2 [73,7; 78,8] | 88,7 [87,1; 90,4] | **99,4 [99,0; 99,8]** | **fora, acima: sinal** | 88,7 → 99,4 |
| **B7b desvio robusto da virada ÷ virada nacional** | 0,98 [0,85; 1,11] | 0,76 [0,68; 0,82] | **0,35 [0,32; 0,38]** | **fora, abaixo: sinal** | 0,76 → 0,35 |

- B7a e B7b medem a mesma coisa por dois lados: a virada média grande em relação à dispersão entre as zonas. Na prática, são **um** fato contado duas vezes na família.
- Nenhuma estatística ficou fora a favor do 22.
- Pelo lado do 13 nos três anos (comparação secundária): 2022 dá B7a = 11,3%, porque o 13 piorou em 89% das zonas.
- **Peso de quem cresceu sobre ele mesmo acima de 1 (descritivo):** 7 de 24 grupos de UFs em 2018, 21 de 25 em 2022 e 11 de 24 em 2026. O "acima de 1" de 2026, que o parecer 34 notou em 13 UFs, aconteceu também em 2022 com o outro finalista, e em mais UFs.

### 4.2 Leitura política que acompanha (plano 4.5; Fato)

| Ano | Comparecimento 1º → 2º | Brancos e nulos (% do comparecimento) | Votos nominais | 2º turno de governador |
|---|---|---|---|---|
| 2018 | 79,67% → 78,70% (−1,43 mi) | 8,79% → 9,57% (+0,78 mi) | −2,07% | 14 UFs |
| 2022 | 79,05% → 79,42% (+0,57 mi) | 4,41% → 4,59% (+0,25 mi) | +0,27% | 12 UFs |
| 2026 | 78,92% → 80,78% (+2,96 mi) | 4,77% → 3,24% (−1,82 mi) | +4,00% | 6 UFs (AC, AM, DF, ES, RN, TO) |

- Dos 4,78 milhões de votos nominais a mais em 2026, 2,96 milhões vieram do comparecimento e 1,82 milhão da queda de brancos e nulos. É a separação que faltava no [doc 04](04-linha-de-base-historica.md).
- **Arrasto de governador (Fato):** com e sem 2º turno de governador, B7a de 2026 é 100% e 99,4%, e B5 é 0,14 e 0,18. A uniformidade não vem das UFs com governador. Em 2018, as UFs com governador tinham B7a de 65% e as sem, 91%.
- **A mesma zona entre os anos (z do nível A):** 2026 × 2018 r = 0,31; 2026 × 2022 r = 0,03; 2022 × 2018 r = 0,20. Confere com o doc 03.

### 4.3 Poder (plano 4.4; Fato)

Menor total inserido que faz a linha de base ou a triagem acender, sem contar B7, que já está aceso no dado real:

| Forma | Menor total visto | Quem acende | Visto antes de mudar o vencedor? |
|---|---|---|---|
| F1 proporcional ao 13 do 1º turno, todas as UFs | 2.378.044 | B4g | sim (limite 4.430.191) |
| F2 o mesmo, só no Nordeste / só no Sudeste | 2.371.097 / 2.371.097 | B4g | sim |
| F3 mesmo número de votos por seção | 1.433.392 | triagem | sim |
| F4 só nas 27 capitais | 557.246 | triagem | sim |
| F6 p.p. iguais em 10% das zonas | 184.820 (1,49 p.p. por zona; 80% dos sorteios) | triagem | sim |
| **F5 troca do 22 para o 13, proporcional ao voto do 22** | **12.661.614** | triagem | **não** (limite 2.215.096) |

- F1 e F2 dão o mesmo total por álgebra: o peso médio do 13 sobre ele mesmo sobe o mesmo tanto, onde quer que se insira.
- **Ponto cego (Fato):** uma troca proporcional ao voto do 22 é absorvida quase toda pelo esperado.
  - No tamanho que muda o vencedor (2.215.096 votos), o peso do 22 sobre ele mesmo cairia de 1,004 para 0,967. O intervalo deslocado [0,960; 0,979] ainda toca o de 2022 [0,972; 0,987].
  - B7b iria a 0,21: a troca deixaria a virada ainda mais uniforme.
  - Ou seja: o fato observado em B7 é compatível com essa forma de troca.

### 4.4 O fato B7: o que a política prevê e o que os dados mostram

Análise descritiva, fora da família e acrescentada depois de ver o resultado (Desvios do plano, item 4). Virada bruta da zona = virada esperada (prevista pelo 1º turno da própria zona) + virada além do esperado. Valores orientados a quem cresceu.

| | 2018 | 2022 | 2026 |
|---|---|---|---|
| Dispersão da virada bruta (p.p.) | 6,35 | 2,61 | 1,90 |
| Dispersão da virada **esperada** | 6,54 | 2,37 | **1,70** |
| Dispersão da virada **além do esperado** | 1,52 | 0,85 | 0,95 |
| Zonas com virada esperada positiva | 76,4% | 89,7% | **99,7%** |
| Mediana da parte que vem dos eliminados | +6,27 | −0,93 | +0,19 |
| Mediana da parte que vem de brancos e nulos do 1º turno | +0,47 | +1,64 | **+3,24** |
| Mediana da parte que vem da abstenção do 1º turno | +0,66 | −0,76 | +0,80 |
| Mediana da parte dos finalistas | −3,77 | +3,64 | +1,36 |
| Peso cruzado: voto de quem perdeu no 1º turno sobre quem cresceu no 2º (média) | −0,055 | −0,017 | −0,041 |
| Grupos de UFs com peso cruzado > 0,05 | 0 | 0 | 0 |

**Hipótese política:** mobilização nacional no 2º turno. Volta de quem se absteve e de quem votou branco ou nulo no 1º turno, pendendo para o 13 em quase todo o país. Em 2018, o ganho do 13 veio dos eliminados, que tinham geografia própria (Ciro Gomes no Ceará, Alckmin em São Paulo), e por isso a virada variou muito. Previsões e o que os dados mostram:

1. **A uniformidade está na parte prevista pelo 1º turno, e não no resíduo.** Bate: virada esperada positiva em 99,7% das zonas; dispersão do resíduo (B1) dentro do padrão.
2. **O ganho vem de brancos, nulos e abstenção do 1º turno, e não dos eliminados.** Bate: parte mediana de +3,24 p.p. de brancos e nulos, contra +0,19 dos eliminados. É também o ano com a maior queda de brancos e nulos e a maior alta de comparecimento.
3. **A ligação entre eleitor a mais e ganho além do esperado fica no padrão histórico.** Bate: B5 = 0,17, entre −0,09 e 0,31.
4. **Não há troca direta do 22 para o 13.** Bate no que é visível: o peso cruzado de 2026 (−0,041) fica entre 2018 e 2022, e nenhuma UF passa de 0,05. Uma troca proporcional que mudasse o vencedor somaria cerca de +0,037 em todas as UFs.

**Até onde vai.**
- As quatro previsões batem, mas os pesos são ecológicos: preveem, não medem quem votou em quem. O item 4 é descritivo, sem intervalo de confiança.
- O ponto cego da seção 4.3 continua: uma troca proporcional, feita dentro da urna, escreveria o BU, o RDV e o diário de forma coerente. Nenhuma aritmética de resultado a separa de uma mobilização real. Essa barreira é da integridade da urna (H05, H16, H25), não da H26.
- Pelo princípio 8, a explicação política fica como Hipótese.

## 5. Conclusão final da H26

Aplicação da regra da seção 7 do plano: (a) L, (b) **S**, (c) L. Conclusão: **fato que pede explicação.**

- **O fato (Fato):** a virada para o 13 entre os turnos de 2026 foi mais uniforme entre as zonas do que qualquer virada de 2º turno de 2018 e 2022 (99,4% das zonas, contra 76% e 89%). Isso vale nos dois níveis (município × zona e seção).
- **O que já se sabe dele (Fato):**
  - vem da parte que o 1º turno prevê, e não de um excesso além do esperado;
  - nenhuma zona e nenhuma seção desviou para o 13 além do acaso;
  - não há sinal do mesário nem do fim do dia.
- **Explicação compatível (Hipótese):** mobilização no 2º turno, com 2,96 milhões a mais de comparecimento e 1,82 milhão a menos de brancos e nulos, a favor do 13 em quase todas as zonas.
- **O que fica aberto:** a forma observada é a mesma de uma troca do 22 para o 13 proporcional ao voto do 22, que a linha de base não enxerga antes de 12,7 milhões de votos. Com dado público de resultado, a H26 não separa as duas. A separação depende da integridade da urna (H05, H16, H25), não de outro arquivo de resultado.
- **Recomendação ao coordenador:**
  - registrar o fato no tópico 8 como "forma da virada", sem número de inserção;
  - ligar o ponto cego da troca proporcional à H10 e às H05, H16 e H25;
  - tratar as 4 zonas concentradas do lado do 22 (PI 0028, SP 0002, BA 0115, MA 0032) como achado próprio.
- A Recomendação do plano de baixar os dados de 2014 vale aqui: o fato depende de uma linha de base de só duas eleições, e 2014 diria se um 2º turno de virada uniforme já aconteceu. Fica como **Pendente**; nada foi baixado, como pedido.

## 6. Desvios do plano

1. **Unidade do bootstrap (4.3).**
   - **Plano:** reamostrar as unidades município × zona dentro da UF.
   - **Feito:** reamostrei conglomerados, isto é, o município principal da zona com todas as suas zonas e unidades, dentro da UF.
   - **Motivo:** reamostrar unidades soltas muda a composição das zonas, e as estatísticas são de zona. Zonas da mesma cidade não são independentes (ICC 0,30 a 0,47).
2. **Exterior fora da família inteira.** Também B4 e B7, não só os testes de z. O plano só dizia "testes que comparam zonas", e o exterior não tem esperado comparável.
3. **Poder (4.4).**
   - O intervalo de 2026 com inserção é o do dado real deslocado, sem refazer as 5.000 reamostragens a cada passo.
   - "Acende" é contado em relação ao dado real: B7, já aceso, não conta; a triagem conta quando B3g passa do real (0).
   - Em F6, o que cresce é o p.p. por zona, com 10% das zonas fixos.
   - Acrescentei a posição de B4p para a troca F5 no tamanho que muda o vencedor (descritivo).
4. **Análise descritiva acrescentada depois de ver o resultado** (`politico-h26-b-uniformidade.mjs`): a separação da virada em esperada e além do esperado, as partes do esperado e o peso cruzado. Ela não entra na decisão, que é a do plano.
5. **Parte (c).**
   - A coluna "liberação não identificada" saiu da regressão porque é toda zero (0 voto), e coluna toda zero deixa a conta impossível.
   - A seção 5.1 previa reler o diário das seções que faltassem; nenhuma faltou.
6. **Parte (a).** "10% das seções" é arredondado (`round(n/10)`), como no doc 04, e não arredondado para cima.
7. **B4g "entre".** O intervalo de 2026 não toca os de 2018 e 2022, mas fica entre eles. O plano não previa esse caso. Tratei como sem direção, portanto sem sinal.

## 7. Limites

- **Linha de base curta:** duas eleições. "Fora do padrão" quer dizer fora do que aconteceu em 2018 ou 2022.
  - B7 é a estatística que mais depende do contexto: tamanho dos eliminados, tamanho da virada nacional, 2º turno de governador.
  - 2018 teve 25% de votos em eliminados; 2022 e 2026, cerca de 8%.
- **Pesos ecológicos:** preveem, não medem migração de eleitor. Um peso acima de 1, ou cruzado negativo, não é impossível na previsão, mas não é um fluxo real.
- **Ponto cego F5:** a troca proporcional ao voto do 22 só acende a partir de 12,7 milhões.
- **Nível A e o nº 28:** em 2026, o `munzona` não traz o nº 28 (5.246 votos no 1º turno). O nível A usa o `munzona`, e esses votos ficam fora de "demais".
- **Parte (a):** a régua de 99,99% é definida por 1 ou 2 seções por estrato. A contagem esperada de 3,06 por lado é aproximada.
- **Parte (c):** a regressão é ecológica dentro da zona. O voto do eleitor tardio não é observável.

## 8. Como reproduzir

```bash
node --max-old-space-size=12288 scripts/auditoria/politico-h26-b-historico.mjs      # ~15 min; parte (b), 5.000 reamostragens; cria os caches do nível A e de 2022
node --max-old-space-size=8192  scripts/auditoria/politico-h26-b-poder.mjs          # ~3 min; poder (lê h26-b-historico.json)
node --max-old-space-size=8192  scripts/auditoria/politico-h26-b-uniformidade.mjs   # ~10 s; análise descritiva do fato B7
node --max-old-space-size=12288 scripts/auditoria/politico-h26-a-secoes.mjs         # ~4 min; parte (a), com leitura do bruto
node --max-old-space-size=12288 scripts/auditoria/politico-h26-c-tardio.mjs         # ~2 min; parte (c)
```

- Funções comuns: `scripts/auditoria/politico-h26-lib.mjs`.
- Saídas em `data/parsed/auditoria/cientista-politico/`: `h26-b-historico.json`, `h26-b-zonas-nivelA.csv`, `h26-b-poder.json`, `h26-b-uniformidade.json`, `h26-a-secoes.json`, `h26-a-zonas.csv`, `h26-c-tardio.json`.
- Caches: `h26-nivelA-2018.json`, `h26-nivelA-2022.json`, `h26-nivelA-2026.json`, `h26-nivelB-2022.json`.
- Banco: cópia de leitura `eleicao2026-20261029T105000`. Sementes fixas nos scripts.

## Errata (02/11/2026, coordenador, a partir do parecer cético 53)

`politico-h26-a-secoes.mjs` agrupava o local de votação por UF, município e número do local, sem a zona. Como o número do local se repete entre zonas do mesmo município, 9 dos 30 casos da parte (a) mostravam um "local" errado. A chave passou a incluir a zona e o script foi rodado de novo. Na saída `h26-a-secoes.json`, só mudou a coluna `local` desses 9 casos (e `geradoEm`). Os testes A1 e A2, a decisão da parte (a) e o fato do lado do 22 não usam o local e ficaram iguais.

| Caso | Antes (local sem zona) | Depois (local da zona) |
|---|---|---|
| RJ 58190/0075/0068 | local 1325: 12 seções, +10,30 p.p. | 8 seções, todas do mesmo lado, +12,19 p.p. |
| RJ 58190/0129/0094 | local 1198: 23 seções, 19 do mesmo lado, +4,04 p.p. | 4 seções, todas do mesmo lado, +15,42 p.p. |
| SC 81051/0013/0193 | local 1295: 24 seções, 16 do mesmo lado, +1,69 p.p. | 20 seções, 14 do mesmo lado, +2,14 p.p. |
| SP 71072/0002 (6 seções) | local 1546: 133 seções, 65 do mesmo lado, −0,78 p.p. | 7 seções, todas do mesmo lado, −17,26 p.p. |

Em SP 0002, as 6 seções extremas são 6 das 7 do mesmo prédio, e o prédio inteiro virou para o 22. No parecer 53, o comparecimento do local sobe 18,7% entre os turnos, contra +4,6% no resto da zona. Fica como fato a explicar do lado do 22.
