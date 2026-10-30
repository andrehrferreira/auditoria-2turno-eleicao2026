# 8. A virada do 2º turno: o que os números oficiais mostram

> **Regra deste tópico:** só entram números conferidos no universo completo e reproduzidos de forma independente, por uma segunda verificação independente ou por duas contas que batem. O que ainda não cumpre essa regra está em "Pendente", **sem número**. As análises em andamento ficam nos documentos de trabalho da auditoria, fora deste relatório. Revisado em 29/10/2026.

## A pergunta

No 1º turno (4/10/2026), Flávio Bolsonaro teve 2.224.965 votos a mais que Lula. No 2º turno (25/10/2026), Lula venceu por 4.430.191. Os números oficiais mostram alguma impossibilidade nessa virada?

## Resposta curta

- **Fato:** o ganho dos dois finalistas no 2º turno fecha exatamente com o que estava disponível no 1º (14.098.232 votos).
- **Fato:** nos dois turnos, em todas as seções com voto para presidente (499.206 no 1º turno e 499.205 no 2º), a urna registrou exatamente tantos votos para presidente quantos eleitores votaram.
- **Fato:** nos dois turnos, a soma dos boletins de todas as urnas é igual ao resultado oficial, candidato por candidato.
- **Fato:** em 499.194 das 499.205 seções, os números não exigem que nenhum eleitor tenha trocado um finalista pelo outro. Nas outras 11, a troca mínima exigida soma 20 eleitores para Lula e 24 para Flávio.
- **Pendente:** os testes que procuram troca de votos dentro da urna, voto no lugar de eleitor ausente e padrão técnico ainda estão em revisão e não entram aqui.
- **Este tópico não afirma que não houve fraude.** Ele mostra só o que está conferido.

## 1. Os números oficiais da virada (Fato)

Fonte: dados abertos oficiais do TSE (os arquivos "detalhe da votação por seção", `detalhe_votacao_secao`, e "votação por candidato, município e zona", `votacao_candidato_munzona`).

Nos **dois turnos**, os votos de presidente foram conferidos também pela soma dos boletins de urna:
- **1º turno:** igual ao resultado oficial por seção (arquivo do TSE "votação por seção", `votacao_secao`), em todas as 3.800.511 combinações de seção e candidato, inclusive brancos e nulos, nas 499.206 seções;
- **2º turno:** igual nas 499.205 seções ([tópico 5](05-soma-dos-boletins.md)).

| | 1º turno | 2º turno | Diferença |
|---|---|---|---|
| Eleitores aptos | 158.745.502 | 158.745.502 | 0 |
| Compareceram | 125.275.835 | 128.236.074 | +2.960.239 |
| Brancos | 2.300.798 | 1.430.496 | −870.302 |
| Nulos | 3.669.003 | 2.723.305 | −945.698 |
| Lula (13) | 53.879.538 | 64.256.232 | +10.376.694 |
| Flávio Bolsonaro (22) | 56.104.503 | 59.826.041 | +3.721.538 |
| Demais candidatos (eliminados) | 9.321.993 | — | — |

**A conta fecha exatamente:**
- Os dois finalistas ganharam juntos **14.098.232** votos.
- O que estava disponível soma **14.098.232**: votos dos eliminados (9.321.993), aumento do comparecimento (2.960.239) e queda de brancos e nulos (1.816.000).
- **Cuidado com um arquivo do TSE:** o arquivo "votação por candidato, município e zona" (`votacao_candidato_munzona`) não traz os 5.246 votos do candidato de número 28 no 1º turno. Eles estão nos boletins de urna e no resultado oficial por seção. Quem usar só esse arquivo vai achar 9.316.747 votos de eliminados e uma conta que não fecha por 5.246.

## 2. Comparação com 2018 e 2022 (Fato, números reproduzidos por segunda verificação independente)

Fonte: linha de base histórica da auditoria (2018 e 2022); números reproduzidos por três contas independentes na segunda verificação independente.

| Eleição | Finalista que mais cresceu | Parte do disponível que ele levou | Variação dos votos nominais do 1º para o 2º turno |
|---|---|---|---|
| 2018 | Haddad (13) | 64,8% | −2,1% |
| 2022 | Bolsonaro (22) | 69,8% | +0,3% |
| 2026 | Lula (13) | 73,6% | +4,0% |

| Eleição | UFs em que o outro finalista perdeu votos do 1º para o 2º turno |
|---|---|
| 2018 | nenhuma |
| 2022 | Lula: AC (−7.456), AM (−14.693), AP (−7.464), RR (−1.632) |
| 2026 | Flávio: AC (−15.092), AP (−13.604), RR (−11.647), MA (−9.069), AM (−1.519), TO (−1.405) |

Segundo a segunda verificação independente, essas comparações **não servem como prova contra manipulação**: elas não teriam detectado uma troca de votos capaz de virar o resultado.

## 3. Votos × votantes em cada urna (Fato, duas contas independentes)

Em **todas as seções com boletim de presidente**, a soma dos votos (candidatos, brancos e nulos) é igual ao número de eleitores que votaram para presidente: **499.206 no 1º turno e 499.205 no 2º**.

- Conta 1: um resumo tirado de cada boletim, comparado entre os turnos seção a seção, nas 499.176 seções com urna nos dois turnos.
- Conta 2: banco de dados carregado dos boletins, comparando a soma dos votos com o comparecimento da eleição de presidente, em todas as seções.
- A conta 2 cobre o universo inteiro; a conta 1 confirma o mesmo resultado nas 499.176 seções que ela cobre. As que ficam fora da conta 1 são as do exterior apuradas em cédula e 2 seções de MG que no 1º turno votaram em parte em cédula.
- **Cuidado de leitura:** nas 29 seções do exterior apuradas pelo Sistema de Apuração, em cada turno, e em 2 seções de MG no 1º turno, o campo geral de comparecimento do boletim vem zerado. O que vale é o comparecimento da eleição de presidente.

## 3b. Alguma urna só fecha se eleitor de um finalista tiver ido para o outro? (Fato, duas contas independentes)

Para cada seção, a conta é: votos do finalista no 2º turno, menos tudo o que ele poderia ter recebido sem ninguém trocar de lado. "Tudo" soma os votos dele no 1º turno, os votos dos eliminados, os brancos, os nulos, quem não votou no 1º turno e os eleitores novos da seção. Se ainda sobrar voto, a diferença só fecha com eleitor que votou no outro finalista no 1º turno.

| Finalista | Seções em que sobra voto | Eleitores que precisam ter vindo do outro finalista |
|---|---|---|
| Lula (13) | 10 | 20 (de 1 a 5 por seção) |
| Flávio Bolsonaro (22) | 1 (PI 11878/0028/0099) | 24 |

- As duas contas dão **as mesmas 11 seções e os mesmos números**:
  - pelo resumo de cada boletim, em 499.176 seções;
  - pelo banco de dados, em 499.205 seções. Nas 29 seções que só a segunda conta cobre, não sobra voto em nenhuma.
- **As 10 seções do Lula:** AL 28754/0049/0135, AM 02755/0022/0070, BA 39659/0041/0400, MA 09555/0078/0296, MG 40282/0063/0194, MG 40690/0016/0347, PA 04073/0021/0296, PA 04472/0004/0580, PE 23876/0021/0149 e SP 71072/0325/0685.
- Trocar de candidato entre os turnos é permitido. A conta mostra só **o mínimo** de trocas que os números exigem. Ela não mede quantos eleitores trocaram de fato, porque o voto é secreto.
- **Fato:** nas 11 seções, o número de eleitores aptos é o mesmo nos dois turnos. Mas em 6 delas há eleitores que votam em trânsito (fora da seção de origem), e em 2 (BA 39659/0041/0400 e SP 71072/0325/0685) todos os aptos são de trânsito. A lista de quem vota em trânsito pode mudar de um turno para o outro. Nessas 6, parte da "troca mínima" pode ser de eleitores diferentes em cada turno, e não de eleitores que mudaram de lado. **Pendente:** conferir, com as listas de trânsito de cada turno, se são as mesmas pessoas.

## 4. Prorrogação do horário de votação (Fato nos votos; decisão Pendente)

- **A decisão (Pendente):** o único texto lido é uma minuta publicada pela imprensa, não a versão assinada; por isso o conteúdo abaixo não é Fato. Pela minuta, trata-se de liminar do STF na Reclamação 101.673/BA (pedido da coligação de Lula contra os municípios de Salvador, Feira de Santana e Lauro de Freitas, por falta de transporte público), que determina "prorrogação por duas horas, até as 19h, horário de Brasília, do encerramento do recebimento dos votos em todas as seções de todo o Brasil, cabendo ao TSE dar cumprimento". O documento lido é a "Minuta_ Decisão Liminar" publicada pelo Poder360.
- **Votos dados depois das 17h de Brasília no 2º turno, por duas contas independentes com recortes diferentes:**
  - 34.330 votos: Brasil sem o exterior, contando também as urnas reserva (contingência);
  - 34.066 votos: só as urnas da própria seção, com o exterior pelo relógio local. Sem o exterior, 33.668.
  - A diferença vem das urnas reserva e do exterior. Depois das 18h: 1.993 e 1.960.
- **Tamanho em relação ao resultado:** mesmo que os 34.330 votos fossem todos para um só candidato, seriam 0,77% da diferença de 4.430.191 votos.
- **Pendente:** versão assinada da decisão no portal do STF e horário do ofício do TSE aos TREs.

## 5. Eleitores registrados como "sem biometria cadastrada" acima do cadastro (Fato, revisado por segunda verificação independente)

Fonte: segunda verificação independente, com os números reproduzidos por dois caminhos.

- Em 16.011 das 497.508 seções do Brasil em que a medida é possível no 2º turno, o boletim registra mais eleitores "sem biometria cadastrada" do que o cadastro público tem. O excesso soma 36.340 eleitores.
- **Ficam fora da medida** (497.508 + 1.281 + 389 + 29 = 499.207 seções):
  - as 1.310 seções do exterior, porque o boletim não traz esse detalhe ou não registra comparecimento;
  - 389 seções do Brasil que não constam do cadastro público de 14/07/2026. **Pendente:** a medida nessas 389.
- Nenhuma dessas seções tem mais votantes do que eleitores aptos.
- **Medido nas 378 seções com excesso de 10 ou mais (todas elas):** ali, quase todo o excesso é diferença de definição. O arquivo da urna tinha a foto desses eleitores, mas não a digital, e o cadastro público os conta como "com biometria". Contando como "sem biometria" só quem também não tem foto, o excesso dessas seções cai de 5.560 para 54. **Pendente:** a mesma medida nas outras 15.633 seções; até lá, a explicação vale só para essas 378.
- **Risco que continua, pela premissa de não confiar em pessoas:** esses eleitores foram liberados só com título, ano de nascimento e a conferência da foto pelo mesário, que é humana e não deixa rastro.

## 5b. Votantes a mais no 2º turno, com e sem digital (Fato, mesmo número dos tópicos 4, 7 e 10)

- **Nas 499.176 seções comparadas,** o comparecimento subiu 2.960.096 do 1º para o 2º turno.
- **No Brasil sem o exterior,** subiu 2.920.461. No mesmo período, as liberações sem digital (eleitor sem biometria cadastrada ou liberação manual pelo mesário) subiram **601.543**, o equivalente a 20,6% do aumento. Isso é saldo: não diz que os eleitores a mais foram os liberados sem digital, porque o mesmo eleitor pode ter sido liberado de um jeito em cada turno.
- Como os votantes foram liberados está no [tópico 4](04-liberacao-dos-eleitores.md).

## 6. Perda de votos do Flávio em seções onde o comparecimento não caiu (Fato, revisado por segunda verificação independente)

Fonte: segunda verificação independente.

- **Onde acontece:** em 26 das 27 UFs e no exterior (só o AP não tem caso), há seções em que Flávio perdeu votos sem que o número de votantes caísse. São 38.235 seções, somando −126.408 votos (recontado numa revisão posterior).
- **Nas seis UFs onde ele também perdeu votos no total** (tabela do item 2), a perda nessas seções soma **MA 10.652, AM 2.841, TO 1.778**, AC 148, RR 59 e AP 0. Em MA, AM e TO, a queda do comparecimento não explica a perda total do Flávio; em AC, AP e RR, explica a maior parte.
- **Explicações possíveis:** matematicamente, isso só acontece se eleitores trocaram o 22 pelo 13, ou por branco ou nulo, ou se eleitores do Flávio deixaram de votar e foram substituídos por outros eleitores.
- **Pendente:** qual dessas explicações, e o detalhe por UF nas outras 20 UFs e no exterior.

## Pendente (sem número até haver reprodução independente)

| Teste | Para que serve | Situação |
|---|---|---|
| Comparação de cada seção com as vizinhas, 1º × 2º turno | Apontar seções fora do padrão | 1 conta feita; em revisão |
| Para onde foram os votos dos eliminados | Estimar a divisão entre os finalistas | estimativa estatística: não entra no relatório |
| Troca de votos pela urna × voto dos eliminados | Separar as duas explicações pela proporção | segunda verificação independente: só descarta troca uniforme proporcional aos votos do 22 |
| Resultado por modelo de urna e por dia de preparação | Procurar padrão técnico | segunda verificação independente: sustentado com ressalvas |
| Curva da apuração | Ver se a forma da curva é explicada pela ordem de chegada das cidades | segunda verificação independente: sustentado com ressalvas; **não serve como contraprova** contra votos alterados |
| Teste de Integridade (urnas conferidas com cédulas de papel) | Controle externo contra troca de votos pelo programa da urna | há só declarações de "sem divergência" do TSE, do TRE-SP e do TRE-AL; o resultado do teste com biometria não foi obtido |
| Pesquisas de véspera | Comparação externa à urna | números da imprensa: não entram no relatório |
| Assinaturas digitais de todos os boletins | Provar que cada arquivo saiu de uma urna oficial e não foi alterado | feita nos dois turnos, 499.207 pacotes em cada, sem arquivo alterado ([tópico 1](01-integridade-e-estrutura-dos-arquivos.md)); por isso já não é Pendente |

## Limites (o que este tópico não prova)

1. **Quem votou.** Os arquivos mostram como o eleitor foi liberado (com digital ou sem), não quem estava na cabine.
2. **O programa da urna por dentro.** Boletim, registro de votos e diário da urna saem do mesmo programa. Uma troca de votos igual em todas as urnas deixaria esses arquivos coerentes entre si. O controle contra isso é externo à urna (Teste de Integridade), e ele está em Pendente.
3. **Estimativas.** Taxas de "para onde foi o voto" não são dados: o voto é secreto. Por isso ficam fora deste relatório.
4. **Fraude do mesmo tamanho nos dois turnos.** Os testes deste tópico comparam o 1º com o 2º turno. Uma alteração que tivesse o mesmo tamanho nos dois turnos e na mesma seção se cancelaria na comparação e não apareceria aqui. Esse caso só pode ser visto por testes de um turno só. As assinaturas e a coerência entre os arquivos (tópicos 1 e 2) pegam alteração feita depois de a urna gravar os arquivos; uma alteração feita pelo próprio programa antes de gravar só o Teste de Integridade pegaria, e ele está Pendente.
