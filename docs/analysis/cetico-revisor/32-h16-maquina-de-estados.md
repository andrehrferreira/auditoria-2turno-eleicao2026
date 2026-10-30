# 32. Parecer: H16, a sessão de cada eleitor no log, RDV × BU no 1º turno e boletins iguais

Achado revisado: [matematico-forense/07-h16-maquina-de-estados.md](../matematico-forense/07-h16-maquina-de-estados.md), scripts `matematico-h16-*.mjs` (commit 60f9cb3), saídas em `data/parsed/auditoria/h16/`.

Data: 30/10/2026. Base: cópia de leitura `eleicao2026-20261029T105000` (28 UFs nos dois turnos). Rótulos: **Fato** (sai de script do repo sobre arquivo público, universo completo), **Hipótese**, **Recomendação**, **Pendente**.

## Resposta curta

- **Todos os números principais se reproduzem com código próprio, no universo completo dos dois turnos.** Reescrevi a máquina de estados sem usar o código do matemático e rodei os 499.178 pacotes do 2º turno e os 499.176 do 1º. Os totais saíram iguais, número por número. O RDV × BU do 1º turno foi refeito **direto dos arquivos brutos** (`-bu.dat` e `-rdv.dat`), sem passar pelo banco, nas 28 UFs: 0 divergência, 749.120.705 votos dos dois lados. O boletim inteiro repetido foi refeito do banco: 0 par em 68.595.557.
- **O teste tem poder.** Alterei de propósito um log real, em memória, de 14 jeitos. A regra acusou 12 das 14 alterações; as duas que passam são pontos cegos conhecidos (abaixo). "0 órfã" não é sinal de teste cego.
- **Fato novo: os 2 "votos sem habilitação" do 1º turno têm sessão completa.** O pacote do 2º turno da RJ 60011/0008/0061 traz, dentro do log, as cópias MI e ME do log do 1º turno da mesma urna. Juntando o log publicado no 1º turno com a cópia ME, as 311 sessões ficam completas: 311 habilitações, 311 votos computados, todos com os 6 cargos, e 0 voto sem habilitação. O número revisado do 1º turno é **0**, como no 2º.
- **O que precisa mudar no texto: a causa das interrupções.** A regra de "causa técnica" do matemático conta como técnica três coisas que não são:
  - o desligamento pela chave, que é ato de pessoa (princípio 8);
  - o status normal da bateria ("[PLENA]", "[PARCIAL]");
  - a palavra "encerrou", que contém "erro".

  Com uma regra estrita, os números mudam:

  | Classe | 2º turno | 1º turno |
  |---|---:|---:|
  | Causa técnica com rastro (erro ou falta de energia) | 481 | 1.008 |
  | Só desligamento pela chave | 615 | 2.844 |
  | Nenhuma linha de causa | 282 | 1.869 |
  | Total | 1.378 | 5.721 |

  No doc 07 eram 1.104 com causa e 274 sem causa (2º turno); 3.921 e 1.800 (1º turno).
- **A classe I não esconde órfã, mas esconde um risco que o doc subestima.** Há sessões em que o eleitor confirmou todos os cargos e a urna ficou parada sem gravar "computado", até alguém desligá-la pela chave minutos depois, sem nenhuma linha de erro. São 21 no 2º turno e 118 no 1º. Fora as 4 e 5 que entraram no BU, esses votos não foram contados. Não inflam o BU. São assunto da H17.
- **Os outros números passam.** Multicargo, por contagem direta em todas as seções: 40.215 de 40.215 no 2º turno e 497.895 de 497.905 no 1º. Os pares de boletim e a falta dos pareceres 20 e 25 também passam, com ressalvas de redação.

## Vereditos

| # | Afirmação do doc 07 | Veredito | Número reproduzido |
|---|---|---|---|
| 1 | Habilitações = V + S + I + O, sem resto: 128.244.427 (2º) e 125.322.998 (1º) | **Sustentado com ressalvas.** Os números são exatos. "Sem resto" vale por construção, porque toda sessão recebe exatamente um desfecho e o fim do arquivo também é um desfecho (I). A conta fechada não é evidência. A evidência está em O = 0 e no que há dentro de I (itens 2 e 3) | 2º: 128.244.427 = 128.235.189 + 7.860 + 1.378 + 0. 1º: 125.322.998 = 125.274.326 + 42.951 + 5.721 + 0 |
| 2 | 0 sessão órfã nos dois turnos | **Sustentado.** Reproduzido no universo completo, com código próprio. O teste de mutação mostra que a regra acusa a habilitação sem desfecho, o "computado" apagado e a data corrompida (item C) | O = 0 e 0 (499.178 e 499.176 pacotes, 0 erro de leitura) |
| 3 | Interrupção com evento: 1.378 e 5.721, com "causa técnica" em 1.104 e 3.921 e "sem causa" em 274 e 1.800 | **Sustentado no total, refutado na divisão por causa.** O total e o evento de fechamento se reproduzem. A divisão "com causa técnica × sem causa" está errada pela regex (item B). Número revisado na tabela da resposta curta | Eventos 2º: reinício 783, `Votação suspensa` 556, fim do log 39. 1º: 2.906, 2.613, 202 |
| 4 | Voto computado sem habilitação: 0 (2º) e 2 (1º, RJ 60011/0008/0061, log corrompido) | **2º turno sustentado. 1º turno revisado para 0 (Fato novo).** A explicação "log corrompido" está certa e agora tem prova técnica. A cópia ME do mesmo log, no pacote do 2º turno, traz as duas habilitações legíveis e os 6 cargos de cada uma (item D) | 2º: 0. 1º: 2 no log publicado; 0 com a cópia ME |
| 5 | Falta (BU > log) 54 em 6 seções (2º) e 159 em 9 (1º); extra 0; são os casos dos pareceres 20 e 25 | **Sustentado.** Mesmas seções, mesmos números, mesmo extra 0. A falta continua com a explicação dos pareceres 20 e 25. O pacote do 2º turno não traz cópia do 1º turno que feche qualquer outro caso (conferi as 9 seções) | 54 / 6 e 159 / 9; extra 0 e 0 |
| 6 | C1 / C2 / C3 = 4 / 0 / 50 (2º) e 5 / 2 / 152 (1º); diferença de definição com o parecer 25 no RS 89060 | **Sustentado com ressalvas.** O total bate com o parecer 25. A troca de rótulo do RS 89060/0017/0191 (C2 no parecer 25, C3 aqui) é só de definição: o voto teve atendimento (identificação e foto), mas não teve habilitação. A classe é atribuída por contagem (`Math.min`), não voto a voto (item E) | 4 / 0 / 50 e 5 / 2 / 152 |
| 7 | Multicargo: 40.610 / 40.610 (2º) e 497.895 / 497.905 (1º); os 10 são os 9 da falta + RJ 60011 | **Sustentado com ressalvas de método.** O script do matemático só contou as sessões em 1.981 dos 40.610 pares do 2º turno e em 21.639 dos 497.905 do 1º. Nos outros 95%, usou a regra "comparecimento estadual = comparecimento federal". Fiz a contagem direta em todas as seções, e ela confirma o resultado (item F). Com a cópia ME, a RJ 60011 também fecha | Contagem direta: 2º, 40.215 de 40.215 pares com comparecimento no BU (as 395 consultas sem comparecimento não entram); 1º, 497.895 de 497.905 |
| 8 | RDV × BU 1º turno: 0 divergência em 2.490.804 pares, 749.120.705 votos; 2º turno 0 em 539.815 | **Sustentado.** Refeito direto dos arquivos brutos das 28 UFs, sem o banco. A soma do BU bruto é igual à do banco em cada UF. O 2º turno não refiz (já tinha o auditor A) | 1º: 0 divergência (R1, R2, R3) em 2.490.805 pares, 749.120.705 votos. O par a mais é a seção do exterior com comparecimento 0: o arquivo tem o cargo de presidente sem votos, e o banco não tem linha |
| 9 | Boletim inteiro igual entre seções no 1º turno: 0 par em 68,6 milhões; esperado pelo acaso ≤ 3 pela regra do três | **Sustentado no resultado. O "esperado" deve sair do texto (item G).** O 0 é uma busca exata de cópias, e o poder dela é total para cópia exata. O "esperado = 0" sai automaticamente de "senador igual = 0 pares". A regra do três supõe pares independentes, e os pares de seções não são independentes | 68.595.557 pares, 0 iguais em tudo, 0 sem estrato. Por cargo: presidente 4, governador 161, senador 0, deputados 0 |
| 10 | Catálogo: suspensos pelo mesário = parciais + desistências; nulos por suspensão = RDV `nuloAposSuspensao` | **Sustentado.** Conferido nos resumos e cruzado com o RDV bruto: 135.770 nulos por suspensão no 1º turno, nos dois lados | 2º: 8.498 = 638 + 7.860. 1º: 82.404 = 39.452 + 42.952 |

## A. Reprodução com código próprio (Fato)

`cetico-h16-sessoes.mjs` reescreve a regra: mesma lista de eventos, chave da sessão = linha inteira da habilitação, cópias contadas uma vez. Também mede o que o script do matemático não mede:
- o desfecho de cada cópia em separado (divergência entre cópias);
- linhas-chave com data ilegível ou de outro dia;
- nulo por suspensão fora de sessão;
- seção da sessão pelas duas regras (a vigente na habilitação e a última da urna);
- causa da interrupção por lugar e por tipo, com o catálogo de mensagens que casaram com cada regex.

| | 2º turno | 1º turno |
|---|---:|---:|
| Pacotes lidos / sem log / erros | 499.178 / 0 / 0 | 499.176 / 0 / 0 |
| Excluídas: sem arquivo / Sistema de Apuração | 41 / 29 | 41 / 31 |
| Habilitações da própria seção | 128.244.427 | 125.322.998 |
| V / S / I / O | 128.235.189 / 7.860 / 1.378 / **0** | 125.274.326 / 42.951 / 5.721 / **0** |
| Sessões de log de outra seção | 304 | 100 |
| Computados da própria seção / BU | 128.235.189 / 128.235.243 | 125.274.328 / 125.274.487 |
| Computado sem sessão / confirmação fora / nulo fora | 0 / 0 / 0 | 2 / 0 / 0 |
| Desistência com confirmação / computado vazio / confirmação depois de nulo | 0 / 0 / 0 | 0 / 0 / 0 |
| Habilitação repetida na mesma cópia / computado repetido na mesma cópia | 0 / 0 | 0 / 0 |
| Falta / extra | 54 em 6 / 0 | 159 em 9 / 0 |
| **Sessões com desfecho diferente entre cópias** | **0** | **1** |
| Sessões interrompidas com Presidente confirmado / com algum cargo | 57 / 91 | 154 / 3.603 |

- **A sessão que diverge entre cópias** é a MG 44458/0103/0221 do 1º turno (reserva, 6 cópias do log).
  - Na cópia MI da urna 02471677, uma sessão termina num reinício.
  - Na cópia ME, a mesma sessão termina em "computado" às 10:17:53.
  - A MI perdeu uns 7 minutos de linhas antes da queda, e a ME não. É o comportamento esperado de duas mídias gravadas em tempos diferentes, e o BU bate com o log (225).
- **Leitura que o doc descreve errado (ressalva de redação).** O doc diz "seção de cada urna = a última `Seção Eleitoral`". O script usa a seção vigente no momento da habilitação, e as duas regras diferem em 3.325 sessões no 2º turno e 5.528 no 1º.
  - Em 351.411 sessões no 2º turno e 390.543 no 1º, a urna não escreve `Seção Eleitoral` no dia da votação. Ela só escreveu essa linha no dia da carga. Essas sessões contam como da própria seção por padrão.
  - Conferi um exemplo: AC 01392/0001/0537, uma urna só no pacote, com a seção certa na carga de 25/09.
  - Nada disso muda total nenhum, porque extra = 0. Mas o texto deve descrever a regra que o script usa.

## B. A causa das interrupções (item b do pedido)

A regra do matemático (`causas()` em `matematico-h16-sessoes.mjs`) procura, nas 30 linhas antes da habilitação e dentro da sessão: `/erro|falha|error/i`, `/desligad/i` e `/bateria/i`.

**Defeitos (Fato, catálogo de `data/parsed/auditoria/cetico/h16/resumo-2t.json`):**
- `/erro/` casa com "Operador **encerrou** ciclo de registro de mesários" (31 ocorrências nas sessões interrompidas do 2º turno);
- `/bateria/` casa com o status normal: "Carga da [ALIMENTAÇÃO BATERIA INTERNA]: [PLENA]" (58), "[PARCIAL]" (19), "Bateria interna com carga plena" (17);
- `/desligad/` pega "Urna desligada pela chave" e "Mudança do estado da chave: URNA DESLIGADA". Isso registra **que** alguém girou a chave, não **por quê**. Pelo princípio 8, é ato de pessoa, não causa técnica;
- as 30 linhas **antes** da habilitação contam como causa mesmo sem relação com a sessão. Exemplo: uma bateria "[PLENA]" do eleitor anterior.

**Regra estrita** (`cetico-h16-causas.mjs`). Conta como técnica só:
- erro do programa ou do equipamento: "Erro inesperado", "ERROR", "Erro no/na", "Erro gravando", "NÃO foi registrado", "Não é possível continuar";
- falta de energia: "[CRÍTICA]", "[AUSENTE]", "desconectada da rede CA", "operando na/com bateria interna".

O desligamento pela chave sem erro fica numa classe à parte.

| Classe | 2º turno | ... com algum cargo | ... com Presidente | 1º turno | ... com algum cargo | ... com Presidente |
|---|---:|---:|---:|---:|---:|---:|
| Técnica, dentro da sessão | 411 | 19 | 14 | 685 | 330 | 16 |
| Técnica, só nas 30 linhas antes | 70 | 6 | 5 | 323 | 203 | 2 |
| Só desligamento pela chave (pessoa) | 615 | 43 | 21 | 2.844 | 1.783 | 118 |
| Nenhuma linha de causa | 282 | 23 | 17 | 1.869 | 1.287 | 18 |
| **Total** | **1.378** | **91** | **57** | **5.721** | **3.603** | **154** |

- **`Votação suspensa` é, na prática, "urna desligada pela chave".** Das 556 sessões do 2º turno fechadas por `Votação suspensa`, 524 só têm a chave. No 1º turno são 2.445 de 2.613.
  - Exemplo conferido no bruto: AC 01023/0001/0608, 2º turno. O eleitor foi habilitado às 10:54:13. Às 10:54:30 aparecem "Urna desligada pela chave" e `Votação suspensa`. A urna religa às 10:55. Não há erro antes.
- **Urna parada depois do último cargo (Hipótese: travamento sem linha de erro).** No 1º turno, 118 sessões com os 6 cargos confirmados terminam só com a chave. No 2º turno são 21.
  - Três exemplos conferidos (AL 27537/0007/0141, AL 27855/0002/0385, AL 28339/0013/0118): o Presidente é confirmado e o log fica parado de 6 a 9 minutos, sem "computado" e sem erro. Depois vem "Urna desligada pela chave".
  - O BU dessas seções bate com o log. Logo, esses votos **não** foram contados.
  - Isso é perda de voto de quem votou, não inflação.
- **Fim do log (item a do pedido).** São 39 sessões no 2º turno e 202 no 1º. **Todas** estão em seções com urna reserva (`tipo_urna` reservaSecao), uma por seção. Só a MG 44458/0103/0221 do 1º turno tem duas.
  - É o fim do log da urna que falhou, guardado dentro do pacote da reserva. Exemplo: AM 02836/0019/0072, 2º turno. A urna 02337744 habilita o eleitor às 08:24:26 e um segundo depois grava "Erro inesperado durante a votação | O voto do eleitor NÃO foi registrado". A reserva 02340850 começa às 08:35.
  - Pela regra estrita, das 39 do 2º turno: técnica 25 (22 dentro, 3 antes), chave 4, nenhuma 10. Das 202 do 1º: técnica 53, chave 33, nenhuma 116.
  - Só uma das 39 virou voto no BU: RS 89060/0017/0191, a C1 do parecer 25. Nas outras seções, o BU bate com o log.

## C. Teste de sanidade por mutação (item c do pedido)

`cetico-h16-mutacao.mjs` lê o log real de uma seção, altera linhas **em memória** (nada é gravado em `data/raw`) e roda a regra do matemático (`sessoesDoPacote`, importada do script dele) e a do cético. A seção de teste do 2º turno foi a RR 03000/0004/0011; a do 1º turno, a AC 01007/0009/0001. Nenhuma das duas UFs tem pacote com duas cópias sobrepostas do mesmo dia, então a 2ª cópia é o mesmo log duplicado.

| Alteração | Matemático acusa (2º turno) | Matemático acusa (1º turno) |
|---|---|---|
| M0 nenhuma | nada | nada |
| M1 apaga o "computado" de um eleitor | órfã 1, falta 1 | órfã 1, falta 1 |
| M2 apaga a habilitação | computado sem sessão 1, confirmação fora 1 | computado sem sessão 1, confirmação fora 6 |
| M3 apaga o ciclo inteiro | falta 1 | falta 1 |
| M4 insere um ciclo inteiro falso | extra 1 | extra 1 |
| M5 insere um "computado" solto | computado sem sessão 1, extra 1 | idem |
| **M6 repete a linha do "computado" idêntica (mesmo hash)** | **nada** | **nada** |
| M7 troca o "computado" por um reinício | falta 1, interrupção 1 | idem |
| **M8 apaga o "computado" só numa das cópias** | **nada** | **nada** |
| M9 apaga a confirmação de Presidente | vetor fora do padrão 1 | idem |
| M10 habilitação sem desfecho | órfã 1 | órfã 1 |
| M11 corrompe a data do "computado" | órfã 1, falta 1 | idem |
| M12 ciclo falso numa urna inventada, sem `Seção Eleitoral` | extra 1 | extra 1 |
| M13 ciclo falso com o "computado" fora de ordem | confirmação fora, vetor fora, extra | idem |
| M14 ciclo falso no mesmo segundo do original | extra 1 | extra 1 |

- **Pontos cegos do script do matemático:**
  - **M6:** linha repetida idêntica conta uma vez, e o encadeamento de hash não é conferido.
  - **M8:** quando as cópias discordam, vale o melhor desfecho, sem aviso.

  A regra do cético acusa os dois (contador de linha repetida e de divergência entre cópias). Nos dados reais, esses contadores dão: linha repetida 0 e 0; divergência 0 no 2º turno e 1 no 1º, a da MG explicada no item A.
- **O que nenhuma regra de log acusa:** ciclo falso completo (M4, M12, M14) **com o BU também inflado**. Isso é o limite que o doc já declara: programa que grava estados coerentes.

## D. RJ 60011/0008/0061: os 2 votos sem habilitação do 1º turno (Fato novo)

`cetico-h16-rj-copias.mjs`:

| Log do dia 04/10 da urna 01760983 | Habilitações | Computados | Sem sessão | Linhas com data ilegível |
|---|---:|---:|---:|---:|
| Publicado no pacote do 1º turno | 309 | 311 | 2 | 9 |
| Cópia MI, dentro do pacote do 2º turno (arquivada em 16/10) | 296 | 303 | 11 | 98 |
| Cópia ME, dentro do pacote do 2º turno | 304 | 305 | 7 | 70 |
| **Publicado + ME** | **311** | **311** | **0** | — |

- **Fato.** Na cópia ME, as duas sessões aparecem inteiras:
  - às 08:31:25, "Eleitor foi habilitado" legível e as confirmações seguintes até o "computado" das 08:32:13;
  - às 09:32:52, habilitação pelo mesário e as 6 confirmações, até o "computado" das 09:33:49.

  As 311 sessões combinadas têm os 6 cargos, e o BU tem 311.
- **Fato.** As linhas corrompidas mostram troca do mesmo bit, e as duas cópias se corrompem em lugares diferentes. Exemplos: "VOTA" vira "TOTA", "01760983" vira "01740981", "INFO" vira "INDO". O hash da habilitação é "ED990EE@84DE5A4A" numa cópia e "EF990EEB84DE5A4C" na outra.
  - É o padrão de mídia com defeito, não de escrita do programa (que seria igual nas duas cópias).
  - O log do 2º turno da mesma urna, no mesmo pacote, tem 0 linha ilegível e bate com o BU (338).
- **Consequência:** o voto sem habilitação do 1º turno vira **0**, e o T1 do 1º turno passa a ter 9 pares diferentes (os 9 da falta), não 10.
- **Pendente:** conferir a assinatura do `log.jez` do 2º turno dessa seção, onde estão as cópias MI e ME (a recomendação 3 do doc 07 fala da assinatura do 1º turno).

## E. C1 / C2 / C3 e o RS 89060 (item e do pedido)

- O total da falta é o mesmo nos dois trabalhos. A diferença está só no rótulo de 1 voto do RS 89060/0017/0191 do 2º turno. Na janela de 09:02:34 a 09:38:59, o log só tem identificação, foto e "Solicita digital", sem "Eleitor foi habilitado".
  - O parecer 25 chamou esse voto de C2 ("ciclo parcial"). O doc 07 chama de C3 ("nenhuma habilitação").
  - **Recomendação:** a perícia usa a definição do doc 07. A sessão começa na habilitação, e esse voto não tem sessão. O total fica: 50 votos do 2º turno sem sessão no log (49 + 1 RS) e 152 do 1º (sem os 2 do RJ, item D).
- **Ressalva.** No doc 07, C1, C2 e C3 saem de `Math.min` sobre contagens da seção, não de casar voto com sessão. Exemplo: na RJ 58971/0087/0184 há 8 sessões interrompidas com algum cargo e 2 votos a mais no BU; dizer quais viraram voto não é possível. O doc diz isso no caso RJ. A tabela deveria dizer que a classe é atribuída por contagem.

## F. Multicargo (T1)

- **Defeito de método (Fato).** `matematico-h16-casos.mjs` só conta as sessões nas seções que estão no `.jsonl` (seções com algo fora do padrão). Nas outras, aceita o par se o comparecimento estadual for igual ao federal.
  - Fora do `.jsonl` ficam 38.629 de 40.610 pares (2º turno) e 476.266 de 497.905 (1º).
  - O fecho nacional (sessões com G = comparecimento estadual, a menos dos 161 explicados) segura o resultado. Mas a afirmação "em todas as seções, o número de sessões que votaram governador é igual ao comparecimento" não foi medida seção a seção.
- **Contagem direta (Fato, `cetico-h16-sessoes.mjs`, todas as seções):**
  - 2º turno: 40.215 pares seção × eleição com comparecimento no BU, todos iguais: governador 39.739, prefeito suplementar 476. As 395 consultas não têm comparecimento no BU e ficaram fora da minha conta. O matemático usou a soma de votos.
  - 1º turno: 497.905 pares, 497.895 iguais. Os 10 diferentes são os mesmos do doc. Com a cópia ME da RJ 60011, ficam 9.

## G. Boletim inteiro repetido (item d do pedido)

- **Reprodução (Fato, `cetico-h16-vetores.mjs`, código próprio sobre o banco):**
  - 499.206 seções com voto, em 8.627 estratos;
  - 68.595.557 pares no estrato;
  - **0 par igual no boletim inteiro**, com ou sem estrato;
  - presidente + governador juntos: 0;
  - por cargo: presidente 4, governador 161, senador 0, deputado federal 0, estadual 0, distrital 0, consulta 0;
  - por faixa de tamanho: iguais ao doc (1 a 10: 6 seções, 1 par; 101 ou mais: 494.115 seções, 68.577.068 pares).
- **O "esperado pelo acaso" não acrescenta nada.** O modelo multiplica as frações de coincidência de cada cargo, medidas nos próprios dados. Como a de senador é 0 em todos os estratos, o produto é 0 por aritmética. "Observado 0 = esperado 0" é uma identidade, não um teste.
- **A regra do três está mal aplicada.** Ela vale para tentativas independentes. Os 68,6 milhões de pares saem de 499 mil seções, e cada seção entra em muitos pares. O "≤ 3" é só uma ordem de grandeza.
- **O que fica de pé:** a busca é exata e enxerga com certeza um boletim copiado inteiro, inclusive entre UFs. Não enxerga boletim inventado nem cópia de um cargo só.
- **Recomendação:** para a cópia de um cargo, conferir urna, carga e cartão nos 4 pares de presidente e nos 161 de governador. É barato, e a regra (b) do próprio doc já prevê isso para grupos.

## H. Explicações alternativas: testadas × supostas

| Explicação | Situação |
|---|---|
| Interrupção = falha técnica | **Testada e corrigida.** Só 481 de 1.378 (2º) e 1.008 de 5.721 (1º) têm linha de erro ou de falta de energia |
| Desligamento pela chave = procedimento normal | **Recusada como explicação** (princípio 8). É ato de pessoa, e o motivo não fica no log. Vira item de risco da H17 |
| Voto sem habilitação = log corrompido | **Testada e confirmada** com a cópia ME (item D) |
| Fim do log = falha da urna original | **Testada.** Todas as 39 e 202 sessões estão em seções com reserva. A causa tem linha em 25 de 39 e em 53 de 202. Nas outras, o fim do log é o próprio rastro da troca |
| Cópias MI/ME iguais | **Testada.** Desfecho divergente em 1 sessão do país (MG, 1º turno), explicada pela gravação da MI interrompida |
| Data do dia fora do filtro | **Testada.** Linha-chave com data ilegível ou de outro dia: no 2º turno, 12 no país, todas da RJ 60011 e do dia 04/10, nas cópias do 1º turno. Nenhuma do dia 25/10. Limite: palavra com bit trocado ("Vmtm aolfirmado") escapa da busca |

## Afirmações revisadas, prontas para a perícia

1. **Fato.** Em todas as urnas dos dois turnos, toda habilitação de eleitor no log termina em voto computado, em desistência registrada ou numa interrupção da urna registrada no log (reinício, desligamento, fim do log da urna que foi trocada):
   - 2º turno: 128.244.427 habilitações = 128.235.189 votos + 7.860 desistências + 1.378 interrupções;
   - 1º turno: 125.322.998 = 125.274.326 + 42.951 + 5.721.

   Nenhuma sessão termina de outro jeito. O resultado foi reproduzido por dois códigos independentes.
2. **Fato.** Nenhum voto computado sem habilitação nos dois turnos. No 1º turno, os 2 casos do log publicado da RJ 60011/0008/0061 têm a habilitação legível na cópia ME do mesmo log, guardada no pacote do 2º turno. A cópia publicada tem bits trocados.
3. **Fato.** O log nunca tem mais votos que o BU. O BU tem votos sem "computado" no log em 6 seções do 2º turno (54 votos) e 9 do 1º (159), todas com o mecanismo explicado nos pareceres 20 e 25.
4. **Fato.** Em todas as seções, o número de eleitores que votaram para governador (e para prefeito suplementar) no log é igual ao comparecimento dessa eleição no BU, contado seção a seção: 40.215 de 40.215 no 2º turno; 497.895 de 497.905 no 1º. As diferenças são as 9 seções do item 3, mais a RJ 60011, que fecha com a cópia ME.
5. **Fato.** No 1º turno, o RDV e o BU de cada seção, lidos dos arquivos originais, têm os mesmos votos por candidato, partido, branco e nulo em todos os cargos: 2.490.805 pares, 749.120.705 votos, 0 diferença.
6. **Fato.** No 1º turno, nenhuma seção tem o boletim inteiro igual ao de outra (0 em 68.595.557 pares comparáveis, e 0 no país sem estrato). A busca enxerga com certeza um boletim copiado inteiro. Ela não enxerga boletim inventado.
7. **Fato (interrupções).** Das sessões interrompidas, têm erro ou falta de energia registrados 481 de 1.378 no 2º turno e 1.008 de 5.721 no 1º. Nas outras, o log só mostra que alguém desligou a urna pela chave (615 e 2.844) ou não mostra causa (282 e 1.869). Em 21 sessões do 2º turno e 118 do 1º, o eleitor tinha confirmado todos os cargos, a urna ficou parada sem gravar o voto e foi desligada pela chave. Esses votos não entraram no BU.
8. **Limite.** Tudo isso prova que os arquivos são coerentes entre si. Não prova que o programa da urna é o oficial: um programa adulterado que grave log, RDV e BU coerentes passa em todos esses testes.

## Recomendações

1. **Matemático:** corrigir no doc 07 a tabela "com causa técnica × sem causa" pela regra estrita. Também:
   - descrever a regra de seção que o script usa;
   - trocar "esperado pelo acaso 0" por "busca exata de cópias";
   - tirar a regra do três;
   - dizer que C1, C2 e C3 saem de contagem.
2. **Matemático:** incluir no script a contagem de linha repetida e de divergência entre cópias. Hoje o resultado é 0 e 1 (explicada), mas a regra atual não veria.
3. **H17:** partir das 615 + 2.844 sessões fechadas só pela chave e das 21 + 118 com todos os cargos confirmados e voto não gravado. A pergunta é se o eleitor voltou e votou. A lista está nos casos de `data/parsed/auditoria/cetico/h16/<t>t/<uf>.json`.
4. **Engenheiro de segurança:** conferir a assinatura do `log.jez` do 2º turno da RJ 60011/0008/0061 (onde estão as cópias MI e ME do 1º turno). Também avaliar se a urna 01760983, com mídia que troca bits, deveria ter sido usada no 2º turno.
5. **Pendente:** a busca por linhas fora do catálogo com palavras corrompidas (bit trocado) no país inteiro continua aberta. Minha busca só acha linha-chave com a data ilegível e a palavra intacta.

## Reproduzir

```bash
# sessões, universo completo, código próprio (2º turno 36 min e 1º turno 28 min, 2 processos cada)
node scripts/auditoria/cetico-h16-sessoes.mjs --turno 2 --procs 2
node scripts/auditoria/cetico-h16-sessoes.mjs --turno 1 --procs 2
node scripts/auditoria/cetico-h16-sessoes.mjs --turno 2 --consolidar
# causa das interrupções, regra estrita (lê as seções com interrupção da saída acima; 1 a 3 min)
node scripts/auditoria/cetico-h16-causas.mjs --turno 2
node scripts/auditoria/cetico-h16-causas.mjs --turno 1
# teste de mutação (segundos)
node scripts/auditoria/cetico-h16-mutacao.mjs --turno 2 --uf rr
node scripts/auditoria/cetico-h16-mutacao.mjs --turno 1 --uf ac
# RJ 60011/0008/0061: log publicado × cópias MI/ME
node scripts/auditoria/cetico-h16-rj-copias.mjs
# RDV × BU dos arquivos brutos, 1º turno, 28 UFs (36 min; --uf df,pe para duas UFs)
node scripts/auditoria/cetico-h16-rdv-bu.mjs --turno 1 --uf todas
# boletim inteiro repetido, 1º turno (4 min)
node scripts/auditoria/cetico-h16-vetores.mjs --turno 1
```

Saídas em `data/parsed/auditoria/cetico/h16/`:
- `resumo-<t>t.json` e `<t>t/<uf>.json`;
- `causas-<t>t.json`;
- `rdv-bu-1t-todas.json`;
- `vetores-1t.json`;
- `mutacao-2t-rr.md` e `mutacao-1t-ac.md`;
- `execucao-*.log`.

Os trechos de log gravados têm os números de 9 dígitos ou mais trocados por `#`.
