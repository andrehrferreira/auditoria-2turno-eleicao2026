# 6. Títulos de pessoas falecidas

## A pergunta

O cadastro de eleitores de 2026 tem títulos de pessoas que já morreram? E alguém usou esses títulos para votar?

## Resposta curta

| Pergunta | Resposta | Rótulo |
|---|---|---|
| O cadastro tem títulos de pessoas que provavelmente já morreram? | **O cadastro tem mais eleitores de 100 anos ou mais do que o Censo 2022 contou de pessoas que poderiam ter essa idade em 2026.** São 297.977 eleitores aptos de 100+ com domicílio no Brasil. O Censo contou 149.424 pessoas com 96 anos ou mais e 53.568 com 95 anos. Quantos títulos sobram não entra aqui com número: depende da data em que o TSE conta a idade, que não está documentada, e de conferir quantos idosos o Censo deixou de contar. Qualquer conta exigiria suposições, por exemplo a de que ninguém morreu desde o Censo. | **Fato** (as contagens e a comparação) e **Pendente** (o tamanho do excedente) |
| Esses títulos foram usados para votar no 1º turno? | Pela contagem oficial do TSE, votaram 0,72% dos eleitores de 100+ anos, e 0,26% nos municípios onde sobram títulos. Isso não mostra uso desses títulos em larga escala. A contagem é do TSE e não pode ser refeita com os arquivos das urnas. | **Fato**, com ressalva |
| E no 2º turno? | O TSE ainda não publicou a contagem por idade. Os testes indiretos só conseguem ver uso amplo e espalhado por igual nas seções. Uso concentrado em poucas seções, ou espalhado só nas seções com 1 ou 2 eleitores de 100+, não aparece neles, mesmo quando passa de 10% dos títulos de 100+. | **Fato** (o que os testes não veem) e **Pendente** (quanto uso fica descartado) |
| Por onde um título de falecido poderia ser usado? | Pelo eleitor sem biometria cadastrada, que a urna libera só com o ano de nascimento. 92% dos títulos de 100+ estão nesse grupo. | **Fato** |
| Por que os votantes de 85 a 99 anos quase dobraram de 2022 para 2026? | O aumento faz parte de uma subida do comparecimento de todos os eleitores de 70 anos ou mais. Não aparece nos de 100+, fica abaixo da população do Censo em todos os municípios e não se concentra nos títulos sem digital. Não exclui uso pequeno e espalhado, nem o uso de título com digital liberado à mão pelo mesário, que não foi testado (Parte 4). | **Fato** (o aumento e onde ele está), **Hipótese** (a causa) e **Pendente** (a forma de liberação dos idosos) |

Nenhum CPF foi usado nesta parte da perícia. Tudo vem de números públicos por seção, zona ou município.

## O que os arquivos permitem saber, e o que não permitem

**Fato, por desenho do sistema.** Nenhum arquivo público diz qual título votou. O boletim da urna traz só totais. O registro dos votos é embaralhado. O diário da urna (log) anota que um eleitor foi liberado, e de que forma, mas, ao liberar, não anota o número do título nem o nome do eleitor. Há duas exceções, nenhuma das quais responde a esta pergunta: o diário grava o título do mesário quando a urna liga a ele uma liberação feita à mão; e, quando o mesário interrompe a votação de um eleitor que demora na cabine, a urna grava o número digitado para autorizar a interrupção, que tem formato de título (se é o do próprio eleitor é **Hipótese**, ver [tópico 12](12-sigilo-do-voto.md)). Esse registro existe só nesses atendimentos interrompidos e não diz em quem a pessoa votou. Ver também o princípio 8 das premissas desta auditoria (explicado na Parte 1, em "Por que isso acontece").

Por isso a pergunta foi dividida em duas, testadas de formas diferentes:

1. **Estoque:** quantos títulos do cadastro não têm pessoa viva correspondente. Mede-se comparando o cadastro com a população do Censo.
2. **Uso:** quantos desses títulos registraram voto. Mede-se pelo comparecimento (quantos eleitores votaram) dos grupos onde esses títulos estão.

Um título de falecido no cadastro mostra uma falha na limpeza do cadastro. Não mostra que alguém votou com ele.

## Parte 1. O cadastro tem títulos de pessoas que provavelmente já morreram?

### Como foi feito

Foram comparadas duas contagens oficiais:

- **O perfil do eleitorado do TSE** (arquivo oficial do perfil do eleitorado por seção, gerado em 14/07/2026): quantos eleitores há em cada seção, por faixa de idade e com ou sem biometria cadastrada.
- **O Censo 2022 do IBGE** (tabela 9514): quantas pessoas moravam em cada município, por idade.

Quem tinha 96 anos ou mais no Censo de 2022 (data de referência: fim de julho de 2022) é quem pode ter 100 anos ou mais até o fim de julho de 2026. Se o TSE contar a idade numa data posterior, por exemplo a da eleição, parte de quem tinha 95 anos no Censo também chega a 100+. Esse grupo de pessoas nascidas na mesma época é chamado de **coorte**. Somando à coorte os 53.568 que tinham 95 anos no Censo, ela cobre qualquer data de 2026. A data em que o TSE conta a idade não está documentada (**Pendente**).

A comparação feita foi: o número de eleitores de 100+ em 2026 é maior ou menor do que essa coorte contada no Censo? Subtrair um do outro daria um tamanho para a diferença, mas esse tamanho dependeria de suposições que não puderam ser conferidas: que ninguém da coorte morreu em quatro anos, que o Censo contou todos os idosos e em que data o TSE conta a idade. Por isso este relatório registra só a comparação, e não o tamanho da diferença.

Depois, aplicou-se a mortalidade medida pelo IBGE (Estatísticas do Registro Civil, tabela 2654, média de 2023 e 2024) para estimar quantos da coorte ainda estariam vivos. Essa parte é estimativa de modelo, e não contagem.

### O que foi encontrado

| Medida | Valor | Rótulo |
|---|---|---|
| Eleitores aptos com 100 anos ou mais, com domicílio eleitoral no Brasil | 297.977 (298.239 contando o exterior) | **Fato** |
| Pessoas com 100+ anos no Censo 2022 | 37.814 | **Fato** |
| Pessoas com 96+ anos no Censo 2022 (a coorte que chega a 100+ em 2026) | 149.424 | **Fato** |
| Pessoas com 95 anos no Censo 2022 | 53.568 | **Fato** |
| **O cadastro tem mais eleitores de 100+ do que o Censo contou de pessoas que poderiam ter essa idade em 2026** (96+ no Censo, ou 95+ se a idade for contada depois do fim de julho de 2026) | **Sim**, nas duas formas de contar | **Fato** |
| Tamanho do excedente (quantos títulos de 100+ não têm pessoa correspondente) | sem número: depende da data em que o TSE conta a idade e de conferir quantos idosos o Censo deixou de contar; qualquer conta exigiria suposições, como a de que ninguém morreu | **Pendente** |
| Coorte ainda viva em 2026 e títulos sem pessoa correspondente, com a mortalidade do IBGE | estimativa de modelo, fora deste relatório | **Pendente** |
| Eleitores de 100+ sem biometria cadastrada | 274.143 (92,0% dos 297.977 do Brasil) | **Fato** |

Para comparação, a parcela sem biometria é de 55,4% entre 90 e 99 anos, 27,9% entre 80 e 89 e 9,7% entre 18 e 69, todas sem o exterior (**Fato**, recontado em todas as seções do perfil por uma conferência própria deste tópico).

**Onde se concentram (Fato):**

| | Eleitores de 100+ | Têm biometria |
|---|---|---|
| Rio de Janeiro (estado) | 105.262 | 0,55% |
| São Paulo | 79.874 | 1,3% |
| Minas Gerais | 52.424 | 2,3% |
| Rio Grande do Sul | 21.022 | 4,4% |
| **Esses quatro estados juntos** | **86,8% de todos os eleitores de 100+ do país** | |
| Bahia | 2.565 | 91,8% |
| Ceará | 1.925 | 85,2% |

- Só a cidade do Rio de Janeiro tem 68.142 eleitores de 100+, contra 6.786 moradores de 96+ no Censo 2022.
- Na Bahia e no Ceará há **menos** eleitores de 100+ do que moradores de 96+, e a maioria deles tem biometria.
- Entre os eleitores de 100+, 51% são homens. Entre 95 e 99 anos, 43%. Entre 90 e 94, 38%. Numa população real, a parcela de mulheres cresce com a idade, porque elas vivem mais.

**Hipótese:** a maior parte desses títulos é de pessoas que morreram e não tiveram o título cancelado. Uma parte menor pode ser de pessoas vivas com a data de nascimento errada no cadastro. Os números públicos não separam os dois casos.

**Hipótese:** o padrão acompanha o recadastramento biométrico. Onde houve recadastramento (Bahia, Ceará), quem não compareceu teve o título cancelado, e a faixa de 100+ ficou abaixo da população. Onde quase ninguém de 100+ tem biometria (RJ, SP, MG, RS), os títulos antigos ficaram.

### Por que isso acontece

O título de quem morre só é cancelado quando o óbito chega à Justiça Eleitoral. Essa comunicação depende de pessoas: o cartório de registro civil precisa enviar, e o cartório eleitoral precisa processar. Além disso, depois dos 70 anos o voto é facultativo, e faltar à eleição não cancela o título. Um título de quem morreu aos 85 anos pode continuar no cadastro por décadas sem chamar atenção.

Pelo princípio 8 desta perícia, uma etapa feita por pessoas **não conta como controle**. Ela não serve para explicar que "está tudo certo" nem para acusar alguém. Ela é tratada como **risco**: uma brecha que precisa ser testada nos dados para saber se foi usada. A brecha existe: o cadastro tem mais eleitores de 100+ do que o Censo contou de pessoas com idade para isso em 2026. O tamanho dela é **Pendente**, porque depende da data em que o TSE conta a idade e de quantos idosos o Censo deixou de contar (ver a contraprova abaixo). A Parte 2 mostra o que os dados dizem sobre o uso.

### Prova de que o teste funciona (contraprova)

- **Reprodução independente.** Uma segunda verificação, independente, leu de novo os arquivos brutos do TSE e do IBGE com outro programa e chegou aos mesmos números: 297.977, 149.424 e 274.143. A soma dos 5.570 municípios dá exatamente os totais do país, e nenhum município ficou sem par entre TSE e IBGE (**Fato**).
- **E se o Censo tiver deixado de contar idosos?** Quanto mais idosos o Censo tiver deixado de contar, menor é a diferença entre o cadastro e a população. Quantos ele deixou de contar não foi conferido. Por isso o tamanho do excedente fica **Pendente**, sem número.
- **E se forem datas de nascimento inválidas?** O cadastro tem um código próprio para data inválida (1.212 eleitores), separado da faixa de 100+ (**Fato**).
- **E se a idade for calculada em outra data?** A data não está documentada (**Pendente**). Se for posterior ao fim de julho de 2026, parte de quem tinha 95 anos no Censo também chega a 100+. Mesmo somando os 53.568 que tinham 95 anos, o cadastro continua com mais eleitores de 100+ do que o Censo contou de pessoas com idade para isso, em qualquer data de 2026 (**Fato**).
- **E se forem eleitores que moram no exterior?** O exterior tem 262 eleitores de 100+ e já foi excluído da conta (**Fato**).

### O que não se pode afirmar com este teste

- **Município a município, a comparação engana.** O título fica onde a pessoa se alistou, e o Censo conta onde ela mora. Em 1.068 municípios há mais eleitores de 100+ do que moradores de 96+, em 4.186 acontece o contrário e em 316 os dois números são iguais. A comparação que vale é a do país inteiro, e não a soma dos municípios com sobra (**Fato**).
- **A comparação não mostra quem votou nem uso desses títulos.** Ela mede o cadastro, e não o comparecimento. O uso é tratado na Parte 2.
- **Faixa de 90 a 99 anos.** Pode haver sobra também nessa faixa, mas o resultado muda de sinal conforme as premissas do modelo. Não é achado (**Pendente**).

## Parte 2. Esses títulos foram usados para votar?

### 1º turno: o que diz a contagem oficial do TSE

O TSE publica o arquivo oficial do perfil de comparecimento e abstenção, com quantos eleitores de cada faixa de idade votaram, por município e zona. A versão disponível foi gerada em 13/10/2026 e traz **só o 1º turno**.

| Faixa de idade | Votaram, 1º turno |
|---|---|
| 16 e 17 anos | 87,3% |
| 18 a 69 | 82,3% |
| 70 a 79 | 62,1% |
| 80 a 89 | 32,7% |
| 90 a 99 | 10,4% |
| **100 ou mais** | **0,72% (2.141 de 298.239)** |

Fonte: perfil de comparecimento e abstenção de 2026, dados abertos do TSE. **Fato.**

Separando os municípios:

| 1º turno, contagem oficial | Municípios | Eleitores de 100+ | Votaram | Taxa |
|---|---|---|---|---|
| Com mais eleitores de 100+ do que moradores de 96+ | 1.068 | 275.334 | 717 | **0,26%** |
| Sem essa sobra (só os municípios com algum eleitor de 100+) | 3.329 | 22.643 | 1.424 | 6,3% |
| Exterior (sem município no IBGE) | 59 | 262 | 0 | 0% |

As três linhas somam os 298.239 eleitores de 100+ e os 2.141 que votaram.

**Fato:** onde estão os títulos que sobram, quase ninguém de 100+ votou (0,26%). Onde não sobram títulos, a taxa é de 6,3%. **Hipótese:** essa taxa é a de centenários vivos que ainda votam.

**O que isso permite concluir:** se esses títulos tivessem sido usados por terceiros em escala, eles surgiriam como comparecimento. A contagem oficial mostra 2.141 votos de eleitores de 100+ em todo o país, menos de 1% dos 298.239 títulos (0,72%). **No 1º turno, a contagem oficial não mostra uso desses títulos em larga escala** (**Fato**, desde que a contagem oficial esteja correta). Ela não exclui uso de poucos títulos, porque o número de votantes de 100+ não diz quem eram eles.

**Ressalva.** Essa contagem é feita pelo próprio TSE. Ela não pode ser refeita com os arquivos das urnas, porque o diário da urna não registra a idade de quem votou. Há dois indícios de que ela é coerente: as contagens por faixa de idade são idênticas às do perfil do eleitorado (298.239 eleitores de 100+ nos dois arquivos), e o comparecimento total do arquivo (125.277.230) difere do arquivo oficial por seção (125.275.835) em 1.395 eleitores. A origem dessa diferença não foi examinada (**Pendente**). Coerência não é conferência independente.

### 2º turno: o que dá e o que não dá para descartar

**Pendente:** o TSE ainda não publicou o arquivo de comparecimento por idade do 2º turno. Sem ele, só restam testes indiretos. Eles comparam o comparecimento das seções que têm muitos títulos de 100+ com o das seções que têm poucos.

| Teste indireto, 2º turno | Descarta | Não descarta |
|---|---|---|
| Comparar a mesma seção no 1º e no 2º turno | uso amplo, feito só no 2º turno e espalhado por igual nas seções com eleitores de 100+ | uso pequeno; uso concentrado em poucas seções ou municípios; uso só nas seções com 1 ou 2 eleitores de 100+. O tamanho exato do que o teste descarta é estatístico (**Pendente**) |
| Comparar seções com mais e menos títulos de 100+ dentro do mesmo município | só uso uniforme muito amplo, bem maior do que o teste anterior vê (**Pendente**: o limite exato é estatístico) | qualquer uso menor |

Fonte: revisão independente dos testes, com simulações em que votos falsos foram inseridos nos dados para ver se o teste os acharia. **Fato** (o que cada teste consegue e não consegue ver).

Exemplos do que passaria despercebido: um título de 100+ usado em cada uma das 86.934 seções da análise do 2º turno que têm algum eleitor dessa idade (as seções agregadas contam junto com a seção principal) somaria 86.934 votos e mal mexeria no resultado da comparação dentro do mesmo município. Usar todos os títulos de 100+ das seções que têm só 1 ou 2 deles (61.540 votos) não seria visto em nenhum dos dois testes. Usar todos os títulos de 100+ de 1% dos municípios também não seria visto (**Fato**, simulação).

**Um teste que foi retirado.** Uma análise anterior apresentava como evidência que, "em nenhuma das 22.389 seções com 5 ou mais eleitores de 100+, o comparecimento obriga algum deles a ter votado". O número é verdadeiro, mas o teste não tem **poder** (capacidade de detectar algo que existe): com 99.471 votos falsos inseridos nas 10% de seções com mais centenários, ele continuou acusando zero seções. Por isso não é usado como evidência neste relatório (**Fato**).

### Lugares que pedem exame, com números pequenos

**Hipótese:** pela contagem oficial do 1º turno, alguns municípios têm taxa de comparecimento de 100+ acima de 25%: Icatu (MA, 7 de 22), Redentora (RS, 6 de 20), Florianópolis (SC, 7 de 24), Pirapemas (MA, 7 de 24) e Pilão Arcado (BA, 6 de 21). Em Arame (MA), 37 de 84 eleitores de 90 a 99 anos votaram (44%, contra 10,4% no país); a seção 0070 da zona 0104 já tinha sido apontada numa análise anterior desta auditoria. Taxa alta em números tão pequenos pode ter causa comum (centenários vivos, recadastrados). São pontos de partida para examinar o diário dessas urnas, e não conclusões.

### Um caso conferido no arquivo bruto

**Fato:** RJ, Rio de Janeiro, zona 0005, seção 0001, 2º turno. O cadastro tem 40 eleitores de 100+ nessa seção, 39 deles sem biometria. A seção tem 330 eleitores aptos e 202 votaram. Só 7 entraram pelo caminho "sem biometria". Se a biometria no arquivo da urna for a mesma do perfil, **no máximo 8** desses 40 títulos podem ter votado (os 7 sem biometria, se todos fossem centenários, e o único com biometria). A Parte 3 mostra que as duas nem sempre coincidem, nos dois sentidos. Por isso o limite vale com essa condição. Fonte: boletim da urna lido diretamente do arquivo.

## Parte 3. Por que o eleitor sem biometria é o ponto fraco

### Como a urna libera um eleitor

Quando o eleitor chega à mesa, o mesário digita o número do título. A urna procura o eleitor no arquivo de eleitores que foi gravado nela antes da eleição. Daí há dois caminhos:

- **O eleitor tem digital no arquivo da urna.** A urna pede a digital e compara. Se bater, libera. O diário da urna registra isso. É um **controle técnico com rastro**.
- **O eleitor não tem digital no arquivo da urna.** A urna pede só o **ano de nascimento**, que o mesário digita. Se bater com o cadastro, libera. O diário registra a mensagem "Ano de nascimento digitado é igual ao do cadastro". A conferência do documento com foto é feita pelo mesário, a olho, e não deixa rastro.

Pelo princípio 8, o segundo caminho não tem controle técnico. Quem souber o número do título e o ano de nascimento de um eleitor sem biometria consegue votar no lugar dele, se a mesa permitir. É por esse caminho que um título de falecido poderia ser usado sem deixar marca de digital. E 92% dos títulos de 100+ estão nesse grupo.

Isso é uma **brecha**, e não prova de uso. O que prova uso é rastro nos dados.

### O achado das 16 mil seções

**Fato:** em 16.011 das 497.508 seções do 2º turno analisadas (3,2%), o boletim da urna registra **mais** eleitores liberados "sem biometria cadastrada" do que o perfil público do TSE diz existir naquela seção, já descontada uma folga para os eleitores em trânsito. A diferença soma 36.340 eleitores (0,03% dos votantes do Brasil no 2º turno). Em 7.922 dessas seções, o perfil público diz que **todos** os eleitores têm biometria. A conta cobre o Brasil, sem o exterior: das 497.897 seções do Brasil com voto, ficaram fora as 389 que não aparecem no perfil de 14/07/2026.

- Concentra-se em algumas zonas: Vitória (ES), zona 0052 (126 seções, 680 eleitores); Indaiatuba (SP), zona 0211 (84 seções, 600); Ulianópolis (PA), zona 0084 (52 seções, 561).
- **1º turno: Pendente, em verificação.** A conta existente do 1º turno foi feita antes de a base de dados da auditoria ter todas as UFs. A contagem do 1º turno, e a comparação seção a seção entre os dois turnos, só entram neste relatório depois de refeitas com todas as UFs.
- Caso conferido no arquivo bruto: Indaiatuba (SP), zona 0211, seção 0438, 2º turno. O boletim registra 65 eleitores sem biometria; o diário da urna tem 65 liberações só por ano de nascimento que terminaram em voto. O perfil público diz que a seção tem 337 eleitores, todos com biometria.

À primeira vista, isso parecia uma contagem impossível: a urna liberando sem digital mais gente do que existe sem digital.

### Como a "foto do eleitor" no diário da urna explicou a diferença

Na revisão independente, procurou-se no diário da urna o que acontecia nesses atendimentos, e apareceu uma marca: a mensagem **"Foto do eleitor apresentada"**, sem nenhum pedido de digital. A medida abaixo cobre **todas** as 378 seções do 2º turno com excesso de 10 eleitores ou mais (e não uma amostra delas).

| Nas 378 seções com excesso de 10 ou mais, 2º turno | Atendimentos | Com a mensagem da foto |
|---|---|---|
| Eleitores liberados sem biometria | 7.970 | 6.761 (84,8%) |
| Eleitores liberados por digital (referência) | 83.472 | 82.894 (99,3%) |

- **Fato:** nessas 378 seções, contando como "sem biometria" só quem também não tem foto, o excesso cai de 5.560 para 54 eleitores (99% a menos).
- **Fato:** nenhum dos 7.970 atendimentos sem biometria dessas seções teve pedido de digital. Ou seja, a mesa não "pulou" a digital: a urna foi direto ao ano de nascimento. **Hipótese:** pelo funcionamento da urna descrito acima, isso acontece quando o arquivo de eleitores gravado nela não tem a digital da pessoa. O conteúdo desse arquivo não é público.
- **Fato:** o perfil público é de 14/07/2026. Nas 378 seções, o diário registra que a mídia da urna (que leva o arquivo de eleitores) foi gerada entre 17 e 27/09/2026; uma delas tem um segundo diário, de mídia gerada em 20/10/2026. São duas fotografias do cadastro em datas diferentes.
- **Fato:** há também o efeito no sentido inverso, maior e em outras zonas: nas mesmas 497.508 seções, 17.621 com **mais** eleitores liberados por digital do que o perfil diz ter biometria (229.717 eleitores).
- **Pendente, em verificação:** a mesma medida da foto nas outras seções com excesso (de 1 a 9) e nas seções sem excesso. As revisões independentes a fizeram só em amostras dessas seções, e números de amostra não entram neste relatório. Sem essa medida em todas as seções, não está medido quanto a marca da foto é rara fora das seções com excesso.

**Leitura.** Nas seções medidas, o "com biometria" do perfil público não é o mesmo "com digital no arquivo da urna". Esses eleitores têm foto registrada, mas não têm digital utilizável na urna.

- **Hipótese (a mais provável, a confirmar com o TSE):** são eleitores que fizeram a coleta biométrica (a foto ficou registrada), mas a digital ficou pendente, foi rejeitada ou tinha qualidade ruim.
- **Hipótese (não separável com dados públicos):** a mesma marca surgiria se as digitais tivessem sido retiradas do arquivo na preparação das urnas. As duas explicações deixam o mesmo rastro. Só o TSE pode separar uma da outra.
- **Pendente:** sobra um resíduo que a foto não explica, localizado sobretudo em Indaiatuba (SP), zona 0211, seções 0430 a 0444. O tamanho dele no universo completo não foi medido, e a causa não foi testada.

**O que isto significa para a pergunta dos falecidos.** Não há sinal de eleitores a mais: em nenhuma seção o número de votantes passa do número de eleitores aptos. Os testes de comparecimento não mostram uso sistemático desse caminho. Mas, pelo princípio 8, o risco continua: esses eleitores votaram só com o número do título, o ano de nascimento e a foto mostrada ao mesário. **Hipótese:** o grupo nessa situação é maior que os 36.340 do excesso. Nas 378 seções medidas, os atendimentos sem biometria com foto (6.761) já passam do excesso delas (5.560). O tamanho do grupo no país inteiro não foi medido (**Pendente**).

### Prova de que o teste funciona (contraprova)

- **A marca da foto explica o excesso onde foi medida.** Nas 378 seções com excesso de 10 ou mais, tirar os atendimentos com foto zera quase todo o excesso (de 5.560 para 54) (**Fato**). Quanto a marca é rara nas seções sem excesso ainda não foi medido em todas elas (**Pendente**).
- **O teste de uso consegue achar uso amplo.** Na revisão independente, foram inseridos votos falsos nos dados, do tamanho do excesso observado, em 28% das seções: o teste os detectou em 10 de 10 repetições. Em 5% das seções, a detecção é incerta: o resultado muda entre rodadas da simulação (**Fato**, simulação).
- **O teste não consegue achar uso em poucas seções ou em poucos eleitores por seção.** "Não houve uso" não está provado. O que o teste mostra é que não houve uso amplo e espalhado pelas seções, do tipo simulado (**Fato**). Outros formatos de uso, como o concentrado em poucas seções, ficam fora do que ele vê.
- **O diário e o boletim batem, mas isso não é conferência independente.** Os dois saem do mesmo programa da urna. A igualdade mostra coerência interna, e não que o arquivo de eleitores gravado na urna estava correto (**Fato**).

## Parte 4. Por que mais idosos votaram em 2026

### A pergunta desta parte

Do 1º turno de 2022 para o 1º turno de 2026, o número de eleitores de 85 a 99 anos que foram votar quase dobrou: de 267.098 para 460.338. No mesmo tempo, o número de eleitores cadastrados nessas idades ficou parecido ou caiu. Um aumento assim chama a atenção, porque poderia ser sinal de alguém votando com o título de pessoas que já morreram. Por isso ele foi examinado por vários lados.

Nesta parte, **votante** é o eleitor que compareceu à urna e votou; **apto** é o eleitor do cadastro que podia votar. A parte dos aptos que votou é a **taxa de comparecimento**. Depois dos 70 anos o voto é **facultativo**: o eleitor pode faltar sem nenhuma consequência para o título.

### Como foi feito

- **Fonte:** o arquivo oficial do TSE de comparecimento por idade (o mesmo da Parte 2), do 1º turno de 2018, de 2022 e de 2026, e do 2º turno de 2022, por município, zona e faixa de idade. Todas as zonas do Brasil; o exterior fica fora de todos os números.
- **Comparação no tempo:** votantes e aptos de cada faixa de 5 anos, de 70 a 99, e de 100 ou mais, nas três eleições.
- **Comparação com a população:** os votantes de 2026 contra as pessoas da mesma geração contadas no Censo 2022 (quem tem 90 anos em 2026 tinha 86 no Censo).
- **Comparação entre estados:** a subida dos votantes de 85 a 99 anos em cada estado, ao lado da parcela de idosos sem digital cadastrada no perfil do eleitorado de julho de 2026.
- **Votos que só podem ter vindo de título sem digital:** em cada zona, os votantes de uma faixa de idade menos os eleitores dessa faixa com digital cadastrada. Se votaram mais idosos do que os que têm digital, a diferença só pode ter vindo de títulos sem digital.
- Uma segunda verificação independente refez todas as contas por outro caminho (outra leitura dos arquivos, a faixa de idade tirada do nome da faixa e não do código, o total de votantes conferido contra o resultado oficial por seção) e chegou aos mesmos números, até a unidade.

### O que foi encontrado

**Os votantes e os aptos de 70 anos ou mais, 1º turno (Fato):**

| Faixa de idade | Votantes 2018 | Votantes 2022 | Votantes 2026 | Aptos 2018 | Aptos 2022 | Aptos 2026 |
|---|---:|---:|---:|---:|---:|---:|
| 70 a 74 | 2.628.207 | 3.586.278 | 4.785.687 | 4.756.393 | 5.873.026 | 6.948.245 |
| 75 a 79 | 1.187.990 | 1.611.724 | 2.487.406 | 3.167.513 | 3.852.604 | 4.757.020 |
| 80 a 84 | 475.771 | 653.575 | 1.019.734 | 1.971.647 | 2.422.352 | 2.744.129 |
| 85 a 89 | 148.661 | 209.762 | 356.147 | 1.121.195 | 1.333.976 | 1.464.715 |
| 90 a 94 | 33.682 | 49.745 | 89.530 | 688.768 | 738.244 | 664.482 |
| 95 a 99 | 5.082 | 7.591 | 14.661 | 272.334 | 466.703 | 337.136 |
| 100 ou mais | 1.506 | 1.675 | 2.141 | 39.026 | 184.330 | 297.977 |

Fonte: perfil de comparecimento e abstenção do TSE, 1º turno de cada ano, Brasil sem o exterior. **Como ler:** cada linha é uma faixa de idade na data da eleição; as três primeiras colunas de números dizem quantos foram votar, as três últimas quantos estavam no cadastro. De 2022 para 2026, os votantes de 85 a 89 anos passaram de 209.762 para 356.147, e os aptos dessa idade, de 1.333.976 para 1.464.715.

**Parte dos aptos que votou, 1º turno (Fato):**

| Faixa de idade | 2018 | 2022 | 2026 |
|---|---:|---:|---:|
| 70 a 74 | 55,3% | 61,1% | 68,9% |
| 75 a 79 | 37,5% | 41,8% | 52,3% |
| 80 a 84 | 24,1% | 27,0% | 37,2% |
| 85 a 89 | 13,3% | 15,7% | 24,3% |
| 90 a 94 | 4,9% | 6,7% | 13,5% |
| 95 a 99 | 1,9% | 1,6% | 4,3% |
| 100 ou mais | 3,9% | 0,91% | 0,72% |

**Como ler:** de 2022 para 2026, a taxa subiu em todas as faixas de 70 a 99 anos, e caiu na de 100 ou mais.

**A régua não mudou (Fato).** O total de votantes contado por idade é o mesmo contado seção por seção, nas três eleições:

| 1º turno | Votantes no arquivo por idade | Votantes no resultado por seção | Diferença |
|---|---:|---:|---:|
| 2018 | 117.160.873 | 117.161.888 | 1.015 |
| 2022 | 123.377.429 | 123.378.340 | 911 |
| 2026 | 124.932.569 | 124.934.069 | 1.500 |

- Em todas as linhas dos três arquivos, os aptos são iguais aos votantes mais os que faltaram.
- A idade é sempre a do dia da eleição. Os nomes das faixas são os mesmos nos três anos.
- Em 2026, em todas as 6.106 zonas eleitorais, o número de aptos de 70 a 79, de 80 a 89, de 90 a 99 e de 100 anos ou mais no arquivo de comparecimento é exatamente o do perfil do eleitorado publicado em julho (diferença 0): os dois arquivos contam a idade na mesma data. Ninguém "mudou de faixa" por causa de uma troca na forma de contar. E uma troca assim mudaria aptos e votantes juntos, na mesma proporção: não faria a taxa de 85 a 89 anos passar de 15,7% para 24,3%.
- A transferência de título muda o eleitor de zona, mas não cria votante no país. Nas 6.082 zonas que existem com o mesmo número nos dois anos, os votantes de 85 a 99 anos subiram de 266.644 para 459.207 (+72,2%), o mesmo que no país.

**O aumento começou aos 70 anos (Fato).** De 70 a 74 anos, os votantes passaram de 3.586.278 para 4.785.687. De 75 a 79, de 1.611.724 para 2.487.406. De 80 a 84, de 653.575 para 1.019.734. Nessas idades quase não há títulos de pessoas mortas no cadastro. Quem tem 70 anos ou mais não é obrigado a votar, e esse grupo inteiro foi votar muito mais em 2026. Os de 85 a 99 seguiram o mesmo movimento.

**Já tinha acontecido antes, com o cadastro parado (Fato).** Entre o 1º e o 2º turno de 2022, nenhum eleitor entrou ou saiu do cadastro. Mesmo assim, os idosos foram votar mais no 2º turno, e tanto mais quanto mais velhos:

| Faixa de idade | Votantes, 1º turno de 2022 | Votantes, 2º turno de 2022 | Aumento |
|---|---:|---:|---:|
| 25 a 59 (referência) | 84.930.861 | 84.965.120 | 0,0% |
| 70 a 74 | 3.586.278 | 3.830.123 | 6,8% |
| 75 a 79 | 1.611.724 | 1.805.727 | 12,0% |
| 80 a 84 | 653.575 | 766.463 | 17,3% |
| 85 a 89 | 209.762 | 257.033 | 22,5% |
| 90 a 94 | 49.745 | 63.529 | 27,7% |
| 95 a 99 | 7.591 | 10.161 | 33,9% |
| 100 ou mais | 1.675 | 2.092 | 24,9% |

Fonte: perfil de comparecimento e abstenção do TSE de 2022, os dois turnos, Brasil sem o exterior. **Como ler:** os aptos são os mesmos nos dois turnos; a última coluna mostra quanto cada faixa foi votar a mais no 2º turno. Entre os eleitores de 25 a 59 anos, quase nada mudou.

Quando uma eleição mobiliza, os mais velhos são os que mais mudam de comportamento. É como uma maré: ela sobe mais onde a água estava mais baixa. Também de 2018 para 2022 os idosos já tinham votado mais (de 70 a 74 anos, de 55,3% para 61,1%), enquanto os de 25 a 59 ficaram parecidos (de 84,2% para 83,7%): 2022 não foi um ano de idosos em casa.

**Há gente viva de sobra (Fato).** Pelo Censo de 2022, havia 2.202.470 pessoas com idade para ter de 85 a 89 anos em 2026, contando como se ninguém tivesse morrido. Esse número é um **teto**: a população real dessa geração em 2026 só pode ser menor, salvo migração ou erro do Censo.

| Faixa em 2026 | Pessoas da mesma geração no Censo 2022 (teto, sem descontar mortes) | Votantes 2026 | Votantes por 100 pessoas do teto |
|---|---:|---:|---:|
| 85 a 89 | 2.202.470 | 356.147 | 16 |
| 90 a 94 | 1.161.588 | 89.530 | 8 |
| 95 a 99 | 461.087 | 14.661 | 3 |

Nenhum dos 5.570 municípios com código no IBGE teve mais votantes de 85 a 99 anos em 2026 do que moradores da mesma geração no Censo de 2022 (quem tinha de 80 a 95 anos). Um município do cadastro não tem código no IBGE e ficou fora dessa comparação.

**Os centenários não subiram (Fato).** O grupo de 100 anos ou mais é onde está a maior parte dos títulos de pessoas que já morreram e não foram retiradas do cadastro (Parte 1). O cadastro desse grupo cresceu de 184.330 para 297.977. Os votantes foram de 1.675 para 2.141. Não houve salto ali.

**O aumento não se concentrou nos títulos antigos sem digital (Fato).** Os estados onde a maioria dos idosos não tem digital cadastrada tiveram aumento menor que os estados onde quase todos têm. Para os votantes de 85 a 99 anos, de 2022 para 2026:

| Estado | Aptos de 90 a 99 anos sem digital cadastrada | Aumento dos votantes de 85 a 99 anos |
|---|---:|---:|
| Rio de Janeiro | 88% | +56% |
| São Paulo | 77% | +61% |
| Minas Gerais | 77% | +63% |
| Rio Grande do Sul | 60% | +60% |
| Ceará | menos de 6% | +103% |
| Pará | menos de 6% | +106% |
| Piauí | menos de 6% | +102% |

Essa diferença entre estados também tem causas regionais, que aparecem em outras idades: os estados se separam do mesmo jeito entre os eleitores de 25 a 69 anos, onde não há títulos de mortos que façam diferença, e, entre o 1º e o 2º turno de 2022, com o cadastro parado, a separação foi no sentido contrário. Por isso ela mostra só que o aumento não está onde estão os títulos sem digital, e não a causa do aumento.

**Votos que só podem ter vindo de título sem digital (Fato).** Somando zona por zona, no 1º turno de 2026:

| Faixa de idade | Votos que só podem ter vindo de título sem digital cadastrada (piso) | Zonas em que isso acontece | Votantes da faixa |
|---|---:|---:|---:|
| 80 a 89 | 12.004 | 307 | 1.375.881 |
| 90 a 99 | 970 | 222 | 104.191 |
| 100 ou mais | 157 | 133 | 2.141 |

**Como ler:** em cada uma dessas zonas votaram mais idosos da faixa do que os que têm digital cadastrada no perfil de julho de 2026; a sobra só pode ter vindo de títulos sem digital. É um **piso**: o número verdadeiro de idosos que votaram sem digital pode ser muito maior, porque numa zona onde votaram menos idosos do que os que têm digital a conta dá zero, mesmo que muitos deles tenham votado sem digital. A conta é por zona porque o arquivo de comparecimento por idade não desce até a seção. Nas faixas de 80 a 89 e de 90 a 99 anos, em nenhuma das 6.106 zonas o piso passa do número de eleitores liberados "sem biometria cadastrada" no boletim da própria zona: os três arquivos são coerentes.

Caso conferido no arquivo bruto: ES, município de código 56995, zona 0053, a zona com o maior piso de 80 a 89 anos. O cadastro tem 2.764 eleitores de 80 a 89 anos, 312 deles com digital. Votaram 834. A sobra é 834 − 312 = 522. Nessa zona, 89 em cada 100 eleitores de 80 a 89 anos não têm digital cadastrada, e 30 em cada 100 votaram. O piso dessa zona é o que se espera de idosos vivos sem digital, e **não é indício por si**.

### O que isso permite dizer

**Fato:** o aumento dos votantes de 85 a 99 anos faz parte de uma subida geral do comparecimento de quem tem 70 anos ou mais. Ele não precisa de títulos de pessoas mortas para existir, e não se concentra nos títulos sem digital.

**Hipótese:** a causa da subida dos idosos em 2026: mobilização da campanha, transporte no dia da eleição, ou uma geração que votou a vida inteira e chega agora aos 70 anos. Não foi conferida.

### Prova de que o teste funciona (contraprova)

- **Dois caminhos, os mesmos números.** A segunda verificação independente leu de novo os arquivos com outro programa, tirou a faixa de idade do nome da faixa (e não do código), somou todas as colunas de quantidade e conferiu o total de votantes contra o resultado por seção. Chegou aos mesmos números em todas as faixas, até a unidade. Nenhuma linha dos três arquivos tem coluna a mais ou a menos (**Fato**).
- **As explicações sem fraude foram testadas uma a uma, e não só a favorável.** "Mudou o que se conta como votante", "mudou a data da idade", "transferência de títulos" e "2022 foi um ano atípico" foram testadas e descartadas pelos números acima (**Fato**).
- **O Censo confere com ele mesmo.** A idade ano a ano do Censo soma exatamente os grupos de 5 anos do mesmo arquivo, em todas as faixas de 65 a 99 anos (**Fato**).

### O que não se pode afirmar com este teste

- **Que nenhum título de pessoa morta foi usado.** Um uso pequeno e espalhado não apareceria nesses números.
- **Como os idosos a mais foram liberados.** Não foi possível ver se votaram com a própria digital ou foram liberados pelo mesário: o diário da urna anota como o eleitor foi liberado, mas não a idade dele. Os arquivos públicos não ligam um dado ao outro.
- **De quem são os 12.004 votos de 80 a 89 anos, os 970 de 90 a 99 e os 157 de 100 ou mais.** Podem ser de idosos vivos sem digital, que são muitos nessas idades (27,9% dos aptos de 80 a 89 anos e 55,4% dos de 90 a 99; em algumas zonas, quase todos), ou de alguém usando o título de outra pessoa. Os arquivos públicos não separam um caso do outro. O piso também vale para "sem digital no cadastro de julho", que nem sempre é o mesmo que "sem digital no arquivo da urna" (Parte 3).
- **O caminho do título com digital, liberado pelo mesário, não foi testado.** O título de uma pessoa morta que tinha digital cadastrada não passa pela urna com a digital de outra pessoa. Mas o mesário pode liberar o eleitor à mão quando a digital não é reconhecida, com a própria digital no diário. Esse caminho existe sobretudo onde o cadastro foi revisado com coleta de digital (Norte e Nordeste), para quem morreu depois da revisão e ainda não teve o título cancelado, e foi justamente nesses estados que o aumento foi maior. A comparação entre estados não descarta esse caminho (**Hipótese** não testada).
- **O teste "votantes abaixo da população" é fraco para uso pequeno.** Ele mostra que havia gente viva de sobra para os votos, mas não detectaria uso de títulos de mortos na casa das dezenas de milhares no país inteiro.
- **"Os centenários não subiram" é argumento fraco** contra quem evitasse de propósito o grupo de 100 anos ou mais, o mais vigiado. A contagem de pessoas de 100+ no Censo também é pouco confiável, porque muitos idosos declaram idade a mais.

### Pendente

- **Pendente:** os votantes de 80 anos ou mais por forma de liberação na urna (digital do próprio eleitor, ano de nascimento, liberação pelo mesário), em 2022 e em 2026. Só o TSE liga o título à forma de liberação; o pedido está entre os pedidos pela LAI, abaixo.
- **Pendente:** os títulos cancelados por óbito depois do fechamento do cadastro que tiveram voto registrado em 2026 (pedido pela LAI, abaixo).
- **Pendente:** o mesmo piso de votos sem digital em 2022, para saber se ele cresceu. Depende do perfil do eleitorado por seção de 2022, que ainda não foi lido.
- **Pendente:** a causa da subida dos idosos em 2026, que continua **Hipótese**.
- **Pendente:** os aptos de 95 a 99 anos e de 100 ou mais mudaram muito de 2018 para 2022 (de 39.026 para 184.330 em 100 ou mais). A causa não foi examinada nesta parte.

## Um fenômeno vizinho que não é o mesmo: municípios com mais eleitores do que moradores

**Fato:** em 2.898 dos 5.570 municípios (52%), o perfil de julho de 2026 tem mais eleitores de 16+ do que moradores de 12+ no Censo 2022. O fenômeno se concentra em municípios pequenos. O percentual muda conforme a definição de idade e o ano da população.

**Fato:** no 2º turno, em 579 municípios votou mais gente do que a população de 12+ de 2022. Agrupando todos os municípios pela razão entre eleitores e moradores, a parcela de votantes liberados pela digital em cada grupo fica a no máximo 0,62 ponto da média do estado, inclusive nos grupos em que há mais eleitores que moradores. **Hipótese:** isso indica pessoas reais, presentes na urna, com título num município diferente de onde moram, e não títulos de falecidos em massa. Quanto os títulos excedentes comparecem é estimativa de modelo e fica fora deste relatório (**Pendente**).

**Hipótese:** a maior parte é migração com título mantido na cidade de origem ou domicílio eleitoral por vínculo familiar ou profissional, que a lei permite. Os dados agregados não separam isso de transferência irregular de títulos. É tema de outro tópico, e não deste.

Fonte: perfil do eleitorado de julho de 2026 e Censo 2022, conferidos por uma revisão independente.

## Outro fenômeno vizinho: seções novas com comparecimento muito alto

Uma explicação proposta para seções com comparecimento muito alto é que a seção nova não carrega títulos de pessoas que morreram ou se mudaram, e por isso parece votar mais. Esta seção mostra o que os dados dizem sobre isso. **Seção nova** aqui é a seção cujo número (estado, município, zona e seção) não existia na eleição de 2022 ou na de 2024 (o DF e o exterior não votaram em 2024, e para eles vale só 2022). As seções apuradas em cédula e as que não têm arquivo de urna ficam fora.

**Fato:** seções criadas depois de 2022 chegaram a 95% de comparecimento ou mais com muito mais frequência que as antigas.

| 2º turno de 2026 | Seções | Com 95% ou mais de comparecimento |
|---|---:|---:|
| Novas | 40.740 | 433 |
| Antigas | 458.438 | 206 |

A seção nova costuma ser menor, e seção pequena varia mais, como uma moeda jogada 10 vezes varia mais que uma jogada 300 vezes. Também costuma reunir eleitores que acabaram de tirar o título. **Fato:** mesmo comparando seções do mesmo tamanho e com a mesma parcela de eleitores jovens, a nova ainda chega a 95% bem mais vezes.

| Parcela de eleitores de 16 a 20 anos na seção | Seções novas | Novas com 95% ou mais | Seções antigas | Antigas com 95% ou mais |
|---|---:|---:|---:|---:|
| Menos de 5% | 9.538 | 14 | 297.025 | 100 |
| De 5% a 10% | 6.868 | 70 | 137.497 | 82 |
| De 10% a 20% | 7.929 | 119 | 22.376 | 17 |
| 20% ou mais | 16.109 | 205 | 1.447 | 3 |
| Sem dado de idade no perfil | 296 | 25 | 93 | 4 |
| **Total** | **40.740** | **433** | **458.438** | **206** |

Fonte: resultado por seção e perfil do eleitorado do TSE, 2º turno de 2026. **Como ler:** compare as duas colunas "com 95% ou mais" dentro de cada linha. Entre as seções com 10% a 20% de eleitores jovens, por exemplo, foram 119 de 7.929 novas contra 17 de 22.376 antigas. Na linha de 20% ou mais quase não há seção antiga para comparar (1.447, só 3 delas com 95% ou mais): ali a comparação tem pouca base.

**Fato:** a diferença fica maior quanto mais alto o corte.

| Corte de comparecimento, 2º turno | Seções novas acima do corte | Seções antigas acima do corte |
|---|---:|---:|
| 90% ou mais | 3.180 | 11.661 |
| 95% ou mais | 433 | 206 |
| 98% ou mais | 56 | 10 |

**Fato:** no mesmo prédio de votação, a seção nova vota em média um pouco **menos** que as antigas, e as antigas desses prédios votaram em 2026 como em 2022. Esse mesmo excesso de seções novas muito altas já aconteceu em 2022, em escala menor, e desapareceu nos anos seguintes.

**Pendente:** por que o excesso de 2026 é maior, e se ele vem de a seção nova reunir eleitores que se cadastraram ou se mudaram há pouco tempo. Esse teste depende da data de alistamento ou transferência dos eleitores de cada seção, que só a Justiça Eleitoral tem. As 56 seções novas com 98% ou mais são poucas o bastante para conferir uma a uma (local de votação, eleitores em trânsito, liberação sem digital e diário da urna): **Pendente**.

**O que isso não permite dizer:** o exame mede cadastro e comparecimento, e não diz se algum voto foi irregular. Nenhum destes testes vê voto dado com o título de outra pessoa.

## Limites desta parte da perícia

1. **Nenhum CPF foi usado.** A frente descrita aqui usa só contagens públicas por seção, zona e município. A frente por CPF (cruzar títulos com registros de óbito) é tratada à parte e não faz parte deste tópico.
2. **Não é possível dizer que um título específico votou.** O caderno de votação (a lista assinada pelos eleitores na mesa) não é público, e os arquivos da urna não identificam o eleitor que votou (fora o número gravado quando a votação de um eleitor é interrompida, que é **Hipótese**; ver "O que os arquivos permitem saber").
3. **Não é possível separar falecidos de vivos com a data de nascimento errada**, entre os títulos de 100+ que não votam.
4. **O 2º turno não tem contagem oficial por idade.** Os testes indiretos só descartam uso amplo e espalhado por igual. Uso concentrado, ou só nas seções com 1 ou 2 eleitores de 100+, não aparece neles. Quanto uso fica descartado é **Pendente**.
5. **A contagem oficial do 1º turno é do TSE.** Ela é coerente com os outros arquivos, mas não pode ser conferida de forma independente.
6. **O que dá para afirmar sobre o caminho sem biometria vale para o uso amplo.** Uso em poucas seções, ou de poucos títulos por seção, não aparece nos testes agregados.
7. **O aumento dos idosos de 2026 não separa vivos de títulos usados por outra pessoa.** Ele está espalhado por todas as idades de 70 anos para cima e não se concentra nos títulos sem digital, mas o arquivo de comparecimento por idade não diz como cada idoso foi liberado, e o diário da urna não diz a idade (Parte 4).
8. **Datas a confirmar.** A data do fechamento do cadastro e a data em que o TSE calcula a idade no perfil não estão nos arquivos lidos (**Pendente**). Pela lei eleitoral, o cadastro fecha 150 dias antes da eleição, o que daria 07/05/2026; a data efetiva não foi conferida.

## O que só a Justiça Eleitoral consegue verificar

- Se cada título de 100+ tem óbito registrado no Sistema Nacional de Informações de Registro Civil (SIRC).
- Quais títulos de 100+ tiveram comparecimento registrado em cada turno, pelo caderno de votação.
- Por que eleitores que o perfil público dá como "com biometria" estavam sem digital no arquivo da urna: coleta pendente, digital rejeitada ou outra causa.

## Pedidos sugeridos pela Lei de Acesso à Informação (LAI)

**Recomendação** (pedidos ainda não feitos):

1. Ao TSE: os títulos aptos de 100+ por ano de nascimento e por município, para saber quantos teriam 110, 120 ou 130 anos.
2. Ao TSE: quantos títulos de 100+ tiveram comparecimento registrado em cada turno de 2026, por município, e quantos títulos foram cancelados por óbito depois de 07/05/2026, indicando os que tiveram voto registrado em 2026.
3. Ao TSE: o critério que define "com biometria" no perfil do eleitorado público e no arquivo de eleitores da urna; quantos eleitores tinham digital gravada na urna, por seção; e a lista de zonas em recadastramento biométrico em 2026.
4. Ao TSE: a data de referência usada para calcular a idade no perfil do eleitorado.
5. Ao TSE: a publicação do arquivo de comparecimento por idade (perfil de comparecimento e abstenção) do 2º turno.
6. Ao TSE: por zona, os votantes de 80 anos ou mais por forma de liberação na urna (digital do próprio eleitor, ano de nascimento, liberação pelo mesário), em 2022 e em 2026 (Parte 4).

## Pendente

- **Comparecimento oficial dos idosos por município e por biometria, 1º turno.** A parte que conta os votos que só podem ter vindo de títulos sem digital passou pela revisão independente e está na Parte 4. A busca de municípios e zonas onde votaram mais centenários do que seria possível ainda não entra com número.
- **Forma de liberação dos idosos e títulos cancelados por óbito com voto em 2026:** dependem dos pedidos 2 e 6 acima (Parte 4).
- **Seções novas:** a causa do excesso de seções novas com 95% ou mais em 2026 e a conferência, uma a uma, das 56 com 98% ou mais.
- **Comparecimento × mortes recentes por município** e **variação entre turnos nos grupos que costumam faltar.** Ainda não passaram pela revisão independente.
- **2º turno por idade:** refazer a medida direta quando o TSE publicar o arquivo.
- **Diário das urnas nos lugares apontados:** horário e sequência das liberações por ano de nascimento em Arame, Icatu e Pirapemas (MA), Redentora (RS), Florianópolis (SC), Pilão Arcado (BA) e nas zonas do excesso de "sem biometria".
- **Resíduo sem foto de Indaiatuba (SP), zona 0211, seções 0430 a 0444:** medir o tamanho no universo completo e testar a causa.
- **Marca da foto em todas as seções:** medir a mensagem "Foto do eleitor apresentada" em todas as seções com excesso de 1 a 9 e em todas as seções sem excesso, para saber quantos eleitores estão na situação "foto sem digital" no país.
- **1º turno completo** para o achado das seções com excesso de "sem biometria", e a comparação seção a seção entre os turnos: refazer as contas, que foram feitas antes de a base de dados da auditoria ter todas as UFs do 1º turno.

## Como os números foram conferidos

Os números deste tópico vêm de duas fontes. A maior parte passou pela revisão independente, que leu de novo os arquivos brutos do TSE e do IBGE com outro programa e chegou aos mesmos valores. Os números que a revisão não refez (biometria por faixa de idade, tabela por estado, proporção de homens, os casos RJ 0005/0001 e Indaiatuba 0211/0438, e a medida nas 378 seções) foram recontados por uma conferência própria deste tópico, sobre todas as seções do perfil do eleitorado. Os números da Parte 4 e das seções novas foram refeitos por uma segunda verificação independente, por outro caminho, sobre todas as zonas e seções, e coincidem até a unidade. Esta parte corresponde à hipótese H01 do quadro das hipóteses (tópico 10).

## Próximos passos

- [ ] Refazer a Parte 2 com o arquivo oficial de comparecimento por idade do 2º turno, quando o TSE publicar
- [ ] Enviar os pedidos pela LAI listados acima
- [x] Incluir os votos de idosos que só podem ter vindo de títulos sem digital (Parte 4), depois da revisão independente
- [ ] Incluir a busca de municípios e zonas com mais centenários votando do que seria possível, depois da revisão independente
- [ ] Refazer o piso de votos sem digital com o perfil do eleitorado de 2022, para saber se ele cresceu
- [ ] Conferir uma a uma as 56 seções novas com 98% ou mais de comparecimento no 2º turno
- [ ] Examinar o diário das urnas nos lugares e zonas apontados (horário e sequência das liberações por ano de nascimento)
- [ ] Registrar as verificações deste tópico no livro de evidências da auditoria
