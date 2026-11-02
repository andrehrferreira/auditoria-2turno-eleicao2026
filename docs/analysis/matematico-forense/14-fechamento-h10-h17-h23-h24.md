# 14. Fechamento de H10, H17, H23 e H24 só com dados públicos

Matemático forense, 02/11/2026. Pedido do coordenador: dar a cada hipótese uma conclusão final sem esperar o TSE. Banco: cópia de leitura de 29/10 10:50 UTC (os dois turnos, 28 UFs). Universo: as 499.207 seções com urna de cada turno, todos os diários (logd.dat) dos pacotes de urna dos dois turnos, todos os BUs e RDVs. Nenhuma amostra.

**Não há teste estatístico novo neste documento.** Tudo o que é novo aqui é contagem determinística ou conta com limite (máximo e mínimo). Os poucos valores de p citados vêm de testes declarados antes, no [doc 08](08-h23-recarga-e-carga-fora-da-cerimonia.md) e no [parecer cético 39](../cetico-revisor/39-h23-h24-t11.md), e estão marcados como tal. Por isso não houve plano prévio (`14-plano.md`).

## Resposta curta

| Hipótese | Conclusão final | Por quê, em uma linha | Efeito máximo possível no 2º turno de Presidente (margem do 13: 4.430.191) |
|---|---|---|---|
| **H10** crescimento do 13 maior que o disponível | **Refutada** (como escrita). Testes derivados: (a) **sem sinal nos dados públicos**; (b) **não decidível com dados públicos**, com piso de troca desprezível | A conta fecha em toda seção; nenhuma seção tem a forma que só inserção explicaria (0 violação em BU = RDV, votos = comparecimento, comparecimento ≤ aptos); em MA, AM e TO só 8 votos exigem troca 22→outro com certeza; o resto pode ser troca ou eleitores diferentes, e quem votou em cada turno não é público | O que a H10 mede: no máximo 166.584 trocas no país (≤ 333.168 de margem) mesmo supondo a rotatividade mínima; com rotatividade máxima, 32. **Não muda o vencedor.** O que a H10 não mede (troca feita dentro da urna, coerente em BU, RDV e diário) não tem limite nos dados públicos |
| **H17** supressão ou roubo de voto na mesa | **Sem sinal nos dados públicos**, com uma parte **não decidível** (se o eleitor voltou) | (a) dos 8.683.417 atendimentos sem desfecho do 2º turno, 93% são título digitado errado ou justificativa de eleitor de outra seção, e só 1.372 tiveram eleitor habilitado; (b) os 21 votos (2º turno) e 118 (1º) confirmados e não gravados não entraram no BU em nenhum caso; em 15 e 88 o atendimento seguinte, em até 5 min, foi um voto com a mesma forma de habilitação; a identidade do eleitor não está no diário | Teto de eleitores sem votar por algo registrado na mesa: 397.603 (descontando quem votou em seguida) a 2.111.084 (sem descontar e contando títulos digitados errado). **Não muda o vencedor** |
| **H23** recarga e carga fora da cerimônia | **Sem sinal nos dados públicos** nos votos e na integridade; o **motivo** das recargas sem motivo escrito é **não decidível** (falta a ata) | (a) sem as 2 seções de cédula, o comparecimento a mais vira +0,10 ponto (≈ 499 eleitores em 1.565 seções), e quase tudo vem das 37 seções com reserva no 1º turno; (b) os 64 diários sem a linha final têm causa no próprio diário e votos sem diferença; (c) 502 recargas sem motivo no 1º turno, 475 BUs, votos sem diferença que passe a correção | (c) é o maior: 475 seções, 65.230 votos do 13 no 2º turno. Mesmo se todos fossem indevidos, **não muda o vencedor** |
| **H24** trânsito e atributos especiais para inflar seções | **Sem sinal nos dados públicos**; a contraprova mostra que as contas acusam toda alteração de aptos e de trânsito; ponto cego declarado | Com BUs alterados de propósito, as contas de aptos e de trânsito acusaram as 5 alterações de aptos ou trânsito (nas 7 seções, nos dois níveis de ataque); não acusam voto posto no lugar de quem faltou nem troca de votos | Todo o trânsito do 2º turno são 584.117 aptos. Mesmo se todos tivessem votado no 13 sem existir, **não muda o vencedor** |

## Regras usadas

- **Fato** = número que sai de script do repositório sobre o universo completo; **Hipótese** = leitura que os dados não decidem.
- Exclusões, com contagem: as 2 seções de MG que votaram em cédula no 1º turno (MG 50075/0047/0041 e MG 41238/0039/0168; BU do 1º turno de contingência, comparecimento 0 na urna) saem das contas de comparecimento da H23, como no parecer 39. Na H10 elas ficam, porque os votos de cédula foram digitados e entram no BU do Sistema de Apuração.
- Seções do Sistema de Apuração (cédula digitada: 31 no 1º turno e 29 no 2º) não têm diário de eleitor e ficam fora de toda conta que usa o diário.
- Princípio 8: gesto de pessoa (girar a chave, recarregar a urna, digitar o título) não conta como explicação benigna; conta só o que fica registrado.

---

## H10. O 13 cresceu mais do que havia de votos disponíveis?

A conta nacional já estava fechada (parecer cético 05): o 13 ganhou 10.376.694 votos e o 22, 3.721.538; os dois somam exatamente o disponível. Essa conta é uma identidade e não absolve nada. Faltavam dois testes.

### H10(a). A queda de brancos e nulos e o ganho do 13 aparecem juntos numa forma que só inserção explicaria?

**O que seria "forma que só inserção explica".** Voto inserido é voto sem eleitor. Na seção, isso deixa uma destas marcas, e nenhuma outra:

| Invariante (vale em dado honesto) | Por quê | 1º turno | 2º turno |
|---|---|---:|---:|
| A1. BU = RDV em brancos, nulos, 13 e 22 de Presidente, seção a seção | O RDV é o registro voto a voto da mesma urna; o BU é a soma dele | **0** violação | **0** violação |
| A2. Votos de Presidente (nominais + brancos + nulos) = comparecimento | Cada eleitor dá exatamente um voto de Presidente | **0** | **0** |
| A3. Comparecimento ≤ aptos | Não há mais votantes que inscritos | **0** | **0** |
| A4. Todo voto do BU tem a linha "O voto do eleitor foi computado" no diário | Voto sem eleitor habilitado no diário seria inserção | ver abaixo | ver abaixo |
| A5. Ganho do 13 ≤ eliminados do 1º turno + queda de brancos e nulos + aumento do comparecimento + perda do 22 | Identidade: só falha com erro de dado | **0** violação entre os turnos (499.205 seções) | |

Universo: 499.207 seções nos dois turnos; nenhuma existe só num turno.

**A4, votos sem a linha do diário (Fato, parecer cético 25, contagem exata de todos os pacotes).** 2º turno: 54 votos em 6 seções. 1º turno: 159 votos em 9 seções. Todos têm mecanismo conferido no bruto: o diário da urna que gravou os votos não está no pacote (contingência, "erro 72"), ou a urna caiu com o voto confirmado e o "computado" não chegou a ser escrito. Destas, **5 seções do 2º turno** têm ao mesmo tempo queda de brancos e nulos e ganho do 13 (MA 08893/0047/0609, BA 35653/0173/0235, BA 34711/0021/0178, PB 21750/0002/0254, PI 11533/0003/0216), com 52 votos sem a linha. Nas duas maiores, os contadores do próprio BU dizem como esses eleitores foram habilitados: na MA, 32 pela digital e 4 pelo ano de nascimento; na BA 35653/0173/0235, 1 pela digital e 12 pelo ano de nascimento. Pelo princípio 8, a habilitação sem digital não prova a presença do eleitor; mas o tamanho é 52 votos. No 1º turno, 6 das 9 seções (142 votos) também têm queda de brancos e nulos e ganho do 13 entre os turnos; voto a mais no 1º turno diminuiria o ganho medido do 13, não o aumentaria.

A conferência própria deste documento (`matematico-fechamento-h10.mjs`, A4 pela soma dos diários do pacote) dá 54 votos em 6 seções no 2º turno, igual ao parecer 25 (a seção SP 64777/0395/0298, com perfil do diário nulo, fica de fora: no bruto o diário tem 268 computados, igual ao BU; pareceres 08 e 21); no 1º turno ela dá 58 votos em 8 seções, e o número exato é o do parecer 25 (159 em 9), porque no 1º turno é preciso separar cópias do mesmo diário e diários de outra seção.

**Como a queda se distribui (Fato, descrição sem teste).**

| Medida | Valor |
|---|---:|
| Brancos + nulos de Presidente, 1º → 2º turno | 5.969.801 → 4.153.801 (−1.816.000) |
| ... brancos | 2.300.798 → 1.430.496 (−870.302) |
| ... nulos (todos os tipos do RDV) | 3.669.003 → 2.723.305 (−945.698) |
| ... dos quais "nulo após suspensão" (eleitor suspenso no meio do voto; os cargos que faltavam viram nulo) | 39.452 → 609 (−38.843) |
| Seções em que brancos + nulos caíram / subiram / ficaram iguais | 372.021 / 90.059 / 37.125 |
| Queda bruta (soma das quedas) e subida bruta | 2.066.892 e 250.892 |
| Seções que respondem por metade da queda bruta | 95.625 (19% das seções) |
| Maior queda numa seção | 42 votos |
| Seções em que brancos + nulos zeraram vindo de 20 ou mais | 3 |
| Seções com queda de brancos e nulos **e** ganho do 22 | 297.956 |

A queda está espalhada pelo país; não há um grupo pequeno de seções onde brancos e nulos "sumiram".

**Queda por faixa da parcela do 13 no 1º turno (Fato).** Parcela = 13 ÷ (13 + 22) no 1º turno da seção. Valores por 100 votantes do 1º turno.

| Faixa | Seções | Brancos+nulos 1º turno (%) | 2º turno (%) | Queda | Ganho do 13 | Ganho do 22 |
|---|---:|---:|---:|---:|---:|---:|
| 0–10% | 713 | 2,10 | 1,68 | 0,40 | 2,60 | 3,98 |
| 10–20% | 13.436 | 2,78 | 2,31 | 0,43 | 4,56 | 4,23 |
| 20–30% | 57.059 | 3,74 | 2,95 | 0,73 | 6,48 | 4,40 |
| 30–40% | 102.771 | 4,43 | 3,34 | 1,02 | 8,04 | 4,05 |
| 40–50% | 104.765 | 4,93 | 3,49 | 1,35 | 8,99 | 3,51 |
| 50–60% | 82.126 | 5,32 | 3,46 | 1,77 | 9,46 | 2,66 |
| 60–70% | 61.308 | 5,36 | 3,23 | 2,04 | 9,06 | 1,64 |
| 70–80% | 45.824 | 5,29 | 3,04 | 2,18 | 8,31 | 0,86 |
| 80–90% | 25.104 | 4,80 | 2,68 | 2,07 | 7,06 | 0,56 |
| 90–100% | 6.099 | 3,87 | 2,28 | 1,55 | 4,97 | 0,27 |

Como ler: a queda de brancos e nulos é maior onde o 13 é mais forte, mas é ali também que brancos e nulos eram mais altos no 1º turno (até 5,4%); no 2º turno as faixas ficam todas entre 1,7% e 3,5%. O padrão é de convergência: quem tinha mais branco e nulo perdeu mais. **Hipótese** (benigna, não testada aqui): no 1º turno o eleitor vota em seis cargos e erra ou anula mais; no 2º, em um ou dois. Esse padrão não é assinatura de inserção: inserção não precisa nem explica a queda de brancos e nulos, e a troca de branco por 13 dentro da urna também não tem forma própria nestes números.

**Ponto cego (declarado).** Se o programa da urna trocasse, no momento do voto, um branco ou nulo por um voto no 13, o RDV, o BU e o diário sairiam coerentes entre si e assinados. Nenhum arquivo público separa isso de um eleitor que votou em branco no 1º turno e no 13 no 2º. O único registro que separaria seria um registro do voto independente do programa (voto impresso conferido pelo eleitor), e ele **não existe** nesta eleição. Isso é limite da urna, não falta de publicação. A defesa contra esse caso é a integridade do programa (assinaturas e versões, H25 e H27), não a contagem.

### H10(b). MA, AM e TO: a perda do 22 exige troca de eleitores do 22 para o 13?

**Contas, seção a seção** (L = votos do 22 no 1º turno − no 2º, quando positivo):

- saída mínima = comparecimento do 1º turno − do 2º, se positivo (eleitores que no mínimo deixaram de votar);
- teto de pessoas aptas na seção = maior número de aptos da própria seção nos dois turnos + trânsito do 1º + trânsito do 2º (supõe, a favor da rotatividade, que os eleitores em trânsito de um turno são outros no outro);
- saída máxima = o menor entre o comparecimento do 1º turno e (teto − comparecimento do 2º);
- **Emín** = L − saída mínima: perda que exige troca de voto **ou** eleitores diferentes em cada turno;
- **Emáx** = L − saída máxima: perda que exige troca de voto **mesmo com a maior rotatividade possível**. É um piso certo;
- piso para o 13 = Emáx − brancos e nulos do 2º turno: a parte do piso que não pode ter ido para branco ou nulo.

| UF | Seções | Saldo do 22 | Perda bruta do 22 (seções) | Explicada por menos eleitores | Emín: troca **ou** eleitores diferentes (seções) | Emáx: troca certa (seções) | Piso que foi para o 13 |
|---|---:|---:|---:|---:|---:|---:|---:|
| MA | 18.093 | −9.069 | 42.556 (9.315) | 26.610 | 15.946 (4.641) | **3** (1) | 1 |
| AM | 8.157 | −1.519 | 27.106 (4.002) | 21.369 | 5.737 (1.350) | **5** (1) | 2 |
| TO | 4.384 | −1.405 | 11.246 (2.210) | 7.497 | 3.749 (1.058) | **0** | 0 |
| AC | 2.270 | −15.092 | 19.228 (1.536) | 18.469 | 759 (205) | 0 | 0 |
| AP | 1.914 | −13.604 | 15.546 (1.415) | 15.505 | 41 (20) | 0 | 0 |
| RR | 1.519 | −11.647 | 13.662 (1.063) | 13.385 | 277 (81) | 1 (1) | 0 |
| **Brasil** | 499.205 | +3.721.538 | 383.008 (82.180) | 216.424 | **166.584** (49.924) | **32** (16) | **8** |

Conferido no BU bruto o caso de maior piso: AM 02755/0022/0070, 195 aptos nos dois turnos (192 da seção + 3 em trânsito), comparecimento 183 → 184, 22: 20 → 1, 13: 154 → 180. Mesmo que os 3 em trânsito fossem outras pessoas no 2º turno, ao menos 5 eleitores do 22 votaram em outro no 2º turno.

**O que se pode afirmar (Fato).**
- Em MA, AM e TO, só **8 votos** (3 + 5 + 0) exigem com certeza que um eleitor do 22 no 1º turno tenha votado em outro no 2º; no país, 32 em 16 seções. Isso é mudança de voto, que é legítima; não é sinal de fraude.
- A perda do 22 que vai além da queda de comparecimento, sob a menor rotatividade possível, é de 15.946 (MA), 5.737 (AM) e 3.749 (TO) votos. Ela se explica **ou** por troca de voto **ou** por eleitores diferentes em cada turno (gente que votou no 22 no 1º turno e faltou no 2º, enquanto quem faltou no 1º foi votar no 13). Os dois caminhos dão os mesmos números de seção.
- Isso substitui a "perda além da queda" do parecer 05 (29.315, 13.112 e 6.395), que usava a perda esperada proporcional à fatia do 22; a conta aqui é limite, não modelo, e por isso é menor.

**O que não se pode afirmar.** Quanto desses 25.432 votos (MA + AM + TO) é troca e quanto é rotatividade. **Dado que falta:** a lista de quem votou em cada turno (o registro de comparecimento de cada eleitor no cadastro eleitoral e o caderno de votação assinado). **Por que não é público:** é dado pessoal (quem votou e quem faltou), protegido pela LGPD; o TSE publica só contagens por seção. O diário da urna não ajuda: ele registra a habilitação, mas não o título do eleitor.

### Efeito máximo e conclusão da H10

- O que a H10 mede tem limite: mesmo que toda a perda Emín do país (166.584) fosse troca indevida 22 → 13, a margem mudaria no máximo 2 × 166.584 = 333.168 votos, 7,5% da margem de 4.430.191. Com a rotatividade máxima, a troca certa é de 32 votos. **Não muda o vencedor.**
- O que a H10 não mede não tem limite nos dados públicos: troca dentro da urna com BU, RDV e diário coerentes (ponto cego acima). Isso fica com a integridade do programa.

**Conclusão final H10: refutada** (como escrita: o ganho do 13 cabe no disponível em todo o país, em todos os municípios e em todas as seções). Teste derivado (a): **sem sinal nos dados públicos**, com ponto cego declarado. Teste derivado (b): **não decidível com dados públicos** quanto à divisão entre troca e rotatividade (falta a lista de quem votou, dado pessoal); a troca certa é de 8 votos em MA, AM e TO.

---

## H17. Supressão ou roubo de voto na mesa

### H17(a). Atendimentos sem nenhum desfecho anotado no diário, no país inteiro

**Definição** (a mesma máquina de estados do estatístico, [doc 09 do estatístico](../estatistico-eleitoral/09-h15-h17-mesa.md)): um atendimento começa quando o mesário digita o identificador do eleitor e termina no próximo identificador, na volta à tela "Aguardando digitação do identificador", no encerramento ou no fim do dia. Desfecho, por prioridade: voto computado, "já votou", suspenso sem votar, habilitação cancelada, recusa (eleitor não encontrado, impedido, já justificou, ano de nascimento diferente). Sem nada disso, o atendimento é "sem desfecho". As consultas (3 ou mais "já votou" seguidos entre dois votos) ficam fora, como lá. O que este documento acrescenta é **o que aconteceu dentro** de cada atendimento sem desfecho, por classe fixada antes da contagem, e se o atendimento seguinte foi um voto em até 180 s (o mesmo critério de "retomada" do estatístico).

**Universo (Fato).** 2º turno: os 499.207 pacotes, 0 erro de leitura (29 do Sistema de Apuração sem voto no diário). 1º turno: os 499.207 pacotes **do próprio 1º turno**, 0 erro (31 do Sistema de Apuração), o que inclui as urnas trocadas entre os turnos. **Reprodução:** com o dia 04/10 lido do diário do 2º turno, como o estatístico fez, a conta dá exatamente os números dele: 136.390.914 atendimentos e 8.681.853 sem desfecho; no 2º turno, 139.310.955 e 8.683.417.

| | 2º turno | 1º turno (pacotes do 1º turno) |
|---|---:|---:|
| Atendimentos (fora consultas) | 139.310.955 | 136.831.668 |
| ... voto computado | 128.235.189 | 125.274.328 |
| ... recusa / cancelada / "já votou" / suspenso sem votar | 1.492.314 / 797.508 / 94.667 / 7.860 | 1.543.607 / 1.167.349 / 94.253 / 42.943 |
| ... **sem desfecho** | **8.683.417** (6,2%) | **8.709.188** (6,4%) |
| Seções com algum atendimento sem desfecho | 498.669 | 498.660 |

**O que há dentro dos atendimentos sem desfecho (Fato).** "Seguido de voto" = o atendimento seguinte da mesma seção foi um voto computado em até 180 s.

| Classe (regra fixa) | 2º turno | seguido de voto | 1º turno | seguido de voto |
|---|---:|---:|---:|---:|
| Identificador inválido (título digitado errado; a urna recusa o número) | 5.774.186 (66,5%) | 5.056.514 | 5.538.574 (63,6%) | 4.775.156 |
| Justificativa recebida (eleitor de outra seção justificou a ausência; não vota ali) | 2.321.187 (26,7%) | 1.465.977 | 2.497.300 (28,7%) | 1.600.366 |
| Identificador aceito e nada depois (o mesário volta e digita outro) | 576.124 (6,6%) | 393.530 | 657.258 (7,6%) | 445.885 |
| Digital pedida ou capturada, sem habilitação nem cancelamento | 7.420 | 6.530 | 7.887 | 6.713 |
| Foto apresentada, sem pedido de digital | 2.312 | 2.153 | 1.843 | 1.704 |
| **Eleitor habilitado**, sem cargo confirmado | 1.283 | 1.158 | 2.111 | 1.790 |
| **Eleitor habilitado**, com cargo confirmado, sem voto computado | 89 | 76 | 3.596 | 3.101 |
| Outro (em geral urna desligada ou religada no meio) | 816 | 732 | 619 | 552 |

- **Fato.** 93% dos atendimentos sem desfecho são título digitado errado ou justificativa de eleitor de outra seção. Nenhum dos dois é um eleitor da seção que ficou sem votar: no primeiro a urna nem identificou ninguém; no segundo a pessoa não é eleitora daquela seção.
- **Fato.** Os atendimentos em que o eleitor chegou a ser habilitado e não votou são 1.372 no 2º turno e 5.707 no 1º (as sessões interrompidas da H16, contadas por outro caminho: 1.378 e 5.721 no parecer 32). Os "com cargo confirmado" do 2º turno incluem os 21 da H17(b).
- **Fato (casos extremos, conferidos no bruto).** A seção com mais atendimentos sem desfecho no 2º turno é SP 71072/0389/0211 (388 de 733): 249 justificativas e 139 títulos digitados errado. No 1º turno, RJ 60011/0243/0270 (405 de 506): 337 justificativas, 59 títulos errados e 9 outros. São pontos de justificativa, não supressão.
- **Hipótese (risco, princípio 8).** "Identificador aceito e nada depois" (576.124 no 2º turno) é o único grupo grande em que um eleitor da seção foi identificado e o diário não diz o que houve: pode ser o mesário corrigindo a digitação (68% são seguidos de voto em até 3 minutos) ou um eleitor mandado embora. O diário não separa os dois.

### H17(b). Os votos confirmados e não gravados: o eleitor voltou e votou?

São as sessões do parecer cético 32: o eleitor foi habilitado, confirmou o Presidente (o último cargo), a urna não gravou "O voto do eleitor foi computado", não houve linha de erro nem falta de energia, e a urna foi desligada pela chave. A seleção deste documento usa a mesma regra do cético e reproduz os números: **21 no 2º turno e 118 no 1º**.

| | 2º turno | 1º turno |
|---|---:|---:|
| Sessões | 21 | 118 |
| O voto entrou no BU? (BU − votos computados no diário da seção = 1) | **0 de 21** | **0 de 118** |
| Forma de habilitação do eleitor interrompido: digital / ano de nascimento / mesário / dado digitado | 13 / 4 / 1 / 3 | 95 / 9 / 9 / 5 |
| Mediana entre confirmar o Presidente e girar a chave | 232 s | 344 s |
| Ao religar, a urna mostrou a tela de "reinício da votação" e o mesário confirmou | 20 | 115 |
| 1º atendimento depois da religação: **voto, mesma forma de habilitação, em até 5 min** | **15** | **88** |
| 1º atendimento: voto com outra forma, em até 5 min | 4 | 14 |
| 1º atendimento: sem desfecho (em geral título digitado errado), em até 5 min | 2 | 15 |
| Nenhum atendimento depois | 0 | 1 |
| "Já votou" num dos 5 atendimentos seguintes | 1 | 0 |

**Fato.** Nenhum desses votos foi contado: em todas as 139 seções o BU tem exatamente os votos com "computado" no diário. A urna não guardou o voto em lugar nenhum que o BU tenha somado. Por isso o eleitor continuou "sem votar" para a urna e podia votar de novo; ao contrário, nas 4 + 5 sessões com causa técnica em que o voto entrou no BU (parecer 25, classe C1), em 6 das 9 o diário mostra "já votou" logo depois, sinal de que o eleitor voltou e a urna já o tinha como votante.

**Fato.** Na maioria dos casos (15 de 21 e 88 de 118), o primeiro eleitor atendido depois da religação votou em até 5 minutos e foi habilitado do mesmo jeito que o eleitor interrompido. Isso é **compatível** com o mesmo eleitor ter voltado. Não prova: o diário não grava o título nem a digital do eleitor (é o que protege o sigilo).

**O que não se pode afirmar.** Se o eleitor interrompido é o mesmo que votou em seguida. **Dado que falta:** o caderno de votação (onde o eleitor assina) ou o registro de comparecimento de cada eleitor no cadastro, que diriam se aquele título votou. **Por que não é público:** é dado pessoal ligado a nome e título (LGPD); só sai por requisição ao cartório, seção a seção.

**Hipótese (risco, princípio 8).** O desligamento pela chave minutos depois da confirmação, sem erro, é gesto de pessoa. Se feito de propósito, anularia o voto de um eleitor que confirmou. O tamanho é 21 votos no 2º turno.

### Efeito máximo e conclusão da H17

Teto do número de eleitores da seção que podem ter ficado sem votar por algo registrado na mesa, no 2º turno (Fato, contas sobre o universo):

| Nível do teto | O que conta | 2º turno |
|---|---|---:|
| 1 | atendimentos perdidos sem retomada (estatístico: 805.368 − 591.630) + sem desfecho com identificador aceito e sem voto em 180 s | 213.738 + 183.865 = **397.603** |
| 2 | o mesmo, sem descontar a retomada | 805.368 + 588.044 = **1.393.412** |
| 3 | nível 2 + títulos digitados errado sem voto em 180 s | 1.393.412 + 717.672 = **2.111.084** |

Cada atendimento conta como um eleitor diferente e todos como eleitores do 22, o que exagera o teto. Mesmo no nível 3, o teto é 47,7% da margem de 4.430.191. **Não muda o vencedor.** Se o eleitor de cada atendimento perdido voltou ou não é o mesmo problema da H17(b): o diário não identifica o eleitor.

**Conclusão final H17: sem sinal nos dados públicos.** A supressão caiu do 1º para o 2º turno (perdidos 0,88% → 0,58%; suspensos sem votar 42.943 → 7.860), nenhuma seção tem suspensões concentradas num mesário (estatístico), os atendimentos sem desfecho são quase todos erro de digitação e justificativa, e os votos confirmados e não gravados são 21. Ficam **não decidíveis com dados públicos**: se o eleitor interrompido ou mandado embora voltou e votou (falta o caderno de votação e o registro de quem votou, dados pessoais), e o caso de campo PR 78573/0083/0101 (pedido de ata e caderno já feito).

---

## H23. Recarga ou carga fora da cerimônia oficial

### H23(a). Comparecimento das seções com recarga entre os turnos, sem as 2 seções de cédula

Seções cujo BU do 2º turno saiu de uma recarga feita entre 05/10 e 24/10: 1.567 (as 5 recargas de 25/10 ficam à parte, como no parecer 39). Efeito = Σ (taxa da seção − taxa da zona sem nenhuma recarga) × aptos ÷ Σ aptos, em pontos; em eleitores, a mesma soma sem dividir. Os valores de p e a faixa do acaso são do parecer 39 (teste já feito); a conta abaixo os reproduz e acrescenta a conversão em eleitores.

| Grupo | Seções | Comparecimento no 1º turno × zona | 2º turno × zona | Variação × zona | Em eleitores (variação) | p (parecer 39) |
|---|---:|---:|---:|---:|---:|---:|
| Todas | 1.567 | −0,259 | −0,031 | +0,228 | +1.127 | 0,001 |
| Sem as 2 de cédula | 1.565 | −0,123 | −0,022 | **+0,101** | **+499** | 0,07 |
| ... 1º turno terminou numa reserva (falha com rastro no BU) | 37 | −1,872 | −0,208 | +1,665 | +211 | 0,001 |
| ... reinício ou 2+ diários no 1º turno | 162 | −0,460 | −0,481 | −0,021 | −11 | 0,90 |
| ... nenhuma falha registrada no 1º turno | 1.366 | −0,030 | +0,041 | +0,070 | +300 | 0,23 |
| ... **sem cédula e sem reserva no 1º turno** | **1.528** | −0,077 | −0,017 | **+0,060** | **+289** | (descrição) |

**Fato.** Sem as 2 seções de cédula, o efeito cai de +0,228 para +0,101 ponto (≈ 499 eleitores em 1.565 seções). Desses, ≈ 211 estão nas 37 seções em que o 1º turno terminou numa urna reserva: ali o comparecimento do 1º turno ficou 1,9 ponto abaixo da zona, que é o rastro de uma falha de urna no dia (eleitores que desistiram durante a troca). Nas 1.528 restantes sobram +0,060 ponto, ≈ 289 eleitores, e o 2º turno dessas seções fica igual ao da zona (−0,017).

### H23(b). Diários do 2º turno sem a linha final da carga

**Fato (catálogo do doc 08, revisto pelo parecer 41).** 64 das 499.180 cargas que geraram BU no 2º turno não têm a linha "Urna carregada com sucesso". Todas são cargas de setembro (a cerimônia original, antes do 1º turno; a mesma carga serviu aos dois turnos). Por UF: SP 19, RJ 8, PR 6, MG 5, PA 4, SC 4, CE 3, PE 3 e 12 em outras 9 UFs.

- Causa no próprio diário (engenheiro, doc 10; parecer 41, sustentado): em 59, a urna foi desligada pela chave entre a impressão do extrato e a confirmação; em 5, o diário termina de repente e a urna religa minutos depois. Em todas, o código de carga e as assinaturas foram gravados; na ligação seguinte, todas as verificações de assinatura deram SUCESSO; e o código gravado é o do BU.
- Nenhuma das 64 está entre as recargas entre os turnos, as recargas sem motivo do 2º turno ou as cargas no dia da votação (cruzamento deste documento).
- Votos (descrição): do 1º para o 2º turno, a parcela do 13 nessas seções variou **0,20 ponto menos** que a da zona, e o comparecimento 0,30 ponto mais. No 2º turno elas somam 16.347 votantes, 7.467 votos no 13 e 8.318 no 22.

O que ficou de fora e não muda a conclusão: a linha de base de "chave girada durante a carga" nas cargas que têm a linha final (pedida no parecer 41). Ela diria se 59 em 499 mil é muito ou pouco, mas não mudaria a integridade: a carga foi verificada a cada ligação.

### H23(c). Recargas do 1º turno sem motivo escrito no diário

Regra do doc 08: mesma seção, sem linha ERRO fora as de rotina, carga anterior bem-sucedida, mesma mídia de carga (ou mídia gerada antes da carga anterior), sem votos na sessão anterior.

| Medida | Valor (Fato) |
|---|---:|
| Recargas sem motivo no catálogo do 1º turno | **502** (501 antes de 04/10 e 1 entre os turnos) |
| Zonas | 275 |
| Por UF (as maiores) | SP 132, PA 64, RJ 45, MG 36, BA 32, PR 27, RS 22, CE 20, ES 18; outras 15 UFs e o exterior: 106 |
| Mesmo dia da carga anterior / outro dia | 234 / 268 |
| O que a urna fez antes: carga, teste e abertura do aplicativo de votação / só a carga / outros | 318 / 111 / 73 |
| Geraram o BU do 1º turno | **475** |
| ... e a **mesma carga** gerou também o BU do 2º turno | **463** |

- **Onde se concentram (Fato).** A zona 0094 do PA tem 52 das 502: 52 urnas carregadas em 25/09 (10h às 15h) e recarregadas em 26/09 (9h às 12h) com outra mídia de carga, gerada antes da primeira carga. É um lote da zona inteira refeito no dia seguinte, não urnas isoladas. Depois: PI zona 0017 (12), SP zona 0212 (10), SP zona 0017 (8); as outras 271 zonas têm até 6.
- **A carga do 1º turno vale para os dois turnos.** Em 463 das 475 seções, o BU do 2º turno saiu da mesma carga. Uma recarga antes do 1º turno, portanto, alcança também o 2º turno.
- **Votos (Fato).** Nas 475 seções, do 1º para o 2º turno a parcela do 13 cresceu **0,14 ponto menos** que a da zona; o comparecimento, 0,21 ponto mais. Testes já feitos no doc 08 (declarados antes, correção para 36 testes, limiar p < 0,0014): nível da parcela do 13 contra o mesmo local, +0,45 ponto no 1º turno (p 0,026) e +0,36 no 2º (p 0,074). Nenhum passa da correção.

**O que não se pode afirmar.** Por que essas urnas foram recarregadas. **Dado que falta:** a ata da cerimônia de carga de cada zona (e o edital, no caso de uma cerimônia extra como a da zona 0094 do PA). **Por que não é público:** a ata é documento em papel do cartório eleitoral; não entra nos dados abertos do TSE e só se obtém por pedido ao TRE.

### Efeito máximo e conclusão da H23

| Conjunto | Seções | Votos do 13 no 2º turno | Se todo o efeito medido fosse indevido |
|---|---:|---:|---|
| (a) recarga entre os turnos, sem cédula | 1.565 | — | +499 votantes |
| (b) diários sem a linha final | 64 | 7.467 | o 13 cresceu menos que a zona |
| (c) recarga sem motivo antes do 1º turno | 475 | 65.230 | +0,36 ponto da parcela do 13 no 2º turno ≈ 430 votos (≈ 860 de margem) |
| Recargas sem motivo do 2º turno (doc 08) | 17 | 2.538 | — |

Mesmo no pior caso absurdo (todos os votos do 13 nesses conjuntos indevidos: 65.230 + 7.467 + 2.538 = 75.235), a margem de 4.430.191 não muda de lado. **Não muda o vencedor.**

**Conclusão final H23: sem sinal nos dados públicos.** Toda carga que gerou BU está no diário da própria urna; as assinaturas conferem; os votos das seções marcadas não diferem das vizinhas além do acaso. Fica **não decidível com dados públicos** só o motivo das recargas sem motivo escrito (502 no 1º turno e 23 no 2º): falta a ata da cerimônia de carga, que é papel de cartório e não é publicada.

---

## H24. Trânsito e atributos especiais usados para inflar seções

Com os dados reais, as contas de aptos e de trânsito têm 0 violação nos dois turnos (doc 09, parecer 39). Faltava mostrar que elas acusariam uma alteração.

### Contraprova com BUs alterados de propósito

Sete seções reais do 2º turno, escolhidas por regra fixa antes de rodar: a primeira seção de urna de seção, sem seção agregada, em AC, BA, MG, RS e SP, e, fora essas, a primeira do país com 3 ou mais eleitores em trânsito e a primeira com 2º turno de Governador. São AC 01007/0009/0001, BA 30007/0205/0001, MG 40002/0025/0027, RS 84735/0003/0006, SP 61000/0330/0017, AC 01007/0009/0120 (3 em trânsito) e AC 01007/0009/0003. O bu.dat de cada uma foi lido do pacote e copiado em memória; cada alteração muda bytes da cópia (o arquivo continua legível); nada é gravado em disco. **Controle:** sem alteração, as 7 passam em todas as conferências.

Conferências: **lacre** (o hash SHA-512 do arquivo bate com o lacrado e assinado pela urna; cadeia de hashes dos votos; assinatura do último hash); **V1** aptos = aptos da seção + trânsito, em cada eleição; **V2** comparecimento ≤ aptos; **V3** quem só vota para Presidente (trânsito de outra UF) cabe na diferença de aptos entre as eleições; **V4** total de aptos do país igual nos dois turnos, e o que as seções ganham é o que o trânsito perde; **V5** aptos do BU = eleitorado da seção nos dados abertos do TSE; **soma** votos de Presidente = comparecimento; **diário** votos computados = comparecimento; **RDV** e **oficial** (resultado por seção dos dados abertos) = BU.

Dois níveis de ataque. **A:** o arquivo é alterado depois de sair da urna (cartório, transmissão, totalização). **B:** a alteração é feita dentro da urna, antes da assinatura, e o atacante mantém BU, RDV e diário coerentes; aí só sobram as contas que usam dados de fora da urna (V1 a V5) e a soma.

| Alteração (3 eleitores ou votos) | Lacre (A) | V1 | V2 | V3 | V4 | V5 | Soma | Diário (A) | RDV (A) | Oficial (A) |
|---|---|---|---|---|---|---|---|---|---|---|
| M1 aptos +3 (só o total) | acusa | **acusa** | passa | passa | **acusa** | **acusa** | passa | passa | passa | passa |
| M2 trânsito +3 e aptos +3 (eleitor de fora inventado, sem voto) | acusa | passa | passa | passa | **acusa** | **acusa** | passa | passa | passa | passa |
| M3 aptos da seção +3 e aptos +3 (eleitor próprio inventado, sem voto) | acusa | passa | passa | passa | **acusa** | **acusa** | passa | passa | passa | passa |
| M4 comparecimento +3, sem voto | acusa | passa | passa | passa | passa | passa | **acusa** | acusa | passa | passa |
| M5 comparecimento +3 e 13 +3, só no Presidente (voto no lugar de quem faltou) | acusa | passa | passa | acusa em 3 de 7 | passa | passa | passa | acusa | acusa | acusa |
| M5b o mesmo, também no Governador onde há 2º turno estadual | acusa | passa | passa | passa | passa | passa | passa | acusa | acusa | acusa |
| M6 trânsito +3, aptos +3, comparecimento +3, 13 +3 (eleitor em trânsito inventado que votou) | acusa | passa | passa | passa | **acusa** | **acusa** | passa | acusa | acusa | acusa |
| M7 22 −3 e 13 +3 (troca) | acusa | passa | passa | passa | passa | passa | passa | passa | acusa | acusa |
| M8 trânsito +3 numa seção e −3 em outra, com os aptos (eleitor mudado de seção) | acusa | passa | passa | passa | passa | **acusa** | passa | passa | passa | passa |

Os resultados de V1 a V5 e da soma são os mesmos nos níveis A e B. Os campos de aptos foram mudados em todas as eleições do BU (como faria quem inventa um eleitor). O "acusa em 3 de 7" do M5 são as 3 seções do AC com 2º turno de Governador: pôr votos só no Presidente quebra V3.

**Fato.** Toda alteração de aptos ou de trânsito (M1, M2, M3, M6, M8) é acusada pelas contas, nos dois níveis. A que mais pega é **V5**: o eleitorado de cada seção nos dados abertos é igual aos aptos do BU em 499.207 de 499.207 seções nos dois turnos (doc 09), e qualquer eleitor inventado ou mudado de seção quebra essa igualdade. V4 pega mudança no total; V1 só pega a alteração malfeita.

**Ponto cego (Fato).** As contas de aptos e de trânsito **não** acusam:
1. **voto posto no lugar de quem faltou** (M5b): a seção tem aptos de sobra (todo eleitor que faltou, inclusive o eleitor em trânsito que não apareceu) e o comparecimento continua ≤ aptos. No nível A isso é pego pelo lacre, pelo diário, pelo RDV e pelo oficial; no nível B, por nenhuma conta de contagem. Quem cobre esse caso é o teste da habilitação sem digital e dos votos em bloco (H13, H15);
2. **troca de votos** (M7): não mexe em aptos nem em comparecimento. No nível B, nenhum dado público a acusa (o mesmo ponto cego da H10);
3. **cadastro alterado na origem**: V5 compara o BU com os dados abertos, mas os dois saem do cadastro do TSE. Um eleitor inventado no próprio cadastro usado na carga passaria em V5. **Dado que falta:** o cadastro usado na carga (lista de eleitores por seção). **Por que não é público:** é dado pessoal (nome, título, endereço), protegido pela LGPD.

**Atributos especiais (preso, militar, servidor da Justiça Eleitoral, deficiência visual).** Os dados abertos não trazem esses números por seção, e o diário só registra o atributo quando ele impede o voto. Essa parte é **não decidível com dados públicos**: o atributo é campo do cadastro (dado pessoal).

### Efeito máximo e conclusão da H24

O trânsito do 2º turno inteiro são **584.117** aptos (V4, Fato). Mesmo que todos fossem inventados e todos tivessem votado no 13, a margem de 4.430.191 não muda de lado; e as contas mostram que inventá-los quebraria V5 e V4. O ponto cego (voto no lugar de quem faltou) não é limitado pelas contas de trânsito: ele é limitado só pelo comparecimento ≤ aptos e precisa do teste da H13/H15.

**Conclusão final H24: sem sinal nos dados públicos.** As contas de aptos e de trânsito têm 0 violação com os dados reais e acusaram todas as alterações de aptos ou trânsito feitas de propósito. Ponto cego declarado: voto no lugar de quem faltou e troca de votos (cobertos por H13/H15 e pela integridade do programa) e cadastro alterado na origem. A parte dos atributos especiais é não decidível (não há contagem pública por seção).

---

## O vencedor do 2º turno de Presidente pode mudar por alguma dessas hipóteses?

| Hipótese | Maior efeito que os dados permitem atribuir a ela | Comparado com a margem de 4.430.191 |
|---|---|---|
| H10 (b) | troca 22 → 13 que a conta exige no país sob a rotatividade mínima: 166.584 (margem ≤ 333.168) | 7,5% da margem |
| H17 | eleitores que podem ter ficado sem votar por algo registrado na mesa, mesmo sem descontar quem voltou e contando títulos digitados errado: 2.111.084 (teto nível 3) | 47,7% |
| H23 | todos os votos do 13 nas seções marcadas: 75.235 | 1,7% |
| H24 | todo o trânsito do 2º turno: 584.117 aptos | 13,2% |

**Não.** Nenhuma das quatro, no pior caso que os dados permitem, chega à margem. A ressalva é a mesma nas quatro: troca de votos feita dentro da urna, coerente em todos os arquivos, não tem limite nos dados públicos; ela é questão de integridade do programa, não de contagem.

## Riscos que ficam

- **Ponto cego da contagem** (H10a, H24 M7): troca dentro da urna com BU, RDV e diário coerentes. Não existe registro independente do voto.
- **Rotatividade** (H10b): a divisão entre troca de voto e eleitores diferentes depende da lista de quem votou, dado pessoal.
- **Gesto de pessoa** (H17b, H23): chave girada com voto confirmado (21 no 2º turno) e recargas sem motivo escrito (502 + 23) só se explicam com ata e caderno de votação.
- **Leitura do diário**: as contagens de H17 usam a máquina de estados do estatístico; mensagens novas ou palavras com bit trocado no diário escapam da regra (parecer 32 mediu 12 linhas ilegíveis no 2º turno, todas fora do dia 25/10).
- **V5 não é independente do TSE**: o eleitorado dos dados abertos e os aptos do BU saem do mesmo cadastro.

## Para refazer

```
node --max-old-space-size=6000 scripts/auditoria/matematico-fechamento-h10.mjs        # H10 (a) e (b), ~10 min → fechamento/h10.json
node scripts/auditoria/matematico-fechamento-h17-varrer.mjs --turno 2 --paralelo 2      # H17 (a), todos os diários do 2º turno, ~2 h
node scripts/auditoria/matematico-fechamento-h17-varrer.mjs --turno 1 --paralelo 2      # idem, 1º turno (pacotes do 1º turno)
node scripts/auditoria/matematico-fechamento-h17-analise.mjs                             # junta → fechamento/h17-resumo.json
node --max-old-space-size=4096 scripts/auditoria/matematico-fechamento-h17-retorno.mjs  # H17 (b), ~3 min → fechamento/h17-retorno.json
node --max-old-space-size=6000 scripts/auditoria/matematico-fechamento-h23.mjs         # H23 (a), (b), (c), ~2 min → fechamento/h23.json
node scripts/auditoria/matematico-fechamento-h24-contraprova.mjs                        # H24, ~1 min → fechamento/h24-contraprova.json
node scripts/auditoria/cetico-h10-bu-bruto.mjs am 02755 0022 0070                       # conferência no BU bruto (H10b)
```

Saídas em `data/parsed/auditoria/matematico-forense/fechamento/`. Entradas de trabalhos anteriores: `h23-resultado.json` (doc 08), `cetico-revisor/39-h23.json` (parecer 39), `cetico/h16/<t>t/<uf>.json` (parecer 32), `h24-atributos.jsonl` (doc 09).
