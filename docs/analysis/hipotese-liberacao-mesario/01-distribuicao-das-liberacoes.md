# H13, método descritivo: como se distribuem as liberações sem biometria

Perfil: estatístico eleitoral. Pergunta do usuário (H13): os eleitores liberados pelo mesário sem biometria votaram majoritariamente no 13, principalmente no Nordeste? Este documento **não estima o voto dos liberados**. Ele descreve onde as liberações acontecem, quanto se concentram e como se relacionam com o perfil da seção e com o lado que a seção escolheu no 1º turno.

## Resposta curta

- **Fato.** O Nordeste não é a região que mais libera. A taxa de liberação pelo mesário (L1) no 2º turno é 4,94% do comparecimento no Nordeste, 5,43% no Sul e 4,57% no país. Com todo habilitado sem digital (L2), o Nordeste fica abaixo da média: 11,75% contra 12,42% no país e 13,97% no Sudeste. O Nordeste tem 28,4% do comparecimento, 30,7% das liberações L1 e 26,9% das L2.
- **Fato.** A liberação cresce com a idade da seção e já era quase igual no 1º turno. Dentro da mesma zona, as seções pró-13 liberam só um pouco mais que as pró-22. No Nordeste, a diferença em L1 é de 0,18 ponto, menos de meio eleitor numa seção de 250 votantes.
- **Fato.** As seções com liberação muito acima da própria zona (36 em L1, 627 em L2, de cerca de 498 mil) votam como a zona delas. Em L1 foram 59,6% para o 13, contra 59,2% esperados pela zona. Dessas 36 seções, 33 usam urna UE2013, modelo que é só 2,3% do parque.
- **Leitura.** A distribuição das liberações não mostra assinatura de uso dirigido a um lado. Este método, porém, não observa o voto, e o voto é secreto. Ele não exclui um desvio pequeno e constante. Esse teste cabe aos métodos de inferência e de limites.

## Limite estrutural (vale para todo o documento)

O voto é secreto. O log registra como cada eleitor foi habilitado, mas não registra o voto. O RDV embaralha os votos e não liga voto a eleitor. O voto dos liberados só pode ser **estimado** (inferência ecológica) ou **cercado** por limites determinísticos por seção. Ele nunca é observado um a um. Aqui, a única informação de voto usada é o resultado da seção inteira.

## Definições

| Sigla | O que conta | Fonte |
|---|---|---|
| **L1** | `habilitadosPeloMesario`: o dado pessoal conferiu e o log grava `Mesário … habilitou o eleitor`. O eleitor tinha biometria, a digital dele falhou e a digital de um mesário registrado liberou. Só conta se terminou em voto | log (`src/perfil-secoes.js`) |
| **L2** | todo habilitado sem a digital do eleitor = `semBiometriaCadastrada` + `comBiometriaHabilitadosPorAnoNascimento` (no banco, `sem_biometria + por_biografia`) | BU, detalhamento do comparecimento |
| manual | `comBiometriaHabilitadosPorAnoNascimento` = L1 + liberação manual sem associação nominal a mesário | BU |
| sem bio | `semBiometriaCadastrada`: o eleitor não tinha biometria na urna e foi habilitado pelo ano de nascimento | BU |

**Validação (Fato).** No AC, 2º turno, o script reproduz exatamente o doc 06: L1 15.680, ano de nascimento 15.325, manual 22.654 e sem associação nominal 6.974.

**Exterior (ZZ).** O BU do exterior não traz o detalhamento, e o log tem L1 = 0. As 1.310 seções ficam fora de L2 e das taxas nacionais.

## Dados e cobertura

- Perfis por seção `data/parsed/<t>t/perfil/` dos **dois turnos completos**: 499.207 seções em cada turno, 28 UFs, SP incluído. As contagens de linhas por UF são iguais nos dois turnos. O banco foi usado só para as seções agregadas, porque a cópia de leitura tem o 1º turno de apenas 22 UFs e nela faltam SE, RS, SC, SP, TO e ZZ.
- Idade e % sem biometria cadastrada vêm do cadastro por seção de 14/07/2026 (`biometria-cadastro.mjs`), com as agregadas somadas à principal. O arranjo de agregadas é o do 2º turno, usado também no 1º. Escolaridade e situação urbano/rural não estão nesse arquivo.
- Seção com comparecimento ≥ 50 para as taxas por seção e ≥ 20 para as zonas. Zonas com ≥ 5 seções.

## Hipóteses nulas e o que é exploratório

Tudo aqui é **exploratório**: descreve e gera hipóteses. Os únicos testes formais são H0b, de Benjamini-Hochberg.

- **H0a (homogeneidade).** Dentro da zona, cada seção libera como uma binomial com a taxa da zona. A diferença entre seções seria só acaso.
- **H0b (cauda).** Com a heterogeneidade normal entre seções da zona, estimada por um beta-binomial com ρ da zona pelo método dos momentos, nenhuma seção libera mais do que o esperado. Teste unilateral por seção, BH com q = 0,05 dentro de cada família.
- **H0c (descritiva, sem teste).** A taxa de liberação não difere entre seções pró-13 e pró-22 do 1º turno na mesma zona.
- **Quantos testes:** 4 famílias de H0b (L1 e L2 × 2 turnos), de 497.837 a 497.859 testes cada, cerca de 1,99 milhão no total. Há ainda cerca de 40 correlações de Spearman e 24 comparações dentro da zona, só descritivas, sem valor-p.
- **Por que beta-binomial e não z por mediana/MAD.** Em L1 a mediana por seção é 10 liberações, e 9% das seções têm zero. O MAD das taxas fica instável ou nulo em muitas zonas. O beta-binomial usa o tamanho da seção e absorve a sobredispersão medida.
- **Por que não há Benford nem Klimek aqui.** Não há teste de dígito nem histograma comparecimento × vencedor: este método descreve liberações, não votos. O primeiro dígito de Benford também não serviria, porque contagens limitadas pelo tamanho da seção (máximo de cerca de 500) não abrangem várias ordens de grandeza.

## Resultados

### 1. Totais por região e UF (Fato)

Taxas sobre o comparecimento. A parcela do 13 é calculada só entre os votos no 13 e no 22.

| Região/UF | Seções | Comparec. 2T | L1 2T | L1 % 1T | L1 % 2T | L2 2T | L2 % 1T | L2 % 2T | sem bio % 2T | manual % 2T | parcela 13 1T | parcela 13 2T |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Brasil (sem exterior)** | 497.897 | 127.854.631 | 5.841.094 | 4,10 | 4,57 | 15.884.298 | 12,23 | 12,42 | 5,67 | 6,75 | 48,98 | 51,78 |
| **Nordeste** | 140.828 | 36.335.632 | 1.795.037 | 4,35 | 4,94 | 4.269.379 | 11,45 | 11,75 | 4,56 | 7,19 | 67,39 | 69,37 |
| Norte | 43.769 | 10.317.110 | 385.951 | 3,31 | 3,74 | 937.030 | 9,09 | 9,08 | 3,65 | 5,43 | 47,60 | 50,01 |
| Centro-Oeste | 38.048 | 9.595.354 | 425.854 | 4,11 | 4,44 | 993.788 | 10,55 | 10,36 | 4,04 | 6,31 | 36,60 | 39,99 |
| Sudeste | 203.237 | 52.895.255 | 2.219.043 | 3,73 | 4,20 | 7.389.540 | 13,72 | 13,97 | 7,50 | 6,47 | 43,59 | 47,24 |
| Sul | 72.015 | 18.711.280 | 1.015.209 | 5,11 | 5,43 | 2.294.561 | 12,26 | 12,26 | 4,60 | 7,66 | 34,24 | 37,42 |
| NE · AL | 7.101 | 1.951.632 | 96.551 | 4,29 | 4,95 | 205.824 | 10,17 | 10,55 | 3,58 | 6,96 | 57,50 | 60,77 |
| NE · BA | 35.476 | 9.422.047 | 441.566 | 4,02 | 4,69 | 1.154.903 | 12,01 | 12,26 | 4,80 | 7,45 | 69,87 | 71,31 |
| NE · CE | 23.765 | 6.024.843 | 307.281 | 4,56 | 5,10 | 672.758 | 10,90 | 11,17 | 4,04 | 7,13 | 66,93 | 68,93 |
| NE · MA | 18.093 | 4.127.771 | 170.045 | 3,48 | 4,12 | 410.368 | 9,68 | 9,94 | 3,65 | 6,29 | 67,44 | 69,54 |
| NE · PB | 10.712 | 2.743.560 | 147.473 | 4,88 | 5,38 | 281.701 | 9,99 | 10,27 | 3,00 | 7,27 | 64,96 | 67,46 |
| NE · PE | 21.418 | 6.126.467 | 283.892 | 4,11 | 4,63 | 877.756 | 13,92 | 14,33 | 7,80 | 6,53 | 67,16 | 69,20 |
| NE · PI | 10.225 | 2.239.830 | 138.605 | 5,47 | 6,19 | 246.365 | 10,69 | 11,00 | 2,00 | 9,00 | 74,67 | 75,88 |
| NE · RN | 8.115 | 2.232.823 | 135.318 | 5,50 | 6,06 | 264.671 | 11,66 | 11,85 | 3,75 | 8,10 | 63,21 | 65,72 |
| NE · SE | 5.923 | 1.466.659 | 74.306 | 4,65 | 5,07 | 155.033 | 10,40 | 10,57 | 3,60 | 6,97 | 67,20 | 69,53 |

As demais UFs estão em `descritivo-resumo.json` (`turnos.<t>.porUf`). Os extremos fora do Nordeste em L2 são ES (27,4%, puxado pelo cadastro sem biometria, 21,1%), MG (18,3%) e RS (16,6%). Em L1, o extremo é RS (5,8%).

- **Fato: L1 subiu do 1º para o 2º turno em todas as 27 UFs**, de 4,10% para 4,57% no país. A liberação manual total quase não mudou (6,68% → 6,75%). O que mudou foi a divisão interna: a liberação **sem associação nominal** caiu de 2,58% para 2,18%. Em números absolutos: L1 +720.662, sem associação −430.449, manual +290.239.
- **Hipótese:** no 2º turno, mais mesários se registraram ou foram reconhecidos pela urna, o que é uma mudança de procedimento, e não houve mais liberações. Ela pode ser testada no log (registro de mesários antes da votação × liberações sem associação).
- **Fato (entre UFs, exploratório, n = 27):** onde L1 cresceu mais, a parcela do 13 cresceu **menos**: Spearman ΔL1 × Δparcela 13 = −0,32. No Nordeste, L1 subiu em média 0,58 ponto e a parcela do 13 subiu 2,16 pontos. Nas outras 18 UFs, os números foram 0,37 e 3,03 pontos. No nível do 2º turno, Spearman L1 × parcela do 13 entre UFs = 0,23. Com 27 pontos, essas correlações têm erro de cerca de ±0,4 e não sustentam conclusão nenhuma.

### 2. Distribuição por seção (Fato, 2º turno; 1º turno entre parênteses)

| | Mediana | p90 | p99 | Máximo | Seções com zero |
|---|---|---|---|---|---|
| L1, contagem, Brasil | 10 (9) | 23 (22) | 40 (37) | 289 (268) | 9,1% (14,5%) |
| L1, % do comparecimento, Brasil | 4,13 (3,66) | 9,29 (8,89) | 15,9 (15,4) | 96,4 (91,2) | |
| L1, % do comparecimento, Nordeste | 4,48 (3,88) | 10,05 (9,44) | 17,0 (16,3) | 96,4 (91,2) | 9,1% (14,6%) |
| L2, contagem, Brasil | 27 (26) | 56 (53) | 111 (107) | 337 (309) | 0,03% |
| L2, % do comparecimento, Brasil | 10,7 (10,6) | 21,8 (21,4) | 41,4 (41,3) | 100 (99,5) | |
| L2, % do comparecimento, Nordeste | 10,6 (10,3) | 18,8 (18,3) | 37,4 (36,9) | 99,0 (99,1) | |

No Nordeste, a cauda de L2 é **mais curta** que no país (p99 de 37,4% contra 41,4%), porque o cadastro sem biometria é menor (exceto em PE).

### 3. Concentração (Fato)

| Medida (2º turno; 1º entre parênteses) | L1 | L2 |
|---|---|---|
| Gini entre seções, contagem | 0,419 (0,462) | 0,325 (0,316) |
| Seções que somam metade das liberações | 120.583 = 24,2% (22,4%) | 139.137 = 27,9% (28,5%) |
| Parcela do total no 1% de seções com mais liberações | 4,1% (4,4%) | 4,5% (4,6%) |
| Gini se cada seção fosse binomial com a taxa do país / da UF / da **zona** | 0,199 / 0,216 / **0,251** | 0,151 / 0,220 / **0,272** |
| Gini no Nordeste | 0,418 (0,463) | 0,297 (0,293) |
| Sobredispersão φ dentro da zona, mediana (1 = binomial) | 5,5 (6,1) | 4,4 (4,2) |
| Zonas com φ > 2 | 100% de 2.640 | 99,1% |

- **Fato:** H0a é rejeitada com folga. Dentro da mesma zona, as seções diferem em liberação cerca de 5 vezes mais do que o acaso binomial explicaria. A concentração, porém, é **moderada e igual nas cinco regiões**: Gini de L1 entre 0,37 (Sul) e 0,44 (Norte), e metade das liberações em 23% a 27% das seções. Não há um punhado de seções com a maior parte das liberações. Metade fica espalhada em cerca de 120 mil seções.
- **Mesários (unidade = mesário registrado em cada seção).** No 2º turno, 62% dos 1.988.603 pares seção-mesário não liberaram ninguém, e 7,4% deles fizeram metade de todas as liberações L1 (Gini 0,80). Entre os 754.719 que liberaram alguém, a mediana é 5 liberações, o p99 é 33 e o máximo é 265. Nas 271.492 seções com L1 ≥ 10, um único mesário fez ≥ 90% das liberações em 52,3%. O Nordeste segue o mesmo padrão (Gini 0,81). **Hipótese benigna técnica:** concentrar em um mesário é o esperado quando um só opera o terminal. Pelo princípio 8, isso também significa que **uma pessoa decide sozinha** a maior parte das liberações da seção. Esse é o risco a medir pelo método de mesários.

### 4. Zonas (Fato)

- Taxa L1 por zona no 2º turno (2.640 zonas): mediana 4,6%, p90 7,3%, máximo 12,0% (RS/0123). No Nordeste (808 zonas): mediana 5,0%, p90 7,6%, máximo 11,9% (PI/0007). Seguem CE/0072 (11,8%), BA/0061 (11,5%), CE/0010 (10,6%) e CE/0064 (10,6%). Essas zonas já eram as do topo no 1º turno: PI/0007 10,8%, BA/0061 10,1%, CE/0072 9,6%.
- Taxa L2 por zona: as maiores do país são do ES (até 59%, cadastro sem biometria). No Nordeste, as maiores são PE/0147 (37,8%), PE/0118 (37,5%) e PE/0011 (34,4%), com taxas iguais às do 1º turno (37,2%, 37,0% e 33,4%).
- Lista completa: `descritivo-zonas.jsonl`.

### 5. Relação com idade e cadastro (Fato)

Taxa agregada por decil de % de eleitores com 70 anos ou mais na seção (2º turno, 497.101 seções):

| Decil de % 70+ | 1 (≤ 3,2%) | 3 | 5 | 7 | 9 | 10 (≥ 21%) | Spearman |
|---|---|---|---|---|---|---|---|
| L1 % Brasil | 3,26 | 3,64 | 4,24 | 5,13 | 5,82 | 6,35 | 0,28 |
| manual % Brasil | 4,97 | 5,49 | 6,28 | 7,45 | 8,54 | 9,42 | 0,41 |
| L1 % Nordeste | 3,78 | 4,10 | 4,61 | 5,27 | 6,12 | 6,97 | 0,25 |
| parcela 13, Nordeste | 67,7 | 68,4 | 69,7 | 70,2 | 70,6 | 69,8 | |

- **Fato:** a liberação com digital falhada dobra do decil mais jovem ao mais idoso, como se espera da perda de qualidade da digital com a idade. A relação é igual no 1º turno (Spearman L1 × % 70+ = 0,23). No Nordeste, a parcela do 13 muda pouco entre os decis de idade (67,7% → 69,8%), enquanto L1 quase dobra.
- **Fato:** a fração sem biometria cadastrada explica `sem bio` quase por construção (Spearman 0,91). Ela **não** se relaciona com L1 (−0,06). Por isso L2 e L1 medem coisas diferentes: L2 é dominado pelo cadastro, L1 pela digital que falha.

### 6. Seções pró-13 × pró-22 do 1º turno (Fato, descritivo, sem causalidade)

Classificação pela parcela do 13 no 1º turno, entre 13 e 22, com ≥ 20 votos nos dois. Taxas no 2º turno; 1º turno entre parênteses.

| Região | Seções pró-13 / pró-22 | L1 % pró-13 | L1 % pró-22 | L2 % pró-13 | L2 % pró-22 | **Dentro da zona: pró-13 − pró-22 (pontos), L1 / L2** | Zonas comparadas | Zonas com pró-13 > pró-22 (L1) |
|---|---|---|---|---|---|---|---|---|
| Brasil | 217.492 / 278.206 | 4,69 (4,13) | 4,48 (4,08) | 12,69 | 12,21 | **+0,02 (−0,03) / +0,23 (+0,23)** | 1.513 | 53,7% |
| **Nordeste** | 129.311 / 11.176 | 5,01 (4,40) | 4,25 (3,82) | 11,92 | 10,01 | **+0,18 (+0,04) / +0,74 (+0,69)** | 252 | 61,5% (57,9%) |
| Norte | 17.999 / 25.539 | 3,65 | 3,81 | 9,36 | 8,90 | +0,09 / +0,55 | 173 | 54,3% |
| Centro-Oeste | 3.466 / 34.438 | 4,70 | 4,42 | 11,45 | 10,25 | +0,07 / +1,12 | 150 | 54,0% |
| Sudeste | 57.743 / 144.246 | 4,18 | 4,20 | 14,75 | 13,66 | −0,05 / −0,37 | 671 | 52,5% |
| Sul | 8.973 / 62.807 | 5,24 | 5,45 | 17,23 | 11,60 | −0,04 / +0,99 | 267 | 49,1% |

- No país, a taxa L1 por faixa de parcela do 13 no 1º turno tem forma de **U**: 6,3% nas seções com 0–10% para o 13, 4,3% entre 40% e 60%, e 5,2% a 5,7% acima de 80%. As seções de voto muito concentrado, para qualquer lado, liberam mais. É o que se espera de seções rurais e mais velhas.
- No Nordeste, a taxa L1 sobe com a parcela do 13: 3,8% (30–40%) → 5,9% (80–90%). Ali quase não há seções pró-22 (11.176 de 140.487), e a idade sobe junto com a parcela do 13. A comparação dentro da zona remove a geografia, mas não a idade. Ela dá +0,18 ponto: numa seção de 250 votantes, **0,45 eleitor liberado a mais**.
- **Hipótese:** no Nordeste, a diferença em L1 dentro da zona cresceu de +0,04 para +0,18 ponto entre os turnos, e as zonas com pró-13 > pró-22 passaram de 57,9% para 61,5%. Pelo teste do sinal, feito à mão a partir desses números, z ≈ 3,7 no 2º turno e 2,5 no 1º. Esse z não tem correção pelas 24 comparações e não controla idade. É um sinal pequeno, exploratório e com explicação demográfica possível. Ele deve ser levado como hipótese declarada ao método confirmatório: regressão com zona e idade, linha de base do 1º turno.

### 7. Seções extremas (Fato para H0b; conferidas no bruto as citadas abaixo)

| | 1º turno | 2º turno |
|---|---|---|
| Testes L1 / L2 | 497.859 / 497.859 | 497.837 / 497.838 |
| Rejeitadas pela binomial com taxa da zona (BH 5%), L1 / L2 | 63.070 / 41.978 | 54.914 / 44.555 |
| **Rejeitadas pelo beta-binomial (BH 5%), L1 / L2** | **40 / 733** | **36 / 627** |
| Do Nordeste, L1 / L2 | 18 / 370 | 19 / 348 (testadas no NE: 28,3%) |
| Parcela do 13 nas rejeitadas L1 × **esperada pela zona delas** | 53,4% × 53,2% | 59,6% × 59,2% |
| Idem L2 | 55,3% × 54,8% | 59,8% × 58,7% |
| Urna UE2013 entre as rejeitadas L1 (parque: 2,2%–2,3%) | 35 de 40 | 33 de 36 |

- **Fato:** a binomial simples sinalizaria 55 mil seções, mas isso é só sobredispersão. Com a heterogeneidade normal da zona, restam 36 seções em L1 e 627 em L2 no 2º turno, praticamente o mesmo número do 1º turno.
- **Fato:** essas seções votam como a própria zona. Em L1, a diferença entre a parcela do 13 observada e a esperada pela zona é +0,3 ponto. Em L2, é +1,2 ponto no 2º turno e +0,6 no 1º. O Nordeste aparece **sobrerrepresentado** nos dois turnos: 53% (L1) e 56% (L2) das rejeitadas no 2º turno, e 45% e 50% no 1º, contra 28% das testadas.
- **Hipótese (técnica, testável):** quase todas as rejeitadas em L1 usam a urna UE2013, cujo leitor não reconhece digital nenhuma no dia. Nas seções conferidas, quase todo eleitor passa pelas 4 tentativas de digital. Isso converge com o doc [06 de biometria](../biometria-mesarios/06-h07-modelo-urna.md). Pelo princípio 8, um leitor que "falha" o dia inteiro também é o cenário que abre a brecha. O teste é ver se a falha aparece nos scores de batimento de todos os eleitores ou só de alguns.

**Seções conferidas no arquivo bruto** (`liberacao-descritivo-conferencia.mjs`, 2º turno, `src/exportar.js`):

| Seção | Comparec. | Por biometria | L1 (por mesário) | Digital pedida até a 4ª tentativa | Urna | 13 × 22 | 1º turno (perfil) |
|---|---|---|---|---|---|---|---|
| MA 08494/0093/0328 (Paço do Lumiar) | 195 | 2 | 188 (95, 92, 1) | 189 de 191 | UE2013, assinatura 22/22 ok | 96 × 92 | L1 136, biometria 51, 77 × 91 |
| PA 05398/0036/0424 (Santo Antônio do Tauá) | 112 | 7 | 98 (75, 18, 5) | 101 de 106 | UE2013, 22/22 ok | 98 × 13 | L1 69, biometria 38, 93 × 16 |
| PE 25836/0026/0153 (Sirinhaém) | 162 | 7 | 143 (70, 45, 26, 2) | 150 de 157 | UE2013; verificação da assinatura não concluiu (`DER: comprimento ausente`) | 119 × 37 | — |
| RJ 60011/0008/0074 (Rio de Janeiro) | 300 | 3 | 269 (228, 41) | 269 de 273 | UE2013 de contingência, 22/22 ok | 191 × 103 | — |
| MS 91693/0027/0108 (Angélica) | 186 | 0 | 133 (126, 7); L2 = 186 = 100% | 168 de 168 | UE2013, 22/22 ok | 66 × 120 | — |
| BA 38890/0128/0054 (São Sebastião do Passé) | 252 | 208 | **0** | 17 de 220 | UE2013 de contingência; verificação da assinatura não concluiu | 220 × 24 | **L1 217 de 238, biometria 3, 203 × 19** |

- **Fato:** nos 6 casos, o BU e o log concordam com o perfil, e o padrão é o mesmo: quase nenhum eleitor reconhecido pela digital, e um ou dois mesários liberando o resto. As seções extremas pendem para os dois lados, de acordo com a região: MA 51% e MS 35% para o 13, PA 88%.
- **Fato (experimento natural, 1 seção):** na BA 38890/0128/0054, a urna do 1º turno liberou 91% pelo mesário, com 3 eleitores por biometria, e deu 91,4% ao 13. No 2º turno, outra urna (de contingência) reconheceu 208 digitais, L1 foi 0, e o 13 teve 90,2%. A liberação quase total não mudou a parcela do 13. **Obs.:** no 2º turno dessa seção, o log conta 231 votos e o BU, 252. Isso é típico de troca de urna, fica fora deste método e é **Recomendação** para a frente de integridade.
- As seções de SP do topo (71072/0408/0361, 71072/0325/0642) **não foram conferidas no bruto**: falta o `aux.json` local. Por isso não são citadas como Fato.

## Nordeste em destaque

- **Fato:** com 28,4% do comparecimento, o Nordeste tem 30,7% das liberações L1 (1.795.037) e 26,9% das L2 (4.269.379). As proporções no 1º turno eram 30,2% e 26,6%. A taxa L1 (4,94%) fica abaixo da do Sul (5,43%), região que deu 37% ao 13. A taxa L2 (11,75%) fica abaixo da média do país.
- **Fato:** PI (6,19%) e RN (6,06%) têm as maiores taxas L1 do Nordeste e já tinham no 1º turno (5,47% e 5,50%). PE tem a maior L2 (14,33%), por causa do cadastro sem biometria (7,8%).
- **Fato:** a concentração no Nordeste é igual à do país (Gini L1 0,418; metade das liberações em 24,3% das seções). Nenhuma zona do Nordeste passa de 12% em L1.
- **Fato:** dentro da mesma zona, as seções pró-13 do Nordeste liberam +0,18 ponto (L1) e +0,74 ponto (L2) a mais que as pró-22. No 1º turno, eram +0,04 e +0,69.
- **Leitura:** o Nordeste não usa a liberação mais que o resto do país. O pequeno excesso em seções pró-13 tem a mesma direção da idade e já existia no 1º turno. Isso não prova que não houve uso dirigido: só diz que, se houve, ele não aparece na **distribuição** das liberações.

## Limites

- O voto dos liberados não é observado (limite estrutural acima). Este método só descreve onde e quanto se liberou.
- Faltam por seção: renda, escolaridade, urbano/rural. A idade vem de faixas largas (21–59 anos numa faixa só). A comparação dentro da zona não controla idade.
- O cadastro é de 14/07/2026, um só para os dois turnos. O arranjo de agregadas é o do 2º turno.
- ρ do beta-binomial é estimado com a própria seção dentro da zona, o que é conservador e esconde seções em zonas pequenas ou muito heterogêneas. A BA 38890/0128/0054 do 1º turno (91% de L1) não foi rejeitada (q = 0,90) por esse motivo.
- O exportar não conclui a verificação de assinatura de alguns pacotes (`DER: comprimento ausente`; PE e BA acima). Isso é limite da ferramenta, não achado. Também não se confere o 1º turno no bruto local (falta `aux.json`). Os números do 1º turno vêm do perfil gerado dos arquivos do 1º turno.
- Exterior fora de L2 (sem detalhamento no BU).

## Recomendações

1. Levar a diferença do Nordeste dentro da zona (+0,18 ponto em L1, crescendo entre os turnos) ao método confirmatório como hipótese declarada: regressão com efeito fixo de zona, % 70+ e modelo de urna, com o 1º turno como linha de base.
2. Nas 36 seções L1 rejeitadas no 2º turno, ver se o leitor falhou para todos os eleitores (scores de batimento baixos e uniformes) ou só para alguns. Uma falha seletiva seria o sinal de risco.
3. Verificar a queda das liberações sem associação nominal (−430 mil) contra o aumento de L1 (+721 mil). Se for registro de mesário, isso tem de aparecer no log.

## Reprodução

```bash
node --max-old-space-size=10000 scripts/auditoria/liberacao-descritivo-distribuicao.mjs   # ~4 min, dois turnos inteiros
node scripts/auditoria/liberacao-descritivo-ufs.mjs                                        # comparação entre UFs
node scripts/auditoria/liberacao-descritivo-conferencia.mjs 2:ma/08494/0093/0328 2:pa/05398/0036/0424 \
  2:pe/25836/0026/0153 2:rj/60011/0008/0074 2:ms/91693/0027/0108 2:ba/38890/0128/0054 1:ma/08494/0093/0328
# teste rápido: ... liberacao-descritivo-distribuicao.mjs --uf ac,se --saida <dir>
```

Saídas em `data/parsed/auditoria/liberacao/`: `descritivo-resumo.json` (totais, distribuição, concentração, zonas, covariáveis, pró-13 × pró-22, H0b), `descritivo-extremas.json` (topo de cada família, com p e q), `descritivo-zonas.jsonl`, `descritivo-ufs.json` e `descritivo-conferencia.json`.
