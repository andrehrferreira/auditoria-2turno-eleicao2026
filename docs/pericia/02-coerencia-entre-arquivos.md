# 2. Coerência entre os arquivos de uma mesma urna

## A pergunta

Cada urna grava três registros da mesma votação: o boletim (o placar), o registro dos votos (a lista dos votos, um por um) e o diário da urna (o que aconteceu, com hora). Os três contam a mesma história? E as contas internas de cada um fecham: votos somados = eleitores que votaram, eleitores que votaram ≤ eleitores que podiam votar?

## Resposta curta

**Fato (2º turno, país inteiro, 499.207 seções com boletim):** o boletim e o registro dos votos são iguais em todas as seções e em todos os cargos (539.815 comparações, 0 diferença). As contas internas do boletim fecham em todas as seções que trazem os campos necessários (as exceções de formato estão listadas abaixo). Nenhuma seção tem mais eleitores votando do que eleitores aptos (com revisão independente).

**Fato (dois turnos, com revisão independente):** em todas as seções com urna eletrônica (499.178 no 2º turno e 499.176 no 1º; as do Sistema de Apuração não têm diário de eleitor), o número de votantes do boletim foi comparado com as linhas "O voto do eleitor foi computado" do diário da própria seção. Em nenhuma seção o diário tem mais votos que o boletim. O boletim tem mais votos que o diário em **6 seções do 2º turno (54 votos)** e **9 do 1º turno (159 votos)**:

- em 4 seções do 2º turno (5 votos) e 6 do 1º (7 votos), o diário mostra o atendimento do eleitor, e a urna caiu ou foi desligada antes da última linha;
- em 2 seções do 2º turno (49 votos) e 3 do 1º (152 votos), todas com urna reserva, o diário da urna que gravou os votos não está no pacote publicado. Os arquivos mostram como ele se perdeu: outra urna foi ligada com o cartão de votos da seção e gravou o próprio diário por cima. Os boletins dessas 5 seções estão assinados, e as assinaturas conferem.

**Fato (dois turnos, com revisão independente):** cada pacote foi gerado pela urna que o boletim diz. O número da urna é o mesmo no boletim, no pacote de lacres e na carteira de identidade digital da urna em todas as seções, menos nas que tiveram o boletim regravado por outra urna (3 no 2º turno, 14 no 1º), que têm a explicação no próprio pacote. Nenhum cartão de votação, nenhuma urna e nenhum código de carga aparece no boletim de duas seções do mesmo município ou da mesma zona. No 2º turno, nenhuma urna escreveu no diário de duas seções ao mesmo tempo (seção "Identificação da urna e dos cartões").

**Fato (1º turno, país inteiro):** o boletim e o registro dos votos são iguais em todas as seções e em todos os cargos (2.490.805 comparações, 0 diferença), conferido por uma segunda verificação independente ([tópico 13](13-mesa-e-sessao-do-eleitor.md)).

**Pendente (1º turno):** as demais contas internas do boletim (C3 a C6) ainda não foram refeitas no país inteiro; por ser parcial, o resultado não entra neste relatório. A comparação do diário com o boletim (C2) foi feita no país inteiro (acima), e a do boletim com o resultado oficial, em todos os cargos, está no [tópico 5](05-soma-dos-boletins.md).

O que este resultado **não** prova: que quem votou era de fato o eleitor. Um voto dado por outra pessoa no lugar de um eleitor ausente gera boletim, registro e diário coerentes entre si. Esse ponto fica no tópico 4.

## Os três registros, e por que compará-los

| Registro | O que contém | Quem garante que não foi alterado |
|---|---|---|
| **Boletim de Urna (BU)** | Votos de cada candidato, brancos, nulos; eleitores aptos; quantos votaram; e **como cada eleitor foi liberado** (com digital, sem digital) | Assinatura da urna (tópico 1) |
| **Registro Digital do Voto (RDV)** | Cada voto, um por um, ordenado por tipo de voto e número digitado (não pela ordem de votação), sem identificação do eleitor | Assinatura da urna (tópico 1) |
| **Diário da urna (log)** | Cada evento com data e hora: eleitor liberado, voto confirmado, voto computado, urna reiniciada | Impressão digital e lacre da urna no pacote de lacres (tópico 1) |

Os três saem do mesmo programa, na mesma urna, a partir da mesma votação. Se um voto foi acrescentado ou tirado de um só deles depois, eles deixam de bater. Uma alteração feita igual nos três, ou pelo próprio programa antes de gravar, não aparece nesta comparação (Limites, item 1).

Termos usados abaixo:

- **Eleitor em trânsito (TTE):** eleitor que pediu para votar fora da sua seção de origem. Ele entra na conta de aptos da seção onde vota.
- **Voto nominal / de legenda:** nominal é o voto no número de um candidato; de legenda é o voto só no número do partido (existe nos cargos de deputado).
- **Nulo após suspensão:** quando a votação de um eleitor é interrompida no meio, os cargos que ele ainda não tinha votado são gravados como nulos.
- **Liberação "por biografia":** o eleitor tem digital cadastrada, a digital não foi reconhecida, e ele foi liberado pelos seus dados pessoais, digitados pelo mesário.
- **Liberação "sem biometria cadastrada":** o eleitor não tem digital no arquivo da urna e foi liberado pelo número do título e ano de nascimento.
- **Mídia de votação (MV):** o cartão de memória onde a urna grava os votos. Na troca por urna reserva, ela passa da urna com defeito para a reserva.
- **Mídia externa (ME):** o cartão onde a urna também grava o próprio diário.
- **Sistema de Apuração (SA):** usado quando não há urna funcionando; a junta eleitoral digita o resultado de cédulas de papel.
- **Recuperador de Dados (RED):** programa que um técnico usa para gerar o boletim a partir da mídia de votação de uma urna que não conseguiu gerá-lo.
- **Número de série:** o número de fábrica que identifica cada urna e cada cartão de memória. No boletim, o número do cartão de votação aparece com o nome "FV".
- **Mídia de resultado (MR):** o cartão de memória em que a urna grava o resultado no fim do dia, para levá-lo ao cartório.
- **Mídia de carga (FC) e carga:** a carga é a instalação, antes da eleição, do programa e dos dados da seção na urna. Ela é feita com a mídia de carga, e um mesmo cartão de carga instala várias urnas. Cada instalação recebe um **código de carga** próprio.

## Como foi feito

Seis comparações, rodadas em todas as seções com boletim que trazem os campos de cada uma (as exclusões, com contagem e motivo, estão em "O que ficou de fora"). Todos os números desta página foram refeitos por uma segunda verificação independente, com programas próprios, a partir dos arquivos originais das urnas, ou foram confirmados por uma revisão independente que tentou derrubá-los.

| # | Comparação | Deve dar |
|---|---|---|
| C1 | Boletim × registro dos votos, por cargo: cada número, cada partido, brancos, nulos | igual |
| C2 | Votos computados no diário × quantos votaram, no boletim | igual |
| C3 | Total de votos de cada cargo × quantos votaram | igual (senador no 1º turno: o dobro, porque são 2 vagas) |
| C4 | Aptos × (aptos da seção + aptos em trânsito) | igual |
| C5 | Liberados com digital + por biografia + sem biometria cadastrada × quantos votaram | igual |
| C6 | Quantos votaram na seção × quantos votaram em cada eleição (federal e estadual) | igual |

Mais uma: **comparecimento maior que o número de aptos**, que seria impossível (com revisão independente).

## O que foi encontrado: 2º turno, país inteiro

**Fato.** Os números abaixo foram refeitos por uma segunda verificação independente.

| Comparação | Comparações feitas | Com diferença |
|---|---:|---:|
| C1 boletim × registro dos votos | 539.815 (seção × cargo) | **0** |
| C2 diário × boletim | 499.178 seções | **10** na primeira leitura; **6** depois da recontagem (abaixo) |
| C3 soma dos votos × quantos votaram | 539.420 (seção × cargo com comparecimento no boletim) | **0** |
| C4 aptos = seção + trânsito | 539.817 (seção × eleição; 2 a mais que o C1 porque 2 seções do exterior apuradas em cédula não tiveram nenhum votante: têm aptos, mas nenhum voto) | **0** |
| C5 formas de liberação × quantos votaram | 497.897 | **0** |
| C6 comparecimento da seção × por eleição | 499.178 | **0** |
| Comparecimento > aptos (**com revisão independente**) | 499.207 | **0** |

Detalhes que mostram que a conta foi feita voto a voto:

- **Fato.** Somando todos os cargos do 2º turno (Presidente, Governador e consultas populares), nulos do boletim: 3.180.769. No registro dos votos: 3.180.131 nulos + 638 nulos após suspensão = 3.180.769.
- **Fato.** Brancos: 1.662.313 nos dois. Nominais: 133.698.737 nos dois.

O que ficou de fora de alguma comparação, e por quê:

- **Fato.** 41 seções do exterior não foram instaladas: não há urna nem arquivo (423 aptos no resultado oficial, comparecimento 0).
- **Fato.** 29 seções do exterior usaram o Sistema de Apuração (cédula de papel, 831 votos). Não têm diário de eleitor, então ficam fora do C2. O boletim delas traz 0 no comparecimento da seção (o formato do Sistema de Apuração só preenche o comparecimento de cada eleição), então ficam fora do C6.
- **Fato.** 1.310 seções do exterior não têm o detalhamento de como os eleitores foram liberados, e ficam fora do C5.
- **Fato.** Em 395 seções houve também uma de 3 consultas populares, e o boletim não traz o comparecimento dessas consultas. Os votos delas foram conferidos no C1 (boletim = registro dos votos) e os aptos no C4; ficam fora do C3, que precisa do comparecimento. Por isso o C3 tem 395 comparações a menos que o C1.

### As 10 seções em que o diário não bateu de primeira

Cada diário do pacote da seção foi recontado em separado, no arquivo original, e a recontagem foi refeita por uma segunda verificação. Um voto foi identificado pela urna e pela hora da linha do diário, para não contar duas vezes a cópia do mesmo diário.

**Fato.**

| Seção (UF município/zona/seção) | Urna | Boletim | Diário recontado | O que explica |
|---|---|---:|---:|---|
| SP 64777/0395/0298 | da seção | 268 | 268 | o programa de leitura não abriu o diário; o diário tem 268 |
| BA 39870/0133/0184 | reserva | 228 | 185 + 43 | o diário da urna original estava 2 vezes no pacote |
| MG 40690/0016/0264 | reserva | 114 | 114 | um diário já continha o outro |
| ES 57932/0009/0085 | RED | 308 | 308 | o pacote trouxe também o diário de outra seção (0112), recuperada antes pela mesma máquina; a 0112 tem boletim 304 e diário 304 |
| BA 34711/0021/0178 | da seção | 234 | 233 (+1 confirmado, sem "computado") | voto confirmado e urna reiniciou antes de registrar "computado" |
| PB 21750/0002/0254 | da seção | 304 | 303 (+1 confirmado, sem "computado") | idem |
| PI 11533/0003/0216 | da seção | 259 | 258 (+1 confirmado, sem "computado") | idem |
| **RS 89060/0017/0191** | reserva | 92 | 90 | **2 votos sem a linha "computado":** 1 com o voto confirmado e 1 com o atendimento pela metade (queda da urna) |
| **BA 35653/0173/0235** | reserva | 217 | 204 | **13 votos sem nenhuma linha no diário** |
| **MA 08893/0047/0609** | reserva | 224 | 188 | **36 votos sem nenhuma linha no diário** |

- **Fato.** Sete das dez eram erro de leitura (diário duplicado, diário de outra seção, diário não aberto) ou voto confirmado pouco antes de a urna reiniciar.
- **Fato (com revisão independente).** O 2º turno tem 11.748 seções com mais de um diário no pacote. Fora as 3 seções com urna reserva da tabela (MA, BA 35653 e RS), nas outras 11.745 o boletim bate com os votos computados. A revisão independente cruzou também o boletim com o diário nas 499.178 seções com urna eletrônica, e as únicas seções com voto sem a linha "computado" são as 6 da tabela. As 29 do Sistema de Apuração não têm diário: são cédulas de papel, e o boletim delas traz comparecimento 0 na seção.
- **Fato.** Nas 3 seções de um só diário achadas pelo C2 (BA 34711/0021/0178, PB 21750/0002/0254, PI 11533/0003/0216), o voto confirmado logo antes de a urna reiniciar entrou no boletim. Nas três, o diário mostra a habilitação do eleitor e a confirmação do voto; depois do religamento, a urna responde "O eleitor identificado já votou". **Pendente: em verificação** se há seções em que um voto confirmado antes de a urna cair **não** entrou no boletim, e quantas são. **Hipótese:** depende de a urna ter gravado o voto no cartão antes ou depois da queda. O diário não mostra qual foi.

### Votos do boletim sem rastro completo no diário (dois turnos)

**Fato (com revisão independente, que reconcilia as contagens anteriores).** O texto abaixo segue a afirmação revisada. Em todas as seções com urna eletrônica dos dois turnos, foi comparado o número de eleitores que votaram no boletim com as linhas "O voto do eleitor foi computado" do diário da própria seção. Cada cópia de um diário foi contada uma vez, e o diário de outra seção que veio no pacote foi separado. Nenhum pacote ficou sem diário e nenhum deu erro de leitura.

| | 2º turno | 1º turno |
|---|---:|---:|
| Seções comparadas (todas com urna eletrônica) | 499.178 | 499.176 |
| Seções em que o boletim tem mais votos que o diário | 6 | 9 |
| Votos do boletim sem a linha "computado" no diário | **54** | **159** |
| ... com o atendimento do eleitor no diário, e a urna caiu ou foi desligada antes da última linha | 5 votos em 4 seções | 7 votos em 6 seções |
| ... sem nenhuma linha do eleitor no diário publicado (o diário da urna que gravou os votos não está no pacote) | 49 votos em 2 seções | 152 votos em 3 seções |
| Seções em que o diário tem mais votos que o boletim | 0 | 0 |

Ficaram de fora, nos dois turnos, as 41 seções do exterior sem arquivo e as seções do Sistema de Apuração (cédula de papel), cujo diário não registra eleitores: 29 no 2º turno e 31 no 1º.

**Por que antes havia três números diferentes (50, 54 e 152).** Cada contagem media uma coisa. A de 54 conta todo voto sem a linha "computado". A de 50 conta os 49 sem nenhuma linha e mais 1 voto do RS que só tem a identificação do eleitor. No 1º turno, a contagem de 152 é a dos votos sem nenhuma linha. A revisão independente refez a conta com programa próprio e mostrou também que os métodos anteriores, aplicados ao 1º turno, dariam números errados por defeitos de leitura.

**Seção a seção (Fato).** Formato: UF município/zona/seção.

| Turno | Seção | Boletim | Diário da própria seção | Faltam | O que o diário mostra | O que aconteceu |
|---|---|---:|---:|---:|---|---|
| 2º | MA 08893/0047/0609 | 224 | 188 | 36 | nenhuma linha do eleitor | **Comprovado:** urna de outra seção gravou o próprio diário na mídia antes de ser recusada (erro 72) |
| 2º | BA 35653/0173/0235 | 217 | 204 | 13 | nenhuma linha do eleitor | **Comprovado:** o mesmo mecanismo (erro 72) |
| 2º | RS 89060/0017/0191 | 92 | 90 | 2 | 1 ciclo com o voto confirmado + 1 atendimento pela metade | **Comprovado:** queda da urna; o cartão tinha dados mais novos que a memória interna |
| 2º | BA 34711/0021/0178 | 234 | 233 | 1 | ciclo com o voto confirmado | Urna reiniciou antes da linha "computado"; depois, "O eleitor identificado já votou" |
| 2º | PB 21750/0002/0254 | 304 | 303 | 1 | ciclo com o voto confirmado | Reinício (bateria crítica); depois de 3 religamentos, "já votou" |
| 2º | PI 11533/0003/0216 | 259 | 258 | 1 | ciclo com o voto confirmado | Reinício; depois, "já votou" |
| 1º | BA 39934/0183/0175 | 272 | 136 | 136 | nenhuma linha do eleitor | **Comprovado**, com ressalva: a urna 02423907, da seção 0181, foi ligada com o cartão da 0175 e gravou o próprio diário por cima; aqui não há a linha "erro 72" |
| 1º | SP 71072/0002/0035 | 247 | 232 | 15 | nenhuma linha do eleitor | Perda do diário **comprovada** (erro 72). **Não explicado:** qual urna gravou os 15 votos |
| 1º | RS 89036/0083/0044 | 279 | 278 | 1 | nenhuma linha do eleitor | **Comprovado:** a urna original voltou e gravou o próprio diário por cima do da urna intermediária (erro 17) |
| 1º | ES 56995/0053/0211 | 265 | 264 | 1 | ciclo com os 6 votos confirmados | Reinício antes da linha "computado" |
| 1º | RN 16039/0029/0028 | 242 | 241 | 1 | ciclo com os 6 votos confirmados | Reinício; depois, "já votou" |
| 1º | SP 63614/0227/0305 | 290 | 289 | 1 | ciclo com os 6 votos confirmados | Reinício (bateria crítica) |
| 1º | SP 64254/0291/0346 | 278 | 277 | 1 | ciclo com os 6 votos confirmados | Reinício; depois, "já votou" |
| 1º | SP 71072/0260/0037 | 285 | 284 | 1 | ciclo com os 6 votos confirmados | Desligada pela chave; depois, "já votou" |
| 1º | RJ 58971/0087/0184 | 258 | 256 | 2 | 12 atendimentos interrompidos por reinícios, nenhum com o Presidente confirmado | **Não explicado voto a voto:** não dá para dizer quais 2 dos 12 atendimentos viraram voto |

"6 votos confirmados" são as 6 escolhas do 1º turno (5 cargos; o de senador tem 2 vagas). "Já votou" é a resposta da urna quando o mesmo título é identificado de novo. O diário não diz se é a mesma pessoa.

**Como o diário se perdeu nas 5 seções sem nenhuma linha (Fato).** Nas 5, outra urna foi ligada com o cartão de votos (mídia de votação) da seção e gravou o próprio diário na mídia externa, por cima do anterior. Depois ela foi recusada ou parou sem votar. A urna reserva seguinte empacotou o diário que ficou, e não o da urna que tinha recebido os votos. A ordem foi esta:

1. a urna nova começa a gravar o próprio diário na mídia externa;
2. só depois confere o cartão de votos e o recusa: "erro 72" (os dados do cartão não correspondem à urna) ou "erro 17" (os dados do cartão não correspondem à memória interna);
3. a urna reserva seguinte copia da mídia externa o diário que ficou lá.

- **MA 0609 (2º turno).** Os 36 votos foram gravados pela urna original da seção (nº 01663580), que abriu às 08:00:01. O cartão foi posto na urna 01813459, preparada para a seção 0445. Ela gravou o diário na mídia e foi **bloqueada** pelo erro 72, duas vezes (10:29:43 e 10:35:21), sem gravar votos. A urna reserva 01664037 registrou depois 188 votos.
- **BA 0235 (2º turno).** Os 13 votos foram gravados pela urna 01681986, entre a abertura (08:48:54) e as 09:50. O pacote traz o arquivo que ela gravou às 08:41:39 ao receber o cartão da seção, o que prova que ela operou esse cartão. A urna original 01833178, recarregada no dia com a preparação da seção 0083, foi ligada com o cartão às 09:50, gravou o diário na mídia às 09:52:45 e recebeu o erro 72 às 09:54:07. A urna reserva 01656557 registrou depois 204 votos.
- **BA 0175 (1º turno).** A urna original da seção é a 02424441; o diário dela no pacote só começa às 13:23:37. Às 13:19:03, a urna 02423907, preparada para a seção 0181 e já substituída lá às 12:25, foi ligada com o cartão da 0175, gravou o próprio diário na mídia às 13:20:06 e parou às 13:20:46, sem abrir a votação. O diário dela, com 100 votos da seção 0181, é o que ficou na mídia; por isso aparece nos pacotes das duas seções. A urna reserva 02429118 deu mais 112 votos: 136 + 24 + 112 = 272. **Ressalva:** que a 02423907 foi recusada se apoia na falta de votação e de carga dela no histórico do boletim, não numa linha de erro.
- **SP 0035 (1º turno).** O boletim abre às 09:34:17. A urna 02254720, preparada para a seção, só aparece no dia das 10:17:39 às 10:52: foi ligada com o cartão usado na seção nesse dia (9F62BC72), diferente do que ela tinha registrado na preparação, gravou o diário na mídia às 10:18:41 e recebeu o erro 72 às 10:19:32. A urna reserva 02253783 deu 232 votos. Os 15 votos das 09:34 às 10:18 foram gravados por uma urna cujo diário não está no pacote, e nenhum dos 878 pacotes da zona 0002 nos dois turnos cita esse cartão. O histórico de cargas do boletim só tem o código da 02254720 e o da reserva, mas o diário da 02254720 não tem nenhuma linha no dia antes das 10:17: essa contradição não foi explicada. **Pendente:** qual urna gravou esses 15 votos.
- **RS 0044 (1º turno).** A urna original 01801772 votou 90 vezes e foi desligada às 11:04:26. A urna 01675257 recebeu o cartão às 11:11:50 (o arquivo que ela gravou nesse momento está no pacote). Que ela gravou votos no cartão é Hipótese forte: o histórico de cargas do boletim tem um código do meio, entre o da urna original e o da reserva. Às 11:40 a urna original foi religada com o mesmo cartão, gravou o próprio diário na mídia às 11:42:39 e recebeu o erro 17 às 11:44:13. A urna reserva 01651842 empacotou só o diário da 01801772; o da 01675257 (de 11:11 a 11:41) se perdeu.
- **RS 0191 (2º turno, outro mecanismo).** O diário da urna original está no pacote. Ele para às 09:02:34, no meio do atendimento de um eleitor, sem desligamento, e volta às 09:38:59. Às 09:40:20 a urna restaurou o estado a partir do cartão de votos, que tinha dados mais novos que a memória interna. Às 09:42 um eleitor é habilitado e confirma o Presidente, e o diário termina aí. O boletim tem 2 votos a mais.

**Assinaturas (Fato).** Os pacotes das 5 seções sem nenhuma linha foram conferidos: 0 falha. No 1º turno, BA 0175 e SP 0035 passam direto, e RS 0044 passa depois de cortar 1 byte zero que sobra no campo do certificado (defeito da ferramenta de leitura, não do arquivo; [tópico 1](01-integridade-e-estrutura-dos-arquivos.md)). O pacote assinado é o da urna reserva: a assinatura prova que boletim, registro dos votos e diário não mudaram depois dela. Não diz nada sobre o diário que nunca entrou no pacote. A lista assinada tem um só arquivo de diário, e o lacre dele confere: nada foi retirado do pacote depois da assinatura.

**Como esses eleitores foram liberados, pelos contadores do boletim (Fato).** A conta é: total do boletim menos o que o diário da própria seção mostra. Nas seções com ciclo no diário, o boletim não diz qual atendimento virou voto, e a conta não se aplica.

| Turno | Seção | Votos sem nenhuma linha | Com digital | Por biografia (digital não reconhecida) | Sem biometria cadastrada |
|---|---|---:|---:|---:|---:|
| 2º | MA 08893/0047/0609 | 36 | 32 | 4 | 0 |
| 2º | BA 35653/0173/0235 | 13 | 1 | **12** | 0 |
| 1º | BA 39934/0183/0175 | 136 | 117 | 7 | 12 |
| 1º | SP 71072/0002/0035 | 15 | 13 | 2 | 0 |
| 1º | RS 89036/0083/0044 | 1 | 1 | 0 | 0 |
| | **Total** | **201** | **164** | **25** | **12** |

No 2º turno, 33 dos 49 foram liberados por digital; no 1º, 131 dos 152. Contador do boletim não é linha de diário: ele diz a forma de liberação, não quem foi liberado.

**BA 0235, liberação.** 12 dos 13 votos sem diário foram liberados por biografia, sem digital do eleitor. Nos 204 votos com diário da mesma seção, essa forma de liberação foi 10,3% (21 de 204). Essa comparação **não** mede raridade, porque a liberação por biografia se concentra por urna. **Pendente:** ainda não foi medido de forma reproduzível no universo completo com que frequência esse padrão aparece nas urnas substituídas do país e no modelo da urna 01681986. A estimativa feita até aqui é estatística e fica fora deste relatório. Por ora, não é evidência nem a favor nem contra.

Duas leituras do risco:

- **Hipótese (risco, princípio 8).** Na janela sem diário dessas 5 seções (201 votos), não dá para descartar votos lançados por quem não era o eleitor. Os arquivos públicos não provam, voto a voto, que esses votos vieram de eleitores. Isso não se testa com arquivos públicos.
- **Contra essa hipótese há só rastros agregados.** Os contadores do boletim (acima) e, na BA 0235, o tamanho assinado do arquivo de digitais capturadas, que cresceu nessa janela: isso indica capturas no leitor, mas não de quem. O número de capturas só pode ser estimado pelo tamanho do arquivo, e essa estimativa fica fora deste relatório.

**Fato.** Nos dois turnos, nenhuma outra seção tem voto do boletim sem a linha "computado" no diário. Os votos do boletim sem essa linha somam 54 no 2º turno e 159 no 1º; os sem nenhuma linha do eleitor, 49 e 152. É o que o diário deixa de confirmar; não é um limite para outros tipos de falha.

**Risco (procedimento humano).** Tirar o cartão de uma urna e pôr em outra, e recarregar uma urna no dia da eleição, são feitos por pessoas (mesário, técnico). Esta perícia não conta "o mesário seguiu o procedimento" como controle. O que existe de controle técnico (boletim = registro dos votos, assinaturas, contadores de liberação, e os erros 72 e 17, que bloquearam as urnas com outro cartão em 4 dos 5 casos; na BA 0175 não há linha de erro, e a recusa é inferida) fecha também nessas seções. O que falta é o rastro linha a linha de 49 votos no 2º turno e 152 no 1º. Nos 5 casos, a urna grava o próprio diário na mídia externa **antes** de conferir o cartão, e isso apaga a trilha da urna anterior. **Pendente:** conferir na documentação do TSE se esse é o comportamento previsto.

**Fato.** No 2º turno, 5.714 seções usaram urna reserva. As 2 seções com votos sem nenhuma linha no diário (MA e BA) e a RS 89060/0017/0191 estão entre elas.

## O que foi encontrado: 1º turno (parcial)

**Pendente.** O 1º turno ainda não foi conferido no país inteiro, salvo o C2. As comparações C1 e C3 a C6 foram feitas só em parte das UFs, e os números parciais ficam fora deste relatório. Desde 29/10/2026 (10h50 UTC), a base de dados desta perícia já tem os boletins, os registros dos votos e os diários do 1º turno nas 28 UFs; a conta ainda não foi refeita.

### Números de candidato que faltam no resultado por município

**Fato (1º turno, 28 UFs, com revisão independente).** O arquivo oficial do TSE com a votação por candidato, município e zona não tem linha para 250 números de candidato que receberam 628.629 votos nas urnas. A divulgação oficial omite os mesmos 250 números e conta esses votos como nulo técnico. Detalhes, por estado e cargo, no [tópico 5](05-soma-dos-boletins.md). **Hipótese:** são candidaturas excluídas (registro negado, cancelado ou renunciado). **Pendente:** a situação de cada uma; no cadastro oficial de candidaturas publicado pelo TSE, o campo da situação vem com "#NE" em todas as linhas.
- **Fato.** No 2º turno não há números ausentes: Presidente e Governador batem por município e zona (12.584 e 1.026 pares, 0 diferença).

## Comparecimento alto (com revisão independente)

A revisão independente sustentou estes pontos com ressalvas. O texto abaixo segue a afirmação revisada.

- **Fato.** No 2º turno, das 499.207 seções, **nenhuma** tem comparecimento acima dos aptos. 639 têm comparecimento de 95% ou mais e 12 chegam a 100%.
- **Fato.** Das 639, 388 têm menos de 200 aptos e 251 têm 200 ou mais. **Pendente:** quantas seções com 95% ou mais seriam esperadas, dada a variação do comparecimento entre seções da mesma zona. O número esperado depende do modelo estatístico usado, e por isso fica fora deste relatório.
- **Hipótese.** A causa do excesso nas seções pequenas (eleitores em trânsito, seções redistribuídas, seções novas) não foi testada.
- **Fato.** Nessas 639 seções, 8.236 dos 108.628 eleitores com digital cadastrada (7,58%) foram liberados por biografia (digital não reconhecida). **Pendente:** a comparação com a taxa esperada pela própria zona, e o limite que ela daria para votos no lugar de ausentes, dependem de modelo estatístico e ficam fora deste relatório. **Não** testa fraude concentrada em poucas seções, fraude pelo ano de nascimento nem fraude que não passa pela digital.
- **Fato.** Um filtro inicial aponta 23 seções: comparecimento de 95% ou mais e liberação sem biometria acima da zona, com p binomial < 0,001. **Pendente:** quantas continuam apontadas quando o cálculo leva em conta a variação real entre seções. A resposta depende de modelo estatístico e fica fora deste relatório. A análise desse ponto continua no tópico 4.

## Identificação da urna e dos cartões (dois turnos)

A pergunta aqui é outra: o pacote de cada seção foi gerado pela urna que o boletim diz, com os cartões que o diário diz? E algum cartão ou alguma urna aparece em duas seções, o que indicaria um cartão usado em mais de uma urna ou um resultado trocado no caminho?

Todos os pontos abaixo passaram por revisão independente, e o texto segue as afirmações revisadas.

### Número da urna: boletim × pacote de lacres × carteira digital

**Fato (recontado com programa próprio na revisão independente).** O número da urna que está na carteira de identidade digital é igual ao número no pacote de lacres e ao número no boletim em:

| Turno | Seções | Iguais | Diferentes |
|---|---:|---:|---:|
| 2º | 499.207 | 499.204 | 3 |
| 1º | 499.207 | 499.193 | 14 |

As diferenças são todas boletins regravados no cartório por outra urna, com o Recuperador de Dados (abaixo).

**Pendente.** As demais conferências desse teste (cartão de votação do boletim × cartão lido no diário, modelo da urna, mídia de carga e código de carga) já foram feitas. A revisão independente conferiu que elas somam todas as seções, mas não as recontou com programa próprio. Por isso os números delas não entram aqui.

### Boletim regravado por outra urna (Recuperador de Dados)

**Fato.**

- No 2º turno, 16 seções tiveram o boletim gerado pelo Recuperador de Dados (no 1º turno, 50). Em 15 das 16, os votos anotados nos diários do pacote somam o comparecimento do boletim. A exceção é ES 57932/0009/0085, cujo pacote traz também o diário de outra seção (tabela das 10 seções do C2, acima).
- Em 14 seções do 1º turno e 3 do 2º, o boletim foi regravado no cartório por **outra urna**. Nas 17, o boletim guarda o código de carga da urna original da seção, o mesmo que aparece no diário dessa urna, e os votos registrados por ela batem com o boletim.

As 17 seções:

| Turno | Seção (UF município/zona/seção) | Urna do boletim (a original) | Urna que regravou |
|---|---|---|---|
| 2º | ES 57932/0009/0085 | 1841837 | 1758779 |
| 2º | RJ 58696/0027/0139 | 2179194 | 2189420 |
| 2º | SP 64777/0393/0312 | 2396114 | 2399743 |
| 1º | AL 27057/0022/0581 | 2073355 | 2072552 |
| 1º | BA 38857/0108/0148 | 1768711 | 1672673 |
| 1º | ES 56472/0024/0100 | 1840092 | 1771857 |
| 1º | ES 56995/0053/0028 | 1677012 | 1656698 |
| 1º | ES 57053/0001/0046 | 2036425 | 2353044 |
| 1º | ES 57053/0001/0413 | 2036420 | 2036277 |
| 1º | MS 91570/0031/0007 | 2150794 | 2152596 |
| 1º | PR 75280/0133/0034 | 2081583 | 2077196 |
| 1º | PR 76236/0093/0083 | 2060632 | 2056331 |
| 1º | RN 18813/0009/0144 | 2348402 | 2052038 |
| 1º | SE 31054/0001/0346 | 1751434 | 1791133 |
| 1º | SE 32417/0022/0133 | 2044616 | 2273651 |
| 1º | SP 71072/0418/0073 | 2001951 | 2276282 |
| 1º | SP 71072/0418/0418 | 2087618 | 2403160 |

Em 3 delas (ES 56995/0053/0028, PR 75280/0133/0034 e SP 71072/0418/0073), a urna que regravou tinha sido preparada com o mesmo cartão de carga da original, porque um cartão de carga prepara várias urnas. Mesmo nelas, o código de carga, que é próprio de cada instalação, é o da urna original.

**Risco (princípio 8).** Nessas 17 seções, a assinatura pública é da urna que regravou o boletim, não da que recebeu os votos. A ligação com a urna original está no código de carga do boletim e no diário dela, que vêm dentro do pacote assinado pela urna que regravou. Com os arquivos públicos, não dá para testar se o cartão lido no cartório é o da urna original. O que dá para testar foi testado: os votos do diário da urna original batem com o boletim.

### Cartão de votação, urna e código de carga repetidos entre seções

**Fato.** Nenhum cartão de votação, nenhuma urna e nenhum código de carga aparece no boletim de duas seções do mesmo município ou da mesma zona, em nenhum dos turnos.

| | 2º turno | 1º turno |
|---|---|---|
| Seções com urna (sem as do Sistema de Apuração) | 499.178 | 499.176 |
| Número da urna repetido em outra seção | 0 | 0 |
| Código de carga repetido em outra seção | 0 | 0 |
| Pares de seções com o mesmo número de cartão de votação | 29, nenhum no mesmo município | 30, nenhum no mesmo município |
| Grupo de 3 ou mais seções com o mesmo número de cartão | nenhum | 1 grupo de 5 com o número `00000000` (abaixo) |

- O número do cartão de votação tem 8 dígitos hexadecimais (algarismos de 0 a 9 e letras de A a F), o que dá 4.294.967.296 valores possíveis. Entre centenas de milhares de cartões, alguns números se repetem por acaso, em lugares distantes, pelo mesmo motivo por que duas pessoas numa sala costumam fazer aniversário no mesmo dia. A quantidade de pares encontrada é a que o acaso prevê para números desse tamanho; a conta foi conferida na revisão independente. Um cartão usado em mais de uma urna apareceria como repetição acima do que o acaso prevê, ou como repetição no mesmo município ou na mesma zona; nenhuma das duas aparece. Isso não exclui um uso que caia, por coincidência, dentro do que o acaso prevê.
- **1º turno, o número `00000000`:** são 5 seções em que o boletim não traz número de cartão. Em 4, o boletim foi regravado pelo Recuperador de Dados sem cartão, a partir da memória interna da urna. Na quinta (MS 90999/0022/0043), o cartão de votação foi trocado na manhã da votação, antes de a urna ficar pronta, e o boletim saiu sem o número; o diário registra o cartão novo.
- **Entre os turnos:** 60 números de cartão do 1º turno aparecem em outra seção no 2º turno: 59 em lugares diferentes e o `00000000` de uma regravação sem cartão em MG. Nenhum no mesmo município, nenhum na mesma zona.

![Cartões de votação com o mesmo número: encontrado × previsto pelo acaso](graficos/seriais-cartao-votacao-observado-esperado.svg)

**Como ler:** para cada comparação, a barra azul é o número de pares de seções com o mesmo número de cartão que foram encontrados, e a laranja é o número de pares que o acaso prevê. A previsão é uma conta de probabilidade, sem nenhum dado estimado: quantos pares iguais se esperam quando se sorteiam, ao acaso, tantos números de 8 dígitos hexadecimais quantos são os cartões (para o 2º turno, 499.177 × 499.176 ÷ 2 ÷ 4.294.967.296, que dá 29,01 arredondado; 499.177 cartões porque, das 499.178 seções com urna, 1 boletim de MG regravado sem cartão traz o número `00000000`, que não é número de cartão). A revisão independente testou se os números dos cartões se comportam como sorteados ao acaso, e eles se comportam. Barras do mesmo tamanho querem dizer: não há mais repetição do que o acaso explica. Na comparação entre os turnos, o `00000000` de MG fica fora da barra, por não ser um número de cartão.

A lista dos 29 pares do 2º turno, com as duas seções de cada par, e os dados do gráfico estão no índice técnico. Exemplo: o cartão `4F7E1079` aparece em AL 28193/0019/0243 e em ES 57037/0057/0107.

### Mídia de resultado: o número não identifica o cartão

**Fato.** O número de série da mídia de resultado não identifica o cartão.

- Ele está anotado no diário, não no boletim. Das 499.178 seções com urna do 2º turno, 499.055 registram no diário a leitura da mídia de resultado na véspera ou no dia da votação.
- Em **1.566 seções** o número é o mesmo para vários cartões gerados de uma vez, num mesmo computador e no mesmo horário: 7 grupos, com 1.266 seções no exterior, 289 no RJ, 9 no AP e 2 no DF.
- Em outros **30 pares** de seções, o número se repete entre cartões gerados em momentos diferentes.
- Isso não afeta o resultado. O número da mídia de resultado não entra no boletim, e o resultado publicado é o assinado pela urna ([tópico 1](01-integridade-e-estrutura-dos-arquivos.md)). Mas o número não serve para provar qual cartão foi usado.
- **Hipótese:** em alguns computadores que preparam esses cartões, o número de série é gerado de um jeito pouco variado (por exemplo, a partir do relógio). Os mesmos computadores aparecem em mais de um dos 30 pares.

### A mesma urna em duas seções

O pacote de uma seção pode trazer, além do diário da urna que votou, o diário de outra urna: a urna original que foi substituída por uma reserva, ou a mesma urna antes de uma nova carga. Contando esses diários guardados, uma urna pode aparecer em mais de uma seção. O caso típico é a urna substituída numa seção e reaproveitada em outra depois de nova carga.

**Fato (conferido no diário original).** No 2º turno, 360 urnas aparecem em duas seções ou mais, contando os diários guardados. **Nenhuma urna escreveu no diário de duas seções ao mesmo tempo.** Os 92 casos em que os períodos pareciam se cruzar se explicam no próprio arquivo:

| Explicação, conferida no diário original | Urnas |
|---|---:|
| O mesmo diário copiado em dois pacotes | 87 |
| Relógio da urna acertado na carga: as linhas anteriores ao acerto têm a data errada do relógio interno | 2 |
| Urna que escreveu só no fim do diário de outra urna | 2 |
| Uma linha com o número da urna corrompido | 1 |
| Escrita em duas seções ao mesmo tempo | **0** |

### Troca de urna e carga no dia da votação

**Fato.**

- No 2º turno, **5.714 seções** votaram com urna reserva. Em 2.818 delas a reserva entrou depois do 1º turno. Em 2.893 a reserva já vinha do 1º turno. Em 3, a própria urna da seção foi recarregada como reserva. No 1º turno, 3.033 boletins registram urna reserva (sem contar o tipo raro de reserva que só encerra a seção).
- Entre o 1º e o 2º turno, a urna mais antiga (modelo 2013) foi substituída por reserva em 34,9 de cada mil seções, e a mais nova (modelo 2022) em 2,7 de cada mil. Contagens nas 499.176 seções com urna nos dois turnos, pelo modelo da urna do 1º turno (a última coluna é arredondada):

  | Modelo da urna no 1º turno | Seções | Trocadas por reserva no 2º turno | Por mil seções |
  |---|---:|---:|---:|
  | 2013 | 11.921 | 416 | 34,90 |
  | 2015 | 88.035 | 894 | 10,16 |
  | 2020 | 200.463 | 970 | 4,84 |
  | 2022 | 198.757 | 538 | 2,71 |

  ![Urnas trocadas por reserva entre o 1º e o 2º turno, por modelo](graficos/troca-urna-por-modelo.svg)

  **Como ler:** cada barra é um modelo de urna (o que a seção usou no 1º turno), e o comprimento é quantas seções, a cada mil, passaram a votar com outra urna, de reserva, no 2º turno. Quanto mais antigo o modelo, mais longa a barra: a taxa de troca da urna de 2013 foi 12,9 vezes a da urna de 2022.

- Em **5 seções** do 2º turno (MS 90514/0008/0486, MS 91650/0051/0044, PR 74918/0056/0037, PR 75833/0043/0397 e SP 61816/0016/0436), a urna foi carregada na manhã da própria votação, e a votação abriu atrasada. Isso foi conferido por dois caminhos: pelo diário e pela data da carga anotada no boletim. Nas 5, a conferência das assinaturas da carga está registrada com sucesso. A carga em si é feita por pessoas, fora da vista da mesa. Além delas, na BA 35653/0173/0235, a urna original foi recarregada no dia com a preparação de outra seção (seção "Votos do boletim sem rastro completo no diário", acima).
- No 1º turno, 7 boletins vieram de urna carregada no próprio dia da votação: 4 urnas de seção (MG 48852/0190/0107, PR 75353/0003/0495, SC 83194/0027/0056 e SC 83194/0027/0057) e 3 reservas (BA 33197/0036/0003, SC 83518/0046/0038 e SC 83518/0046/0113). Nas 7, a hora digitada e o relógio interno da urna coincidem, e a carga terminou com sucesso. Nas 2 reservas de SC, a abertura gravada é a da urna original, e a reserva continuou a votação já aberta.
- Além desses 7, 3 reservas foram carregadas durante a votação do 1º turno, em 04/10 (MT 91677/0020/0419, às 08:03; MT 91677/0020/0669, às 09:51; RS 85090/0144/0063, às 10:30). Não geraram boletim no 1º turno, em nenhuma seção, e foram usadas como reserva dessas seções só no 2º turno. Nas 3, o relógio interno fica a menos de 1 minuto da hora digitada, e a carga terminou com sucesso ([tópico 11](11-urnas-reserva.md), item 7). A carga no dia, nos dois turnos, foi conferida por uma segunda verificação independente, que leu de novo todos os pacotes dos dois turnos ([tópico 14](14-outras-formas-de-fraude.md), item 4).
- **Pendente:** a concentração de trocas de urna em algumas zonas é teste estatístico e fica fora deste relatório. O ponto que resiste às duas formas de cálculo usadas na revisão independente são as zonas 1 e 2 de Aracaju (SE). Para elas, é preciso pedir ao TRE-SE os registros de troca de urna. Anomalia estatística não é prova: indica onde pedir as atas.

**Risco (princípio 8).** Trocar a urna, passar o cartão de votação de uma urna para outra e carregar uma urna no dia são feitos por pessoas. O que existe de controle técnico com rastro (assinaturas, código de carga, diários guardados no pacote) fecha nesses casos. Os motivos de cada troca não estão nos arquivos públicos.

## Prova de que o teste funciona (contraprova)

- **Fato.** A comparação diário × boletim (C2) apontou 10 seções. A recontagem achou em cada uma a causa: erros do próprio programa de leitura (diário não aberto, diário contado duas vezes, diário de outra seção) e votos de fato sem rastro. Ou seja, o teste é capaz de acusar diferença, inclusive diferenças que vinham de erro nosso.
- **Fato.** A recontagem da revisão independente procurou o erro nos dois sentidos. Ela achou 1 voto sem rastro que o método anterior escondia (RS 89036/0083/0044, 1º turno: cópias do mesmo diário somadas davam mais votos no diário que no boletim) e corrigiu a BA 39934/0183/0175 de 36 para 136 votos (o diário de outra seção, que veio no pacote, era somado ao da própria). Depois de tirar cópias e diários de outra seção, nenhuma seção do país tem mais votos no diário que no boletim.
- **Pendente.** Não há ainda um teste automático que altere de propósito um boletim ou um registro de votos e mostre que C1 a C6 acusam a alteração, como existe para os lacres (tópico 1) e para a soma dos boletins (tópico 5).
- **Fato.** Os testes de identificação também acusam quando há diferença: o número da urna diferiu em 3 seções do 2º turno e 14 do 1º, e a comparação de períodos apontou 92 urnas. Cada caso foi aberto no arquivo original e explicado (Recuperador de Dados, diário copiado, relógio, diário de outra urna, linha corrompida). Na primeira versão, 4 desses casos estavam rotulados como "relógio"; no diário original, 2 eram relógio e 2 eram urna que só escreveu no fim do diário de outra. O texto acima já traz a forma corrigida.

## Limites

1. **Coerência não é legitimidade.** Os três registros saem do mesmo programa. Um voto dado por outra pessoa no lugar do eleitor fica coerente nos três. A única defesa técnica com rastro é a digital do eleitor (tópico 4).
2. **Lacres.** No 2º turno, os lacres conferem em todas as 499.207 seções com urna; no 1º turno, também nas 499.207, com um boletim impresso de MG publicado fora da lista lacrada ([tópico 1](01-integridade-e-estrutura-dos-arquivos.md)). Nas 5 seções com votos sem nenhuma linha no diário (2 do 2º turno e 3 do 1º), as assinaturas foram conferidas na revisão independente (0 falha). Além disso, o diário não traz a corrente de elos lacrada que o boletim tem: ele é protegido só pelo lacre do arquivo inteiro.
3. **Os votos sem nenhuma linha no diário (49 no 2º turno e 152 no 1º) só se esclarecem com dados que não são públicos:** o diário interno das urnas que gravaram esses votos, os arquivos de digitais capturadas dessas seções e a ata da mesa.
4. **1º turno:** o diário × boletim (C2) foi conferido no país inteiro; C1 e C3 a C6 continuam Pendentes.
5. **Pendente.** Uma segunda conferência independente da corrente de elos do boletim e do ciclo de cada eleitor no diário ainda não tem resultado escrito.
6. **Números de série são gravados pelo próprio programa da urna.** A coerência entre eles mostra que o boletim, a lista lacrada e a carteira de identidade digital apontam para a mesma urna; os diários de outras urnas guardados em alguns pacotes têm explicação no próprio arquivo. Que nada mudou depois da assinatura é o que as assinaturas mostram (tópico 1). Não mostra que o programa não poderia gravar outro número. O caminho da urna até a totalização é coberto pelas assinaturas (tópico 1); os registros de transmissão só são entregues a entidades fiscalizadoras.

## Próximos passos

- [x] Revisão independente da primeira contagem de votos sem diário (50 votos; sustentada com ressalvas).
- [x] Reconciliação das contagens de votos sem rastro no diário, nos dois turnos, universo completo.
- [x] Revisão independente dos números de candidato ausentes do resultado por município, 1º turno ([tópico 5](05-soma-dos-boletins.md)).
- [ ] **Pendente.** Pedir, pela via de fiscalização, o diário interno das urnas que gravaram os votos sem diário (2º turno: MA 08893/0047/0609, urna 01663580; BA 35653/0173/0235, urna 01681986. 1º turno: BA 39934/0183/0175, urna 02424441; RS 89036/0083/0044, urna 01675257; e a urna que abriu a SP 71072/0002/0035 às 09:34:17), o diário interno guardado pela urna 01833178 na recarga em campo, os arquivos de digitais capturadas dessas seções e a ata da mesa.
- [ ] **Pendente.** Identificar a urna que gravou os 15 votos da SP 71072/0002/0035 (1º turno) antes das 10:18.
- [ ] **Pendente.** Conferir na documentação do TSE se a urna deve gravar o próprio diário na mídia externa antes de conferir o cartão de votos (erros 72 e 17).
- [ ] **Pendente.** Comparar a votação dessas 3 seções com a do 1º turno.
- [ ] **Pendente.** Confirmar a situação dos números ausentes (o cadastro oficial de candidaturas traz "#NE" na situação).
- [ ] **Pendente.** Refazer o 1º turno (C1 e C3 a C6) com as 14 UFs restantes e o exterior (os dados das 28 UFs já estão na base desta perícia desde 29/10/2026). O C2 do 1º turno já foi feito no país inteiro.
- [ ] **Pendente.** Medir no país inteiro quantos votos confirmados antes de reinício da urna entraram ou não no boletim (inclusive nas seções com um só diário).
- [ ] **Pendente.** Teste automático com boletim e registro alterados de propósito (contraprova de C1 a C6).
- [x] Identificação da urna e dos cartões nos dois turnos, com revisão independente.
- [ ] **Pendente.** Recontar com programa próprio as demais conferências de identificação (cartão de votação, modelo, mídia e código de carga).
- [x] Carga no dia da votação no 1º turno (7 boletins, mais 3 reservas carregadas em 04/10 e usadas só no 2º turno), com segunda verificação independente.
- [ ] **Pendente.** Pedir ao TRE-SE os registros de troca de urna das zonas 1 e 2 de Aracaju, e aos TREs do RJ e do AP e ao TSE (exterior) o procedimento de geração das mídias de resultado.
