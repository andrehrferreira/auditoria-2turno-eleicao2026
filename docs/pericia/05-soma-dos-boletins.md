# 5. Soma dos boletins × resultado oficial

## A pergunta

Se somarmos o "placar" de cada urna (o Boletim de Urna), chegamos ao resultado que o TSE divulgou? Ou existe diferença entre o que as urnas registraram e o que foi totalizado?

## Resposta curta

**Fato (2º turno, Presidente):** a soma dos boletins das 499.205 seções que votaram para Presidente é **idêntica** ao resultado oficial publicado pelo TSE. A comparação foi feita **seção por seção**, e nenhuma divergiu.

| | Soma dos boletins das urnas | Resultado oficial do TSE | Diferença |
|---|---|---|---|
| LULA (13) | 64.256.232 | 64.256.232 | 0 |
| FLAVIO BOLSONARO (22) | 59.826.041 | 59.826.041 | 0 |
| Nulos | 2.723.305 | 2.723.305 | 0 |
| Brancos | 1.430.496 | 1.430.496 | 0 |
| Seções com alguma diferença | — | — | **0 de 499.205** |

**Fato (2º turno, Governador):** os votos nominais de Governador no boletim são iguais ao resultado oficial por município e zona (`votacao_candidato_munzona`): 1.026 pares, 0 diferença, e nenhum número com voto no boletim falta no oficial (`scripts/auditoria/verifica-pericia-coerencia-munzona.mjs --turno 2`; [tópico 2](02-coerencia-entre-arquivos.md)).

**Fato (1º turno, todos os cargos, 28 UFs, 499.207 seções com boletim; revisado no [parecer cético 26](../analysis/cetico-revisor/26-h03-1turno-todos-cargos.md), "sustentado com ressalvas"):**

- **Seção a seção:** a soma dos boletins de urna é igual ao resultado oficial em aptos, comparecimento, votos nominais, brancos, nulos e votos de legenda, em todos os cargos (presidente, governador, senador, deputado federal, estadual e distrital): 0 divergência. Para presidente, também candidato a candidato: 0 divergência em 499.206 seções com voto.
- **Zona a zona, candidato a candidato:** o resultado oficial por município e zona é igual ao boletim em todos os candidatos que ele publica. Ele deixa de fora 250 números de candidato, que somam 628.629 votos no boletim.
- **Por estado e cargo (109 totais):** o resultado divulgado fecha com os boletins em todos os campos. Os 628.629 votos desses 250 números, mais 1.912 votos de legenda de 4 partidos ausentes, somam 630.541 e são exatamente o **"nulo técnico"** publicado (explicado abaixo).
- **Onde essa classificação pesa:** no governo do RJ, o eleito no 1º turno (nº 22) teve 4.271.199 de 8.394.627 votos válidos (50,880%). Os 274.411 votos do nº 10, classificados como nulo técnico, são mais que os 147.771 votos válidos a mais que tirariam essa maioria. Com eles, o nº 22 teria 49,270%.

**Limite:** isso mostra que os arquivos publicados pelo TSE concordam entre si. A conferência das assinaturas digitais dos boletins do 1º turno ainda não foi feita (**Pendente**, em andamento), e sem ela o teste não alcança alteração feita no próprio boletim. No 2º turno, essa conferência foi feita nas 499.207 seções, com 0 falha ([tópico 1](01-integridade-e-estrutura-dos-arquivos.md)).

**Pendente (sem número):** assinatura dos boletins do 1º turno; situação e data da decisão sobre o registro do candidato nº 10 ao governo do RJ e dos demais números excluídos; auditoria da consulta popular de PE; voto por candidato e por seção nos cargos que não são presidente. Ver "Próximos passos".

## Termos usados neste tópico

| Termo | Em palavras simples |
|---|---|
| **Voto nominal** | Voto digitado no número de um candidato |
| **Voto de legenda** | Voto digitado só no número do partido, nos cargos de deputado. Conta para o partido, não para um candidato |
| **Votos válidos** | Os votos que entram na conta do resultado: nominais e de legenda que valem. Brancos e nulos ficam fora |
| **Maioria absoluta** | Mais da metade dos votos válidos. Para governador e presidente, quem passa disso no 1º turno é eleito sem 2º turno |
| **Nulo técnico** | Voto dado na urna a um número de candidato (ou de partido) que o resultado oficial não conta como válido, porque esse candidato não aparece na lista de candidatos do resultado. A urna registrou o voto no número normalmente; a totalização o põe fora dos válidos. É diferente do nulo comum, em que o eleitor digita um número que não existe na urna |
| **Anulado sub judice** | Voto dado a candidato cujo registro ainda está em discussão na Justiça no dia da totalização. Também fica fora dos válidos, mas pode voltar a valer se a Justiça decidir a favor do candidato |
| **Divulgação** | O resultado oficial que o TSE publica em `resultados.tse.jus.br`, com um arquivo por estado e cargo |
| **Dados abertos** | Os arquivos de resultado que o TSE publica no portal de dados abertos: por seção (`detalhe_votacao_secao` e `votacao_secao`) e por município e zona (`votacao_candidato_munzona`) |

## O que foi comparado

- **De um lado:** o boletim de cada urna, lido diretamente do arquivo que o TSE publica (o arquivo que a urna grava e assina). As impressões digitais desses arquivos foram refeitas em todas as seções, nos dois turnos ([tópico 0](00-coleta-completa.md)). A conferência dos lacres (assinaturas digitais) foi feita em todas as 499.207 seções do 2º turno, com 0 falha; a do 1º turno está **Pendente**, em andamento ([tópico 1](01-integridade-e-estrutura-dos-arquivos.md)).
- **Do outro, quatro produtos oficiais do TSE:**
  1. **votação por seção** (`votacao_secao_2026_BR.csv`, gerado em 26/10/2026 às 12:07): voto de cada candidato a presidente em cada seção. O arquivo só traz presidente;
  2. **detalhe por seção** (`detalhe_votacao_secao_2026`): seis totais de cada seção e cargo (aptos, comparecimento, nominais, brancos, nulos, legenda), todos os cargos;
  3. **votação por município e zona** (`votacao_candidato_munzona_2026`): voto de cada candidato em cada zona, todos os cargos;
  4. **divulgação**: os 109 arquivos de resultado por estado e cargo do 1º turno (27 estados × cargos estaduais, mais presidente no país).

Para cada seção, zona ou estado, cada número foi comparado com o do outro lado. Somar só o total do país poderia esconder erros que se compensam (um a mais aqui, um a menos ali). A comparação em cada nível não deixa isso passar.

## O que foi encontrado

### 1. 2º turno: Presidente seção a seção, Governador por zona

Ver a resposta curta acima. Caso conferido: AC, Bujari, zona 9, seção 3, com LULA 81 e FLAVIO BOLSONARO 146 no boletim, no registro dos votos e no resultado oficial.

### 2. 1º turno: quais seções entraram

**Fato (parecer 26, item 1).** O 1º turno tem 499.248 seções: 499.207 com boletim e 41 sem arquivo, todas do exterior, que não foram instaladas (comparecimento 0 no resultado oficial). Em cada um dos 27 estados, o número de seções com boletim é igual ao de seções totalizadas na divulgação; no país, a divulgação de presidente traz 499.248 seções, 499.207 totalizadas e 41 não instaladas. Tabela por UF: [graficos/dados/h03-1t-universo-por-uf.csv](graficos/dados/h03-1t-universo-por-uf.csv).

Ficaram fora da comparação, com motivo:

| O que ficou fora | Quantas | Por quê |
|---|---:|---|
| Seções do exterior sem arquivo | 41 | Não instaladas: não têm boletim; o resultado oficial também mostra comparecimento 0 |
| Seção sem nenhum voto | 1 (exterior, município 29564, zona 0001, seção 0091) | Urna de contingência com comparecimento 0, nos dois lados. Por isso são 499.206 seções com voto para presidente, e não 499.207 |
| Consulta popular em PE (eleição 6261) | 10 seções, 2.445 votantes | Não é cargo: é uma consulta à população, publicada fora da divulgação de cargos. Fica sem auditoria contra referência oficial (**Pendente**) |

### 3. 1º turno: seção a seção, os seis totais de cada cargo

**Fato (parecer 26, item 2).** O detalhe por seção tem 2.490.836 linhas (seção × cargo). Todas as linhas com boletim são iguais ao boletim nos seis totais:

| Cargo | Seções no oficial | Iguais ao boletim nos 6 totais | Com diferença | Comparecimento | Nominais | Brancos | Nulos | Legenda |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Presidente | 499.248 | 499.207 | 0 | 125.275.835 | 119.306.034 | 2.300.798 | 3.669.003 | 0 |
| Governador | 497.897 | 497.897 | 0 | 124.768.485 | 112.197.244 | 5.067.116 | 7.504.125 | 0 |
| Senador | 497.897 | 497.897 | 0 | 124.768.485 | 207.632.159 | 18.678.856 | 23.225.955 | 0 |
| Dep. federal | 497.897 | 497.897 | 0 | 124.768.485 | 110.670.045 | 6.445.372 | 4.214.631 | 3.438.437 |
| Dep. estadual | 490.928 | 490.928 | 0 | 122.950.564 | 104.458.295 | 6.872.914 | 4.415.140 | 7.204.215 |
| Dep. distrital | 6.969 | 6.969 | 0 | 1.817.921 | 1.628.400 | 77.934 | 39.956 | 71.631 |

- As 41 linhas de presidente sem boletim são as 41 seções não instaladas do exterior.
- Nenhuma seção com boletim falta no oficial.
- Senador tem quase o dobro de votos nominais porque, em 2026, havia duas vagas de senador em cada estado (2 eleitos em cada uma das 27 UFs, parecer 26), e cada eleitor votou em dois nomes.
- Os totais são iguais dos dois lados. Os valores acima são os do oficial, e a soma dos tipos de voto do boletim (nominal, legenda, branco, nulo), recontada pelo revisor, dá os mesmos números. Dados: [graficos/dados/h03-1t-detalhe-por-cargo.csv](graficos/dados/h03-1t-detalhe-por-cargo.csv).

**Fato (parecer 26, item 2).** Para presidente, o arquivo de votação por seção foi comparado candidato a candidato: 499.206 seções com voto dos dois lados, nenhuma só de um lado, e 0 divergência nos 13 candidatos, nos brancos e nos nulos. Para os outros cargos, o TSE não publica esse arquivo por seção e candidato no conjunto lido (o arquivo de 2026 traz só presidente); para eles, a seção é conferida nos seis totais e o candidato, por zona.

### 4. 1º turno: zona a zona, candidato a candidato

**Fato (parecer 26, item 3).** Na votação por município e zona, todos os candidatos que o oficial publica têm o mesmo voto do boletim, em todas as zonas. A única diferença é de um tipo só: **números de candidato com voto no boletim e sem nenhuma linha no oficial**. Nenhum número tem valores diferentes dos dois lados, e nenhum número aparece só no oficial.

| Cargo | Números sem linha no oficial | Votos desses números no boletim |
|---|---:|---:|
| Presidente | 1 | 5.246 |
| Governador | 9 | 342.427 |
| Senador | 8 | 221.990 |
| Dep. federal | 127 | 48.241 |
| Dep. estadual | 102 | 10.238 |
| Dep. distrital | 3 | 487 |
| **Total** | **250** | **628.629** |

**Fato (parecer 26, item 3, conferência independente).** O revisor comparou esses 250 números com os números que faltam na divulgação (o outro produto oficial). São os mesmos 250, com os mesmos 628.629 votos. Os dois produtos do TSE omitem exatamente os mesmos números.

### 5. 1º turno: o total de cada estado e cargo, e o "nulo técnico"

**Fato (parecer 26, item 4).** Os 109 arquivos da divulgação (27 estados × cargos estaduais, mais presidente no país) foram comparados com a soma dos boletins. Cada voto do boletim foi posto no destino que a própria divulgação dá ao candidato ou ao partido (válido, válido de legenda, anulado, anulado sub judice). O voto de número ou partido que não está na divulgação foi posto em "nulo técnico". Resultado: **109 de 109 totais iguais nos 11 campos**, sem nenhum voto sem destino.

| Campo da divulgação | Totais iguais | Soma dos 109 totais (boletim = oficial) |
|---|---:|---:|
| Brancos | 109/109 | 39.442.990 |
| Nulos digitados | 109/109 | 43.068.810 |
| Nominais válidos | 109/109 | 653.791.525 |
| Legenda válida | 109/109 | 10.719.351 |
| Anulados | 109/109 | 71.059 |
| Anulados sub judice | 109/109 | 1.393.984 |
| **Nulo técnico** | **109/109** | **630.541** |
| Válidos | 109/109 | 664.510.876 |
| Total de votos | 109/109 | 749.118.260 |

Aptos e comparecimento também fecham nos 109. A soma dos totais junta todos os cargos, então cada eleitor aparece uma vez por cargo em que votou. Os 109 totais, campo a campo: [graficos/dados/h03-1t-fechamento-uf-cargo.csv](graficos/dados/h03-1t-fechamento-uf-cargo.csv).

**De onde vem o nulo técnico (Fato, parecer 26, item 5).** Em cada um dos 109 totais, o nulo técnico publicado é exatamente a soma, no boletim, dos votos dos números de candidato que faltam na divulgação mais os votos de legenda dos partidos que faltam. A conta fecha sem sobra. Há nulo técnico em 63 dos 109 totais.

| Cargo | Totais (estado × cargo) | Com nulo técnico | Nulo técnico | Votos em números de candidato | Votos de legenda | Números | Legendas |
|---|---:|---:|---:|---:|---:|---:|---:|
| Presidente (país) | 1 | 1 | 5.246 | 5.246 | 0 | 1 | 0 |
| Governador | 27 | 7 | 342.427 | 342.427 | 0 | 9 | 0 |
| Senador | 27 | 6 | 221.990 | 221.990 | 0 | 8 | 0 |
| Dep. federal | 27 | 25 | 50.153 | 48.241 | 1.912 | 127 | 4 |
| Dep. estadual | 26 | 23 | 10.238 | 10.238 | 0 | 102 | 0 |
| Dep. distrital | 1 | 1 | 487 | 487 | 0 | 3 | 0 |
| **Total** | **109** | **63** | **630.541** | **628.629** | **1.912** | **250** | **4** |

![Votos contados como nulo técnico no 1º turno, por cargo](graficos/h03-nulo-tecnico-por-cargo.svg)

**Como ler:** cada barra é um cargo, e o comprimento é a quantidade de votos que estão no boletim da urna mas que o resultado oficial conta como nulo técnico. Entre parênteses, quantos números de candidato (e de legenda) há em cada cargo. Governador e senador concentram quase todo o total, com poucos números cada; os deputados têm muitos números, cada um com poucos votos.

**Os números de presidente, governador e senador, um a um (Fato):**

| Estado e cargo | Número | Votos no nulo técnico |
|---|---|---:|
| País, presidente | nº 28 | 5.246 |
| RJ, governador | nº 10 | 274.411 |
| SE, governador | nº 22 e nº 45 | 31.852 + 1.343 = 33.195 |
| SP, governador | nº 29 | 22.370 |
| DF, governador | nº 55 | 8.456 |
| RN, governador | nº 50 e nº 29 | 2.151 + 227 = 2.378 |
| TO, governador | nº 35 | 1.027 |
| PB, governador | nº 27 | 590 |
| SP, senador | nº 300 e nº 290 | 120.575 + 10.434 = 131.009 |
| AM, senador | nº 181 | 57.518 |
| PE, senador | nº 355 | 18.179 |
| DF, senador | nº 555 | 6.323 |
| PI, senador | nº 333 e nº 338 | 4.330 + 1.858 = 6.188 |
| MS, senador | nº 365 | 2.773 |

![Nulo técnico nos cargos de presidente, governador e senador](graficos/h03-nulo-tecnico-majoritarios.svg)

**Como ler:** cada barra é um estado e um cargo em que houve nulo técnico; entre parênteses, o número do candidato sem linha própria no resultado oficial. A barra do governo do RJ é a maior, com 274.411 votos de um só número. Os estados que não aparecem não têm nulo técnico nesses três cargos.

**Legendas de partido que faltam na divulgação (Fato):** todas de deputado federal. PB, partido 70: 304 votos. SE, partido 25: 309. SE, partido 77: 126. SP, partido 29: 1.173.

**Por estado, todos os cargos (Fato).** Votos no nulo técnico. O presidente tem um só total, do país: 5.246 votos (nº 28), em 499.207 seções.

| UF | Seções com boletim | Governador | Senador | Dep. federal | Dep. estadual (DF: distrital) |
|---|---:|---:|---:|---:|---:|
| AC | 2.270 | 0 | 0 | 45 | 19 |
| AL | 7.101 | 0 | 0 | 0 | 61 |
| AM | 8.157 | 0 | 57.518 | 733 | 0 |
| AP | 1.914 | 0 | 0 | 37 | 95 |
| BA | 35.476 | 0 | 0 | 2.724 | 754 |
| CE | 23.765 | 0 | 0 | 2.544 | 145 |
| DF | 6.969 | 8.456 | 6.323 | 139 | 487 |
| ES | 9.844 | 0 | 0 | 259 | 293 |
| GO | 15.686 | 0 | 0 | 2.307 | 631 |
| MA | 18.093 | 0 | 0 | 76 | 0 |
| MG | 52.062 | 0 | 0 | 4.047 | 2.154 |
| MS | 7.106 | 0 | 2.773 | 5 | 157 |
| MT | 8.287 | 0 | 0 | 0 | 31 |
| PA | 20.827 | 0 | 0 | 53 | 59 |
| PB | 10.712 | 590 | 0 | 873 | 0 |
| PE | 21.418 | 0 | 18.179 | 1.327 | 316 |
| PI | 10.225 | 0 | 6.188 | 674 | 31 |
| PR | 27.142 | 0 | 0 | 71 | 120 |
| RJ | 37.675 | 274.411 | 0 | 24.223 | 2.242 |
| RN | 8.115 | 2.378 | 0 | 126 | 710 |
| RO | 4.698 | 0 | 0 | 243 | 58 |
| RR | 1.519 | 0 | 0 | 258 | 11 |
| RS | 27.547 | 0 | 0 | 358 | 983 |
| SC | 17.326 | 0 | 0 | 746 | 498 |
| SE | 5.923 | 33.195 | 0 | 1.352 | 273 |
| SP | 103.656 | 22.370 | 131.009 | 6.910 | 503 |
| TO | 4.384 | 1.027 | 0 | 23 | 94 |
| **Total** | | **342.427** | **221.990** | **50.153** | **10.725** |

O total da última coluna soma os 10.238 votos de deputado estadual com os 487 de deputado distrital (DF). Em todas as 108 células acima e no total de presidente, o nulo técnico oficial é igual à soma dos números ausentes no boletim.

![Nulo técnico nos cargos de deputado, por estado, 1º turno](graficos/h03-nulo-tecnico-deputados-por-uf.svg)

**Como ler:** cada estado tem duas barras: a azul é deputado federal, a laranja é deputado estadual (no DF, distrital). O comprimento é a quantidade de votos no nulo técnico. Quase todos os estados têm algumas dezenas ou centenas de votos; a barra que se destaca é a do RJ, deputado federal, em que um só número (nº 7062) tem 23.684 dos 24.223 votos.

A lista completa dos 254 itens (250 números de candidato e 4 legendas), com estado, cargo e votos no boletim, está em [graficos/dados/h03-1t-numeros-nulo-tecnico.csv](graficos/dados/h03-1t-numeros-nulo-tecnico.csv); um resumo por estado e cargo, em [h03-1t-nulo-tecnico-uf-cargo.csv](graficos/dados/h03-1t-nulo-tecnico-uf-cargo.csv).

**Casos conferidos no arquivo original da urna (Fato).** Nos três casos abaixo, o voto está no boletim gravado (`bu.dat`), o boletim impresso da mesma urna (`imgbu.dat`) lista o candidato com o número, e o banco da auditoria tem o mesmo valor. Ou seja, o candidato estava na urna; o que muda é só a classificação na totalização.

| Seção (UF, município/zona/seção) | Cargo e número | Votos | Quem conferiu |
|---|---|---:|---|
| SE 31038/0003/0001 | governador, nº 22 | 4 | revisor cético (parecer 26) |
| RJ 60011/0023/0100 | deputado federal, nº 7062 | 3 | revisor cético (parecer 26) |
| SP 63053/0037/0095 | senador, nº 300 | 36 | matemático forense ([doc 06](../analysis/matematico-forense/06-h03-1turno-todos-cargos.md)), reproduzido no parecer 26 |

**Hipótese.** Pela forma como a divulgação separa os destinos, o nulo técnico corresponde a candidatura excluída (registro negado, cancelado ou renunciado) sem recurso pendente; com recurso pendente, o voto iria para "anulado sub judice". O motivo e a data de cada exclusão não estão nos arquivos públicos lidos: no arquivo de candidatos do TSE, o campo da situação da candidatura vem preenchido com "#NE" em todas as linhas, sem a informação. **Pendente.**

### 6. Onde a classificação pesa: governo do RJ e do DF

**Fato (parecer 26, item 6), RJ, governador.** No resultado oficial, o nº 22 teve 4.271.199 de 8.394.627 votos válidos, isto é, 50,880%, e foi eleito no 1º turno. A maioria absoluta exige mais da metade dos válidos. Se houvesse 147.771 votos válidos a mais, de outros candidatos, o nº 22 ficaria com exatamente a metade e deixaria de ter a maioria (4.271.199 × 2 − 8.394.627 = 147.771). O nº 10 tem 274.411 votos no boletim, classificados como nulo técnico, mais do que esses 147.771. Somando esses votos aos válidos, seriam 8.669.038 válidos, e o nº 22 teria 49,270%.

![Governo do RJ, 1º turno: a conta da maioria absoluta](graficos/h03-rj-governador-maioria.svg)

**Como ler:** a parte A mostra a fatia do nº 22 nos votos válidos, com a linha tracejada na metade (50%). No ponto de cima, a conta oficial (50,880%, acima da metade). No de baixo, a mesma conta com os votos do nº 10 somados aos válidos (49,270%, abaixo da metade). A escala vai de 48% a 52% para a diferença aparecer; por isso o gráfico usa pontos, não barras. A parte B compara, a partir do zero, quantos votos válidos a mais bastariam para tirar a maioria (147.771) com os votos do nº 10 (274.411). **É só aritmética com números oficiais.** Não diz qual deveria ter sido o resultado: isso depende de os votos do nº 10 deverem ou não valer, isto é, de o registro dele estar em ordem no dia da eleição, o que está **Pendente**.

**Fato (parecer 26, item 6a), DF, governador.** O líder (nº 11) teve 825.530 de 1.651.394 votos válidos (49,990%): faltaram 168 votos para a maioria absoluta, e houve 2º turno. O DF também tem nulo técnico de governador: o nº 55, com 8.456 votos. Somar esses votos aos válidos só aumenta o total de válidos, e com isso o líder ficaria mais longe da maioria, não mais perto.

**Fato (parecer 26, item 4), o que o teste não decide.** Anulados (71.059), anulados sub judice (1.393.984) e nulo técnico (630.541) somam 2.095.584 votos que saem dos válidos por uma decisão tomada por pessoas sobre o registro de um candidato ou partido. O teste mostra que essa decisão foi aplicada da mesma forma em todos os arquivos do TSE. Não mostra que ela estava certa, nem quando foi tomada.

## Prova de que o teste funciona (contraprova)

- **A junção é completa:** uma seção, zona ou número que existisse só no boletim, ou só no oficial, conta como divergência. Isso aparece nos dados: as 41 seções não instaladas surgem como "linha do oficial sem boletim", e os 250 números omitidos surgem como "boletim com voto, oficial sem linha". O teste enxerga o que falta de um lado.
- **O teste acusou diferenças reais de leitura e elas foram explicadas uma a uma.** Na primeira execução, o script do 1º turno apontou três diferenças, todas erro de leitura da própria auditoria: (1) somava a consulta popular de PE à eleição estadual (a diferença de 13 aptos é exatamente a soma dos eleitores em trânsito dessas 10 seções); (2) esperava um campo de legenda que os arquivos de presidente, governador e senador não têm (nesses cargos não há voto de legenda no boletim); (3) confundia "eleito" com "vai ao 2º turno". O revisor conferiu as três correções e concluiu que elas não escondem outro problema (parecer 26, item 7).
- **Conferência independente:** o revisor refez as contas com outro programa. Tirou os votos de cada partido do boletim, e não do arquivo oficial, e comparou a lista de números omitidos dos dados abertos com a da divulgação. Os números saíram iguais aos do autor (parecer 26, itens 3 a 6).
- **Teste automático do banco:** em `test/banco.test.js`, um valor oficial alterado de propósito (143 votos onde o boletim tem 144) e uma seção que só existe no oficial **são** apontados como divergência.

## Um caso que parecia estranho

**Fato:** algumas seções aparecem no site de resultados com a situação "Recebida", e não "Totalizada". Quantas são no país inteiro: **Pendente: em verificação** (a lista oficial com a situação de cada seção ainda está sendo baixada; ver [tópico 0](00-coleta-completa.md)).

**Fato:** como a comparação de presidente do 2º turno cobre **todas** as seções que votaram para Presidente, essas seções "Recebida" estão incluídas nela: estão no resultado oficial e os votos de Presidente são **iguais** aos do boletim da urna.

**Hipótese:** a situação "Recebida" se refere ao pacote completo de arquivos da urna (diário, registro dos votos), e não ao boletim, que já estava totalizado. Seja qual for o motivo, não há diferença de votos.

## O que este resultado prova e o que não prova

- **Prova:** nos dois turnos, o resultado oficial é exatamente a soma dos boletins de urna publicados, nos níveis comparados (2º turno: presidente por seção e governador por zona; 1º turno: todos os cargos por seção nos seis totais, por zona e candidato, e por estado e cargo). Nenhum voto foi somado, tirado ou trocado **entre o boletim de cada seção e o resultado oficial**. A única diferença do 1º turno é de classificação (o nulo técnico), e ela fecha voto a voto.
- **Que cada boletim publicado é o que a urna gravou** depende da conferência das assinaturas digitais. No 2º turno ela foi feita nas 499.207 seções, com 0 falha ([tópico 1](01-integridade-e-estrutura-dos-arquivos.md)). No 1º turno está **Pendente**: até lá, o resultado do 1º turno prova coerência entre arquivos publicados pelo TSE (boletim, detalhe por seção, votação por seção, votação por zona e divulgação), e não prova que os boletins publicados são os que as urnas assinaram.
- **Os campos não são testes independentes.** Na divulgação, total = válidos + brancos + nulos + nulo técnico + anulados + anulados sub judice. Se os outros campos fecham, o nulo técnico fecha por conta. O que a identidade do nulo técnico acrescenta é mostrar de onde ele vem (números e legendas ausentes, sem sobra).
- **Não prova** que a decisão de excluir cada candidato estava certa, nem quando foi tomada (ver item 6).
- **Não prova** que os votos registrados pelas urnas são todos legítimos. Se alguém votou no lugar de outra pessoa (por exemplo, com liberação sem biometria), esse voto está no boletim **e** no resultado oficial, e os dois batem. Essa possibilidade é examinada no tópico 4, "Como os eleitores foram liberados para votar".
- Se a reclassificação dos outros números mudaria alguma vaga de deputado ou de senador é uma conta feita sobre uma suposição (a de que esses votos deveriam valer) e fica fora deste relatório; está em [matematico-forense/06](../analysis/matematico-forense/06-h03-1turno-todos-cargos.md).

## Como repetir

```
node src/banco.js --turno 2 --oficial      # carrega boletins e resultado oficial no banco (doc 09)
node scripts/h03-bu-x-oficial.mjs 2        # 2º turno: compara e lista qualquer seção divergente
node scripts/auditoria/verifica-pericia-soma-boletins.mjs   # 2º turno: conferência independente, lê o CSV oficial direto do zip

# 1º turno, todos os cargos (parecer cético 26)
node --max-old-space-size=16000 scripts/auditoria/contagem-secao-presidente.mjs --turno 1   # presidente por seção e candidato
node --max-old-space-size=24000 scripts/auditoria/contagem-detalhe.mjs --turno 1            # seis totais por seção e cargo
node --max-old-space-size=24000 scripts/auditoria/contagem-munzona.mjs --turno 1            # candidato por município e zona
node --max-old-space-size=8000  scripts/auditoria/matematico-h03-1turno.mjs                 # 109 totais e nulo técnico
node --max-old-space-size=8000  scripts/auditoria/cetico-h03-1turno.mjs                     # conferência independente do revisor
node scripts/auditoria/cetico-numeros-omitidos-munzona-bruto.mjs data/raw/1t/urnas/se/31038/0003/0001/<hash>/ Governador 22   # caso no arquivo da urna

# tabelas e gráficos deste tópico (só leem as saídas acima e conferem as somas)
node scripts/auditoria/grafico-h03-dados.mjs
node scripts/auditoria/grafico-h03.mjs
```

Saídas: `data/parsed/auditoria/matematico/h03-1t-*` (fechamento, omitidos, efeito, universo), `data/parsed/auditoria/contagem/*-1t-*` e `data/parsed/auditoria/cetico/h03-1t-cetico*`. Banco: cópia de leitura de 29/10/2026, 10h50 UTC.

## Próximos passos

- **Pendente:** conferência das assinaturas digitais dos boletins do 1º turno (em andamento; [tópico 1](01-integridade-e-estrutura-dos-arquivos.md)). Sem ela, o resultado do 1º turno não alcança alteração feita no próprio boletim.
- **Pendente:** situação e data da decisão sobre o registro do candidato nº 10 ao governo do RJ, e dos demais números excluídos (em especial governador de SE nº 22 e de SP nº 29, senadores de SP nº 300 e nº 290, e o partido 29 sem lista de deputado federal em SP). Exige consulta pública aos processos de registro.
- **Pendente:** auditoria da consulta popular de PE (eleição 6261, 10 seções): não há arquivo de divulgação dela no repositório, e o detalhe por seção não a traz.
- **Pendente:** voto por candidato e por seção nos cargos que não são presidente. O arquivo de dados abertos lido só traz presidente; para os outros cargos, o candidato é conferido por zona.
- **Pendente:** 2º turno, demais campos (comparecimento, brancos, nulos e legenda de cada cargo) contra o oficial, com revisão cética ([coerência 01](../analysis/coerencia-contagem/01-bu-x-oficial.md)).
- **Pendente:** conferir se cada número omitido estava no arquivo de candidatos de todas as urnas do estado.
