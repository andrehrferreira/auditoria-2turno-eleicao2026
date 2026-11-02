# 53. Parecer: fechamento da H26 (virada para o 13 por zona)

Parecer do revisor cético, 02/11/2026. Revisa o fechamento da H26 feito pelo cientista político:

- plano pré-registrado [06-h26-plano-final.md](../cientista-politico/06-h26-plano-final.md) (commit da0e969);
- resultado [06-h26-resultado-final.md](../cientista-politico/06-h26-resultado-final.md) (commit a58f6f3);
- scripts `scripts/auditoria/politico-h26-*.mjs` e saídas `data/parsed/auditoria/cientista-politico/h26-*`.

A base anterior é o [parecer 34](34-h26-virada-zonas.md). Rótulos: **Fato** (sai de script do repo sobre arquivo público, universo completo), **Hipótese**, **Recomendação**, **Pendente**. Sem rede. Os zips de 2018, 2022 e 2026 lidos estão em `data/raw/dadosabertos/` (F:). Banco só para comparar: cópia de leitura `eleicao2026-20261029T105000`. `data/raw` não foi varrido com `find`. Nenhum CPF nem número de título foi lido ou gravado. Tudo o que está marcado **fora do plano** é análise minha, feita depois de ver o resultado, e não muda a decisão pela regra do plano.

## Resposta curta

**Veredito: sustentado com ressalvas.** Pela regra do plano, a conclusão "fato que pede explicação" está certa e reproduz por caminho próprio. Mas o fato depende da régua escolhida, e duas descrições da parte (a) estão erradas.

1. **Os números da parte (b) reproduzem (Fato).** Li o `votacao_candidato_munzona_<ano>_BR.csv` direto do zip, sem a biblioteca do autor. Deu, para 2018, 2022 e 2026:
   - zonas em que quem cresceu melhorou: **76,25%, 88,69% e 99,43%**;
   - desvio robusto da virada ÷ virada nacional: **0,98, 0,76 e 0,35**;
   - intervalos de 99,58% iguais aos do autor até a segunda casa, e 2026 fora dos dois anos anteriores.
2. **O bootstrap não muda a decisão (Fato).** Com reamostragem por unidade (a do plano), por zona ou por município (a do autor), 2026 fica fora nas três. A reamostragem literal do plano é enviesada: os intervalos de 2018 e 2022 nem contêm o próprio valor do dado. O desvio 1 do autor foi certo, mas o plano mandava publicar a regra original ao lado, e isso não foi feito. Faço aqui.
3. **O fato depende da régua (fora do plano).** A régua do plano mede a margem do 1º turno sobre **todos** os votos nominais. Com isso, a virada de cada zona carrega um termo que vem só da redistribuição dos votos dos eliminados. Medindo a margem **só entre os dois finalistas** (a "virada de dois partidos", a régua comum em análise de virada), 2026 volta para o padrão de 2022:
   - zonas em que quem cresceu melhorou: 83,7% (2018), **98,1% (2022)** e **99,05% (2026)**; intervalos de 2022 e 2026 se tocam;
   - desvio ÷ virada nacional: 0,80, **0,40** e **0,43**; também se tocam;
   - em pontos percentuais, a virada de 2026 é **mais** espalhada que a de 2022 (2,42 contra 1,58).
4. **O ponto cego F5 está certo, e é estrutural, não de tamanho de amostra (Fato).** O esperado do plano absorve por álgebra uma troca do 22 para o 13 proporcional ao voto do 22. Somada ao dado, a troca que muda o vencedor (2.215.096 votos) deixa a virada **ainda mais** uniforme (0,21). Tirada do dado, deixaria 2026 com 72,8% das zonas, perto de 2018. Ou seja: o fato B7 é compatível tanto com "eleição limpa e mobilização" quanto com "ano comum mais troca proporcional". B7 não separa as duas.
5. **Há um teste viável com dado público que o plano não previu.** São as seções em que não houve volta de eleitor nem queda de brancos e nulos. Rodei uma versão exploratória (fora do plano): nelas o 13 ainda ganhou **+4,21 p.p.** na margem de dois partidos, contra +5,60 no país. A mobilização explica só parte da virada. O teste não separa troca de conversão real de eleitor, mas mede a explicação política proposta, e ela não passa inteira.
6. **Bruto de PI 0028 e SP 0002 (Fato):**
   - as 15 seções extremas conferidas batem com o arquivo da urna nos dois turnos: BU = RDV = banco;
   - **a descrição de SP 0002 está errada.** O script agrupa o local de votação por município + número do local, sem a zona. Em São Paulo, o número 1546 existe em 13 zonas, e o "local de 133 seções que fica só −0,78 p.p." mistura todos eles. O mesmo erro atinge 9 dos 30 casos (3 do lado do 13);
   - o local de verdade (zona 0002, local 1546, Colégio Equipe) tem **7 seções**, e 6 delas são as extremas. O prédio inteiro virou **18,8 p.p. para o 22**, com **+18,7% de comparecimento** (1.869 → 2.219), contra +4,6% no resto da zona;
   - a "0 falha de integridade" de 4 seções de SP vem de uma verificação que **não rodou** no exportar (erro de leitura "DER: comprimento ausente"). A reverificação nacional, com o certificado cortado, aprova as 4 nos dois turnos.
7. **Frase recomendada:** "Medida pela régua escolhida antes de ver os dados, a virada para o 13 de 2026 foi mais parecida entre as zonas do que as de 2018 e 2022. Com outra régua igualmente razoável (só os dois finalistas), ela fica parecida com a de 2022. Nenhuma zona e nenhuma seção deu ao 13 mais do que o acaso explica. Uma troca de votos do 22 para o 13 espalhada por igual no país não seria vista por nenhum destes testes."

## 1. Reprodução da parte (b) com código próprio (pergunta 1)

`scripts/auditoria/cetico-53-b7.mjs` lê o `votacao_candidato_munzona_<ano>_BR.csv` com `unzip -p`, sem `politico-h26-lib.mjs`, `forense-lib.mjs` nem `contagem-zip.mjs`. Ele soma por município × zona e por zona, tira o exterior e calcula:

- **B7a:** a parte das zonas com virada bruta maior que zero;
- **B7b:** 1,4826 × MAD da virada bruta, dividido pela virada nacional.

A virada bruta, orientada a quem cresceu, é (13 − rival) ÷ (13 + rival) no 2º turno, menos (13 − rival) ÷ nominais no 1º turno, em p.p. É a definição de `estatisticas()` no script do autor.

**Totais conferidos (Fato):**

| | 2018 | 2022 | 2026 |
|---|---|---|---|
| Linhas de presidente no `_BR.csv` | 93.600 | 81.679 | 88.088 |
| Unidades município × zona (com exterior) | 6.240 | 6.283 | 6.292 |
| Zonas nos testes (sem exterior) | 2.644 | 2.636 | 2.640 |
| Virada do 13 no país, com exterior (p.p.) | +6,49 | −3,43 | +5,44 |
| Parte dos eliminados no 1º turno | 24,69% | 8,37% | 7,81% |
| 13 no 1º / 2º turno | 31.342.051 / 47.040.906 | 57.259.504 / 60.345.999 | 53.879.538 / 64.256.232 |
| Rival no 1º / 2º turno | 49.277.010 / 57.797.847 | 51.072.345 / 58.206.354 | 56.104.503 / 59.826.041 |

Os totais de 2026 do 2º turno são os oficiais (margem 4.430.191). O 22 venceu o 1º turno por 2.224.965 votos.

**B7 pela régua do plano (Fato; 5.000 reamostragens; intervalo de 99,58%):**

| | 2018 | 2022 | 2026 | Autor (2026) | Situação |
|---|---|---|---|---|---|
| B7a, % das zonas | 76,25 | 88,69 | **99,43** | 99,43 | igual |
| intervalo, por município (esquema do autor) | [73,69; 78,79] | [86,98; 90,24] | [98,98; 99,79] | [98,98; 99,81] | fora, acima |
| B7b | 0,98 | 0,76 | **0,35** | 0,349 | igual |
| intervalo, por município | [0,85; 1,12] | [0,68; 0,82] | [0,32; 0,38] | [0,32; 0,38] | fora, abaixo |
| Zonas em que quem cresceu **não** melhorou | 628 | 298 | **15** | | |
| Desvio robusto da virada, em p.p. | 6,35 | 2,61 | 1,90 | | |

As pequenas diferenças nos extremos dos intervalos vêm do gerador de números aleatórios, que é outro. Os pontos batem até a quarta casa.

**Nível B não é confirmação independente de B7.** Para B7, o nível B (seção a seção) dá exatamente o mesmo número que o nível A (88,695 e 99,4318 nos dois). Isso não é coincidência: B7 só usa os totais da zona, e a soma das seções é igual à soma do `munzona` (o autor conferiu 0 diferença). A frase "a medida seção a seção dá o mesmo" é verdadeira, mas confere só a fonte (BU do banco × `munzona`), não a robustez da medida.

## 2. O plano foi seguido? (pergunta 2)

### 2.1 Os 7 desvios declarados

| # | Desvio | Parecer |
|---|---|---|
| 1 | Bootstrap por município principal da zona, e não por unidade | **Aceitável e melhor que o do plano** (seção 2.2). Mas a regra 1 do plano manda publicar o resultado da regra original ao lado, e isso faltou. Está na seção 2.2 |
| 2 | Exterior fora da família inteira | Aceitável. O exterior é uma zona só, sem esperado comparável |
| 3 | Poder com intervalo deslocado, "acende" relativo ao dado real, F6 com p.p. crescente | Aceitável para deslocamentos de posição. Para F5 não faz diferença, porque o ponto cego é algébrico (seção 4) |
| 4 | Análise descritiva depois de ver o resultado (`politico-h26-b-uniformidade.mjs`) | Aceitável, declarada e fora da decisão. Não refiz os números dela (precisa do MQ), e eles ficam **não reproduzidos** por mim |
| 5 | Coluna toda zero tirada da regressão da parte (c) | Correto: coluna toda zero deixa a conta sem solução |
| 6 | `round(n/10)` em vez de arredondar para cima | Irrelevante |
| 7 | B4g "entre" os dois anos tratado como sem sinal | Correto. O intervalo de 2026 [1,011; 1,036] fica no vão entre 2018 [0,963; 0,996] e 2022 [1,037; 1,055], a 0,0006 do de 2022. "Maior que o padrão" só faz sentido acima dos dois anos |

**Um desvio não declarado (pequeno):** a decisão de B7 exige que o nível B "não contradiga". Para B7, o nível B não tinha como contradizer, pela identidade da seção 1. Isso deveria estar escrito.

### 2.2 O bootstrap muda a decisão?

`cetico-53-b7.mjs` refaz os intervalos de B7 com os três esquemas (sementes fixas no script):

| Esquema | B7a 2018 | B7a 2022 | B7a 2026 | B7b 2018 | B7b 2022 | B7b 2026 | Decisão |
|---|---|---|---|---|---|---|---|
| P, do plano: unidades município × zona dentro da UF, remontadas em zonas | [73,08; 75,74] | [85,80; 88,10] | [98,37; 99,26] | [0,92; 1,05] | [0,76; 0,83] | [0,35; 0,38] | fora |
| Z: zonas inteiras dentro da UF | [74,37; 78,09] | [87,16; 90,17] | [99,02; 99,81] | [0,91; 1,04] | [0,71; 0,80] | [0,33; 0,37] | fora |
| C, do autor: município principal da zona dentro da UF | [73,69; 78,79] | [86,98; 90,24] | [98,98; 99,79] | [0,85; 1,12] | [0,68; 0,82] | [0,32; 0,38] | fora |

- **A decisão de B7 não muda com o esquema (Fato).**
- **O esquema literal do plano é enviesado:** os intervalos P de B7a não contêm o próprio valor do dado em nenhum dos três anos (76,25, 88,69 e 99,43 ficam fora). Reamostrar unidades soltas muda a composição das zonas. O autor teve razão em trocar.
- **As outras 10 estatísticas não podem virar sinal com outro esquema.** Para isso, o ponto de 2026 teria de estar acima (ou abaixo, para B7b) dos dois anos. Nenhuma está: B1, B4g e B5 ficam entre 2018 e 2022, e B2g, B3g, B6a e B6b ficam abaixo dos dois. Do lado do 22, só B2p (32 contra 23 e 14) tem o ponto acima dos dois; com intervalos mais estreitos, viraria Fato à parte, sem efeito na H26. Isto é argumento pelo ponto, e não refiz os intervalos dessas 10.

## 3. B7 é comparável entre os anos? (pergunta 3; fora do plano)

### 3.1 O que a régua do plano mistura

A margem do 1º turno do plano é (13 − rival) ÷ **todos** os nominais. A margem de dois partidos é (13 − rival) ÷ (13 + rival). As duas se ligam por uma identidade exata:

> virada do plano = virada de dois partidos + margem de dois partidos no 1º turno × parte dos eliminados no 1º turno

**Exemplo.** Numa zona do 1º turno com 13 = 67%, 22 = 25% e eliminados = 8%, suponha que os eliminados se dividam no 2º turno na mesma proporção dos finalistas. Ninguém mudou de lado. Ainda assim, a margem do 13 sobe de 42 p.p. (sobre todos) para 45,7 p.p. (só os dois): a régua do plano registra uma "virada" de +3,7 p.p. a favor do 13. Numa zona em que o 13 tinha 30% e o 22 62%, o mesmo mecanismo registra −2,8 p.p.

Esse segundo termo não tem nada a ver com mudança de preferência. É a diluição dos eliminados, e o sinal dele em cada zona depende de onde cada finalista era forte. Em 2022, quem cresceu (o 22) estava atrás, por muito, nas zonas do Nordeste: lá o termo empurrou a virada do 22 para baixo. Em 2026, quem cresceu (o 13) estava à frente justamente ali.

**Dados do termo mecânico (Fato, `53-b7.json` → `termoMecanico`):**

| | 2018 | 2022 | 2026 |
|---|---|---|---|
| Desvio robusto do termo entre as zonas (p.p.) | 13,37 | 2,65 | 2,74 |
| Correlação do termo com a virada de dois partidos | −0,69 | **−0,29** | **−0,64** |

- Em 2022 e 2026, o termo tem o mesmo tamanho. O que muda é **o quanto ele compensa** a virada de dois partidos.
- Em 2026, ele anda forte na direção contrária (−0,64): onde o 13 ganhou menos entre os dois finalistas, o termo somou mais, e vice-versa. Isso "aplaina" a virada pela régua do plano.
- Em 2022, a compensação foi fraca (−0,29), e o termo mais espalhou do que aplainou.
- É por isso que a régua do plano faz 2026 parecer muito mais uniforme que 2022, e a régua de dois partidos não.

### 3.2 A régua de dois partidos (N1)

| | 2018 | 2022 | 2026 | Situação de 2026 |
|---|---|---|---|---|
| Virada nacional de dois partidos (p.p.) | +11,96 | +3,91 | +5,60 | |
| B7a, % das zonas | 83,66 [81,61; 85,91] | **98,10 [97,23; 98,83]** | **99,05 [98,52; 99,54]** | **dentro** (toca 2022) |
| B7b | 0,80 [0,73; 0,90] | **0,40 [0,37; 0,46]** | **0,43 [0,40; 0,47]** | **dentro** (toca 2022) |
| Desvio robusto em p.p. | 9,55 [8,74; 10,86] | 1,58 [1,47; 1,74] | 2,42 [2,24; 2,60] | entre (2026 mais espalhado que 2022) |
| Zonas em que quem cresceu **não** melhorou | 432 | 50 | 25 | |

Intervalos pelo esquema do autor (C). Os esquemas P e Z dão a mesma situação ("dentro", "dentro", "entre").

**Leitura:**
- Com a margem só entre os finalistas, a virada de 2022 já tinha sido quase tão geral quanto a de 2026 (98,1% contra 99,05%), e um pouco **mais** concentrada em torno da média (0,40 contra 0,43).
- A diferença de 2026 contra 2018 continua nas duas réguas. Mas a regra do plano pede que 2026 saia **dos dois** anos.
- Com essa régua, a parte (b) seria L, e a conclusão pela tabela da seção 7 do plano seria "**sem sinal nos dados públicos**" (porque F5 passa sem ser vista).
- **Isto não derruba o resultado pela regra:** a régua foi fixada antes, por referência ao doc 03, e o plano manda. Mas o fato é **da régua**, não da eleição. O relatório não pode dizer "a virada foi a mais uniforme de que se tem registro" sem dizer que, medida entre os dois finalistas, ela fica como a de 2022.
- A normalização é óbvia, não exótica: é a pergunta do coordenador (2018 com 25% de eliminados, 2022 e 2026 com 8%), e a margem de dois partidos é a régua usual para comparar viradas entre eleições com eliminados de tamanhos diferentes. O próprio autor já tinha a mesma pista no resultado (seção 4.4): a uniformidade está na parte que o 1º turno prevê, e o desvio robusto da virada além do esperado (B1) é normal.

## 4. O ponto cego F5 (pergunta 4)

### 4.1 O cálculo está certo

- **Álgebra (Fato).** O esperado é MQ sem intercepto, com o voto do 22 no 1º turno entre os preditores do 13 e do 22. Uma troca proporcional ao voto do 22 multiplica o 22 por (1 − f) e soma f × 22 ao 13. O MQ absorve isso nos pesos: o peso do 22 sobre ele mesmo cai por (1 − f), e o peso cruzado do 22 sobre o 13 sobe f × (peso do 22). Os resíduos só mudam por um termo de 2f × (resíduo do 22). Nada desloca a média das zonas.
- **Números (Fato):** com f = 2.215.096 ÷ 62,04 milhões = 3,57%, o peso do 22 sobre ele mesmo vai de 1,004 para 0,968, e o peso cruzado sobe cerca de +0,036. O autor dá 0,967 e +0,037.
- **"Visto a partir de 12,7 milhões" (Fato, ressalva de leitura):** a 12,7 milhões (f ≈ 21%), quem acende é a triagem, porque o termo 2f × resíduo engorda a cauda. Não é o teste vendo a troca. A leitura correta é: **nenhum teste do plano vê F5 em nenhum tamanho plausível**.
- **Reprodução direta (Fato, `cetico-53-b7.mjs` → `N3`):**
  - somando a troca de 2.215.096 ao dado real: B7a = 100%, B7b = 0,21, virada nacional +9,02. O autor dá B7b = 0,21;
  - **tirando** essa troca do dado real (o 2026 "limpo" se a troca tivesse acontecido): B7a = 72,8% [70,0; 75,7], B7b = 1,46 [1,20; 1,87], virada nacional +1,86, desvio 2,71 p.p. O B7a fica no padrão de 2018, e o desvio em p.p. fica no de 2022.
  - **Ou seja:** o mesmo fato B7 sai de "mobilização uniforme" ou de "ano comum mais uma troca proporcional que muda o vencedor". B7 não pende para nenhum dos dois.

### 4.2 Um segundo ponto cego que o plano não listou (F7)

A conversão de brancos e nulos do 2º turno em votos do 13, sem mexer no comparecimento. Ela é proporcional ao branco e nulo da seção, que o esperado prevê pelo branco e nulo do 1º turno. Por isso, o MQ a absorve no peso de brancos e nulos sobre o 13, que não está na família.
- Ela produz exatamente a "queda de brancos e nulos" que o autor usa como prova da mobilização (previsão 2: a parte mediana de brancos e nulos foi +3,24 p.p.).
- Tamanho: os brancos e nulos caíram 1.816.000 do 1º para o 2º turno. Sozinha, essa conversão não chega à margem (4.430.191), mas somada a F5 reduz a troca necessária.
- **Recomendação:** acrescentar F7 à lista de formas de poder, e dizer que as previsões 2 e 4 do autor não podem falhar sob F5 nem sob F7. Elas são compatíveis com a mobilização, mas não a testam contra essas alternativas.

### 4.3 Testes com dado público que o plano não previu

| Ideia | Viável? | Separa o quê |
|---|---|---|
| **Seções sem mobilização:** eleitorado estável, comparecimento que não subiu e brancos + nulos que não caíram. Nelas, a volta de eleitor e a queda de branco e nulo não existem por construção | **Sim.** BU por seção nos dois turnos (banco para 2026; `votacao_secao_2022` + `detalhe` para 2022) | Mede quanto da virada a mobilização **não** explica. Não separa troca de conversão real de eleitor, mas a linha de base de 2022 mostra quanto de conversão é normal |
| **Queda de brancos e nulos seção a seção**, dentro da zona: a margem do 13 sobe junto com a queda de brancos e nulos e com a volta de eleitor? | Sim, os mesmos arquivos | Na mobilização, a queda de branco e nulo vai para os dois finalistas conforme a preferência local. Na conversão F7, vai só para o 13 |
| **Comparecimento por seção** com o mesmo desenho | Sim | O mesmo, para a volta de eleitor |
| **Peso cruzado com intervalo:** bootstrap do peso do 22 do 1º turno sobre o 13 do 2º, nos três anos | Sim, o motor do autor já tem tudo | A troca que muda o vencedor exigiria que, sem ela, o peso cruzado de 2026 fosse cerca de −0,078, mais negativo que 2018 (−0,055) e 2022 (−0,017). É indício fraco (pesos ecológicos, dois anos), mas é o único número que olha F5 diretamente |
| **RDV** | **Não separa.** O RDV é escrito pelo mesmo programa que escreve o BU. Uma troca feita dentro da urna sai coerente nos dois. O RDV só pega adulteração do BU depois de fechado (H05) | |
| **Diário da urna (log)** | **Não separa.** O diário registra quando cada eleitor votou e como foi liberado, não em quem votou | |

**Versão exploratória do primeiro teste (Fato; fora do plano; `cetico-53-mobilizacao.mjs`).** A definição foi fixada no cabeçalho do script antes de rodar: |aptos 2º − aptos 1º| ≤ 10, comparecimento 2º ≤ 1º, brancos + nulos 2º ≥ 1º. Exterior fora.

| | 2022 (quem cresceu: 22) | 2026 (quem cresceu: 13) |
|---|---|---|
| Todas as seções: virada de dois partidos | +3,91 (471.010 seções) | +5,60 (497.897) |
| Seções sem mobilização | +4,17 (120.116, 25,5% das seções) | **+4,21** (31.783, 6,4%) |
| Sem mobilização e eliminados ≤ 5% | +3,53 (24.413) | **+3,30** (8.602) |
| Nessas últimas: comparecimento 2º ÷ 1º | 0,975 | 0,962 |
| Nessas últimas: quem cresceu, 2º ÷ 1º | 1,055 | 1,013 |
| Nessas últimas: o outro finalista, 2º ÷ 1º | 0,972 | **0,946** |

- Em 2026, nas seções onde não houve volta de eleitor nem queda de branco e nulo, o 13 ainda ganhou 4,21 p.p. na margem de dois partidos, **75%** da virada do país. A mobilização explica no máximo um quarto da virada. A Hipótese política do autor ("mobilização nacional") fica **incompleta**: o grosso da virada acontece também sem mobilização.
- Uma virada desse tamanho sem mobilização **não é inédita**: em 2022, o 22 ganhou 4,17 p.p. nas seções equivalentes.
- Nas seções com poucos eliminados, o 22 de 2026 perdeu 1,6 p.p. além da queda de comparecimento. O 13 de 2022, na mesma situação, perdeu 0,3 p.p. É diferença pequena, em 1,7% das seções, e a seleção é feita sobre o resultado: uma seção onde o eleitor do 22 ficou em casa cai no grupo justamente por isso. **Não é sinal.** Mostra que o desenho é viável e onde olhar.

## 5. As 4 zonas do lado do 22, no bruto (pergunta 5)

`scripts/auditoria/cetico-53-bruto.mjs` roda `src/exportar.js` nos dois turnos de 15 seções: as 9 extremas de Santo Antônio de Lisboa (PI 11878/0028) e as 6 de São Paulo (SP 71072/0002). O banco serviu para os totais do local de votação.

### 5.1 Santo Antônio de Lisboa (PI 0028)

| Seção | Local | Urna 1º = 2º? | 13 (1º → 2º) | 22 (1º → 2º) | Comparecimento | BU = RDV | Assinaturas |
|---|---|---|---|---|---|---|---|
| 0083 | 1023 | sim | 174 → 161 | 49 → 69 | 244 → 235 | sim | 0 falha (25 e 22 conferências) |
| 0086 | 1023 | sim | 187 → 167 | 52 → 71 | 258 → 244 | sim | 0 falha |
| 0087 | 1023 | sim | 177 → 160 | 61 → 87 | 260 → 251 | sim | 0 falha |
| 0090 | 1031 | sim | 181 → 165 | 67 → 91 | 271 → 263 | sim | 0 falha |
| 0091 | 1031 | sim | 185 → 161 | 62 → 81 | 262 → 248 | sim | 0 falha |
| 0093 | 1031 | sim | 190 → 169 | 61 → 85 | 261 → 258 | sim | 0 falha |
| 0094 | 1031 | sim | 172 → 147 | 56 → 83 | 244 → 238 | sim | 0 falha |
| 0095 | 1040 | **não** (2357680 → 2343140) | 164 → 149 | 52 → 74 | 231 → 227 | sim | 0 falha |
| 0099 | 1066 | sim | **214 → 146** | **56 → 122** | 287 → 273 | sim | 0 falha |

- **Fato:** todos os números do autor batem, inclusive a troca de urna na 0095, único rastro técnico.
- **Fato:** aqui o agrupamento por local está certo (os números de local 1023, 1031, 1040 e 1066 não se repetem em outra zona do município). Os locais inteiros, e não só as seções extremas, viraram para o 22: −13,7, −18,0, −12,6 e −49,6 p.p. na margem de dois partidos, com o comparecimento caindo um pouco. É efeito do município, não de uma urna.
- **Hipótese** (como o autor): efeito político local. Fica sem rastro técnico, pelo princípio 8.

### 5.2 São Paulo (SP 0002): a descrição do autor está errada

- **O erro (Fato):** `politico-h26-a-secoes.mjs`, linha 145, agrupa o local de votação pela chave `uf|municipio|local`. O número do local só é único **dentro da zona**. Em São Paulo, o local 1546 existe em **13 zonas**, com 133 seções no total. A linha "todas no mesmo local de votação (133 seções), que como um todo fica só −0,78 p.p." descreve esse agrupamento errado.
- **O local de verdade (Fato, banco e bruto):** SP 71072, zona 0002, local 1546, "Colégio Equipe" no `detalhe_votacao_secao_2026`. Tem **7 seções**, e 6 delas são as extremas da lista. A sétima (0509) foi para o mesmo lado: 13 de 151 para 174, 22 de 96 para 136.

| Local 1546 da zona 0002 (7 seções) | 1º turno | 2º turno |
|---|---|---|
| Comparecimento | 1.869 | 2.219 (**+18,7%**) |
| 13 | 1.023 | 1.165 (+142) |
| 22 | 584 | 982 (**+398**) |
| Margem de dois partidos do 13 | +27,3 p.p. | +8,5 p.p. (virada **−18,8 p.p.**) |
| Resto da zona 0002 (432 seções): comparecimento | 116.068 | 121.418 (+4,6%) |

- **Bruto (Fato):** nas 6 seções, BU = RDV = banco nos dois turnos, mesma urna nos dois turnos e eleitorado igual.
- **Assinaturas.** Em 4 das 6 (0491, 0501, 0519 e 0539, UE2015), a verificação do `exportar` **não rodou** ("DER: comprimento ausente", defeito de leitura conhecido, pareceres 08 e 15). O script do autor lê `integridade.resultados ?? []`. Quando a verificação dá erro, a lista vem vazia e a seção conta como "0 falha". A afirmação "0 falha de integridade" das 30 seções é, para essas 4, uma verificação que não aconteceu. A reverificação nacional com o certificado cortado no fim do DER (`data/parsed/auditoria/integridade/{1,2}t/reverificacao.jsonl`) **aprova as 4 nos dois turnos**, com o mesmo hash de pacote do 2º turno que o `exportar` leu. A conclusão fica de pé, mas a fonte certa é a reverificação.
- **Leitura corrigida:** o caso de SP é **do prédio inteiro**, com uma alta de comparecimento quatro vezes maior que a do resto da zona, que foi quase toda para o 22. Não é "6 seções soltas num local que, no todo, ficou normal". Sem rastro técnico. **Hipótese:** volta, no 2º turno, de eleitores daquele local que tinham se abstido no 1º (comparecimento de 68% no 1º turno, 81% no 2º).
- **Recomendação:** corrigir a chave do local para `uf|municipio|zona|local` e refazer o item 8 (o "local") dos casos afetados. Isso não muda A1 nem A2, que não usam o local.

### 5.3 Quantos casos o erro do local atinge

`scripts/auditoria/cetico-53-local.mjs` conta, para cada um dos 30 casos, as seções com aquele número de local no município (o que o autor contou) e na zona (o local de verdade). **Fato: 9 dos 30 casos têm o local errado.**

| Caso | Lado | Seções no local, pelo autor | Seções no local de verdade |
|---|---|---|---|
| RJ 58190/0075/0068 (Campos dos Goytacazes) | 13 | 12 | 8 |
| RJ 58190/0129/0094 (Campos dos Goytacazes) | 13 | 23 | 4 |
| SC 81051/0013/0193 (Florianópolis) | 13 | 24 | 20 |
| SP 71072/0002, as 6 seções | 22 | 133 | 7 |

Os outros 21 estão certos, inclusive os de PI 0028, BA 0115 e MA 0032. As colunas "mesmo lado", "além do esperado do local" e "sem esta seção" dos 9 casos errados têm de ser refeitas.

## 6. O veredito final está certo pela regra? (pergunta 6)

- **Pela regra do plano, sim.** (a) L, (b) S por B7, (c) L, e a tabela da seção 7 dá "fato que pede explicação". A conta de B7, os intervalos e a decisão reproduzem com código próprio, nos três esquemas de reamostragem.
- **Ressalvas que têm de acompanhar o veredito:**
  1. B7a e B7b são um fato só (o autor já diz).
  2. O fato é da régua: com a margem só entre os dois finalistas, 2026 fica dentro do padrão de 2022 (seção 3).
  3. O fato não pende para nenhuma explicação: é o que a mobilização produz e também o que a troca F5 produz (seção 4.1).
  4. A explicação política proposta explica só parte da virada (seção 4.3). As quatro "previsões que batem" não podiam falhar sob F5 nem sob F7.
  5. A descrição de SP 0002 está errada, e a de "0 falha de integridade" é, em 4 seções, uma verificação que não rodou (seção 5).
- **Frase em linguagem simples que evita exagero nos dois sentidos:**

> "Comparamos a virada para o 13 de 2026 com as viradas de 2018 e 2022, zona por zona. Pela régua escolhida antes de ver os dados, a de 2026 foi mais parecida entre as zonas: o 13 melhorou em 99 de cada 100 zonas. Isso, sozinho, não indica problema: medida de outro jeito igualmente razoável, comparando só os dois finalistas, ela fica do tamanho da de 2022. Nenhuma zona e nenhuma seção deu ao 13 mais votos do que o 1º turno da própria zona explica. Este teste, porém, tem um limite: uma troca de votos do 22 para o 13 espalhada por igual em todo o país não deixaria marca nele. Essa possibilidade só se examina pela integridade da urna, não por esta comparação."

Evita os dois exageros: não chama a uniformidade de "anomalia" e não diz que a política "explica" a virada.

## 7. O que o autor precisa corrigir

| # | Onde | Problema | Gravidade |
|---|---|---|---|
| 1 | Resultado, seção 2 e `politico-h26-a-secoes.mjs` linha 145 | Chave do local de votação sem a zona: 9 dos 30 casos com o local errado. A descrição de SP 0002 (133 seções, −0,78 p.p.) está errada; o local de verdade tem 7 seções e virou −18,8 p.p. | **Alta para a descrição do caso**; nula para A1 e A2 |
| 2 | Resultado, seção 1, linha "Parte (a): bruto" | "0 falha de integridade" conta como aprovada uma verificação que deu erro (4 seções de SP). Citar a reverificação nacional | Média |
| 3 | Resultado, resposta curta e seção 5 | Falta dizer que B7 depende da régua (seção 3 deste parecer) | **Alta para o relatório** |
| 4 | Resultado, seção 4.3 | "Visto a partir de 12,7 milhões" deve virar "não é visto em nenhum tamanho plausível; a 12,7 milhões acende a triagem por efeito colateral" | Baixa |
| 5 | Resultado, seção 4.4 | As quatro previsões são compatíveis, não testadas contra F5 e F7. Acrescentar F7 e o teste das seções sem mobilização | Média |
| 6 | Resultado, seção 4.1, coluna "Nível B" de B7 | Dizer que, para B7, o nível B é igual ao A por construção | Baixa |
| 7 | Resultado, seção 6, desvio 1 | Publicar o resultado do bootstrap original ao lado, como manda a regra 1 do plano (está aqui, seção 2.2) | Baixa |

## 8. Conferências rodadas

| Script | O que faz | Tempo |
|---|---|---|
| `scripts/auditoria/cetico-53-b7.mjs` | B7 dos três anos direto do zip do `munzona`, bootstrap P, Z e C, régua de dois partidos (N1), termo mecânico e contrafactual F5 (N3) | ~10 min |
| `scripts/auditoria/cetico-53-mobilizacao.mjs` | Totais nacionais do `detalhe` (separação comparecimento × brancos e nulos) e seções sem mobilização em 2022 e 2026 | ~3 min |
| `scripts/auditoria/cetico-53-bruto.mjs` | `src/exportar.js` nos dois turnos de 15 seções de PI 0028 e SP 0002 | ~25 s |
| `scripts/auditoria/cetico-53-local.mjs` | Local de votação dos 30 casos com e sem a zona na chave; totais do local 1546 da SP 0002 (banco de leitura) | segundos |

Saídas em `data/parsed/auditoria/cetico-revisor/`: `53-b7.json`, `53-mobilizacao.json`, `53-bruto.json`, `53-local.json`.

**Separação do aumento dos nominais (Fato; reproduz o autor, seção 4.2):**

| | Comparecimento 1º → 2º | Brancos + nulos | Nominais | Comparecimento ÷ aptos | Brancos e nulos ÷ comparecimento |
|---|---|---|---|---|---|
| 2018 | −1.431.203 | +781.539 | −2.211.996 | 79,67% → 78,70% | 8,79% → 9,57% |
| 2022 | +570.424 | +247.790 | +322.634 | 79,05% → 79,42% | 4,41% → 4,59% |
| 2026 | +2.960.239 | −1.816.000 | +4.776.239 | 78,92% → 80,78% | 4,77% → 3,24% |

Iguais aos do autor. Os nominais de 2026 no 1º turno são 119.306.034 no `detalhe` e 119.300.788 no `munzona`; a diferença de 5.246 é o nº 28, como o autor diz.

**Não refiz:** a parte (c), os números da análise descritiva (`politico-h26-b-uniformidade.mjs`), as outras 10 estatísticas da família e o poder de F1 a F4 e F6. Ficam como estão no resultado do autor, sem segunda verificação.

```bash
node scripts/auditoria/cetico-53-b7.mjs --reps 5000
node --max-old-space-size=8192 scripts/auditoria/cetico-53-mobilizacao.mjs
node scripts/auditoria/cetico-53-bruto.mjs
node scripts/auditoria/cetico-53-local.mjs
```

## 9. Riscos que ficam

- **Linha de base curta.** São só duas eleições, e as duas réguas dão respostas diferentes contra 2022. O `munzona` e o `detalhe` de 2014 diriam qual é a regra e qual é a exceção. **Pendente**, como o autor recomenda.
- **F5 e F7 continuam invisíveis** para qualquer aritmética de resultado. O peso cruzado com intervalo é o único número que olha F5, e ele é ecológico. A barreira de verdade é a integridade da urna (H05, H16 e H25).
- **O teste das seções sem mobilização é exploratório.** A seleção é feita pelo próprio resultado, e o grupo de 2026 é pequeno (6,4% das seções). Para entrar em decisão, precisa de plano pré-registrado, controle por zona e intervalo.
- **A coluna "local" de 9 dos 30 casos** precisa ser refeita com a zona na chave antes de qualquer caso ir para a perícia.
- **SP 0002, Colégio Equipe:** a alta de comparecimento de 68% para 81% num prédio inteiro, quatro vezes a do resto da zona, é o fato a explicar do lado do 22. O diário da urna do 1º turno dessas 7 seções (filas, interrupções, hora de encerramento) não foi olhado.
