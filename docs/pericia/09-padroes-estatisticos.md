# 9. Padrões estatísticos de fraude

> **Situação:** escrito em 29/10/2026 a partir da análise estatística da auditoria. Este tópico ainda não passou pela segunda verificação independente, a que tenta derrubar cada achado. Por isso, **só ficou no texto o número que foi recalculado de forma independente**, do universo completo, por duas conferências próprias: uma sobre a cópia de leitura do banco e os arquivos públicos brutos do TSE, outra sobre os arquivos das urnas. Os números que dependem de simulação (permutação, contagens honestas simuladas) ou do desconto do perfil dos eleitores ainda não foram recalculados. Eles foram retirados e aparecem como **Pendente: em verificação**. O 2º turno cobre o país inteiro. O 1º turno, usado como comparação, também cobre as 28 UFs (499.206 seções com voto para Presidente; cópia de leitura de 29/10/2026, 10:50; números do 1º turno refeitos numa revisão posterior).

## A pergunta

Os resultados de Presidente mostram as marcas estatísticas que fraudes grandes costumam deixar? As três marcas mais conhecidas são:

- **enchimento de urna:** alguém acrescenta votos falsos, e a seção aparece com comparecimento perto de 100% e quase todos os votos para um só candidato;
- **números inventados:** alguém escreve o resultado à mão, e os algarismos ficam com um padrão que contagens reais não têm;
- **números redondos:** quem inventa resultado tende a escolher 100, 150, 200 votos, ou 60%, 75%.

## Resposta curta

| Pergunta | Resposta (2º turno, Presidente, 499.205 seções) | Rótulo |
|---|---|---|
| Há a marca de enchimento de urna? | A marca clássica não aparece. Nenhuma seção tem comparecimento acima de 100%. Não há um segundo grupo de seções em "100% de comparecimento com 100% para um candidato". Dentro de cada zona, comparecimento e voto quase não andam juntos (correlação −0,078 para o 13). Isso não exclui enchimento pequeno ou espalhado: o tamanho mínimo que estes testes veem ainda não foi medido (**Pendente**). | **Fato** |
| Há marca de número inventado? | O último algarismo difere de "todos iguais" em 17 de 56 testes, e o 2º algarismo difere da lei de Benford em 52 de 56. Essas duas referências não são a certa para votos por seção (ver Teste 3). A comparação com contagens honestas simuladas, que é a referência adequada, está **Pendente: em verificação**. | **Fato** (contagens); a conclusão está pendente |
| Há excesso de números redondos? | Não, nas contagens de votos do 13, do 22 e no comparecimento. Nos percentuais redondos, **Pendente: em verificação**. | **Fato** (contagens) |
| Há algo fora do padrão? | Sim: há mais seções com 90% a 100% dos votos para o 13 (Lula) do que o modelo prevê (6.899 contra 4.664,2). O excesso, comparado ao esperado, é maior em aldeias, quilombos e presídios, mas em número de seções a maior parte dele está em seções classificadas como "comuns". Essas seções já davam votação parecida ao mesmo candidato no 1º turno: 6.875 das 6.899 já tinham 80% ou mais para o 13. Se o excesso some quando se leva em conta o perfil dos eleitores: **Pendente: em verificação**. | **Fato** (contagem); a explicação é **Hipótese** |
| Isso prova que não houve fraude? | Não. Estes métodos só enxergam fraude grande o bastante para mudar o desenho dos números no país. Fraude pequena e espalhada por muitas seções, ou feita de forma proporcional ao voto de cada lugar, pode passar por eles sem ser vista (o tamanho que eles enxergam ainda não foi medido). | **Fato** (é um limite dos métodos) |

**O que isto prova:** os números do 2º turno não têm a marca de enchimento de urna nem excesso de contagens redondas que estes métodos detectam. A marca de números inventados ainda depende da comparação com contagens simuladas, que está pendente.

**O que isto não prova:** que nenhum voto foi fraudado. Também não prova que cada seção fora do padrão é honesta: elas têm explicação provável, mas não foram investigadas uma a uma.

## Que dados foram usados

- **Fato.** 2º turno, Presidente: todas as 499.205 seções com voto, tiradas do banco da auditoria, que guarda o boletim de cada urna. Somam 64.256.232 votos para o 13 e 59.826.041 para o 22 (recalculado na cópia de leitura de 29/10/2026). A comparação com o resultado oficial seção por seção está no tópico [5](05-soma-dos-boletins.md).
- **Perfil dos eleitores de cada seção:** idade, escolaridade, eleitores indígenas e quilombolas, tirados do arquivo público do TSE "perfil do eleitor por seção" (gerado em 14/07/2026, publicado em 17/07/2026). **Fato:** o perfil casa com 498.818 das 499.205 seções. As outras 387 ficam sem esse ajuste.
- **Tipo de local de votação:** aldeia, quilombo, presídio, exterior ou comum, pelo nome do local, pelo tipo de local do cadastro do TSE e pela parcela de eleitores indígenas ou quilombolas da seção (metade ou mais). **Fato:** muitos locais em aldeia não têm "aldeia" no nome, e a raça/cor vem "não informada" para muitos eleitores. Então o grupo "comum" ainda contém aldeias, comunidades ribeirinhas, quilombos e assentamentos.
- **1º turno, para comparação: completo.** As 28 UFs (26 estados, DF e exterior), com 499.206 seções com voto para Presidente, do mesmo banco (cópia de leitura de 29/10/2026, 10:50).

## Como cada teste funciona, em palavras simples

Todos os testes seguem a mesma ideia: primeiro se calcula **o que seria esperado numa eleição honesta** com seções do tamanho e do perfil das brasileiras (isso se chama **modelo sem fraude**, ou modelo de referência). Depois se compara com o que as urnas registraram. Diferença grande é um **sinal** a examinar, não uma prova.

### Teste 1. Seções com quase todos os votos para um candidato

Conta quantas seções deram 90% ou mais, e 100%, dos votos válidos a um candidato. O esperado vem do comportamento das outras seções da mesma zona eleitoral. O modelo usado admite que seções vizinhas variam entre si (um bairro vota diferente do outro); em estatística ele se chama **beta-binomial**. Uma seção é marcada como "surpreendente" quando a chance de aquele resultado sair por acaso é menor que 1 em 20 milhões. O limite é tão baixo porque são testadas 499.205 seções, e com tantas tentativas algum resultado raro sempre aparece.

### Teste 2. O "gráfico de Klimek" (impressão digital do enchimento de urna)

Em 2012, Klimek e colegas publicaram um método (revista *PNAS*) que hoje é o mais usado para procurar enchimento de urna. Cada seção vira um ponto num gráfico:

- na horizontal, o **comparecimento** da seção (quantos dos eleitores aptos votaram);
- na vertical, a **parcela do candidato** naquela seção.

Numa eleição sem enchimento, os pontos formam uma nuvem só. Quando há enchimento, aparece uma "mancha" separada no canto de cima à direita: seções com comparecimento perto de 100% e quase 100% para um candidato, porque quem enche a urna aumenta as duas coisas ao mesmo tempo. Foi assim que o método mostrou problemas em eleições da Rússia e de Uganda.

O teste também mede se, **dentro da mesma zona**, as seções que comparecem mais votam mais num candidato. Essa ligação se mede pela **correlação** (um número de −1 a +1: perto de 0 quer dizer que as duas coisas não andam juntas; perto de +1, que sobem juntas). Para saber quanto seria normal, o teste embaralha o comparecimento entre as seções da mesma zona, o que apaga qualquer ligação real e mostra quanto sai só por acaso (isso se chama **permutação**).

### Teste 3. Os algarismos dos votos

Quem inventa números à mão escolhe algarismos de um jeito que contagens reais não produzem. O teste olha:

- **o último algarismo** dos votos de cada candidato, quando ele teve 100 votos ou mais na seção. A referência simples é que ele saia de 0 a 9 de forma quase igual; para votos por seção, essa referência é só aproximada, e a adequada é a das contagens honestas simuladas;
- **o segundo algarismo**, comparado com a lei de Benford (abaixo) e com o modelo sem fraude.

Cada comparação é feita por UF e por candidato (56 comparações no 2º turno: 28 UFs, contando o exterior, vezes 2 candidatos). Como são muitas, usa-se uma correção (método de **Holm**) que evita chamar de anomalia o que é só acaso por causa do número de tentativas.

**Por que a lei de Benford no 1º algarismo não serve aqui.** A lei de Benford diz que, em muitos conjuntos de números reais, o primeiro algarismo é "1" em 30,1% dos casos, e "9" em menos de 5%. Ela vale quando os números se espalham por várias ordens de grandeza (unidades, dezenas, milhares, milhões). Votos por seção não fazem isso: os de um candidato numa seção vão de 0 a 502 no 2º turno, porque a seção tem esse tamanho. Então o primeiro algarismo depende do tamanho das seções e da força do candidato, e não de a contagem ser honesta.

- **Fato.** No Brasil, para o 13, a distância entre o 1º algarismo dos votos reais e a lei de Benford é muito grande (χ² = 297.064).
- **Pendente: em verificação.** A demonstração de que votos simulados **sem fraude** também são reprovados por Benford no 1º algarismo. Enquanto isso, este teste não é usado como prova de nada neste relatório, nem a favor nem contra.

### Teste 4. Seções muito diferentes da sua zona

Para cada seção, mede quantas vezes ela está longe do "típico" da sua zona, em parcela de cada candidato e em comparecimento. Esse afastamento chama-se **escore z**. Foi usado um z que não se deixa puxar pelos próprios valores extremos (z **robusto**), só em zonas com 10 seções ou mais. z de 5 ou mais é muito raro: se os afastamentos seguissem uma curva normal, daria menos de uma seção no país inteiro. Votos reais costumam ter mais casos extremos que a curva normal, então essa conta serve de régua, não de probabilidade. Depois a conta é refeita **descontando o perfil dos eleitores** da seção (idade, escolaridade, indígenas, quilombolas), para ver o que sobra.

### Teste 5. Números redondos

Conta quantas seções têm votos em múltiplos de 10, 50 e 100, e percentuais em múltiplos de 5% (como 60%, 65%, 70%). O esperado para "200 votos" é a média de quantas seções têm 198, 199, 201 e 202. Para os percentuais, cada seção é sorteada de novo várias vezes com o mesmo tamanho e a mesma parcela, para saber quantos percentuais redondos aparecem por acaso (método de Kobak, Shpilkin e Pshenichnikov, 2016).

### Teste 6. Para que lado pendem as anomalias

Para cada tipo de anomalia, conta quantas favorecem o 13 e quantas o 22, e compara com o que o modelo de cada teste esperava.

## O que foi encontrado (2º turno, Presidente, país inteiro)

### Enchimento de urna (gráfico de Klimek)

- **Fato.** Comparecimento por seção: a mediana do comparecimento por seção foi 81,5% (81,52%; 248.899 das 499.205 seções ficaram abaixo de 81,5%). **Nenhuma seção passou de 100%.** 12 seções tiveram exatamente 100%, todas pequenas (de 26 a 163 eleitores aptos). 639 tiveram 95% ou mais.
- **Fato.** Os pontos formam uma nuvem única, com o centro em 80% a 84% de comparecimento (156.259 seções nessa faixa). **Não há uma segunda mancha** em 100% de comparecimento com 100% para um candidato.
- **Fato.** Comparando cada seção com a média da sua zona, nas 499.205 seções, a correlação entre comparecimento e parcela do 13 é **−0,078**. Para o 22, é +0,078. Os dois números estão perto de zero: comparecimento e voto quase não andam juntos. Com o perfil dos eleitores descontado: **Pendente: em verificação**.
- **Fato.** Contando zona a zona (2.640 zonas com 20 seções ou mais), as zonas em que a correlação passa de 0,5 (as duas coisas sobem juntas com força) são 20 a favor do 13 e 69 a favor do 22. A correlação do 22 dentro das zonas, por UF, é maior em SC (+0,255), PR (+0,250), RS (+0,241), GO (+0,190) e MS (+0,185); a do 13, em RR (+0,254).
  - **Hipótese:** em zonas urbanas, bairros de renda maior comparecem mais e votam mais no 22. O cadastro não informa renda, então esse efeito não foi descontado. **Pendente:** refazer com renda do Censo por setor.
- **Fato. Há uma cauda pequena de comparecimento alto com voto forte no 13.** 1.214 seções (0,24% do total) tiveram 94% ou mais de comparecimento. Nas 66 com 98% a 100% de comparecimento, o 13 teve em média 79,7% dos votos. No canto "95% ou mais de comparecimento e 95% ou mais para o candidato" há 64 seções do 13 e 2 do 22. Quantas o acaso daria (permutação): **Pendente: em verificação**. Das 64 do 13: 34 em aldeia, 2 em quilombo, 1 em presídio e 27 classificadas como "comuns".
  - **Fato.** A parcela do 13 também é maior nas seções de comparecimento **baixo** (59,3% em média na faixa de 50% a 60%). **Hipótese:** a cauda reflete diferenças entre regiões, e não só o comparecimento (a divisão por região não foi medida).
  - **Hipótese:** o excesso no canto vem de aldeias e comunidades pequenas, onde o eleitorado é estável, quase todos votam e o voto é parecido. **Pendente:** conferir se as 27 seções "comuns" do canto ficam em terras indígenas ou quilombos, e comparar com as mesmas seções em 2022.

### Números inventados (algarismos)

| Teste | Quantos acusam diferença (de 56, já corrigido por Holm) | Leitura |
|---|---|---|
| Último algarismo × "todos iguais" | 17 | Diferença pequena (o 0 aparece em 10,5% e o 9 em 9,6% dos casos, para o 13). **Hipótese:** vem de haver mais seções pequenas que grandes; a confirmação depende da linha abaixo |
| Último algarismo × modelo sem fraude | **Pendente: em verificação** | É o teste que decide se há sinal de número inventado |
| 2º algarismo × lei de Benford | 52 | Benford não é a referência certa para votos por seção |
| 2º algarismo × modelo sem fraude | **Pendente: em verificação** | — |

Rótulo: **Fato** (as contagens 17 e 52).

- **Pendente: em verificação.** Quantos testes do 2º algarismo acusam diferença em relação ao modelo sem fraude, em quais UFs e de que tamanho. Só depois disso se pode discutir a causa.

### Números redondos

| | Múltiplos de 10 (observado / esperado) | Múltiplos de 100 (observado / esperado) |
|---|---|---|
| Votos do 13 | 50.046 / 49.917 | 5.566 / 5.532 |
| Votos do 22 | 49.741 / 49.676 | 4.273 / 4.274 |
| Comparecimento | 50.007 / 49.962 | 5.189 / 5.311 |

- **Fato.** Nenhum excesso de contagens redondas além do que o acaso produz, para os dois candidatos e para o comparecimento. Nos múltiplos de 10, 50 e 100, as diferenças entre observado e esperado ficam com escore z entre −1,7 e +0,7 (a tabela mostra os múltiplos de 10 e de 100).
- **Pendente: em verificação.** Percentuais redondos (múltiplos de 5%): o esperado vem de sorteio e ainda não foi recalculado.
- **Fato.** Brancos e nulos aparecem com **menos** múltiplos de 10 que o esperado. **Hipótese:** isso vem do método, porque são números pequenos, e a média dos vizinhos exagera o esperado nesse trecho. Como é falta, e não excesso, de números redondos, isso não é, por si, sinal de fraude.

### Seções com 90% a 100% dos votos para um candidato

| | 90% a 95% | 95% a 99% | 99% a 100% | 100% | Total com 90% ou mais |
|---|---|---|---|---|---|
| 13, observado | 5.150 | 1.545 | 98 | 106 | 6.899 |
| 13, esperado pelo modelo | 4.038,9 | 600,7 | 16,6 | 8,0 | 4.664,2 |
| 22, observado | 343 | 34 | 3 | 4 | 384 |
| 22, esperado pelo modelo | 506,7 | 97,3 | 7,0 | 4,1 | 615,1 |

- **Fato.** O 13 tem mais seções com 90% ou mais do que o modelo espera (6.899 contra 4.664,2). O 22 tem menos (384 contra 615,1).
- **Fato. Onde está o excesso do 13:**

  | Tipo de local | Observado | Esperado | Vezes o esperado |
  |---|---|---|---|
  | Aldeia | 517 | 64,2 | 8,1 |
  | Quilombo | 103 | 15,8 | 6,5 |
  | Presídio (presos provisórios) | 39 | 3,6 | 10,8 |
  | Comum | 6.153 | 4.476,9 | — |
  | Temporário / exterior | 73 / 14 | 54,1 / 49,7 | — |

  O excesso é proporcionalmente maior em aldeias, quilombos e presídios. Em número de seções, porém, 1.676,1 das 2.234,8 seções a mais (observado menos esperado) estão no grupo "comum", que ainda contém comunidades não identificadas pelo nome (ver "Que dados foram usados"). As 106 seções com 100% para o 13 estão em: aldeia 52, comum 45, quilombo 7, presídio 2. Em quais municípios ficam as seções "comuns" com mais excesso, e qual o perfil deles: **Pendente: em verificação**.
- **Fato.** Não é efeito de seção minúscula: as 110 seções com 100% (106 do 13 e 4 do 22) têm, no meio da lista, 122,5 votos válidos. Só 19 têm menos de 50 votos. A maior tem 354 votos.
- **Fato.** As 4 seções com 100% para o 22 ficam em Arroio do Padre-RS, Cândido Godói-RS, Chaves-PA e Jacareacanga-PA.
- **Fato.** Seções "surpreendentes" (chance menor que 1 em 20 milhões pelo modelo): 125 do 13 e 7 do 22.

### Seções muito diferentes da sua zona

| | Muito acima da zona (z ≥ 5), sem desconto | Com o perfil dos eleitores descontado |
|---|---|---|
| Parcela do 13 | 715 | **Pendente: em verificação** |
| Parcela do 22 | 135 | **Pendente: em verificação** |

- **Fato.** Sem desconto, os casos extremos pendem para o 13 (715 contra 135). Das 715: 243 em aldeia, 89 em presídio, 6 em quilombo, 3 em local temporário e 374 "comuns".
- **Pendente: em verificação.** Quanto sobra para cada candidato depois de descontar o perfil dos eleitores, e quais seções ficam no topo da lista. Uma conferência independente aponta um problema no programa da primeira análise: seções sem perfil entram no cálculo da mediana da zona. Ainda não há valor conferido.
- **Fato.** Comparecimento muito acima da zona: 40 seções, com 37 a 315 eleitores aptos. 35 delas foram vencidas pelo 13 e 5 pelo 22; pela proporção de seções vencidas por cada um na mesma zona, o esperado era 26,4 e 13,6. São 40 seções num universo de 499.205. Se o perfil dos eleitores explica essa diferença: **Pendente: em verificação**.
- **Fato.** Comparecimento muito **abaixo** da zona: 597 seções. **Hipótese:** cadastro com eleitores que mudaram ou morreram e continuam aptos. Isso não tem a ver com enchimento de urna, e sim com o tópico [6](06-titulos-de-falecidos.md).

### Para que lado pendem as anomalias

- **Fato.** As anomalias de **concentração** (100%, 90% ou mais) favorecem o 13 bem acima do esperado pelo modelo. No canto de Klimek também há mais seções do 13 (64 contra 2), mas o esperado está pendente. A de **correlação dentro da zona** favorece o 22 (69 zonas contra 20). Os casos extremos **com o perfil dos eleitores descontado**: **Pendente: em verificação**.

## Comparação com o 1º turno

O 1º turno cobre as 28 UFs (499.206 seções com voto para Presidente). Os números abaixo foram refeitos no 1º turno completo, numa revisão posterior.

- **Fato.** Nenhuma seção do 1º turno teve comparecimento acima de 100% (15 com exatamente 100%, de 21 a 168 eleitores aptos). Os testes de algarismos contra o modelo sem fraude no 1º turno: **Pendente: em verificação**.
- **Fato.** O excesso de seções com 90% ou mais para o 13 já existia no 1º turno, com 11 adversários: no país inteiro, o observado foi 1,89 vez o esperado no 1º turno (3.686 contra 1.947,7) e 1,48 vez no 2º (6.899 contra 4.664,2). Ou seja, o excesso **relativo** (observado dividido pelo esperado) **diminuiu** no 2º turno. Em número de seções acima do esperado, ele subiu: de 1.738,3 no 1º turno para 2.234,8 no 2º.
- **Fato.** As 110 seções com 100% no 2º turno (106 do 13 e 4 do 22) **todas** já davam 90% ou mais ao mesmo candidato no 1º turno. Das 6.899 seções do 13 com 90% ou mais, 6.875 já tinham 80% ou mais no 1º. Das 384 do 22, 381. Só 3 (todas do 13) subiram 20 pontos ou mais entre os turnos.
- **Fato.** No 1º turno, os votos do 22 em múltiplos de 10 aparecem um pouco mais que o esperado (50.247 contra 49.762, escore z +2,2), com excesso em 20 das 28 UFs (contando o exterior). Nos múltiplos de 50 e 100 do 1º turno não há excesso (z +0,5 e −0,2). No 2º turno isso não se repete (49.741 contra 49.676, z +0,3).
  - **Hipótese (fraca):** acaso ou efeito do método dos vizinhos numa distribuição de outro formato. Não dá para descartar. **Pendente:** refazer com o esperado por sorteio em vez dos vizinhos.

## Seções conferidas no arquivo da urna

Os testes acima usam o banco da auditoria. Para confirmar que os números extremos são os que a urna gravou, 25 seções extremas do 2º turno foram abertas no arquivo original da urna (e a abertura foi refeita por um segundo programa de conferência). Isso **confirma** casos; não gera número da auditoria (princípio 9).

- **Fato.** Nas 25 seções, o boletim do arquivo é igual ao do banco. Em 24, todos os lacres digitais conferem (0 falha). Exemplos: seção de aldeia em Confresa-MT (zona 28, seção 200): 309 de 315 aptos votaram, 309 votos no 13; Arroio do Padre-RS (zona 34, seção 433): 116 votos no 22 e 2 brancos. Entre elas estão as 12 seções com 100% de comparecimento: em 11 o voto se dividiu entre os candidatos (por exemplo, Caraúbas-RN, zona 36, seção 69: 134 para o 13 e 25 para o 22); em 1 (TO, zona 9, seção 184) os 59 votos válidos foram todos para o 13.
- **Fato** (segunda verificação independente). Na seção do CE (zona 55, seção 160), o programa de conferência deste tópico para com erro ao ler o certificado dessa urna (modelo UE2015). O boletim dela confere com o banco. Ela é um dos 37.457 pacotes de urnas antigas com zeros a mais no fim do certificado: com esses zeros ignorados na leitura, passa em todas as conferências de lacre (22 conferências, 0 falha; [tópico 1](01-integridade-e-estrutura-dos-arquivos.md#urnas-antigas-carteira-gravada-com-zeros-a-mais)).

## Um caso para examinar

**Hipótese.** Seção em local de aldeia em Ipixuna-AM (zona 45, seção 63).

- **Fato.** 1º turno: 13 = 135, 22 = 61, comparecimento 227. 2º turno: 13 = 167, **22 = 2**, comparecimento 197. Eleitores aptos: 335 nos dois turnos. Lacres sem falha nos dois turnos. Nos dois turnos a seção usou urna de reserva.
- **Hipótese:** mudança de voto em bloco da comunidade entre os turnos, **ou** algo a investigar. O 22 perdeu 59 votos e o comparecimento caiu 30.
- **Fato:** o diário da urna foi lido nos dois turnos no [tópico 3](03-linha-do-tempo.md), item 11. No 1º turno, a urna original parou por bateria e a reserva fechou a votação, com 81 dos 227 votos depois das 17h de Brasília. No 2º turno, a seção usou desde a abertura a urna que tinha sido a reserva do 1º turno, sem troca no dia, e encerrou às 17h02 de Brasília. **Pendente:** os avisos de "eleitor já votou" e de quem é a digital nas liberações manuais. Este teste sozinho não decide.

## Verificação dos próprios testes (contraprova incompleta)

- **Pendente: em verificação.** Se o modelo sem fraude reproduz o comportamento dos votos reais no último algarismo (as 17 diferenças contra "todos iguais" deveriam sumir na comparação com o modelo), e se Benford no 1º algarismo reprova o modelo sem fraude.
- **Fato.** Os testes acusam diferenças quando elas existem nos dados: apontaram o excesso de concentração do 13 nas aldeias, as zonas do Sul com correlação alta para o 22 e o excesso de múltiplos de 10 do 22 no 1º turno (28 UFs, z +2,2). Isso mostra que eles reagem a padrões presentes nos dados. Não mostra que acusariam uma fraude: isso depende do teste com fraude simulada, ainda não feito.
- **Fato.** As simulações da primeira análise usam semente fixa (o sorteio começa sempre do mesmo ponto): rodá-las de novo dá os mesmos números. Isso garante repetição, não correção; a conferência independente delas está pendente.
- **Pendente.** **Não foi feito o teste com fraude simulada** (inserir de propósito, em dados honestos, um enchimento de urna ou números inventados de tamanho conhecido, e ver a partir de que tamanho cada teste acusa). Sem isso, não se sabe o tamanho mínimo de fraude que estes testes conseguiriam ver nos dados brasileiros. A chance de um teste acusar uma fraude de tamanho conhecido se chama **poder do teste** (ver glossário); o menor tamanho que ele acusa com boa chance é o **efeito mínimo detectável**.

## Limites

- **Fato (limite dos métodos).** Estes testes procuram fraude **grande o bastante para mudar o desenho dos números**. Como o teste com fraude simulada não foi feito, não há garantia de que eles detectem:
  - alteração pequena e espalhada por muitas seções;
  - alteração feita por sistema de forma proporcional ao voto de cada seção (ela tende a preservar o formato das distribuições e os algarismos);
  - votos de terceiros liberados sem biometria em proporção ao voto local. Esse voto entra no boletim e no resultado oficial como qualquer outro, e pode não deixar marca que estes testes vejam.
- **Risco (princípio 8).** A liberação de eleitor sem biometria depende do mesário, que digita o número do título e o ano de nascimento. Isso é uma brecha que depende só de comportamento humano, e estes testes estatísticos não conseguem dizer se ela foi usada. Ela é examinada pelo diário da urna nas hipóteses H02 e H05 e no tópico 4.
- **Hipótese não medida.** A explicação benigna para a concentração do 13 em aldeias e comunidades é o **voto em bloco** de comunidades pequenas e homogêneas. Esta mesma explicação não exclui pressão sobre o voto dentro da comunidade, que nenhum arquivo público mede.
- **Fato.** A classificação dos locais (aldeia, quilombo) deixa de fora comunidades cujo nome não indica isso. Então parte das seções "comuns" com excesso pode ser de comunidades. Isso não foi medido.
- **Fato.** O modelo de referência usa uma única medida de variação por zona. **Hipótese:** em zonas que misturam cidade e aldeia, ele espera menos casos extremos do que seria normal, e isso exagera o "excesso" medido, para os dois candidatos. A direção e o tamanho desse efeito não foram medidos.
- **Fato.** Anomalia estatística, onde existe, também não prova fraude. Ausência de anomalia não prova honestidade.
- **Fato.** Só foi testado o cargo de Presidente. Governador (2º turno em 6 UFs: AC, AM, DF, ES, RN e TO, pelos boletins no banco) não foi testado.

## Próximos passos

1. **Pendente:** segunda verificação independente (a que tenta derrubar cada achado) sobre todos os itens deste tópico.
2. **Pendente:** recalcular de forma independente os números que dependem de simulação (permutação do canto de Klimek, algarismos contra o modelo sem fraude, Benford no modelo sem fraude, percentuais redondos) e os que descontam o perfil dos eleitores (correlação, z robusto, comparecimento muito alto), depois de corrigido o problema de código do z com perfil.
3. **Pendente:** refazer com o 1º turno completo os testes que ainda não foram refeitos nele (algarismos contra o modelo sem fraude, permutação, desconto do perfil) e comparar seção a seção com o 2º.
4. **Pendente:** comparar com o 2º turno de 2022 nas mesmas seções, principalmente as 110 seções com 100% e a cauda de comparecimento alto. Se o padrão já existia em 2022, é um padrão que se repete entre eleições (isso mostra persistência, não a causa); se for novo, vira item de investigação.
5. **Pendente:** teste com fraude simulada, para medir o tamanho mínimo de fraude que cada teste detecta.
6. **Pendente:** na seção de Ipixuna-AM (zona 45, seção 63), os avisos de "eleitor já votou" e de quem é a digital nas liberações manuais. Os diários dos dois turnos já foram lidos no [tópico 3](03-linha-do-tempo.md), item 11.
7. **Feito** (segunda verificação independente): o lacre da seção do CE (zona 55, seção 160) confere depois de ignorar os zeros a mais no certificado. Falta corrigir a leitura no programa de conferência de lacres usado neste tópico, que ainda para nessa seção (**Pendente**, recomendação da segunda verificação independente).
8. **Pendente:** descontar renda (Censo por setor) nas zonas do Sul com correlação alta para o 22, e classificar aldeias e quilombos por coordenada geográfica.
9. **Pendente:** rodar os mesmos testes para Governador.
