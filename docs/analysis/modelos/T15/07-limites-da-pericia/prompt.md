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

## Tópico em revisão: 07-limites-da-pericia.md

# 7. Limites desta perícia

> **Situação:** revisto em 29/10/2026 pela regra de que só entra número 100% conferido. Cada número que ficou aqui foi reproduzido de forma independente: ou o revisor cético o sustentou (`docs/analysis/cetico-revisor/`), ou ele foi recalculado sobre o universo completo por `scripts/auditoria/verifica-pericia-07-limites.mjs` (marcado **conferido nesta revisão**). O que não pôde ser reproduzido saiu do texto e aparece como **Pendente: em verificação**, sem número.

## A pergunta

O que os arquivos públicos das urnas, junto com os dados abertos do TSE, permitem afirmar sobre as eleições de 2026? E o que eles não permitem afirmar, por mais que sejam analisados?

## Resposta curta

- **O que dá para afirmar com conta exata (Fato).** O resultado oficial de Presidente no 2º turno é a soma do que as urnas registraram: 0 diferenças em 499.205 seções. Nenhuma seção do 2º turno teve mais votantes do que eleitores aptos. A conta da virada entre os turnos fecha voto a voto.
- **O que dá para afirmar com alcance limitado.** Alguns tipos de fraude, se feitos em grande escala, teriam deixado rastro, e esse rastro não apareceu. Cada teste tem um tamanho mínimo abaixo do qual ele não percebe nada. Esse tamanho está na tabela 2.
- **O que não dá para afirmar com estes arquivos.** Quem estava na cabine de votação. Se o programa que rodou dentro da urna é o programa que foi auditado. O que o sistema de totalização recebeu, além do que bate com o boletim. Se um título específico votou. A tabela 3 diz quem poderia responder a cada uma dessas perguntas.
- **"O teste não achou" não quer dizer "não houve fraude".** Quer dizer que não houve fraude do tipo e do tamanho que aquele teste consegue ver.

## Por que este tópico existe

A perícia trabalha com os arquivos que a própria urna produz: o boletim (o placar), o registro dos votos e o diário de bordo (o log). Esses arquivos mostram se os números são coerentes entre si e com o resultado oficial. Eles não mostram de onde veio cada voto.

Duas regras da auditoria ([premissas](../01-premissas.md), princípios 8 e 9) definem como os limites são tratados aqui:

- **Princípio 8: não confiar em pessoas.** Uma regra que depende de alguém fazer a coisa certa, como "o mesário confere o documento com foto", não conta como proteção. Só conta como proteção o que é técnico e deixa rastro nos arquivos: a digital registrada no log, a assinatura da urna, a impressão digital (hash) do arquivo. Cada ponto que depende só de pessoas aparece neste relatório como **risco**. Um risco não é prova de fraude. Ele indica onde a fraude seria possível sem deixar rastro técnico.
- **Princípio 9: universo completo, nunca amostra.** Os números da perícia são calculados sobre todas as seções, não sobre uma parte. Quando o dado ainda está incompleto, o resultado aparece como **parcial**, com as UFs que entraram e as que faltam. Quando uma fonte estimou um total a partir de uma amostra, o número estimado não é repetido aqui. O que se registra é que a medição completa está pendente.

## Como foi feito

1. Foram reunidos todos os testes da perícia já escritos nos tópicos [0](00-coleta-completa.md), [1](01-integridade-e-estrutura-dos-arquivos.md), [5](05-soma-dos-boletins.md), [6](06-titulos-de-falecidos.md) e [8](08-virada-do-2-turno.md) e nos pareceres do revisor cético.
2. Para cada teste foram registrados a pergunta, o conjunto de seções usado e o **poder do teste**, isto é, a capacidade de perceber algo que de fato existe.
3. O revisor cético mediu esse poder por **simulação**: inseriu de propósito votos falsos nos dados reais, em quantidades e lugares diferentes, e verificou se o teste percebia. Quando percebe, o teste tem poder para aquele tamanho. Quando não percebe, aquele tamanho é um ponto cego.
4. As perguntas que nenhum teste com arquivos públicos responde vieram de duas listas: a de riscos fora da criptografia ([integridade-nacional/06](../analysis/integridade-nacional/06-riscos-fora-da-criptografia.md)) e a matriz de ataques do engenheiro de segurança ([engenheiro-seguranca-urna/01](../analysis/engenheiro-seguranca-urna/01-matriz-ataques.md), ainda sem parecer do revisor cético). Essa matriz lista por onde alguém poderia fraudar e que rastro isso deixaria.
5. Cada número do texto foi conferido de novo. Os que não estavam num parecer do revisor cético foram recalculados sobre todas as seções, com a cópia de leitura do banco e os perfis por seção dos dois turnos (28 UFs em cada um).

## O que foi encontrado

### Tabela 1. O que foi verificado por conta exata

| O que se verificou | Resultado | Conjunto examinado | Rótulo | Fonte |
|---|---|---|---|---|
| Os arquivos de todas as urnas foram obtidos | Em cada turno, 499.248 seções: 499.207 com os arquivos da urna e 41, todas do exterior, sem arquivos de urna publicados. A coleta conferiu a impressão digital de cada arquivo com a "nota fiscal" da urna e não acusou falha. A refação independente dessa conferência no país inteiro é **Pendente: em verificação** (no AC e numa seção do ES ela foi refeita, linha seguinte) | Completo (contagem de seções) | **Fato** (contagem conferida nesta revisão) | [Tópico 0](00-coleta-completa.md); `data/manifest/<turno>/resumo.json` |
| Os lacres (assinaturas digitais) da urna são válidos | Nenhuma falha | **Parcial:** as seções do AC e 1 seção do ES (ES 57037/0055/0364), nos dois turnos. Faltam as outras 26 UFs e o exterior | **Fato** (parcial, conferido nesta revisão com `node src/lacres.js`). País: **Pendente** | [Tópico 1](01-integridade-e-estrutura-dos-arquivos.md); `node src/lacres.js <pasta da seção>` |
| A soma dos boletins é igual ao resultado oficial, Presidente, 2º turno, seção a seção | 0 diferenças em 499.205 seções | Completo | **Fato** ([parecer 05](../analysis/cetico-revisor/05-h10-crescimento-cabe-no-disponivel.md); seções conferidas nesta revisão) | [Tópico 5](05-soma-dos-boletins.md); `node scripts/h03-bu-x-oficial.mjs 2` |
| O mesmo, 1º turno | 0 diferenças em 389.857 seções | **Parcial:** 25 UFs. Faltam SP, TO e o exterior | **Fato** (parcial, parecer 05) | `node scripts/auditoria/cetico-h10-consolidacao.mjs` |
| O boletim é igual ao registro dos votos, todos os cargos do 2º turno | 0 diferenças em 539.815 pares seção × cargo (o voto anulado depois de suspensão, que o registro dos votos separa, entra como nulo, como no boletim) | Completo (2º turno) | **Fato** (conferido nesta revisão) | `scripts/auditoria/verifica-pericia-07-limites.mjs` |
| Boletim = resultado oficial para governador e nos campos aptos, comparecimento, brancos e nulos | **Pendente: em verificação** | — | — | [coerencia-contagem/01](../analysis/coerencia-contagem/01-bu-x-oficial.md) |
| Alguma seção teve mais votantes do que eleitores aptos? | 0 de 499.207 seções | Completo (2º turno) | **Fato** ([parecer 10](../analysis/cetico-revisor/10-a7-comparecimento-alto-sem-digital.md); conferido nesta revisão) | `node scripts/auditoria/contagem-a7.mjs --turno 2` |
| A conta da virada fecha? | Lula +10.376.694, Flávio Bolsonaro +3.721.538; soma 14.098.232, exatamente o disponível (votos dos eliminados + queda de brancos e nulos + aumento de comparecimento) | Completo | **Fato** (parecer 05) | [Tópico 8](08-virada-do-2-turno.md) |
| Menor intervalo entre dois votos seguidos na mesma urna | 16 segundos, em 3 seções. Ficam de fora 3 seções cujo pacote traz 3 logs: nelas a conta junta os logs e dá 0 segundo, e a causa é **Pendente: em verificação** | Completo (2º turno, 499.177 seções com voto no log) | **Fato** (conferido nesta revisão) | [linha-do-tempo/03](../analysis/linha-do-tempo/03-intervalos-minimos.md) |
| Votos depois das 17h de Brasília, a hora normal de encerramento, no 2º turno | 34.330, dos quais 1.993 depois das 18h. É menos de 1% da diferença entre os dois finalistas (4.430.191 votos) | Completo (2º turno, sem o exterior, que vota no horário local) | **Fato** (conferido nesta revisão) | `node scripts/h06-votos-apos-17h.mjs`; [linha-do-tempo/02](../analysis/linha-do-tempo/02-votos-apos-17h.md) |
| Títulos de eleitores com 100 anos ou mais sem pessoa correspondente na população | Pelo menos 148.553 (este é o **piso**: o valor mínimo, supondo que ninguém dessa idade morreu desde 2022) | Completo | **Fato** ([parecer 02](../analysis/cetico-revisor/02-centenarios-excesso-cadastro.md)) | [Tópico 6](06-titulos-de-falecidos.md) |
| Quantos eleitores de 100+ votaram no 1º turno | 2.141 de 298.239 (0,72%) | Contagem oficial do TSE. Não pode ser refeita com os arquivos de urna | **Fato** ([parecer 03](../analysis/cetico-revisor/03-centenarios-nao-votam.md)) | [Tópico 6](06-titulos-de-falecidos.md) |
| No exterior, quantos votos foram liberados sem digital | 380.612 no 2º turno, 100% dos votos. Nenhum foi liberado por digital, embora o cadastro de julho de 2026 registre 222.584 eleitores do exterior com biometria, de 918.876 | Completo (exterior) | **Fato** (conferido nesta revisão) | [biometria-mesarios/07](../analysis/biometria-mesarios/07-exterior-sem-biometria.md) |
| Algum arquivo público contém o número de título de um eleitor? | **Pendente: em verificação** | ES, 2º turno | — | `src/busca-identificador.js`; H09 em [hipóteses](../hipoteses.md) |

**O que estes fatos não provam:**

- Uma soma exata mostra que nenhum voto foi somado, tirado ou trocado **entre a urna e o resultado divulgado**. Ela não mostra que o voto dado na urna foi dado pelo dono do título.
- Um lacre válido mostra que o arquivo saiu de uma urna oficial e não mudou depois. Ele não mostra que o programa da urna estava correto quando o arquivo foi gerado.
- "A conta fecha" é uma igualdade de contabilidade ([parecer 05](../analysis/cetico-revisor/05-h10-crescimento-cabe-no-disponivel.md)): o ganho de um finalista só deixa de "caber" quando o outro perde votos. Uma troca de votos do 22 para o 13 feita por dentro da conta passaria sem alarme.

### Tabela 2. Testes de alcance limitado: o que cada um descarta e o que não descarta

Aqui, "descarta" quer dizer que, se aquilo tivesse acontecido, o teste teria percebido, e não percebeu. "Não descarta" quer dizer que aquilo poderia ter acontecido sem o teste perceber.

| Teste | Descarta | Não descarta | Rótulo e fonte |
|---|---|---|---|
| **Balanço de cada seção entre o 1º e o 2º turno** | Troca de votos do 22 para o 13 acima de cerca de 6% dos votos do 22, se espalhada pelo país inteiro | Uma troca de 3,7% dos votos do 22, que já bastaria para virar o resultado. Voto inserido com comparecimento coerente. Troca concentrada em seções onde o 22 venceu | **Fato** ([parecer 05](../analysis/cetico-revisor/05-h10-crescimento-cabe-no-disponivel.md)) |
| **O eleitor a mais do 2º turno, liberado sem digital, votou diferente do liberado com digital?** (resultado: não; a diferença foi de +0,002, dentro do acaso) | Inserção de votos pela porta sem digital, a partir de cerca de 34 mil votos, quando ela varia de seção para seção dentro da mesma UF. Na simulação, 40 votos falsos em 0,25% das seções (33.920 votos) deram sinal claro | Inserção igual em todas as seções de uma UF: na simulação, 354.750 votos falsos na BA (10 por seção) passaram sem sinal. Inserção pequena e espalhada: 84.760 votos (5 por seção em 5% das seções mais favoráveis ao 13) passaram sem sinal. Fraude do mesmo tamanho nos dois turnos, que se anula na comparação. Uso em poucas seções | **Fato** ([parecer 06](../analysis/cetico-revisor/06-comparecimento-extra-sem-vies-biometria.md)). **Parcial:** 25 UFs, 389.827 seções. Faltam SP, TO e o exterior |
| **Títulos de 100+ usados para votar no 2º turno** | Uso acima de cerca de 10% desses títulos (cerca de 30 mil votos), feito só no 2º turno | Uso menor que isso. Uso igual nos dois turnos. Uso em poucas seções ou municípios. O critério "nenhuma das 22.389 seções exige uso" não percebe nada: na simulação, não disparou nem com 99 mil votos falsos e por isso foi retirado como evidência | **Fato** ([parecer 03](../analysis/cetico-revisor/03-centenarios-nao-votam.md)). No 2º turno ainda não há contagem oficial por idade (**Pendente**) |
| **Seções com mais eleitores "sem biometria" no boletim do que no cadastro** | Contagem impossível: cerca de 99% do excesso (36.340 eleitores em 16.011 seções) se explica por eleitores com foto, mas sem digital, no arquivo da urna. Uso amplo dessa porta: votos falsos em 5% das seções foram percebidos em 8 de 10 simulações | O tamanho total do grupo "com foto e sem digital". As estimativas da fonte vêm de amostras e por isso não são repetidas aqui. A medição em todas as seções é **Pendente** e depende de o TSE informar quantos eleitores tinham digital gravada na urna, por seção. Uso em poucas seções ou de poucos eleitores por seção | **Fato** ([parecer 01](../analysis/cetico-revisor/01-b1a-sem-biometria-acima-do-cadastro.md)). 1º turno **parcial** |
| **Seções com comparecimento alto e liberação sem digital** (639 seções com 95% ou mais) | No conjunto dessas 639 seções, votos no lugar de ausentes **pelo caminho "a digital falhou"** acima de cerca de 110 a 400 votos. Esse é o limite de 95%: o maior número compatível com os dados, com 95% de confiança | Fraude numa seção só: o teste só marca uma seção a partir de 23 a 58 votos falsos sem digital. Voto pelo ano de nascimento no lugar de ausente. Fraude que não passa pela digital, como compra de comparecimento ou coação | **Fato** ([parecer 10](../analysis/cetico-revisor/10-a7-comparecimento-alto-sem-digital.md)) |
| **Municípios com mais eleitores do que moradores** | Que esses títulos a mais fiquem parados: eles votam, de 60% a 70%, e a parcela liberada por digital é igual à da UF, o que indica pessoas reais presentes | A diferença entre quem mudou de cidade e manteve o título, quem tem vínculo legítimo com o município e quem transferiu o título de forma irregular. Uma proporção normal não absolve: um cadastro inflado em 10% tira do padrão só 6,8% dos municípios | **Fato** ([parecer 04](../analysis/cetico-revisor/04-eleitorado-acima-populacao.md)). Para Presidente, o local do voto não muda o total nacional; o risco recai sobre eleições estaduais e municipais |
| **Estimativas de para onde foram os votos dos eliminados e de quantos eleitores do 22 permaneceram** | — | São estimativas estatísticas feitas a partir das seções, não a contagem do voto de cada pessoa, que é secreto | **Hipótese** ([tópico 8](08-virada-do-2-turno.md)) |
| **Teste de Integridade** (urnas sorteadas recebem votos já anotados em cédulas de papel; no fim, os dois resultados são comparados) | O tamanho de desvio que o teste perceberia é **Pendente: em verificação** | Quem declara que não houve divergência é a própria Justiça Eleitoral. O relatório do teste com biometria obtido traz só a participação, não as divergências. O número nacional de urnas testadas foi estimado a partir de parte das UFs e não é repetido aqui | **Fato** o que o TSE declarou ([teste-integridade/01](../analysis/teste-integridade/01-poder-de-deteccao.md)). Poder do teste e relatórios por TRE: **Pendente** |
| **Padrões estatísticos** (seções com quase todos os votos para um candidato, dígitos finais, comparecimento muito alto) | — | São indícios, não prova. Um padrão raro pode ter explicação local, como aldeias e presídios que votam em bloco | **Hipótese** ([tópico 9](09-padroes-estatisticos.md)) |

### Tabela 3. O que não é testável com arquivos públicos, e quem poderia verificar

| Pergunta | Por que os arquivos públicos não respondem | Quem poderia verificar, e com o quê |
|---|---|---|
| A pessoa que votou é a dona do título? | O log registra **como** o eleitor foi liberado (digital, ano de nascimento, digital do mesário), não **quem** estava na cabine. A liberação por ano de nascimento nem registra qual mesário a fez | Justiça Eleitoral e Ministério Público Eleitoral: o **caderno de votação** (a lista que os eleitores assinam na mesa), as atas da mesa e investigação no local |
| Em quem cada título votou? | O voto é secreto por desenho: o registro dos votos é embaralhado e o log não grava o voto | Ninguém. É proteção legal do sigilo do voto |
| Um título específico (por exemplo, de pessoa falecida) votou? | Os arquivos da urna não identificam o eleitor | TSE (caderno de votação, registro de comparecimento por título) e o Sistema Nacional de Registro Civil (SIRC), por pedido pela LAI. A consulta por CPF ([doc 04](../04-hipotese-titulos-falecidos.md)) não foi feita |
| O programa que rodou na urna é o programa que foi auditado e lacrado? | Boletim, registro dos votos e log saem do mesmo programa. Um programa alterado em todas as urnas produziria arquivos coerentes entre si e poderia registrar "SUCESSO" nas próprias conferências | **Entidades fiscalizadoras** (partidos, OAB, Ministério Público, Polícia Federal e outras que a lei autoriza) na inspeção do código-fonte (o texto do programa) e na cerimônia de lacração. O Teste de Integridade com biometria é o controle externo existente |
| O lacre do software do TSE (método CEPESC) é válido? | O método não é público | TSE e CEPESC, publicando a especificação ou um verificador |
| A "carteira de identidade" das urnas é legítima até a autoridade raiz? | Os certificados da AC URNA v2 e das autoridades raiz não estão disponíveis para download. O certificado publicado da AC URNA venceu em 18/07/2026 (conferido nesta revisão no arquivo do certificado). Quem controlasse uma autoridade intermediária poderia emitir certificado para uma "urna" que não existe, e os arquivos dela passariam em todas as conferências | TSE, por LAI ou por pedido de entidade fiscalizadora: os certificados que faltam e o certificado renovado da AC URNA, com data de emissão |
| A chave secreta de alguma urna foi copiada? | Uma cópia da chave produz arquivos que não se distinguem dos legítimos | Inspeção do equipamento pelo TSE e pelas entidades fiscalizadoras |
| O que o sistema de totalização recebeu no caminho entre o cartão de resultado e o total? | Os logs de transmissão e de totalização não são públicos. O que é público mostra que o boletim publicado é o assinado pela urna e que ele bate com o resultado oficial | Entidades fiscalizadoras podem pedir às zonas eleitorais os logs do sistema de transmissão e de totalização. Regra e prazo de 2026: **[a confirmar]** na resolução vigente ([checklist](../07-checklist-auditoria.md), item C3) |
| O que contêm os arquivos da urna que estão na lista assinada do pacote mas não são publicados (entre eles, as imagens das digitais)? | São dados pessoais e só o TSE os tem. Foi conferida só a assinatura da urna sobre a impressão digital de cada um | TSE |
| Algum cartão de memória foi lido ou copiado fora da urna? | O número de série é gravado pelo próprio programa, não é prova física. A guarda dos cartões é procedimento humano | Atas e registros de guarda dos cartórios; entidades fiscalizadoras |
| A corrente de impressões digitais que encadeia as linhas do log está íntegra? | O método de cálculo dessa corrente não é público | TSE |
| Na apuração em papel do exterior, o número digitado é o da cédula? | A apuração é feita à mão pela junta e não há controle técnico ligando a cédula ao número digitado. No 2º turno foram 29 seções e 831 votos de Presidente (**Fato**, conferido nesta revisão) | Junta apuradora, atas e fiscais presentes |
| De onde vieram 50 votos que estão no boletim e não aparecem em nenhum log publicado, em 3 seções com urna de contingência (urna reserva)? | O registro desses votos não entrou no pacote assinado. No MA e na BA, uma urna com a carga de outra seção gravou o próprio log na mídia antes de ser recusada, e a contingência seguinte copiou esse log, não o da urna que recebeu os votos. No RS, o fim do log da urna original se perdeu (**Fato**, [parecer 08](../analysis/cetico-revisor/08-votos-sem-log-contingencia.md)) | TRE: memória interna das urnas que receberam os votos e ata da mesa |
| O que o cadastro público chama de "com biometria"? | O critério não está documentado nos arquivos | TSE, por LAI |
| Houve divergência no Teste de Integridade em algum estado? | Há só declarações e notícias, não os relatórios | Cada TRE: relatórios finais com urnas, cédulas e divergências |

## Riscos que dependem de pessoas (princípio 8)

Cada item abaixo é uma porta que depende só de pessoas. Nenhum deles, sozinho, prova fraude. O que provaria é um rastro nos dados, e os testes da tabela 2 dizem até onde esse rastro foi procurado.

- **Exterior.** **Fato** (conferido nesta revisão): 380.612 votos no 2º turno, todos liberados com título (ou CPF) e ano de nascimento, sem digital. **Hipótese (risco):** no exterior, quem tiver o título e o ano de nascimento de um eleitor da seção pode votar no lugar dele, sem barreira técnica. O tamanho desse uso não pode ser medido com os arquivos.
- **Liberação por ano de nascimento.** **Fato** ([checklist](../07-checklist-auditoria.md), B1b): o log não registra qual mesário fez essa liberação. Com um mesário conivente, título e ano de nascimento bastam para liberar o voto de um eleitor sem digital cadastrada.
- **Digital de "mesário" que não é de mesário registrado.** **Fato** (parcial: só o AC, 2º turno; conferido nesta revisão): 6.974 de 22.654 liberações manuais (30,8%) usaram uma digital que a urna não ligou a nenhum mesário registrado. A urna aceita a digital de quem estiver na mesa. Medição no país: **Pendente**.
- **Aumento de comparecimento sem digital no 2º turno.** **Fato** (conferido nesta revisão, nas seções do Brasil, sem o exterior, cujo boletim não traz esse detalhe): o comparecimento subiu 2.921.121 do 1º para o 2º turno; 601.715 desse aumento (20,6%) entraram sem digital (eleitor sem biometria cadastrada ou liberado pelo ano de nascimento). No 1º turno, 12,2% do comparecimento tinha entrado sem digital. **Hipótese:** esse é o tamanho máximo da porta sem digital para a mudança entre os turnos. Quanto dela foi usado indevidamente não está medido.
- **Domicílio eleitoral.** **Fato** ([parecer 04](../analysis/cetico-revisor/04-eleitorado-acima-populacao.md)): em 579 municípios votou mais gente no 2º turno do que a população de 12 anos ou mais em 2022. A conferência de onde o eleitor mora é feita por pessoas.
- **Apuração manual e troca de urna.** Ver as duas linhas correspondentes da tabela 3.
- **Teste de Integridade.** O controle externo à urna é declarado pela própria Justiça Eleitoral. Partidos escolhem urnas e acompanham, mas a transmissão ao vivo é dispensada no teste com biometria ([teste-integridade/01](../analysis/teste-integridade/01-poder-de-deteccao.md)).

## Dados ainda parciais (princípio 9)

| Medida | UFs incluídas | Faltam |
|---|---|---|
| Lacres da urna | AC e 1 seção do ES, nos dois turnos | As outras 26 UFs e o exterior |
| Soma dos boletins × resultado oficial, 1º turno | 25 UFs | SP, TO e exterior |
| Voto do eleitor a mais, com e sem digital | 25 UFs (389.827 seções pareadas) | SP, TO e exterior |
| Seções com mais "sem biometria" do que o cadastro, 1º turno | 26 UFs | SP (o parecer 01 também lista TO como pendente) |
| Digital de "mesário" sem mesário registrado | AC | As outras 26 UFs e o exterior |
| Busca do número de título nos arquivos | ES, 2º turno | As outras UFs e o 1º turno |
| Comparecimento oficial por idade, 2º turno | Nenhuma: o TSE ainda não publicou o arquivo | Todas |

## Prova de que os limites foram medidos, e não supostos (contraprova)

O alcance de cada teste da tabela 2 não é opinião. Ele saiu de simulações em que votos falsos foram colocados de propósito nos dados reais:

- Na comparação entre eleitores com e sem digital ([parecer 06](../analysis/cetico-revisor/06-comparecimento-extra-sem-vies-biometria.md)), 40 votos falsos em 0,25% das seções (33.920 votos) deram sinal claro. Já 5 votos falsos em cada seção da BA (177.375 votos) não deram sinal nenhum. Os dois resultados, o que o teste vê e o que ele não vê, estão nessa mesma simulação.
- No teste dos títulos de 100+ ([parecer 03](../analysis/cetico-revisor/03-centenarios-nao-votam.md)), o critério por seção não disparou nem com 99 mil votos falsos. Por isso ele foi retirado como evidência, mesmo tendo dado o resultado "nenhuma seção exige uso".
- No teste das seções com "sem biometria" acima do cadastro ([parecer 01](../analysis/cetico-revisor/01-b1a-sem-biometria-acima-do-cadastro.md)), votos falsos em 28% das seções foram percebidos em 10 de 10 simulações, e em 5% das seções, em 8 de 10.

## Limites deste tópico

1. Este tópico é um resumo. Os números vêm dos pareceres citados em cada linha ou da conferência feita por `scripts/auditoria/verifica-pericia-07-limites.mjs`, e não de análise nova.
2. Os itens marcados **Pendente: em verificação** ficaram sem número porque não puderam ser reproduzidos nesta revisão.
3. A matriz de ataques do engenheiro de segurança indica onde procurar cada rastro, mas os resultados de várias linhas dela (versão do programa, conferências de assinatura registradas no log, relógio da urna, caminhos fora do fluxo normal) ainda não foram escritos. **Pendente.**
4. A coluna "quem poderia verificar" da tabela 3 se baseia nos documentos do TSE e nas fontes citadas. Quem tem legitimidade para cada pedido e os prazos de 2026 estão **[a confirmar]** com advogado eleitoral e com a resolução vigente.

## Como repetir

```
node --max-old-space-size=8192 scripts/auditoria/verifica-pericia-07-limites.mjs # conferência dos números marcados "conferido nesta revisão"
node src/lacres.js data/raw/2t/urnas/ac                                       # lacres do AC, 2º turno (tópico 1)
node src/lacres.js data/raw/1t/urnas/ac --data 2026-10-04                     # lacres do AC, 1º turno
node scripts/h03-bu-x-oficial.mjs 2                                          # boletins × oficial, 2º turno (tópico 5)
node --max-old-space-size=4096 scripts/auditoria/cetico-h10-consolidacao.mjs # balanço entre turnos e boletins × oficial no 1º turno (parecer 05)
node scripts/auditoria/cetico-e2bio-reproducao.mjs                           # voto do eleitor a mais e simulação de poder (parecer 06)
node --max-old-space-size=4096 scripts/auditoria/cetico-centenarios-poder.mjs  # poder do teste dos títulos de 100+ (parecer 03)
node scripts/auditoria/cetico-b1a-poder.mjs                                  # poder do teste "sem biometria" acima do cadastro (parecer 01)
node scripts/auditoria/contagem-a7.mjs --turno 2                             # comparecimento acima dos aptos (parecer 10)
```

## Próximos passos

- [ ] Conferir os lacres em todas as seções do país e nos dois turnos
- [ ] Refazer, de forma independente, a conferência das impressões digitais dos arquivos em todas as seções
- [ ] Completar o 1º turno (SP, TO e exterior) e refazer as medidas marcadas como parciais
- [ ] Reproduzir os itens **Pendente: em verificação** (boletim × oficial para governador e nos campos de comparecimento, causa dos 0 segundo nas 3 seções com 3 logs, busca do número de título, poder do Teste de Integridade)
- [ ] Pedidos pela LAI ou por entidade fiscalizadora: certificados que faltam, critério de "com biometria", número de eleitores com digital gravada na urna por seção, comparecimento por título de 100+, logs de transmissão e totalização, relatórios do Teste de Integridade por TRE
- [ ] Publicação, pelo TSE, do comparecimento por idade do 2º turno, para medir diretamente o uso dos títulos de 100+
- [ ] Teste por mesário nas zonas com mais liberação sem digital, a única forma de achar uso em poucas seções, que os testes agregados não percebem


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

