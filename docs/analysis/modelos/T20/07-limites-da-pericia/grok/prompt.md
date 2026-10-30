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


## Resumo executivo do relatório (só como referência de números; não revise aqui)

# Resumo: os principais achados

> Situação em 30/10/2026; o relatório está em elaboração. Este resumo não traz número novo: cada número está escrito igual no tópico indicado (→), com a explicação, as tabelas, os gráficos e o caminho para refazer a conta.

Rótulos: **Fato** é conferido nos arquivos oficiais de todas as seções, com script que refaz a conta. **Hipótese** é possível, mas não comprovado. **Pendente** ainda não foi conferido e fica sem número.

## Em poucas palavras

Nos arquivos públicos das urnas do 1º turno (04/10/2026) e do 2º turno (25/10/2026), nenhum teste encontrou sinal de fraude no resultado: a soma das urnas é igual ao resultado oficial, e nenhum arquivo dos dois turnos foi alterado depois de a urna o assinar. Os testes também acharam pontos fracos: a liberação de eleitores sem digital depende só de pessoas, um certificado de segurança venceu antes da eleição, e o diário público das urnas traz números de título de eleitor. E há perguntas que esses arquivos não respondem, como quem estava na cabine e se o programa da urna era o auditado. Por isso, esta perícia não afirma que houve fraude, nem que não houve.

## O que foi examinado

**Fato:** todas as urnas. A lista oficial tem 499.248 seções (grupos de eleitores que votam na mesma urna) em cada turno; os arquivos das 499.207 que tiveram urna foram conferidos um a um, e as outras 41, no exterior, não tiveram urna, segundo o TSE. → [tópico 0](00-coleta-completa.md)

De cada urna saem o **boletim de urna** (o placar da seção), o **registro digital do voto** (a lista dos votos, um por um, sem nome) e o **diário da urna** (que anota com hora tudo o que a urna fez). Abaixo, 13 e 22 são os dois candidatos a Presidente no 2º turno; o 13 venceu por 4.430.191 votos.

## Os principais achados

### O que foi conferido e bate

**1. A soma das urnas é igual ao resultado oficial.** **Fato.** 2º turno, Presidente: 0 diferença em 499.205 seções, conferidas uma a uma. 1º turno, todos os cargos: 0 divergência nas 499.207 seções com boletim. Nenhuma seção do 2º turno teve mais votantes que eleitores aptos. → [tópico 5](05-soma-dos-boletins.md), [tópico 2](02-coerencia-entre-arquivos.md)

**2. Os arquivos dos dois turnos não foram alterados depois de assinados.** **Fato.** A urna assina seus arquivos com uma assinatura digital, um lacre eletrônico que denuncia qualquer mudança posterior. 499.207 pacotes conferidos, 0 falha; arquivos adulterados de propósito foram rejeitados, o que mo…

## Tópico em revisão: 07-limites-da-pericia.md

# 7. Limites desta perícia

> **Situação:** revisto em 29/10/2026 pela regra de que só entra número 100% conferido. Cada número que ficou aqui foi reproduzido de forma independente: ou o revisor cético o sustentou (`docs/analysis/cetico-revisor/`), ou ele foi recalculado sobre o universo completo por `scripts/auditoria/verifica-pericia-07-limites.mjs` (marcado **conferido nesta revisão**). O que não pôde ser reproduzido saiu do texto e aparece como **Pendente: em verificação**, sem número.

## A pergunta

O que os arquivos públicos das urnas, junto com os dados abertos do TSE, permitem afirmar sobre as eleições de 2026? E o que eles não permitem afirmar, por mais que sejam analisados?

## Resposta curta

- **O que dá para afirmar com conta exata (Fato).** O resultado oficial de Presidente no 2º turno é a soma do que as urnas registraram: 0 diferenças em 499.205 seções. Nenhuma seção do 2º turno teve mais votantes do que eleitores aptos. A conta da virada entre os turnos fecha voto a voto.
- **O que dá para afirmar com alcance limitado.** Alguns tipos de fraude, se feitos em grande escala, teriam deixado rastro, e esse rastro não apareceu. Cada teste tem um tamanho mínimo abaixo do qual ele não percebe nada. Esse tamanho está na tabela 2 quando já foi medido com número exato; nos demais testes ele é **Pendente**.
- **O que não dá para afirmar com estes arquivos.** Quem estava na cabine de votação. Se o programa que rodou dentro da urna é o programa que foi auditado. O que o sistema de totalização recebeu, além do que bate com o boletim. Se um título específico votou. A tabela 3 diz quem poderia responder a cada uma dessas perguntas.
- **"O teste não achou" não quer dizer "não houve fraude".** Quer dizer que não apareceu o rastro que aquele teste procura. Fraude menor que o alcance do teste, ou de outro tipo, pode ter ocorrido, e mesmo dentro do alcance as simulações não percebem a fraude em todas as repetições.

## Por que este tópico existe

A perícia trabalha com os arquivos que a própria urna produz: o boletim (o placar), o registro dos votos e o diário de bordo (o log). Esses arquivos mostram se os números são coerentes entre si e com o resultado oficial. Eles não mostram de onde veio cada voto.

Duas regras da auditoria ([premissas](../01-premissas.md), princípios 8 e 9) definem como os limites são tratados aqui:

- **Princípio 8: não confiar em pessoas.** Uma regra que depende de alguém fazer a coisa certa, como "o mesário confere o documento com foto", não conta como proteção. Só conta como proteção o que é técnico e deixa rastro nos arquivos: a digital registrada no log, a assinatura da urna, a impressão digital (hash) do arquivo. Cada ponto que depende só de pessoas aparece neste relatório como **risco**. Um risco não é prova de fraude. Ele indica onde a fraude seria possível sem deixar rastro técnico.
- **Princípio 9: universo completo, nunca amostra.** Os números da perícia são calculados sobre todas as seções, não sobre uma parte. Quando o dado ainda está incompleto, o resultado não entra aqui com número: aparece como **Pendente**, com as UFs que entraram e as que faltam, e só entra depois de refeito com o universo completo. Quando uma fonte estimou um total a partir de uma amostra, o número estimado não é repetido aqui. O que se registra é que a medição completa está pendente.

## Como foi feito

1. Foram reunidos todos os testes da perícia já escritos nos tópicos [0](00-coleta-completa.md), [1](01-integridade-e-estrutura-dos-arquivos.md), [5](05-soma-dos-boletins.md), [6](06-titulos-de-falecidos.md) e [8](08-virada-do-2-turno.md) e nos pareceres do revisor cético.
2. Para cada teste foram registrados a pergunta, o conjunto de seções usado e o **poder do teste**, isto é, a capacidade de perceber algo que de fato existe.
3. O revisor cético mediu esse poder por **simulação**: inseriu de propósito votos falsos nos dados reais, em quantidades e lugares diferentes, e verificou se o teste percebia. Quando percebe, o teste tem poder para aquele tamanho. Quando não percebe, aquele tamanho é um ponto cego.
4. As perguntas que nenhum teste com arquivos públicos responde vieram de duas listas: a de riscos fora da criptografia ([integridade-nacional/06](../analysis/integridade-nacional/06-riscos-fora-da-criptografia.md)) e a matriz de ataques do engenheiro de segurança ([engenheiro-seguranca-urna/01](../analysis/engenheiro-seguranca-urna/01-matriz-ataques.md), ainda sem parecer do revisor cético). Essa matriz lista por onde alguém poderia fraudar e que rastro isso deixaria.
5. Cada número do texto foi conferido de novo. Os que não estavam num parecer do revisor cético foram recalculados sobre todas as seções, com a cópia de leitura do banco e os perfis por seção dos dois turnos (as 27 UFs e o exterior, em cada um).

## O que foi encontrado

### Tabela 1. O que foi verificado por conta exata

| O que se verificou | Resultado | Conjunto examinado | Rótulo | Fonte |
|---|---|---|---|---|
| Os arquivos de todas as urnas foram obtidos | Em cada turno, 499.248 seções: 499.207 com os arquivos da urna e 41, todas do exterior, sem arquivos de urna publicados. A impressão digital de cada arquivo foi refeita e comparada com a "nota fiscal" da urna em todas as 499.207 seções, nos dois turnos (1.996.828 arquivos por turno), com 0 falhas | Completo | **Fato** (contagem conferida nesta revisão; refação das impressões digitais no [tópico 0](00-coleta-completa.md), `verifica-pericia-coleta.mjs --rehash`) | [Tópico 0](00-coleta-completa.md); `data/manifest/<turno>/resumo.json` |
| Os lacres (assinaturas digitais) da urna são válidos, 2º turno | 499.207 pacotes conferidos um a um, 0 falha, nos dois métodos de lacre (Ed521 e ECDSA) | Completo (2º turno, Brasil e exterior) | **Fato** ([parecer 24](../analysis/cetico-revisor/24-integridade-h04-h11.md)) | [Tópico 1](01-integridade-e-estrutura-dos-arquivos.md); `node scripts/auditoria/integridade-lacres.mjs --turno 2`; uma seção: `node src/lacres.js <pasta da seção>` |
| O mesmo, 1º turno | **Pendente** (conferência em andamento). Feita só no AC e em duas seções do ES | Parcial | **Pendente** até a conferência em todas as seções | [Tópico 1](01-integridade-e-estrutura-dos-arquivos.md) |
| A soma dos boletins é igual ao resultado oficial, Presidente, 2º turno, seção a seção | 0 diferenças em 499.205 seções | Completo | **Fato** ([parecer 05](../analysis/cetico-revisor/05-h10-crescimento-cabe-no-disponivel.md); seções conferidas nesta revisão) | [Tópico 5](05-soma-dos-boletins.md); `node scripts/h03-bu-x-oficial.mjs 2` |
| O mesmo, 1º turno | 0 diferenças em 499.206 seções (125.275.835 votos de cada lado) | Completo (28 UFs; cópia de leitura de 29/10/2026, 10h50 UTC) | **Fato** (conferido nesta revisão, com o oficial lido direto do CSV do TSE; a mesma igualdade está no [tópico 8](08-virada-do-2-turno.md), por outro script). O parecer 05 já a tinha sustentado em 389.857 seções de 25 UFs | `node scripts/auditoria/verifica-pericia-coerencia-topicos.mjs --turno 1` |
| O boletim é igual ao registro dos votos, todos os cargos do 2º turno | 0 diferenças em 539.815 pares seção × cargo (o voto anulado depois de suspensão, que o registro dos votos separa, entra como nulo, como no boletim) | Completo (2º turno) | **Fato** (conferido nesta revisão) | `scripts/auditoria/verifica-pericia-07-limites.mjs` |
| Boletim = resultado oficial por município e zona, votos nominais de Presidente e de Governador, 2º turno | 0 diferenças: 12.584 pares (município × zona × número) de Presidente e 1.026 de Governador; nenhum número com voto no boletim falta no oficial | Completo (2º turno, 28 UFs) | **Fato** (conferido nesta revisão) | `node scripts/auditoria/verifica-pericia-coerencia-munzona.mjs --turno 2`; [tópico 2](02-coerencia-entre-arquivos.md) |
| Boletim = resultado oficial, todos os cargos, 1º turno: seis totais por seção (aptos, comparecimento, nominais, brancos, nulos, legenda), candidato por zona e os 109 totais por estado e cargo | 0 divergência. A única diferença é de classificação: 628.629 votos de 250 números de candidato e 1.912 de 4 legendas, que o resultado oficial conta como nulo técnico (630.541, fecha voto a voto) | Completo (28 UFs, 499.207 seções com boletim) | **Fato** ([parecer 26](../analysis/cetico-revisor/26-h03-1turno-todos-cargos.md)). Prova coerência entre arquivos do TSE; as assinaturas do 1º turno estão Pendentes | [Tópico 5](05-soma-dos-boletins.md); `node scripts/auditoria/matematico-h03-1turno.mjs` |
| Boletim = resultado oficial nos campos aptos, comparecimento, brancos e nulos, 2º turno | **Pendente: em verificação** | — | — | [coerencia-contagem/01](../analysis/coerencia-contagem/01-bu-x-oficial.md) |
| Alguma seção teve mais votantes do que eleitores aptos? | 0 de 499.207 seções | Completo (2º turno) | **Fato** ([parecer 10](../analysis/cetico-revisor/10-a7-comparecimento-alto-sem-digital.md); conferido nesta revisão) | `node scripts/auditoria/contagem-a7.mjs --turno 2` |
| A conta da virada fecha? | Lula +10.376.694, Flávio Bolsonaro +3.721.538; soma 14.098.232, exatamente o disponível (votos dos eliminados + queda de brancos e nulos + aumento de comparecimento) | Completo | **Fato** (parecer 05) | [Tópico 8](08-virada-do-2-turno.md) |
| Menor intervalo entre dois votos seguidos na mesma urna | 16 segundos, em 3 seções. Ficam de fora 3 seções cujo pacote traz 3 logs: nelas a conta junta os logs e dá 0 segundo. A causa é a leitura desta auditoria, não a urna: em 2 delas o diário da urna original está repetido dentro de outro diário do pacote, e na terceira (ES 57932/0009/0085) o pacote traz também o diário de outra seção (**Fato**, conferido no diário original no [tópico 3](03-linha-do-tempo.md), item 5) | Completo (2º turno, 499.177 seções com voto no log) | **Fato** (conferido nesta revisão) | [linha-do-tempo/03](../analysis/linha-do-tempo/03-intervalos-minimos.md) |
| Votos depois das 17h de Brasília, a hora normal de encerramento, no 2º turno | 34.330, dos quais 1.993 depois das 18h. É menos de 1% da diferença entre os dois finalistas (4.430.191 votos) | Completo (2º turno, sem o exterior, que vota no horário local) | **Fato** (conferido nesta revisão) | `node scripts/auditoria/verifica-pericia-linha-do-tempo.mjs`; [linha-do-tempo/02](../analysis/linha-do-tempo/02-votos-apos-17h.md) (o `scripts/h06-votos-apos-17h.mjs` conta só as urnas da própria seção e dá 34.066; ver [tópico 3](03-linha-do-tempo.md), Limites) |
| Títulos de eleitores com 100 anos ou mais sem pessoa correspondente na população | 148.553 a mais do que todos os residentes de 96 anos ou mais contados pelo Censo 2022 (297.977 títulos de 100+ com domicílio no Brasil, contra 149.424 residentes de 96+). É o valor mínimo se ninguém dessa idade morreu desde 2022 e se o Censo contou todos eles | Completo | **Fato** ([parecer 02](../analysis/cetico-revisor/02-centenarios-excesso-cadastro.md)) | [Tópico 6](06-titulos-de-falecidos.md) |
| Quantos eleitores de 100+ votaram no 1º turno | 2.141 de 298.239 (0,72%) | Contagem oficial do TSE. Não pode ser refeita com os arquivos de urna | **Fato** ([parecer 03](../analysis/cetico-revisor/03-centenarios-nao-votam.md)) | [Tópico 6](06-titulos-de-falecidos.md) |
| No exterior, quantos votos foram liberados sem digital | 380.612 no 2º turno, 100% dos votos. Nenhum foi liberado por digital, embora o cadastro de julho de 2026 registre 222.584 eleitores do exterior com biometria, de 918.876 | Completo (exterior) | **Fato** (conferido nesta revisão) | [biometria-mesarios/07](../analysis/biometria-mesarios/07-exterior-sem-biometria.md) |
| Algum arquivo público contém número de título fora do papel de mesário ou servidor? | Sim, no diário da urna, na mensagem de suspensão do eleitor: 55.483 linhas (31.764 números diferentes) no dia do 1º turno e 5.564 (3.801) no do 2º, com formato válido de título e sem ser de nenhum mesário, presidente de mesa ou servidor registrado no país. De quem são: **Hipótese** (o número recusado, provavelmente do eleitor suspenso); confirmação **Pendente**. O registro dos votos não guarda a ordem de votação (539.788 e 2.490.766 listas da urna, todas ordenadas) | Completo (dois turnos, todas as linhas de todos os diários) | **Fato** ([parecer 29](../analysis/cetico-revisor/29-h09-sigilo.md)) | [Tópico 12](12-sigilo-do-voto.md) |

**O que estes fatos não provam:**

- Uma soma exata mostra que nenhum voto foi somado, tirado ou trocado **entre o boletim publicado e o resultado divulgado**. Que o boletim publicado é o que a urna assinou foi conferido em todas as 499.207 seções do 2º turno (lacres, 0 falha, parecer 24); no 1º turno, está **Pendente**. Ela não mostra que o voto dado na urna foi dado pelo dono do título.
- Um lacre válido mostra que o arquivo foi assinado por uma chave com certificado de uma das três autoridades do TSE para urnas (AC URNA, AC UE2020 e AC UE2022) e não mudou depois. Que essa chave é de uma urna oficial depende da cadeia de certificados e da guarda das chaves, que não se verificam com os arquivos públicos (tabela 3). Ele não mostra que o programa da urna estava correto quando o arquivo foi gerado.
- "A conta fecha" é uma igualdade de contabilidade ([parecer 05](../analysis/cetico-revisor/05-h10-crescimento-cabe-no-disponivel.md)): o ganho de um finalista só deixa de "caber" quando o outro perde votos. Uma troca de votos do 22 para o 13 feita por dentro da conta passaria sem alarme.

### Tabela 2. Testes de alcance limitado: o que cada um descarta e o que não descarta

Aqui, "descarta" quer dizer que, se aquilo tivesse acontecido, o teste teria percebido, e não percebeu. "Não descarta" quer dizer que aquilo poderia ter acontecido sem o teste perceber.

| Teste | Descarta | Não descarta | Rótulo e fonte |
|---|---|---|---|
| **Balanço de cada seção entre o 1º e o 2º turno** | Troca de votos do 22 para o 13 acima de 3.721.538 votos (6,22% dos 59.826.041 votos do 22 no 2º turno), que é o próprio ganho do 22 entre os turnos: só acima disso o 22 passaria a perder votos no total do país | Uma troca de 3,7% dos votos do 22, que já bastaria para virar o resultado. Voto inserido com comparecimento coerente. Troca concentrada em seções onde o 22 venceu | **Fato** ([parecer 05](../analysis/cetico-revisor/05-h10-crescimento-cabe-no-disponivel.md)) |
| **O eleitor a mais do 2º turno, liberado sem digital, votou diferente do liberado com digital?** (27 UFs, 497.622 seções; resultado: **o teste não decide**, porque muda de lado conforme o perfil da seção que se leva em conta; [tópico 4](04-liberacao-dos-eleitores.md), item 6.1) | **Pendente**: o tamanho a partir do qual o teste percebe inserção é medido por simulação e não entra aqui com número | Uma diferença real entre os dois grupos do tamanho da que o perfil da seção produz: o teste não separa uma da outra. Pela forma do teste (comparação dentro do mesmo município), ele também não percebe inserção igual em todas as seções de uma UF ou de municípios inteiros, fraude do mesmo tamanho nos dois turnos (que se anula na comparação) nem uso em poucas seções. No exterior, o teste não se aplica: 100% dos 380.612 eleitores foram liberados sem digital | **Fato** o alcance descrito ([parecer 27](../analysis/cetico-revisor/27-h05-28ufs.md), sustentado com ressalvas; substitui o parecer 06) |
| **Títulos de 100+ usados para votar no 2º turno** | **Pendente**: o limite que o teste percebe é uma estimativa aproximada do parecer 03 e não entra aqui com número. A medida direta depende da contagem oficial por idade do 2º turno | Uso abaixo desse limite. Uso igual nos dois turnos. Uso em poucas seções ou municípios. O critério "nenhuma das 22.389 seções exige uso" não percebe nada: em todas essas seções, todos os títulos de 100+ poderiam ter votado sem passar do limite, e por isso ele foi retirado como evidência | **Fato** ([parecer 03](../analysis/cetico-revisor/03-centenarios-nao-votam.md)). No 2º turno ainda não há contagem oficial por idade (**Pendente**) |
| **Seções com mais eleitores "sem biometria" no boletim do que no cadastro** | Contagem impossível: nenhuma seção tem comparecimento acima dos aptos. O excesso soma 36.340 eleitores em 16.011 seções. Nas 378 seções com excesso de 10 ou mais (todas elas), tirar os atendimentos com "Foto do eleitor apresentada" faz o excesso cair de 5.560 para 54; nas outras seções essa medida é **Pendente** ([tópico 4](04-liberacao-dos-eleitores.md), item 3; [tópico 6](06-titulos-de-falecidos.md)). Uso amplo dessa porta: **Pendente**. A simulação de poder foi feita num grupo de seções, não no país, e depois da correção do sorteio o resultado não é reproduzível com número exato (errata do parecer 01) | O tamanho total do grupo "com foto e sem digital". As estimativas da fonte vêm de amostras e por isso não são repetidas aqui. A medição em todas as seções é **Pendente** e depende de o TSE informar quantos eleitores tinham digital gravada na urna, por seção. Uso em poucas seções ou de poucos eleitores por seção | **Fato** ([parecer 01](../analysis/cetico-revisor/01-b1a-sem-biometria-acima-do-cadastro.md)). 1º turno: **Pendente** |
| **Seções com comparecimento alto e liberação sem digital** (639 seções com 95% ou mais) | No conjunto dessas 639 seções, votos no lugar de ausentes **pelo caminho "a digital falhou"** espalhados por essas seções. O tamanho a partir do qual isso seria percebido é uma estimativa estatística do parecer 10 e fica **Pendente**, sem número | Fraude numa seção só: o teste só marca uma seção com muitos votos falsos sem digital; o tamanho depende do modelo e fica **Pendente**. Voto pelo ano de nascimento no lugar de ausente. Fraude que não passa pela digital, como compra de comparecimento ou coação | **Fato** ([parecer 10](../analysis/cetico-revisor/10-a7-comparecimento-alto-sem-digital.md)) |
| **Municípios com mais eleitores do que moradores** | Que esses títulos a mais fiquem todos parados: em 579 municípios votou mais gente do que a população de 12 anos ou mais de 2022. Quanto desses títulos vota é estimativa de modelo do parecer 04 e fica **Pendente**, sem número. A parcela liberada por digital nesses municípios é igual à da UF, o que é compatível com pessoas reais votando, mas não identifica quem votou | A diferença entre quem mudou de cidade e manteve o título, quem tem vínculo legítimo com o município e quem transferiu o título de forma irregular. Uma proporção normal não absolve: um cadastro inflado em 10% tira do padrão só 6,8% dos municípios | **Fato** ([parecer 04](../analysis/cetico-revisor/04-eleitorado-acima-populacao.md)). Para Presidente, o local do voto não muda o total nacional; o risco recai sobre eleições estaduais e municipais |
| **Estimativas de para onde foram os votos dos eliminados e de quantos eleitores do 22 permaneceram** | — | São estimativas estatísticas feitas a partir das seções, não a contagem do voto de cada pessoa, que é secreto | **Hipótese** ([tópico 8](08-virada-do-2-turno.md)) |
| **Teste de Integridade** (urnas sorteadas recebem votos já anotados em cédulas de papel; no fim, os dois resultados são comparados) | O tamanho de desvio que o teste perceberia é **Pendente: em verificação** | Quem declara que não houve divergência é a própria Justiça Eleitoral. O relatório do teste com biometria obtido traz só a participação, não as divergências. O número nacional de urnas testadas foi estimado a partir de parte das UFs e não é repetido aqui | **Fato** o que o TSE declarou ([teste-integridade/01](../analysis/teste-integridade/01-poder-de-deteccao.md)). Poder do teste e relatórios por TRE: **Pendente** |
| **Padrões estatísticos** (seções com quase todos os votos para um candidato, dígitos finais, comparecimento muito alto) | — | São indícios, não prova. Um padrão raro pode ter explicação local, como aldeias e presídios que votam em bloco | **Hipótese** ([tópico 9](09-padroes-estatisticos.md)) |

### Tabela 3. O que não é testável com arquivos públicos, e quem poderia verificar

| Pergunta | Por que os arquivos públicos não respondem | Quem poderia verificar, e com o quê |
|---|---|---|
| A pessoa que votou é a dona do título? | O log registra **como** o eleitor foi liberado (digital, ano de nascimento, digital do mesário), não **quem** estava na cabine. A liberação por ano de nascimento nem registra qual mesário a fez | Justiça Eleitoral e Ministério Público Eleitoral: o **caderno de votação** (a lista que os eleitores assinam na mesa), as atas da mesa e investigação no local |
| Em quem cada título votou? | O voto é secreto por desenho: o registro dos votos guarda cada cargo em ordem de tipo e número, sem a ordem de chegada, e o log só grava o voto nulo que a urna atribui quando o eleitor é suspenso. As exceções conhecidas (cédulas de 2 seções de MG, seções unânimes, números de título na suspensão) estão no [tópico 12](12-sigilo-do-voto.md) | Ninguém. É proteção legal do sigilo do voto |
| Um título específico (por exemplo, de pessoa falecida) votou? | Os arquivos da urna não identificam o eleitor | TSE (caderno de votação, registro de comparecimento por título) e o Sistema Nacional de Registro Civil (SIRC), por pedido pela LAI. A consulta por CPF ([doc 04](../04-hipotese-titulos-falecidos.md)) não foi feita |
| O programa que rodou na urna é o programa que foi auditado e lacrado? | Boletim, registro dos votos e log saem do mesmo programa. Um programa alterado em todas as urnas produziria arquivos coerentes entre si e poderia registrar "SUCESSO" nas próprias conferências | **Entidades fiscalizadoras** (partidos, OAB, Ministério Público, Polícia Federal e outras que a lei autoriza) na inspeção do código-fonte (o texto do programa) e na cerimônia de lacração. O Teste de Integridade com biometria é o controle externo existente |
| O lacre do software do TSE (método CEPESC) é válido? | O método não é público | TSE e CEPESC, publicando a especificação ou um verificador |
| A "carteira de identidade" das urnas é legítima até a autoridade raiz? | Os certificados da AC URNA v2 e das autoridades raiz não estão disponíveis para download. O certificado publicado da AC URNA venceu em 18/07/2026 (conferido nesta revisão no arquivo do certificado). Quem controlasse uma autoridade intermediária poderia emitir certificado para uma "urna" que não existe, e os arquivos dela passariam em todas as conferências | TSE, por LAI ou por pedido de entidade fiscalizadora: os certificados que faltam e o certificado renovado da AC URNA, com data de emissão |
| A chave secreta de alguma urna foi copiada? | Uma cópia da chave produz arquivos que não se distinguem dos legítimos | Inspeção do equipamento pelo TSE e pelas entidades fiscalizadoras |
| O que o sistema de totalização recebeu no caminho entre o cartão de resultado e o total? | Os logs de transmissão e de totalização não são públicos. O que é público mostra que o boletim publicado bate com o resultado oficial. Que ele é o assinado pela urna foi conferido em todas as seções do 2º turno (0 falha, parecer 24); no 1º turno, **Pendente** | Entidades fiscalizadoras podem pedir às zonas eleitorais os logs do sistema de transmissão e de totalização. Regra e prazo de 2026: **[a confirmar]** na resolução vigente ([checklist](../07-checklist-auditoria.md), item C3) |
| O que contêm os arquivos da urna que estão na lista assinada do pacote mas não são publicados (entre eles, as imagens das digitais)? | São dados pessoais e só o TSE os tem. Foi conferida só a assinatura da urna sobre a impressão digital de cada um | TSE |
| De quem é o número de título que o diário grava quando o mesário suspende um eleitor? | Confirmar exige a lista de eleitores da seção ou a regra técnica da suspensão, que não são públicas ([tópico 12](12-sigilo-do-voto.md)) | TSE: a regra da suspensão e o que é digitado nela (perguntas no tópico 12) |
| Algum cartão de memória foi lido ou copiado fora da urna? | O número de série é gravado pelo próprio programa, não é prova física. A guarda dos cartões é procedimento humano | Atas e registros de guarda dos cartórios; entidades fiscalizadoras |
| A corrente de impressões digitais que encadeia as linhas do log está íntegra? | O método de cálculo dessa corrente não é público | TSE |
| Na apuração em papel do exterior, o número digitado é o da cédula? | A apuração é feita à mão pela junta e não há controle técnico ligando a cédula ao número digitado. No 2º turno foram 29 seções e 831 votos de Presidente (**Fato**, conferido nesta revisão) | Junta apuradora, atas e fiscais presentes |
| De onde vieram os votos que estão no boletim sem nenhuma linha no log publicado: 49 em 2 seções no 2º turno e 152 em 3 no 1º, todas com urna de contingência (urna reserva)? | O log da urna que gravou esses votos não entrou no pacote assinado. Nas 5 seções, outra urna foi ligada com o cartão de votos da seção e gravou o próprio log na mídia por cima do anterior; depois foi recusada ou parou sem votar, e a contingência empacotou o log que ficou. Na SP 71072/0002/0035 (1º turno), a urna que gravou os 15 votos não foi identificada (**Fato**, [pareceres 08](../analysis/cetico-revisor/08-votos-sem-log-contingencia.md) e [25](../analysis/cetico-revisor/25-votos-sem-log-reconciliacao.md); tabela no [tópico 2](02-coerencia-entre-arquivos.md)) | TRE: memória interna das urnas que receberam os votos e ata da mesa |
| O que o cadastro público chama de "com biometria"? | O critério não está documentado nos arquivos | TSE, por LAI |
| Houve divergência no Teste de Integridade em algum estado? | Há só declarações e notícias, não os relatórios | Cada TRE: relatórios finais com urnas, cédulas e divergências |

## Riscos que dependem de pessoas (princípio 8)

Cada item abaixo é uma porta que depende só de pessoas. Nenhum deles, sozinho, prova fraude. O que provaria é um rastro nos dados, e os testes da tabela 2 dizem até onde esse rastro foi procurado.

- **Exterior.** **Fato** (conferido nesta revisão): 380.612 votos no 2º turno, todos liberados com título (ou CPF) e ano de nascimento, sem digital. **Hipótese (risco):** no exterior, quem tiver o título e o ano de nascimento de um eleitor da seção pode votar no lugar dele, sem barreira técnica. O tamanho desse uso não pode ser medido com os arquivos.
- **Liberação por ano de nascimento.** **Fato** ([checklist](../07-checklist-auditoria.md), B1b): o log não registra qual mesário fez essa liberação. Com um mesário conivente, título e ano de nascimento bastam para liberar o voto de um eleitor sem digital cadastrada.
- **Digital de "mesário" que não é de mesário registrado.** **Fato** (conferido nesta revisão): no AC, 2º turno, 6.974 de 22.654 liberações manuais (30,8%) usaram uma digital que a urna não ligou a nenhum mesário registrado. No país, 2º turno, são 2.791.394 das 8.632.431 liberações manuais, nas 499.176 seções comparáveis nos dois turnos (**Fato**, recalculado de todas as seções no [tópico 4](04-liberacao-dos-eleitores.md), itens 1 e 2). A urna aceita a digital de quem estiver na mesa.
- **Aumento de comparecimento sem digital no 2º turno.** **Fato** (conferido nesta revisão, nas 497.895 seções do Brasil comparáveis nos dois turnos: sem o exterior, cujo boletim não traz esse detalhe, e sem as seções cujo boletim de um dos turnos veio do Sistema de Apuração): o comparecimento subiu 2.920.461 do 1º para o 2º turno; 601.543 desse aumento (20,6%) entraram sem digital: 311.361 pelo ano de nascimento (eleitor sem biometria cadastrada) e 290.182 por liberação manual depois de digital que falhou. No 1º turno, 12,2% do comparecimento tinha entrado sem digital. **Hipótese:** esse saldo mostra quanto a entrada sem digital cresceu entre os turnos. Ele não é um teto para uso indevido, porque aumentos e quedas em seções diferentes se compensam no saldo. Quanto dela foi usado indevidamente não está medido.
- **Domicílio eleitoral.** **Fato** ([parecer 04](../analysis/cetico-revisor/04-eleitorado-acima-populacao.md)): em 579 municípios votou mais gente no 2º turno do que a população de 12 anos ou mais em 2022. A conferência de onde o eleitor mora é feita por pessoas.
- **Apuração manual e troca de urna.** Ver as duas linhas correspondentes da tabela 3.
- **Teste de Integridade.** O controle externo à urna é declarado pela própria Justiça Eleitoral. Partidos escolhem urnas e acompanham, mas a transmissão ao vivo é dispensada no teste com biometria ([teste-integridade/01](../analysis/teste-integridade/01-poder-de-deteccao.md)).

## Dados ainda parciais (princípio 9)

| Medida | UFs incluídas | Faltam |
|---|---|---|
| Lacres da urna, 1º turno (o 2º turno está completo: 499.207 pacotes, 0 falha) | AC e duas seções do ES | As demais seções do ES, as outras 25 UFs e o exterior |
| Seções com mais "sem biometria" do que o cadastro, 1º turno | Nenhuma: **Pendente**, sem número (a conta existente deixou UFs de fora) | Todas |
| Busca do número de título em formas codificadas (a busca do número escrito por extenso está completa, nos dois turnos: [tópico 12](12-sigilo-do-voto.md)) | ES, 2º turno | As outras UFs e o 1º turno |
| Comparecimento oficial por idade, 2º turno | Nenhuma: o TSE ainda não publicou o arquivo | Todas |

## Prova de que os limites foram medidos, e não supostos (contraprova)

O alcance de cada teste da tabela 2 não é opinião. Ele saiu de simulações em que votos falsos foram colocados de propósito nos dados reais:

- Na comparação entre eleitores com e sem digital ([parecer 27](../analysis/cetico-revisor/27-h05-28ufs.md), 28 UFs), a simulação de poder foi refeita com 20 rodadas e outro sorteio, e o resultado qualitativo do autor se manteve, com uma ressalva: nos cenários em que a inserção foi percebida, quem a percebeu foi o PR, que já tinha sinal antes dela. O teste não percebe inserção em municípios inteiros. Os tamanhos são estimativas e ficam **Pendente**, sem número.
- No teste dos títulos de 100+ ([parecer 03](../analysis/cetico-revisor/03-centenarios-nao-votam.md)), o critério por seção não dispararia nem se todos os títulos de 100+ das 22.389 seções tivessem votado. Por isso ele foi retirado como evidência, mesmo tendo dado o resultado "nenhuma seção exige uso".
- No teste das seções com "sem biometria" acima do cadastro ([parecer 01](../analysis/cetico-revisor/01-b1a-sem-biometria-acima-do-cadastro.md)), o poder medido por simulação é **Pendente**: depois da correção do sorteio, os números exatos dependem da ordem em que o banco devolve as linhas (errata do parecer 01).

## Limites deste tópico

1. Este tópico é um resumo. Os números vêm dos pareceres citados em cada linha, da conferência feita por `scripts/auditoria/verifica-pericia-07-limites.mjs` e `scripts/auditoria/verifica-pericia-coerencia-topicos.mjs`, ou dos tópicos 0, 3 e 4, que os recalcularam de todas as seções. Não há análise nova. Correção de 29/10/2026 (coerência entre tópicos): o aumento de comparecimento sem digital era 2.921.121 e 601.715 porque a conta somava, como se fossem aumento, os votantes do 2º turno de 2 seções de MG cujo boletim do 1º turno veio do Sistema de Apuração; sem elas, 2.920.461 e 601.543, como nos tópicos 4 e 10.
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
node --max-old-space-size=8192 scripts/auditoria/verifica-pericia-coerencia-topicos.mjs --turno 1 # boletins × oficial, 1º turno completo
node --max-old-space-size=6144 scripts/auditoria/cetico-h05-28ufs.mjs 20     # voto do eleitor a mais e simulação de poder, 28 UFs (parecer 27)
node --max-old-space-size=6144 scripts/auditoria/cetico-h05-28ufs-covariaveis.mjs # o resultado com cada característica da seção (parecer 27)
node --max-old-space-size=4096 scripts/auditoria/cetico-centenarios-poder.mjs  # poder do teste dos títulos de 100+ (parecer 03)
node scripts/auditoria/cetico-b1a-poder.mjs                                  # poder do teste "sem biometria" acima do cadastro (parecer 01)
node scripts/auditoria/contagem-a7.mjs --turno 2                             # comparecimento acima dos aptos (parecer 10)
```

## Próximos passos

- [x] Conferir os lacres em todas as seções do 2º turno (parecer 24: 499.207 pacotes, 0 falha; [tópico 1](01-integridade-e-estrutura-dos-arquivos.md))
- [ ] Conferir os lacres em todas as seções do 1º turno (em andamento)
- [x] Refazer, de forma independente, a conferência das impressões digitais dos arquivos em todas as seções (feito: [tópico 0](00-coleta-completa.md), 0 falhas nos dois turnos)
- [ ] Refazer com o 1º turno completo (já carregado nas 28 UFs na cópia de leitura de 29/10/2026) as medidas marcadas como parciais
- [ ] Reproduzir os itens **Pendente: em verificação** (boletim × oficial nos campos de comparecimento do 2º turno, busca do número de título em formas codificadas, poder do Teste de Integridade)
- [ ] Pedidos pela LAI ou por entidade fiscalizadora: certificados que faltam, critério de "com biometria", número de eleitores com digital gravada na urna por seção, comparecimento por título de 100+, logs de transmissão e totalização, relatórios do Teste de Integridade por TRE
- [ ] Publicação, pelo TSE, do comparecimento por idade do 2º turno, para medir diretamente o uso dos títulos de 100+
- [ ] Teste por mesário nas zonas com mais liberação sem digital, uma forma, com os arquivos públicos, de procurar uso em poucas seções, que os testes agregados não percebem (o caderno de votação e as atas, na tabela 3, são outra)
