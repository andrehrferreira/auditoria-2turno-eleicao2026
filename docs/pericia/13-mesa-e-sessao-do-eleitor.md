# 13. A mesa e o atendimento de cada eleitor: sessões sem fim registrado, votos em bloco e "já votou"

> **Situação:** escrito em 30/10/2026. Reúne três hipóteses do [quadro das hipóteses](10-quadro-das-hipoteses.md): H16 (o atendimento de cada eleitor no diário da urna), H15 (votos em bloco no lugar de ausentes) e H17 (eleitor impedido de votar, ou voto dado no lugar de quem chegou depois). As três passaram por uma segunda verificação independente. Na H16, ela reescreveu a conta com um programa próprio, rodou os dois turnos inteiros e concluiu "sustentado", com duas correções que este texto já usa (item 3 e item 5). Na H15 e na H17, ela refez as contas e chegou aos mesmos números, mas concluiu que os testes estatísticos enxergam menos do que a primeira análise dizia; por isso eles entram aqui como **Pendente**, sem número. O texto usa só as afirmações que resistiram a essa verificação.

## A pergunta

Cada eleitor passa pela mesa e pela urna num atendimento que o diário da urna (o log) anota passo a passo: o mesário digita o título ou o CPF, a urna confere a digital (ou libera de outro jeito), a cabine é liberada, o eleitor confirma cada cargo e a urna grava o voto. As perguntas deste tópico são três:

1. **H16:** todo eleitor liberado pela urna aparece no diário com um fim registrado (votou, desistiu, ou a urna parou)? Há voto gravado sem eleitor liberado? Os votos de cada cargo, a lista de votos e o boletim batem entre si?
2. **H15:** a mesa liberou, sem digital, uma sequência de votos no lugar de eleitores ausentes?
3. **H17:** a mesa impediu eleitores de votar, ou alguém votou no lugar de um eleitor que chegou depois e ouviu "já votou"?

## Resposta curta

- **Fato:** em todas as urnas dos dois turnos, todo eleitor liberado termina num destes três fins registrados no diário: voto gravado, desistência registrada ou parada da urna registrada (reinício, desligamento, fim do diário da urna que foi trocada). **Nenhum atendimento termina de outro jeito** (0 "sessão órfã" nos dois turnos):
  - 2º turno: 128.244.427 liberações = 128.235.189 votos + 7.860 desistências + 1.378 interrupções;
  - 1º turno: 125.322.998 liberações = 125.274.326 votos + 42.951 desistências + 5.721 interrupções.
- **Fato:** **nenhum voto gravado sem eleitor liberado**, nos dois turnos. No 1º turno, os 2 casos que apareciam numa seção do RJ vêm de um diário com defeito de gravação; a cópia do mesmo diário guardada em outra memória da urna mostra as duas liberações (item 3).
- **Fato:** o diário nunca tem mais votos do que o boletim. O boletim tem votos sem a linha de voto gravado no diário em 6 seções do 2º turno (54 votos) e em 9 do 1º (159), com a causa já explicada no [tópico 2](02-coerencia-entre-arquivos.md).
- **Fato:** no 1º turno, a lista de votos (RDV) e o boletim de cada seção, lidos dos arquivos originais, têm os mesmos votos em todos os cargos: **0 diferença em 2.490.805 comparações** (749.120.705 votos). E **nenhuma seção tem o boletim inteiro igual ao de outra** (0 em 68.595.557 pares comparados).
- **Fato:** das interrupções, só 481 de 1.378 (2º turno) e 1.008 de 5.721 (1º) têm erro ou falta de energia anotados no diário. Nas outras, o diário só mostra que alguém desligou a urna pela chave (615 e 2.844) ou não mostra causa (282 e 1.869). Em **21 atendimentos do 2º turno e 118 do 1º**, o eleitor tinha confirmado todos os cargos, a urna não gravou o voto e foi desligada pela chave: **esses votos não entraram no boletim**. É voto perdido, não voto a mais.
- **Pendente (H15):** o teste de votos em bloco foi feito em todas as seções dos dois turnos, e as contas foram confirmadas. Mas ele só enxerga um tipo de bloco (votos seguidos, liberados pelo mesmo mesário registrado, num ritmo mais regular que o de uma pessoa) e não enxerga bloco pequeno, bloco intercalado com eleitores reais, nem bloco liberado pelas vias em que a urna não grava quem liberou. Por isso, o resultado fica sem conclusão até o teste ser refeito com o ritmo de uma pessoa.
- **Fato (H17):** atendimentos que terminaram sem voto, por suspensão ou cancelamento ("atendimentos perdidos"): 805.368 de 139.310.955 no 2º turno e 1.206.250 de 136.390.914 no 1º. Os atendimentos que terminam sem nenhum desfecho anotado ficam fora dessa conta (Pendente).
- **Pendente (H17):** o teste que compara o "já votou" depois de voto sem digital com o "já votou" depois de voto com digital.
- **Fato (caso para apuração de campo):** na seção PR 78573/0083/0101, no 2º turno, 16 dos 26 votos liberados sem digital foram seguidos, em até 20 segundos, de um "o eleitor identificado já votou"; isso não aconteceu depois de nenhum dos 270 votos pela digital. As 19 liberações manuais do dia foram feitas por digitais que a urna não associou a nenhum mesário registrado. Só a ata e o caderno de votação dizem quem liberou.
- **Não se pode afirmar:** que o programa da urna era o oficial. Tudo acima prova que os arquivos são coerentes entre si; um programa adulterado que grave diário, lista de votos e boletim coerentes passa em todos esses testes. E o diário não diz de quem é o dedo posto no leitor.

## Termos usados neste tópico

- **Diário da urna (log):** o arquivo em que a urna anota, com data e hora, tudo o que acontece. Como o diário de bordo de um navio.
- **Liberação (habilitação):** o momento em que a urna libera a cabine para um eleitor, anotado como "Eleitor foi habilitado". Vem depois de o mesário digitar o título ou o CPF e de a urna conferir a digital (ou aceitar outra forma de liberação, [tópico 4](04-liberacao-dos-eleitores.md)).
- **Atendimento (ou sessão) do eleitor:** o trecho do diário que começa na liberação e termina no primeiro fim registrado. Como a ficha de um paciente num pronto-socorro: abre na entrada e tem de fechar com alta, desistência ou transferência.
- **Fim registrado (desfecho):** um de três: **voto gravado** ("O voto do eleitor foi computado"); **desistência** ("Eleitor foi suspenso e não confirmou nenhum voto": o mesário interrompeu um eleitor que não tinha confirmado nenhum cargo); **interrupção** (a urna reiniciou, a votação foi suspensa com a urna desligada, ou o diário daquela urna acabou porque ela foi trocada por uma reserva).
- **Sessão órfã:** liberação sem nenhum desses fins, como uma ficha de pronto-socorro que fica aberta para sempre. Seria o rastro de um atendimento que "sumiu".
- **Desligamento pela chave:** a urna tem uma chave física que a liga e desliga. O diário anota "Urna desligada pela chave", mas não diz quem girou a chave nem por quê. Pela regra desta perícia (princípio 8), é ato de pessoa, não causa técnica.
- **Cópias do diário:** a urna grava o diário em duas memórias, a interna e um cartão externo. Quando uma urna é trocada, o pacote da seção pode trazer as duas cópias. É como ter o mesmo caderno escrito em duas vias.
- **Bit trocado:** o menor pedaço de informação de um arquivo é o bit, um 0 ou 1. Uma memória com defeito às vezes troca um bit, e uma letra vira outra ("VOTA" vira "TOTA"). As duas cópias do diário se estragam em lugares diferentes, então uma pode completar a outra.
- **Lista de votos (RDV, Registro Digital do Voto):** a lista de todos os votos da urna, cargo por cargo, sem nome e sem ordem de chegada ([tópico 12](12-sigilo-do-voto.md)).
- **Boletim de urna (BU):** o placar da seção.
- **Eleição a mais na seção:** no 2º turno, além de Presidente, algumas seções votaram para Governador, para prefeito numa eleição suplementar (eleição refeita num município) ou numa consulta popular. No 1º turno, além de Presidente, votou-se para Governador, Senado e deputados.
- **Teste de mutação:** estragar de propósito uma cópia de um diário real, na memória do computador, e ver se a conferência acusa o estrago. Como pôr uma nota falsa no caixa para ver se a máquina de contar dinheiro a rejeita.
- **Liberação manual:** quando a digital do eleitor não é reconhecida depois de até 4 tentativas, a mesa digita um dado pessoal do eleitor e põe no leitor uma digital de quem estiver na mesa. Às vezes a urna liga essa digital a um mesário registrado na seção, às vezes anota que não consegue ligá-la a ninguém ([tópico 4](04-liberacao-dos-eleitores.md)).
- **Mesário registrado:** mesário cuja digital foi gravada na urna na abertura da seção.
- **"O eleitor identificado já votou":** aviso da urna quando o mesário digita o título ou o CPF de quem já votou naquela seção. Aparece quando alguém chega e o voto dele já foi dado, e também quando a mesa digita de novo o número de quem acabou de votar.
- **Atendimento perdido:** atendimento iniciado pelo mesário que termina sem voto, porque o eleitor foi suspenso sem votar ou porque a liberação foi cancelada.
- **Caderno de votação:** a lista de eleitores da seção, em papel, que cada eleitor assina ao votar. Não é público. É o único registro da ordem em que as pessoas assinaram.

## Como foi feito

**Universo (Fato).** Todos os pacotes de urna dos dois turnos: 499.178 no 2º turno e 499.176 no 1º, com 0 pacote sem diário e 0 erro de leitura. Ficam fora as 41 seções do exterior sem arquivo e as seções apuradas em cédula de papel (29 no 2º turno e 31 no 1º), que não têm diário de eleitor. O diário de cada urna foi lido inteiro, linha por linha, na ordem do arquivo. Quando o pacote traz duas cópias do mesmo diário, cada atendimento conta uma vez.

1. **Atendimento por atendimento (H16).** Para cada liberação, o programa procura o primeiro fim registrado e acusa qualquer outra coisa: liberação sem fim, voto gravado sem liberação, confirmação de cargo fora de atendimento, desistência depois de confirmar um cargo. Depois compara os votos gravados de cada seção com o comparecimento do boletim. A regra foi escrita antes de rodar. A segunda verificação reescreveu o programa à parte, sem usar o primeiro, e chegou aos mesmos totais, número por número.
2. **Votos por cargo (H16).** Em cada seção, o número de eleitores que confirmaram Governador (ou o cargo da eleição a mais) no diário foi comparado com o comparecimento dessa eleição no boletim, seção por seção.
3. **Lista de votos × boletim no 1º turno (H16).** Para cada seção e cada cargo, os votos de cada candidato, partido, branco e nulo na lista de votos foram comparados com os do boletim. A segunda verificação refez a conta direto dos arquivos originais das 28 UFs, sem passar pelo banco de dados da auditoria.
4. **Boletim inteiro repetido (H16).** No 1º turno, procurou-se qualquer par de seções com o boletim igual em todos os cargos, comparando seções do mesmo estado e de tamanho parecido, e também no país inteiro.
5. **Causa das interrupções (H16).** Para cada interrupção, o programa procura no diário uma linha de erro do programa ou do equipamento, ou de falta de energia. O desligamento pela chave fica numa classe à parte.
6. **Votos em bloco (H15) e "já votou" (H17).** Em cada seção, nos dois turnos, foram medidas as sequências de liberações sem digital, o ritmo delas, o horário e o que acontece no atendimento seguinte a cada voto. Os testes estatísticos estão na análise técnica separada da auditoria e entram aqui como Pendente. Os números que entram são contagens e casos conferidos no arquivo original.

**Privacidade.** Os programas não gravam número de título nem de CPF: o título de cada mesário vira um número de ordem dentro da seção (mesário 1, mesário 2). Este relatório não reproduz nenhum número de título.

## O que foi encontrado

### 1. Todo eleitor liberado tem um fim registrado (H16, Fato)

| | 2º turno | 1º turno |
|---|---:|---:|
| Pacotes de urna lidos | 499.178 | 499.176 |
| Liberações de eleitor (da própria seção) | 128.244.427 | 125.322.998 |
| … terminaram em voto gravado | 128.235.189 | 125.274.326 |
| … terminaram em desistência | 7.860 | 42.951 |
| … terminaram em interrupção registrada | 1.378 | 5.721 |
| … **sem fim registrado (sessão órfã)** | **0** | **0** |
| Voto gravado sem liberação | 0 | 0 (item 3) |
| Confirmação de cargo fora de um atendimento | 0 | 0 |
| Comparecimento no boletim | 128.235.243 | 125.274.487 |
| **Diário com mais votos que o boletim** | **0** | **0** |
| Votos do boletim sem a linha de voto gravado | 54 em 6 seções | 159 em 9 seções |

Fonte: segunda verificação independente, com programa próprio, sobre todos os pacotes dos dois turnos; os totais são iguais aos da primeira análise.

- **Fato:** a conta "liberações = votos + desistências + interrupções" fecha sem resto nos dois turnos. Ela fecha por construção (todo atendimento recebe um único fim, e o fim do arquivo também conta como fim). O que é informativo é o zero de sessões órfãs e o que há dentro das interrupções (item 5).
- **Fato:** os votos do boletim sem a linha de voto gravado são as mesmas 6 e 9 seções do [tópico 2](02-coerencia-entre-arquivos.md), com o mesmo mecanismo: a urna caiu ou foi desligada antes de gravar a última linha, ou outra urna gravou o próprio diário por cima. Nenhuma seção nova.
- **Fato:** em 304 atendimentos do 2º turno e 100 do 1º, o diário guardado no pacote é de outra seção (ES 57932/0009/0085 traz o diário da seção 0112; BA 39934/0183/0175, o da 0181). Eles ficam fora da tabela acima e não mudam nenhum total.

**Por UF, 2º turno (Fato):**

| UF | Habilitações | Votos computados | Desistências | Interrupções | Sessões órfãs | Votos do boletim sem "computado" (seções) |
|---|---:|---:|---:|---:|---:|---:|
| AC | 453.714 | 453.654 | 53 | 7 | 0 | 0 |
| AL | 1.951.827 | 1.951.632 | 186 | 9 | 0 | 0 |
| AM | 2.192.230 | 2.192.059 | 154 | 17 | 0 | 0 |
| AP | 430.018 | 429.975 | 39 | 4 | 0 | 0 |
| BA | 9.422.871 | 9.422.033 | 669 | 169 | 0 | 14 (2) |
| CE | 6.025.338 | 6.024.843 | 447 | 48 | 0 | 0 |
| DF | 1.868.504 | 1.868.280 | 191 | 33 | 0 | 0 |
| ES | 2.409.349 | 2.409.214 | 107 | 28 | 0 | 0 |
| GO | 4.047.597 | 4.047.280 | 275 | 42 | 0 | 0 |
| MA | 4.128.077 | 4.127.735 | 290 | 52 | 0 | 36 (1) |
| MG | 13.045.020 | 13.044.203 | 674 | 143 | 0 | 0 |
| MS | 1.594.581 | 1.594.460 | 104 | 17 | 0 | 0 |
| MT | 2.085.473 | 2.085.334 | 125 | 14 | 0 | 0 |
| PA | 4.989.944 | 4.989.573 | 319 | 52 | 0 | 0 |
| PB | 2.743.837 | 2.743.559 | 247 | 31 | 0 | 1 (1) |
| PE | 6.127.096 | 6.126.467 | 552 | 77 | 0 | 0 |
| PI | 2.240.076 | 2.239.829 | 214 | 33 | 0 | 1 (1) |
| PR | 7.059.855 | 7.059.339 | 447 | 69 | 0 | 0 |
| RJ | 10.078.145 | 10.077.449 | 594 | 102 | 0 | 0 |
| RN | 2.233.014 | 2.232.823 | 149 | 42 | 0 | 0 |
| RO | 988.564 | 988.489 | 67 | 8 | 0 | 0 |
| RR | 308.630 | 308.597 | 31 | 2 | 0 | 0 |
| RS | 6.889.987 | 6.889.636 | 280 | 71 | 0 | 2 (1) |
| SC | 4.762.557 | 4.762.303 | 222 | 32 | 0 | 0 |
| SE | 1.466.760 | 1.466.659 | 93 | 8 | 0 | 0 |
| SP | 27.365.823 | 27.364.389 | 1.190 | 244 | 0 | 0 |
| TO | 954.857 | 954.763 | 80 | 14 | 0 | 0 |
| Exterior | 380.683 | 380.612 | 61 | 10 | 0 | 0 |
| **Total** | **128.244.427** | **128.235.189** | **7.860** | **1.378** | **0** | **54 (6)** |

**Por UF, 1º turno (Fato):**

| UF | Habilitações | Votos computados | Desistências | Interrupções | Sessões órfãs | Votos do boletim sem "computado" (seções) |
|---|---:|---:|---:|---:|---:|---:|
| AC | 488.718 | 488.330 | 361 | 27 | 0 | 0 |
| AL | 1.939.312 | 1.938.428 | 785 | 99 | 0 | 0 |
| AM | 2.235.742 | 2.234.549 | 1.093 | 100 | 0 | 0 |
| AP | 476.856 | 476.562 | 278 | 16 | 0 | 0 |
| BA | 9.057.110 | 9.053.465 | 3.113 | 532 | 0 | 136 (1) |
| CE | 5.913.837 | 5.910.471 | 3.047 | 319 | 0 | 0 |
| DF | 1.832.541 | 1.831.396 | 1.094 | 51 | 0 | 0 |
| ES | 2.353.067 | 2.352.281 | 696 | 90 | 0 | 1 (1) |
| GO | 3.973.196 | 3.971.587 | 1.462 | 147 | 0 | 0 |
| MA | 4.162.525 | 4.160.343 | 1.977 | 205 | 0 | 0 |
| MG | 12.640.653 | 12.636.715 | 3.448 | 490 | 0 | 0 |
| MS | 1.541.987 | 1.541.220 | 705 | 62 | 0 | 0 |
| MT | 2.053.208 | 2.052.133 | 993 | 82 | 0 | 0 |
| PA | 5.068.866 | 5.066.504 | 2.072 | 290 | 0 | 0 |
| PB | 2.685.567 | 2.683.988 | 1.465 | 114 | 0 | 0 |
| PE | 5.913.637 | 5.911.062 | 2.344 | 231 | 0 | 0 |
| PI | 2.242.127 | 2.240.883 | 1.090 | 154 | 0 | 0 |
| PR | 6.844.341 | 6.841.457 | 2.468 | 416 | 0 | 0 |
| RJ | 9.862.923 | 9.859.798 | 2.641 | 484 | 0 | 2 (1) |
| RN | 2.171.959 | 2.171.012 | 855 | 92 | 0 | 1 (1) |
| RO | 991.781 | 991.080 | 673 | 28 | 0 | 0 |
| RR | 333.054 | 332.772 | 264 | 18 | 0 | 0 |
| RS | 6.704.596 | 6.702.902 | 1.410 | 284 | 0 | 1 (1) |
| SC | 4.649.499 | 4.648.159 | 1.182 | 158 | 0 | 0 |
| SE | 1.439.763 | 1.439.082 | 631 | 50 | 0 | 0 |
| SP | 26.439.279 | 26.431.974 | 6.158 | 1.147 | 0 | 18 (4) |
| TO | 965.768 | 965.196 | 541 | 31 | 0 | 0 |
| Exterior | 341.086 | 340.977 | 105 | 4 | 0 | 0 |
| **Total** | **125.322.998** | **125.274.326** | **42.951** | **5.721** | **0** | **159 (9)** |

**Como ler:** cada linha soma as liberações de eleitor anotadas nos diários das urnas daquela UF. Votos computados + desistências + interrupções = liberações, em todas as linhas. A coluna "sessões órfãs" é zero em todas as UFs. A última coluna traz os votos do boletim que não têm a linha de voto gravado no diário, e entre parênteses o número de seções (os casos estão no [tópico 2](02-coerencia-entre-arquivos.md)). No 1º turno, a linha do RJ não conta os 2 votos da seção RJ 60011/0008/0061, que no diário publicado aparecem sem liberação (item 3). Fonte: segunda verificação independente; a soma das UFs é igual ao total do país.

### 2. Os votos de cada cargo batem com o boletim (H16, Fato)

- **2º turno:** em todas as 40.215 combinações de seção e eleição a mais com comparecimento no boletim (39.739 de Governador e 476 de prefeito em eleição suplementar), o número de eleitores que confirmaram esse cargo no diário é igual ao comparecimento dessa eleição no boletim. As 395 combinações de consulta popular não têm comparecimento próprio no boletim e ficaram fora desta conta.
- **1º turno:** 497.895 de 497.905 combinações batem. As 10 que não batem são as 9 seções do item 1 (votos do boletim sem linha no diário) e a seção RJ 60011/0008/0061, que fecha com a cópia do diário (item 3).
- **Fato (método):** a segunda verificação contou seção por seção, em todas as seções. A primeira análise tinha contado assim só as seções com algo fora do padrão; o resultado é o mesmo.

### 3. Nenhum voto gravado sem eleitor liberado (H16, Fato)

No diário publicado do 1º turno da seção RJ 60011/0008/0061 havia 2 votos gravados sem a liberação antes deles. A segunda verificação achou a explicação dentro do pacote do 2º turno da mesma seção, que traz as duas cópias do diário do 1º turno daquela urna:

| Diário do dia 04/10 da mesma urna | Liberações | Votos gravados | Votos sem liberação |
|---|---:|---:|---:|
| Publicado no pacote do 1º turno | 309 | 311 | 2 |
| Cópia da memória interna, no pacote do 2º turno | 296 | 303 | 11 |
| Cópia do cartão externo, no pacote do 2º turno | 304 | 305 | 7 |
| **Publicado + cópia do cartão externo** | **311** | **311** | **0** |

- **Fato:** na cópia do cartão externo, as duas liberações que faltavam estão legíveis, uma às 08:31:25 e outra às 09:32:52, cada uma seguida das confirmações dos 6 cargos e do voto gravado. Juntando as cópias, as 311 sessões ficam completas, e o boletim tem 311 votos.
- **Fato:** as linhas estragadas mostram troca de um bit, em lugares diferentes em cada cópia ("VOTA" vira "TOTA", "INFO" vira "INDO"). É o padrão de memória com defeito, não de erro do programa, que escreveria igual nas duas cópias. O diário do 2º turno da mesma urna não tem nenhuma linha estragada e bate com o boletim.
- **Resultado:** voto gravado sem liberação é **0 nos dois turnos**. A primeira análise dava 2 no 1º turno; este é o número corrigido.

### 4. Lista de votos × boletim no 1º turno, e boletins repetidos (H16, Fato)

- **Fato:** em todas as seções e todos os cargos do 1º turno, a lista de votos e o boletim, lidos dos arquivos originais das 28 UFs, têm os mesmos votos por candidato, partido, branco e nulo: **0 diferença em 2.490.805 comparações de seção e cargo, com 749.120.705 votos** dos dois lados. A soma dos boletins originais é igual à do banco de dados da auditoria em cada UF. (No 2º turno, a mesma comparação já estava feita: 0 diferença em 539.815, [tópico 2](02-coerencia-entre-arquivos.md).)
- **Fato:** no 1º turno, **nenhuma seção tem o boletim inteiro igual ao de outra**: 0 em 68.595.557 pares de seções do mesmo estado e de tamanho parecido, e 0 no país inteiro. Uma cópia de boletim inteiro de uma seção para outra seria achada com certeza; um boletim inventado, não.
- **Fato:** olhando um cargo de cada vez, há pares de seções com os mesmos votos para Presidente (4 pares) e para Governador (161 pares); para Senado e deputados, nenhum. **Pendente:** conferir urna, preparação e cartão de votos desses 165 pares, para afastar a cópia de um cargo só.

### 5. As interrupções: por que a urna parou (H16, Fato)

Uma interrupção é um atendimento que terminou porque a urna parou. O diário mostra como ela parou:

| Como o atendimento terminou | 2º turno | 1º turno |
|---|---:|---:|
| A urna reiniciou | 783 | 2.906 |
| "Votação suspensa" | 556 | 2.613 |
| O diário daquela urna acaba (urna trocada por reserva) | 39 | 202 |
| **Total** | **1.378** | **5.721** |

E o que o diário mostra como causa:

| Causa anotada no diário | 2º turno | … com algum cargo confirmado | … com todos os cargos confirmados | 1º turno | … com algum cargo confirmado | … com todos os cargos confirmados |
|---|---:|---:|---:|---:|---:|---:|
| Erro do programa ou do equipamento, ou falta de energia, dentro do atendimento | 411 | 19 | 14 | 685 | 330 | 16 |
| Idem, só nas 30 linhas antes da liberação | 70 | 6 | 5 | 323 | 203 | 2 |
| Só o desligamento pela chave (ato de pessoa) | 615 | 43 | 21 | 2.844 | 1.783 | 118 |
| Nenhuma linha de causa | 282 | 23 | 17 | 1.869 | 1.287 | 18 |
| **Total** | **1.378** | **91** | **57** | **5.721** | **3.603** | **154** |

Fonte: segunda verificação independente. "Todos os cargos confirmados" quer dizer que o eleitor chegou a confirmar Presidente, o último cargo da urna.

- **Fato (correção):** a primeira análise contava como "causa técnica" o desligamento pela chave, o aviso normal de bateria ("carga plena") e a palavra "encerrou" (que contém "erro"). Com a regra estrita, só 481 de 1.378 interrupções do 2º turno e 1.008 de 5.721 do 1º têm erro ou falta de energia anotados.
- **Fato:** "Votação suspensa" é, na prática, a urna desligada pela chave: em 524 das 556 do 2º turno e em 2.445 das 2.613 do 1º, a única causa no diário é a chave. Exemplo conferido no arquivo original: AC 01023/0001/0608, 2º turno; o eleitor é liberado às 10:54:13, às 10:54:30 a urna é desligada pela chave, e ela religa às 10:55, sem erro antes.
- **Fato:** **em 21 atendimentos do 2º turno e 118 do 1º, o eleitor confirmou todos os cargos, a urna não gravou o voto e a única causa no diário é o desligamento pela chave.** O boletim dessas seções bate com o diário: esses votos não foram contados. Em três casos conferidos um a um no arquivo original (AL 27537/0007/0141, AL 27855/0002/0385 e AL 28339/0013/0118), o Presidente é confirmado, o diário fica parado de 6 a 9 minutos sem voto gravado e sem erro, e depois vem o desligamento pela chave.
  - **Hipótese (técnica):** a urna travou sem anotar erro, e alguém a desligou.
  - **Risco (princípio 8):** é perda de voto de quem votou, não inflação. Se o eleitor voltou e votou depois, o diário não diz (**Pendente**).
- **Fato:** as 39 interrupções do 2º turno e as 202 do 1º em que o diário da urna acaba estão **todas** em seções que votaram com urna reserva. É o fim do diário da urna que falhou, guardado dentro do pacote da reserva. Exemplo: AM 02836/0019/0072, 2º turno; a urna libera o eleitor às 08:24:26, um segundo depois anota "Erro inesperado durante a votação | O voto do eleitor NÃO foi registrado", e a reserva começa às 08:35.
- **Fato:** entre as interrupções com todos os cargos confirmados (57 no 2º turno e 154 no 1º), em 4 e em 5 o voto entrou no boletim; são as seções do [tópico 2](02-coerencia-entre-arquivos.md) em que a urna caiu antes de gravar a última linha do diário.

### 6. Votos em bloco no lugar de ausentes (H15)

**A suspeita.** Perto do fim do dia, quando já se sabe quem faltou, a mesa libera sem digital uma sequência de votos em nome dos ausentes.

**O que foi medido.** Em cada seção, nos dois turnos, as sequências de votos liberados sem digital pelo mesmo mesário, o ritmo delas (um bloco feito às pressas tende a ter intervalos regulares) e o horário. As seções do 2º turno foram comparadas com elas mesmas no 1º turno.

- **Fato:** nos dias de votação dos dois turnos, em todas as seções do Brasil (497.897, sem o exterior), os diários anotam 16.974.708 votos liberados à mão depois de a digital não ser reconhecida. Em 16.974.705 deles, o diário anota as 4 tentativas de digital antes da liberação; em 3, menos (ainda não conferidos no arquivo original). A urna anota cada liberação manual, mas não diz de quem é o dedo.
- **Fato:** a parcela de votos sem digital não sobe no fim do dia. Na última hora com voto de cada seção, no 2º turno, foram sem digital 787.713 de 6.229.601 votos (12,64%); nas horas anteriores da mesma seção, 12,69%. No 1º turno, 12,14% na última hora e 12,49% antes.
  - **Ressalva:** o horário não absolve. Quem escolhe ausentes já conhecidos (por exemplo, quem não votou no 1º turno) não precisa esperar o fim do dia.
- **Pendente (o teste de blocos):** a segunda verificação confirmou as contas do teste, mas concluiu que ele enxerga pouco:
  - ele só pode acusar um bloco liberado por **mesário registrado**. A maior parte dos votos sem digital vem por vias em que a urna não anota quem liberou: pelo ano de nascimento, ou por liberação manual com digital não ligada a mesário ([tópico 4](04-liberacao-dos-eleitores.md)). Por essas vias o alerta não acende;
  - a capacidade de detecção foi medida com um bloco de ritmo de máquina, mais regular que o de qualquer sequência real encontrada; para o ritmo de uma pessoa, ela não foi medida;
  - bloco pequeno e bloco intercalado com eleitores reais ao longo do dia não são vistos.

  Por isso, nenhuma conclusão numérica do teste entra aqui, nem o tamanho máximo de fraude que ele "descartaria". Os números estão na análise técnica separada da auditoria.

**Um caso para apuração de campo: SP 64017/0391/0164 (Fato, boletim e diário originais).** A seção usou a mesma urna (modelo 2013) nos dois turnos.

| | 1º turno | 2º turno |
|---|---:|---:|
| Comparecimento | 239 | 271 |
| Liberados pela digital | 101 | 213 |
| Liberados à mão (digital não reconhecida) | 135 | 54 |
| Liberados pelo ano de nascimento (sem digital na urna) | 3 | 4 |

- **Fato:** no 2º turno, o diário mostra a digital funcionando normalmente até 08:38. Das 08:40 às 09:18, vêm 20 liberações à mão seguidas, todas do mesmo mesário e todas depois de 4 tentativas de digital. Às 09:19, a digital volta a funcionar.
- **Hipótese (técnica):** leitor de digital que falha por um período. A mesma urna liberou à mão 135 dos 239 votantes no 1º turno.
- **Hipótese (risco):** sequência de votos liberados no lugar de ausentes. O diário não diz de quem é o dedo posto 4 vezes no leitor.
- **Recomendação:** pedir a ata, o caderno de votação dos dois turnos e o registro de manutenção do leitor desta seção.

### 7. Eleitor impedido de votar, ou voto no lugar de quem chegou depois (H17)

**As suspeitas.** (a) A mesa suspende ou cancela o atendimento de certos eleitores, que vão embora sem votar. (b) Alguém vota sem digital no lugar de um eleitor; quando o dono do título chega, a urna diz "já votou".

**Atendimentos perdidos (Fato):**

| | 2º turno | 1º turno |
|---|---:|---:|
| Atendimentos iniciados pelo mesário (fora das consultas em sequência) | 139.310.955 | 136.390.914 |
| Atendimentos perdidos (eleitor suspenso sem votar, ou liberação cancelada) | 805.368 | 1.206.250 |
| Parcela | 0,58% | 0,88% |

- "Consulta em sequência" é uma rajada de 3 ou mais "já votou" sem voto entre eles, em que a mesa parece estar conferindo uma lista; esses atendimentos ficam fora da conta.
- **Ressalva:** os atendimentos que terminam sem nenhum desfecho anotado no diário ficam fora de "perdidos". Nos casos olhados um a um no arquivo original, eles são número digitado errado e justificativa de ausência recebida. **Pendente:** a contagem desses padrões no país inteiro.
- **Ressalva:** o cancelamento não tem autor no diário. Só a suspensão anota quem a autorizou.

**"Já votou" depois de voto sem digital.**
- **Pendente:** o teste que compara, dentro de cada seção, a frequência do "já votou" logo depois de um voto sem digital e logo depois de um voto pela digital. A segunda verificação confirmou as contas, mas o teste fica fora deste relatório, assim como a lista de seções que ele aponta: o alerta por seção exige saber qual mesário liberou, e na maior parte das seções apontadas o diário não anota mesário na liberação anterior.

**O caso PR 78573/0083/0101 (Fato, conferido no diário e no boletim originais).** A seção usou a mesma urna (modelo 2022) nos dois turnos.

| | 1º turno | 2º turno |
|---|---:|---:|
| Comparecimento | 284 | 296 |
| Liberados pela digital | 258 | 270 |
| Liberados à mão (digital não reconhecida) | 19 | 19 |
| Liberados pelo ano de nascimento (sem digital na urna) | 7 | 7 |

- **Fato:** no 2º turno, o diário bate com o boletim: 270 pela digital, 19 à mão e 7 pelo ano de nascimento.
- **Fato:** no 2º turno, em 16 dos 26 votos sem digital, o atendimento seguinte, até 20 segundos depois, termina em "o eleitor identificado já votou": 4 depois de voto pelo ano de nascimento e 12 depois de liberação à mão. No atendimento seguinte, 10 foram identificados pelo CPF e 6 pelo título. Isso não acontece depois de nenhum dos 270 votos pela digital.
- **Fato:** as 19 liberações à mão do 2º turno foram feitas por digitais que a urna **não associou a nenhum mesário registrado**. Os mesários foram registrados às 07:13. Às 08:06:59 e às 12:46:05, a urna anotou que não encontrou a digital posta no leitor em nenhum arquivo e criou um arquivo novo; nas outras 17 liberações, anotou que a digital "bate com uma digital gravada após o registro inicial de mesário". Ou seja: uma ou duas digitais de fora do registro da mesa liberaram os 19 eleitores.
- **Fato:** no 1º turno, a mesma urna tem 4 casos de "já votou" logo depois de voto sem digital, todos depois de liberações de um mesmo mesário registrado, que fez as 18 liberações à mão daquele dia.
- **Hipótese (benigna):** a mesa digita de novo o CPF ou o título do eleitor que acabou de liberar, para conferir que o voto entrou, e um mesário cuja digital não casou com o próprio registro faz as liberações.
- **Hipótese (risco):** as liberações foram feitas por alguém que não está registrado como mesário, com uma conferência logo depois de que o voto "entrou". O diário não anota o número digitado, então não diz se o "já votou" é do mesmo eleitor.
- **Recomendação:** pedir a ata e o caderno de votação dos dois turnos desta seção: quem liberou e a ordem das assinaturas. O padrão aparece nos dois turnos.

## Prova de que o teste funciona (contraprova)

- **Fato (teste de mutação):** a segunda verificação estragou de propósito, na memória, o diário real de uma seção de cada turno, de 14 jeitos diferentes: apagou o voto gravado de um eleitor, apagou uma liberação, inseriu um atendimento falso, corrompeu uma data, entre outros. A regra da primeira análise acusou 12 das 14 alterações. As duas que passaram são pontos cegos conhecidos (uma linha de voto gravado repetida idêntica, e cópias do diário que discordam entre si); a regra da segunda verificação acusa as duas, e nos dados reais elas dão 0 linha repetida e 1 cópia discordante (MG 44458/0103/0221, no 1º turno: uma cópia perdeu uns 7 minutos de linhas antes de uma queda, e o boletim bate com o diário). "0 sessão órfã" não é sinal de teste cego.
- **Fato:** um atendimento falso completo, com o boletim também aumentado, não é acusado por nenhuma regra de diário. É o limite descrito abaixo.
- **Fato (rotas independentes):** os totais de liberações, votos, desistências e interrupções saíram iguais em dois programas escritos à parte. A lista de votos × boletim do 1º turno saiu igual lendo os arquivos originais e lendo o banco de dados da auditoria.
- **Fato (o caso de H17):** na seção PR 78573/0083/0101, a contagem de liberações do diário (pela digital, à mão e pelo ano de nascimento) é igual à do boletim, o que mostra que a leitura do diário está certa nessa seção.

## Limites (o que não se pode afirmar)

1. **O programa da urna.** Todos esses testes provam que os arquivos são coerentes entre si. Um programa adulterado que grave diário, lista de votos e boletim coerentes passa em todos eles. Isso depende de controles fora dos arquivos públicos ([tópico 7](07-limites-da-pericia.md)).
2. **De quem é o dedo.** O diário anota que uma digital foi posta no leitor e, às vezes, a que mesário ela pertence. Não anota de quem é o dedo, nem quem estava na cabine.
3. **Votos em bloco.** O teste não enxerga bloco pequeno, bloco intercalado com eleitores reais, bloco igual nos dois turnos, nem bloco liberado pelas vias em que a urna não anota mesário.
4. **Atendimentos sem desfecho.** Ficam fora da conta de atendimentos perdidos e não foram contados no país inteiro.
5. **Linhas estragadas.** A busca acha uma linha estragada quando a data fica ilegível e a palavra-chave continua inteira. Uma palavra-chave estragada por bit trocado pode escapar.
6. **Desligamento pela chave.** O diário diz que alguém desligou a urna, não por quê. Os 21 e 118 votos não gravados são um fato; a causa é Hipótese.

## Pendentes (sem número)

- **H15:** refazer a medida de capacidade do teste com o ritmo de uma pessoa e com blocos pelo ano de nascimento e por liberação manual sem mesário.
- **H17:** o teste do "já votou" depois de voto sem digital, e a contagem nacional dos atendimentos sem desfecho.
- **H17:** nos 615 atendimentos do 2º turno e 2.844 do 1º fechados só pela chave, e em especial nos 21 e 118 com todos os cargos confirmados: o eleitor voltou e votou?
- **H16:** conferir urna, preparação e cartão de votos dos 4 pares de seções com o mesmo voto para Presidente e dos 161 com o mesmo voto para Governador, no 1º turno.
- **H16:** conferir a assinatura do diário do 2º turno da seção RJ 60011/0008/0061, onde estão as cópias do diário do 1º turno, e se a urna com memória que troca bits deveria ter sido usada no 2º turno.
- **H05:** conferir no arquivo original as 3 liberações manuais com menos de 4 tentativas de digital.
- **Busca de palavras-chave estragadas** no país inteiro.

## Pedido aos TREs

Pedir a ata e o caderno de votação dos dois turnos das seções PR 78573/0083/0101 e SP 64017/0391/0164 (quem liberou e a ordem das assinaturas), e o registro de manutenção do leitor de digital da SP 64017/0391/0164.

## Próximos passos

- [x] Atendimento de cada eleitor, votos por cargo, lista de votos × boletim no 1º turno, boletins repetidos e causa das interrupções, nos dois turnos, com segunda verificação independente.
- [x] Atendimentos perdidos e os casos PR 78573/0083/0101 e SP 64017/0391/0164, conferidos no arquivo original.
- [ ] **Pendente.** Refazer o teste de votos em bloco com o ritmo de uma pessoa (H15).
- [ ] **Pendente.** Levar à perícia o teste do "já votou", depois de revisto (H17).
- [ ] **Pendente.** Pedidos de ata e caderno de votação das duas seções.
