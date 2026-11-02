# 8. A virada do 2º turno: o que os números oficiais mostram

> **Regra deste tópico:** só entram números conferidos no universo completo e reproduzidos de forma independente, por uma segunda verificação independente ou por duas contas que batem. O que ainda não cumpre essa regra está em "Pendente", **sem número**. As análises em andamento ficam nos documentos de trabalho da auditoria, fora deste relatório. Revisado em 29/10/2026; item 7 (a virada zona por zona, H26) acrescentado em 31/10/2026, depois da segunda verificação independente. Em 02/11/2026, fechado só com dados públicos: veredito final da H10 (item 6) e da H26 (item 7), com a comparação com 2018 e 2022 e o exame das zonas do lado do 22, conferidos por uma segunda verificação independente. **Pendente** fica só para o que ainda pode ser feito com dados públicos.

## A pergunta

No 1º turno (4/10/2026), Flávio Bolsonaro teve 2.224.965 votos a mais que Lula. No 2º turno (25/10/2026), Lula venceu por 4.430.191. Os números oficiais mostram alguma impossibilidade nessa virada?

## Resposta curta

- **Fato:** o ganho dos dois finalistas no 2º turno fecha exatamente com o que estava disponível no 1º (14.098.232 votos).
- **Fato:** nos dois turnos, em todas as seções com voto para presidente (499.206 no 1º turno e 499.205 no 2º), a urna registrou exatamente tantos votos para presidente quantos eleitores votaram.
- **Fato:** nos dois turnos, a soma dos boletins de todas as urnas é igual ao resultado oficial, candidato por candidato.
- **Fato:** em 499.194 das 499.205 seções, os números não exigem que nenhum eleitor tenha trocado um finalista pelo outro. Nas outras 11, a troca mínima exigida soma 20 eleitores para Lula e 24 para Flávio.
- **Fato (H10, refutada como foi escrita):** o 13 não ganhou mais votos do que havia para ganhar em todos os estados. Só em 6 UFs (AC, AP, RR, MA, AM e TO) o ganho dele passa do disponível, e lá o excesso é exatamente o que o 22 perdeu: 52.336 votos. Nessas UFs, o ganho só fecha com eleitores que mudaram de lado ou com eleitores diferentes em cada turno, e os arquivos públicos não dizem qual (item 6).
- **Fato:** zona por zona, o 13 melhorou a margem em 2.626 das 2.641 zonas. Nenhuma zona e nenhuma seção deu ao 13 mais do que o acaso explica (item 7).
- **Fato (H26, sem sinal nos dados públicos):** pela régua fixada antes, a virada de 2026 foi mais parecida entre as zonas do que as de 2018 e 2022; medida só entre os dois finalistas, ela fica como a de 2022. Uma troca de votos do 22 para o 13 espalhada por igual no país teria a mesma aparência, e nenhum arquivo de resultado separa uma coisa da outra (item 7).
- Os demais testes da virada (voto no lugar de eleitor ausente, padrão técnico) têm veredito final no [tópico 10](10-quadro-das-hipoteses.md); nenhum tem evidência de efeito capaz de mudar o vencedor.
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
- **Fato:** nas 11 seções, o número de eleitores aptos é o mesmo nos dois turnos. Mas em 6 delas há eleitores que votam em trânsito (fora da seção de origem), e em 2 (BA 39659/0041/0400 e SP 71072/0325/0685) todos os aptos são de trânsito. A lista de quem vota em trânsito pode mudar de um turno para o outro. Nessas 6, parte da "troca mínima" pode ser de eleitores diferentes em cada turno, e não de eleitores que mudaram de lado. As listas de quem votou em trânsito em cada turno não são públicas, e por isso os dados públicos não dizem se são as mesmas pessoas.

## 4. Prorrogação do horário de votação (Fato nos votos; decisão Pendente)

- **A decisão (Pendente):** o único texto lido é uma minuta publicada pela imprensa, não a versão assinada; por isso o conteúdo abaixo não é Fato. Pela minuta, trata-se de liminar do STF na Reclamação 101.673/BA (pedido da coligação de Lula contra os municípios de Salvador, Feira de Santana e Lauro de Freitas, por falta de transporte público), que determina "prorrogação por duas horas, até as 19h, horário de Brasília, do encerramento do recebimento dos votos em todas as seções de todo o Brasil, cabendo ao TSE dar cumprimento". O documento lido é a "Minuta_ Decisão Liminar" publicada pelo Poder360.
- **Votos dados depois das 17h de Brasília no 2º turno, por duas contas independentes com recortes diferentes:**
  - 34.315 votos: Brasil sem o exterior, contando também as urnas reserva (contingência), já com a correção de uma seção de Goiás cujo relógio estava 1 hora adiantado ([tópico 3](03-linha-do-tempo.md), item 6);
  - 34.066 votos: só as urnas da própria seção, com o exterior pelo relógio local. Sem o exterior, 33.668.
  - A diferença vem das urnas reserva, do exterior e da correção de relógio, que a segunda conta não tem. Depois das 18h: 1.993 e 1.960.
- **Tamanho em relação ao resultado:** mesmo que os 34.315 votos fossem todos para um só candidato, seriam 0,77% da diferença de 4.430.191 votos.
- **Pendente:** a versão assinada da decisão no portal do STF, que é pública. O horário do ofício do TSE aos TREs não está nos dados públicos.

## 5. Eleitores registrados como "sem biometria cadastrada" acima do cadastro (Fato, revisado por segunda verificação independente)

Fonte: segunda verificação independente, com os números reproduzidos por dois caminhos.

- Em 16.011 das 497.508 seções do Brasil em que a medida é possível no 2º turno, o boletim registra mais eleitores "sem biometria cadastrada" do que o cadastro público tem. O excesso soma 36.340 eleitores.
- **Ficam fora da medida** (497.508 + 1.281 + 389 + 29 = 499.207 seções):
  - as 1.310 seções do exterior, porque o boletim não traz esse detalhe ou não registra comparecimento;
  - 389 seções do Brasil que não constam do cadastro público de 14/07/2026; para elas, o dado público que permitiria a medida não existe.
- Nenhuma dessas seções tem mais votantes do que eleitores aptos.
- **Medido nas 378 seções com excesso de 10 ou mais (todas elas):** ali, quase todo o excesso é diferença de definição. O arquivo da urna tinha a foto desses eleitores, mas não a digital, e o cadastro público os conta como "com biometria". Contando como "sem biometria" só quem também não tem foto, o excesso dessas seções cai de 5.560 para 54. **Fato (conferido por uma segunda verificação independente):** feita a mesma medida nas 16.011 seções, o excesso cai de 36.340 para 493, em 423 seções.
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

**O veredito da H10 (Fato, conferido por uma segunda verificação independente).** A hipótese dizia que o vencedor cresceu mais do que havia de votos disponíveis em todos os estados. Contando como disponível, em cada UF, os votos dos eliminados, a queda de brancos e nulos e o aumento do comparecimento, o ganho do 13 passa do disponível em 6 UFs, e em cada uma o excesso é exatamente o que o 22 perdeu ali:

| UF | Ganho do 13 além do disponível (= perda do 22) |
|---|---:|
| AC | 15.092 |
| AP | 13.604 |
| RR | 11.647 |
| MA | 9.069 |
| AM | 1.519 |
| TO | 1.405 |
| **Total** | **52.336** |

**Como ler:** são as mesmas 6 UFs da tabela do item 2, em que o 22 perdeu votos do 1º para o 2º turno. Contando como disponível todos os que não votaram no 1º turno, e não só o aumento do comparecimento, o ganho cabe em todos os municípios. A hipótese, como foi escrita ("em todos os estados"), não aconteceu: **refutada**.

- **Fato:** seção a seção, mesmo supondo a maior troca possível de pessoas entre os turnos (todo eleitor que podia ter faltado num turno e votado no outro), só 32 votos, em 16 seções do país, exigem com certeza que um eleitor do 22 no 1º turno tenha votado em outro candidato no 2º. Mudar de voto entre os turnos é permitido.
- **Não decidível com dados públicos:** quanto da perda do 22 nessas 6 UFs é mudança de voto e quanto é troca de eleitores entre os turnos. Falta a lista de quem votou em cada turno (o caderno de votação e o registro de comparecimento de cada eleitor), que é dado pessoal e não é público.
- **O que esta conta não mede:** o tamanho de uma troca de votos do 22 para o 13. Uma troca só reduz o ganho do 22, e o ganho que ele teria sem ela não é conhecido. Pelas contagens públicas, a troca possível vai de nenhuma até muito mais do que a diferença; por isso esta perícia não dá um "efeito máximo" para ela.

## 7. A virada zona por zona: região, modelo de urna e horário (H26; Fato, revisado por segunda verificação independente)

### A pergunta deste item

Alguma zona eleitoral virou para o 13 muito mais do que o 1º turno dela mesma permitia prever? E as zonas que mais viraram se concentram numa região, num modelo de urna ou num horário de votação? Votos inseridos em poucas zonas apareceriam assim: algumas zonas fora do padrão das outras.

### Resposta curta

- **Fato:** a virada para o 13 aconteceu em quase todo o país. O 13 melhorou a margem em 2.626 das 2.641 zonas eleitorais.
- **Fato:** pelo critério fixado antes de rodar o teste, nenhuma zona virou para o 13 além do esperado o bastante para ser apontada. Quatro zonas foram apontadas do lado contrário: nelas o 13 cresceu **menos** do que o 1º turno da própria zona fazia esperar.
- **Fato (o alcance do teste, medido por simulação):** o teste só aponta uma zona quando o desvio é de vários pontos percentuais dos votos dela, e mais nas zonas pequenas. Ele não enxerga um desvio menor do que isso numa zona, nem um desvio espalhado por uma capital inteira ou por um estado inteiro. "Nenhuma zona apontada para o 13" quer dizer só isso.
- **Fato:** comparando cada modelo de urna com as outras urnas da mesma zona, o teste não encontrou diferença na virada em nenhum dos quatro modelos.
- **Fato:** dentro da mesma zona, as seções com mais votos no fim do dia do 2º turno viraram um pouco **mais** para o 13, nas cinco regiões. Mesmo que todos os votos dados depois das 17h fossem do 13, seriam menos de 1% da diferença final (item 4). A causa não está nos arquivos.
- **Fato (comparação com 2018 e 2022):** pela régua fixada antes de rodar, a virada de 2026 foi mais parecida entre as zonas do que as de 2018 e 2022. Medida só entre os dois finalistas, ela fica como a de 2022. A parecença vem da parte da virada que o 1º turno de cada zona já prevê, e não de um excesso.
- **Fato (o ponto cego):** uma troca de votos do 22 para o 13 proporcional ao voto do 22 em cada lugar não deixa marca em nenhum destes testes, em nenhum tamanho que importe.
- **Fato (do lado do 22):** em Santo Antônio de Lisboa (PI) e num colégio de São Paulo, locais de votação inteiros viraram para o 22, conferidos no arquivo da urna.
- **Veredito final da H26: sem sinal nos dados públicos.** Pode mudar o vencedor? Os dados públicos não permitem dizer.
- **Não se pode afirmar**, com este teste, que não houve troca ou inserção de votos espalhada por igual por muitas zonas, por um estado ou pelo país, nem que o voto do fim do dia desfavoreceu o 13.

### Termos usados neste item

| Termo | Em palavras simples |
|---|---|
| **Votos nominais** | Os votos dados a um candidato. Ficam fora os brancos e os nulos |
| **Margem** | A diferença entre o 13 e o 22, em pontos percentuais dos votos nominais. Margem negativa quer dizer o 22 à frente |
| **Virada** | A margem do 2º turno menos a margem do 1º. Virada positiva quer dizer que o 13 melhorou |
| **Esperado** | O que a zona "deveria" dar ao 13 e ao 22 no 2º turno, previsto pelos votos da própria zona no 1º turno: os do 13, os do 22, os de cada eliminado, os brancos e nulos e quem não votou. A regra de previsão é tirada de todas as seções do mesmo estado. Como prever a nota final de cada aluno pelas notas do 1º bimestre, com uma regra tirada da turma inteira: o aluno que fica muito acima da previsão chama a atenção |
| **Além do esperado** | O que a zona deu ao 13 a mais do que o esperado, descontado o que deu ao 22 a mais do que o esperado, em pontos percentuais dos votos nominais do 2º turno |
| **Régua** | Para dizer se um desvio é grande, cada zona é comparada com as zonas da mesma região. A régua é a variação típica entre elas, medida de um jeito que poucos casos extremos não distorcem |
| **Margem só entre os dois finalistas** | A diferença entre o 13 e o 22 em pontos percentuais só dos votos dos dois, sem os votos dos eliminados. Como comparar dois times só pelos jogos entre eles, sem os jogos contra os outros times |
| **Ponto cego** | Uma forma de fraude que um teste não consegue ver em nenhum tamanho, pela própria forma da conta. Como o retrovisor de um carro: há um ângulo que ele não mostra, por mais que se olhe nele |

### Como foi feito

- **Universo:** as 499.207 seções com boletim dos dois turnos, em 2.641 zonas (as zonas das 27 UFs e o exterior, contado como uma zona só). Os votos do 13 e do 22 de cada seção foram conferidos com o resultado oficial por seção, candidato a candidato, nos dois turnos: 0 divergência.
- **Virada de cada zona:** a margem do 2º turno menos a do 1º.
- **Virada além do esperado:** em cada zona, o que sobra depois de tirar o esperado. O critério de corte foi fixado antes de rodar o teste e vale para os dois lados: a zona é apontada se estiver longe demais do meio da sua região pela régua, já com a **correção para muitos testes** (são 2.640 zonas medidas de uma vez), e se o desvio for de pelo menos 2 pontos percentuais.
- **Modelo de urna:** em cada zona com urnas de mais de um modelo (2013, 2015, 2020 e 2022), a virada das seções de cada modelo foi comparada com a das outras seções da mesma zona.
- **Horário:** os votos de cada hora, pela hora de Brasília. Em cada seção, a parte dos votos dada no fim do dia (depois das 15h e depois das 17h), em cada turno, foi comparada com a virada da seção, sempre dentro da mesma zona.
- **Segunda verificação independente:** refez tudo com programa próprio, a partir dos boletins, sem usar os resultados intermediários da primeira análise. Também mediu o alcance do teste: inseriu de propósito votos falsos nos dados reais, refez todas as contas e viu quando o teste apontava a zona.

### O que foi encontrado

**1. A virada foi geral (Fato).**

| Medida | Valor |
|---|---|
| Margem no 1º turno | −1,86 ponto percentual (o 22 à frente por 2.224.965 votos) |
| Margem no 2º turno | +3,57 pontos (o 13 à frente por 4.430.191 votos) |
| Virada no país | +5,44 pontos (6.655.156 votos de diferença entre as duas margens) |
| Zonas em que o 13 melhorou a margem | 2.626 de 2.641 |
| Zonas em que o 22 melhorou a margem | 15. A maior virada para o 22 foi de −1,47 ponto, na zona 0129 do RS (Nova Petrópolis) |
| Zonas que passaram do 22 para o 13 | 128 |
| Zonas que passaram do 13 para o 22 | 0 |
| Virada por zona | Metade das zonas virou mais de +5,09 pontos; 1% das zonas virou menos de +0,51; 99%, menos de +9,08 |

- As 128 zonas que passaram para o 13 tinham o 22 à frente por no máximo 7,77 pontos no 1º turno. Havia 127 zonas com o 22 à frente por menos que a virada do país (5,44 pontos): virar ali é o que um deslocamento geral produz.
- **Como ler:** isso descreve como a virada se distribuiu. Não é argumento contra uma inserção espalhada por igual, que este teste não enxerga (item 3 abaixo).

**2. Zonas além do esperado (Fato, com o alcance do item 3).**

- **Pelo critério fixado antes:** nenhuma zona apontada do lado do 13. Quatro apontadas do lado do 22, ou seja, com o 13 crescendo menos do que o esperado: MA 0032 (Humberto de Campos), SP 0002 (São Paulo), CE 0020 (Crateús) e BA 0105 (Piatã).
- **A lista depende do método (Fato).** Com outras escolhas igualmente razoáveis de régua (por estado em vez de por região, por tamanho de zona, em pontos percentuais) ou de cálculo do esperado, aparecem de nenhuma a 9 zonas do lado do 13, quase sempre zonas urbanas de SP, da BA e de PE, e de 3 a 8 do lado do 22. As escolhas não concordam entre si. Isso mostra que a ponta da lista depende do modelo, e não que haja ali uma anomalia escondida.
- **A régua exagera a raridade nas pontas (Fato).** Ela aponta casos extremos com mais frequência do que o cálculo do corte supõe. Zonas do mesmo município também se parecem: as zonas de Salvador, por exemplo, estão quase todas deslocadas para o mesmo lado. Por isso as 4 zonas do lado do 22 são menos raras do que o critério sugere.
- **A regra de previsão serve para prever, e não diz para onde foi cada eleitor (Fato).** 132 dos 504 pesos da regra (28 regras, uma por UF e uma para o exterior, × 9 grupos de voto do 1º turno × 2 candidatos) ficam fora do que seria possível numa transferência de eleitores, por exemplo pesos negativos. Um peso negativo não pode ser "parte dos eleitores de um eliminado que foi para o 13".
- O exame seção a seção das zonas do lado do 22 e a comparação de cada zona com 2018 e 2022 estão nos subitens 6 e 7, abaixo. O exame seção a seção usou um critério próprio, por seção, e por isso a lista de zonas dele não é a mesma desta.

**As zonas mais perto do corte do lado do 13 (Fato nas contagens; Hipótese na causa).** Nenhuma chegou ao corte. As 22 que mais se afastaram do esperado para o lado do 13 ficam, na maioria, em capitais e regiões metropolitanas: 5 em Salvador e região, 5 em São Paulo e na Baixada Santista, 2 no Rio de Janeiro e 1 em Brasília; as outras ficam em Águas Lindas de Goiás, Petrolina (2), Juazeiro, Campos dos Goytacazes, Ituiutaba, João Monlevade, Santa Cruz do Sul e Viamão.

| Eleitores a mais no 2º turno, por forma de liberação | Nas 22 zonas | Nas demais zonas dos mesmos estados |
|---|---:|---:|
| Pela digital | 82,15% | 78,63% |
| Sem digital cadastrada (título e ano de nascimento) | 10,50% | 11,62% |
| Com digital cadastrada, liberados pelo ano de nascimento | 7,35% | 9,75% |

Fonte: boletins de urna dos dois turnos (campos de forma de liberação), conferidos por duas contas independentes. Nas 22 zonas, o comparecimento subiu 99.232 eleitores do 1º para o 2º turno. **Como ler:** de cada 100 eleitores a mais nessas 22 zonas, 82 foram liberados pela própria digital; nas outras zonas dos mesmos estados, 79. A parte liberada pela digital registrada no boletim é igual à contada no diário da urna em 497.884 das 497.897 seções do Brasil no 1º turno e em 497.890 seções no 2º.

- **Fato:** numa delas, a zona 0075 do RJ (Campos dos Goytacazes), o comparecimento **caiu** 1.255 eleitores. Ali, "mais gente foi votar" não explica o desvio.
- **Hipótese:** nas outras, o desvio vem sobretudo da volta de eleitores urbanos às urnas no 2º turno.
- **Até onde vai esse argumento.** Ele afasta a liberação em massa pelo mesário, porque esse caminho deixaria maior a parte liberada pelo ano de nascimento, e ela é menor nessas zonas. Ele **não** afasta uma manipulação dentro da urna, que escreveria o boletim e o diário do mesmo jeito ([tópico 7](07-limites-da-pericia.md)). E comparecimento acima do resto do estado também é o que uma inserção de votos produziria.

**3. O alcance do teste (Fato, medido por simulação na segunda verificação independente).**

- **Uma zona sozinha:** o teste só a aponta quando o desvio inserido é de vários pontos percentuais dos votos dela. Nas zonas pequenas o desvio precisa ser maior que nas grandes. Se o voto for trocado do 22 para o 13, em vez de acrescentado, cada voto trocado mexe na margem duas vezes (tira do 22 e põe no 13), e o desvio necessário cai pela metade.
- **Várias zonas do mesmo estado:** quanto mais zonas recebem o desvio, menos delas são apontadas, porque a regra de previsão do estado se move junto.
- **Uma capital inteira:** a regra de previsão absorve uma parte grande do que se insere. Num teste com Fortaleza, um desvio de vários pontos em todas as zonas da cidade não fez nenhuma ser apontada.
- **Um estado inteiro, ou uma inserção proporcional ao voto do 13 no 1º turno:** a regra absorve tudo, e nenhuma zona é apontada. Para esses casos é preciso uma régua de fora do próprio estado e da própria eleição, como as eleições anteriores: ela foi usada no item 6 abaixo, e ela também não vê uma troca proporcional ao voto do 22.
- Os tamanhos exatos de cada caso são estimativas de simulação e ficam fora deste relatório.

**4. Modelo de urna (Fato).** Comparando, dentro de cada zona com mais de um modelo, as urnas de cada modelo com as outras, o teste não encontrou diferença na virada em nenhum dos quatro modelos (2013, 2015, 2020 e 2022). A primeira versão desse teste somava também as zonas com um modelo só, onde por definição não há diferença, e por isso diluía o desvio; ela foi refeita só com as zonas mistas. O teste não enxerga um desvio igual em todas as urnas de uma zona, de qualquer modelo. O menor desvio que ele enxerga é estimativa estatística e fica fora deste relatório.

**5. Horário (Fato na direção; Pendente na causa).**

- **A hora mais cheia mudou.** No 2º turno, na maioria das zonas, a hora com mais votos foi a primeira, logo depois das 8h de Brasília, e em nenhuma zona foi depois do meio-dia. No 1º turno o pico veio mais tarde. **Hipótese:** no 1º turno o eleitor digita 6 ou 7 cargos e a fila anda devagar; no 2º são 2 cargos, e a fila da manhã acaba cedo. **Pendente:** as contagens de zonas por hora de pico vão ser refeitas com a correção das urnas com relógio 1 hora fora da hora certa ([tópico 3](03-linha-do-tempo.md), item 6) antes de entrar aqui com número.
- **Fato:** dentro da mesma zona, as seções com uma parte maior dos votos dada no fim do dia do 2º turno (depois das 15h ou depois das 17h) viraram um pouco **mais** para o 13. Isso aparece nas cinco regiões e continua quando se levam em conta o tamanho da seção, a variação do comparecimento e o voto e a abstenção da seção no 1º turno. A parte dos votos dada no fim do dia do **1º** turno também vai junto com mais virada para o 13, o que sugere um efeito do lugar (seções com fila longa), e não só do horário do 2º turno.
- **O tamanho é pequeno perto do resultado.** O tamanho da associação é estimativa estatística e fica fora deste relatório. O limite exato é este: houve 34.315 votos depois das 17h no 2º turno (item 4), e, mesmo que todos fossem do 13, seriam 0,77% da diferença final.
- **Uma leitura anterior foi corrigida.** A primeira análise dizia que "a seção que votou mais tarde virou menos para o 13". A segunda verificação mostrou que a conta usada misturava os dois turnos numa diferença só, dominada pelo 1º turno, em que muito mais gente vota no fim do dia, e que, separados os turnos, o sinal é o contrário. Mostrou também que aquela conta não tinha poder: com votos para o 13 inseridos de propósito no fim do dia, ela continuava apontando para o lado errado.
- **Hipótese (sem fraude):** quem vota tarde no 2º turno é diferente de quem vota cedo (mais jovem, trabalha, depende de transporte), e o aumento do comparecimento a favor do 13 se concentrou nesse grupo. Pela regra de controle desta perícia, essa explicação fica como Hipótese até haver rastro técnico.
- **Pendente:** a análise que cruza essa associação com os municípios da prorrogação (item 4) e com a forma de liberação dos eleitores que votaram depois das 17h, contada no diário de cada urna, foi feita e ainda não teve a segunda verificação independente; por isso não entra com número.

**6. Comparação com 2018 e 2022 (Fato, conferido por uma segunda verificação independente).**

A mesma conta, zona por zona, foi feita para os 2º turnos de 2018 e 2022, com o finalista que cresceu em cada ano: o 13 em 2018, o 22 em 2022 e o 13 em 2026. A segunda verificação refez a conta direto dos arquivos oficiais dos três anos.

| Medida | 2018 | 2022 | 2026 |
|---|---:|---:|---:|
| Parte dos votos nominais do 1º turno que foi para os eliminados | 24,69% | 8,37% | 7,81% |
| Zonas em que o finalista que cresceu melhorou, pela régua fixada antes (margem sobre todos os votos nominais) | 76,2% | 88,7% | **99,4%** |
| … zonas em que ele não melhorou | 628 | 298 | 15 |
| Zonas em que o finalista que cresceu melhorou, medindo a margem só entre os dois finalistas | 83,7% | 98,1% | 99,05% |
| … zonas em que ele não melhorou | 432 | 50 | 25 |

**Como ler:** cada linha diz em quantas zonas a virada foi para o mesmo lado da virada do país. Pela régua fixada antes, 2026 fica bem acima de 2018 e de 2022: a virada de 2026 foi a mais parecida entre as zonas, e a diferença é maior do que o acaso explica. Pela régua que mede a margem só entre os dois finalistas, 2026 e 2022 ficam praticamente iguais. As duas réguas são razoáveis; a segunda é a usual para comparar viradas quando o peso dos eliminados muda de uma eleição para outra, como de 2018 (quase um quarto dos votos) para 2022 e 2026.

- **Fato:** a diferença entre as duas réguas tem uma causa de conta, e não de voto. Quando os votos dos eliminados se dividem no 2º turno, a margem medida sobre todos os votos nominais muda mesmo que ninguém troque de lado, e essa mudança puxa a virada de cada zona para um lado ou para o outro conforme onde cada finalista era forte. Em 2026, esse efeito compensou as diferenças entre as zonas e as deixou mais parecidas.
- **Fato:** a parecença de 2026 está na parte da virada que o 1º turno da própria zona já prevê. A parte que ele não explica (o "além do esperado") variou entre as zonas tanto quanto em 2018 e 2022, e nenhuma zona passou do limite a favor do 13.
- **Hipótese (sem fraude):** no 2º turno de 2026, mais eleitores voltaram a votar e menos votaram em branco ou nulo do que em 2018 e 2022 (do 1º para o 2º turno, o comparecimento subiu 2.960.239 e os brancos e nulos caíram 1.816.000), e isso pendeu para o 13 em quase todas as zonas. Uma conta exploratória da segunda verificação indica que essa volta explica só parte da virada; ela precisa de um teste com plano registrado antes (**Pendente**, abaixo).
- **Fato (o ponto cego):** uma troca de votos do 22 para o 13 proporcional ao voto do 22 em cada lugar é absorvida pela regra de previsão: ela deixaria a virada ainda mais parecida entre as zonas, e nenhum teste feito sobre os arquivos de resultado a vê, em nenhum tamanho que importe. A mesma parecença sai de "eleição limpa com volta de eleitores" e de "ano comum mais uma troca espalhada por igual". Isso não é falta de dados: é a forma da conta. Só um controle de fora dos arquivos de resultado, como a conferência do programa da urna, separa uma coisa da outra ([tópico 7](07-limites-da-pericia.md)).

**7. As zonas do lado do 22, conferidas no arquivo da urna (Fato).**

As zonas apontadas do lado do 22 foram examinadas seção a seção. Nas seções mais extremas de Santo Antônio de Lisboa (PI, zona 0028) e de São Paulo (zona 0002), os arquivos de cada urna foram abertos nos dois turnos: boletim, lista de votos e resultado oficial são iguais, e as assinaturas conferem.

- **Santo Antônio de Lisboa (PI, zona 0028):** 9 seções extremas, em 4 locais de votação. Os 4 locais inteiros viraram para o 22, e não só essas seções, com o comparecimento caindo um pouco. A urna foi a mesma nos dois turnos, salvo numa seção.
- **São Paulo (zona 0002):** 6 das 7 seções de um colégio (local de votação 1546) estão entre as extremas, e a sétima foi para o mesmo lado. O prédio inteiro virou para o 22:

| Local 1546 da zona 0002 de São Paulo (7 seções) | 1º turno | 2º turno |
|---|---:|---:|
| Comparecimento | 1.869 | 2.219 (+18,7%) |
| Votos do 13 | 1.023 | 1.165 (+142) |
| Votos do 22 | 584 | 982 (+398) |
| Margem do 13, só entre os dois finalistas | +27,3 pontos | +8,5 pontos |
| Resto da zona 0002 (432 seções): comparecimento | 116.068 | 121.418 (+4,6%) |

**Como ler:** no prédio, o comparecimento subiu quatro vezes mais que no resto da zona, e quase todo o aumento foi para o 22. Nas 6 seções extremas, conferidas no arquivo da urna, a urna e o eleitorado foram os mesmos nos dois turnos.

- **Hipótese:** efeito político local em Santo Antônio de Lisboa; em São Paulo, volta, no 2º turno, de eleitores daquele local que tinham faltado no 1º. Os arquivos públicos não mostram a causa, e nenhuma das duas tem rastro técnico.

### Prova de que o teste funciona (contraprova)

- **Outro caminho, os mesmos números (Fato).** A segunda verificação refez a extração dos boletins, a regra de previsão, a régua, a correção para muitos testes e o corte com programa próprio. Chegou às mesmas 499.207 seções, aos mesmos votos, à mesma regra de previsão em cada estado e às mesmas zonas apontadas (nenhuma do 13 e as mesmas 4 do 22).
- **O teste acende quando há o que acender (Fato, simulação).** Com votos falsos inseridos numa zona, o teste a aponta a partir de um desvio de vários pontos. Sem nenhuma inserção, a simulação devolve o mesmo resultado dos dados reais. É assim que se sabe o que o teste vê e o que ele não vê (item 3).
- **O teste de horário errado foi trocado por um que vê (Fato).** A conta antiga não acendia nem com votos inseridos no fim do dia. A conta separada por turno já mostra a associação nos dados reais.

### Limites (o que este item não prova)

1. **Desvio pequeno numa zona.** Uma inserção menor do que vários pontos percentuais dos votos de uma zona não aparece.
2. **Desvio espalhado.** Inserção por igual numa capital, num estado, ou proporcional ao voto do 13 no 1º turno, é absorvida pela regra de previsão do próprio estado. A comparação com 2018 e 2022 (subitem 6) também não vê uma troca proporcional ao voto do 22: é um ponto cego da forma da conta. A linha de base tem só duas eleições; 2014 diria se uma virada tão parecida entre as zonas já aconteceu antes (**Pendente**, com dados públicos).
3. **Dependência do método.** A lista de zonas da ponta muda com escolhas razoáveis de régua e de cálculo. A régua aponta casos extremos com mais frequência do que o corte supõe, e zonas vizinhas não são independentes. A triagem por município ainda não foi feita.
4. **Ordem do critério.** O critério de corte foi escrito antes de rodar o teste, mas foi guardado junto com o resultado, no mesmo registro. Não há rastro técnico de que veio antes.
5. **O argumento da forma de liberação** afasta só a liberação em massa pelo mesário, não a manipulação dentro da urna.
6. **Exterior:** é uma zona só, sem outras para comparar.
7. **Os pesos da regra de previsão não são transferência de eleitores.** O voto é secreto, e "para onde foi o voto" não é dado (limite 3, abaixo).

### Pendente deste item (com dados públicos)

- **Pendente:** a linha de base com 2014.
- **Pendente:** um teste, com plano registrado antes, nas seções em que não houve volta de eleitor nem queda de brancos e nulos, para medir quanto da virada a volta de eleitores não explica.
- **Pendente:** a segunda verificação da análise do voto do fim do dia × prorrogação e × forma de liberação.
- **Pendente:** as contagens de zonas por hora de pico com a correção de relógio.
- **Pendente:** uma rodada com triagem também por município e uma régua calibrada pelo tamanho da zona.

## Pendente (sem número até haver reprodução independente)

| Teste | Para que serve | Situação |
|---|---|---|
| Comparação de cada seção com as vizinhas, 1º × 2º turno | Apontar seções fora do padrão | 1 conta feita; em revisão |
| Para onde foram os votos dos eliminados | Estimar a divisão entre os finalistas | estimativa estatística: não entra no relatório |
| Troca de votos pela urna × voto dos eliminados | Separar as duas explicações pela proporção | segunda verificação independente: só descarta troca uniforme proporcional aos votos do 22 |
| Resultado por modelo de urna e por dia de preparação | Procurar padrão técnico | segunda verificação independente: sustentado com ressalvas |
| Curva da apuração | Ver se a forma da curva é explicada pela ordem de chegada das cidades | segunda verificação independente: sustentado com ressalvas; **não serve como contraprova** contra votos alterados |
| Teste de Integridade (urnas conferidas com cédulas de papel) | Controle externo contra troca de votos pelo programa da urna | há só declarações de "sem divergência" do TSE, do TRE-SP e do TRE-AL; os relatórios não são públicos, e os dados públicos não alcançam este controle (recomendação: pedir aos TREs) |
| Pesquisas de véspera | Comparação externa à urna | números da imprensa: não entram no relatório |
| Assinaturas digitais de todos os boletins | Provar que cada arquivo saiu de uma urna oficial e não foi alterado | feita nos dois turnos, 499.207 pacotes em cada, sem arquivo alterado ([tópico 1](01-integridade-e-estrutura-dos-arquivos.md)); por isso já não é Pendente |

## Limites (o que este tópico não prova)

1. **Quem votou.** Os arquivos mostram como o eleitor foi liberado (com digital ou sem), não quem estava na cabine.
2. **O programa da urna por dentro.** Boletim, registro de votos e diário da urna saem do mesmo programa. Uma troca de votos igual em todas as urnas deixaria esses arquivos coerentes entre si. O controle contra isso é externo à urna (Teste de Integridade e conferência do programa), e os resultados dele não são públicos.
3. **Estimativas.** Taxas de "para onde foi o voto" não são dados: o voto é secreto. Por isso ficam fora deste relatório.
4. **Fraude do mesmo tamanho nos dois turnos.** Os testes deste tópico comparam o 1º com o 2º turno. Uma alteração que tivesse o mesmo tamanho nos dois turnos e na mesma seção se cancelaria na comparação e não apareceria aqui. Esse caso só pode ser visto por testes de um turno só. As assinaturas e a coerência entre os arquivos (tópicos 1 e 2) pegam alteração feita depois de a urna gravar os arquivos; uma alteração feita pelo próprio programa antes de gravar só o Teste de Integridade pegaria, e os resultados dele não são públicos.
