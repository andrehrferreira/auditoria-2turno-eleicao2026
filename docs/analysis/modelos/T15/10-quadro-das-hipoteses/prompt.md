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

## Tópico em revisão: 10-quadro-das-hipoteses.md

# 10. Quadro geral das hipóteses de fraude testadas

> **Situação:** escrito em 29/10/2026 a partir do registro de hipóteses ([../hipoteses.md](../hipoteses.md)) e dos pareceres do revisor cético ([../analysis/cetico-revisor/](../analysis/cetico-revisor/)). O que ainda não passou pelo revisor cético está marcado **aguarda revisão cética**. Os números do 1º turno que vêm de dados ainda em carga estão marcados **parcial**.

## A pergunta

Quais suspeitas de fraude foram testadas nos arquivos das urnas de 2026, como cada uma foi testada, e o que se concluiu até agora?

## Resposta curta

- **Fato:** 13 hipóteses estão registradas (H01 a H13). Uma foi **refutada** (H10, "o crescimento de um finalista não cabe nos votos disponíveis"). Nenhuma foi **sustentada**. As outras estão **abertas** ou **em teste**.
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
- **Universo completo:** a auditoria só aceita números tirados de **todas** as seções, nunca de amostra (princípio 9 de [../01-premissas.md](../01-premissas.md)). O 2º turno está completo. O 1º turno ainda está sendo carregado no banco de dados; onde a fonte usou só parte dele, o texto diz **parcial** e quais estados faltam.

## O quadro

| # | A suspeita, em palavras simples | O que foi testado | Resultado até agora | Status | Revisão cética | Onde ler mais |
|---|---|---|---|---|---|---|
| H01 | Votos dados com títulos de pessoas que já morreram | Eleitores de 100 anos ou mais no cadastro × população do Censo 2022; comparecimento desse grupo | Cadastro com pelo menos 148.553 títulos de 100+ sem pessoa correspondente. 1º turno: compareceram 0,72% dos 100+ (contagem do TSE). Sem uso sistemático no 1º turno; no 2º, só se descarta uso acima de ~10% desses títulos | em teste | sim (pareceres [02](../analysis/cetico-revisor/02-centenarios-excesso-cadastro.md) e [03](../analysis/cetico-revisor/03-centenarios-nao-votam.md)), sustentado com ressalvas | [tópico 6](06-titulos-de-falecidos.md) |
| H02 | Seções com quantidade fora do normal de eleitores liberados sem digital | Eleitores "sem biometria" no boletim × cadastro, seção a seção | 16.011 seções com mais "sem biometria" no boletim do que no cadastro. Não é contagem impossível: é diferença de definição (foto sem digital no arquivo da urna). A brecha humana continua | aberta | sim, a parte do excesso sobre o cadastro ([parecer 01](../analysis/cetico-revisor/01-b1a-sem-biometria-acima-do-cadastro.md)), sustentado com ressalvas | [tópico 8, Limites](08-virada-do-2-turno.md#limites-o-que-estes-números-não-provam) |
| H03 | A soma das urnas é diferente do resultado oficial | Boletim de cada urna × resultado oficial, seção a seção | 2º turno, Presidente: igual em todas as 499.205 seções. 1º turno, Presidente: igual nas 25 UFs carregadas (**parcial**). Demais cargos: igual no 2º turno | em teste | sim para Presidente ([parecer 05](../analysis/cetico-revisor/05-h10-crescimento-cabe-no-disponivel.md)); demais cargos aguardam | [tópico 5](05-soma-dos-boletins.md) |
| H04 | Arquivos publicados alterados, ou gerados fora de uma urna oficial | Impressões digitais (hash) e assinaturas digitais de cada arquivo | 0 falhas nas 2.270 seções do Acre e na seção detalhada do ES. País inteiro em andamento | em teste | não | [tópico 1](01-integridade-e-estrutura-dos-arquivos.md) |
| H05 | Mesários liberando outras pessoas no lugar de eleitores da seção, sem digital | Divisão do voto dos eleitores a mais entre 13 e 22, conforme a forma de liberação; seções de comparecimento muito alto | O eleitor a mais liberado sem digital votou como o liberado com digital. O teste não enxerga inserção uniforme num estado, pequena e espalhada, igual nos dois turnos, ou em poucas seções | aberta | sim, em parte (pareceres [06](../analysis/cetico-revisor/06-comparecimento-extra-sem-vies-biometria.md) e [10](../analysis/cetico-revisor/10-a7-comparecimento-alto-sem-digital.md)) | [tópico 8, Limites](08-virada-do-2-turno.md#limites-o-que-estes-números-não-provam) |
| H06 | A prorrogação do horário de votação favoreceu um lado | Votos depois das 17h de Brasília, por seção | 34.330 votos depois das 17h (0,027%) e 1.993 depois das 18h; nenhum efeito mensurável no resultado | em teste | não, **aguarda revisão cética** | [linha do tempo 02](../analysis/linha-do-tempo/02-votos-apos-17h.md) |
| H07 | Urnas antigas colocadas de propósito onde se quer dispensar a digital | Liberação sem digital por modelo de urna, dentro da mesma zona | Todos os modelos leem digital. O modelo não muda a liberação por ano de nascimento; muda a liberação depois de digital que falhou | aberta | não, **aguarda revisão cética** | [biometria 06](../analysis/biometria-mesarios/06-h07-modelo-urna.md) |
| H08 | Votos em sequência rápida demais para uma pessoa | Intervalo entre votos e entre liberação e voto, no diário da urna | Menor intervalo entre dois votos no país: 16 segundos, com ciclo completo de eleitor. Nenhum voto sem ciclo de eleitor | aberta | não, **aguarda revisão cética** | [linha do tempo 03](../analysis/linha-do-tempo/03-intervalos-minimos.md) |
| H09 | Os arquivos públicos permitem descobrir em quem uma pessoa votou | Ordem dos votos no registro; busca de um número de título dentro dos arquivos | O registro dos votos vem ordenado, não na ordem de votação. Um título procurado em 43 formas não apareceu em nenhum dos 49.253 arquivos do ES do 2º turno | aberta | não, **aguarda revisão cética** | [../hipoteses.md](../hipoteses.md) |
| H10 | O vencedor cresceu do 1º para o 2º turno mais do que havia de votos disponíveis | Conta de votos disponíveis (eliminados, brancos e nulos, quem passou a votar), no país, por município e por seção | A conta fecha. Pela definição da própria hipótese, nenhum município do país passa do limite | **refutada** | sim ([parecer 05](../analysis/cetico-revisor/05-h10-crescimento-cabe-no-disponivel.md)), sustentado com ressalvas | [tópico 8](08-virada-do-2-turno.md) |
| H11 | O mesmo cartão de memória usado em mais de uma urna, ou resultado trocado no caminho | Números de série das mídias e da urna em cada seção | Acre: nenhuma mídia de resultado, de votação ou urna repetida. País inteiro pendente | em teste | não | [../hipoteses.md](../hipoteses.md) |
| H12 | O QR do título digital (e-Título) entrega os dados usados para liberar sem digital, e pode ser forjado | Leitura do conteúdo do QR | Em 1 e-Título lido: o QR é texto aberto, sem assinatura nem cifra, com número de inscrição e data de nascimento | aberta | não, **aguarda revisão cética** | [../hipoteses.md](../hipoteses.md) |
| H13 | Liberação sem digital ligada a voto no 13 no Nordeste | Comparação de cada seção com ela mesma entre os turnos, entre outros métodos | Sem resultado publicado ainda | sem status no registro (em andamento) | não | **Pendente** |

## Hipótese por hipótese

### H01. Títulos de pessoas falecidas

- **Fato (revisado):** o cadastro de 2026 tem 297.977 eleitores de 100 anos ou mais com domicílio no Brasil. O Censo 2022 contou 149.424 pessoas de 96+, a geração que chega aos 100+ em 2026. Mesmo supondo que ninguém dessa geração morreu em quatro anos, sobram **148.553 títulos sem pessoa correspondente**. Esse número é um **piso**: o real só pode ser maior. 92,0% desses eleitores não têm digital cadastrada.
- **Hipótese (estimativa de modelo, revisada):** com a mortalidade medida pelo IBGE, o excesso fica entre cerca de 235 mil e 260 mil.
- **Fato (revisado, contagem oficial do TSE, 1º turno):** compareceram 2.141 dos 298.239 aptos de 100+ (0,72%). Nos 1.068 municípios com mais títulos 100+ do que moradores 96+, compareceram 0,26%.
- **Pode-se afirmar:** o cadastro tem títulos de pessoas que provavelmente morreram, concentrados em RJ, SP, MG e RS, e no 1º turno esses títulos não foram usados de forma sistemática.
- **Não se pode afirmar:** que nenhum desses títulos votou. A contagem do 1º turno é do próprio TSE e não pode ser refeita com os arquivos das urnas. No 2º turno, ainda sem a contagem oficial por idade, o teste só descarta uso acima de cerca de 10% desses títulos (cerca de 30 mil votos). Uso menor, ou em poucas seções, não é detectável por este método. Detalhes no [tópico 6](06-titulos-de-falecidos.md).

### H02. Taxa fora do normal de liberação sem digital

- **Fato (revisado):** em 16.011 das 497.508 seções do 2º turno analisadas (3,2%), o boletim registra mais eleitores liberados "sem biometria cadastrada" do que o cadastro público tem. O excesso soma 36.340 eleitores, 0,03% dos votos. Em nenhuma seção votou mais gente do que os aptos.
- **Fato (revisado):** esses eleitores aparecem no diário da urna com a mensagem "Foto do eleitor apresentada" e sem pedido de digital. Ou seja, o arquivo de eleitores carregado na urna tinha a foto, mas não a digital deles, e o cadastro público os conta como "com biometria". Nos grupos de seções conferidos pelo revisor, contar como "sem biometria" só quem também não tem foto faz o excesso cair cerca de 99%. **Pendente:** essa conferência foi feita em grupos de seções, não nas 16.011; a medida em todas elas depende do número oficial de eleitores com digital carregada por seção, a pedir ao TSE.
- **Hipótese (revisada):** são eleitores com foto registrada e digital pendente, rejeitada ou de má qualidade. O dado público não distingue isso de outras causas que deixam o mesmo rastro.
- **Risco (princípio 8):** esses eleitores foram liberados só com o número do título e o ano de nascimento, e a conferência da foto é feita por uma pessoa, sem rastro técnico. O tamanho total desse grupo no país **não foi medido** no universo completo (as estimativas do revisor vêm de amostras e não são repetidas aqui).
- **Pode-se afirmar:** o excesso sobre o cadastro não é contagem impossível; tem explicação técnica registrada no próprio diário da urna.
- **Não se pode afirmar:** que a brecha não foi usada em poucas seções. O dado não mostra uso sistemático, mas também não o exclui em escala local.

### H03. Soma das urnas × resultado oficial

- **Fato (revisado no parecer 05):** no 2º turno, para Presidente, a soma dos boletins é igual ao resultado oficial seção a seção, nas 499.205 seções que votaram. Diferença zero.
- **Fato (revisado no parecer 05), parcial:** no 1º turno, para Presidente, 389.857 seções têm o boletim igual ao resultado oficial em todos os números, sem nenhuma divergência. UFs incluídas: 25; faltam SP, TO e o exterior.
- **Fato, aguarda revisão cética:** no 2º turno, os demais números (governador, comparecimento, brancos, nulos, votos de legenda) também batem com o oficial, em 538.946 pares de seção e cargo ([coerência 01](../analysis/coerencia-contagem/01-bu-x-oficial.md)).
- **Anomalia em exame, aguarda revisão cética:** 50 votos registrados no boletim sem rastro correspondente no diário, em 3 seções que usaram urna de contingência (urna reserva): MA 08893/0047/0609, BA 35653/0173/0235 e RS 89060/0017/0191.
- **Pode-se afirmar:** nenhum voto de Presidente foi somado, tirado ou trocado entre a urna e o resultado divulgado no 2º turno.
- **Não se pode afirmar:** que os votos registrados pelas urnas são todos legítimos. Um voto dado no lugar de outra pessoa está no boletim e no resultado oficial, e os dois batem. Ver o [tópico 5](05-soma-dos-boletins.md).

### H04. Arquivos alterados ou gerados fora de urna oficial

- **Fato, aguarda revisão cética:** a conferência completa das impressões digitais e das assinaturas digitais deu 0 falhas nas 2.270 seções do Acre e nas 24 conferências da seção ES 57037/0055/0372.
- **Fato:** as impressões digitais de todos os arquivos das 499.207 seções completas, nos dois turnos, conferem com as anotadas pela urna ([tópico 0](00-coleta-completa.md)). Isso mostra que os arquivos não mudaram depois de a urna anotá-los. Não mostra, sozinho, que a anotação foi feita por uma urna oficial: isso exige conferir a assinatura de cada urna.
- **Pendente:** a conferência das assinaturas no país inteiro, em andamento.
- **Não se pode afirmar:** que o programa da urna está correto por dentro. Um dos dois lacres usa um método secreto do governo (CEPESC) que ninguém de fora consegue conferir. Ver o [tópico 1](01-integridade-e-estrutura-dos-arquivos.md).

### H05. Mesários liberando outras pessoas sem digital

- **Fato (revisado), parcial:** comparando seções do mesmo estado, cada eleitor a mais do 1º para o 2º turno liberado **sem** digital se dividiu entre 13 e 22 do mesmo jeito que cada eleitor a mais liberado **com** digital. Diferença: +0,002 ± 0,002 para o 13, dentro do acaso. UFs incluídas: 25 (389.827 seções); faltam SP, TO e o exterior.
- **Alcance (revisado):** o teste exclui uma inserção que varie entre seções do mesmo estado a partir de cerca de 34 mil votos concentrados. Ele **não** exclui: inserção igual em todas as seções de um estado (na BA, até cerca de 355 mil votos passariam sem sinal); inserção pequena e espalhada; fraude do mesmo tamanho nos dois turnos, que se cancela na comparação; uso em poucas seções.
- **Hipótese (revisada):** no PR, a diferença é maior (+0,025 a favor do 13; +0,012 comparando seções do mesmo município). É ponto a examinar, não fato de inserção.
- **Fato (revisado):** no 2º turno, nenhuma das 499.207 seções completas tem comparecimento acima dos aptos; 639 passam de 95%. Nessas 639, a liberação depois de digital que falhou (o caminho para votar no lugar de um ausente que tem digital cadastrada) é igual à da própria zona: 7,58% contra 7,77%. Isso limita esse tipo de voto, no conjunto das 639, a cerca de 110 a 400 votos. Não testa fraude concentrada em poucas seções, fraude pelo ano de nascimento nem fraude que dispense a digital.
- **Fato, aguarda revisão cética:** nas 27 UFs, o aumento de comparecimento do 2º turno entrou 23,7% sem digital (12,7% na base), cerca de 480 mil votos, menos que a diferença final de 4,4 milhões.
- **Risco (princípio 8):** a liberação sem digital depende só do mesário. O registro mostra **como** o eleitor foi liberado, não **quem** estava na cabine.
- **Pode-se afirmar:** não há sinal de uso em massa dessa porta para um lado, no recorte testado.
- **Não se pode afirmar:** que ela não foi usada. O teste tem pontos cegos declarados acima.

### H06. Prorrogação do horário de votação

- **Fato:** a decisão do STF que mandou prorrogar o encerramento até as 19h de Brasília (Reclamação 101.673/BA) foi lida. Ela vale para todas as seções do país. **Pendente:** a versão assinada no portal do STF e o ofício do TSE que a cumpriu.
- **Fato, aguarda revisão cética:** no 2º turno, 34.330 votos foram dados depois das 17h de Brasília (0,027% dos votos), 1.993 depois das 18h e 11 depois das 19h. 6.352 seções encerraram às 19h ou depois. Mesmo que todos os votos depois das 17h fossem de um lado, seriam 0,8% da diferença final. Comparando seções da mesma zona, a parcela do 13 não muda com o voto tardio (−0,26 ponto). Fonte: [linha do tempo 02](../analysis/linha-do-tempo/02-votos-apos-17h.md).
- **Risco (princípio 8), aguarda revisão cética:** em 784 seções houve voto depois de o mesário responder "SIM" a "todas as pessoas presentes já votaram?". Depois das 17h, quem entra na fila é decisão do mesário, sem trava técnica.
- **Pendente:** a comparação com o 1º turno depende do 1º turno completo.
- **Pode-se afirmar:** o volume de votos tardios é pequeno demais para mudar o resultado de Presidente.
- **Não se pode afirmar:** se cada um desses votos estava autorizado; isso depende do ato oficial de cada local.

### H07. Urnas antigas alocadas para dispensar a digital

- **Fato, aguarda revisão cética:** todos os modelos de urna usados no 2º turno leem digital. Nas urnas mais antigas (modelo 2013), 82,2% dos eleitores foram liberados por digital. Comparando seções da mesma zona, o modelo não muda a liberação por ano de nascimento (diferença menor que 0,06 ponto). As urnas antigas têm mais liberação depois de digital que falhou (+3,0 a +4,0 pontos), o que alarga a brecha humana nessas urnas. Fonte: [biometria 06](../analysis/biometria-mesarios/06-h07-modelo-urna.md).
- **Pode-se afirmar, se a revisão cética confirmar:** a premissa de que urna antiga não exige digital não se confirma nos dados.
- **Não se pode afirmar:** por que as urnas antigas estão onde estão (logística ou escolha). O status no registro continua **aberta**.

### H08. Votos rápidos demais para uma pessoa

- **Fato, aguarda revisão cética:** nas 499.177 seções com voto no diário do 2º turno, o menor intervalo entre dois votos é de 16 segundos, com ciclo completo de eleitor (número digitado, liberação, confirmação). Os 339 intervalos menores que 15 segundos estavam em 3 seções e eram linhas repetidas na leitura do arquivo, não da urna (erro do programa de leitura da auditoria, em correção). Nenhum voto sem ciclo de eleitor. Fonte: [linha do tempo 03](../analysis/linha-do-tempo/03-intervalos-minimos.md).
- **Não se pode afirmar:** quem digitou cada voto. O tempo do ciclo é compatível tanto com o eleitor quanto com outra pessoa na cabine (ver H05).

### H09. Arquivos públicos permitem saber em quem alguém votou

- **Fato, aguarda revisão cética:** o registro dos votos vem ordenado por tipo e digitação, não na ordem em que os eleitores votaram. Um número de título, procurado a pedido do próprio titular em 43 formas diferentes, não apareceu em nenhum dos 49.253 arquivos do ES do 2º turno; o mesmo método achou 47 de 47 ocorrências de um identificador que se sabe estar nos arquivos (contraprova).
- **Fato:** sete arquivos que a urna gera e lista no pacote de lacres (entre eles as imagens de digitais) não estão publicados.
- **Não se pode afirmar:** que o sigilo é garantido contra todo método. A busca não cobre códigos feitos com chave secreta, e a análise de seções pequenas ainda não foi feita.

### H10. Crescimento maior que o disponível

- **Fato (revisado):** do 1º para o 2º turno, o 13 ganhou 10.376.694 votos e o 22 ganhou 3.721.538. A soma é exatamente o que estava disponível: votos dos eliminados (9.321.993), queda de brancos e nulos (1.816.000) e aumento de comparecimento (2.960.239), total de 14.098.232. O 13 ficou com 73,6% disso; em 2018 o maior finalista ficou com 64,8% e em 2022 com 69,8%.
- **Fato (revisado):** pela definição da própria hipótese, nenhum dos 5.757 municípios passa do limite. A hipótese, como foi escrita, é falsa. Por isso o status é **refutada**.
- **Fato com leitura em Hipótese (revisado):** o 22 perdeu votos em 6 UFs (AC, AP, RR, MA, AM, TO), todas com queda de comparecimento. Em AC, AP e RR, a queda explica cerca de 80% a 88% da perda. Em MA, AM e TO, não: lá a perda exige que eleitores tenham trocado do 22 para o 13, ou que eleitores diferentes tenham votado em cada turno. Nenhuma das duas coisas é, por si, indício de fraude, e nenhuma foi testada.
- **Não se pode afirmar:** que a conta fechar prova ausência de fraude. Essa conta é uma **identidade contábil**: ela sempre fecha quando os votos somam o comparecimento, e só acusa algo quando o outro finalista perde votos. Uma troca de votos do 22 para o 13 abaixo de 6,2% dos votos do 22 passaria sem alarme. Os outros testes da virada estão no [tópico 8](08-virada-do-2-turno.md).

### H11. Mesma mídia em várias urnas, ou resultado trocado no caminho

- **Fato, aguarda revisão cética:** no Acre (2.270 seções), nenhum número de série de mídia de resultado, de mídia de votação ou de urna se repete. As 88 mídias de carga aparecem cada uma em seções vizinhas da mesma zona, o que corresponde à preparação em lote.
- **Pendente:** o país inteiro.
- **Não se pode afirmar:** nada sobre o caminho da urna até a totalização além do que as assinaturas cobrem (H04). Os registros de transmissão só são entregues a entidades fiscalizadoras.

### H12. QR do e-Título

- **Fato, aguarda revisão cética:** em 1 e-Título lido (versão do app 2026.10.20, a pedido do titular, dados fora do repositório), o QR é texto aberto, sem assinatura nem cifra, e contém número de inscrição e data de nascimento, que são os dados usados para liberar um eleitor sem digital.
- **Risco (princípio 8):** a regra de aceitar o e-Título só com foto e a conferência do documento são feitas por pessoas e não deixam rastro no diário da urna.
- **Pendente:** confirmar o formato em outros e-Títulos e se o validador do TSE confere o código pela internet.
- **Não se pode afirmar:** que esse caminho foi usado em alguma seção.

### H13. Liberação sem digital e voto no 13 no Nordeste

- **Pendente:** a hipótese está em teste, com métodos já escritos (comparação de cada seção com ela mesma entre os turnos, limites de quanto os liberados sem digital podem ter votado em cada candidato, distribuição das liberações). Ainda não tem resultado documentado nem linha própria no registro. Nenhum número dela entra neste relatório até haver resultado e parecer do revisor cético.

## Testes revisados que não têm número de hipótese

- **Eleitores acima da população ([parecer 04](../analysis/cetico-revisor/04-eleitorado-acima-populacao.md), sustentado com ressalvas). Fato (revisado):** em 2.898 dos 5.570 municípios (52%) o cadastro tem mais eleitores de 16+ do que o Censo 2022 tem moradores de 12+. Isso se concentra em municípios pequenos. No 2º turno, em 120 municípios votou mais gente do que a população total. Os títulos a mais **votam** (cerca de 60% a 70%), com a mesma parcela de digital da UF, o que indica pessoas reais com domicílio eleitoral fora de onde moram, e não títulos fantasmas em massa. **Risco (princípio 8):** a conferência do domicílio é feita por pessoas; os dados não separam mudança de cidade com título mantido, vínculo legítimo e transferência irregular. Para Presidente, o local do voto não muda o total nacional; o risco recai sobre eleições municipais e estaduais.
- **Concentração de votos em seções (forense estatística), aguarda revisão cética:** seções com 90% ou mais dos votos para um candidato favorecem o 13 acima do esperado, mas a diferença some quando se compara com o perfil do eleitorado e fica concentrada em aldeias, quilombos e presídios ([forense 07](../analysis/forense-estatistica/07-assimetria-e-sintese.md)). O 1º turno é **parcial** (15 UFs).

## Limites deste quadro

- O status de cada hipótese é o do registro em 29/10/2026 e pode mudar com novos testes.
- Vários números do 1º turno são **parciais** (faltam SP, TO e o exterior, ou mais estados, conforme o item). Eles serão refeitos com o total antes da versão final.
- Os itens marcados **aguarda revisão cética** podem mudar de alcance depois do parecer.
- Nenhum teste aqui olha para o programa da urna por dentro. Isso depende do Teste de Integridade e da conferência das assinaturas, tratados nos tópicos 1 e 8.

## Como repetir

Cada parecer do revisor cético traz, no fim, os comandos que refazem as contas. Os principais:

```
node scripts/auditoria/cetico-centenarios-excesso-consolidacao.mjs        # H01, excesso no cadastro
node scripts/auditoria/cetico-centenarios-nao-votam-oficial.mjs           # H01, comparecimento oficial dos 100+
node scripts/auditoria/cetico-b1a-definicoes.mjs --turno 2                # H02, excesso sobre o cadastro
node scripts/h03-bu-x-oficial.mjs 2                                       # H03, soma das urnas × oficial
node --max-old-space-size=4096 scripts/auditoria/cetico-h10-consolidacao.mjs   # H10 e H03 do 1º turno
node scripts/auditoria/cetico-e2bio-consolidacao.mjs                      # H05, divisão do voto a mais
node scripts/auditoria/cetico-a7-reproducao.mjs                           # H05, comparecimento alto
node scripts/auditoria/cetico-eleitorado-acima-populacao-consolidacao.mjs # eleitores acima da população
```

## Próximos passos

- **Pendente:** revisão cética de H03 (demais cargos), H04, H06, H07, H08, H09, H11 e H12.
- **Pendente:** refazer com o 1º turno completo os números marcados como parciais.
- **Pendente:** conferência das assinaturas e dos números de série no país inteiro (H04, H11).
- **Pendente:** resultado e revisão de H13.
- **Pendente:** pedidos pela Lei de Acesso à Informação: critério de "com biometria" no cadastro e número de eleitores com digital carregada por seção (H02), comparecimento dos 100+ no 2º turno e cancelamentos por óbito (H01).


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

