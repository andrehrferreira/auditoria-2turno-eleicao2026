# 6. Títulos de pessoas falecidas

## A pergunta

O cadastro de eleitores de 2026 tem títulos de pessoas que já morreram? E alguém usou esses títulos para votar?

## Resposta curta

| Pergunta | Resposta | Rótulo |
|---|---|---|
| O cadastro tem títulos de pessoas que provavelmente já morreram? | Sim. No saldo do país, há **148.553 títulos de eleitores com 100 anos ou mais a mais do que as pessoas com 96 anos ou mais contadas no Censo 2022**, supondo que nenhuma delas tenha morrido desde então e que o TSE conte a idade até o fim de julho de 2026. A data em que o TSE conta a idade não está documentada. Contando também quem tinha 95 anos no Censo, o saldo que vale para qualquer data de 2026 é de **94.985**. Quantos sobram com a mortalidade real é estimativa de modelo e fica fora deste relatório. | **Fato** (os dois saldos) e **Pendente** (data da idade; estimativa com mortalidade) |
| Esses títulos foram usados para votar no 1º turno? | Pela contagem oficial do TSE, votaram 0,72% dos eleitores de 100+ anos, e 0,26% nos municípios onde sobram títulos. Isso não indica uso sistemático. A contagem é do TSE e não pode ser refeita com os arquivos das urnas. | **Fato**, com ressalva |
| E no 2º turno? | O TSE ainda não publicou a contagem por idade. Os testes indiretos só conseguem ver uso amplo e espalhado por igual nas seções. Uso concentrado em poucas seções, ou espalhado só nas seções com 1 ou 2 eleitores de 100+, não aparece neles, mesmo quando passa de 10% dos títulos de 100+. | **Fato** (o que os testes não veem) e **Pendente** (quanto uso fica descartado) |
| Por onde um título de falecido poderia ser usado? | Pelo eleitor sem biometria cadastrada, que a urna libera só com o ano de nascimento. 92% dos títulos de 100+ estão nesse grupo. | **Fato** |

Nenhum CPF foi usado nesta parte da perícia. Tudo vem de números públicos por seção, zona ou município.

## O que os arquivos permitem saber, e o que não permitem

**Fato, por desenho do sistema.** Nenhum arquivo público diz qual título votou. O boletim da urna traz só totais. O registro dos votos é embaralhado. O diário da urna (log) anota que um eleitor foi liberado, e de que forma, mas não anota o número do título nem o nome. Ver também o princípio 8 das premissas desta auditoria (explicado na Parte 1, em "Por que isso acontece").

Por isso a pergunta foi dividida em duas, testadas de formas diferentes:

1. **Estoque:** quantos títulos do cadastro não têm pessoa viva correspondente. Mede-se comparando o cadastro com a população do Censo.
2. **Uso:** quantos desses títulos registraram voto. Mede-se pelo comparecimento (quantos eleitores votaram) dos grupos onde esses títulos estão.

Um título de falecido no cadastro mostra uma falha na limpeza do cadastro. Não mostra que alguém votou com ele.

## Parte 1. O cadastro tem títulos de pessoas que provavelmente já morreram?

### Como foi feito

Foram comparadas duas contagens oficiais:

- **O perfil do eleitorado do TSE** (arquivo oficial do perfil do eleitorado por seção, gerado em 14/07/2026): quantos eleitores há em cada seção, por faixa de idade e com ou sem biometria cadastrada.
- **O Censo 2022 do IBGE** (tabela 9514): quantas pessoas moravam em cada município, por idade.

Quem tinha 96 anos ou mais no Censo de 2022 (data de referência: fim de julho de 2022) é quem pode ter 100 anos ou mais até o fim de julho de 2026. Se o TSE contar a idade numa data posterior, por exemplo a da eleição, parte de quem tinha 95 anos no Censo também chega a 100+. Esse grupo de pessoas nascidas na mesma época é chamado de **coorte**. A conta mais simples é: eleitores de 100+ em 2026 menos a coorte de 96+ de 2022. Essa conta supõe que **ninguém** dessa coorte morreu em quatro anos, o que favorece o cadastro. Por isso, se o Censo estiver completo e a idade for contada até o fim de julho de 2026, o resultado é um **piso**. A data em que o TSE conta a idade não está documentada (**Pendente**). Somando à coorte os 53.568 que tinham 95 anos no Censo, o piso vale para qualquer data de 2026: 297.977 − 149.424 − 53.568 = **94.985** (**Fato**).

Depois, aplicou-se a mortalidade medida pelo IBGE (Estatísticas do Registro Civil, tabela 2654, média de 2023 e 2024) para estimar quantos da coorte ainda estariam vivos. Essa parte é estimativa de modelo, e não contagem.

### O que foi encontrado

| Medida | Valor | Rótulo |
|---|---|---|
| Eleitores aptos com 100 anos ou mais, com domicílio eleitoral no Brasil | 297.977 (298.239 contando o exterior) | **Fato** |
| Pessoas com 100+ anos no Censo 2022 | 37.814 | **Fato** |
| Pessoas com 96+ anos no Censo 2022 (a coorte que chega a 100+ em 2026) | 149.424 | **Fato** |
| **Títulos de 100+ sem pessoa correspondente, supondo que ninguém morreu e que a idade é contada até o fim de julho de 2026** | **148.553** | **Fato** (piso, com essa condição) |
| Pessoas com 95 anos no Censo 2022 | 53.568 | **Fato** |
| Títulos de 100+ sem pessoa correspondente, supondo que ninguém morreu, para qualquer data de 2026 | **94.985** | **Fato** (piso) |
| Coorte ainda viva em 2026 e títulos sem pessoa correspondente, com a mortalidade do IBGE | estimativa de modelo, fora deste relatório | **Pendente** |
| Eleitores de 100+ sem biometria cadastrada | 274.143 (92,0%) | **Fato** |

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
- As maiores sobras (sem descontar mortes) estão nas capitais e em cidades grandes: Rio de Janeiro (+61.356), São Paulo (+39.442), Belo Horizonte (+10.413), Nova Iguaçu (+5.143) e São Gonçalo (+4.822).
- Na Bahia e no Ceará há **menos** eleitores de 100+ do que moradores de 96+, e a maioria deles tem biometria.
- Entre os eleitores de 100+, 51% são homens. Entre 95 e 99 anos, 43%. Entre 90 e 94, 38%. Numa população real, a parcela de mulheres cresce com a idade, porque elas vivem mais.

**Hipótese:** a maior parte desses títulos é de pessoas que morreram e não tiveram o título cancelado. Uma parte menor pode ser de pessoas vivas com a data de nascimento errada no cadastro. Os números públicos não separam os dois casos.

**Hipótese:** o padrão acompanha o recadastramento biométrico. Onde houve recadastramento (Bahia, Ceará), quem não compareceu teve o título cancelado, e a faixa de 100+ ficou abaixo da população. Onde quase ninguém de 100+ tem biometria (RJ, SP, MG, RS), os títulos antigos ficaram.

### Por que isso acontece

O título de quem morre só é cancelado quando o óbito chega à Justiça Eleitoral. Essa comunicação depende de pessoas: o cartório de registro civil precisa enviar, e o cartório eleitoral precisa processar. Além disso, depois dos 70 anos o voto é facultativo, e faltar à eleição não cancela o título. Um título de quem morreu aos 85 anos pode continuar no cadastro por décadas sem chamar atenção.

Pelo princípio 8 desta perícia, uma etapa feita por pessoas **não conta como controle**. Ela não serve para explicar que "está tudo certo" nem para acusar alguém. Ela é tratada como **risco**: uma brecha que precisa ser testada nos dados para saber se foi usada. Os 148.553 títulos mostram que essa brecha existe, em escala grande. A Parte 2 mostra o que os dados dizem sobre o uso.

### Prova de que o teste funciona (contraprova)

- **Reprodução independente.** Uma segunda verificação, independente, leu de novo os arquivos brutos do TSE e do IBGE com outro programa e chegou aos mesmos números: 297.977, 149.424 e 274.143. A soma dos 5.570 municípios dá exatamente os totais do país, e nenhum município ficou sem par entre TSE e IBGE (**Fato**).
- **E se o Censo tiver deixado de contar idosos?** Para zerar o piso de 148.553, o Censo teria de ter contado no máximo 50,1% das pessoas de 96+ (149.424 de 297.977) (**Fato**, conta direta). O efeito de subcontagens menores sobre a estimativa com mortalidade é conta de modelo e fica fora deste relatório (**Pendente**).
- **E se forem datas de nascimento inválidas?** O cadastro tem um código próprio para data inválida (1.212 eleitores), separado da faixa de 100+ (**Fato**).
- **E se a idade for calculada em outra data?** A data não está documentada (**Pendente**). Se for posterior ao fim de julho de 2026, o piso de 148.553 deixa de valer. O piso de 94.985, que inclui quem tinha 95 anos no Censo, vale para qualquer data de 2026 (**Fato**).
- **E se forem eleitores que moram no exterior?** O exterior tem 262 eleitores de 100+ e já foi excluído da conta (**Fato**).

### O que não se pode afirmar com este teste

- **Município a município, a comparação engana.** O título fica onde a pessoa se alistou, e o Censo conta onde ela mora. Em 1.068 municípios há mais eleitores de 100+ do que moradores de 96+, em 4.186 acontece o contrário e em 316 os dois números são iguais. O número confiável é o saldo do país (148.553), e não a soma dos municípios com sobra (**Fato**).
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

**Fato:** onde estão os títulos que sobram, quase ninguém de 100+ votou. Onde não sobram títulos, a taxa (6,3%) é compatível com centenários vivos.

**O que isso permite concluir:** se esses títulos tivessem sido usados por terceiros em escala, eles surgiriam como comparecimento. Uso de 5% dos títulos de 100+ daria 14.912 votos na contagem oficial; uso de 10%, 29.824. A contagem mostra 2.141 em todo o país. **No 1º turno não há sinal de uso sistemático desses títulos** (**Fato**, desde que a contagem oficial esteja correta).

**Ressalva.** Essa contagem é feita pelo próprio TSE. Ela não pode ser refeita com os arquivos das urnas, porque o diário da urna não registra a idade de quem votou. Há dois indícios de que ela é coerente: as contagens por faixa de idade são idênticas às do perfil do eleitorado (298.239 eleitores de 100+ nos dois arquivos), e o comparecimento total do arquivo (125.277.230) difere do arquivo oficial por seção (125.275.835) em só 1.395 eleitores. Coerência não é conferência independente.

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

**Fato:** em 16.011 das 497.508 seções do 2º turno analisadas (3,2%), o boletim da urna registra **mais** eleitores liberados "sem biometria cadastrada" do que o perfil público do TSE diz existir naquela seção, já descontada uma folga para os eleitores em trânsito. A diferença soma 36.340 eleitores (0,03% dos votos). Em 7.922 dessas seções, o perfil público diz que **todos** os eleitores têm biometria. Ficaram fora da conta só as seções sem comparecimento, as seções cujo boletim não traz o detalhamento do comparecimento e as que não têm cadastro correspondente no perfil.

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
- **Fato:** nenhum dos 7.970 atendimentos sem biometria dessas seções teve pedido de digital. Ou seja, a mesa não "pulou" a digital: foi o arquivo de eleitores gravado na urna que não tinha a digital dessas pessoas, e por isso a urna foi direto ao ano de nascimento.
- **Fato:** o perfil público é de 14/07/2026. Nas 378 seções, o diário registra que a mídia da urna (que leva o arquivo de eleitores) foi gerada entre 17 e 27/09/2026; uma delas tem um segundo diário, de mídia gerada em 20/10/2026. São duas fotografias do cadastro em datas diferentes.
- **Fato:** há também o efeito no sentido inverso, maior e em outras zonas: 17.621 seções com **mais** eleitores liberados por digital do que o perfil diz ter biometria (229.717 eleitores).
- **Pendente, em verificação:** a mesma medida da foto nas outras seções com excesso (de 1 a 9) e nas seções sem excesso. As revisões independentes a fizeram só em amostras dessas seções, e números de amostra não entram neste relatório. Sem essa medida em todas as seções, não está medido quanto a marca da foto é rara fora das seções com excesso.

**Leitura.** Nas seções medidas, o "com biometria" do perfil público não é o mesmo "com digital no arquivo da urna". Esses eleitores têm foto registrada, mas não têm digital utilizável na urna.

- **Hipótese (a mais provável, a confirmar com o TSE):** são eleitores que fizeram a coleta biométrica (a foto ficou registrada), mas a digital ficou pendente, foi rejeitada ou tinha qualidade ruim.
- **Hipótese (não separável com dados públicos):** a mesma marca surgiria se as digitais tivessem sido retiradas do arquivo na preparação das urnas. As duas explicações deixam o mesmo rastro. Só o TSE pode separar uma da outra.
- **Pendente:** sobra um resíduo que a foto não explica, localizado sobretudo em Indaiatuba (SP), zona 0211, seções 0430 a 0444. O tamanho dele no universo completo não foi medido, e a causa não foi testada.

**O que isto significa para a pergunta dos falecidos.** Não há sinal de eleitores a mais: em nenhuma seção o número de votantes passa do número de eleitores aptos. Os testes de comparecimento não mostram uso sistemático desse caminho. Mas, pelo princípio 8, o risco continua: esses eleitores votaram só com o número do título, o ano de nascimento e a foto mostrada ao mesário. **Hipótese:** o grupo nessa situação é maior que os 36.340 do excesso. Nas 378 seções medidas, os atendimentos sem biometria com foto (6.761) já passam do excesso delas (5.560). O tamanho do grupo no país inteiro não foi medido (**Pendente**).

### Prova de que o teste funciona (contraprova)

- **A marca da foto explica o excesso onde foi medida.** Nas 378 seções com excesso de 10 ou mais, tirar os atendimentos com foto zera quase todo o excesso (de 5.560 para 54) (**Fato**). Quanto a marca é rara nas seções sem excesso ainda não foi medido em todas elas (**Pendente**).
- **O teste de uso consegue achar uso amplo.** Na revisão independente, foram inseridos votos falsos nos dados, do tamanho do excesso observado, em 28% das seções: o teste os detectou em 10 de 10 repetições. Em 5% das seções, a detecção é incerta: o resultado muda entre rodadas da simulação (**Fato**, simulação).
- **O teste não consegue achar uso em poucas seções ou em poucos eleitores por seção.** "Não houve uso" não está provado. O que está provado é que não houve uso amplo (**Fato**).
- **O diário e o boletim batem, mas isso não é conferência independente.** Os dois saem do mesmo programa da urna. A igualdade mostra coerência interna, e não que o arquivo de eleitores gravado na urna estava correto (**Fato**).

## Um fenômeno vizinho que não é o mesmo: municípios com mais eleitores do que moradores

**Fato:** em 2.898 dos 5.570 municípios (52%), o perfil de julho de 2026 tem mais eleitores de 16+ do que moradores de 12+ no Censo 2022. O fenômeno se concentra em municípios pequenos. O percentual muda conforme a definição de idade e o ano da população.

**Fato:** no 2º turno, em 579 municípios votou mais gente do que a população de 12+ de 2022. A parcela liberada por digital nesses municípios fica a até 0,6 ponto da do estado. **Hipótese:** isso indica pessoas reais, presentes na urna, com título num município diferente de onde moram, e não títulos de falecidos em massa. Quanto os títulos excedentes comparecem é estimativa de modelo e fica fora deste relatório (**Pendente**).

**Hipótese:** a maior parte é migração com título mantido na cidade de origem ou domicílio eleitoral por vínculo familiar ou profissional, que a lei permite. Os dados agregados não separam isso de transferência irregular de títulos. É tema de outro tópico, e não deste.

Fonte: perfil do eleitorado de julho de 2026 e Censo 2022, conferidos por uma revisão independente.

## Limites desta parte da perícia

1. **Nenhum CPF foi usado.** A frente descrita aqui usa só contagens públicas por seção, zona e município. A frente por CPF (cruzar títulos com registros de óbito) é tratada à parte e não faz parte deste tópico.
2. **Não é possível dizer que um título específico votou.** O caderno de votação (a lista assinada pelos eleitores na mesa) não é público, e os arquivos da urna não identificam o eleitor.
3. **Não é possível separar falecidos de vivos com a data de nascimento errada**, entre os títulos de 100+ que não votam.
4. **O 2º turno não tem contagem oficial por idade.** Os testes indiretos só descartam uso amplo e espalhado por igual. Uso concentrado, ou só nas seções com 1 ou 2 eleitores de 100+, não aparece neles. Quanto uso fica descartado é **Pendente**.
5. **A contagem oficial do 1º turno é do TSE.** Ela é coerente com os outros arquivos, mas não pode ser conferida de forma independente.
6. **O que dá para afirmar sobre o caminho sem biometria vale para o uso amplo.** Uso em poucas seções, ou de poucos títulos por seção, não aparece nos testes agregados.
7. **Datas a confirmar.** O fechamento do cadastro (07/05/2026, 150 dias antes do 1º turno) e a data em que o TSE calcula a idade no perfil não estão documentados nos arquivos.

## O que só a Justiça Eleitoral consegue verificar

- Se cada título de 100+ tem óbito registrado no Sistema Nacional de Informações de Registro Civil (SIRC).
- Quais títulos de 100+ tiveram comparecimento registrado em cada turno, pelo caderno de votação.
- Por que eleitores que o perfil público dá como "com biometria" estavam sem digital no arquivo da urna: coleta pendente, digital rejeitada ou outra causa.

## Pedidos sugeridos pela Lei de Acesso à Informação (LAI)

**Recomendação** (pedidos ainda não feitos):

1. Ao TSE: os títulos aptos de 100+ por ano de nascimento e por município, para saber quantos teriam 110, 120 ou 130 anos.
2. Ao TSE: quantos títulos de 100+ tiveram comparecimento registrado em cada turno de 2026, por município, e quantos títulos foram cancelados por óbito depois de 07/05/2026.
3. Ao TSE: o critério que define "com biometria" no perfil do eleitorado público e no arquivo de eleitores da urna; quantos eleitores tinham digital gravada na urna, por seção; e a lista de zonas em recadastramento biométrico em 2026.
4. Ao TSE: a data de referência usada para calcular a idade no perfil do eleitorado.
5. Ao TSE: a publicação do arquivo de comparecimento por idade (perfil de comparecimento e abstenção) do 2º turno.

## Pendente

- **Comparecimento oficial dos idosos por município e por biometria, 1º turno.** A análise foi feita com o mesmo arquivo oficial do TSE e procura municípios e zonas onde votaram mais centenários do que seria possível, e votos que só podem ter vindo de títulos sem biometria. Ainda não passou pela revisão independente. Os números dela não entram neste relatório até lá.
- **Comparecimento × mortes recentes por município** e **variação entre turnos nos grupos que costumam faltar.** Ainda não passaram pela revisão independente.
- **2º turno por idade:** refazer a medida direta quando o TSE publicar o arquivo.
- **Diário das urnas nos lugares apontados:** horário e sequência das liberações por ano de nascimento em Arame, Icatu e Pirapemas (MA), Redentora (RS), Florianópolis (SC), Pilão Arcado (BA) e nas zonas do excesso de "sem biometria".
- **Resíduo sem foto de Indaiatuba (SP), zona 0211, seções 0430 a 0444:** medir o tamanho no universo completo e testar a causa.
- **Marca da foto em todas as seções:** medir a mensagem "Foto do eleitor apresentada" em todas as seções com excesso de 1 a 9 e em todas as seções sem excesso, para saber quantos eleitores estão na situação "foto sem digital" no país.
- **1º turno completo** para o achado das seções com excesso de "sem biometria", e a comparação seção a seção entre os turnos: refazer as contas, que foram feitas antes de a base de dados da auditoria ter todas as UFs do 1º turno.

## Como os números foram conferidos

Os números deste tópico vêm de duas fontes. A maior parte passou pela revisão independente, que leu de novo os arquivos brutos do TSE e do IBGE com outro programa e chegou aos mesmos valores. Os números que a revisão não refez (biometria por faixa de idade, tabela por estado, proporção de homens, os casos RJ 0005/0001 e Indaiatuba 0211/0438, e a medida nas 378 seções) foram recontados por uma conferência própria deste tópico, sobre todas as seções do perfil do eleitorado. Esta parte corresponde à hipótese H01 do quadro das hipóteses (tópico 10).

## Próximos passos

- [ ] Refazer a Parte 2 com o arquivo oficial de comparecimento por idade do 2º turno, quando o TSE publicar
- [ ] Enviar os pedidos pela LAI listados acima
- [ ] Incluir a análise do comparecimento oficial dos idosos por município e por biometria depois da revisão independente
- [ ] Examinar o diário das urnas nos lugares e zonas apontados (horário e sequência das liberações por ano de nascimento)
- [ ] Registrar as verificações deste tópico no livro de evidências da auditoria
