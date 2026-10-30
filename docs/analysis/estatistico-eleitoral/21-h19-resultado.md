# 21. H19, falha de digital induzida na seção-alvo: resultado

Estatístico eleitoral, **30/10/2026**. Plano registrado antes de rodar: [20](20-h19-plano.md), 10:10. O plano não mudou depois de ver os dados. O que não estava nele está marcado **exploratório**.

**Revisado em 30/10/2026 depois da revisão cética** ([parecer 45](../cetico-revisor/45-h19-falha-induzida.md)). O que mudou:
- a leitura "compatível com H19" do Sudeste saiu;
- o argumento "some sem as 10 maiores" saiu;
- "falha do mesário" passou a se chamar **autorização sem mesário identificado**;
- a leitura de PR 74993/0159/0009 e BA 36854/0180/0149 foi corrigida;
- entraram dois limites: as seções que ficam fora dos testes e a liberação sem nenhuma digital lida.

Os números dos testes não mudaram: o parecer os reproduziu até a unidade.

## Resposta curta

- **Fato (contagem, universo completo).** Nas 497.897 seções do Brasil, nos dois turnos, a taxa de falha da digital ficou praticamente igual entre os turnos:
  - falha (4 tentativas sem reconhecimento): 7,07% dos eleitores a quem a urna pediu a digital no 1º turno e 7,16% no 2º;
  - tentativas por eleitor reconhecido: 1,369 e 1,378.
  - A autorização sem mesário identificado caiu de 38,6% das liberações manuais para 32,3%. Isso é a liberação autorizada por um dedo que não é de mesário registrado. A queda vem junto com **+720.682 liberações autorizadas por mesário identificado** (5.120.426 → 5.841.108). Não é menos liberação: é a mesma liberação, mais vezes com o mesário registrado.
- **Fato (parecer 45, varredura de todos os diários).** "Tentativa" não é "captura". Uma tentativa pode terminar sem dedo nenhum, por tempo esgotado.
  - Foram **172.318** liberações manuais no 1º turno e **212.171** no 2º sem nenhuma digital lida nas 4 tentativas (2,07% e 2,46% das falhas).
  - E qualquer dedo autoriza a liberação: a urna não exige mesário registrado.
  - O desenho deste teste conta essas liberações como falha comum.
- **Fato (Parte 1).** Saltos locais fortes da falha existem e não são acaso. 112 seções passam por Bonferroni (o esperado por acaso é 0,05), mas o desenho delas não é o que a H19 prevê:
  - há **mais quedas que subidas**: 73 contra 39. A H19 prevê excesso de subidas no 2º turno;
  - 39 das 112 tiveram a **urna trocada** entre os turnos (35%, contra 0,9% de todas as seções). É a explicação benigna da H14: o leitor muda com a urna.
- **Teste confirmatório (105 testes, Bonferroni |z| ≥ 3,49).** A variação contínua da falha (Δf), do leitor (Δa) e da autorização sem mesário identificado (Δh) **não prevê** a variação do voto dentro do local, em nenhuma das 33 unidades (Brasil, 5 regiões, 27 UFs). O mais perto do corte: Brasil Δf, z = 3,00.
  - **Ficam fora dos testes 26.933 seções (5,4% das 497.897)**, porque estão sozinhas no prédio com aquele modelo de urna. O desenho não diz nada sobre elas.
- **Um teste passa: Sudeste, seções com salto para cima (M2).**
  - São 75 seções. Nelas, a parcela do 13 cresceu **0,90 ponto a mais** que nas vizinhas do mesmo prédio e do mesmo modelo de urna (z = 3,57).
  - O placebo do 1º turno dá z = −0,50, e o resultado se mantém sem as urnas trocadas (z = 3,68). O critério conjunto do plano é atendido, mas **não sustenta a leitura "compatível com H19"** (parecer 45):
    - medida a falha contra a **própria** seção, e não contra as vizinhas, o sinal some (z = 0,46);
    - o comparecimento dessas 75 seções **não subiu** em relação às vizinhas (z = 0,02). Voto posto no lugar de ausente deixaria esse rastro.
  - Fica abaixo do corte também sem controles (z 3,20), sem peso (3,35) e sem as 14 seções cujo salto vem do vizinho (2,87).
  - Não passa em nenhuma UF sozinha.
- **Leitura.** Não há sinal de falha de digital induzida que mova voto.
  - O único teste que passa depende de medir o salto contra as vizinhas e não vem com o comparecimento a mais que o mecanismo exige.
  - No Nordeste, as seções com salto vão no sentido oposto (−0,30, z = −1,67).
  - Fica como **Hipótese de baixo peso, sem leitura de fraude**, com lista de seções para conferir no campo. Não é prova de fraude nem absolvição.

## Comandos

```bash
node --max-old-space-size=8192 scripts/auditoria/estatistico-h19-medidas.mjs      # 1,5 min: junta leitor, H08, banco e perfil
node --max-old-space-size=8192 scripts/auditoria/estatistico-h19-analise.mjs      # ~8 min: Parte 1, M1, M2, placebo, sensibilidades, MDE
node --max-old-space-size=8192 scripts/auditoria/estatistico-h19-exploratorio.mjs # ~8 min: exploratório (depois do resultado)
```

- O código comum de carga, salto por seção e regressão fica em `scripts/auditoria/estatistico-h19-lib.mjs`.
- O confirmatório foi rodado duas vezes, antes e depois de separar esse código comum. Os 105 testes saíram iguais, byte a byte.

**Entradas** (leituras já feitas, nenhum diário relido):
- `data/parsed/auditoria/estatistico-eleitoral/leitor/` (doc 08);
- `data/parsed/auditoria/estatistico/h08/<t>t/` (doc 17);
- a cópia de leitura do banco `eleicao2026-20261029T105000.sqlite`;
- o perfil do eleitorado.

**Saídas** em `data/parsed/auditoria/estatistico/h19/`:
- `medidas.csv.gz`: por seção e turno, tentativas, falhas, autorização sem mesário identificado, votos, urna e modelo;
- `resultado.json`, `testes.csv` (os 105 testes, com β, erro, z, Bonferroni, BH e efeito mínimo detectável);
- `saltos.csv`: 727 seções com salto, as de Bonferroni mais S↑ e S↓;
- `exploratorio.json`, `sudeste-sup.csv`.

## Medidas por turno (Fato, 497.897 seções, 27 UFs, sem o exterior)

| | 1º turno | 2º turno |
|---|---|---|
| Eleitores a quem a urna pediu a digital (B) | 117.993.030 | 120.602.768 |
| Reconhecidos (R) | 109.650.790 | 111.970.297 |
| Falhas: 4 tentativas sem reconhecimento (F) | 8.342.240 | 8.632.471 |
| Taxa de falha f = F ÷ B | 7,07% | 7,16% |
| Tentativas de captura (todas; tentativa inclui tempo esgotado sem dedo) | 183.529.819 | 188.776.340 |
| Tentativas por eleitor reconhecido (a) | 1,369 | 1,378 |
| Reconhecidos na 1ª tentativa | 75,1% | 74,5% |
| Autorização sem mesário identificado: liberação manual sem `Mesário … habilitou` (H) | 3.221.798 | 2.791.363 |
| H ÷ F | 38,6% | 32,3% |
| Autorização por mesário identificado (V3m) | 5.120.426 | 5.841.108 |
| Liberação manual sem nenhuma digital lida (4 tempos esgotados; parecer 45) | 172.318 | 212.171 |

**Por modelo de urna** (todas as seções; `resultado.json`, `descritivo.porModelo`):

| Modelo | f 1º → 2º | a 1º → 2º | H ÷ F 1º → 2º |
|---|---|---|---|
| UE2022 | 6,26% → 6,33% | 1,344 → 1,354 | 37,4% → 31,2% |
| UE2020 | 6,29% → 6,37% | 1,346 → 1,356 | 37,2% → 30,8% |
| UE2015 | 10,10% → 10,24% | 1,475 → 1,476 | 42,1% → 36,1% |
| UE2013 | 11,77% → 11,66% | 1,443 → 1,444 | 40,8% → 32,8% |

- **Fato:** as urnas antigas (UE2013 e UE2015) falham mais, nos dois turnos e no mesmo nível. Por isso a comparação é feita dentro do mesmo modelo.
- **Fato:** a queda da autorização sem mesário identificado aparece em todos os modelos e vem junto com +720.682 autorizações por mesário identificado. Ela vai contra a ideia de mais liberação "sem dono" no 2º turno.
- **O que H é (parecer 45, diário bruto).** No caminho manual, a urna pede "a digital do mesário". Qualquer dedo serve. H junta dois casos:
  - **"dedo novo":** a digital não bate com nenhuma gravada e é salva pela primeira vez;
  - **"dedo já visto":** a digital bate com uma gravada antes naquele dia.

  Nos dois casos o leitor **leu** o dedo; no segundo, até o **reconheceu**. H não mede defeito do leitor. Mede que quem autorizou não é mesário registrado. Pelo princípio 8, é a forma mais fraca de controle.
- **Fato (parecer 45):** "tentativa" não é "captura". Quatro tempos esgotados seguidos abrem o caminho manual sem nenhuma digital lida.
  - Isso aconteceu em 172.318 liberações no 1º turno e 212.171 no 2º.
  - O tempo esgotado também subiu entre os eleitores reconhecidos (de 0,61% para 0,73%).
  - Este desenho as conta como falha comum, sem separar.

## Amostra dos testes (Fato)

Elegíveis: **470.478 seções** em 75.811 grupos (local × modelo da urna do 2º turno, 2 seções ou mais).

| Exclusão (na ordem do plano) | Seções |
|---|---|
| Diário diferente do BU em algum turno | 17 |
| V3m + V3s da H08 diferente das falhas do leitor (1º turno) | 4 |
| B < 20 ou R < 10 em algum turno | 137 |
| Menos de 20 votos em 13 + 22 em algum turno | 8 |
| Sem perfil do eleitorado | 320 |
| Sozinha no grupo local × modelo | 26.933 |

**Limite (Fato):** as 26.933 seções sozinhas no prédio com aquele modelo de urna são 5,4% das 497.897. Elas **não entram em teste nenhum**, nem na Parte 1 nem na Parte 2. São sobretudo locais pequenos, de uma seção só. **Pendente:** um teste para elas contra a própria seção e contra a UF × modelo.

Na amostra: f = 6,97% → 7,06%; a = 1,367 → 1,375; H ÷ F = 38,3% → 32,0%.

## Parte 1. Salto local da falha (Fato quanto à contagem; Hipótese quanto à causa)

**Número de testes:** 470.478, um por seção, bicaudais. Corte de Bonferroni: |z| ≥ 5,32.

**Sobredispersão:** o τ² declarado (MAD de J ao quadrado menos a mediana da variância binomial) deu **0 em todas as UFs**.
- O MAD de J vai de 0,31 a 0,51, e a variância binomial mediana vai de 0,13 a 0,32.
- No miolo da distribuição, as seções variam **menos** que a binomial com +0,5 nas caselas. Esse ajuste exagera a variância em contagens pequenas.
- Por isso z com sobredispersão = z binomial.
- Com 470 mil testes, o esperado sob normalidade em |z| ≥ 3 seria 635 de cada lado. O observado é **315 para cima e 412 para baixo**: o miolo é conservador.
- As caudas, ao contrário, são **pesadas**.

| Salto (z ≥ corte) | Seções | Urna trocada | Leitor pior (+0,3 tentativa) | Salto médio de f contra os pares | Falhas a mais (soma de E) |
|---|---|---|---|---|---|
| Para cima, Bonferroni | **39** | 15 | 8 | +41,4 pontos | +3.007 |
| Para baixo, Bonferroni | **73** | 24 | 1 | −49,5 pontos | −9.197 |
| Para cima, BH 5% | 65 | 21 | 8 | +34,1 | +3.823 |
| Para baixo, BH 5% | 98 | 26 | 1 | −42,5 | −10.533 |
| S↑ (z ≥ 3 e salto ≥ 5 pontos) | 315 | 37 | 12 | +16,6 | +9.662 |
| S↓ | 412 | 38 | 4 | −18,5 | −20.081 |

**Por região (Bonferroni, para cima / para baixo):**

| Região | Para cima | Para baixo |
|---|---|---|
| Nordeste | 11 | 25 |
| Centro-Oeste | 3 | 8 |
| Sudeste | 10 | 19 |
| Sul | 15 | 21 |
| Norte | 0 | 0 |

**Leitura:**
- **Fato:** 112 seções têm a falha mudando entre os turnos de um jeito que o acaso não explica. O esperado por acaso, com 470 mil testes no corte de Bonferroni, é 0,05.
- **Fato:** as quedas são quase o dobro das subidas. Uma falha **induzida** no 2º turno produziria o contrário. Leitor quebrado no 1º turno e trocado ou consertado no 2º produz este desenho.
- **Fato:** a troca de urna está em 35% das seções com salto (39 de 112), contra 0,9% no país (4.413 de 497.897).
- **Limite do desenho (exploratório):** o salto é medido **contra os pares**. Num grupo pequeno, a queda de uma seção vizinha aparece como subida da outra.
  - Exemplo: BA 38830/0162/0086. A falha da própria seção ficou em 18 nos dois turnos, mas ela aparece com +88 pontos porque a vizinha melhorou.
  - Entre as 315 S↑, 24 têm a falha própria parada ou em queda; 94 subiram menos de 5 pontos por conta própria.

### As 5 maiores subidas (conferidas no BU bruto dos dois turnos)

| Seção | Urna 1º → 2º | Reconhecidos / falhas 1º → 2º | Autorização sem mesário identificado (H) 1º → 2º | Tentativas por reconhecido 1º → 2º | Parcela do 13, 1º → 2º |
|---|---|---|---|---|---|
| BA 36854/0180/0175 | mesma (1670693) | 223 / 51 → 42 / 260 | 51 → 77 | 1,47 → 1,55 | 74,3% → 74,2% |
| PR 74993/0159/0009 | mesma (1661675) | 137 / 54 → 13 / 196 | 43 → 194 | 1,43 → 2,00 | 44,4% → 49,3% |
| BA 36854/0180/0149 | trocada (1657143 → 1666960) | 196 / 41 → 76 / 219 | 32 → 213 | 1,48 → 1,26 | 65,3% → 65,1% |
| SP 71218/0340/0114 | trocada (1826362 → 1673887; UE2015 → UE2013) | 158 / 28 → 27 / 170 | 28 → 164 | 1,59 → 1,19 | 46,8% → 53,4% |
| BA 38830/0162/0086 | mesma (1680085) | 218 / 18 → 231 / 18 | 18 → 16 | 1,56 → 1,35 | 90,4% → 90,0% |

- **Conferência:** reconhecidos = "habilitação biométrica" e falhas = "habilitação biográfica" do BU. Os votos 13 e 22 de presidente batem com o banco nos dois turnos, com `node src/exportar.js --turno <1|2> --uf .. --municipio .. --zona .. --secao .. --log nao --stdout`.
- **Leitura (Hipótese):** os dois desenhos do plano aparecem.
  - **PR 0009 e BA 0149 (corrigido pelo parecer 45):** H sobe quase até F, mas **não é leitor ruim**. O dedo que autorizou foi lido e **reconhecido em série**: um dedo sem registro de mesário, reconhecido 190 vezes (PR) e 203 vezes (BA).
    - **PR 0009:** desde 08:00, com a mesma urna. Os eleitores quase não passam (13 reconhecidos). No 1º turno, o mesmo desenho em escala menor: 40 de 54 por dedo já visto.
    - **BA 0149:** houve **troca de urna no meio do dia**. A primeira urna votou 83 com leitor normal até ~09:45. A reserva entrou às ~10:00, quase não reconhece eleitores, e as liberações passam a ser autorizadas por dedos sem registro. **Hipótese benigna:** os mesários não foram registrados na urna reserva.
    - Pelo princípio 8, autorização em série sem identificação nominal é o desenho de maior risco, não um defeito técnico.
  - **SP 0114:** aqui sim o leitor não reconhece nem o dedo que autoriza. Foram 163 "dedos novos", com a urna trocada. Leitor ou casamento de digitais quebrado.
  - **BA 0175:** só os eleitores falham. O mesário segue identificado (183 liberações autorizadas por mesário registrado) e o leitor não piorou. É o desenho da **falha escolhida** (mecanismo B) e também de mesário que desiste rápido da digital. A contagem não separa os dois (princípio 8). A parcela do 13 não mudou (74,3% → 74,2%).
  - **BA 0086:** é um salto "emprestado" do vizinho (ver o limite acima).

## Parte 2. O salto prevê o voto dentro do local? (confirmatória)

**Modelo:** MQP com peso 13 + 22, efeito fixo do grupo local × modelo e erro CR1 por local.
- **Desfecho:** Δ da parcela do 13, em pontos.
- **Coeficientes:**
  - Δf e Δh em pontos por 100% de eleitores pedidos;
  - Δa em pontos por tentativa a mais por reconhecido.
- **105 testes**, Bonferroni |z| ≥ 3,49. Passa **1**, por Bonferroni e por BH.

### M1 (Δa, Δf, Δh), Brasil e regiões

| Unidade | Seções | Δa β (z) | Δf β (z) | Δh β (z) | Placebo 1º turno, z (Δa / Δf / Δh) |
|---|---|---|---|---|---|
| Brasil | 470.478 | +0,06 (1,04) | +0,46 (3,00) | 0,00 (0,01) | −5,22 / −2,79 / +0,69 |
| Nordeste | 129.632 | +0,13 (1,37) | +0,36 (1,38) | −0,17 (−0,96) | −0,67 / −1,52 / +0,80 |
| Norte | 39.915 | +0,16 (0,81) | +0,38 (0,61) | −0,71 (−1,60) | +0,02 / −1,40 / +1,61 |
| Centro-Oeste | 37.196 | +0,49 (2,32) | +0,69 (1,09) | −0,27 (−0,71) | −0,94 / −0,73 / −0,17 |
| Sudeste | 197.577 | −0,05 (−0,62) | +0,42 (1,67) | +0,12 (0,73) | −3,78 / −2,09 / −0,26 |
| Sul | 66.158 | +0,02 (0,15) | +0,54 (1,40) | +0,32 (1,35) | −2,21 / −1,84 / −0,02 |

**UFs:** nenhum dos 81 testes de UF passa. Os maiores |z| são RJ Δh +3,07, RR Δh −2,73, PE Δh −2,66, MG Δf +2,19, DF Δf −2,18, GO Δf +2,14 e RN Δa +2,07. A tabela completa está em `testes.csv`.

**Leitura (Fato, teste declarado antes):** pela variação contínua, nem a falha da digital, nem o leitor, nem a autorização sem mesário identificado preveem a mudança do voto entre seções do mesmo prédio e do mesmo modelo de urna, em nenhuma unidade.

**Exploratório:** o Brasil Δf (z = 3,00), abaixo do corte, vem com placebo de sinal oposto (−2,79).
- As seções cuja falha subiu já votavam **menos** no 13 no 1º turno.
- Como ΔY = Y₂ − Y₁, parte da associação positiva pode ser volta à média do voto do 1º turno, não efeito do 2º. É suposição: não foi testada (parecer 45).

### M2 (salto local S↑), Brasil e regiões

| Unidade | Seções S↑ | S↑ β (z) | S↓ β (z) | Placebo do M2, z (exploratório) | Sem urnas trocadas, z |
|---|---|---|---|---|---|
| Brasil | 315 | +0,08 (0,64) | −0,02 (−0,20) | −0,60 | 0,57 |
| Nordeste | 135 | −0,30 (−1,67) | +0,06 (0,42) | −0,88 | −1,82 |
| Norte | 19 | −0,65 (−0,92) | −0,07 (−0,12) | −0,08 | −0,92 |
| Centro-Oeste | 26 | +0,37 (0,76) | −0,15 (−0,41) | −0,47 | 0,99 |
| **Sudeste** | **75** | **+0,90 (3,57)** | −0,07 (−0,37) | −0,50 | **3,68** |
| Sul | 60 | 0,00 (−0,01) | −0,04 (−0,15) | +0,80 | −0,09 |

**Critério conjunto do plano, aplicado ao Sudeste S↑:**
1. passa por Bonferroni: sim;
2. placebo do 1º turno com |z| < 2: o plano definiu o placebo só para o M1. Rodado depois para o M2 (**exploratório**), dá z = −0,50;
3. sobrevive sem as urnas trocadas: sim (z = 3,68).

**Leitura pelo critério do plano:** atendido. **Leitura retirada** depois da revisão cética (parecer 45): "compatível com H19" **não se sustenta**.

As versões que caem abaixo do corte de 3,49 (parecer 45, exploratório; estimativas de modelo):

| Variação (Sudeste, S↑) | β | z |
|---|---|---|
| Plano | +0,90 | 3,57 |
| **S↑ medido contra a própria seção** (salto contra a UF × modelo, sem olhar os pares; 68 seções, 32 em comum) | +0,13 | **0,46** |
| Sem as 14 seções cujo salto vem do vizinho | +0,77 | 2,87 |
| As 14 tratadas como não S↑ | +0,75 | 2,79 |
| Sem controles | +0,83 | 3,20 |
| Sem peso | +0,85 | 3,35 |
| Aleatorização (75 seções sorteadas, 20.000 vezes) | — | p ≈ 0,5% bicaudal; o corte para 105 testes é 0,05% |

Ficam acima do corte só duas versões: com erro agrupado por município (z 4,41) e sem urnas trocadas (z 3,68).

- **O rastro do mecanismo não aparece.** Voto posto no lugar de ausente aumenta o comparecimento. Nas 75 seções, o comparecimento ÷ eleitores variou como nas vizinhas: β = +0,007 ponto, z = 0,02. O sinal é uma troca: o 13 sobe e o 22 desce, com o mesmo número de votantes.
- O que sobra compatível é troca de **quem** foi votar (o confundidor declarado no plano) ou troca do voto de quem veio. Nenhuma das duas passa pela falha da digital.
- Medida contra a própria seção, nenhuma região passa de |z| = 1,4 (Brasil: z = 0,11).

### Sensibilidades (exploratórias, z)

| Variante | Brasil Δf | Sudeste Δf | Sudeste S↑ | Nordeste S↑ |
|---|---|---|---|---|
| Plano | 3,00 | 1,67 | 3,57 | −1,67 |
| Grupo = local, com indicadores de modelo | 2,53 | 1,41 | 3,60 | −1,51 |
| Com Δcomparecimento | 2,80 | 1,56 | 3,59 | −1,68 |
| Sem controle Δ(ano de nascimento) | 2,95 | 1,63 | 3,59 | −1,67 |

## Exploratório: o sinal do Sudeste (depois do resultado)

| Pergunta | Resultado |
|---|---|
| Está em alguma UF? | Não passa em nenhuma: SP +1,00 (z 2,44; 29 seções), RJ +1,17 (2,05; 17), MG +0,66 (1,67; 24), ES +0,53 (0,66; 5) |
| Que desenho de falha? | Padrão B (leitor igual e mesário identificado): 56 seções, +1,01 (z 3,32). Padrão A (leitor pior ou H subindo): 19 seções, +0,59 (z 1,53). No Nordeste, o padrão B vai ao contrário: −0,44 (z −2,14). **Ressalva (parecer 45):** o padrão A mistura dois mecanismos diferentes, "dedo novo" (leitor que não lê nem quem autoriza) e "dedo já visto" (pessoa sem registro autorizando em série) |
| Salto próprio ou do vizinho? | 14 das 75 têm a falha própria subindo menos de 2 pontos: o salto vem da queda de um vizinho. Todas as 14 têm uma vizinha com queda forte (S↓). Um prédio de MG (41238/0334) dá 5 das 75 por causa de uma única vizinha (parecer 45) |
| Quantas mudaram mais que os pares? | 46 com ΔY acima dos pares e 29 abaixo; média de +0,76 ponto |
| Tamanho (**Estimativa** de modelo, fora do resumo) | β × (13 + 22) ÷ 100 = 178 votos trocados de lado nas 75 seções, ou cerca de 360 votos a mais no 13 (parcela do 13 de 50,2% no 2º turno; média de 265 votos por seção). A margem nacional é 4.430.191 |

**As 3 seções que mais pesam no Sudeste** (conferidas no BU bruto dos dois turnos):

| Seção | Urna | Reconhecidos / falhas 1º → 2º | H 1º → 2º | 13 / 22, 1º → 2º | ΔY − ΔY dos pares |
|---|---|---|---|---|---|
| RJ 60011/0009/0456 | mesma (1756889) | 270 / 24 → 271 / 47 | 21 → 5 | 87 / 192 → 132 / 201 | +5,5 pontos |
| SP 71218/0340/0114 | trocada | 158 / 28 → 27 / 170 | 28 → 164 | 89 / 101 → 119 / 104 | +4,5 |
| MG 40150/0064/0005 | mesma (1776932) | 215 / 20 → 198 / 43 | 19 → 43 | 98 / 134 → 139 / 143 | +4,4 |

**Leitura (Hipótese):**
- O sinal do Sudeste é uma média de seções com saltos moderados (de +7 a +77 pontos de falha contra os pares), espalhadas em 44 municípios.
- **Argumento retirado:** a versão anterior dizia que o sinal "some sem as 5 a 10 seções de maior peso" e por isso seria frágil. Isso **não separa** acerto falso de efeito real.
  - O parecer 45 simulou um efeito real e igual nas 75 seções. Tirando as 10 de maior peso, o t mediano cai para 0,79.
  - Tirar as maiores contribuições derruba qualquer média de 75 casos com cauda pesada, seja o efeito falso ou verdadeiro.
  - Os números dessa conta seguem em `exploratorio.json`, mas não sustentam conclusão.
- O que pesa contra a leitura de fraude são três fatos (parecer 45):
  - medido contra a própria seção, o sinal some;
  - o comparecimento não subiu;
  - nas 10 seções de maior peso, lidas no diário, nenhuma tem o desenho de falha escolhida.
- As regiões não são iguais entre si: Sudeste +0,90 contra o resto −0,20. Isso impede ler o Brasil (z 0,64) como absolvição, mas não é sinal de fraude.

## Efeito mínimo detectável (o que o teste veria)

O MDE é o menor efeito que o teste pegaria com 80% de poder no corte de Bonferroni (|z| = 3,49).

**Em coeficiente** (β_MDE = 4,33 × erro):

| Unidade | Δa (pontos por tentativa) | Δf (pontos por 100%) | Δh (pontos por 100%) | S↑ (pontos) |
|---|---|---|---|---|
| Brasil | 0,23 | 0,67 | 0,43 | 0,57 |
| Nordeste | 0,40 | 1,12 | 0,76 | 0,77 |
| Sudeste | 0,38 | 1,09 | 0,68 | 1,09 |
| Sul | 0,62 | 1,66 | 1,03 | 1,21 |
| Norte | 0,87 | 2,71 | 1,92 | 3,07 |
| Centro-Oeste | 0,91 | 2,77 | 1,69 | 2,09 |

**Em votos**, por injeção. O modelo de fraude: uma fração φ das falhas a mais em relação aos pares (E⁺) vira voto a mais num candidato, lançado como liberação manual com mesário.

| Unidade | E⁺ (falhas a mais) | Δf, a favor do 13: φ / votos | Δf, a favor do 22: φ / votos | S↑, a favor do 13: φ / votos | S↑, a favor do 22: φ / votos |
|---|---|---|---|---|---|
| Brasil | 918.304 | 2,7% / 24.803 | 2,4% / 21.750 | 10% / 995 | 8,3% / 799 |
| Nordeste | 277.727 | 6,9% / 19.267 | 2,8% / 7.723 | 22% / 884 | 9,1% / 367 |
| Sudeste | 367.359 | 4,1% / 15.218 | 4,5% / 16.653 | 17% / 418 | 17% / 417 |
| Sul | 137.644 | 5,0% / 6.855 | 8,3% / 11.381 | 13% / 271 | 22% / 474 |
| Norte | 69.019 | 9,4% / 6.486 | 9,6% / 6.613 | 82% / 325 | 66% / 258 |
| Centro-Oeste | 66.556 | 9,0% / 5.974 | 13% / 8.692 | 36% / 233 | 50% / 320 |

- Para Δh, a injeção em votos **não informa**: φ passa de 100%. O voto injetado como liberação sem mesário identificado move Δf junto, e o β_f absorve quase tudo. Vale só o β_MDE.
- Para Δa não há injeção, como declarado.
- **Por UF** (`testes.csv`): nas UFs pequenas, φ passa de 20% e o teste é cego.

**Leitura do tamanho:**
- Um esquema que convertesse em voto pró-13 menos de ~7% das falhas a mais do Nordeste (~19 mil votos), ou pró-22 menos de ~3% (~8 mil), ficaria **abaixo** do que o M1 vê.
- No país, o limite é ~25 mil votos pró-13 e ~22 mil pró-22, contra uma margem de 4,43 milhões.
- Para o salto (M2), o teste vê poucas centenas de votos concentrados nas seções com salto.

## O que isto permite e o que não permite afirmar

**Permite:**
- **Fato:** entre os turnos, a falha da digital, as tentativas por eleitor e o desempenho por modelo de urna ficaram estáveis no país. A autorização sem mesário identificado caiu (de 38,6% para 32,3% das liberações manuais), junto com +720.682 autorizações por mesário identificado.
- **Fato:** 112 seções têm salto local da falha que o acaso não explica. As quedas são quase o dobro das subidas, e um terço delas teve a urna trocada. Entre as 5 maiores subidas, SP 71218/0340/0114 mostra leitor que não reconhece nem quem autoriza. Em PR 74993/0159/0009 e BA 36854/0180/0149, um dedo sem registro de mesário, lido e reconhecido, autorizou em série; na BA, depois de uma troca de urna no meio do dia.
- **Fato (teste declarado antes):** a variação contínua da falha, do leitor e da autorização sem mesário identificado não prevê a mudança do voto dentro do prédio, em nenhuma das 33 unidades, com o poder da tabela acima.
- **Hipótese de baixo peso, sem leitura de fraude:** no Sudeste, as 75 seções com salto para cima da falha, medido contra as vizinhas, deram ao 13 +0,9 ponto a mais (z 3,57, passa no corte do plano).
  - Medido contra a própria seção, o sinal some (z 0,46).
  - O comparecimento não subiu (z 0,02).
- **Fato (parecer 45):** 172.318 e 212.171 liberações manuais, no 1º e no 2º turno, sem nenhuma digital lida. A liberação manual pode ser autorizada por qualquer dedo.

**Não permite:**
- dizer que houve falha induzida em alguma seção. A contagem não separa sabotagem de sensor gasto, nem falha escolhida de mesário que desiste rápido (princípio 8). Isso pede conferência física;
- dizer em quem votaram os liberados (voto secreto; associação ecológica);
- excluir fraude abaixo do efeito mínimo detectável, fraude igual em todas as seções de um prédio e modelo, ou fraude igual nos dois turnos;
- dizer algo sobre as 26.933 seções (5,4%) sozinhas no prédio com aquele modelo: elas ficam fora dos testes;
- separar a liberação sem nenhuma digital lida da falha comum: o desenho conta as duas juntas;
- excluir a mudança de **quem** foi votar (idade, digital gasta) como causa do salto. Ela não é observável por seção e turno;
- usar o resultado do Sudeste como número de fraude ou como sinal compatível com H19.

## Testes feitos

| Bloco | Testes | Natureza |
|---|---|---|
| Parte 1 | 470.478 (um por seção) | Detecção; Bonferroni e BH |
| Parte 2 (M1 99 + M2 6) | 105 | Confirmatório |
| Placebos | 99 (M1) + 6 (M2, exploratório) | |
| Sensibilidades | 3 variantes × 6 unidades × (3 + 1) | Exploratório |
| Exploratório do Sudeste | 4 UFs; 75 sem cada seção; 44 sem cada município; 4 cortes do topo; padrão A × B em 6 unidades | Exploratório |

## Seções citadas (todas conferidas no BU bruto dos dois turnos)

- BA 36854/0180/0175
- PR 74993/0159/0009 (também no doc 08)
- BA 36854/0180/0149
- SP 71218/0340/0114
- BA 38830/0162/0086
- RJ 60011/0009/0456
- MG 40150/0064/0005

Comando: `node src/exportar.js --turno <1|2> --uf <uf> --municipio <m> --zona <z> --secao <s> --log nao --stdout`.

Os títulos de mesário e de eleitor não foram lidos nem gravados.

## Pendências e recomendações

1. **Revisão cética:** feita (parecer 45). Nada daqui entra na perícia como número de fraude. O tamanho em votos do Sudeste e a classificação A × B ficam fora da perícia.
2. **Recomendação (campo, TRE):** registro de manutenção do leitor e ata da mesa para:
   - as 39 subidas de Bonferroni;
   - as 75 S↑ do Sudeste, priorizando as 10 de maior peso (`sudeste-sup.csv`).
   O padrão B (só eleitor falha, mesário identificado), como BA 36854/0180/0175, é o que a contagem não consegue separar de falha escolhida.

   A ordem do parecer 45 para o campo:
   - SP 71072/0006/0427 (urna reserva com leitor intermitente);
   - RJ 60011/0009/0456;
   - PR 74993/0159/0009 e as seções com "dedo já visto" em série (quem autorizou);
   - as seções com muitas liberações sem nenhuma digital lida.
3. **Recomendação (biometria):** para as 39 subidas, o horário das falhas no diário:
   - leitor ruim falha o dia todo;
   - falha escolhida tende a se concentrar em blocos;
   - checar se as liberações do padrão B vêm do mesmo mesário (sem gravar o título);
   - separar "dedo novo" de "dedo já visto" e a liberação sem captura como medidas próprias (parecer 45, seção 2).
4. **Limite do desenho:** o salto medido só contra os pares do prédio mistura a seção com as vizinhas. O parecer 45 refez o salto contra a própria seção e a UF × modelo, e o sinal sumiu. Um próximo desenho deve usar essa definição e incluir as 26.933 seções sozinhas no prédio.
