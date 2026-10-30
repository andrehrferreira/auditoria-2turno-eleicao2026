# 45. H19, falha de digital induzida (estatístico 20 e 21): revisão cética

Data: 30/10/2026. Revisão de `docs/analysis/estatistico-eleitoral/20-h19-plano.md`, `21-h19-resultado.md`, dos scripts `scripts/auditoria/estatistico-h19-{lib,medidas,analise,exploratorio}.mjs`, das saídas em `data/parsed/auditoria/estatistico/h19/` e da linha H19 de `docs/hipoteses.md`.

Regras seguidas: universo completo; `data/raw` não foi varrido com `find` (só os pacotes das seções, pelo caminho do banco); no máximo 2 processos pesados; sem rede; nenhum CPF e nenhum número de título lido para fora do processo ou gravado (mesários aparecem como M1, M2… por seção). Banco pela cópia de leitura `eleicao2026-20261029T105000.sqlite`. Rótulos: **Fato**, **Estimativa** (sai de modelo), **Hipótese**, **Pendente**, **Recomendação**.

## Vereditos

| Item | Veredito | Motivo curto |
|---|---|---|
| A. Medidas nacionais: falha estável (7,07% → 7,16%), leitor estável, "falha do mesário" em queda (38,6% → 32,3%) | **sustentado com ressalvas** | Reproduzido até a unidade por outro caminho. Ressalva: "falha do mesário" é nome errado. A medida conta liberações **sem mesário identificado**: o dedo que autorizou foi lido, mas não é de mesário registrado. Em boa parte delas o dedo foi lido e **reconhecido** como um dedo já visto no dia |
| B. Parte 1: 112 saltos (39 sobem, 73 descem), 35% com urna trocada | **sustentado** | Igual até a unidade, inclusive as 39 trocadas. Ressalva na leitura de casos: em PR 74993/0159/0009 e BA 36854/0180/0149 o "mesário também falhando" **não** é leitor ruim: o dedo que autorizou foi lido e reconhecido 190 e 203 vezes |
| C. A variação da falha não prevê o voto (99 testes, M1) | **sustentado com ressalvas** | Brasil e regiões iguais até a 2ª casa. Ressalvas: o Brasil Δf fica em z = 3,00 (perto do corte); 26.933 seções sozinhas no prédio e modelo **não são testadas**; falha igual nos dois turnos e falha "sem captura" não são vistas pelo desenho |
| D. O sinal do Sudeste (75 seções, +0,90 ponto, "frágil", cerca de 180 votos) | **sustentado com ressalvas** quanto ao número; **não sustentado** quanto à leitura "compatível com H19" | β = 0,896, z = 3,57 reproduzidos. Mas: (1) medido contra a **própria** seção, e não contra as vizinhas, o sinal some (z = 0,46); (2) sem controles, sem peso ou sem as 14 "emprestadas", o z fica abaixo do corte; (3) o comparecimento das 75 **não subiu** em relação às vizinhas, o que contraria "voto no lugar de ausente"; (4) o argumento "frágil" não vale: um efeito real e homogêneo pareceria igualmente frágil |
| 2. A definição de "falha" pode esconder fraude? | **sustentado com ressalvas** (a definição não esconde da contagem, mas junta coisas diferentes) | A urna exige 4 tentativas antes da liberação manual (3 exceções em 2 turnos). Mas **tentativa não é captura**: uma tentativa pode terminar sem dedo nenhum (tempo esgotado). Há liberações manuais **sem nenhuma digital capturada** (ver seção 2). E qualquer dedo autoriza a liberação: a urna não exige mesário registrado |
| 3. O desenho "contra as vizinhas" cria subida aparente | **sustentado**, e pesa mais do que o doc 21 diz | As 14 "emprestadas" conferem; **todas** têm uma vizinha com queda forte (S↓). Um prédio de MG dá 5 das 75 por causa de uma única vizinha. Sem as 14, z = 2,87 (abaixo do corte) |
| 4. Os 10 casos de maior peso | **nenhum tem perfil claro de falha escolhida**; 2 pedem conferência de campo | 7 com falhas espalhadas o dia todo, intercaladas com eleitores reconhecidos na 1ª tentativa; 2 com falhas em blocos ligados à urna (urna trocada com leitor quase morto; urna de contingência com leitor que alterna entre "ninguém passa" e "todos passam"); 1 emprestada (a falha da própria seção não mudou) |

## Scripts e saídas (caminho próprio)

```
node scripts/auditoria/cetico-45-totais.mjs                                  # totais nacionais direto das leituras do diário (leitor e H08), ~5 s
node --max-old-space-size=8192 scripts/auditoria/cetico-45-sudeste.mjs       # Parte 1, M1, M2, variações, S↑ próprio, aleatorização, mecanismo, ~1 min
node scripts/auditoria/cetico-45-casos.mjs                                   # os 10 casos de maior peso do Sudeste no diário bruto, dois turnos
node scripts/auditoria/cetico-45-casos.mjs --ids pr/74993/0159/0009,ba/36854/0180/0149,ba/36854/0180/0175 --saida casos-doc21.json
node scripts/auditoria/cetico-45-captura.mjs --paralelo 2                    # varredura de todos os diários: capturas reais × tempo esgotado, quem autorizou (~70 min)
node --max-old-space-size=8192 scripts/auditoria/cetico-45-captura-analise.mjs
```

Saídas em `data/parsed/auditoria/cetico/45/`: `totais.json`, `sudeste.json`, `casos.json`, `casos-doc21.json`, `captura/<uf>.jsonl`, `captura-resumo.json`.

Diferenças de caminho em relação ao estatístico:
- os totais nacionais saem direto de `leitor/<uf>.jsonl` e de `h08/<t>t/*.secoes.jsonl`, sem a tabela `medidas.csv.gz`;
- a tabela `medidas.csv.gz` foi conferida **coluna a coluna contra o banco** em todas as 497.897 seções (local, modelo, urna e votos 13 e 22 dos dois turnos): 0 diferença;
- a regressão foi reescrita do zero (eliminação de Gauss-Jordan em vez de Cholesky, outro código de efeito fixo e de erro agrupado). Não importa `estatistico-h19-lib.mjs`;
- o diário bruto foi relido com um contador próprio, que separa **tentativa** de **captura** e identifica **quem autorizou** cada liberação manual (o leitor do doc 08 conta só o maior número da tentativa).

---

## A. Medidas nacionais (Fato)

| | 1º turno | 2º turno | Igual ao doc 21? |
|---|---:|---:|---|
| Pediram digital (reconhecidos + falhas) | 117.993.030 | 120.602.768 | sim |
| Falhas (liberação manual depois das tentativas) | 8.342.240 | 8.632.471 | sim |
| Taxa de falha | 7,070% | 7,158% | sim |
| Tentativas por reconhecido | 1,3694 | 1,3776 | sim |
| Liberação manual sem mesário identificado (H08) | 3.221.798 | 2.791.363 | sim |
| Parte das falhas | 38,62% | 32,34% | sim |
| Liberação manual com mesário identificado | 5.120.426 | 5.841.108 | (não citado) |

- A queda de H é real e vem junto com uma **subida** da liberação com mesário identificado (+720.682). Não é menos liberação: é a mesma liberação, mais vezes com o mesário registrado.
- **Ressalva de nome (Fato, diário bruto).** No caminho manual, depois de "Dado digitado confere", a urna pede "a digital do mesário". O dedo posto ali pode terminar de três formas:
  - "Mesário … habilitou o eleitor": o dedo é de mesário registrado (V3m);
  - "Não encontrou digital coletada em nenhum dos arquivos, vai salvar a digital em novo arquivo": dedo desconhecido, gravado pela primeira vez;
  - "Digital coletada bate com uma digital gravada após o registro inicial de mesário": dedo desconhecido, **já visto** naquele dia.
  As duas últimas formam o "H" do estatístico. Na segunda e na terceira o leitor **leu** o dedo; na terceira ele até **reconheceu** o dedo. Chamar isso de "falha da digital do mesário" sugere defeito do leitor, quando o que o log diz é: **quem autorizou não é mesário registrado**. A urna aceita qualquer dedo para autorizar. Pelo princípio 8, essa é a forma mais fraca de controle, não uma falha técnica. A divisão nacional entre "nova" e "já gravada" está na seção 2.

## B. Parte 1, salto local da falha (Fato)

| | Doc 21 | Reprodução |
|---|---:|---:|
| Seções testadas | 470.478 | 470.478 |
| Corte de Bonferroni | 5,32 | 5,316 |
| Sobredispersão τ² > 0 | 0 UFs | 0 UFs |
| Sobem / descem (Bonferroni) | 39 / 73 | 39 / 73 |
| Com urna trocada | 39 de 112 | 39 de 112 |
| S↑ / S↓ | 315 / 412 | 315 / 412 |
| S↑ do Sudeste | 75 | 75, **a mesma lista** de `sudeste-sup.csv` |
| S↑ com falha própria parada ou em queda (Brasil) | 24 | 24 |
| S↑ com falha própria subindo menos de 5 pontos (Brasil) | 94 | 94 |

As exclusões batem uma a uma (17, 4, 137, 8, 320, 26.933).

**Ressalva na leitura dos casos do doc 21 (Fato, diário bruto dos dois turnos; `casos-doc21.json`).** O doc 21 diz que em PR 0009, BA 0149 e SP 0114 "a digital do mesário também passou a falhar", e que o mais simples é o leitor ruim.

| Seção | Falhas 2º turno | Autorização: mesário registrado / dedo novo / dedo já visto | O que o diário mostra |
|---|---:|---|---|
| PR 74993/0159/0009 | 196 de 209 | 2 / 4 / **190** | O dia todo, desde 08:00, um dedo não registrado, lido e **reconhecido** 190 vezes, autorizou as liberações. Os eleitores não passam (13 reconhecidos no dia). No 1º turno, o mesmo desenho em menor escala: 40 de 54 por dedo já visto |
| BA 36854/0180/0149 | 219 de 319 | 6 / 10 / **203** | Duas urnas no dia: a primeira votou 83 com leitor normal até ~09:45; a urna reserva que entrou às ~10:00 quase não reconhece eleitores, e as liberações passam a ser autorizadas por dedos não registrados, reconhecidos ("já visto"). **Hipótese benigna:** os mesários não foram registrados na urna reserva |
| SP 71218/0340/0114 | 170 de 234 | 6 / **163** / 1 | Aqui sim o leitor não reconhece **nem o dedo que autoriza**: 163 vezes "dedo novo", ou seja, a urna não casou o dedo nem com o dedo que ela mesma tinha gravado minutos antes. Leitor ou casamento de digitais quebrado |

Conclusão: "H sobe quase até F" tem dois desenhos diferentes. **"Dedo novo" toda vez** aponta para leitor que não lê nem o mesário. **"Dedo já visto"** aponta para uma pessoa não registrada como mesário autorizando em série, com leitor que lê o dedo dela. O doc 21 trata os dois como "padrão A, parece sensor". O segundo não é sensor (ou não é só sensor) e, pelo princípio 8, é o desenho de maior risco: autorização em série **sem identificação nominal**. A classificação A × B do exploratório deve separar os dois.

## C. M1: a variação da falha não prevê o voto (Fato, reproduzido)

| Unidade | Δa z | Δf z | Δh z | Placebo Δf z |
|---|---:|---:|---:|---:|
| Brasil | 1,04 | 3,00 | 0,01 | −2,79 |
| Nordeste | 1,37 | 1,38 | −0,96 | −1,52 |
| Norte | 0,81 | 0,61 | −1,60 | −1,40 |
| Centro-Oeste | 2,32 | 1,09 | −0,71 | −0,73 |
| Sudeste | −0,62 | 1,67 | 0,73 | −2,09 |
| Sul | 0,15 | 1,40 | 1,35 | −1,84 |

Igual ao doc 21 na 2ª casa em todas as 18 células e nos placebos. As UFs não foram refeitas uma a uma (o código é o mesmo das regiões; as regiões batem).

**Ressalvas (absolvição falsa):**
1. **26.933 seções (5,4%) não entram em teste nenhum**, por estarem sozinhas no seu prédio com aquele modelo de urna. São justamente os locais pequenos, muitas vezes rurais, de uma seção só. O desenho não diz nada sobre elas. **Pendente:** um teste para elas contra a própria seção e a UF × modelo.
2. **Brasil Δf z = 3,00**, perto do corte, com placebo de sinal oposto (−2,79). A leitura do doc 21 (volta à média do voto do 1º turno) é razoável, mas não foi testada: é suposição.
3. **Falha igual nos dois turnos não aparece** (o desenho usa a diferença). Uma mesa que libera muito nos dois turnos fica invisível aqui. Isso está declarado no plano; é um limite real, não um detalhe.
4. **Liberação sem captura** (seção 2) é contada como falha comum. Se ela crescesse só em certas seções, entraria diluída em Δf.

## D. O sinal do Sudeste (o centro da revisão)

### D.1 Reprodução (Fato)

| Medida | Doc 21 | Reprodução |
|---|---:|---:|
| β S↑ Sudeste (pontos) | +0,90 | +0,896 (erro 0,251) |
| z | 3,57 | 3,57 |
| S↓ Sudeste | −0,07 (−0,37) | −0,073 (−0,37) |
| Placebo do 1º turno | −0,50 | −0,50 |
| Sem urnas trocadas | 3,68 | 3,68 |
| S↑ Brasil / Nordeste / Norte / Centro-Oeste / Sul (z) | 0,64 / −1,67 / −0,92 / 0,76 / −0,01 | iguais |

### D.2 Quanto o sinal depende das escolhas (Estimativa; exploratório)

| Variação (Sudeste, S↑) | β | z | Passa o corte de 3,49? |
|---|---:|---:|---|
| Plano | +0,896 | 3,57 | sim |
| Sem controles (só o efeito fixo do prédio × modelo) | +0,828 | 3,20 | **não** |
| Sem peso (cada seção vale 1) | +0,846 | 3,35 | **não** |
| Erro agrupado por município (em vez de local) | +0,896 | 4,41 | sim |
| Sem as 14 "emprestadas" | +0,773 | 2,87 | **não** |
| As 14 emprestadas tratadas como não S↑ | +0,747 | 2,79 | **não** |
| Sem urnas trocadas | +0,956 | 3,68 | sim |
| **S↑ medido contra a própria seção** (ver item 3) | +0,132 | **0,46** | **não** |

- **Fato:** o plano fixou a especificação antes, e nela o teste passa. Isso vale.
- **Mas** o acerto fica a um passo do corte e cai abaixo dele com escolhas tão razoáveis quanto a do plano. Num conjunto de 105 testes, um acerto que depende da especificação não sustenta a palavra "compatível".

### D.3 Aleatorização (Estimativa; exploratório)

Na escala simples (ΔY da seção menos ΔY ponderado dos pares do prédio), as 75 dão média +0,76 ponto (t = 3,11). Sorteando 75 seções não S↑ do Sudeste, 20.000 vezes, com a mesma mistura de tamanho de prédio:
- a média nula é +0,01;
- a média observada ou maior sai em 0,25% dos sorteios (unilateral). Bicaudal, cerca de 0,5%.
- **Leitura:** fora do acaso para um teste isolado. **Não passa** num corte corrigido para 105 testes (0,05%). O z de 3,57 do modelo depende da aproximação normal do erro agrupado com 75 seções de cauda pesada; o sorteio, que não depende disso, é menos forte.

### D.4 "Frágil" não é argumento (absolvição falsa)

O doc 21 diz que o sinal é frágil porque some sem as 5 a 10 seções de maior peso. Testei se isso distingue falso positivo de efeito real:
- simulei um efeito **real e igual** em todas as 75 (sorteio nulo + o mesmo deslocamento médio observado), 5.000 vezes;
- sem as 10 de maior peso, o t mediano cai para **0,79** (de 10% a 90%: −0,67 a 2,35);
- o observado sem as 10 é **1,19**. Em 63% das simulações de efeito real, o t sem as 10 fica **abaixo** do observado.

**Fato (da simulação):** tirar as maiores contribuições derruba qualquer média de 75 casos com cauda pesada, falsa ou verdadeira. "Some sem as 10 maiores" **não** indica falso positivo. O doc 21 deve tirar esse argumento ou dizer que ele não discrimina. Isso não fortalece o sinal; só tira um apoio falso da conclusão "frágil".

### D.5 O mecanismo da H19 aparece? (Fato quanto à contagem; Estimativa quanto ao β)

A H19 supõe que a falha induzida abre o caminho manual, onde a mesa **põe voto no lugar de ausente**. Isso deixa um rastro obrigatório: **comparecimento a mais**.

| Desfecho (Sudeste, S↑, mesmo modelo do plano) | β (pontos por 100 eleitores) | z |
|---|---:|---:|
| Votos no 13 ÷ eleitores | +1,13 | 2,88 |
| Votos no 22 ÷ eleitores | −0,55 | −2,10 |
| **Comparecimento ÷ eleitores** | **+0,007** | **0,02** |

- Nas 75, o comparecimento variou como nas vizinhas (escala simples: +0,24 ponto, t = 0,89; S↓: +0,03).
- **Leitura:** o sinal é uma **troca** (13 sobe, 22 desce) com o mesmo número de votantes. Voto posto no lugar de ausente aumentaria o comparecimento: para os cerca de 360 votos a mais no 13 que o doc 21 cita (4,8 por seção), o comparecimento teria de subir perto de 1,4 ponto (4,8 votantes a mais em seções de 341 eleitores, em média), e o erro dessa medida é 0,33 ponto. O β observado (+0,007) fica a mais de 4 erros disso. O dado não mostra isso.
- O que sobra compatível: troca de **quem** foi votar (eleitores do 13 que vieram, eleitores do 22 que faltaram), ou troca do voto de quem veio. A primeira é o confundidor declarado no plano. A segunda não passa pela falha da digital.
- **Fato:** soma de E (falhas a mais em relação ao esperado pelos pares) nas 75: +2.465. Variação das falhas das 75: de 1.509 para 3.691.

### D.6 Heterogeneidade (Estimativa)

- Sudeste +0,90 contra o resto do país −0,20 (z da diferença 3,76). A soma dos z² das 5 regiões dá 16,96 com 5 graus de liberdade, mais do que o acaso costuma dar.
- **Leitura:** as regiões não são iguais entre si. Isso **não** é sinal de fraude (o Nordeste vai ao contrário, −0,30), mas impede descartar o Sudeste como puro ruído. Também impede ler o Brasil (0,64) como absolvição.

### Veredito do item D

- **Número:** sustentado. β, z, placebo e "sem trocadas" reproduzem.
- **"Compatível com H19":** não sustentado. O sinal (1) depende de medir a falha contra as vizinhas, e some medindo contra a própria seção; (2) não vem com o rastro obrigatório do mecanismo (comparecimento a mais); (3) cai abaixo do corte sem controles, sem peso, sem as emprestadas e na aleatorização (fica acima com erro por município e sem urnas trocadas).
- **"Frágil":** a conclusão pode ficar, mas o argumento usado (some sem as 10 maiores) não discrimina e deve sair.
- **Fica como:** Hipótese de baixo peso, sem leitura de fraude; o pedido de campo para as seções que pesam continua válido (item 4).

---

## 2. A definição de "falha" pode esconder fraude?

### 2.1 Liberar à mão sem tentar a digital (Fato, universo completo)

- **Pelo caminho manual, não dá para pular as tentativas.** Em 16.974.711 liberações manuais nos dois turnos, só **3** tiveram menos de 4 tentativas (2 no 1º turno e 1 no 2º, todas com 1 tentativa). A urna está configurada com 4 tentativas em todas as 497.897 seções (2 seções do 1º turno sem nenhum pedido de digital no dia).
- **Mas "tentativa" não é "captura".** Cada tentativa termina de um de dois jeitos: "Capturada a digital" (um dedo foi lido e não bateu) ou "Timeout de reconhecimento do dedo" (nenhum dedo foi posto a tempo). Quatro tempos esgotados seguidos abrem o caminho manual **sem nenhuma digital lida**. Leva cerca de um minuto.

**Varredura de todos os diários** (27 UFs, 497.897 seções, 0 erro de leitura; as falhas somam exatamente o mesmo que a leitura do doc 08: 8.342.240 e 8.632.471):

| | 1º turno | 2º turno |
|---|---:|---:|
| Falhas (liberação manual) | 8.342.240 | 8.632.471 |
| com 4 capturas reais | 7.352.344 (88,1%) | 7.474.289 (86,6%) |
| com 3 / 2 / 1 capturas | 483.829 / 201.326 / 132.423 | 538.587 / 240.638 / 166.786 |
| **sem nenhuma captura** (4 tempos esgotados) | **172.318 (2,07%)** | **212.171 (2,46%)** |
| … dessas, autorizadas por mesário registrado | 116.821 | 151.161 |
| Falhas com algum tempo esgotado | 989.894 (11,9%) | 1.158.181 (13,4%) |
| Reconhecidos com algum tempo esgotado (linha de base) | 674.216 de 109.650.790 (0,61%) | 813.820 de 111.970.297 (0,73%) |
| Seções com 10 ou mais liberações sem captura | 120 | 221 |
| Seções com 20 ou mais | 7 | 9 |
| Autorização: mesário registrado | 5.120.439 (61,4%) | 5.841.108 (67,7%) |
| Autorização: dedo novo, sem dono | 1.516.214 (18,2%) | 1.280.004 (14,8%) |
| Autorização: dedo já visto, sem dono | 1.705.586 (20,4%) | 1.511.359 (17,5%) |

- **Fato:** as liberações sem nenhuma digital lida subiram 23% entre os turnos (de 2,07% para 2,46% das falhas). O tempo esgotado também subiu entre os **reconhecidos** (de 0,61% para 0,73%, +20%). A subida é geral, não própria das falhas.
- Por região, a liberação sem captura vai de 1,1% das falhas (Nordeste, 2º turno) a 5,4% (Sul, 2º turno). O Sul tem também o maior tempo esgotado entre os reconhecidos (1,18%). **Hipótese benigna:** dedo frio ou seco que o leitor não detecta. Não testada.
- Maiores casos (2º turno): RS 85316/0007/0017 (34 sem captura em 72 falhas), SP 62936/0344/0060 (34 em 56), SC 81256/0082/0104 (31 em 56). No 1º turno: ES 56995/0053/0316 (47 em 54, todas autorizadas por mesário registrado). **Não conferidos um a um**; vão para a lista de campo.
- As 11 e 6 seções em que o diário não bate com o BU estão incluídas nas somas (são as mesmas do doc 08).

- **Leitura:** a definição do estatístico conta essas liberações como falha comum. Ela não as **esconde** da contagem, mas também não as separa. Uma mesa que libera "sem tentar" deixa o rastro de 4 tempos esgotados, e esse rastro agora está medido seção a seção.
- **Nas 75 S↑ do Sudeste**, as falhas sem captura são poucas e não explicam o salto: 1,9% das falhas no 1º turno e 2,1% no 2º (pares: 1,0% e 1,6%). O salto dessas seções é de falhas com dedo lido.

### 2.2 O caminho "ano de nascimento"

O caminho "sem biometria" (ano de nascimento, sem pedido de digital) fica fora de B. A urna o escolhe pelo cadastro, não o mesário. Se um eleitor **com** biometria aparecer nesse caminho, isso é tema da H02 (BU × cadastro), não da H19. **Não testado aqui.**

### 2.3 Quem autoriza (Fato)

- Qualquer dedo autoriza a liberação manual. O log grava o título só quando o dedo é de mesário registrado.
- A "falha do mesário" do estatístico mistura "dedo novo" e "dedo já visto". Nos casos lidos, o "dedo já visto" em série (PR 0009: 190 vezes; SP 66630/0077/0002: 73; RJ 60011/0162/0164: 54) mostra uma pessoa não registrada autorizando o dia inteiro, com o leitor lendo e reconhecendo o dedo dela.
- "Dedo novo" toda vez numa seção onde os eleitores são reconhecidos normalmente (MG 40150/0064/0005: 43 de 43 no 2º turno e 19 de 20 no 1º) quer dizer que **o dedo que autoriza muda a cada liberação**, ou que o dedo do autorizador nunca é lido igual. **Hipótese:** o próprio eleitor, ou pessoas diferentes, autorizam com outro dedo. Pelo log, não há como saber quem.

### Veredito do item 2

**Sustentado com ressalvas.** A regra "4 tentativas" é cumprida pela urna e não deixa liberar à mão sem passar pelas 4. Mas:
- uma tentativa pode terminar sem dedo nenhum, e há liberações manuais sem nenhuma digital lida;
- quem autoriza pode ser qualquer pessoa: a "falha do mesário" é, na verdade, "autorização sem mesário identificado";
- nenhuma das duas coisas move o sinal do Sudeste, mas as duas devem virar medida própria.

## 3. "Contra as vizinhas" e a subida aparente (Fato)

- **As 14 conferem.** 14 das 75 têm a falha própria subindo menos de 2 pontos; 4 delas com falha própria parada ou em queda.
- **Todas as 14 têm uma vizinha S↓** (queda forte) no mesmo grupo. É o mecanismo descrito no doc 21, sem exceção.
- **Concentração:**
  - MG 41238/0334 (um prédio, 6 seções): **5 S↑**, todas emprestadas, por causa da queda de **uma** vizinha. A falha própria dessas 5 variou entre −1,4 e +1,0 ponto.
  - SP 71579/0324: 3 emprestadas (0096, 0246, 0322). É o município cuja retirada o doc 21 testou.
  - SP 61220/0131: 2; SP 64017/0391: 2.
- Duas emprestadas estão entre as 13 maiores contribuições: MG 41238/0334/0213 (7ª) e SP 71579/0324/0096 (11ª). RJ 60011/0188/0330 (13ª) também é emprestada (falha própria +1,6 ponto num grupo de 2).
- **Sem as 14:** β = +0,77, z = 2,87.
- **Com a definição pela própria seção** (salto da seção contra a variação da UF × modelo, sem olhar os pares; mesmo corte de z ≥ 3 e 5 pontos): 68 seções no Sudeste, só 32 em comum com as 75, β = +0,13 (z = 0,46). Brasil: 245 seções, β = +0,02 (z = 0,11). Nenhuma região passa de |z| = 1,4.

**Veredito: sustentado**, e o efeito é maior do que o doc 21 admite. Não são só 14 seções: o próprio indicador "salto" mistura a seção com as vizinhas. Medido na seção, **não há sinal**. A recomendação 4 do doc 21 (medir contra a própria seção) foi feita aqui e derruba a leitura "compatível com H19".

## 4. Os 10 casos de maior peso do Sudeste (Fato, diário bruto dos dois turnos)

Lista: as 10 primeiras de `sudeste-sup.csv` (maior diferença de ΔY contra os pares). Em todas, as contagens do diário batem com o BU nos dois turnos (votos, por biometria, por dado pessoal, sem biometria). "Autorização" = mesário registrado / dedo novo / dedo já visto. "Em blocos" = teste de sequências com z < −3 (as falhas se juntam no tempo mais do que o acaso).

| # | Seção | Urna | Falhas 1º → 2º (taxa) | Horário das falhas no 2º turno | Autorização no 2º turno (1º turno) | 13 ÷ (13+22), 1º → 2º | Leitura |
|---|---|---|---|---|---|---|---|
| 1 | RJ 60011/0009/0456 | mesma, UE2015 | 24 → 47 (8,2% → 14,8%) | 08:01–17:05, espalhadas, sem blocos; maior sequência 2; intercaladas com reconhecidos na 1ª | 42 / 4 / 1, mesário M1 35 e M2 7 (1º: 3 / 5 / 16) | 31,2% → 39,6% | **Padrão B** (leitor igual, mesário registrado). As 4 tentativas das falhas levaram mediana de 22 s, contra 44 s no 1º turno: menos esforço por eleitor. Não separa mesário apressado de falha escolhida. **Conferir em campo** |
| 2 | SP 71218/0340/0114 | **trocada**, UE2015 → UE2013 | 28 → 170 (15% → 86%) | o dia todo, **em blocos** (sequência de 46); o leitor volta a reconhecer das ~13:30 às ~14:30 e falha de novo | 6 / **163** / 1 | 46,8% → 53,4% | Leitor (ou casamento de digitais) quebrado: não reconhece nem o dedo que autoriza. Não é falha escolhida. O pacote do 2º turno traz também o log da urna do 1º turno (tema da H14) |
| 3 | MG 40150/0064/0005 | mesma, UE2015 | 20 → 43 (8,5% → 17,8%) | 08:03–16:59, espalhadas; mais nas 2 primeiras horas (22 de 43, com 113 dos 294 votos) | 0 / **43** / 0 (1º: 1 / 19 / 0) | 42,2% → 49,3% | Leitor bom para eleitores; o dedo que autoriza é "novo" **toda vez**, nos dois turnos: autorização sem dono repetível. Prática estável da mesa, com o dobro de falhas |
| 4 | SP 64750/0212/0033 | mesma, UE2020 | 4 → 23 (2,5% → 14,1%) | 08:05–16:19, espalhadas | 19 / 1 / 3, M2 16 | 36,3% → 44,2% | 8 das 23 falhas com tempo esgotado em alguma tentativa (19 tempos esgotados), 3 sem nenhuma captura. Proporção acima da média (cerca de 14%). Pequeno, **conferir** |
| 5 | RJ 58033/0092/0025 | mesma, UE2022 | 11 → 36 (4,6% → 14,9%) | 08:29–16:10, espalhadas; mais entre 09h e 11h | 32 / 4 / 0, M1 31 | 29,3% → 37,7% | Padrão B. 8 falhas com tempo esgotado, 1 sem captura |
| 6 | SP 71072/0006/0427 | **urna de contingência** (UE2013), instalada 08:32; a original não votou | 40 → 205 (13,7% → 68,3%) | **em blocos** (sequência de 49): quase todos falham das 08:35 às ~10:40, das ~11:30 às ~14:00 e das ~14:30 às ~15:50; nos intervalos, quase todos passam na 1ª tentativa | 199 / 3 / 3, M1 178 | 56,8% → 62,2% | O perfil mais atípico dos 10. Nos blocos de falha, os poucos reconhecidos precisam de 3 a 4 tentativas (leitor ruim naquela hora). Leitor intermitente da urna reserva, ou sensor obstruído e limpo (mecanismo A). A contagem não separa. **Conferir em campo** (manutenção da urna reserva e ata) |
| 7 | MG 41238/0334/0213 | mesma, UE2022 | 11 → 12 (3,9% → 4,1%) | espalhadas | 12 / 0 / 0 | 33,6% → 40,0% | **Emprestada**: a falha da seção não mudou. Fora do mecanismo |
| 8 | RJ 60011/0162/0164 | mesma, UE2015 | 44 → 71 (15,9% → 24,6%) | 08:02–16:22, espalhadas | 4 / 13 / **54** (1º: 0 / 42 / 2) | 47,3% → 53,0% | Leitor fraco nos dois turnos (metade dos reconhecidos na 1ª). No 2º turno, uma pessoa não registrada autoriza em série |
| 9 | SP 71579/0324/0231 | mesma, UE2015 | 15 → 28 (5,1% → 9,7%) | 08:04–16:06, espalhadas | 0 / 2 / **26** (1º: 0 / 15 / 0) | 46,9% → 53,6% | Leitor bom. No 2º turno, até 2 dedos não registrados autorizam todas as 28 |
| 10 | SP 66630/0077/0002 | mesma, UE2015 | 38 → 78 (16,9% → 32,6%) | 08:04–16:50, espalhadas; mais de manhã | 0 / 5 / **73** (1º: 35 por 3 mesários registrados) | 25,7% → 31,9% | Leitor razoável. No 1º turno, mesários registrados autorizaram; no 2º, até 5 dedos não registrados, reconhecidos 73 vezes. O doc 21 classifica como "padrão A" (parece sensor); o log diz que é **autorização sem identificação**, não sensor |

**Leitura (Hipótese):**
- **Nenhum dos 10 tem o perfil claro de falha escolhida** que o plano descreve (falhas em blocos, leitor normal, um mesário). Os dois casos em blocos (2 e 6) têm o leitor ruim naquele horário e uma urna que não é a do 1º turno.
- **Sete têm falhas espalhadas o dia todo**, intercaladas com eleitores reconhecidos na 1ª tentativa. Esse desenho é o de mais eleitores com dedo difícil **ou** de mesa que desiste rápido. Ele também é compatível com liberação escolhida pessoa a pessoa ao longo do dia. A contagem não separa (princípio 8).
- **Três (8, 9 e 10) mudaram de prática entre os turnos:** no 2º turno, quem autoriza deixa de ser mesário registrado (ou um dedo diferente a cada vez) e passa a ser um dedo não registrado, reconhecido em série. A urna aceita. Isso não prova nada, mas é a brecha que o princípio 8 manda registrar.
- O comparecimento dessas seções subiu pouco (de −2 a +26 votantes), em linha com o conjunto das 75 (seção D.5).

## O que muda no doc 21 e na linha H19 (Recomendação ao coordenador)

1. Trocar "falha do mesário" por "autorização sem mesário identificado" e separar "dedo novo" de "dedo já visto".
2. Corrigir a leitura de PR 74993/0159/0009 e BA 36854/0180/0149: o dedo que autorizou foi lido e reconhecido; não é leitor ruim do mesário. BA 0149 é troca de urna no meio do dia.
3. Tirar "compatível com H19" do Sudeste. Escrever: o teste do plano passa por pouco; medido contra a própria seção, não há sinal; o comparecimento não subiu.
4. Tirar o argumento "some sem as 10 maiores" como prova de fragilidade, ou dizer que ele não discrimina.
5. Acrescentar o que o desenho não vê: as 26.933 seções sozinhas no prédio e a liberação sem captura.
6. Campo (TRE), em ordem: SP 71072/0006/0427 (urna reserva intermitente), RJ 60011/0009/0456 (dobro de falhas, um mesário, tentativas mais rápidas), PR 74993/0159/0009 e as seções com "dedo já visto" em série (quem autorizou), e as seções com muitas liberações sem captura (seção 2).

## Textos para leigos (tópico 14 da perícia)

Sem número de teste, sem nome de agente ou de arquivo. Só entram números de contagem do universo completo.

**14.a Como a urna libera quem não passa na digital (sustentado com ressalvas).**
> Quando a digital do eleitor não é reconhecida, a urna pede de novo, até quatro vezes. Só depois disso o mesário pode liberar o voto: ele digita um dado do eleitor e põe um dedo no leitor para autorizar. Conferimos em todas as urnas do país, nos dois turnos: a urna sempre exigiu as quatro tentativas antes de liberar: das 16.974.711 liberações feitas pelo mesário, só 3 tiveram menos de quatro tentativas. Mas há dois pontos fracos. Primeiro, uma "tentativa" pode terminar sem dedo nenhum, quando o tempo acaba. Assim, é possível chegar à liberação sem que nenhuma digital tenha sido lida. Segundo, o dedo que autoriza pode ser de qualquer pessoa: a urna só registra o nome do mesário quando o dedo é de um mesário cadastrado. Quando não é, ela grava a digital sem dono, e às vezes reconhece o mesmo dedo autorizando dezenas de vezes no dia. É como uma portaria que exige que alguém assine a entrada, mas aceita a assinatura de qualquer um.

> Em todo o país, 172.318 liberações do primeiro turno e 212.171 do segundo foram feitas sem que o leitor lesse dedo nenhum nas quatro tentativas: o tempo de cada tentativa acabou sem o dedo no leitor. Isso é 2,07% e 2,46% das liberações feitas pelo mesário. A subida entre os turnos acompanhou a subida do tempo esgotado também entre os eleitores que acabaram reconhecidos, o que aponta para uma causa geral, não para seções escolhidas. Ainda assim, cada liberação sem digital lida é uma porta aberta, e as seções onde isso se repete muitas vezes merecem conferência.

**14.b A falha da digital mudou entre os turnos? (sustentado).**
> No país inteiro, a parte dos eleitores que não passou na digital ficou praticamente igual nos dois turnos: 7,07% no primeiro e 7,16% no segundo, contando todas as seções. O número de tentativas por eleitor também ficou igual. As urnas mais antigas falham mais, nos dois turnos, no mesmo nível. Entre as liberações feitas pelo mesário, aumentou a parte autorizada por um mesário identificado pelo nome.

**14.c Seções em que a falha mudou muito (sustentado).**
> Em 112 seções, a falha da digital mudou entre os turnos muito mais do que o acaso explica. Em 73 delas a falha caiu e em 39 subiu; em 39 das 112 a urna foi trocada entre os turnos. É o que se espera de leitores que estragam e são trocados, e não de falhas provocadas no segundo turno.

Nota ao redator: 112, 73 e 39 são contagens exatas, mas sobre as 470.478 seções que têm vizinhas comparáveis, e dependem de um corte estatístico. Se o tópico só aceitar contagens sobre todas as seções, usar: "Em pouco mais de uma centena de seções…" não serve (é aproximação); usar a frase sem número: "Em algumas seções, a falha da digital mudou entre os turnos muito mais do que o acaso explica. Nelas, a falha mais caiu do que subiu, e muitas tiveram a urna trocada entre os turnos."

**14.d A falha da digital mexeu no voto? (sustentado com ressalvas).**
> Comparando cada seção com as vizinhas do mesmo prédio e com a mesma urna, a mudança na falha da digital não acompanhou a mudança do voto, em nenhum estado nem região. Houve um único resultado fora do padrão, num grupo de seções do Sudeste em que a falha subiu mais que nas vizinhas. Ele não se confirma quando a subida é medida na própria seção, e nessas seções não foi votar mais gente do que nas vizinhas, o que seria necessário se alguém tivesse votado no lugar de quem faltou. Por isso não o tratamos como indício de fraude. As seções que mais pesam nesse resultado foram lidas uma a uma: em nenhuma as falhas têm o desenho de falha escolhida. Duas tiveram leitor com defeito numa urna que não era a do primeiro turno.

**Pendente (sem número):**
- conferência de campo das seções com leitor intermitente e com autorização em série por dedo sem dono;
- teste das seções que estão sozinhas no seu prédio;
- liberações sem nenhuma digital lida, seção a seção.

**Fica fora do relatório:** o tamanho em votos do sinal do Sudeste (é estimativa de modelo), qualquer z, β ou p, os resultados por variação de modelo, a aleatorização, e a classificação "padrão A × B" do estatístico (mistura dois mecanismos diferentes).
