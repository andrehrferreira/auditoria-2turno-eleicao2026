Você é revisor independente de uma auditoria das eleições brasileiras de 2026 (1º turno 04/10, 2º turno 25/10; Presidente: 13 = Lula, 22 = Flávio Bolsonaro). O relatório de perícia (docs/pericia/) é para leigos e tem uma regra dura: **só entra número 100% correto**, do universo completo (todas as seções, todas as UFs), conferido nos arquivos oficiais do TSE e reproduzível por script. Estimativa, amostra, "cerca de", número de terceiros não conferido e conta feita sobre suposição devem ficar FORA ou aparecer só como "Pendente", sem número.

Universo do 2º turno: 499.248 seções, 499.207 com pacote completo, 499.205 com voto para Presidente. Você não tem acesso aos dados nem pode rodar código: revise o que dá para revisar só com o texto.

## Sua tarefa

Revise **cada número** do tópico abaixo. Procure:

1. **Conta errada:** somas, diferenças, porcentagens, razões e totais que não fecham com os próprios números do texto (refaça as contas).
2. **Denominador ou universo trocado:** porcentagem calculada sobre base diferente da declarada; número que diz ser do país mas parece de parte das UFs; mistura de 1º e 2º turno.
3. **Contradição interna:** o mesmo dado com valores diferentes em lugares diferentes do tópico, ou diferente da tabela nacional de referência anexada.
4. **Violação da regra dos 100%:** número estimado, amostral, arredondado ("cerca de", "~", "aproximadamente"), parcial (só algumas UFs), de terceiros, ou conclusão que o número não sustenta.
5. **Afirmação mais forte que a evidência** (nos dois sentidos: falso alarme de fraude ou falsa absolvição).

## Formato da resposta (markdown)

Uma tabela com: | # | Trecho exato (cite) | Problema (tipo 1–5) | Conta refeita ou explicação | Gravidade (alta/média/baixa) |
Depois, uma linha "Números conferidos sem problema: N" e uma lista curta dos números que você conseguiu conferir aritmeticamente e batem.
Não invente números que não estão no texto. Se não houver problema, diga isso explicitamente. Seja específico: um achado vago não serve.

## Tópico em revisão: 03-linha-do-tempo.md

# 3. Linha do tempo da urna

## A pergunta

O que a urna fez desde a preparação até o encerramento, e em que horário? Houve votos fora do horário permitido ou votos em ritmo impossível para uma pessoa?

## Situação da revisão

Os achados deste tópico ainda **não têm parecer do revisor cético** (`docs/analysis/cetico-revisor/`). Os pareceres previstos, de números 11 (votos depois das 17h) e 12 (sequências impossíveis), não existiam em 29/10/2026. Por isso cada afirmação abaixo leva, ao lado do rótulo, a marca "aguarda revisão cética". Os números podem mudar de alcance depois dessa revisão.

## Resposta curta

Tudo abaixo vale para o **2º turno (25/10/2026)**, e todos os rótulos aguardam revisão cética.

| Pergunta | O que se encontrou | Rótulo |
|---|---|---|
| Alguma urna abriu ou recebeu voto antes das 8h de Brasília? | Nenhuma | **Fato** |
| Alguma urna encerrou antes das 17h de Brasília? | Nenhuma. A urna tem uma trava que impede o encerramento antes das 17h | **Fato** |
| Houve voto depois das 17h de Brasília? | Sim: 34.330 votos (0,027% do total) em 29.854 seções. A urna **não tem trava** para isso: quem decide até quando entra eleitor é o mesário | **Fato** |
| Houve seções que ficaram abertas até 19h? | Sim: 6.352 seções encerraram às 19h ou depois. A própria urna não exigia isso | **Fato** |
| Os votos depois das 17h mudaram o resultado? | Não de forma que se possa medir. Mesmo se fossem todos de um lado só, seriam 0,8% da diferença entre os dois candidatos | **Fato** |
| Houve voto em ritmo impossível para uma pessoa? | Não. O menor intervalo real entre dois votos seguidos é de 16 segundos, com todo o passo a passo de um eleitor registrado | **Fato** |
| O mesário seguiu as regras de horário? | Não se pode afirmar. Em 784 seções o mesário declarou à urna que "todas as pessoas presentes já votaram" e depois disso ainda houve voto | **Fato** (o registro); o motivo é **Pendente** |

O resultado mostra **o que a urna registrou e quando**. Não mostra **quem** estava diante da urna, nem se a entrada de eleitores depois das 17h foi autorizada (ver "O que este resultado prova e o que não prova").

## Termos usados neste tópico

| Termo | Em palavras simples |
|---|---|
| **Diário da urna (log)** | Já explicado no glossário do [README](README.md). Aqui importa que cada linha tem data e hora com precisão de 1 segundo |
| **Hora de Brasília / hora local** | A urna anota a hora **local** do município. A votação vai das 8h às 17h **de Brasília** no país inteiro. Para comparar urnas de lugares diferentes, todos os horários foram convertidos para Brasília |
| **Fuso** | A diferença de horas entre o município e Brasília (por exemplo, o Acre está 2 horas atrás) |
| **Carga da urna** | A preparação da urna antes da eleição, quando o programa e a lista de eleitores são gravados nela |
| **Urna pronta** | A mensagem do diário que marca o momento em que a urna passa a aceitar votos |
| **Habilitação do eleitor** | O momento em que a urna libera o eleitor para votar, por digital ou, sem digital, pelo número do título e o ano de nascimento digitados pelo mesário |
| **Religamento** | A urna foi desligada (pela chave ou por falta de energia) e ligada de novo durante a votação |
| **Contingência** | Já explicado no glossário do [README](README.md): urna reserva que substitui a original |
| **Mediana** | O valor do meio: metade das seções fica abaixo, metade acima |
| **p90, p99** | O valor abaixo do qual ficam 90% (ou 99%) das seções. Mostra até onde vão quase todos os casos, deixando de fora só os extremos |
| **Ponto percentual (p.p.)** | A diferença entre duas porcentagens. De 52% para 51% é uma queda de 1 ponto percentual |
| **Correlação** | Um número de −1 a +1 que diz se duas coisas sobem e descem juntas. Perto de 0 quer dizer que não há relação |
| **Comparação dentro da mesma zona** | Comparar seções vizinhas, da mesma zona eleitoral, para que diferenças de região, renda ou preferência política não se misturem ao efeito medido |

## Como foi feito

1. **Universo.** Foram lidos os diários de **todas** as urnas do 2º turno. Do total de 499.207 seções com boletim, 497.896 entram nos testes de horário. Ficam de fora as 1.310 seções do exterior, porque o repositório não tem a tabela do fuso de cada país e não é possível converter o horário delas para Brasília. **Fato, aguarda revisão cética** (`data/parsed/auditoria/tempo/2t/resumo.json`). Os arquivos de saída diferem em 1 seção (497.896 em um, 497.897 em outro); a diferença foi levada ao coordenador.
2. **Fuso de cada município.** Como todas as urnas abrem às 8h de Brasília, a hora local em que a maioria das urnas do município ficou pronta mostra o fuso dele. Exemplo: no Acre, todas as 2.270 seções ficaram prontas às 6h locais, logo o Acre está 2 horas atrás de Brasília.
3. **Linha do tempo.** Para cada urna, foram separados no diário os momentos de carga, abertura, cada voto, cada religamento, o encerramento e a emissão do boletim.
4. **Ritmo.** Foi medido o tempo entre dois votos seguidos e entre a habilitação do eleitor e o voto, em todas as seções.
5. **Votos tardios.** Foram contados os votos depois das 17h de Brasília. Nas seções com voto depois das 17h ou com encerramento depois das 17h30, o diário foi relido inteiro, segundo a segundo, para ver como o mesário encerrou e se a urna estava parada antes do voto tardio.
6. **Efeito no resultado.** Foram comparadas seções da mesma zona com e sem voto tardio.
7. **Casos extremos** foram conferidos no diário original, linha por linha. Esses casos servem só para confirmar o que já foi medido no total, não para gerar números.

Ponto de partida do teste (o que se espera se nada estiver fora do normal): a urna é preparada antes do 1º turno, abre às 8h, fica ligada até as 17h, recebe votos só de quem estava na fila às 17h, encerra e emite o boletim em poucos minutos. Desvios vêm de falha de equipamento ou de energia e deixam marca no diário.

Princípio usado (princípio 8 de [../01-premissas.md](../01-premissas.md)): uma regra cumprida por pessoas, como "o mesário só deixa votar quem estava na fila às 17h", **não conta como controle**. Só conta o que a urna trava sozinha e registra. Onde o controle depende só de pessoas, isso aparece como **risco**, e os dados são examinados para ver se a brecha foi usada.

## O que foi encontrado

### 1. Fuso horário

- **Fato, aguarda revisão cética.** Fuso de −2 h: todo o Acre (2.270 seções) e 11 municípios do Amazonas (556 seções): Guajará, Atalaia do Norte, Benjamin Constant, Eirunepé, Envira, Ipixuna, Jutaí, São Paulo de Olivença, Amaturá, Itamarati e Tabatinga. Fuso de −1 h: o resto do AM, MS, MT, RO e RR. Fuso de +1 h: Fernando de Noronha (13 seções). Fuso 0: as demais UFs. Fonte: `fuso-municipio.csv`.
- **Hipótese.** A lista dos 11 municípios do AM com −2 h confere com a lei federal dos fusos (Lei 12.876/2013). A lista acima saiu do relógio das urnas, e a conferência com a lei não foi feita.
- Consequência prática: quem converter o horário pela UF inteira erra em 1 hora as 556 seções do AM e as 13 de Noronha.

### 2. Preparação (carga)

- **Fato, aguarda revisão cética.** 496.962 urnas foram carregadas entre 15/09 e 04/10, a preparação do 1º turno, e serviram nos dois turnos. 2.245 foram carregadas entre 09/10 e 25/10 (1.970 de seção e 275 de reserva).
- **Fato, aguarda revisão cética.** 5 urnas foram carregadas no próprio dia da eleição, horas antes de abrir: MS 90514/0008/0486, MS 91650/0051/0044, PR 74918/0056/0037 (carga às 9h20, abertura às 10h02), PR 75833/0043/0397 (10h04 e 10h51) e SP 61816/0016/0436 (7h58 e 8h32). (Formato: UF, município/zona/seção.)
- **Hipótese.** Foram urnas trocadas antes da abertura. **Pendente:** conferir os lacres dessas 5 urnas (tópico 1).

### 3. Abertura

- **Fato, aguarda revisão cética.** Nenhuma urna ficou pronta antes das 8h de Brasília e nenhuma recebeu voto antes das 8h. Metade das urnas ficou pronta até 08:00:01, e 99% até 08:05:46.
- **Fato, aguarda revisão cética.** 927 seções abriram depois das 8h15; 88 depois das 9h; 18 depois das 10h. A que abriu mais tarde, MG 46477/0134/0295, só foi ligada às 13h00 e abriu às 13h08, com 9 votos de 25 eleitores aptos. Lista em `linha-do-tempo-anomalias.csv`.
- **Fato, aguarda revisão cética.** Em 5 seções o boletim diz que a votação abriu às 08:00:01, mas o diário só mostra a urna pronta de 15 a 42 minutos depois: CE 15296/0011/0258, PE 23370/0035/0045, PE 23515/0054/0003, RJ 60011/0191/0045 e SP 71072/0420/0322. Em PE 23370/0035/0045, o diário registra bateria crítica às 7h17, nenhuma linha até 8h04 e urna pronta às 8h42.
- **Hipótese.** A urna entrou em votação às 08:00:01, perdeu energia e o fim do diário daquele trecho se perdeu; ou o boletim tira o horário de abertura de outra fonte. **Pendente.**

### 4. Urna religada durante a votação

- **Fato, aguarda revisão cética.** 13.385 seções (2,7%) tiveram a urna religada durante a votação, num total de 23.081 religamentos. 17.787 foram desligamentos pela chave (7.210 logo depois de um erro registrado). 5.294 não têm desligamento registrado, o que indica queda de energia ou travamento. Fonte: `reinicios.json`.
- **Fato, aguarda revisão cética.** Os erros mais comuns antes de religar foram falha na leitura da digital e falha no terminal do mesário. As próprias mensagens de erro mandam desligar e ligar a urna. Em 285 casos o erro foi "O voto do eleitor NÃO foi registrado".
- **Fato, aguarda revisão cética.** Tempo com a urna parada: mediana de 68 segundos; 90% até 6,5 minutos; 99% até 37 minutos; o maior, 3h11. Caso com mais religamentos: AC 01392/0009/0225, 11 vezes, todas depois de erro do leitor de digital (conferido no diário original).
- **Fato, aguarda revisão cética.** Volta Redonda (RJ 59250), zona 0090: em 20 seções a urna foi desligada pela chave às 17h00min30s, sem encerrar a votação. Ficou desligada cerca de 2h30 e foi religada entre 19h10 e 19h50, na bateria interna, só para encerrar. Não houve voto depois das 17h00min41s (conferido na seção 0397).
- **Hipótese.** Em Volta Redonda houve falta de energia no local ou erro de procedimento. Nesse intervalo as urnas ficaram desligadas e sem boletim, e a garantia de que nada mudou depende das assinaturas digitais (tópico 1). **Pendente:** conferir os lacres dessas 20 urnas e pedir ao TRE-RJ a ata da zona 0090.
- **Hipótese.** Depois de um "voto não registrado", o mesmo eleitor votou de novo após o religamento. **Pendente:** conferir no diário.

### 5. Ritmo dos votos: houve sequência impossível? (hipótese H08)

Para votar, cada eleitor passa por um ciclo: o mesário digita o título, a urna habilita o eleitor e o eleitor confirma cada cargo. Isso leva um tempo mínimo físico. Um voto sem esse ciclo, ou rápido demais, indicaria voto inserido sem eleitor.

- **Fato, aguarda revisão cética.** Em 499.177 seções com voto no diário, apareceram 339 intervalos menores que 15 segundos entre dois votos. **Todos estão em 3 seções** (BA 39870/0133/0184, ES 57932/0009/0085 e MG 40690/0016/0264), todas com urna substituída duas vezes. No diário original, o mesmo registro aparece duas vezes, com a mesma hora, a mesma mensagem e o mesmo código de encadeamento. A causa é um erro no programa de leitura desta auditoria (`lerLogs`, em `src/perfil-secoes.js`), que junta cópias repetidas do diário da urna original quando ela aparece em mais de um arquivo. Não é um registro da urna. Nessas 3 seções o diário lido conta **mais** votos que o boletim (+185, +304 e +46). O boletim não é afetado.
- **Fato, aguarda revisão cética.** Sem essas 3 seções, o **menor intervalo entre dois votos no país é de 16 segundos** (3 seções), seguido de 17 segundos (4 seções). Os cinco casos de 16 e 17 segundos foram conferidos no diário original: todos têm o ciclo completo. Exemplo, RS 88390/0162/0403: título digitado às 10:30:38, digital às 10:30:45, voto às 10:30:51; próximo título às 10:30:57, digital às 10:31:03, voto às 10:31:07.
- **Fato, aguarda revisão cética.** Da habilitação até o voto, com 1 cargo (só presidente): mínimo de 2 segundos, em 2.656 seções. Conferido em 3 seções de AL: 2 teclas e CONFIRMA.
- **Fato, aguarda revisão cética, parcial.** Com 2 cargos (presidente e governador), o mínimo é 4 segundos, em 1 caso (DF 97012/0013/0418), com 33 casos de 5 segundos e 1.049 de 6 segundos. **Parcial:** UFs incluídas AC, DF, RN e TO (21.738 seções); faltam as demais UFs com 2º turno para governador.
- Conclusão do item: **Fato, aguarda revisão cética.** Não há voto sem o ciclo de um eleitor nem sequência fisicamente impossível no 2º turno. Os únicos casos abaixo do mínimo humano eram linhas duplicadas pela leitura.
- **Risco (princípio 8).** O tempo do ciclo não mostra **quem** digitou. Um ciclo de 16 segundos com liberação pelo ano de nascimento também pode ser feito pelo próprio mesário. Exemplo: PE 24570/0147/0393 tem 3 eleitores seguidos sem digital, um a cada 23 segundos, às 8h17. Esse risco é examinado pelo padrão de liberação sem digital (tópico 4), não pelo intervalo.

### 6. Votos depois das 17h de Brasília (hipótese H06)

- **Fato, aguarda revisão cética.** A urna **não deixa encerrar antes das 17h de Brasília**: ao tentar, o diário registra "Encerramento só pode ser solicitado após as 17:00:00 horas". Nenhum boletim tem encerramento antes das 17h; o mais cedo foi 17:00:09.
- **Fato, aguarda revisão cética.** A urna **não tem trava para voto depois das 17h**: aceita voto até o mesário encerrar. A regra de que só vota quem chegou à fila até as 17h depende só de pessoas.
- **Fato, aguarda revisão cética.** Nenhum voto depois do encerramento do boletim.

| | Votos | Seções |
|---|---|---|
| Total de votos no diário (igual ao boletim) | 127.854.844 | 497.896 |
| Depois das 17h | 34.330 (0,027%) | 29.854 (6,0%) |
| Depois das 18h | 1.993 | 1.667 |
| Depois das 19h | 11 | 11 |

Fonte: `data/parsed/auditoria/tempo/2t/resumo.json` e `votos-apos-17h.csv`. **Fato, aguarda revisão cética.**

- **Fato, aguarda revisão cética.** Por UF, os votos depois das 17h vão de 0,010% (SC) a 0,056% (RO) do total. Depois das 18h, concentram-se em RJ (883), SP (641), BA (287), PE (113) e PB (41).
- **Fato, aguarda revisão cética.** Nas seções com voto tardio, o último voto veio, na mediana, 1,25 minuto depois das 17h. Em 99% delas, até 102 minutos depois. O mais tarde, 126 minutos depois.
- **Fato, aguarda revisão cética.** Comparação com o 1º turno (04/10), sem prorrogação: uma contagem feita pela coordenação com os mesmos diários encontrou cerca de 3,67 milhões de votos depois das 17h e 763 mil depois das 18h no 1º turno, contra cerca de 34 mil no 2º. Fonte: `docs/hipoteses.md` (H06) e `scripts/h06-votos-apos-17h.mjs`. O 1º turno tinha mais cargos, o que alonga a fila.

### 7. Seções abertas até 19h

- **Fato, aguarda revisão cética.** 6.352 seções encerraram às 19h de Brasília ou depois (6.257 entre 19h00 e 19h09). Outras 1.260 encerraram entre 17h30 e 18h59. Estão em 147 municípios, sobretudo Rio de Janeiro (1.978 seções), São Paulo (1.481), Salvador (730), Petrópolis (285), João Pessoa (265), Itaboraí (237) e Recife (220). Em 313 locais de votação, todas as seções foram até 19h; em 818 locais, só parte delas. Fonte: `extensao-resumo.json`, `locais-encerramento-19h.csv`.
- **Fato, aguarda revisão cética.** **A urna não exigiu as 19h.** Em 1.025 dessas 6.352 seções, o mesário mandou encerrar antes das 19h, respondeu "SIM" à pergunta "Todas as pessoas presentes já votaram?" e depois cancelou o encerramento. Exemplo: BA 38490/0002/0047 mandou encerrar às 17h11, respondeu SIM, cancelou às 17h11min59s e encerrou às 19h04. Em 16 seções o encerramento foi confirmado exatamente às 19:00:00.
- **Fato, aguarda revisão cética.** Nessas 6.352 seções houve 4.492 votos depois das 17h, 1.860 depois das 18h e 11 depois das 19h. 3.339 delas não tiveram nenhum voto depois das 17h: ficaram abertas sem receber ninguém.
- **Fato, aguarda revisão cética, parcial.** No 1º turno não aparece esse degrau de encerramentos às 19h; os encerramentos tardios ficam espalhados entre 18h e 22h, como fila. **Parcial:** UFs incluídas AC, AL, AM, AP, BA, CE, DF, ES, GO, MA e MG; faltam MS, MT, PA, PB, PE, PI, PR, RJ, RN, RO, RR, RS, SC, SE, SP, TO e o exterior.
- **Pendente.** A imprensa noticiou em 26/10/2026 uma decisão judicial que prorrogou a votação até 19h onde as urnas ainda estavam abertas às 17h (`docs/hipoteses.md`, H06). O número do processo, o horário da decisão e o ato do TSE ou dos TREs que a aplicou não foram conferidos na fonte original, e as reportagens divergem no horário. O diário mostra só o que aconteceu: as urnas ficaram abertas porque quem as operava decidiu assim. A existência do ato não muda esse registro.

### 8. Sinais de eleitores que chegaram depois das 17h (risco humano)

Quem estava na fila às 17h é atendido em sequência. Se a urna fica parada por muito tempo e depois volta a receber votos, é sinal de eleitor que chegou depois das 17h.

| Grupo (hora em que o boletim encerrou, Brasília) | Seções | Votos depois das 17h | Votos depois de pausa de 30 min ou mais | Seções em que o 1º voto tardio veio depois das 17h05, com a urna parada 10 min ou mais |
|---|---|---|---|---|
| até 17h29 | 26.454 | 29.191 | 602 | 389 |
| 17h30 a 18h59 | 1.260 | 647 | 264 | 252 |
| 19h ou depois | 6.352 | 4.492 | 2.567 | 2.230 |

Fonte: `logs-tardios-resumo.json`, relendo o diário segundo a segundo. **Fato, aguarda revisão cética.**

- **Fato, aguarda revisão cética.** Em **784 seções**, o mesário respondeu "SIM" a "Todas as pessoas presentes já votaram?" e ainda houve voto **depois** dessa resposta: 580 no grupo das 17h, 32 entre 17h30 e 18h59, e 172 no grupo das 19h. A declaração registrada no diário é desmentida pelo próprio diário. Caso mais longo: BA 36854/0180/0147, último voto antes das 17h às 16h30 e o eleitor seguinte atendido às 18h25.
- **Fato, aguarda revisão cética.** Como os votos tardios foram liberados:

  | Grupo | Com digital | Sem digital cadastrada (título + ano de nascimento) | Liberação manual pelo mesário |
  |---|---|---|---|
  | encerrou até 17h29 | 24.398 (83,6%) | 2.324 | 2.469 |
  | encerrou às 19h ou depois | 3.915 (87,2%) | 332 | 245 |
  | média do país no dia (boletim) | 87,6% | 5,7% | 6,8% |

  No grupo das 17h, a parcela liberada sem digital fica cerca de 4 pontos percentuais acima da média do dia.
- **Hipótese.** Parte dos votos depois de pausas longas é de eleitores que chegaram depois das 17h. Os 1.860 votos depois das 18h nas seções que foram até 19h são o caso mais forte. Sem o ato oficial, não se sabe se eram permitidos. O número exato de eleitores que chegaram depois das 17h não foi medido; as colunas acima são indícios, não a contagem.
- **Risco aberto (princípio 8).** Depois das 17h, quem decide se um eleitor ainda pode votar é só o mesário. O diário mostra milhares de atendimentos que começaram com a urna parada e 784 declarações de "todos votaram" desmentidas. Isso **não prova fraude**: mostra que o controle de horário depende de pessoas e que, em parte das seções, a declaração delas não confere com o registro.

### 9. Os votos tardios favoreceram algum lado?

Não é possível saber em quem cada eleitor tardio votou: o registro dos votos é embaralhado para proteger o sigilo. Dá para comparar seções.

- **Fato, aguarda revisão cética.** Comparando, dentro da mesma zona, seções com e sem voto depois das 17h: a diferença no percentual do candidato 13 (contando só os votos em 13 e 22) é de −0,26 ponto percentual, em 3.880 zonas. Sem separar por zona, a diferença parecia de 2,35 pontos (53,98% contra 51,63%); ela some quando se comparam seções vizinhas.
- **Fato, aguarda revisão cética.** Correlação, dentro da zona, entre a parcela de votos tardios da seção e o percentual do 13: +0,013, em 497.830 seções. Isto é, praticamente nenhuma relação.
- **Fato, aguarda revisão cética.** Locais que foram até 19h, comparados com locais que encerraram às 17h na mesma zona: −0,47 ponto percentual para o 13, em 83 zonas. Por UF: RJ −0,03; SP −0,39; BA −1,25; PE −0,32; PB −2,97.
- **Fato, aguarda revisão cética, parcial.** Descontando o que cada seção já mostrava no 1º turno, a diferença fica em +0,10 ponto percentual. **Parcial:** UFs incluídas AC, AL, AM, AP, BA, CE, DF, ES, GO, MA e MG (21 zonas comparáveis, sobretudo na BA); faltam as demais 16 UFs, entre elas RJ, SP, PE e PB, onde se concentram os locais que foram até 19h.
- **Fato, aguarda revisão cética.** Escala: a diferença nacional para presidente é de 4.430.191 votos (13: 64.256.232; 22: 59.826.041, soma dos boletins, tópico 5). Todos os votos depois das 17h somam 34.330. Mesmo que fossem todos de um lado, seriam 0,8% dessa diferença.
- Conclusão do item: **Fato, aguarda revisão cética.** A hipótese H06, de que a extensão do horário favoreceu um lado, não se sustenta como efeito no resultado: não há diferença mensurável entre seções com e sem voto tardio, e o volume é pequeno demais para mudar o resultado nacional.

### 10. Encerramento e emissão do boletim

- **Fato, aguarda revisão cética.** Nenhum boletim tem data de encerramento fora de 25/10. Nenhum voto depois do encerramento.
- **Fato, aguarda revisão cética.** Tempo entre o encerramento e a emissão do boletim: até 4 minutos em 493.529 seções; de 5 a 14 minutos em 4.408; de 15 a 59 minutos em 873; de 1 a 2 horas em 358; 2 horas ou mais em 39. O maior foi 2h45 (RJ 59250/0090/0232, Volta Redonda). Nos atrasos longos, o tempo passa no registro dos mesários, depois do encerramento, sem nenhum voto. Exemplo: AC 01082/0004/0440 encerrou às 17h02 e só iniciou a finalização às 19h00.
- **Fato, aguarda revisão cética.** 5 seções têm boletim, mas o diário não tem o início do encerramento no dia: ES 57932/0009/0112, MG 46256/0131/0046, RS 89630/0072/0054, SC 83593/0008/0143 e SP 61654/0014/0250.
- **Hipótese.** Nessas 5, o boletim foi gerado depois de religar a urna e o diário dessa parte ficou em outra mídia. **Pendente.**
- **Fato, aguarda revisão cética.** 5.712 seções usaram urna de contingência e 11.748 pacotes têm mais de um diário. Em 9 de 499.206 seções, a contagem de votos do diário difere da do boletim: as 3 com linhas duplicadas pela leitura (item 5) e 6 com menos votos no diário que no boletim (BA 34711/0021/0178: −1; BA 35653/0173/0235: −13; MA 08893/0047/0609: −36; PB 21750/0002/0254: −1; PI 11533/0003/0216: −1; RS 89060/0017/0191: −2). **Pendente:** explicar as 6.

### 11. Um caso examinado nos dois turnos: AM, Ipixuna, zona 0045, seção 0063

A seção, numa aldeia indígena, foi examinada a pedido de outro auditor porque o boletim mostra o 22 caindo de 61 para 2 votos entre os turnos, o 13 subindo de 135 para 167 e o comparecimento caindo de 227 para 197. Ipixuna está 2 horas atrás de Brasília: 17h de Brasília são 15h locais. Horários abaixo em hora local.

- **Fato, aguarda revisão cética.** **1º turno:** a urna abriu às 6h48 (48 minutos atrasada) e funcionou o dia inteiro sem rede elétrica, na bateria. A bateria acabou à tarde e a urna foi substituída por uma de contingência às 16h46–16h48. 175 votos foram na urna original e 52 na reserva.
- **Fato, aguarda revisão cética.** **1º turno: 81 dos 227 votos (35,7%) vieram depois das 17h de Brasília.** O último voto foi às 18h53 locais (20h53 de Brasília). Os votos tardios chegaram em ritmo constante (por hora local: 15h: 22; 16h: 9; 17h: 25; 18h: 25), sem o aspecto de fim de fila. Foi a última seção de Ipixuna a fechar no 1º turno.
- **Fato, aguarda revisão cética.** **2º turno:** sem troca de urna (a reserva do 1º turno virou a urna da seção). Abriu às 6h00 locais (8h de Brasília), foi desligada pela chave às 12h51 e religada às 13h23, e encerrou às 15h01 locais (17h01 de Brasília). Nenhum voto depois das 17h de Brasília; 193 dos 197 votos vieram até as 11h locais.
- **Fato, aguarda revisão cética.** Sem digital: 24,2% dos votos do 1º turno e 24,7% dos votos do 1º turno depois das 17h, ou seja, não se concentra no horário tardio. No 2º turno, os 41 votos sem digital ficaram entre 6h e 11h locais, na mesma proporção dos demais.
- **Fato, aguarda revisão cética.** Nas liberações manuais (6 no 1º turno e 8 no 2º), a digital usada para liberar o eleitor **não é de nenhum mesário registrado** na urna. **Risco aberto (princípio 8):** não se sabe de quem é a digital.
- **Fato, aguarda revisão cética.** Nenhum intervalo impossível nos dois turnos (mínimo de 73 segundos no 1º e de 40 segundos no 2º).
- **Hipótese.** O atraso na abertura e a troca da urna (cerca de 35 minutos parada) não explicam 3h54 de votação depois das 17h de Brasília no 1º turno. **Pendente:** a autorização do juiz eleitoral, se houver, na ata da seção ou da zona.
- **O que o caso não mostra:** a queda do 22 não pode ser ligada ao horário, porque o registro dos votos não diz em quem cada eleitor votou. O diário mostra só que, no 1º turno, um terço dos votos veio depois das 17h de Brasília e, no 2º, a votação praticamente terminou às 11h locais.

## Prova de que o teste funciona (contraprova)

- **O teste de ritmo acusa o que é impossível.** Ele apontou os 339 intervalos de 0 a 14 segundos. Conferidos no diário original, eram linhas repetidas pela leitura. Ou seja, se a urna tivesse registrado votos colados, sem ciclo de eleitor, o teste os teria apontado. **Fato, aguarda revisão cética.**
- **O teste de voto tardio acha voto tardio quando ele existe.** No 1º turno de Ipixuna-AM (item 11), ele encontrou 81 votos depois das 17h de Brasília, com o último às 20h53, conferidos no diário original. **Fato, aguarda revisão cética.**
- **O teste de "voto depois de SIM" não acusa à toa.** Num grupo de controle de 9.292 seções que encerraram até 17h29 sem nenhum voto tardio (1 em cada 50, usado só para conferir o método, não para medir), o teste deu 0 seções com voto depois do "SIM". **Fato, aguarda revisão cética** (`logs-tardios-resumo.json`, grupo "controle 17h").
- **O fuso sai do próprio dado.** Todas as 2.270 seções do Acre ficaram prontas às 6h locais e as 13 de Fernando de Noronha às 9h locais, o que bate com o fuso conhecido desses lugares. **Fato, aguarda revisão cética.**
- **A trava das 17h deixa rastro.** A mensagem "Encerramento só pode ser solicitado após as 17:00:00 horas" aparece no diário quando alguém tenta encerrar antes (ex.: AL 27081/0053/0162, às 9h45). **Fato, aguarda revisão cética.**

## O que este resultado prova e o que não prova

- **Prova:** nenhuma urna abriu antes das 8h nem encerrou antes das 17h de Brasília; nenhuma recebeu voto depois de encerrada; nenhum voto entrou sem o ciclo de um eleitor; os votos depois das 17h são 0,027% do total e não mostram relação com o resultado das seções.
- **Não prova** que só votou depois das 17h quem estava na fila às 17h. A urna não controla isso; o mesário controla. Em 784 seções a declaração do mesário de que todos já tinham votado é desmentida pelo diário.
- **Não prova** quem estava diante da urna em cada voto. O tempo do ciclo é compatível com um eleitor, mas também com o mesário digitando. Essa pergunta é do tópico 4.
- **Não prova** que a extensão até 19h foi autorizada. Isso depende de um documento oficial ainda não conferido.

## Limites

- **Exterior fora dos testes de horário.** As 1.310 seções do exterior não entram porque falta a tabela de fuso por país. No relógio local, o exterior teve 417 votos depois das 17h, em 252 seções. **Fato, aguarda revisão cética.**
- **Erro de leitura em 3 seções.** O programa desta auditoria duplica linhas do diário quando a urna original aparece em mais de um arquivo. Afeta 3 seções e não afeta o boletim. **Pendente:** correção em `src/perfil-secoes.js` e nova leitura de todos os diários.
- **Comparações com o 1º turno parciais.** O degrau das 19h e a "diferença de diferenças" usam só 11 UFs do 1º turno (ver itens 7 e 9).
- **Ciclos com 2 cargos parciais.** Medidos em 4 UFs (item 5).
- **Contagens a conciliar.** A contagem da coordenação (`scripts/h06-votos-apos-17h.mjs`) dá 34.066 votos depois das 17h e 1.960 depois das 18h no 2º turno; a do auditor de linha do tempo dá 34.330 e 1.993. **Hipótese:** a diferença vem de a primeira contar só urnas comuns, sem as de contingência. **Pendente:** conciliação. A diferença é pequena e não muda nenhuma conclusão acima.
- **Sigilo do voto.** Não dá para saber em quem votou o eleitor tardio, só comparar seções.

## Como repetir

```
node scripts/auditoria/tempo-perfil.mjs --turno 2             # fuso por município, votos depois das 17h, intervalos, linha do tempo
node scripts/auditoria/tempo-extensao.mjs                     # encerramentos às 19h, locais, comparação de resultado
node scripts/auditoria/tempo-logs-tardios.mjs --paralelo 5    # relê os diários das seções tardias, segundo a segundo
node scripts/auditoria/tempo-tardios-resumo.mjs               # resumo por grupo de encerramento
node scripts/auditoria/tempo-reinicios.mjs --paralelo 4       # causa de cada religamento
node scripts/auditoria/tempo-ciclos.mjs --uf ac,df,rn,to      # tempo do ciclo por número de cargos
node scripts/auditoria/tempo-conferir.mjs --secao uf/municipio/zona/secao   # confere uma seção no diário original
```

As saídas ficam em `data/parsed/auditoria/tempo/2t/`. O detalhamento técnico está em `docs/analysis/linha-do-tempo/01` a `05`.

## Próximos passos

- **Pendente:** revisão cética dos itens deste tópico (pareceres 11 e 12 em `docs/analysis/cetico-revisor/`).
- **Pendente:** conferir na fonte original a decisão judicial e o ato do TSE ou dos TREs que estenderam o horário até 19h, com a lista de locais, e cruzar com os 313 locais inteiros e os 818 mistos.
- **Pendente:** repetir a linha do tempo completa no 1º turno, com todas as UFs (os diários do 1º turno já estão lidos).
- **Pendente:** conferir os lacres das 5 urnas carregadas no dia da eleição e das 20 de Volta Redonda.
- **Pendente:** corrigir a leitura duplicada e repetir as contas.
- **Pendente:** cruzar os votos tardios sem digital com o mesário que liberou e com as rajadas de liberação (tópico 4).
- **Pendente:** tabela de fuso do exterior, para incluir as 1.310 seções.
- **Pendente:** atas da seção 0063 de Ipixuna-AM nos dois turnos e da zona 0090 de Volta Redonda-RJ.


## Tabela nacional de referência (gerada por script sobre o universo completo do 2º turno)

# Números nacionais do 2º turno (universo completo)

Gerado por `node scripts/auditoria/nacional-resumo.mjs` sobre a cópia de leitura do banco (2026-10-29T09:27:11.866Z). Todas as seções do 2º turno; nenhuma amostra (princípio 9).

## 1. Votos depois das 17h de Brasília

Fonte: diário (log) de cada urna, contagem de "O voto do eleitor foi computado" por hora local, convertida para Brasília pelo fuso de cada município (moda da hora de "urna pronta", que é 08:00 de Brasília). **Exterior:** vota no horário local de cada país, então ali se conta após 17h **locais**. Seções sem horário de "urna pronta" para estimar o fuso: 29.

| Região | Seções com log | Seções com voto após 17h | Votos após 17h | Após 18h | Após 19h | % dos votos do log |
|---|---|---|---|---|---|---|
| Norte | 43.769 | 3.158 | 3.535 | 4 | 0 | 0,03 |
| Nordeste | 140.828 | 8.576 | 9.975 | 462 | 2 | 0,03 |
| Centro-Oeste | 38.048 | 2.704 | 3.045 | 3 | 0 | 0,03 |
| Sudeste | 203.236 | 13.358 | 15.557 | 1.524 | 9 | 0,03 |
| Sul | 72.015 | 2.058 | 2.218 | 0 | 0 | 0,01 |
| Exterior | 1.281 | 252 | 417 | 0 | 0 | 0,11 |
| **Brasil (sem exterior)** | 497.896 | 29.854 | 34.330 | 1.993 | 11 | 0,03 |
| **Total com exterior** | 499.177 | 30.106 | 34.747 | 1.993 | 11 | 0,03 |

Por UF:

| UF | Seções com log | Seções com voto após 17h | Votos após 17h | Após 18h | Após 19h | % dos votos do log |
|---|---|---|---|---|---|---|
| AC | 2.270 | 141 | 158 | 0 | 0 | 0,03 |
| AL | 7.101 | 552 | 646 | 0 | 0 | 0,03 |
| AM | 8.157 | 879 | 1.004 | 0 | 0 | 0,05 |
| AP | 1.914 | 131 | 142 | 0 | 0 | 0,03 |
| BA | 35.476 | 3.449 | 4.190 | 287 | 2 | 0,04 |
| CE | 23.765 | 960 | 1.074 | 1 | 0 | 0,02 |
| DF | 6.969 | 876 | 980 | 2 | 0 | 0,05 |
| ES | 9.844 | 269 | 294 | 0 | 0 | 0,01 |
| GO | 15.686 | 643 | 734 | 0 | 0 | 0,02 |
| MA | 18.093 | 828 | 921 | 10 | 0 | 0,02 |
| MG | 52.062 | 2.084 | 2.253 | 0 | 0 | 0,02 |
| MS | 7.106 | 388 | 422 | 0 | 0 | 0,03 |
| MT | 8.287 | 797 | 909 | 1 | 0 | 0,04 |
| PA | 20.827 | 1.173 | 1.308 | 4 | 0 | 0,03 |
| PB | 10.712 | 416 | 471 | 41 | 0 | 0,02 |
| PE | 21.418 | 1.436 | 1.636 | 113 | 0 | 0,03 |
| PI | 10.225 | 299 | 337 | 1 | 0 | 0,02 |
| PR | 27.142 | 877 | 926 | 0 | 0 | 0,01 |
| RJ | 37.675 | 3.431 | 4.150 | 883 | 4 | 0,04 |
| RN | 8.115 | 372 | 413 | 2 | 0 | 0,02 |
| RO | 4.698 | 496 | 555 | 0 | 0 | 0,06 |
| RR | 1.519 | 135 | 145 | 0 | 0 | 0,05 |
| RS | 27.547 | 748 | 829 | 0 | 0 | 0,01 |
| SC | 17.326 | 433 | 463 | 0 | 0 | 0,01 |
| SE | 5.923 | 264 | 287 | 7 | 0 | 0,02 |
| SP | 103.655 | 7.574 | 8.860 | 641 | 5 | 0,03 |
| TO | 4.384 | 203 | 223 | 0 | 0 | 0,02 |
| ZZ | 1.281 | 252 | 417 | 0 | 0 | 0,11 |

## 2. Habilitação sem digital e parcela do 13

Fontes: BU de cada urna (detalhamento do comparecimento, especificação oficial) e log (liberações com registro do mesário). A "% 13" é a parcela do 13 entre os votos 13 + 22 de **todas** as seções do recorte. Ela mostra onde os votos sem digital aconteceram, não como esses eleitores votaram, porque o voto é secreto (ver H13).

| Recorte | Comparecimento (BU) | Sem biometria cadastrada (ano de nascimento) | Biometria falhou → dado pessoal | Total sem digital | % do comparecimento | Liberações com registro do mesário (log) | % 13 entre 13+22 |
|---|---|---|---|---|---|---|---|
| Norte | 10.317.110 | 376.554 | 560.476 | 937.030 | 9,08 | 385.951 | 50,01 |
| Nordeste | 36.335.632 | 1.658.304 | 2.611.075 | 4.269.379 | 11,75 | 1.795.037 | 69,37 |
| Centro-Oeste | 9.595.354 | 387.894 | 605.894 | 993.788 | 10,36 | 425.854 | 39,99 |
| Sudeste | 52.895.255 | 3.967.830 | 3.421.710 | 7.389.540 | 13,97 | 2.219.043 | 47,24 |
| Sul | 18.711.280 | 861.228 | 1.433.333 | 2.294.561 | 12,26 | 1.015.209 | 37,42 |
| Exterior | 380.612 | 0 | 0 | 0 | 0,00 | 0 | 53,86 |
| **Brasil** | 128.235.243 | 7.251.810 | 8.632.488 | 15.884.298 | 12,39 | 5.841.094 | 51,79 |

Por UF:

| UF | Comparecimento (BU) | Sem biometria cadastrada | Biometria falhou → dado pessoal | Total sem digital | % do comparecimento | Liberações com registro do mesário (log) | % 13 entre 13+22 |
|---|---|---|---|---|---|---|---|
| AC | 453.654 | 15.325 | 22.654 | 37.979 | 8,37 | 15.680 | 33,43 |
| AL | 1.951.632 | 69.950 | 135.874 | 205.824 | 10,55 | 96.551 | 60,77 |
| AM | 2.192.059 | 95.104 | 118.955 | 214.059 | 9,77 | 81.200 | 54,02 |
| AP | 429.975 | 15.323 | 19.685 | 35.008 | 8,14 | 13.775 | 52,88 |
| BA | 9.422.047 | 452.648 | 702.255 | 1.154.903 | 12,26 | 441.566 | 71,31 |
| CE | 6.024.843 | 243.464 | 429.294 | 672.758 | 11,17 | 307.281 | 68,93 |
| DF | 1.868.280 | 59.213 | 84.114 | 143.327 | 7,67 | 59.627 | 45,72 |
| ES | 2.409.214 | 507.891 | 151.401 | 659.292 | 27,37 | 97.838 | 43,63 |
| GO | 4.047.280 | 180.295 | 268.656 | 448.951 | 11,09 | 187.598 | 40,34 |
| MA | 4.127.771 | 150.516 | 259.852 | 410.368 | 9,94 | 170.045 | 69,54 |
| MG | 13.044.203 | 1.502.075 | 887.910 | 2.389.985 | 18,32 | 580.336 | 50,43 |
| MS | 1.594.460 | 67.852 | 115.545 | 183.397 | 11,50 | 82.538 | 40,40 |
| MT | 2.085.334 | 80.534 | 137.579 | 218.113 | 10,46 | 96.091 | 33,94 |
| PA | 4.989.573 | 199.204 | 277.373 | 476.577 | 9,55 | 183.890 | 55,02 |
| PB | 2.743.560 | 82.348 | 199.353 | 281.701 | 10,27 | 147.473 | 67,46 |
| PE | 6.126.467 | 477.992 | 399.764 | 877.756 | 14,33 | 283.892 | 69,20 |
| PI | 2.239.830 | 44.724 | 201.641 | 246.365 | 11,00 | 138.605 | 75,88 |
| PR | 7.059.339 | 49.132 | 493.321 | 542.453 | 7,68 | 367.600 | 37,42 |
| RJ | 10.077.449 | 727.958 | 750.301 | 1.478.259 | 14,67 | 484.610 | 46,90 |
| RN | 2.232.823 | 83.833 | 180.838 | 264.671 | 11,85 | 135.318 | 65,72 |
| RO | 988.489 | 15.945 | 61.938 | 77.883 | 7,88 | 47.466 | 30,39 |
| RR | 308.597 | 9.093 | 12.646 | 21.739 | 7,04 | 9.518 | 27,54 |
| RS | 6.889.638 | 559.431 | 582.380 | 1.141.811 | 16,57 | 398.026 | 42,16 |
| SC | 4.762.303 | 252.665 | 357.632 | 610.297 | 12,82 | 249.583 | 30,58 |
| SE | 1.466.659 | 52.829 | 102.204 | 155.033 | 10,57 | 74.306 | 69,53 |
| SP | 27.364.389 | 1.229.906 | 1.632.098 | 2.862.004 | 10,46 | 1.056.259 | 46,15 |
| TO | 954.763 | 26.560 | 47.225 | 73.785 | 7,73 | 34.422 | 48,63 |
| ZZ | 380.612 | 0 | 0 | 0 | 0,00 | 0 | 53,86 |

