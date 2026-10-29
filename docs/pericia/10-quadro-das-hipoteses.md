# 10. Quadro geral das hipóteses de fraude testadas

> **Situação:** escrito em 29/10/2026 a partir do registro de hipóteses ([../hipoteses.md](../hipoteses.md)) e dos pareceres do revisor cético ([../analysis/cetico-revisor/](../analysis/cetico-revisor/)). Regra deste tópico: só fica no texto o número que foi refeito de forma independente, por um parecer do revisor cético que o sustenta ou pela conferência deste tópico (`scripts/auditoria/verifica-pericia-quadro.mjs`, sobre o universo completo). O que ainda não foi refeito aparece como **Pendente: em verificação**, sem número. Os números do 1º turno que vêm de dados ainda em carga estão marcados **parcial**, com a lista dos estados que faltam.

## A pergunta

Quais suspeitas de fraude foram testadas nos arquivos das urnas de 2026, como cada uma foi testada, e o que se concluiu até agora?

## Resposta curta

- **Fato:** 13 hipóteses estão registradas (H01 a H13). Duas foram **refutadas**: H10 ("o crescimento de um finalista não cabe nos votos disponíveis") e H07 ("urnas antigas não leem digital"), esta pela premissa (todo modelo lê digital, item 5 do tópico 4). Nenhuma foi **sustentada**. As outras estão **abertas** ou **em teste**.
- **Fato:** nenhum teste feito até agora encontrou o rastro que uma fraude grande o bastante para mudar o resultado de Presidente deixaria nos arquivos públicos: na soma das urnas, na contagem por urna, no horário dos votos, no intervalo entre votos ou na divisão dos votos a mais entre os dois turnos.
- **Fato:** alguns testes acharam **brechas humanas**, isto é, pontos em que só uma pessoa (o mesário, o cartório) decide, sem rastro técnico. A maior delas: o eleitor que a urna libera sem digital, só com o número do título e o ano de nascimento. Essas brechas são **riscos**, não provas de fraude.
- **Não é possível afirmar** que não houve nenhuma fraude. Os arquivos públicos não mostram quem estava na cabine nem permitem conferir o programa da urna por dentro. Vários testes também não enxergam fraude pequena, espalhada ou concentrada em poucas seções. Esses limites estão descritos em cada hipótese.

## Como ler o quadro

- **Status** é o que consta no registro oficial da auditoria ([../hipoteses.md](../hipoteses.md)). Só o coordenador muda o status. Os significados:
  - **aberta:** registrada, com teste ainda não feito ou só começado;
  - **em teste:** teste em andamento, com resultados parciais;
  - **refutada:** os dados mostram que a hipótese, como foi escrita, é falsa;
  - **sustentada:** os dados confirmam a hipótese (nenhuma até agora);
  - **inconclusiva:** os dados não permitem decidir.
- **Revisão cética:** um revisor tenta derrubar cada achado, refazendo as contas por conta própria e procurando explicações que o autor não considerou. O resultado é um **parecer**, com a "afirmação revisada", isto é, o alcance que os dados de fato sustentam. Quando há parecer, este tópico usa a afirmação revisada.
- **Recontado nesta verificação:** quando ainda não há parecer, o número só fica se a conferência deste tópico o refez do universo completo e chegou ao mesmo valor (ou ao valor corrigido, quando diferente). Isso não substitui o parecer do revisor cético, que continua pendente.
- **Universo completo:** a auditoria só aceita números tirados de **todas** as seções, nunca de amostra (princípio 9 de [../01-premissas.md](../01-premissas.md)). Os dois turnos estão completos na cópia de leitura do banco de 29/10/2026 (10h50 UTC). Onde a fonte usou só parte do 1º turno, de antes da carga completa, o texto diz **parcial** e quais estados faltam.

## O quadro

| # | A suspeita, em palavras simples | O que foi testado | Resultado até agora | Status | Revisão cética | Onde ler mais |
|---|---|---|---|---|---|---|
| H01 | Votos dados com títulos de pessoas que já morreram | Eleitores de 100 anos ou mais no cadastro × população do Censo 2022; comparecimento desse grupo | Cadastro com pelo menos 148.553 títulos de 100+ sem pessoa correspondente. 1º turno: compareceram 0,72% dos 100+ (contagem do TSE). Sem uso sistemático no 1º turno; no 2º, só se descarta uso acima de cerca de 10% desses títulos | em teste | sim (pareceres [02](../analysis/cetico-revisor/02-centenarios-excesso-cadastro.md) e [03](../analysis/cetico-revisor/03-centenarios-nao-votam.md)), sustentado com ressalvas | [tópico 6](06-titulos-de-falecidos.md) |
| H02 | Seções com quantidade fora do normal de eleitores liberados sem digital | Eleitores "sem biometria" no boletim × cadastro, seção a seção | 16.011 seções com mais "sem biometria" no boletim do que no cadastro. Em nenhuma seção votou mais gente do que os aptos. Explicação mais provável, conferida em grupos de seções e ainda não em todas: diferença de definição (foto sem digital no arquivo da urna). A brecha humana continua | aberta | sim, a parte do excesso sobre o cadastro ([parecer 01](../analysis/cetico-revisor/01-b1a-sem-biometria-acima-do-cadastro.md)), sustentado com ressalvas | [tópico 8, Limites](08-virada-do-2-turno.md#limites-o-que-estes-números-não-provam) |
| H03 | A soma das urnas é diferente do resultado oficial | Boletim de cada urna × resultado oficial, seção a seção | 2º turno, Presidente: igual em todas as 499.205 seções com boletim de Presidente. 1º turno, Presidente: igual em todas as 499.206 seções com boletim de Presidente (28 UFs). Demais cargos: **Pendente: em verificação** | em teste | sim para Presidente ([parecer 05](../analysis/cetico-revisor/05-h10-crescimento-cabe-no-disponivel.md)) e para os votos sem rastro no diário ([parecer 08](../analysis/cetico-revisor/08-votos-sem-log-contingencia.md)); demais cargos aguardam | [tópico 5](05-soma-dos-boletins.md) |
| H04 | Arquivos publicados alterados, ou gerados fora de uma urna oficial | Impressões digitais (hash) e assinaturas digitais de cada arquivo | Impressões digitais refeitas em todas as 499.207 seções, nos dois turnos, sem falha (tópico 0). Assinaturas: 0 falhas nas 2.270 seções do Acre e em 2 seções do ES. País inteiro em andamento | em teste | não; Acre e ES recontados nesta verificação | [tópico 1](01-integridade-e-estrutura-dos-arquivos.md) |
| H05 | Mesários liberando outras pessoas no lugar de eleitores da seção, sem digital | Divisão do voto dos eleitores a mais entre 13 e 22, conforme a forma de liberação; seções de comparecimento muito alto | O eleitor a mais liberado sem digital votou como o liberado com digital. O teste não enxerga inserção uniforme num estado, pequena e espalhada, igual nos dois turnos, ou em poucas seções | aberta | sim, em parte (pareceres [06](../analysis/cetico-revisor/06-comparecimento-extra-sem-vies-biometria.md) e [10](../analysis/cetico-revisor/10-a7-comparecimento-alto-sem-digital.md)) | [tópico 8, Limites](08-virada-do-2-turno.md#limites-o-que-estes-números-não-provam) |
| H06 | A prorrogação do horário de votação favoreceu um lado | Votos depois das 17h de Brasília, por seção | 34.330 votos depois das 17h de Brasília no Brasil (0,027% dos votos), menos de 1% da diferença final entre os dois candidatos: pouco demais para mudar o resultado | em teste | não; números recontados nesta verificação | [linha do tempo 02](../analysis/linha-do-tempo/02-votos-apos-17h.md) |
| H07 | Urnas antigas colocadas de propósito onde se quer dispensar a digital | Liberação sem digital por modelo de urna, dentro da mesma zona | No Brasil, todos os modelos liberam eleitores por digital. O modelo quase não muda a liberação por ano de nascimento; muda a liberação depois de digital que falhou | **refutada** (a premissa: todo modelo lê digital) | não; números recontados nesta verificação | [biometria 06](../analysis/biometria-mesarios/06-h07-modelo-urna.md) |
| H08 | Votos em sequência rápida demais para uma pessoa | Intervalo entre votos, no diário da urna | Fora de 3 seções cujo diário a ferramenta da auditoria leu errado (diário repetido ou misturado com o de outra seção), o menor intervalo entre dois votos no país é 16 segundos. O ciclo de eleitor desses votos: **Pendente: em verificação** | aberta | não; intervalos recontados nesta verificação | [linha do tempo 03](../analysis/linha-do-tempo/03-intervalos-minimos.md) |
| H09 | Os arquivos públicos permitem descobrir em quem uma pessoa votou | Ordem dos votos no registro; busca de um número de título dentro dos arquivos | Ordem dos votos no registro e busca do título: **Pendente: em verificação**. Sete arquivos que a urna gera não estão publicados | aberta | não | [../hipoteses.md](../hipoteses.md) |
| H10 | O vencedor cresceu do 1º para o 2º turno mais do que havia de votos disponíveis | Conta de votos disponíveis (eliminados, brancos e nulos, quem passou a votar), no país, por município e por seção | A conta fecha. Pela definição da própria hipótese, nenhum município do país passa do limite | **refutada** | sim ([parecer 05](../analysis/cetico-revisor/05-h10-crescimento-cabe-no-disponivel.md)), sustentado com ressalvas | [tópico 8](08-virada-do-2-turno.md) |
| H11 | O mesmo cartão de memória usado em mais de uma urna, ou resultado trocado no caminho | Números de série das mídias e da urna em cada seção | Acre, 2º turno: nenhuma mídia de resultado, de votação ou urna repetida. País inteiro pendente | em teste | não; Acre recontado nesta verificação | [../hipoteses.md](../hipoteses.md) |
| H12 | O QR do título digital (e-Título) entrega os dados usados para liberar sem digital, e pode ser forjado | Leitura do conteúdo do QR | **Pendente: em verificação** (a leitura foi feita fora do repositório e ainda não foi refeita) | aberta | não | [../hipoteses.md](../hipoteses.md) |
| H13 | Liberação sem digital ligada a voto no 13 no Nordeste | Limites aritméticos de cada seção (mínimo e máximo de liberados que podem ter votado em cada candidato); modelos estatísticos, fora deste relatório | Nordeste: de 3,41% a 99,93% dos 4.269.379 liberados sem digital podem ter votado no 13; no pior caso para o 13 ele ainda venceria por 166.144. No Brasil inteiro, o pior caso aritmético inverteria o resultado: a aritmética não fecha a porta | em teste | sim, [parecer 15](../analysis/cetico-revisor/15-h13-liberacao-mesario.md) (estimativas); limites recalculados com duas contas | [tópico 4, item 6.4](04-liberacao-dos-eleitores.md) |

## Hipótese por hipótese

### H01. Títulos de pessoas falecidas

- **Fato (revisado):** o cadastro de 2026 tem 297.977 eleitores de 100 anos ou mais com domicílio no Brasil. O Censo 2022 contou 149.424 pessoas de 96+, a geração que chega aos 100+ em 2026. Mesmo supondo que ninguém dessa geração morreu em quatro anos, sobram **148.553 títulos sem pessoa correspondente**. Esse número é um **piso**: o real só pode ser maior. 92,0% dos eleitores de 100+ não têm digital cadastrada.
- **Hipótese (estimativa de modelo, revisada):** com a mortalidade medida pelo IBGE, o excesso fica entre cerca de 235 mil e 260 mil.
- **Fato (revisado, contagem oficial do TSE, 1º turno):** compareceram 2.141 dos 298.239 aptos de 100+ (0,72%; este total inclui o exterior). Nos 1.068 municípios com mais títulos 100+ do que moradores 96+, compareceram 0,26%.
- **Pode-se afirmar:** o cadastro tem títulos de pessoas que provavelmente morreram, concentrados em RJ, SP, MG e RS, e no 1º turno esses títulos não foram usados de forma sistemática.
- **Não se pode afirmar:** que nenhum desses títulos votou. A contagem do 1º turno é do próprio TSE e não pode ser refeita com os arquivos das urnas. No 2º turno, ainda sem a contagem oficial por idade, o teste só descarta uso acima de cerca de 10% desses títulos (cerca de 30 mil votos). Uso menor, ou em poucas seções, não é detectável por este método. Detalhes no [tópico 6](06-titulos-de-falecidos.md).

### H02. Taxa fora do normal de liberação sem digital

- **Fato (revisado):** em 16.011 das 497.508 seções do 2º turno analisadas (3,2%), o boletim registra mais eleitores liberados "sem biometria cadastrada" do que o cadastro público tem. O excesso soma 36.340 eleitores, 0,03% dos votos. Em nenhuma seção votou mais gente do que os aptos.
- **Fato (revisado), conferido em grupos de seções:** nos grupos de seções que o revisor conferiu, esses eleitores aparecem no diário da urna com a mensagem "Foto do eleitor apresentada" e sem pedido de digital. Ou seja, o arquivo de eleitores carregado na urna tinha a foto, mas não a digital deles, e o cadastro público os conta como "com biometria". **Fato** ([tópico 4](04-liberacao-dos-eleitores.md), item 3, e [tópico 6](06-titulos-de-falecidos.md)): nas 378 seções com excesso de 10 ou mais, todas elas, 84,8% dos atendimentos sem biometria mostram a foto, e sem esses atendimentos o excesso delas cai de 5.560 para 54. **Pendente:** fora dessas 378, a conferência foi feita em grupos de seções, não nas 16.011, e por isso a parte do excesso que ela explica não é repetida aqui. A medida em todas elas depende do número oficial de eleitores com digital carregada por seção, a pedir ao TSE.
- **Hipótese (revisada):** são eleitores com foto registrada e digital pendente, rejeitada ou de má qualidade. O dado público não distingue isso de outras causas que deixam o mesmo rastro.
- **Risco (princípio 8):** esses eleitores foram liberados só com o número do título e o ano de nascimento, e a conferência da foto é feita por uma pessoa, sem rastro técnico. O tamanho total desse grupo no país **não foi medido** no universo completo (as estimativas do revisor vêm de amostras e não são repetidas aqui).
- **Pode-se afirmar:** o excesso sobre o cadastro não é contagem impossível, porque em nenhuma seção votou mais gente do que os aptos; e, nas seções conferidas, ele tem explicação técnica registrada no próprio diário da urna.
- **Não se pode afirmar:** que a brecha não foi usada em poucas seções. O dado não mostra uso sistemático, mas também não o exclui em escala local.

### H03. Soma das urnas × resultado oficial

- **Fato (revisado no parecer 05 e recontado nesta verificação):** no 2º turno, para Presidente, a soma dos boletins é igual ao resultado oficial seção a seção, nas 499.205 seções com boletim de Presidente. Diferença zero, nenhuma seção só de um lado.
- **Fato (recontado nesta verificação, universo completo):** no 1º turno, para Presidente, as 499.206 seções com boletim de Presidente (28 UFs) têm o boletim igual ao resultado oficial em todos os números (candidatos, brancos e nulos), sem nenhuma seção só de um lado; 125.275.835 votos de cada lado (`scripts/auditoria/verifica-pericia-coerencia-topicos.mjs --turno 1`, com o oficial lido direto do CSV do TSE; a mesma igualdade está no [tópico 8](08-virada-do-2-turno.md), por outro script). O parecer 05 já a tinha sustentado nas 389.857 seções das 25 UFs então carregadas.
- **Pendente: em verificação:** a comparação dos demais números do 2º turno (governador, comparecimento, brancos, nulos, votos de legenda) com o oficial ([coerência 01](../analysis/coerencia-contagem/01-bu-x-oficial.md)).
- **Fato (revisado no parecer 08):** no 2º turno, das 499.207 seções completas, só 3 têm votos no boletim sem nenhuma linha de voto computado num diário publicado, num total de 50 votos. As 3 usaram urna de contingência (urna reserva): MA 08893/0047/0609 (36 votos), BA 35653/0173/0235 (13) e RS 89060/0017/0191 (1). Nessas seções o boletim e o registro dos votos fecham entre si, o boletim é igual ao resultado oficial e as assinaturas da urna conferem. No MA e na BA, os arquivos mostram como o diário se perdeu: uma urna com a carga de outra seção ligou com a mídia da seção, gravou o próprio diário e só depois recusou a mídia; a contingência seguinte guardou esse diário, e não o da urna que recebeu os votos. No RS o fim do diário se perdeu numa queda da urna.
- **Risco (princípio 8, revisado no parecer 08):** nenhum arquivo público prova, voto a voto, que esses 50 votos vieram de eleitores. O risco continua aberto nos 13 votos da BA, onde houve também a recarga da urna original em campo, no dia da eleição, com a carga de outra seção.
- **Pode-se afirmar:** nenhum voto de Presidente foi somado, tirado ou trocado entre a urna e o resultado divulgado no 2º turno.
- **Não se pode afirmar:** que os votos registrados pelas urnas são todos legítimos. Um voto dado no lugar de outra pessoa está no boletim e no resultado oficial, e os dois batem. Ver o [tópico 5](05-soma-dos-boletins.md).

### H04. Arquivos alterados ou gerados fora de urna oficial

- **Fato (recontado nesta verificação, 2º turno):** a conferência completa das impressões digitais e das assinaturas digitais (`src/lacres.js`) deu 0 falhas nos 3.310 pacotes de arquivos das 2.270 seções do Acre e nas 25 conferências de cada uma das seções ES 57037/0055/0372 e 0364 (nesta, nos dois turnos).
- **Fato:** a impressão digital de cada arquivo publicado (boletim, registro dos votos, diário e boletim impresso) foi refeita e comparada com a nota fiscal da urna nas 499.207 seções, nos dois turnos (1.996.828 arquivos por turno), com 0 falhas ([tópico 0](00-coleta-completa.md)). Ela mostra que os arquivos não mudaram depois de a urna anotá-los. Não mostra, sozinha, que a anotação foi feita por uma urna oficial: isso exige conferir a assinatura de cada urna.
- **Pendente:** a conferência das assinaturas no país inteiro, em andamento.
- **Não se pode afirmar:** que o programa da urna está correto por dentro. Um dos dois lacres usa um método secreto do governo (CEPESC) que ninguém de fora consegue conferir. Ver o [tópico 1](01-integridade-e-estrutura-dos-arquivos.md).

### H05. Mesários liberando outras pessoas sem digital

- **Fato (revisado), parcial:** comparando seções do mesmo estado, cada eleitor a mais do 1º para o 2º turno liberado **sem** digital se dividiu entre 13 e 22 do mesmo jeito que cada eleitor a mais liberado **com** digital. Diferença: +0,002 ± 0,002 para o 13, dentro do acaso. UFs incluídas: 25 (389.827 seções); faltam SP, TO e o exterior.
- **Alcance (revisado):** o teste exclui uma inserção que varie entre seções do mesmo estado a partir de cerca de 34 mil votos concentrados. Ele **não** exclui: inserção igual em todas as seções de um estado (na BA, até cerca de 355 mil votos passariam sem sinal); inserção pequena e espalhada; fraude do mesmo tamanho nos dois turnos, que se cancela na comparação; uso em poucas seções.
- **Hipótese (revisada):** no PR, a diferença é maior (+0,025 a favor do 13; +0,012 comparando seções do mesmo município). É ponto a examinar, não fato de inserção.
- **Fato (revisado):** no 2º turno, nenhuma das 499.207 seções completas tem comparecimento acima dos aptos; 639 passam de 95%. Nessas 639, a liberação depois de digital que falhou (o caminho para votar no lugar de um ausente que tem digital cadastrada) é igual à da própria zona: 7,58% contra 7,77%. Isso limita esse tipo de voto, no conjunto das 639, a cerca de 110 a 400 votos. Não testa fraude concentrada em poucas seções, fraude pelo ano de nascimento nem fraude que dispense a digital.
- **Fato (recontado nesta verificação, com correção):** nas 27 UFs, sem o exterior, comparando as mesmas 497.895 seções nos dois turnos, o comparecimento subiu 2.920.461 eleitores do 1º para o 2º turno. Desse aumento, 601.543 (20,6%) entraram sem digital (sem biometria cadastrada ou liberados depois de digital que falhou, pelos contadores do boletim). No 1º turno, 12,2% dos eleitores dessas seções tinham entrado sem digital. O aumento sem digital é bem menor que a diferença final entre os dois candidatos (4.430.191 votos).
- **Risco (princípio 8):** a liberação sem digital depende só do mesário. O registro mostra **como** o eleitor foi liberado, não **quem** estava na cabine.
- **Pode-se afirmar:** não há sinal de uso em massa dessa porta para um lado, no recorte testado.
- **Não se pode afirmar:** que ela não foi usada. O teste tem pontos cegos declarados acima.

### H06. Prorrogação do horário de votação

- **Fato:** a cópia da decisão do STF que mandou prorrogar o encerramento até as 19h de Brasília (Reclamação 101.673/BA, minuta publicada pela imprensa e guardada no repositório) foi lida. Ela determina a prorrogação "em todas as seções de todo o Brasil", cabendo ao TSE dar cumprimento. **Pendente:** a versão assinada no portal do STF e o ofício do TSE que a cumpriu.
- **Fato (recontado nesta verificação):** no 2º turno, no Brasil (sem o exterior), 34.330 votos foram dados depois das 17h de Brasília (0,027% dos votos), em 29.854 seções; 1.993 depois das 18h e 11 depois das 19h. 6.352 seções encerraram às 19h ou depois. Mesmo que todos os votos depois das 17h fossem de um lado, seriam menos de 1% da diferença final entre os dois candidatos (4.430.191 votos). Recorte da conta: votos por hora cheia no diário da urna, com o fuso de cada município tirado da hora de abertura mais comum.
- **Pendente: em verificação:** a comparação, dentro da mesma zona, entre a parcela do 13 e a quantidade de voto tardio de cada seção.
- **Risco (princípio 8):** a urna aceitou votos depois das 17h. Quem entra na fila nesse horário é decisão do mesário, sem trava técnica. **Pendente: em verificação:** a contagem de seções com voto depois de o mesário responder "SIM" a "todas as pessoas presentes já votaram?".
- **Pendente:** a comparação com o 1º turno depende do 1º turno completo.
- **Pode-se afirmar:** o volume de votos tardios é pequeno demais para mudar o resultado de Presidente.
- **Não se pode afirmar:** se cada um desses votos estava autorizado; isso depende do ato oficial de cada local.

### H07. Urnas antigas alocadas para dispensar a digital

- **Fato (recontado nesta verificação):** no Brasil (sem o exterior), todos os modelos de urna usados no 2º turno liberaram eleitores por digital. Nas urnas mais antigas (modelo 2013), 82,2% dos eleitores foram liberados por digital, e houve liberação por digital em 11.432 das 11.433 seções com esse modelo lido no diário (o banco conta 11.434, porque registra como 2013 uma urna de contingência da PB que o diário diz ser de 2015; ver [tópico 4](04-liberacao-dos-eleitores.md), item 5). No exterior, os boletins não registram nenhuma liberação por digital.
- **Fato (recalculado no [tópico 4](04-liberacao-dos-eleitores.md), item 5, com o modelo lido no diário de cada urna):** comparando seções da mesma zona, sem outros controles, a liberação por ano de nascimento quase não muda com o modelo: −0,21 ponto na urna de 2013 em relação à de 2022, no 2º turno. A liberação depois de digital que falhou é maior nas urnas antigas: +4,3 pontos na de 2013 e +3,2 na de 2015. Isso alarga a brecha humana nessas urnas. O autor do achado usou mais controles (cadastro, idade, tamanho) e chegou a valores próximos, que não foram refeitos e por isso não são repetidos aqui. Fonte do achado: [biometria 06](../analysis/biometria-mesarios/06-h07-modelo-urna.md).
- **Pode-se afirmar:** a premissa de que urna antiga não exige digital não se confirma nos dados do Brasil.
- **Não se pode afirmar:** por que as urnas antigas estão onde estão (logística ou escolha). O status no registro continua **aberta**.

### H08. Votos rápidos demais para uma pessoa

- **Fato (recontado nesta verificação):** das 499.207 seções completas do 2º turno, 499.177 têm voto no diário da urna. Em 3 delas (BA 39870/0133/0184, ES 57932/0009/0085 e MG 40690/0016/0264, todas com três diários no mesmo pacote), a ferramenta de leitura da auditoria soma duas vezes o diário da urna original (BA e MG) ou mistura o diário de outra seção que veio no pacote (ES), e mostra intervalo zero (conferido no diário original, [tópico 3](03-linha-do-tempo.md), item 5); é erro do programa de leitura, em correção, e o menor intervalo real dessas 3 está **Pendente: em verificação**. Nas demais, o menor intervalo entre dois votos é de 16 segundos, em 3 seções. Fonte do achado: [linha do tempo 03](../analysis/linha-do-tempo/03-intervalos-minimos.md).
- **Pendente: em verificação:** que esses votos mais rápidos tiveram ciclo completo de eleitor (número digitado, liberação, confirmação) e que nenhum voto do país ficou sem ciclo de eleitor.
- **Não se pode afirmar:** quem digitou cada voto. O tempo do ciclo é compatível tanto com o eleitor quanto com outra pessoa na cabine (ver H05).

### H09. Arquivos públicos permitem saber em quem alguém votou

- **Pendente: em verificação:** que o registro dos votos vem ordenado por tipo e digitação, e não na ordem em que os eleitores votaram, em todas as seções. Até agora isso foi observado na seção estudada em detalhe ([../06-leitura-bu-rdv-log.md](../06-leitura-bu-rdv-log.md)), não no universo.
- **Pendente: em verificação:** a busca de um número de título dentro dos arquivos do ES, feita a pedido do próprio titular. O número fica fora do repositório e a busca ainda não foi refeita.
- **Fato (recontado nesta verificação, 2º turno):** a urna gera e lista no pacote de lacres sete arquivos que não estão publicados (`jufa.dat`, `imgze.dat`, `hash.dat`, `mr.ver` e os três `wsq…jez`, entre eles as imagens de digitais). Os sete aparecem listados em todos os 3.310 pacotes do Acre, e nenhum deles está dentro dos 28 pacotes por estado do 2º turno (27 UFs e exterior).
- **Não se pode afirmar:** que o sigilo é garantido contra todo método. A busca não cobre códigos feitos com chave secreta, e a análise de seções pequenas ainda não foi feita.

### H10. Crescimento maior que o disponível

- **Fato (revisado):** do 1º para o 2º turno, o 13 ganhou 10.376.694 votos e o 22 ganhou 3.721.538. A soma é exatamente o que estava disponível: votos dos eliminados (9.321.993), queda de brancos e nulos (1.816.000) e aumento de comparecimento (2.960.239), total de 14.098.232. O 13 ficou com 73,6% disso; em 2018 o maior finalista ficou com 64,8% e em 2022 com 69,8%.
- **Fato (revisado):** pela definição da própria hipótese, nenhum dos 5.757 municípios passa do limite. A hipótese, como foi escrita, é falsa. Por isso o status é **refutada**.
- **Fato com leitura em Hipótese (revisado):** o 22 perdeu votos em 6 UFs (AC, AP, RR, MA, AM, TO), todas com queda de comparecimento. Em AC, AP e RR, a queda explica cerca de 80% a 88% da perda. Em MA, AM e TO, não: lá a perda exige que eleitores tenham trocado do 22 para o 13, ou que eleitores diferentes tenham votado em cada turno. Nenhuma das duas coisas é, por si, indício de fraude, e nenhuma foi testada.
- **Não se pode afirmar:** que a conta fechar prova ausência de fraude. Essa conta é uma **identidade contábil**: ela sempre fecha quando os votos somam o comparecimento, e só acusa algo quando o outro finalista perde votos. Uma troca de votos do 22 para o 13 abaixo de 6,2% dos votos do 22 passaria sem alarme. Os outros testes da virada estão no [tópico 8](08-virada-do-2-turno.md).

### H11. Mesma mídia em várias urnas, ou resultado trocado no caminho

- **Fato (recontado nesta verificação):** no Acre, 2º turno (2.270 seções), nenhum número de série de mídia de resultado, de mídia de votação ou de urna se repete, e a mídia de votação do boletim é a mesma do diário nas 2.270. As 88 mídias de carga se repetem entre seções, como se espera da preparação em lote (uma mídia carrega várias urnas): 86 delas ficam dentro de uma só zona e 2 aparecem em duas zonas (33 e 34 seções).
- **Pendente:** o país inteiro.
- **Não se pode afirmar:** nada sobre o caminho da urna até a totalização além do que as assinaturas cobrem (H04). Os registros de transmissão só são entregues a entidades fiscalizadoras.

### H12. QR do e-Título

- **Pendente: em verificação:** o conteúdo do QR do e-Título. A leitura feita até agora foi a pedido do titular, com dados guardados fora do repositório, e ainda não foi refeita. Por isso nenhuma conclusão sobre o formato do QR entra neste relatório.
- **Risco (princípio 8):** a regra de aceitar o e-Título só com foto e a conferência do documento são feitas por pessoas e não deixam rastro no diário da urna.
- **Pendente:** confirmar o formato em vários e-Títulos e se o validador do TSE confere o código pela internet.
- **Não se pode afirmar:** que esse caminho foi usado em alguma seção.

### H13. Liberação sem digital e voto no 13 no Nordeste

- **Fato (recalculado com duas contas):** no Nordeste, 4.269.379 votantes foram liberados sem digital no 2º turno (11,75% do comparecimento da região, menos que no Sudeste, com 13,97%, e no Sul, com 12,26%). A aritmética de cada seção permite que de 3,41% a 99,93% deles tenham votado no 13. Anulando esses votos no pior caso para o 13, ele ainda venceria no país por 166.144 votos.
- **Fato (recalculado com duas contas):** com os 15.884.298 liberados sem digital do Brasil inteiro (sem o exterior), o pior caso aritmético inverteria o resultado (−11.119.111). A aritmética, sozinha, não descarta que essa porta tenha decidido a eleição. Isso não é sinal de fraude: é o tamanho da porta.
- **Fora deste relatório (estimativa):** em quem os liberados de fato votaram, e que tamanho de fraude os testes conseguiriam ver, foi estimado por cinco métodos estatísticos e revisado pelo cético ([síntese](../analysis/hipotese-liberacao-mesario/00-sintese.md), [parecer 15](../analysis/cetico-revisor/15-h13-liberacao-mesario.md)). São estimativas de modelo, e por isso nenhum número delas entra aqui.
- Detalhe, tabela por região e fonte: [tópico 4, item 6.4](04-liberacao-dos-eleitores.md).

## Testes revisados que não têm número de hipótese

- **Eleitores acima da população ([parecer 04](../analysis/cetico-revisor/04-eleitorado-acima-populacao.md), sustentado com ressalvas). Fato (revisado):** em 2.898 dos 5.570 municípios (52%) o cadastro tem mais eleitores de 16+ do que o Censo 2022 tem moradores de 12+. Isso se concentra em municípios pequenos. No 2º turno, em 120 municípios votou mais gente do que a população total contada em 2022. Os títulos a mais **votam** (cerca de 60% a 70%), com a mesma parcela de digital da UF, o que indica pessoas reais com domicílio eleitoral fora de onde moram, e não títulos fantasmas em massa. **Risco (princípio 8):** a conferência do domicílio é feita por pessoas; os dados não separam mudança de cidade com título mantido, vínculo legítimo e transferência irregular. Para Presidente, o local do voto não muda o total nacional; o risco recai sobre eleições municipais e estaduais.
- **Concentração de votos em seções (forense estatística): Pendente: em verificação.** O achado sobre seções com votação muito concentrada num candidato ([forense 07](../analysis/forense-estatistica/07-assimetria-e-sintese.md)) ainda não foi refeito nem revisado, e por isso nenhum número dele entra aqui.

## Limites deste quadro

- O status de cada hipótese é o do registro em 29/10/2026 e pode mudar com novos testes.
- Alguns números do 1º turno são **parciais** (faltam SP, TO e o exterior), porque a fonte foi feita antes da carga completa. Eles serão refeitos com o total antes da versão final.
- Os itens **recontados nesta verificação** ainda não têm parecer do revisor cético e podem mudar de alcance depois dele. Os itens **Pendente: em verificação** não têm número porque ainda não foram refeitos.
- Nenhum teste aqui olha para o programa da urna por dentro. Isso depende do Teste de Integridade e da conferência das assinaturas, tratados nos tópicos 1 e 8.

## Como repetir

Cada parecer do revisor cético traz, no fim, os comandos que refazem as contas. Os principais:

```
node scripts/auditoria/cetico-centenarios-excesso-consolidacao.mjs        # H01, excesso no cadastro
node scripts/auditoria/cetico-centenarios-nao-votam-oficial.mjs           # H01, comparecimento oficial dos 100+
node scripts/auditoria/cetico-b1a-definicoes.mjs --turno 2                # H02, excesso sobre o cadastro
node --max-old-space-size=4096 scripts/auditoria/cetico-h10-consolidacao.mjs   # H10 e H03 do 1º turno
node scripts/auditoria/cetico-e2bio-consolidacao.mjs                      # H05, divisão do voto a mais
node scripts/auditoria/cetico-a7-reproducao.mjs                           # H05, comparecimento alto
node scripts/auditoria/cetico-vsl-consolidacao.mjs                        # H03, votos sem rastro no diário
node scripts/auditoria/cetico-eleitorado-acima-populacao-consolidacao.mjs # eleitores acima da população
```

A conferência deste tópico (cópia de leitura do banco e perfis por seção dos dois turnos; H03 Presidente do 2º turno, H05 aumento de comparecimento, H06, H07, H08 e H11) e a das assinaturas (H04 e os sete arquivos de H09):

```
node --max-old-space-size=8192 scripts/auditoria/verifica-pericia-quadro.mjs
node src/lacres.js data/raw/2t/urnas/ac
node src/lacres.js data/raw/2t/urnas/es/57037/0055/0372
node src/lacres.js data/raw/2t/urnas/es/57037/0055/0364
node --max-old-space-size=8192 scripts/auditoria/verifica-pericia-coerencia-topicos.mjs --turno 1   # H03, 1º turno completo
unzip -Z1 data/raw/2t/zip/<pacote da UF>.zip | grep -E "(jufa\.dat|imgze\.dat|-hash\.dat|mr\.ver|wsq(bio|man|mes)\.jez)$"
```

## Próximos passos

- **Pendente:** revisão cética de H03 (demais cargos), H04, H06, H07, H08, H09, H11 e H12.
- **Pendente:** refazer os itens marcados **Pendente: em verificação**.
- **Pendente:** refazer com o 1º turno completo os números marcados como parciais.
- **Pendente:** conferência das assinaturas e dos números de série no país inteiro (H04, H11).
- **Pendente:** H13 com a liberação contada no log (mesário identificado), depois que os perfis dos logs forem regerados.
- **Pendente:** pedidos pela Lei de Acesso à Informação: critério de "com biometria" no cadastro e número de eleitores com digital carregada por seção (H02), comparecimento dos 100+ no 2º turno e cancelamentos por óbito (H01).
