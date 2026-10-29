Você é revisor independente de uma auditoria das eleições brasileiras de 2026 (1º turno 04/10, 2º turno 25/10; Presidente: 13 = Lula, 22 = Flávio Bolsonaro). O relatório de perícia (docs/pericia/) é para leigos e tem uma regra dura: **só entra número 100% correto**, do universo completo (todas as seções, todas as UFs), conferido nos arquivos oficiais do TSE e reproduzível por script. Estimativa, amostra, "cerca de", número de terceiros não conferido e conta feita sobre suposição devem ficar FORA ou aparecer só como "Pendente", sem número.

Universo do 2º turno: 499.248 seções, 499.207 com pacote completo, 499.205 com voto para Presidente. Você não tem acesso aos dados nem pode rodar código: revise o que dá para revisar só com o texto.

## Sua tarefa

Abaixo estão TODOS os tópicos do relatório e o índice. Procure **só contradições entre tópicos**: o mesmo número, universo ou conclusão com valores ou status diferentes em arquivos diferentes (ex.: votos após 17h, votos sem digital, seções, comparecimento, status de hipóteses no quadro final × no tópico de origem). Ignore estilo.

## Formato da resposta (markdown)

| # | Número ou afirmação | Arquivo A (cite) | Arquivo B (cite) | Qual parece certo e por quê | Gravidade |
No fim: "Pares conferidos e coerentes:" com uma lista curta.

=== ARQUIVO README.md ===

# Relatório de perícia: arquivos das urnas das eleições de 2026 (1º e 2º turno)

Este relatório é escrito para quem não é da área de tecnologia. Cada termo técnico é explicado na primeira vez que aparece, e há um glossário no fim desta página.

Toda afirmação traz um destes rótulos:

- **Fato**: conferido nos arquivos oficiais, com indicação de onde.
- **Hipótese**: possibilidade ainda não comprovada.
- **Pendente**: o que ainda falta conferir, e como será feito.

**Regra deste relatório (pedido do auditor, 29/10/2026): só entra dado 100% correto e completo.**

- **Número só entra se tiver sido reproduzido de forma independente:** parecer do revisor cético que o sustente, ou duas contas independentes que batem.
- **Universo completo:** todas as seções e todas as UFs. Dado parcial não entra.
- **Fica fora:** estimativa estatística, amostra, "cerca de", número de terceiros não conferido (imprensa, pesquisas) e conta feita sobre suposição. Esses ficam nos documentos de análise (`docs/analysis/`).
- **O que ainda não cumpre a regra entra como Pendente, sem o número.**

## Tópicos

| # | Tópico | Pergunta que responde | Situação |
|---|---|---|---|
| 0 | [Os arquivos de todas as urnas foram obtidos?](00-coleta-completa.md) | Foram examinadas todas as urnas ou só uma amostra? | escrito; 100% das 499.248 seções nos dois turnos |
| 1 | [Integridade e estrutura dos arquivos](01-integridade-e-estrutura-dos-arquivos.md) | Os arquivos que o TSE publica são os mesmos que a urna gerou? O que tem dentro de cada um? | escrito; conferido no Acre inteiro e em 1 seção do ES; falta o país |
| 2 | Coerência entre os arquivos de uma mesma urna | O boletim, o registro dos votos e o diário da urna contam a mesma história? | a escrever |
| 3 | Linha do tempo da urna | O que a urna fez da preparação até o envio do resultado, e em que horário? | a escrever |
| 4 | Como os eleitores foram liberados para votar | Quantos votaram com digital, quantos sem, e por quê? | a escrever |
| 5 | [Soma dos boletins × resultado oficial](05-soma-dos-boletins.md) | Somando todas as urnas, chega-se ao resultado divulgado? | escrito; 2º turno, Presidente: igual em 100% das seções; falta 1º turno e outros cargos |
| 6 | [Títulos de pessoas falecidas](06-titulos-de-falecidos.md) | Houve voto registrado em nome de quem já tinha morrido? | escrito; cadastro com pelo menos 148.553 títulos de 100+ sem pessoa correspondente; 1º turno: 0,72% dos 100+ votaram (contagem oficial do TSE); 2º turno: só se descarta uso acima de ~10% desses títulos; sem CPF |
| 7 | Limites desta perícia | O que estes arquivos permitem afirmar e o que não permitem | a escrever |
| 8 | [A virada do 2º turno](08-virada-do-2-turno.md) | O que os números oficiais mostram sobre a virada? | escrito só com números reproduzidos de forma independente; testes em revisão listados como Pendente, sem número |

A lista técnica do que será medido para os tópicos 2 a 7 está em [../07-checklist-auditoria.md](../07-checklist-auditoria.md).

**Registro de evidências:** [evidencias/](evidencias/README.md) guarda o índice de todos os arquivos de dados usados (com a impressão digital de cada um), o livro de registro encadeado de cada verificação e as cópias dos documentos de referência.

## Glossário

| Termo | Em palavras simples |
|---|---|
| **BU** (Boletim de Urna) | O "placar" da urna: quantos votos cada candidato teve naquela seção. É impresso e afixado na porta da seção no fim do dia, e também gravado em arquivo |
| **RDV** (Registro Digital do Voto) | A lista de todos os votos da urna, um por um, embaralhada para que não dê para saber quem votou em quem |
| **Log** | O "diário de bordo" da urna: anota, com data e hora, cada coisa que aconteceu (ligou, imprimiu, liberou eleitor, recebeu voto, encerrou) |
| **Hash** | A "impressão digital" de um arquivo: um código calculado a partir do conteúdo. Se mudar uma única letra do arquivo, o código muda completamente |
| **Assinatura digital** | Um "lacre com carimbo": prova que o arquivo foi produzido por quem diz que produziu (aqui, a urna) e que não foi mexido depois |
| **Certificado** | A "carteira de identidade" digital da urna, emitida pelo TSE, usada para conferir a assinatura |
| **Autoridade certificadora (AC)** | O "cartório" digital do TSE que emite as carteiras de identidade (certificados) das urnas |
| **Ed521** | O método de cálculo usado pelas urnas novas (modelos 2020 e 2022) para produzir e conferir lacres. É público e também adotado pela ICP-Brasil |
| **CEPESC** | Método de lacre do governo usado pelo software do TSE. Não é público, então ninguém de fora consegue conferi-lo |
| **Urna de contingência** | Urna reserva que substitui a urna original quando ela apresenta problema durante a votação |
| **Biometria** | Identificação do eleitor pela impressão digital, na própria urna |
| **Seção** | O grupo de eleitores que vota numa mesma urna |
| **Zona** | A divisão do cartório eleitoral que agrupa várias seções |
| **Eleitor apto** | Eleitor com título regular, que pode votar naquela seção |
| **Comparecimento / abstenção** | Quantos eleitores aptos votaram / quantos não votaram |
| **Perfil do eleitorado** | Arquivo público do TSE com quantos eleitores há em cada seção, por idade e com ou sem biometria cadastrada |
| **Baixa por óbito** | O cancelamento do título de quem morreu. Depende de o óbito ser comunicado à Justiça Eleitoral |
| **Censo** | A contagem da população feita pelo IBGE. O último é de 2022 |
| **Coorte** | Um grupo de pessoas nascidas na mesma época, acompanhado ao longo dos anos (por exemplo, quem tinha 96+ em 2022 tem 100+ em 2026) |
| **Eleitor sem biometria cadastrada** | Eleitor cuja digital não está no arquivo da urna. A urna o libera só com o número do título e o ano de nascimento, digitados pelo mesário |
| **Piso** | O menor valor possível de uma medida, calculado com a hipótese mais favorável. O valor verdadeiro só pode ser maior |
| **Poder do teste** | A capacidade de um teste de detectar algo que de fato existe. Um teste sem poder não acusa nada mesmo quando há o que acusar |
| **LAI** (Lei de Acesso à Informação) | A lei que permite a qualquer pessoa pedir informações a órgãos públicos |


=== ARQUIVO 00-coleta-completa.md ===

# 0. Os arquivos de todas as urnas foram obtidos?

## A pergunta

A perícia examinou os arquivos de **todas** as urnas do país, nos dois turnos, ou só de uma amostra? Faltou alguma urna?

## Resposta curta

**Fato:** sim, de todas. Nos dois turnos (04/10 e 25/10/2026), as **499.248 seções com urna** do país e do exterior foram baixadas e conferidas uma a uma.

| | 1º turno | 2º turno |
|---|---|---|
| Seções com arquivos completos e íntegros | 499.207 | 499.207 |
| Seções sem urna instalada, segundo o próprio TSE (todas no exterior) | 41 | 41 |
| **Total** | **499.248 de 499.248** | **499.248 de 499.248** |
| Seções "agregadas" (votam na urna de outra seção) cobertas | 17.931 de 17.931 | 17.931 de 17.931 |

Fonte: `data/manifest/<turno>/resumo.json`, campo `coberturaTotal: true`. Detalhes técnicos no [doc 03](../03-coleta-bus-logs.md).

## De onde vieram os arquivos

O TSE publica os arquivos de duas formas, e as duas foram usadas:

1. **Pacotes por estado.** Um arquivo compactado por UF, com os arquivos de todas as urnas daquele estado (cerca de 132 GB no 2º turno e 95 GB no 1º).
2. **Endereço de cada seção.** Uma pasta pública por seção, com a lista oficial do que deveria existir lá.

Da lista oficial de seções do TSE, cada seção foi conferida contra os arquivos baixados.

## Como se sabe que cada arquivo está inteiro

Cada urna grava uma "nota fiscal" (o pacote de lacres, ver o [tópico 1](01-integridade-e-estrutura-dos-arquivos.md)) com a impressão digital de cada arquivo. Para cada uma das quase 500 mil seções:

- a impressão digital da nota fiscal foi comparada com o código que o portal informa para a seção;
- a impressão digital de cada arquivo (boletim, registro dos votos, diário e boletim impresso) foi comparada com a anotada na nota fiscal.

Um único bit diferente em qualquer arquivo faria a seção falhar. **Fato:** nenhuma falhou.

## Casos especiais encontrados (todos Fatos)

| Caso | Quantidade | O que é |
|---|---|---|
| Seções "não instaladas" | 41 por turno, todas no exterior | O TSE informa que não houve urna nessas seções. Não existe arquivo, e isso consta da lista oficial |
| Sistema de Apuração | 29 seções no exterior (2º turno) | Votos em cédula de papel, apurados depois num sistema próprio. Os arquivos têm outros nomes, mas seguem o mesmo esquema de impressões digitais e lacres, que também foi conferido |
| Arquivo faltando no pacote do estado | 1 por turno | No 2º turno, o diário de uma seção de SP. No 1º turno, o registro dos votos de uma seção do MA. Nos dois casos o arquivo **estava publicado no endereço da seção**, foi baixado de lá e a impressão digital confere com a nota fiscal da urna |
| Seções com situação "Recebida" no site | 1.088 (AM e BA, 2º turno) | O pacote completo de arquivos chegou ao TSE entre 26 e 28/10, depois da eleição. Os votos dessas seções estão no resultado oficial e batem exatamente com o boletim (ver o [tópico 5](05-soma-dos-boletins.md)) |

## Limites

- **Pendente:** a lista oficial de cada seção (`aux.json`), que diz qual pacote o TSE considerou, ainda está sendo baixada devagar, porque o site do TSE bloqueia acessos rápidos. Sem ela, a conferência usou a nota fiscal da própria urna, o que garante que os arquivos estão íntegros. A confirmação de que **o pacote publicado é o que o TSE totalizou** está feita em 82 mil seções e segue para as demais.
- Esta etapa diz que os arquivos estão completos e íntegros. **Não** diz se os votos dentro deles são legítimos. Isso é o assunto dos tópicos seguintes.

## Como repetir

```
node src/coleta.js --turno 2          # baixa, extrai e confere (doc 03)
node src/coleta.js --turno 1
```


=== ARQUIVO 01-integridade-e-estrutura-dos-arquivos.md ===

# 1. Integridade e estrutura dos arquivos

## A pergunta

Os arquivos que o TSE publica na internet são exatamente os que a urna gerou no fim da votação, sem nenhuma alteração no caminho?

## Resposta curta

Na seção analisada em detalhe, **sim**. As "impressões digitais" dos arquivos baixados batem com as que a urna anotou, e os "lacres" (assinaturas digitais) da urna foram conferidos e são válidos. Mudar um único voto no arquivo é detectado na hora.

Seção analisada em detalhe: Vila Velha (ES), zona 55, seção 372, 2º turno de 25/10/2026. O mesmo teste foi rodado em todas as 2.270 seções com urna do Acre, e nenhuma falhou (seção "Alcance" abaixo). A conferência de todo o país depende do download completo, em andamento.

Há dois limites, explicados adiante: um dos dois lacres usa um método secreto do governo e não pode ser conferido por ninguém de fora; e a "carteira de identidade" da urna foi conferida até a autoridade intermediária do TSE, não até a autoridade raiz.

## O que a urna entrega no fim do dia

Quando a votação termina, a urna grava um conjunto de arquivos. O TSE publica estes para qualquer pessoa baixar:

| Arquivo | O que é, em palavras simples | Tamanho nesta seção |
|---|---|---|
| Boletim de Urna (`-bu.dat`) | O placar da urna: votos de cada candidato, brancos, nulos, quantos eleitores podiam votar e quantos votaram, horário de abertura e de encerramento | 1,5 KB (menos que uma página de texto) |
| Registro Digital do Voto (`-rdv.dat`) | A lista de todos os votos, um por um, **em ordem embaralhada**. Não tem nome nem identificação de eleitor. Serve para recontar os votos de forma independente | 4,9 KB |
| Diário da urna (`-log.jez`) | Um arquivo compactado (como um .zip) com o diário de bordo da urna: cada evento com data e hora, desde a preparação da urna semanas antes até o encerramento | 174 KB compactado, 940 KB aberto, quase 10 mil linhas |
| Pacote de lacres (`-vota.vsc`) | A "nota fiscal" dos arquivos: lista os arquivos que a urna gerou, o tamanho de cada um, a impressão digital de cada um e o lacre de cada um | 61 KB |

Os arquivos de boletim, registro de votos e lacres não são texto comum: estão num formato padronizado de computador (chamado ASN.1), parecido com um formulário de campos fixos. O TSE publica o "molde" desse formulário (a especificação), e com ele cada campo pode ser lido: município, zona, seção, número de cada candidato, quantidade de votos.

### O pacote de lacres por dentro

O pacote de lacres tem **duas listas** com os mesmos arquivos:

1. Uma lista lacrada pelo **software de votação do TSE**, com um método de cálculo do governo (chamado CEPESC) que não é público.
2. Outra lista lacrada pela **própria urna**, com um método público, acompanhada da "carteira de identidade" digital da urna (o certificado).

A urna gerou **11 arquivos**, e o pacote lista os 11. O portal publica 4 deles. Os outros 7 aparecem no pacote apenas com nome, tamanho, impressão digital e lacre. Entre eles estão as imagens das digitais dos eleitores e mesários, que são dados pessoais e por isso não são divulgadas.

## Como funciona a conferência

Pense numa encomenda pelo correio:

1. **A etiqueta da caixa** (o portal): o portal informa um código para cada seção. Esse código é a impressão digital do pacote de lacres. Se o pacote baixado gerar o mesmo código, ele chegou intacto.
2. **A nota fiscal dentro da caixa** (o pacote de lacres): o pacote informa a impressão digital de cada arquivo. Se cada arquivo baixado gerar a mesma impressão digital, nenhum foi trocado ou alterado.
3. **O carimbo de quem enviou** (as assinaturas): cada item da nota fiscal tem um lacre que só a urna consegue produzir, porque depende de uma chave secreta guardada dentro dela. Qualquer pessoa consegue *conferir* o lacre usando a parte pública dessa chave, que vem na carteira de identidade da urna.
4. **A carteira de identidade da urna** (o certificado): a carteira foi assinada por uma autoridade do TSE. Conferir essa assinatura mostra que a urna é uma urna oficial, e não um computador qualquer fingindo ser urna.

Há ainda um **lacre dentro do próprio boletim**. Cada linha de votos do boletim (por exemplo, "candidato 22, 161 votos") tem sua impressão digital, que é calculada a partir da linha anterior, como elos de uma corrente. O último elo é lacrado pela urna. Se alguém mudar uma linha, todos os elos dali para frente mudam e deixam de bater com o lacre.

Os degraus 1 e 2 mostram que **nada mudou entre a nota fiscal e o arquivo baixado**. Os degraus 3 e 4 mostram que **a nota fiscal foi feita por uma urna oficial**.

## O que foi conferido nesta seção

| Degrau | Conferência | Resultado | Rótulo |
|---|---|---|---|
| 1 | Impressão digital do pacote de lacres = código informado pelo portal | Igual | **Fato** |
| 2 | Tamanho e impressão digital do Boletim de Urna, do Registro Digital do Voto e do diário = valores na nota fiscal | Iguais nas duas listas | **Fato** |
| 2 | Impressão digital de cada lista = valor anotado no cabeçalho dela | Igual nas duas listas | **Fato** |
| 3 | Lacre da urna em cada um dos 11 arquivos da lista (inclusive os 7 não publicados) | 11 de 11 válidos | **Fato** |
| 3 | Lacre da urna na lista inteira | Válido | **Fato** |
| 3 | Corrente de elos do boletim: as 8 linhas de votos (4 de Presidente, 4 de Governador) foram recalculadas uma a uma | Todas iguais às gravadas | **Fato** |
| 3 | Lacre da urna no último elo de cada eleição (Presidente e Governador) | 2 de 2 válidos | **Fato** |
| 4 | A carteira de identidade é da mesma urna que aparece no boletim e no diário (urna nº 2199150) | Mesma urna | **Fato** |
| 4 | A carteira de identidade foi assinada pela autoridade do TSE para urnas modelo 2020 ("AC UE2020") | Assinatura válida | **Fato** |
| 4 | A carteira estava dentro da validade no dia da eleição | Válida de 2022 a 2036 | **Fato** |
| — | Lacre do software do TSE (método CEPESC) | Não verificável | **Limite** |

No total foram 24 conferências nesta seção, todas com resultado positivo.

### Prova de que o teste funciona (contraprova)

Para mostrar que o teste não aprova qualquer coisa, foi feita uma cópia do boletim com **um único voto a mais** (candidato 13 a Presidente passou de 96 para 97). O teste acusou três problemas: a impressão digital do arquivo deixou de bater com a nota fiscal, os elos da corrente de Presidente deixaram de bater e o último elo deixou de bater com o lacre. Também foi testado um lacre com um único sinal trocado: foi rejeitado. Esses testes ficam gravados junto com o programa e rodam sempre que ele é alterado.

## Como a conferência foi feita, e como repetir

- O método é o mesmo dos programas de exemplo que o próprio TSE publica junto com a especificação dos arquivos (pacote "Formato dos arquivos de BU, RDV e assinatura digital").
- As impressões digitais usam os cálculos padrão chamados SHA-256 e SHA-512, usados no mundo todo.
- Os lacres da urna usam um método chamado **Ed521**, uma variante de um padrão internacional de assinatura digital, adotada também pela ICP-Brasil (a infraestrutura oficial de certificados digitais do país). As ferramentas mais comuns (como o OpenSSL) ainda não trazem esse método, então ele foi programado para esta perícia e testado com exemplos de resultado conhecido, publicados pelos autores da biblioteca que o próprio TSE usa. Um desses exemplos é o certificado raiz da ICP-Brasil.
- Qualquer pessoa pode repetir: `node src/lacres.js <pasta da seção>`. O programa e os testes estão no repositório.
- Cada verificação feita para este relatório está registrada no [livro de evidências](evidencias/README.md): o comando, o programa exato usado e a impressão digital do resultado. A lista de todos os arquivos analisados, com a impressão digital de cada um, está em `evidencias/indice/`.

Fonte dos arquivos: `resultados.tse.jus.br`, baixados em 29/10/2026, com registro de cada download (endereço, data, tamanho e impressão digital). Detalhes técnicos em [../06-leitura-bu-rdv-log.md](../06-leitura-bu-rdv-log.md).

## Limites desta conferência

1. **O lacre do software do TSE não pode ser conferido por terceiros.** Ele usa um método de cálculo do governo (CEPESC) que não é publicado. O próprio TSE informa isso na especificação. A impressão digital dessa lista confere; o lacre em si, não há como checar de fora. O lacre da urna, que é público, foi conferido.
2. **A carteira de identidade foi conferida até a autoridade intermediária.** A carteira da urna é assinada pela "AC UE2020", e essa assinatura foi conferida. A AC UE2020, por sua vez, é assinada por outra autoridade do TSE ("AC URNA v2") e esta por uma autoridade raiz. Os certificados dessas duas não estão disponíveis para download automático no site do TSE. Os certificados usados (das autoridades intermediárias) vieram do pacote oficial de exemplos do TSE.
3. **O pacote oficial foi obtido de uma cópia pública**, porque o site do TSE bloqueia download automático. A cópia tem a mesma impressão digital registrada de forma independente por outro projeto de auditoria. Falta baixar o pacote direto do site do TSE, pelo navegador, e comparar.
4. **Lacre não prova que o voto registrado é o voto que o eleitor quis dar.** O lacre prova que o arquivo não mudou depois que a urna o gerou e que foi gerado por uma urna oficial. O que acontece *dentro* da urna antes disso é assunto de outros tópicos deste relatório.

## Alcance

| Conjunto | Seções conferidas | Resultado |
|---|---|---|
| ES · Vila Velha · zona 55 · seção 372 | 1 | 24 de 24 conferências positivas |
| AC · todas as seções com urna | 2.270 (3.310 cópias de pacotes, porque 1.040 seções foram baixadas por dois caminhos) | Todas as conferências positivas, em todas as cópias |

## Próximos passos

- [ ] Rodar a conferência dos lacres em todas as seções do país, ao fim do download
- [ ] Conferir uma seção com urna de modelo antigo (2013/2015), que usa outro método de lacre (ECDSA)
- [ ] Baixar pelo navegador o pacote oficial e os certificados das autoridades do TSE e comparar com as cópias usadas
- [ ] Comparar o pacote consolidado por estado que o TSE publica com os arquivos baixados seção por seção


=== ARQUIVO 02-coerencia-entre-arquivos.md ===

# 2. Coerência entre os arquivos de uma mesma urna

## A pergunta

Cada urna grava três registros da mesma votação: o boletim (o placar), o registro dos votos (a lista dos votos, um por um) e o diário da urna (o que aconteceu, com hora). Os três contam a mesma história? E as contas internas de cada um fecham: votos somados = eleitores que votaram, eleitores que votaram ≤ eleitores que podiam votar?

## Resposta curta

**Fato (2º turno, país inteiro, 499.207 seções com boletim):** o boletim e o registro dos votos são iguais em todas as seções e em todos os cargos (539.815 comparações, 0 diferença). As contas internas do boletim fecham em todas as seções que trazem os campos necessários (as exceções de formato estão listadas abaixo). Nenhuma seção tem mais eleitores votando do que eleitores aptos (revisado pelo cético).

**Fato (2º turno, revisado pelo cético):** o diário da urna confere com o boletim em todas as seções, menos em **3 seções onde a urna foi trocada por uma urna reserva**. Nelas, **50 votos** que estão no boletim e no registro dos votos não têm nenhuma linha de "voto computado" em diário publicado. São 0,000039% dos 128.236.074 votos do país.

**Fato (1º turno, parcial: só AC, AL, AM, AP, BA, CE, DF, ES, GO, MA, MG, MS e MT):** nessas 13 UFs, os boletins também conferem com o registro dos votos e com o resultado oficial publicado. O resultado oficial por município e zona **não publica 107 números de candidato** que receberam votos nas urnas (94.798 votos nessas 13 UFs). Um deles é o número 28, para Presidente. Os votos estão no boletim e nos outros arquivos oficiais; só faltam nessa tabela. A causa é **Hipótese**.

O que este resultado **não** prova: que quem votou era de fato o eleitor. Um voto dado por outra pessoa no lugar de um eleitor ausente gera boletim, registro e diário coerentes entre si. Esse ponto fica no tópico 4.

## Os três registros, e por que compará-los

| Registro | O que contém | Quem garante que não foi alterado |
|---|---|---|
| **Boletim de Urna (BU)** | Votos de cada candidato, brancos, nulos; eleitores aptos; quantos votaram; e **como cada eleitor foi liberado** (com digital, sem digital) | Assinatura da urna (tópico 1) |
| **Registro Digital do Voto (RDV)** | Cada voto, um por um, em ordem embaralhada, sem identificação do eleitor | Assinatura da urna (tópico 1) |
| **Diário da urna (log)** | Cada evento com data e hora: eleitor liberado, voto confirmado, voto computado, urna reiniciada | Impressão digital e lacre da urna no pacote de lacres (tópico 1) |

Os três saem do mesmo programa, na mesma urna, a partir da mesma votação. Se um voto foi acrescentado ou tirado de um deles depois, ou se a urna funcionou fora do padrão, os três deixam de bater.

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

## Como foi feito

Seis comparações, rodadas em **todas** as seções com boletim. Fonte: `docs/analysis/coerencia-contagem/03-coerencia-interna.md`, script `scripts/auditoria/contagem-coerencia.mjs`. Todos os números desta página foram refeitos de forma independente, do banco e dos arquivos brutos, pelos scripts `scripts/auditoria/verifica-pericia-coerencia*.mjs` (ver "Como repetir"), ou vêm de parecer do revisor cético que os sustenta.

| # | Comparação | Deve dar |
|---|---|---|
| C1 | Boletim × registro dos votos, por cargo: cada número, cada partido, brancos, nulos | igual |
| C2 | Votos computados no diário × quantos votaram, no boletim | igual |
| C3 | Total de votos de cada cargo × quantos votaram | igual (senador no 1º turno: o dobro, porque são 2 vagas) |
| C4 | Aptos × (aptos da seção + aptos em trânsito) | igual |
| C5 | Liberados com digital + por biografia + sem biometria cadastrada × quantos votaram | igual |
| C6 | Quantos votaram na seção × quantos votaram em cada eleição (federal e estadual) | igual |

Mais uma: **comparecimento maior que o número de aptos**, que seria impossível. Fonte: `docs/analysis/coerencia-contagem/04-a7-comparecimento-alto.md`, revisada pelo cético em `docs/analysis/cetico-revisor/10-a7-comparecimento-alto-sem-digital.md`.

## O que foi encontrado: 2º turno, país inteiro

**Fato.** Saída do autor em `data/parsed/auditoria/contagem/coerencia-2t.txt`; os números abaixo foram refeitos com `verifica-pericia-coerencia.mjs --turno 2`.

| Comparação | Comparações feitas | Com diferença |
|---|---:|---:|
| C1 boletim × registro dos votos | 539.815 (seção × cargo) | **0** |
| C2 diário × boletim | 499.178 seções | **10** (explicadas abaixo) |
| C3 soma dos votos × quantos votaram | 539.420 (seção × cargo com comparecimento no boletim) | **0** |
| C4 aptos = seção + trânsito | 539.817 (seção × eleição) | **0** |
| C5 formas de liberação × quantos votaram | 497.897 | **0** |
| C6 comparecimento da seção × por eleição | 499.178 | **0** |
| Comparecimento > aptos (**revisado pelo cético**) | 499.207 | **0** |

Detalhes que mostram que a conta foi feita voto a voto:

- **Fato.** Nulos do boletim: 3.180.769. No registro dos votos: 3.180.131 nulos + 638 nulos após suspensão = 3.180.769.
- **Fato.** Brancos: 1.662.313 nos dois. Nominais: 133.698.737 nos dois.

O que ficou de fora de alguma comparação, e por quê:

- **Fato.** 41 seções do exterior não foram instaladas: não há urna nem arquivo (423 aptos no resultado oficial, comparecimento 0).
- **Fato.** 29 seções do exterior usaram o Sistema de Apuração (cédula de papel, 831 votos). Não têm diário de eleitor, então ficam fora do C2. O boletim delas não traz o comparecimento da seção, só o de cada eleição, então ficam fora do C6.
- **Fato.** 1.310 seções do exterior não têm o detalhamento de como os eleitores foram liberados, e ficam fora do C5.
- **Fato.** Em 395 seções houve também uma de 3 consultas populares, e o boletim não traz o comparecimento dessas consultas. Os votos delas foram conferidos no C1 (boletim = registro dos votos) e os aptos no C4; ficam fora do C3, que precisa do comparecimento. Por isso o C3 tem 395 comparações a menos que o C1.

### As 10 seções em que o diário não bateu de primeira

Cada diário do pacote da seção foi recontado em separado, no arquivo bruto (`scripts/auditoria/contagem-log-pacote.mjs`, refeito por `verifica-pericia-coerencia-logs.mjs`). Um voto foi identificado pela urna e pela hora da linha do diário, para não contar duas vezes a cópia do mesmo diário.

**Fato.**

| Seção (UF município/zona/seção) | Urna | Boletim | Diário recontado | O que explica |
|---|---|---:|---:|---|
| SP 64777/0395/0298 | da seção | 268 | 268 | o programa de leitura não abriu o diário; o diário tem 268 |
| BA 39870/0133/0184 | reserva | 228 | 185 + 43 | o diário da urna original estava 2 vezes no pacote |
| MG 40690/0016/0264 | reserva | 114 | 114 | um diário já continha o outro |
| ES 57932/0009/0085 | RED | 308 | 308 | o pacote trouxe também o diário de outra seção (0112), recuperada antes pela mesma máquina; a 0112 tem boletim 304 e diário 304 |
| BA 34711/0021/0178 | da seção | 234 | 233 + 1 | voto confirmado e urna reiniciou antes de registrar "computado" |
| PB 21750/0002/0254 | da seção | 304 | 303 + 1 | idem |
| PI 11533/0003/0216 | da seção | 259 | 258 + 1 | idem |
| **RS 89060/0017/0191** | reserva | 92 | 90 + 1 confirmado | **1 voto sem rastro no diário** |
| **BA 35653/0173/0235** | reserva | 217 | 204 | **13 votos sem rastro no diário** |
| **MA 08893/0047/0609** | reserva | 224 | 188 | **36 votos sem rastro no diário** |

- **Fato.** Sete das dez eram erro de leitura (diário duplicado, diário de outra seção, diário não aberto) ou voto confirmado pouco antes de a urna reiniciar.
- **Fato (revisado pelo cético).** O 2º turno tem 11.748 seções com mais de um diário no pacote. Fora as 3 seções dos 50 votos, nenhuma tem voto sem rastro: nas outras 11.745, o boletim bate com os votos computados. O cético cruzou também o boletim com o diário nas 499.207 seções completas, e não há outra seção com voto sem rastro.
- **Fato.** Nas 3 seções de um só diário achadas pelo C2 (BA 34711/0021/0178, PB 21750/0002/0254, PI 11533/0003/0216), o voto confirmado logo antes de a urna reiniciar entrou no boletim. **Pendente: em verificação** se há seções em que um voto confirmado antes de a urna cair **não** entrou no boletim, e quantas são. **Hipótese:** depende de a urna ter gravado o voto no cartão antes ou depois da queda. O diário não mostra qual foi.

### Os 50 votos sem rastro no diário

**Fato (revisado pelo cético, `docs/analysis/cetico-revisor/08-votos-sem-log-contingencia.md`, veredito "sustentado com ressalvas").** O texto abaixo segue a afirmação revisada.

Nas três seções, a urna original deu defeito e foi trocada por uma urna reserva (urna de contingência). O boletim e o registro dos votos, assinados pela reserva, têm os 50 votos. Boletim e registro fecham entre si e por candidato, e o boletim é igual ao resultado oficial. As assinaturas da urna reserva conferem com 0 falha nas três seções (no MA e na BA, depois de cortar 1 byte que sobra no campo do certificado: defeito da ferramenta de leitura, não do arquivo). **O diário da urna que recebeu esses votos não está no pacote.** Ele nunca entrou no pacote assinado: a lista de arquivos assinada tem um só diário, e o lacre dele confere. Não é um arquivo que o TSE deixou de divulgar.

O próprio boletim diz como esses eleitores foram liberados. A conta é: total do boletim menos o que os diários publicados mostram.

| Seção | Votos sem diário | Com digital | Por biografia (digital não reconhecida) | Sem biometria cadastrada |
|---|---:|---:|---:|---:|
| MA 08893/0047/0609 | 36 | 32 | 4 | 0 |
| BA 35653/0173/0235 | 13 | 1 | **12** | 0 |
| RS 89060/0017/0191 | 1 (mais 1 com voto confirmado) | 1 | 1 | 0 |

Como o diário se perdeu (**Fato, MA e BA**, achado nos arquivos pelo cético). Nas duas seções, uma urna preparada para **outra seção** foi ligada com o cartão de votos (MV) da seção. A ordem foi esta:

1. essa urna começou a gravar o próprio diário na mídia externa;
2. só depois recusou o cartão de votos, com "erro 72" (os dados do cartão não correspondem à urna);
3. a urna reserva seguinte copiou da mídia externa o diário dessa urna recusada, e não o da urna que tinha recebido os votos.

- **MA 0609.** Os 36 votos foram gravados pela urna original da seção (nº 01663580), que abriu às 08:00:01. Às 10:25:54 o cartão foi posto na urna 01813459, preparada para a seção 0445. Ela foi **bloqueada** pelo erro 72, duas vezes (10:29:43 e 10:35:21), e não gravou votos. A urna reserva 01664037 registrou depois 188 votos. O diário da urna original não está no pacote.
- **BA 0235.** Os 13 votos foram gravados por outra urna, entre a abertura (08:48:54) e as 09:50:30. Pelo nome do arquivo que ela deixou no pacote, é a urna 01681986. Nesse meio tempo, a urna original 01833178 foi recarregada em campo com a preparação da seção 0083. Às 09:50:30 ela foi ligada com o cartão da 0235 e o recusou com erro 72 às 09:54:07. A urna reserva 01656557 registrou depois 204 votos. O diário da urna 01681986 não está no pacote.
- **RS 0191 (outro mecanismo).** O diário da urna original está publicado, com 15 votos. Ele para às 09:02:34, no meio da liberação de um eleitor, sem desligamento, e volta às 09:38:59. É compatível com queda da urna e perda do fim do diário.

**BA 0235, liberação.** 12 dos 13 votos sem diário foram liberados por biografia, sem digital do eleitor. Nos 204 votos com diário da mesma seção, essa forma de liberação foi 10,3% (21 de 204). Essa comparação **não** mede raridade, porque a liberação por biografia se concentra por urna. Entre as sessões curtas de urnas substituídas no país, 12 de 13 ou mais por biografia aparece em 6% a 8% delas, e em cerca de 24% nas do modelo UE2013 (9 de 37), ao qual a 01681986 pertence pela faixa de numeração. Não é evidência nem a favor nem contra.

Duas leituras do risco:

- **Hipótese (risco, princípio 8).** Na janela sem diário da BA, não dá para descartar votos lançados por quem não era o eleitor. Os arquivos públicos não provam, voto a voto, que esses 50 votos vieram de eleitores.
- **Contra essa hipótese há só rastros agregados.** No MA, o boletim indica que 32 dos 36 votos foram liberados por digital conferida com o cadastro. Na BA, o padrão de 12 de 13 sem digital também aparece em urnas do mesmo modelo com diário completo, e o tamanho assinado do arquivo de digitais capturadas mostra cerca de 12 capturas a mais: prova que houve dedo no leitor, não de quem.

**Fato (revisado pelo cético).** No 2º turno, nenhuma outra seção tem voto sem rastro no diário. O efeito máximo desse tipo de falha é de 50 votos.

**Risco (procedimento humano).** Tirar o cartão de uma urna e pôr em outra, e recarregar uma urna no dia da eleição, são feitos por pessoas (mesário, técnico). Esta perícia não conta "o mesário seguiu o procedimento" como controle. O que existe de controle técnico (boletim = registro dos votos, assinaturas, contadores de liberação, e o erro 72, que bloqueou as urnas com preparação de outra seção) fecha também nessas 3 seções. O que falta é o rastro linha a linha de 50 votos. No MA, a reserva usada ainda tinha a preparação de outra seção; na BA, a urna original foi recarregada em campo com a preparação de outra seção.

**Fato.** No 2º turno, 5.714 seções usaram urna reserva. Os 50 votos sem diário estão em 3 delas.

## O que foi encontrado: 1º turno (parcial)

**Parcial**: UFs incluídas AC, AL, AM, AP, BA, CE, DF, ES, GO, MA, MG, MS, MT (196.730 seções); ficam de fora PA, PB, PE, PI, PR, RJ, RN, RO, RR, RS, SC, SE, SP, TO e exterior (ZZ). Os números abaixo valem só para essas 13 UFs e serão refeitos com o país inteiro. Refeitos com `verifica-pericia-coerencia.mjs --turno 1 --uf ac,al,am,ap,ba,ce,df,es,go,ma,mg,ms,mt`.

- **Fato.** C1 boletim × registro dos votos: 983.650 comparações (seção × cargo), 0 diferença. Nulos do boletim 16.384.298 = 14.846.715 nulos + 65.839 nulos após suspensão + 1.471.744 "nulos por repetição" do registro dos votos (categoria própria do registro para voto repetido; a regra exata está na especificação do TSE e não foi detalhada na fonte). Legenda: 4.429.786 nos dois.
- **Fato.** C3: 0 diferença. Senador = 2 × comparecimento nas 196.730 seções; os outros cargos, 1 ×.
- **Fato.** C4 e C5: 0 diferença (o C5 fica sem as 2 seções de MG citadas abaixo, que não trazem o detalhamento da liberação).
- **Fato.** C6: 0 diferença, fora 2 seções de MG apuradas em parte com cédula pelo Sistema de Apuração (MG 41238/0039/0168 e 50075/0047/0041, motivo registrado no boletim: "urna chegou após o início da votação").
- **Fato.** C2: das 153.095 seções com urna e diário lido (fora as 2 do Sistema de Apuração), 3 não bateram de primeira e fecharam na recontagem do arquivo bruto, com 0 voto sem rastro.
- **Pendente.** C2 de 43.633 seções do AM e da BA: o diário do 1º turno dessas UFs ainda não foi lido para o banco.

### Os 107 números de candidato que faltam no resultado por município

Fonte: `docs/analysis/coerencia-contagem/01-bu-x-oficial.md`, refeito por `verifica-pericia-coerencia-munzona.mjs` e `verifica-pericia-coerencia-secao.mjs`. **Parcial**: mesmas 13 UFs acima. A revisão cética deste ponto ainda não terminou.

O TSE publica o resultado de três formas: por seção (`votacao_secao`, só Presidente), por seção e cargo com totais (`detalhe_votacao_secao`) e por candidato, município e zona (`votacao_candidato_munzona`). Os boletins foram comparados com as três.

- **Fato.** Por seção, Presidente: as 196.730 seções batem com o boletim em todos os números, inclusive brancos e nulos.
- **Fato.** Por município e zona, em todos os cargos: onde o arquivo oficial publica o número, o valor é igual à soma dos boletins. Não há nenhum caso de valor diferente, nem de voto no oficial que não esteja no boletim.
- **Fato.** Mas o arquivo por município e zona **não tem linha** para 107 números (UF × cargo × número) que receberam votos nas urnas. Esses números também não estão na lista de candidatos do site de resultados. Somam 94.798 votos no boletim:

| Cargo | Números ausentes | Votos no boletim |
|---|---:|---:|
| Presidente (número 28) | 13 (UF × número; um só candidato, em 13 UFs) | 1.985 |
| Governador | 1 | 8.456 |
| Senador | 3 | 66.614 |
| Deputado federal | 38 | 12.916 |
| Deputado estadual | 49 | 4.340 |
| Deputado distrital | 3 | 487 |
| **Total** | **107** | **94.798** |

- **Fato.** Os mesmos votos **estão** no arquivo por seção (o número 28 tem 1.985 votos, igual ao boletim seção a seção) e no arquivo de totais por seção, contados como votos nominais (o total de nominais desse arquivo é igual ao do boletim em cada UF e cargo).
- **Hipótese.** São candidaturas canceladas, renunciadas ou negadas pela Justiça depois que as urnas foram preparadas. O número continua na urna e o voto é gravado como nominal, mas a totalização não o publica por candidato. Para confirmar, falta baixar o arquivo de situação das candidaturas (`consulta_cand_2026`).
- **O que isso prova:** a diferença é de cobertura da tabela, não de contagem. Nenhum voto mudou de candidato.
- **O que não prova:** como a totalização classificou esses votos (válido, nulo, anulado). Isso depende da situação de cada candidatura, ainda não conferida.
- **Fato.** No 2º turno não há números ausentes: Presidente e Governador batem por município e zona (12.584 e 1.026 pares, 0 diferença).

## Comparecimento alto (revisado pelo cético)

Fonte: `docs/analysis/cetico-revisor/10-a7-comparecimento-alto-sem-digital.md`, veredito "sustentado com ressalvas". O texto abaixo segue a afirmação revisada.

- **Fato.** No 2º turno, das 499.207 seções, **nenhuma** tem comparecimento acima dos aptos. 639 passam de 95% e 12 chegam a 100%.
- **Fato.** O comparecimento varia entre seções da mesma zona 3,2 vezes mais do que se cada eleitor decidisse ir votar como numa moeda jogada, sem relação com os vizinhos. Um modelo que leva essa variação em conta espera entre 197 e 341 seções acima de 95%, conforme o jeito de medir. O excesso está nas seções com menos de 200 aptos (388 observadas contra 55 esperadas). Nas maiores, o modelo ajusta (251 contra 263).
- **Hipótese.** A causa do excesso nas seções pequenas (eleitores em trânsito, seções redistribuídas, seções novas) não foi testada.
- **Fato.** Nessas 639 seções, a liberação de eleitor que tinha digital e ela não foi reconhecida é igual à da própria zona (7,58% contra 7,77%). O resultado é **neutro**: nem a favor nem contra a ideia de mesários votando no lugar de ausentes. Ele limita esse tipo de voto a cerca de 110 a 400 no total das 639 seções (limite de 95%), se espalhado por elas. **Não** testa fraude concentrada em poucas seções, fraude pelo ano de nascimento nem fraude que não passa pela digital.
- **Fato.** Uma lista inicial de 23 seções "suspeitas" caiu para 1 ou 2 quando o cálculo levou em conta a variação real entre seções, e nenhuma se sustenta de forma firme. A análise desse ponto continua no tópico 4.

## Prova de que o teste funciona (contraprova)

- **Fato.** A comparação diário × boletim (C2) apontou 10 seções. A recontagem achou em cada uma a causa: erros do próprio programa de leitura (diário não aberto, diário contado duas vezes, diário de outra seção) e votos de fato sem rastro. Ou seja, o teste é capaz de acusar diferença, inclusive diferenças que vinham de erro nosso.
- **Pendente.** Não há ainda um teste automático que altere de propósito um boletim ou um registro de votos e mostre que C1 a C6 acusam a alteração, como existe para os lacres (tópico 1) e para a soma dos boletins (tópico 5).

## Limites

1. **Coerência não é legitimidade.** Os três registros saem do mesmo programa. Um voto dado por outra pessoa no lugar do eleitor fica coerente nos três. A única defesa técnica com rastro é a digital do eleitor (tópico 4).
2. **Lacres.** Até onde a conferência dos lacres foi feita está no tópico 1. Nas 3 seções dos 50 votos, o cético conferiu as assinaturas (0 falha). Além disso, o diário não traz a corrente de elos lacrada que o boletim tem: ele é protegido só pelo lacre do arquivo inteiro.
3. **Os 50 votos só se esclarecem com dados que não são públicos:** o diário interno das urnas que gravaram esses votos, os arquivos de digitais capturadas dessas seções e a ata da mesa.
4. **1º turno parcial:** só as 13 UFs listadas acima; faltam 14 UFs e o exterior. O diário de AM e BA do 1º turno ainda não foi lido.
5. **Pendente.** A conferência independente do matemático forense sobre a corrente de elos do boletim e o ciclo de cada eleitor no diário (`docs/analysis/matematico-forense/01-catalogo.md`, itens I1 a I3 e I10 a I12) ainda não tem resultado escrito.

## Como repetir

```
node scripts/auditoria/contagem-coerencia.mjs --turno 2             # C1 a C6, 2º turno
node scripts/auditoria/contagem-log-pacote.mjs --turno 2            # recontagem diário a diário das seções do C2
node scripts/auditoria/contagem-log-pacote.mjs --turno 2 --multiplos --parte 1/2   # e 2/2: todas as seções com 2+ diários
node scripts/auditoria/contagem-munzona.mjs --turno 1               # os 107 números ausentes
node scripts/auditoria/contagem-a7.mjs --turno 2                    # comparecimento × aptos

# verificação independente desta página (cópia de leitura do banco e arquivos brutos)
node scripts/auditoria/verifica-pericia-coerencia.mjs --turno 2
node scripts/auditoria/verifica-pericia-coerencia.mjs --turno 1 --uf ac,al,am,ap,ba,ce,df,es,go,ma,mg,ms,mt
node scripts/auditoria/verifica-pericia-coerencia-logs.mjs --turno 2 ma/08893/0047/0609 ba/35653/0173/0235 rs/89060/0017/0191   # e as outras 7
node scripts/auditoria/verifica-pericia-coerencia-munzona.mjs --turno 1 --uf ac,al,am,ap,ba,ce,df,es,go,ma,mg,ms,mt
node scripts/auditoria/verifica-pericia-coerencia-munzona.mjs --turno 2
node scripts/auditoria/verifica-pericia-coerencia-secao.mjs --uf ac,al,am,ap,ba,ce,df,es,go,ma,mg,ms,mt
node scripts/auditoria/verifica-pericia-coerencia-zz.mjs            # seções não instaladas e do Sistema de Apuração no oficial
```

Saídas do autor em `data/parsed/auditoria/contagem/` (`coerencia-*`, `log-pacote-*`, `munzona-*`, `a7-*`).

## Próximos passos

- [x] Revisão cética dos 50 votos sem diário (`cetico-revisor/08`, sustentado com ressalvas).
- [ ] **Pendente.** Revisão cética dos 107 números ausentes.
- [ ] **Pendente.** Pedir, pela via de fiscalização, o diário interno das urnas que gravaram os votos sem diário (MA 08893/0047/0609: urna 01663580; BA 35653/0173/0235: urna 01681986), o diário interno guardado pela urna 01833178 na recarga em campo, os arquivos de digitais capturadas dessas seções e a ata da mesa das 3 seções.
- [ ] **Pendente.** Comparar a votação dessas 3 seções com a do 1º turno.
- [ ] **Pendente.** Baixar `consulta_cand_2026` e confirmar a situação dos 107 números.
- [ ] **Pendente.** Refazer o 1º turno com as 14 UFs restantes e o exterior; ler o diário do 1º turno de AM e BA.
- [ ] **Pendente.** Medir no país inteiro quantos votos confirmados antes de reinício da urna entraram ou não no boletim (inclusive nas seções com um só diário).
- [ ] **Pendente.** Teste automático com boletim e registro alterados de propósito (contraprova de C1 a C6).


=== ARQUIVO 03-linha-do-tempo.md ===

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


=== ARQUIVO 04-liberacao-dos-eleitores.md ===

# 4. Como os eleitores foram liberados para votar

> **Situação:** revisto em 29/10/2026 pela regra "só entra número reproduzido". Cada número deste tópico vem de uma de duas fontes: um parecer do revisor cético que o sustenta (`docs/analysis/cetico-revisor/01`, `06` e `10`), ou um recálculo independente feito sobre todas as seções (`scripts/auditoria/verifica-pericia-liberacao.mjs` e, para os casos do item 7, `scripts/auditoria/verifica-pericia-liberacao-logs.mjs`). O que não pôde ser reproduzido saiu do texto e aparece como **Pendente**, sem número. Os dois turnos estão completos nos itens 1, 4, 5 e 7 (28 unidades: 26 estados, DF e exterior). O teste do item 6.1 é **parcial**, e o item diz quais UFs entraram.

## A pergunta

Quantos eleitores votaram depois de pôr o dedo no leitor da urna, e quantos votaram sem isso? Quem liberou os que votaram sem digital? E essa liberação favoreceu algum dos dois candidatos?

## Resposta curta

- **Fato (recalculado):** no 2º turno, 87,3% dos eleitores foram liberados pela própria digital. 5,7% votaram sem digital porque a urna não tinha a digital deles, e 6,7% porque tinham digital, ela não foi reconhecida e a mesa os liberou à mão. Os 0,3% restantes são do exterior, onde ninguém votou com digital. **Fato (revisado, parecer 10, e recalculado):** sem o exterior, o total sem digital no Brasil é 12,4%.
- **Fato (recalculado):** das 8,6 milhões de liberações à mão, 2,8 milhões ficaram no log da urna sem nenhum mesário ligado a elas.
- **Fato (revisado, parecer 01):** em 16.011 seções, a urna liberou mais eleitores "sem biometria" do que o cadastro público diz existir. A causa medida é uma diferença de definição entre dois arquivos do TSE, e não eleitores a mais. Mas esses eleitores votaram sem nenhum controle técnico.
- **Fato (revisado, parecer 06), parcial (25 UFs; faltam SP, TO e exterior):** os eleitores que foram votar no 2º turno e não tinham ido no 1º se dividiram entre 13 e 22 da mesma forma, tenham sido liberados com ou sem digital. O teste pega uma inserção concentrada a partir de cerca de 34 mil votos, mas é cego a outros tipos de inserção (ver 6.1).
- **Pendente: em verificação.** Se as seções que liberam mais gente sem digital votam mais num dos candidatos, comparando seções parecidas (item 6.2).
- **Pendente:** se os eleitores liberados sem digital votaram majoritariamente no 13, e se isso foi mais forte no Nordeste. Os métodos estão escritos e rodando. Ainda não há resultado.
- **Limite que não muda:** o voto é secreto. Nenhum arquivo diz em quem votou o eleitor liberado sem digital. Esse voto só pode ser cercado por cima e por baixo, ou estimado pela comparação entre seções, mas nunca observado.

## Antes de começar: como uma pessoa é liberada para votar

Na seção, o mesário digita o número do título (ou o CPF) do eleitor no terminal da mesa. A partir daí, a urna segue um de três caminhos, e cada um deixa uma mensagem própria no diário da urna (o log):

| Caminho | O que acontece | Como aparece no boletim (BU) | Controle técnico? |
|---|---|---|---|
| **1. Pela digital** | A urna pede o dedo, a digital confere com a gravada no arquivo de eleitores da urna, o eleitor é liberado | "habilitados por biometria" | **Sim.** A digital do próprio eleitor fica registrada no log |
| **2. Pelo ano de nascimento** | A urna **não tem** a digital desse eleitor no arquivo dela. Ela não pede o dedo: pede só o ano de nascimento, que o mesário digita | "sem biometria cadastrada" | **Não.** Basta saber o título e o ano de nascimento |
| **3. Liberação manual** | O eleitor tem digital no arquivo, mas ela não é reconhecida (o log registra até 4 tentativas: `Solicita digital. Tentativa [n] de [4]`). A mesa digita um dado pessoal do eleitor e a urna aceita uma digital de quem estiver na mesa. Às vezes a urna liga essa digital a um mesário registrado, às vezes grava que não é possível associar a habilitação a um mesário | "habilitados por biografia" | **Não.** O dado pessoal é digitado por uma pessoa, e a digital gravada não é a do eleitor |

**Regra desta auditoria (princípio 8 de [../01-premissas.md](../01-premissas.md)):** só conta como controle o que é técnico e deixa rastro nos arquivos. Aqui, isso é só o caminho 1. Conferir o documento com foto, olhar a foto do eleitor que aparece na tela do mesário ou ter fiscal na seção são procedimentos feitos por pessoas. Eles podem ser ignorados ou combinados, então não contam como controle nem como explicação que reduza o risco. Os caminhos 2 e 3 são **brechas humanas**: dependem só do que alguém digita na mesa.

Brecha aberta não é prova de fraude. Este tópico mede se o uso dessas brechas deixou nos dados o padrão que uma fraude deixaria.

## Por que não dá para ver em quem o liberado votou

O log diz **como** cada eleitor foi liberado e a que horas. O Registro Digital do Voto (RDV) traz os votos da seção um a um, mas embaralhados e sem nenhuma ligação com o eleitor. Isso é o sigilo do voto, e é proposital. Então:

- não existe, em nenhum arquivo público, a informação "este eleitor, liberado sem digital, votou no 13";
- o que dá para fazer é **cercar**. Um exemplo inventado: numa seção com 200 votos, 190 para o 13 e 30 liberados sem digital, pelo menos 20 desses 30 votaram no 13, porque só sobram 10 votos que não foram para o 13;
- ou **estimar**, comparando muitas seções: se as que liberam mais gente sem digital votam mais num candidato, depois de descontar as diferenças de perfil entre elas. Essa estimativa se chama inferência ecológica: tira conclusões sobre pessoas a partir de totais de grupos, e pode errar quando os grupos são diferentes de formas que os dados não mostram.

Por isso, nenhum resultado deste tópico diz em quem um eleitor liberado votou. Os resultados dizem se o conjunto das liberações deixou um padrão compatível ou incompatível com votos inseridos a favor de um lado.

## O que foi encontrado

### 1. Quantos votaram com e sem digital

**Fato (recalculado).** O país tem 499.207 seções nos dois turnos. A tabela usa 499.176 delas: ficaram de fora as 31 seções em que o boletim de um dos turnos veio do Sistema de Apuração, e não da urna, porque esse boletim não divide os eleitores por forma de liberação. Entram as 28 unidades (26 estados, DF e exterior):

| | 1º turno | 2º turno |
|---|---|---|
| Comparecimento | 125.274.487 | 128.234.583 |
| Pela digital (caminho 1) | 109.650.927 (87,5%) | 111.969.845 (87,3%) |
| Pelo ano de nascimento, sem digital na urna (caminho 2) | 6.940.334 (5,5%) | 7.251.695 (5,7%) |
| Liberação manual (caminho 3) | 8.342.249 (6,7%) | 8.632.431 (6,7%) |
| … dessas, sem nenhum mesário ligado a elas no log | 3.221.817 | 2.791.394 |

Fonte: `node scripts/habilitacao-1t-2t.mjs` (autor), reproduzido por `node scripts/auditoria/verifica-pericia-liberacao.mjs` → `data/parsed/auditoria/verifica-pericia/liberacao.json`. O exterior entra no comparecimento, mas o boletim de lá não traz essa divisão (item 4). A linha "sem nenhum mesário" é, em cada seção, o número de liberações manuais do boletim menos as que o log liga a um mesário (mensagem `Mesário … habilitou o eleitor`).

- **Fato (revisado, parecer 10, e recalculado):** a soma dos caminhos 2 e 3 dá 12,4% dos votantes do Brasil, sem o exterior, no 2º turno. No 1º turno, 12,2%.
- **Fato (recalculado):** nessas seções, o comparecimento subiu 2.960.096 do 1º para o 2º turno. 78,3% desse aumento entrou pela digital. Pelo ano de nascimento entraram 311.361 a mais, e pela liberação manual, 290.182 a mais.
- **Fato (recalculado):** no Acre, nas 2.270 seções do 2º turno, o log contado atendimento por atendimento e o boletim dão exatamente os mesmos números em todas as seções: 415.675 pela digital, 15.325 pelo ano de nascimento e 22.654 liberações manuais ([../06-leitura-bu-rdv-log.md](../06-leitura-bu-rdv-log.md)).

### 2. Quem liberou

O log grava o título do mesário quando a urna consegue ligar a digital usada na liberação manual a um mesário registrado na seção. Este relatório não reproduz títulos de mesários. Fala só de seções.

- **Fato (recalculado):** no Acre, das 22.654 liberações manuais do 2º turno, 6.974 (30,8%) não têm nenhum mesário ligado a elas no log. Elas aparecem em 1.424 seções. No país, a mesma situação aparece em 2.791.394 liberações no 2º turno (tabela acima). Nesses casos, os arquivos não dizem quem pôs o dedo.
- **Fato (revisado, parecer 10, e recalculado):** no Rio Grande do Norte, em 2.890 seções com 20 ou mais liberações manuais ligadas a um mesário, o mesário que mais liberou fez, na mediana, 91,7% dessas liberações. Concentrar a liberação numa só pessoa da mesa é o comum ali, não a exceção.
- **Fato (revisado, parecer 10):** mesmo quando o log mostra 4 tentativas de digital antes da liberação, ele não separa uma digital que falhou de verdade de um dedo trocado de propósito. O rastro mostra que alguém pôs o dedo, mas não quem.

### 3. Seções com mais "sem biometria" do que o cadastro permite (revisado, parecer 01)

O TSE publica o **perfil do eleitorado**: quantos eleitores cada seção tem e quantos deles têm biometria cadastrada (arquivo de 14/07/2026). O teste comparou esse número com o boletim: a urna não deveria liberar pelo ano de nascimento mais gente do que a seção tem sem biometria, mais uma folga para os eleitores em trânsito. O teste cobre o Brasil, sem o exterior.

- **Fato:** em 16.011 das 497.508 seções do 2º turno analisadas (3,2%), o boletim registra mais votantes "sem biometria cadastrada" do que o perfil permite. O excesso soma 36.340 eleitores, 0,03% dos votos. Em 7.922 dessas seções, o perfil diz que 100% dos eleitores têm biometria.
- **Fato:** o excesso se concentra em algumas zonas. As maiores: ES, Vitória, zona 52 (126 seções, 680 eleitores); SP, Indaiatuba, zona 211 (84 seções, 600); PA, Ulianópolis, zona 84 (52 seções, 561).
- **Pendente: em verificação.** O tamanho do excesso no 1º turno e quantas seções o repetem nos dois turnos. A conta que existe deixou SP de fora e tem um pequeno defeito nas seções agregadas, apontado pelo revisor, que a faz contar um pouco a menos. Por isso, nenhum número do 1º turno entra aqui.
- **Fato:** há também o efeito contrário, maior e em outras zonas: 17.621 seções com 229.717 votantes **pela digital** acima do que o perfil diz ter biometria (sobretudo MG, ES, MS e RJ).
- **Fato:** o caso SP, Indaiatuba, zona 211, seção 438, foi conferido no arquivo bruto. O perfil diz que os 337 eleitores têm biometria. O boletim e o log registram 65 liberados pelo ano de nascimento, e em nenhum desses atendimentos a urna pediu digital.
- **Fato:** o rastro que explica o excesso é a mensagem `Foto do eleitor apresentada`. Nas 378 seções com excesso de 10 ou mais (todas elas), 84,8% dos atendimentos sem biometria mostraram a foto do eleitor na tela do mesário. Nessas 378 seções, contando como "sem biometria" só quem também não tinha foto, o excesso cai de 5.560 para 54.
- **Pendente:** quanto a foto aparece nas seções sem excesso. A comparação existente foi feita só numa amostra de seções, e por isso não tem número aqui. Também está pendente a medição do marcador da foto nas 16.011 seções inteiras.
- **Fato:** a mesa não escolheu o caminho. Não houve pedido de digital nesses atendimentos. Quem levou a urna ao ano de nascimento foi o arquivo de eleitores carregado nela, que tinha a foto e não tinha a digital.

**O que isso quer dizer.** O excesso não mostra eleitores a mais nem contagem impossível: em nenhuma seção o comparecimento passa do número de aptos. Mostra que o "com biometria" do cadastro público não é o mesmo "com digital" que a urna usa.

- **Hipótese (a mais provável, a confirmar com o TSE):** eleitores com foto coletada e digital pendente, rejeitada ou de má qualidade. Os dados públicos não separam isso de outras duas causas que deixam o mesmo rastro: biometria importada de outro órgão sem a digital no formato da urna, ou digitais retiradas do arquivo na preparação das urnas.
- **Hipótese (risco, princípio 8):** esses eleitores votaram só com título e ano de nascimento, e a conferência da foto foi feita por uma pessoa. O excesso é só a parte visível desse grupo. O tamanho real no país não foi medido, e só sai com o número oficial de eleitores com digital carregada na urna, por seção (pedido pela LAI, ver Próximos passos).
- **Fato:** os testes de uso não acharam sinal de que essa porta tenha sido usada em larga escala. O comparecimento não sobe com o tamanho do grupo. As seções com excesso ficam de 0 a 1,7 ponto acima das vizinhas (5 pontos na zona 84 de Ulianópolis, com poucas seções). Na última hora de votação, há 0,49 ponto a mais de liberações sem biometria, cerca de 0,15 eleitor por seção.
- **Não sustentado:** ler este achado como voto a mais, contagem impossível ou uso de título de outra pessoa.

### 4. No exterior, ninguém votou com digital

- **Fato (recalculado):** nas 1.281 seções do exterior com voto, os 380.612 votos do 2º turno foram todos liberados pelo título (ou CPF) e ano de nascimento. Nenhum foi liberado pela digital, nem à mão. No 1º turno, 340.977 votos, também todos assim. O perfil do eleitorado (14/07/2026) registra 222.584 eleitores do exterior com biometria (24% de 918.876), e nem esses votaram com digital.
- **Hipótese (risco):** no exterior, quem souber o título e o ano de nascimento de um eleitor da seção pode votar no lugar dele sem barreira técnica nenhuma. Não dá para medir quantos fizeram isso. São 0,3% do comparecimento nacional.
- **Pendente:** perguntar ao TSE se a urna do exterior é preparada sem digitais ou se o programa desliga a biometria, e qual norma prevê isso.

Fonte: [../analysis/biometria-mesarios/07-exterior-sem-biometria.md](../analysis/biometria-mesarios/07-exterior-sem-biometria.md), reproduzido por `verifica-pericia-liberacao.mjs`.

### 5. Urnas antigas e liberação sem digital (H07)

A hipótese era que urnas de modelo antigo teriam sido mandadas para certas regiões para dispensar a biometria.

- **Fato (recalculado):** todo modelo usado no Brasil no 2º turno lê digital. As urnas de 2013 liberaram 82,2% dos eleitores pela digital, em 11.433 de 11.434 seções. A premissa de H07 (urna antiga não pede digital) não se confirma no Brasil.

| Modelo | Seções | Pela digital | Pelo ano de nascimento | Liberação manual |
|---|---|---|---|---|
| UE2013 | 11.434 | 82,2% | 7,0% | 10,8% |
| UE2015 | 87.213 | 84,1% | 6,3% | 9,6% |
| UE2020 | 200.504 | 88,4% | 5,5% | 6,0% |
| UE2022 | 198.746 | 88,6% | 5,4% | 6,0% |

2º turno, sem o exterior. Uma seção de SP (64777, zona 395, seção 298) não traz o modelo no log; o banco a registra como UE2013, e ela está contada nessa linha.

- **Fato (recalculado):** comparando cada seção só com as outras da mesma zona eleitoral, sem outros controles, o modelo quase não muda a liberação pelo ano de nascimento: no máximo 0,2 ponto a menos nas urnas de 2013, em relação às de 2022. Muda a liberação manual: +4,3 pontos nas urnas de 2013 e +3,2 nas de 2015, no 2º turno (+4,5 e +3,3 no 1º). Ou seja, nas urnas antigas a digital falha mais e a mesa libera mais à mão. Isso alarga a brecha humana.
- **Fato (recalculado):** com a mesma comparação, as urnas antigas estão em seções que votam **menos** no 13, entre os votos de 13 e 22: −1,4 ponto (2013) e −1,0 (2015) no 2º turno; −1,4 e −0,9 no 1º.
- **Pendente:** a mesma comparação descontando também o perfil do eleitorado da seção (idade e cadastro sem biometria). O primeiro autor a fez, mas ela ainda não foi reproduzida.
- **Hipótese (técnica):** leitor de digital mais antigo, que falha mais. Teste possível: contar no log as tentativas de digital por modelo.

Fonte: [../analysis/biometria-mesarios/06-h07-modelo-urna.md](../analysis/biometria-mesarios/06-h07-modelo-urna.md) e `verifica-pericia-liberacao.mjs` (regressão por seção, com efeito fixo de UF e zona, sem peso).

### 6. A liberação sem digital favoreceu algum lado?

Como o voto do liberado não pode ser observado, foram usados testes indiretos. Cada um enxerga um tipo de fraude e é cego a outros. Por isso cada resultado vem com o que ele **não** exclui.

Dois termos usados abaixo:

- **Comparar dentro da UF, do município ou da zona:** cada seção é comparada só com outras do mesmo lugar. Assim, diferenças entre estados (por exemplo, o Nordeste votar mais no 13) não se misturam com o efeito que se quer medir.
- **t:** mede o tamanho de um sinal em relação ao ruído. Em geral, abaixo de 2 (para mais ou para menos) o sinal não se distingue do acaso. Quando se fazem dezenas de testes ao mesmo tempo, o limite sobe (aqui, cerca de 3,3), porque alguns passam de 2 só por sorte.

#### 6.1. Quem foi votar só no 2º turno (revisado, parecer 06)

Se mesários tivessem liberado sem digital pessoas para votar no lugar de ausentes, a favor de um lado, os eleitores **a mais** do 2º turno liberados sem digital votariam diferente dos eleitores a mais liberados pela digital.

- **Fato, parcial (25 UFs; faltam SP, TO e exterior; 389.827 seções pareadas):** comparando seções da mesma UF, cada eleitor a mais liberado sem digital se dividiu entre 13 e 22 como cada eleitor a mais liberado pela digital. A diferença é +0,002 ± 0,002 para o 13 e −0,001 ± 0,002 para o 22. Comparando dentro do município, −0,002 e +0,001. Isso quer dizer que, em cada 1.000 eleitores a mais, a forma de liberação mudou o voto em cerca de 2 votos para um lado ou para o outro, dentro da margem do acaso.
- **Fato:** o modelo que o primeiro autor usou, sem comparar dentro da UF, dava um sinal a favor do 13 (t = 3,4) que é falso: ele some quando a comparação é feita dentro da UF. O revisor registrou isso como um caso em que a forma do cálculo, e não os dados, produzia o sinal.
- **Hipótese, a examinar:** no Paraná há um sinal a favor do 13 (diferença +0,025, t = 4,2; dentro do município, +0,012, t = 2,8). Em Minas Gerais, um sinal a favor do 22 (+0,019, t = 3,7; dentro do município, +0,008, t = 2,0). Os dois vão em direções opostas, e no Paraná a parcela de votantes sem digital **caiu** do 1º para o 2º turno (8,15% para 7,68%). Nenhum dos dois é Fato de inserção.

**O que este teste exclui e o que não exclui.** Pela simulação do revisor, ele detecta inserção a partir de cerca de 34 mil votos concentrados, que varie entre seções da mesma UF (por exemplo, 40 votos em 0,25% das seções ou 10 votos em 1% delas). Ele **não** detecta:

- inserção igual em todas as seções de uma UF (na simulação, 5 ou 10 votos por seção em toda a BA, até cerca de 355 mil votos, passam sem sinal);
- inserção pequena e espalhada (5 votos em 5% das seções mais favoráveis ao 13 não chegam a ser detectados);
- fraude do mesmo tamanho nos dois turnos, que some na diferença entre eles;
- uso da brecha em poucas seções.

#### 6.2. Seções que liberam mais votam mais no 13? (Pendente: em verificação)

A pergunta é se as seções que liberam mais gente sem digital votam mais no 13, comparando seções da mesma zona e descontando o perfil do eleitorado (idade, cadastro sem biometria, tamanho) e o modelo da urna, nos dois turnos. O primeiro autor fez essa conta ([../analysis/biometria-mesarios/05-a9-regressao.md](../analysis/biometria-mesarios/05-a9-regressao.md)), mas ela ainda não foi reproduzida de forma independente nem passou pelo revisor cético. Por isso, nenhum número dela entra aqui, e nenhuma conclusão sobre essa associação é tirada neste tópico.

Duas leituras terão de ser testadas quando o número existir:

- **Hipótese (demográfica):** se houver associação, ela pode vir de um perfil social das seções que os controles disponíveis não captam. Os dados abertos não trazem renda nem urbano/rural por seção, então isso não pode ser testado com eles.
- **Hipótese (risco):** uma fraude do mesmo tamanho nos dois turnos, sempre a favor do mesmo lado, deixaria uma associação parecida nos dois turnos.

#### 6.3. Seções com comparecimento muito alto (revisado, parecer 10)

Se mesários votassem no lugar de ausentes, as seções com quase todos os eleitores presentes teriam mais liberação manual que as vizinhas.

- **Fato:** no 2º turno, nenhuma seção tem comparecimento acima dos aptos. 639 seções passam de 95% e 12 chegam a 100%.
- **Fato:** nessas 639 seções, a liberação sem digital é 9,37%, contra 12,41% esperados pelas próprias zonas. A diferença vem toda dos eleitores sem digital na urna. Por que esse grupo pesa menos ali é Hipótese: pode ser a composição do cadastro ou esse eleitor faltar mais. A liberação manual de quem tinha digital (o único caminho para votar no lugar de um ausente que tem biometria) é igual à da zona: 7,58% contra 7,77%.
- **Fato:** somando as 639 seções, isso limita os votos no lugar de ausentes por esse caminho a cerca de 110 a 400, menos de 1 por seção. O teste **não** cobre fraude concentrada em poucas seções, voto pelo ano de nascimento no lugar de ausente sem digital, nem fraude que não passa pela urna (compra de voto, coação, transporte).
- **Fato:** o caso mais destacado (RN, João Câmara, município 17132, zona 10, seção 145, 36,4% sem digital contra 12,9% da zona) já era o primeiro da zona no 1º turno, com 87,8% de comparecimento e a mesma urna. Com o modelo estatístico correto, ele não passa de forma firme no teste. A probabilidade minúscula que circulou para esse caso vinha de um modelo errado e não deve ser citada.
- **Leitura revisada:** o resultado é **neutro** sobre a liberação manual. Não é prova contra nem a favor de mesários votando por ausentes.

#### 6.4. Os liberados votaram majoritariamente no 13, sobretudo no Nordeste? (Pendente)

Essa hipótese (registrada como H13) foi apresentada ao projeto e está em análise. Em 29/10/2026 havia cinco métodos escritos, cada um com o seu script, e nenhum resultado redigido ou revisado. Por isso, nenhum número dela entra aqui.

| Método | O que pergunta | Script |
|---|---|---|
| Descritivo | Onde e quanto se liberou sem digital, por região e por UF, nos dois turnos. Não tenta adivinhar voto | `scripts/auditoria/liberacao-descritivo-distribuicao.mjs` |
| Limites | Em cada seção, o mínimo e o máximo de liberados que podem ter votado no 13 e no 22, sem nenhuma suposição (o raciocínio de "Por que não dá para ver em quem o liberado votou"). Compara com o que se veria se a liberação fosse sorteada entre as seções da zona | `scripts/auditoria/liberacao-limites-deterministicos.mjs` |
| Comparação entre seções | Depois de descontar zona, perfil do eleitorado e eleitores liberados pela digital, as seções com mais liberados votam mais no 13? Por região e por UF do Nordeste | `scripts/auditoria/liberacao-ecologico-regressao.mjs` |
| Entre turnos | Quando uma seção liberou mais gente sem digital no 2º turno do que no 1º, o acréscimo acompanhou votos a mais no 13, além do que acompanha um eleitor a mais qualquer? Dois testes principais, no Nordeste, foram fixados antes de rodar, para não escolher o teste depois de ver o resultado | `scripts/auditoria/liberacao-entreturnos-painel.mjs` |
| Por mesário | Concentração das liberações por mesário (com pseudônimo, nunca o título) e relação com o voto | `scripts/auditoria/liberacao-mesarios-dados.mjs` |

O que já existe nos itens revisados e toca o Nordeste:

- **Fato (revisado, parecer 06, e recalculado com todas as seções das duas UFs):** a parcela de votantes sem digital quase não mudou entre os turnos em BA (12,01% para 12,26%) e PE (13,92% para 14,33%). Os nove estados do Nordeste estão entre as 25 UFs do teste do item 6.1, que não achou diferença de voto entre os eleitores a mais liberados com e sem digital. Esse teste não foi feito separado por região.
- **Fato (recalculado):** o Nordeste tem um pouco mais de urnas de 2013: 3,5% das seções da região, contra 1,8% nas demais (sem o exterior). Nelas a liberação manual sobe tanto no Nordeste (10,6% contra 6,4% nas urnas de 2022) quanto fora dele (11,0% contra 5,8%).

Qualquer resposta a essa pergunta será uma estimativa ou um cerco, pelo motivo explicado no início: o voto do liberado não é registrado em lugar nenhum.

### 7. "O eleitor identificado já votou"

Quando alguém digita o título de quem já votou, a urna avisa `O eleitor identificado já votou`. Esse aviso é o rastro de um relato frequente: "cheguei e alguém já tinha votado por mim".

- **Fato (recalculado):** no 2º turno, a urna deu esse aviso 113.979 vezes, em 73.246 das 499.177 seções com voto. Em 99,6% das seções que tiveram o aviso, ele aparece menos de uma vez a cada 20 votos.
- **Fato (recalculado, conferido no log bruto):** em 9 seções com 30 votos ou mais, cada uma numa zona diferente (AC, AM ×2, DF, GO, MA ×2, RS e exterior), o aviso aparece cerca de uma vez por voto, logo depois de cada voto: na mediana de cada seção, de 9 a 19 segundos depois do voto. Exemplo: AC, Bujari, zona 9, seção 440, com 130 votos e 130 avisos. **Hipótese:** o mesário redigitou o título de quem acabou de votar. Ver [../casos/ac-01007-z0009-s0440.md](../casos/ac-01007-z0009-s0440.md).
- **Fato (recalculado, conferido no log bruto):** uma única seção do 2º turno tem mais avisos do que votos: ES, Vila Velha, zona 55, seção 364, com 388 avisos e 275 votos. 382 desses avisos estão em 19 rajadas de 5 ou mais, sem nenhum voto entre eles. 386 dos 388 avisos vieram de um título digitado, e 2 de um CPF. A maior rajada teve 59 avisos entre 11h19 e 11h33. **Hipóteses, nenhuma testada:** consulta indevida de uma lista pela urna, ou alguém digitando títulos em sequência até achar um que ainda não tinha votado. Ver [../casos/es-57037-z0055-s0364.md](../casos/es-57037-z0055-s0364.md).

## Prova de que os testes funcionam (contraprova)

- **Leitura do log:** no Acre inteiro, as três formas de liberação contadas no log batem com o boletim nas 2.270 seções. O revisor registrou um limite: log e boletim saem do mesmo programa da urna, então a igualdade prova coerência interna, não que o arquivo de eleitores carregado na urna estava certo.
- **Item 3:** um segundo caso, que o autor não tinha olhado, foi conferido no arquivo bruto do perfil (ES, Vitória, zona 52, seção 33: perfil com 394 de 394 eleitores com biometria, boletim com 19 e 20 sem biometria nos dois turnos). O marcador da foto foi medido por dois revisores, com seções diferentes.
- **Item 3, poder do teste de uso:** votos falsos do tamanho observado, injetados de propósito em 28% das seções, foram detectados em 10 de 10 repetições. Em 5% das seções, em 8 de 10. **O teste não tem poder para uso em poucas seções ou com poucos eleitores por seção.** O que está provado é que não houve uso amplo, e não que não houve uso.
- **Item 6.1:** o revisor inseriu votos falsos nos dados reais e mediu o que o teste pega e o que não pega (tabela do parecer 06). Foi assim que se chegou aos pontos cegos listados em 6.1.
- **Item 6.3:** em simulação, seções levadas a 95% de comparecimento só com votos falsos sem digital (16 em média por seção) foram marcadas em 0,6% das vezes. O teste por seção é fraco. O teste do conjunto das 639, pelo caminho da digital que falhou, é forte.
- **Itens 1, 4, 5 e 7:** os números foram recalculados de forma independente, de todas as seções dos dois turnos, e os casos do item 7 foram conferidos no log bruto. Esses itens são contagens; ainda não passaram por um parecer do revisor cético.

## O que este resultado prova e o que não prova

**Prova:**

- quantos eleitores votaram com e sem a própria digital, seção por seção, no país inteiro;
- que existem duas brechas humanas, usadas por 12,4% dos eleitores no Brasil e por 100% no exterior;
- que o excesso de "sem biometria" sobre o cadastro vem de uma diferença entre arquivos do TSE, e não de eleitores a mais;
- que não houve uso da brecha **em larga escala e concentrado** a favor de um lado, nas 25 UFs testadas.

**Não prova:**

- que cada eleitor liberado sem digital era quem dizia ser. Nenhum arquivo público permite saber isso;
- que não houve uso da brecha em poucas seções, de forma espalhada por igual numa UF inteira, ou no mesmo tamanho nos dois turnos;
- em quem os liberados votaram. Isso só pode ser cercado ou estimado (item 6.4, Pendente);
- nada sobre fraude que não passa pela urna: compra de voto, coação, transporte de eleitor.

## Limites

1. **O voto é secreto.** A ligação entre a forma de liberação e o voto não existe nos arquivos. Todo resultado sobre "em quem votou o liberado" é estimativa ou cerco.
2. **A pessoa diante da urna não é identificada nos caminhos 2 e 3.** Pelo princípio 8, a conferência de documento e de foto não conta como controle, e ela não deixa rastro.
3. **O log não separa digital que falhou de dedo trocado.** E, em 2,8 milhões de liberações manuais, nem diz de quem era o dedo.
4. **Cadastro desatualizado.** O perfil público é de 14/07/2026, e as urnas foram preparadas entre 16 e 29/09/2026. Em algumas zonas, eleitores mudaram de seção nesse intervalo (caso RN do parecer 10), e a comparação seção a seção perde valor ali.
5. **Sem renda e sem urbano/rural por seção.** Os dados abertos não trazem esses dados, então explicações sociais para diferenças entre seções não podem ser testadas com eles.
6. **1º turno parcial** no teste do item 6.1 (sem SP, TO e exterior). O 1º turno do item 3 está pendente.
7. **O caderno de votação não é público.** É a única fonte que diria quem assinou como eleitor em cada seção. Só pode ser obtido por pedido formal.

## Como repetir

```
node --max-old-space-size=8000 scripts/auditoria/verifica-pericia-liberacao.mjs   # itens 1, 2, 4, 5, 6.4 e 7: recálculo de todas as seções
node src/exportar.js --uf es --municipio 57037 --zona 0055 --secao 0364 --saida <dir>   # item 7: log bruto (idem para as 9 seções)
node scripts/auditoria/verifica-pericia-liberacao-logs.mjs <dir>                  # item 7: rajadas e atraso depois do voto
node scripts/habilitacao-1t-2t.mjs                                   # item 1: conta do autor
node --max-old-space-size=4096 scripts/auditoria/cetico-b1a-consolidacao.mjs   # item 3: revisão
node scripts/auditoria/cetico-b1a-log.mjs --turno 2 --por-zona 5 --controles 40  # item 3: marcador da foto
node scripts/auditoria/cetico-e2bio-consolidacao.mjs                 # item 6.1: revisão
node scripts/auditoria/cetico-a7-consolidacao.mjs                    # item 6.3: revisão
node scripts/ja-votou-por-voto.mjs                                   # item 7: conta do autor
```

Os detalhes técnicos estão em [../analysis/biometria-mesarios/](../analysis/biometria-mesarios/01-metodo-e-dados.md) e nos pareceres [01](../analysis/cetico-revisor/01-b1a-sem-biometria-acima-do-cadastro.md), [06](../analysis/cetico-revisor/06-comparecimento-extra-sem-vies-biometria.md) e [10](../analysis/cetico-revisor/10-a7-comparecimento-alto-sem-digital.md).

## Próximos passos

- **Pendente:** terminar H13 (item 6.4), com os cinco métodos, e passar pelo revisor cético.
- **Pendente:** reproduzir de forma independente a comparação do item 6.2 e a do item 5 com os controles de perfil do eleitorado, e passar as duas pelo revisor cético.
- **Pendente:** parecer do revisor cético para as contagens dos itens 1, 2, 4, 5 e 7.
- **Pendente:** medir o marcador da foto nas 16.011 seções do item 3, nas seções sem excesso e no país inteiro, para saber o tamanho real do grupo "tem foto, não tem digital na urna".
- **Pendente:** refazer o 1º turno do item 3 com todas as UFs e com as seções agregadas corrigidas, e repetir o teste do item 6.1 com todas as UFs.
- **Pendente:** medir, no país inteiro, a maior rajada de "já votou" sem voto entre eles por seção, e ver como foram liberados os eleitores logo depois das rajadas da seção 364 de Vila Velha.
- **Pendente:** olhar no log as seções do Paraná que puxam o sinal do item 6.1.
- **Pendente (pedidos pela LAI ao TSE):** o critério de "biometria cadastrada" no perfil público e no arquivo da urna; o número de eleitores com digital carregada na urna, por seção; a lista de zonas em revisão biométrica em 2026; a regra que desliga a digital no exterior; o critério de distribuição dos modelos de urna; o caderno de votação das seções destacadas.


=== ARQUIVO 05-soma-dos-boletins.md ===

# 5. Soma dos boletins × resultado oficial

## A pergunta

Se somarmos o "placar" de cada urna (o Boletim de Urna), chegamos ao resultado que o TSE divulgou? Ou existe diferença entre o que as urnas registraram e o que foi totalizado?

## Resposta curta

**Fato (2º turno, Presidente):** a soma dos boletins das 499.205 seções que votaram para Presidente é **idêntica** ao resultado oficial publicado pelo TSE. A comparação foi feita **seção por seção**, e nenhuma divergiu.

| | Soma dos boletins das urnas | Resultado oficial do TSE | Diferença |
|---|---|---|---|
| LULA (13) | 64.256.232 | 64.256.232 | 0 |
| FLAVIO BOLSONARO (22) | 59.826.041 | 59.826.041 | 0 |
| Nulos | 2.723.305 | 2.723.305 | 0 |
| Brancos | 1.430.496 | 1.430.496 | 0 |
| Seções com alguma diferença | — | — | **0 de 499.205** |

**Pendente:** 1º turno e os demais cargos (governador, senador, deputados). Ver "Próximos passos".

## O que foi comparado

- **De um lado:** o boletim de cada urna, lido diretamente do arquivo que a urna gravou e assinou. A integridade desses arquivos foi conferida nos tópicos [0](00-coleta-completa.md) e [1](01-integridade-e-estrutura-dos-arquivos.md).
- **Do outro:** o arquivo oficial de **votação por seção** que o TSE publica no portal de dados abertos (`votacao_secao_2026_BR.csv`, gerado em 26/10/2026 às 12:07). É o resultado que o TSE apresenta como totalizado, seção por seção.

Para cada seção e cada número votado (candidato, branco ou nulo), os dois valores foram comparados. Somar só o total do país poderia esconder erros que se compensam (um a mais aqui, um a menos ali). A comparação seção por seção não deixa isso passar.

## Prova de que o teste funciona (contraprova)

- A comparação junta os dois lados por completo: uma seção que existisse só no boletim, ou só no resultado oficial, contaria como divergência. Não há nenhuma: as 499.205 seções aparecem nos dois lados.
- Nos testes automáticos do banco (`test/banco.test.js`), um valor oficial alterado de propósito (143 votos onde o boletim tem 144) e uma seção que só existe no oficial **são** apontados como divergência. Ou seja, o teste é capaz de detectar diferença.
- Caso conferido: AC, Bujari, zona 9, seção 3, com LULA 81 e FLAVIO BOLSONARO 146 no boletim, no registro dos votos e no resultado oficial.

## Um caso que parecia estranho

**Fato:** algumas seções aparecem no site de resultados com a situação "Recebida", e não "Totalizada". Quantas são no país inteiro: **Pendente: em verificação** (a situação do site só foi registrada para parte das seções).

**Fato:** como a comparação acima cobre **todas** as seções que votaram para Presidente, essas seções "Recebida" estão incluídas nela: estão no resultado oficial e os votos de Presidente são **iguais** aos do boletim da urna.

**Hipótese:** a situação "Recebida" se refere ao pacote completo de arquivos da urna (diário, registro dos votos), e não ao boletim, que já estava totalizado. Seja qual for o motivo, não há diferença de votos.

## O que este resultado prova e o que não prova

- **Prova:** o resultado oficial de Presidente no 2º turno é exatamente a soma do que as urnas registraram. Não houve alteração de votos **entre a urna e o resultado divulgado**: nenhum voto somado, tirado ou trocado na totalização.
- **Não prova** que os votos registrados pelas urnas são todos legítimos. Se alguém votou no lugar de outra pessoa (por exemplo, com liberação sem biometria), esse voto está no boletim **e** no resultado oficial, e os dois batem. Essa possibilidade é examinada no tópico 4, "Como os eleitores foram liberados para votar".

## Como repetir

```
node src/banco.js --turno 2 --oficial      # carrega boletins e resultado oficial no banco (doc 09)
node scripts/h03-bu-x-oficial.mjs 2        # compara e lista qualquer seção divergente
node scripts/auditoria/verifica-pericia-soma-boletins.mjs   # conferência independente: lê o CSV oficial direto do zip
```

## Próximos passos

- **Pendente:** 1º turno, Presidente (o banco ainda não tem todas as UFs do 1º turno).
- **Pendente:** demais cargos dos dois turnos. O arquivo oficial por seção só traz Presidente. Para governador, senador e deputados, a comparação será por município e zona (`votacao_candidato_munzona`). Pendente: em verificação.


=== ARQUIVO 06-titulos-de-falecidos.md ===

# 6. Títulos de pessoas falecidas

## A pergunta

O cadastro de eleitores de 2026 tem títulos de pessoas que já morreram? E alguém usou esses títulos para votar?

## Resposta curta

| Pergunta | Resposta | Rótulo |
|---|---|---|
| O cadastro tem títulos de pessoas que provavelmente já morreram? | Sim. Há pelo menos **148.553 títulos de eleitores com 100 anos ou mais sem pessoa viva correspondente**, mesmo supondo que nenhum centenário tenha morrido desde 2022. Com a mortalidade real, a estimativa fica entre 235 e 260 mil. | **Fato** (piso) e **Hipótese** (estimativa) |
| Esses títulos foram usados para votar no 1º turno? | Pela contagem oficial do TSE, compareceram 0,72% dos eleitores de 100+ anos, e 0,26% nos municípios onde sobram títulos. Isso não indica uso sistemático. A contagem é do TSE e não pode ser refeita com os arquivos das urnas. | **Fato**, com ressalva |
| E no 2º turno? | O TSE ainda não publicou a contagem por idade. Os testes possíveis descartam uso acima de cerca de 10% desses títulos (cerca de 30 mil votos). Uso menor que isso, ou concentrado em poucas seções, não é detectável. | **Fato** (o que o teste descarta) e **Pendente** (o resto) |
| Por onde um título de falecido poderia ser usado? | Pelo eleitor sem biometria cadastrada, que a urna libera só com o ano de nascimento. 92% dos títulos de 100+ estão nesse grupo. | **Fato** |

Nenhum CPF foi usado nesta parte da perícia. Tudo vem de números públicos por seção, zona ou município.

## O que os arquivos permitem saber, e o que não permitem

**Fato, por desenho do sistema.** Nenhum arquivo público diz qual título votou. O boletim da urna traz só totais. O registro dos votos é embaralhado. O diário da urna (log) anota que um eleitor foi liberado, e de que forma, mas não anota o número do título nem o nome. Ver [../04-hipotese-titulos-falecidos.md](../04-hipotese-titulos-falecidos.md) e o princípio 8 de [../01-premissas.md](../01-premissas.md).

Por isso a pergunta foi dividida em duas, testadas de formas diferentes:

1. **Estoque:** quantos títulos do cadastro não têm pessoa viva correspondente. Mede-se comparando o cadastro com a população do Censo.
2. **Uso:** quantos desses títulos registraram voto. Mede-se pelo comparecimento (quantos eleitores votaram) dos grupos onde esses títulos estão.

Um título de falecido no cadastro mostra uma falha na limpeza do cadastro. Não mostra que alguém votou com ele.

## Parte 1. O cadastro tem títulos de pessoas que provavelmente já morreram?

### Como foi feito

Foram comparadas duas contagens oficiais:

- **O perfil do eleitorado do TSE** (arquivo `perfil_eleitor_secao`, gerado em 14/07/2026): quantos eleitores há em cada seção, por faixa de idade e com ou sem biometria cadastrada.
- **O Censo 2022 do IBGE** (tabela 9514): quantas pessoas moravam em cada município, por idade.

Quem tinha 96 anos ou mais no Censo de 2022 é quem pode ter 100 anos ou mais em 2026. Esse grupo de pessoas nascidas na mesma época é chamado de **coorte**. A conta mais simples é: eleitores de 100+ em 2026 menos a coorte de 96+ de 2022. Essa conta supõe que **ninguém** dessa coorte morreu em quatro anos, o que favorece o cadastro. Por isso o resultado é um **piso**: o número verdadeiro só pode ser maior.

Depois, aplicou-se a mortalidade medida pelo IBGE (Estatísticas do Registro Civil, tabela 2654, média de 2023 e 2024) para estimar quantos da coorte ainda estariam vivos. Essa parte é estimativa de modelo, e não contagem.

### O que foi encontrado

| Medida | Valor | Rótulo |
|---|---|---|
| Eleitores aptos com 100 anos ou mais, com domicílio eleitoral no Brasil | 297.977 (298.239 contando o exterior) | **Fato** |
| Pessoas com 100+ anos no Censo 2022 | 37.814 | **Fato** |
| Pessoas com 96+ anos no Censo 2022 (a coorte que chega a 100+ em 2026) | 149.424 | **Fato** |
| **Títulos de 100+ sem pessoa correspondente, supondo que ninguém morreu** | **148.553** | **Fato** (piso) |
| Coorte ainda viva em 2026, com a mortalidade do IBGE | entre cerca de 38 mil e 63 mil | **Hipótese** (estimativa) |
| Títulos de 100+ sem pessoa correspondente, com a mortalidade do IBGE | **entre cerca de 235 mil e 260 mil** | **Hipótese** (estimativa) |
| Eleitores de 100+ sem biometria cadastrada | 274.143 (92,0%) | **Fato** |

Para comparação, a parcela sem biometria é de 55,4% entre 90 e 99 anos, 27,9% entre 80 e 89 e 9,7% entre 18 e 69, todas sem o exterior (**Fato**, recontado em todas as seções do perfil pelo script de conferência deste tópico, listado em "Como repetir").

**Onde se concentram (Fato):**

| | Eleitores de 100+ | Têm biometria |
|---|---|---|
| Rio de Janeiro (estado) | 105.262 | 0,55% |
| São Paulo | 79.874 | 1,3% |
| Minas Gerais | 52.424 | 2,3% |
| Rio Grande do Sul | 21.022 | 4,4% |
| **Esses quatro estados juntos** | **86,8% de todos os eleitores de 100+ do país** | |
| Bahia | 2.565 | 91,8% |
| Ceará | 1.925 | 85,2% |

- Só a cidade do Rio de Janeiro tem 68.142 eleitores de 100+, contra 6.786 moradores de 96+ no Censo 2022.
- As maiores sobras (sem descontar mortes) estão nas capitais e em cidades grandes: Rio de Janeiro (+61.356), São Paulo (+39.442), Belo Horizonte (+10.413), Nova Iguaçu (+5.143) e São Gonçalo (+4.822).
- Na Bahia e no Ceará há **menos** eleitores de 100+ do que moradores de 96+, e a maioria deles tem biometria.
- Entre os eleitores de 100+, 51% são homens. Entre 95 e 99 anos, 43%. Entre 90 e 94, 38%. Numa população real, a parcela de mulheres cresce com a idade, porque elas vivem mais.

**Hipótese:** a maior parte desses títulos é de pessoas que morreram e não tiveram o título cancelado. Uma parte menor pode ser de pessoas vivas com a data de nascimento errada no cadastro. Os números públicos não separam os dois casos.

**Hipótese:** o padrão acompanha o recadastramento biométrico. Onde houve recadastramento (Bahia, Ceará), quem não compareceu teve o título cancelado, e a faixa de 100+ ficou abaixo da população. Onde quase ninguém de 100+ tem biometria (RJ, SP, MG, RS), os títulos antigos ficaram.

### Por que isso acontece

O título de quem morre só é cancelado quando o óbito chega à Justiça Eleitoral. Essa comunicação depende de pessoas: o cartório de registro civil precisa enviar, e o cartório eleitoral precisa processar. Além disso, depois dos 70 anos o voto é facultativo, e faltar à eleição não cancela o título. Um título de quem morreu aos 85 anos pode continuar no cadastro por décadas sem chamar atenção.

Pelo princípio 8 desta perícia, uma etapa feita por pessoas **não conta como controle**. Ela não serve para explicar que "está tudo certo" nem para acusar alguém. Ela é tratada como **risco**: uma brecha que precisa ser testada nos dados para saber se foi usada. Os 148.553 títulos mostram que essa brecha existe, em escala grande. A Parte 2 mostra o que os dados dizem sobre o uso.

### Prova de que o teste funciona (contraprova)

- **Reprodução independente.** O revisor leu de novo os arquivos brutos do TSE e do IBGE com outro programa e chegou aos mesmos números: 297.977, 149.424 e 274.143. A soma dos 5.570 municípios dá exatamente os totais do país, e nenhum município ficou sem par entre TSE e IBGE (**Fato**).
- **E se o Censo tiver deixado de contar idosos?** Se a população real de muito idosos fosse 1,5 vez a contada (ou seja, se o Censo tivesse deixado de contar um terço deles), ainda sobrariam cerca de 202 mil títulos pela estimativa com mortalidade. Para zerar o piso de 148.553, o Censo teria de ter contado só cerca de metade das pessoas de 96+ (**Fato**, teste de sensibilidade).
- **E se forem datas de nascimento inválidas?** O cadastro tem um código próprio para data inválida (1.212 eleitores), separado da faixa de 100+ (**Fato**).
- **E se a idade for calculada em outra data?** O efeito máximo dessa dúvida é de cerca de 3.000 títulos na estimativa (**Fato**).
- **E se forem eleitores que moram no exterior?** O exterior tem 262 eleitores de 100+ e já foi excluído da conta (**Fato**).

### O que não se pode afirmar com este teste

- **Município a município, a comparação engana.** O título fica onde a pessoa se alistou, e o Censo conta onde ela mora. Em 1.068 municípios há mais eleitores de 100+ do que moradores de 96+, mas em 4.186 acontece o contrário. O número confiável é o saldo do país (148.553), e não a soma dos municípios com sobra (**Fato**).
- **Faixa de 90 a 99 anos.** Pode haver sobra também nessa faixa, mas o resultado muda de sinal conforme as premissas do modelo (de 249 mil a mais até 104 mil a menos). Não é achado (**Pendente**).

## Parte 2. Esses títulos foram usados para votar?

### 1º turno: o que diz a contagem oficial do TSE

O TSE publica o arquivo `perfil_comparecimento_abstencao`, com quantos eleitores de cada faixa de idade votaram, por município e zona. A versão disponível foi gerada em 13/10/2026 e traz **só o 1º turno**.

| Faixa de idade | Compareceram, 1º turno |
|---|---|
| 16 e 17 anos | 87,3% |
| 18 a 69 | 82,3% |
| 70 a 79 | 62,1% |
| 80 a 89 | 32,7% |
| 90 a 99 | 10,4% |
| **100 ou mais** | **0,72% (2.141 de 298.239)** |

Fonte: `data/raw/dadosabertos/perfil_comparecimento_abstencao/perfil_comparecimento_abstencao_2026.zip`. **Fato.**

Separando os municípios:

| 1º turno, contagem oficial | Municípios | Eleitores de 100+ | Compareceram | Taxa |
|---|---|---|---|---|
| Com mais eleitores de 100+ do que moradores de 96+ | 1.068 | 275.334 | 717 | **0,26%** |
| Sem essa sobra (só os municípios com algum eleitor de 100+) | 3.329 | 22.643 | 1.424 | 6,3% |
| Exterior (sem município no IBGE) | 59 | 262 | 0 | 0% |

As três linhas somam os 298.239 eleitores de 100+ e os 2.141 que compareceram.

**Fato:** onde estão os títulos que sobram, quase ninguém de 100+ votou. Onde não sobram títulos, a taxa (6,3%) é compatível com centenários vivos.

**O que isso permite concluir:** se esses títulos tivessem sido usados por terceiros em escala, eles apareceriam como comparecimento. Uso de 5% dos títulos de 100+ daria 14.912 votos na contagem oficial; uso de 10%, 29.824. A contagem mostra 2.141 em todo o país. **No 1º turno não há sinal de uso sistemático desses títulos** (**Fato**, desde que a contagem oficial esteja correta).

**Ressalva.** Essa contagem é feita pelo próprio TSE. Ela não pode ser refeita com os arquivos das urnas, porque o diário da urna não registra a idade de quem votou. Há dois indícios de que ela é coerente: as contagens por faixa de idade são idênticas às do perfil do eleitorado (298.239 eleitores de 100+ nos dois arquivos), e o comparecimento total do arquivo (125.277.230) difere do arquivo oficial por seção (125.275.835) em só 1.395 eleitores. Coerência não é conferência independente.

### 2º turno: o que dá e o que não dá para descartar

**Pendente:** o TSE ainda não publicou o arquivo de comparecimento por idade do 2º turno. Sem ele, só restam testes indiretos. Eles comparam o comparecimento das seções que têm muitos títulos de 100+ com o das seções que têm poucos.

| Teste indireto, 2º turno | Descarta | Não descarta |
|---|---|---|
| Comparar a mesma seção no 1º e no 2º turno | uso feito só no 2º turno acima de cerca de **10% dos títulos de 100+** (cerca de **30 mil votos**) | uso abaixo disso; uso concentrado em poucas seções ou municípios |
| Comparar seções com mais e menos títulos de 100+ dentro do mesmo município | uso uniforme de cerca de 40% dos títulos (cerca de 119 mil votos) | qualquer uso menor |

Fonte: parecer [../analysis/cetico-revisor/03-centenarios-nao-votam.md](../analysis/cetico-revisor/03-centenarios-nao-votam.md), com simulações em que votos falsos foram inseridos nos dados para ver se o teste os acharia. **Fato** (o que cada teste consegue e não consegue ver).

Exemplos do que passaria despercebido: um título de 100+ usado em cada uma das 86.934 seções da análise do 2º turno que têm algum eleitor dessa idade (as seções agregadas contam junto com a seção principal) somaria 87 mil votos e mal mexeria no resultado do teste. Usar todos os títulos de 100+ de 1% dos municípios também não apareceria (**Fato**, simulação).

**Um teste que foi retirado.** Uma análise anterior apresentava como evidência que, "em nenhuma das 22.389 seções com 5 ou mais eleitores de 100+, o comparecimento obriga algum deles a ter votado". O número é verdadeiro, mas o teste não tem **poder** (capacidade de detectar algo que existe): com 99 mil votos falsos inseridos nas seções com mais centenários, ele continuou acusando zero seções. Por isso não é usado como evidência neste relatório (**Fato**).

### Lugares que pedem exame, com números pequenos

**Hipótese:** pela contagem oficial do 1º turno, alguns municípios têm taxa de comparecimento de 100+ acima de 25%: Icatu (MA, 7 de 22), Redentora (RS, 6 de 20), Florianópolis (SC, 7 de 24), Pirapemas (MA, 7 de 24) e Pilão Arcado (BA, 6 de 21). Em Arame (MA), 37 de 84 eleitores de 90 a 99 anos votaram (44%, contra 10,4% no país); a seção 0070 da zona 0104 já tinha sido apontada pelo demógrafo. Taxa alta em números tão pequenos pode ter causa comum (centenários vivos, recadastrados). São pontos de partida para examinar o diário dessas urnas, e não conclusões.

### Um caso conferido no arquivo bruto

**Fato:** RJ, Rio de Janeiro, zona 0005, seção 0001, 2º turno. O cadastro tem 40 eleitores de 100+ nessa seção, 39 deles sem biometria. A seção tem 330 eleitores aptos e 202 votaram. Só 7 entraram pelo caminho "sem biometria". Portanto, **no máximo 8** desses 40 títulos podem ter votado (os 7 sem biometria, se todos fossem centenários, e o único com biometria). Fonte: boletim da urna lido diretamente do arquivo.

## Parte 3. Por que o eleitor sem biometria é o ponto fraco

### Como a urna libera um eleitor

Quando o eleitor chega à mesa, o mesário digita o número do título. A urna procura o eleitor no arquivo de eleitores que foi gravado nela antes da eleição. Daí há dois caminhos:

- **O eleitor tem digital no arquivo da urna.** A urna pede a digital e compara. Se bater, libera. O diário da urna registra isso. É um **controle técnico com rastro**.
- **O eleitor não tem digital no arquivo da urna.** A urna pede só o **ano de nascimento**, que o mesário digita. Se bater com o cadastro, libera. O diário registra a mensagem "Ano de nascimento digitado é igual ao do cadastro". A conferência do documento com foto é feita pelo mesário, a olho, e não deixa rastro.

Pelo princípio 8, o segundo caminho não tem controle técnico. Quem souber o número do título e o ano de nascimento de um eleitor sem biometria consegue votar no lugar dele, se a mesa permitir. É por esse caminho que um título de falecido poderia ser usado sem deixar marca de digital. E 92% dos títulos de 100+ estão nesse grupo.

Isso é uma **brecha**, e não prova de uso. O que prova uso é rastro nos dados.

### O achado das 16 mil seções

**Fato:** em 16.011 das 497.508 seções do 2º turno analisadas (3,2%), o boletim da urna registra **mais** eleitores liberados "sem biometria cadastrada" do que o perfil público do TSE diz existir naquela seção, já descontada uma folga para os eleitores em trânsito. A diferença soma 36.340 eleitores (0,03% dos votos). Em 7.922 dessas seções, o perfil público diz que **todos** os eleitores têm biometria. Ficaram fora da conta só as seções sem comparecimento, as seções cujo boletim não traz o detalhamento do comparecimento e as que não têm cadastro correspondente no perfil (lista no parecer 01).

- Concentra-se em algumas zonas: Vitória (ES), zona 0052 (126 seções, 680 eleitores); Indaiatuba (SP), zona 0211 (84 seções, 600); Ulianópolis (PA), zona 0084 (52 seções, 561).
- **1º turno: Pendente, em verificação.** O banco ainda não tem o 1º turno completo. A contagem do 1º turno, e a comparação seção a seção entre os dois turnos, só entram neste relatório depois de refeitas com todas as UFs.
- Caso conferido no arquivo bruto: Indaiatuba (SP), zona 0211, seção 0438, 2º turno. O boletim registra 65 eleitores sem biometria; o diário da urna tem 65 liberações só por ano de nascimento que terminaram em voto. O perfil público diz que a seção tem 337 eleitores, todos com biometria.

À primeira vista, isso parecia uma contagem impossível: a urna liberando sem digital mais gente do que existe sem digital.

### Como a "foto do eleitor" no diário da urna explicou a diferença

Os revisores procuraram no diário da urna o que acontecia nesses atendimentos e encontraram uma marca: a mensagem **"Foto do eleitor apresentada"**, sem nenhum pedido de digital. A medida abaixo cobre **todas** as 378 seções do 2º turno com excesso de 10 eleitores ou mais (e não uma amostra delas).

| Nas 378 seções com excesso de 10 ou mais, 2º turno | Atendimentos | Com a mensagem da foto |
|---|---|---|
| Eleitores liberados sem biometria | 7.970 | 6.761 (84,8%) |
| Eleitores liberados por digital (referência) | 83.472 | 82.894 (99,3%) |

- **Fato:** nessas 378 seções, contando como "sem biometria" só quem também não tem foto, o excesso cai de 5.560 para 54 eleitores (99% a menos).
- **Fato:** nenhum dos 7.970 atendimentos sem biometria dessas seções teve pedido de digital. Ou seja, a mesa não "pulou" a digital: foi o arquivo de eleitores gravado na urna que não tinha a digital dessas pessoas, e por isso a urna foi direto ao ano de nascimento.
- **Fato:** o perfil público é de 14/07/2026. Nas 378 seções, o diário registra que a mídia da urna (que leva o arquivo de eleitores) foi gerada entre 17 e 27/09/2026; uma delas tem um segundo diário, de mídia gerada em 20/10/2026. São duas fotografias do cadastro em datas diferentes.
- **Fato:** há também o efeito no sentido inverso, maior e em outras zonas: 17.621 seções com **mais** eleitores liberados por digital do que o perfil diz ter biometria (229.717 eleitores).
- **Pendente, em verificação:** a mesma medida da foto nas outras seções com excesso (de 1 a 9) e nas seções sem excesso. Os revisores a fizeram só em amostras dessas seções, e números de amostra não entram neste relatório. Sem essa medida em todas as seções, não está medido quanto a marca da foto é rara fora das seções com excesso.

**Leitura.** Nas seções medidas, o "com biometria" do perfil público não é o mesmo "com digital no arquivo da urna". Esses eleitores têm foto registrada, mas não têm digital utilizável na urna.

- **Hipótese (a mais provável, a confirmar com o TSE):** são eleitores que fizeram a coleta biométrica (a foto ficou registrada), mas a digital ficou pendente, foi rejeitada ou tinha qualidade ruim.
- **Hipótese (não separável com dados públicos):** a mesma marca apareceria se as digitais tivessem sido retiradas do arquivo na preparação das urnas. As duas explicações deixam o mesmo rastro. Só o TSE pode separar uma da outra.
- **Pendente:** sobra um resíduo que a foto não explica, localizado sobretudo em Indaiatuba (SP), zona 0211, seções 0430 a 0444. O tamanho dele no universo completo não foi medido, e a causa não foi testada.

**O que isto significa para a pergunta dos falecidos.** Não há sinal de eleitores a mais: em nenhuma seção o número de votantes passa do número de eleitores aptos. Os testes de comparecimento não mostram uso sistemático desse caminho. Mas, pelo princípio 8, o risco continua: esses eleitores votaram só com o número do título, o ano de nascimento e a foto mostrada ao mesário. **Hipótese:** o grupo nessa situação é maior que os 36.340 do excesso. Nas 378 seções medidas, os atendimentos sem biometria com foto (6.761) já passam do excesso delas (5.560). O tamanho do grupo no país inteiro não foi medido (**Pendente**).

### Prova de que o teste funciona (contraprova)

- **A marca da foto explica o excesso onde foi medida.** Nas 378 seções com excesso de 10 ou mais, tirar os atendimentos com foto zera quase todo o excesso (de 5.560 para 54) (**Fato**). Quanto a marca é rara nas seções sem excesso ainda não foi medido em todas elas (**Pendente**).
- **O teste de uso consegue achar uso amplo.** Os revisores inseriram votos falsos nos dados, do tamanho do excesso observado, em 28% das seções: o teste os detectou em 10 de 10 repetições. Em 5% das seções, detectou em 8 de 10 (**Fato**, simulação).
- **O teste não consegue achar uso em poucas seções ou em poucos eleitores por seção.** "Não houve uso" não está provado. O que está provado é que não houve uso amplo (**Fato**).
- **O diário e o boletim batem, mas isso não é conferência independente.** Os dois saem do mesmo programa da urna. A igualdade mostra coerência interna, e não que o arquivo de eleitores gravado na urna estava correto (**Fato**).

## Um fenômeno vizinho que não é o mesmo: municípios com mais eleitores do que moradores

**Fato:** em 2.898 dos 5.570 municípios (52%), o perfil de julho de 2026 tem mais eleitores de 16+ do que moradores de 12+ no Censo 2022. O fenômeno se concentra em municípios pequenos. O percentual muda conforme a definição de idade e o ano da população (de 44% a 58%).

**Fato:** esses títulos a mais **votam**. No 2º turno, em 579 municípios votou mais gente do que a população de 12+ de 2022. Pela estimativa do revisor (modelo que supõe que os moradores votam à taxa do estado), os títulos excedentes comparecem a algo entre 42% e 71%, conforme a faixa de municípios. A parcela liberada por digital nesses municípios é igual à do estado (diferença de até 0,6 ponto). Isso indica pessoas reais, presentes na urna, com título num município diferente de onde moram. Não indica títulos de falecidos em massa.

**Hipótese:** a maior parte é migração com título mantido na cidade de origem ou domicílio eleitoral por vínculo familiar ou profissional, que a lei permite. Os dados agregados não separam isso de transferência irregular de títulos. É tema de outro tópico, e não deste.

Fonte: parecer [../analysis/cetico-revisor/04-eleitorado-acima-populacao.md](../analysis/cetico-revisor/04-eleitorado-acima-populacao.md).

## Limites desta parte da perícia

1. **Nenhum CPF foi usado.** A frente descrita aqui usa só contagens públicas por seção, zona e município. A frente por CPF (cruzar títulos com registros de óbito) está descrita no [doc 04](../04-hipotese-titulos-falecidos.md) e não faz parte deste tópico.
2. **Não é possível dizer que um título específico votou.** O caderno de votação (a lista assinada pelos eleitores na mesa) não é público, e os arquivos da urna não identificam o eleitor.
3. **Não é possível separar falecidos de vivos com a data de nascimento errada**, entre os títulos de 100+ que não votam.
4. **O 2º turno não tem contagem oficial por idade.** Os testes indiretos só descartam uso acima de cerca de 10% dos títulos de 100+.
5. **A contagem oficial do 1º turno é do TSE.** Ela é coerente com os outros arquivos, mas não pode ser conferida de forma independente.
6. **O que dá para afirmar sobre o caminho sem biometria vale para o uso amplo.** Uso em poucas seções, ou de poucos títulos por seção, não aparece nos testes agregados.
7. **Datas a confirmar.** O fechamento do cadastro (07/05/2026, 150 dias antes do 1º turno) e a data em que o TSE calcula a idade no perfil não estão documentados nos arquivos.

## O que só a Justiça Eleitoral consegue verificar

- Se cada título de 100+ tem óbito registrado no Sistema Nacional de Informações de Registro Civil (SIRC).
- Quais títulos de 100+ tiveram comparecimento registrado em cada turno, pelo caderno de votação.
- Por que eleitores que o perfil público dá como "com biometria" estavam sem digital no arquivo da urna: coleta pendente, digital rejeitada ou outra causa.

## Pedidos sugeridos pela Lei de Acesso à Informação (LAI)

**Recomendação** (pedidos ainda não feitos):

1. Ao TSE: os títulos aptos de 100+ por ano de nascimento e por município, para saber quantos teriam 110, 120 ou 130 anos.
2. Ao TSE: quantos títulos de 100+ tiveram comparecimento registrado em cada turno de 2026, por município, e quantos títulos foram cancelados por óbito depois de 07/05/2026.
3. Ao TSE: o critério que define "com biometria" no perfil do eleitorado público e no arquivo de eleitores da urna; quantos eleitores tinham digital gravada na urna, por seção; e a lista de zonas em recadastramento biométrico em 2026.
4. Ao TSE: a data de referência usada para calcular a idade no perfil do eleitorado.
5. Ao TSE: a publicação do arquivo de comparecimento por idade (`perfil_comparecimento_abstencao`) do 2º turno.

## Pendente

- **Comparecimento oficial dos idosos por município e por biometria, 1º turno** (`docs/analysis/demografo/07-comparecimento-oficial-idosos.md`). A análise foi feita com o mesmo arquivo oficial do TSE e procura municípios e zonas onde votaram mais centenários do que seria possível, e votos que só podem ter vindo de títulos sem biometria. Ainda não tem parecer do revisor. Os números dela não entram neste relatório até lá.
- **Comparecimento × mortes recentes por município** (`docs/analysis/demografo/05-mortalidade.md`) e **variação entre turnos nos grupos que costumam faltar** (`docs/analysis/demografo/06-variacao-entre-turnos.md`). Sem parecer do revisor.
- **2º turno por idade:** refazer a medida direta quando o TSE publicar o arquivo.
- **Diário das urnas nos lugares apontados:** horário e sequência das liberações por ano de nascimento em Arame, Icatu e Pirapemas (MA), Redentora (RS), Florianópolis (SC), Pilão Arcado (BA) e nas zonas do excesso de "sem biometria".
- **Resíduo sem foto de Indaiatuba (SP), zona 0211, seções 0430 a 0444:** medir o tamanho no universo completo e testar a causa.
- **Marca da foto em todas as seções:** medir a mensagem "Foto do eleitor apresentada" em todas as seções com excesso de 1 a 9 e em todas as seções sem excesso, para saber quantos eleitores estão na situação "foto sem digital" no país.
- **1º turno completo** para o achado das seções com excesso de "sem biometria", e a comparação seção a seção entre os turnos (o banco ainda não tem todas as UFs do 1º turno).

## Como repetir

Os números da Parte 1 (estoque):

```
node scripts/auditoria/cetico-centenarios-dados.mjs                       # lê os arquivos brutos do TSE e do IBGE (10 a 20 min)
node scripts/auditoria/cetico-centenarios-coorte.mjs                      # coorte com mortalidade por idade; concentração por estado e capital
node scripts/auditoria/cetico-centenarios-excesso-consolidacao.mjs        # piso de 148.553, faixa de 235 a 260 mil, sensibilidade ao Censo
```

Saídas: `data/parsed/auditoria/cetico/centenarios-dados.json`, `centenarios-coorte.json` e `centenarios-excesso-consolidacao.json`.

Os números da Parte 2 (uso):

```
node scripts/auditoria/cetico-centenarios-nao-votam-oficial.mjs           # comparecimento oficial do 1º turno por faixa e município (0,72% e 0,26%)
node scripts/auditoria/cetico-centenarios-nao-votam-reproducao.mjs        # testes indiretos, simulação de uso, caso RJ 0005/0001
node --max-old-space-size=4096 scripts/auditoria/cetico-centenarios-poder.mjs
node scripts/auditoria/cetico-centenarios-nao-votam-consolidacao.mjs      # 14.912 e 29.824 votos esperados com uso de 5% e 10%
```

Saídas: `data/parsed/auditoria/cetico/centenarios-oficial.json`, `centenarios-oficial-municipios.tsv`, `centenarios-reproducao.json`, `centenarios-poder.json` e `centenarios-consolidacao.json`.

Os números da Parte 3 (sem biometria):

```
node scripts/auditoria/cetico-b1a-alternativas.mjs                        # 16.011 seções e 36.340 eleitores direto do banco
node scripts/auditoria/cetico-b1a-definicoes.mjs --turno 2                # marca da foto no diário das 378 seções com excesso de 10+, datas da mídia
node scripts/auditoria/cetico-b1a-poder.mjs                               # simulação de votos falsos
```

Saídas: `data/parsed/auditoria/cetico/b1a-*.json`, `b1a-*.jsonl` e `b1a-*.stdout`.

Conferência dos números deste tópico que os pareceres não refizeram (biometria por faixa de idade, tabela por estado, proporção de homens, casos RJ 0005/0001 e Indaiatuba 0211/0438, estrato das 378 seções):

```
node scripts/auditoria/verifica-pericia-06-titulos-falecidos.mjs          # lê todos os zips do perfil (10 a 20 min)
```

Saída: `data/parsed/auditoria/coordenador/verifica-pericia-06.json`.

Pareceres do revisor que sustentam este tópico: [01](../analysis/cetico-revisor/01-b1a-sem-biometria-acima-do-cadastro.md), [02](../analysis/cetico-revisor/02-centenarios-excesso-cadastro.md), [03](../analysis/cetico-revisor/03-centenarios-nao-votam.md) e [04](../analysis/cetico-revisor/04-eleitorado-acima-populacao.md). Achados originais do demógrafo: [docs/analysis/demografo/](../analysis/demografo/). Hipótese H01 em [../hipoteses.md](../hipoteses.md).

## Próximos passos

- [ ] Refazer a Parte 2 com o arquivo oficial de comparecimento por idade do 2º turno, quando o TSE publicar
- [ ] Enviar os pedidos pela LAI listados acima
- [ ] Incluir o doc 07 do demógrafo depois do parecer do revisor
- [ ] Examinar o diário das urnas nos lugares e zonas apontados (horário e sequência das liberações por ano de nascimento)
- [ ] Registrar as verificações deste tópico no [livro de evidências](evidencias/README.md)


=== ARQUIVO 07-limites-da-pericia.md ===

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


=== ARQUIVO 08-virada-do-2-turno.md ===

# 8. A virada do 2º turno: o que os números oficiais mostram

> **Regra deste tópico:** só entram números conferidos no universo completo e reproduzidos de forma independente, por parecer do revisor cético ou por duas contas que batem. O que ainda não cumpre essa regra está em "Pendente", **sem número**. As análises em andamento ficam em [../analysis/modelos/T14/sintese.md](../analysis/modelos/T14/sintese.md). Revisado em 29/10/2026.

## A pergunta

No 1º turno (4/10/2026), Flávio Bolsonaro teve 2.224.965 votos a mais que Lula. No 2º turno (25/10/2026), Lula venceu por 4.430.191. Os números oficiais mostram alguma impossibilidade nessa virada?

## Resposta curta

- **Fato:** o ganho dos dois finalistas no 2º turno fecha exatamente com o que estava disponível no 1º (14.098.232 votos).
- **Fato:** nos dois turnos, em todas as seções, a urna registrou exatamente tantos votos para presidente quantos eleitores votaram.
- **Fato:** nos dois turnos, a soma dos boletins de todas as urnas é igual ao resultado oficial, candidato por candidato.
- **Fato:** em 499.194 das 499.205 seções, os números não exigem que nenhum eleitor tenha trocado um finalista pelo outro. Nas outras 11, a troca mínima exigida soma 20 eleitores para Lula e 24 para Flávio.
- **Pendente:** os testes que procuram troca de votos dentro da urna, voto no lugar de eleitor ausente e padrão técnico ainda estão em revisão e não entram aqui.
- **Este tópico não afirma que não houve fraude.** Ele mostra só o que está conferido.

## 1. Os números oficiais da virada (Fato)

Fonte: dados abertos oficiais do TSE (`detalhe_votacao_secao` e `votacao_candidato_munzona`).

Nos **dois turnos**, os votos de presidente foram conferidos também pela soma dos boletins de urna:
- **1º turno:** igual ao resultado oficial por seção, candidato por candidato, nas 499.206 seções (`scripts/reconciliar-1t-presidente.mjs`);
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
- **Cuidado com um arquivo do TSE:** o `votacao_candidato_munzona` não traz os 5.246 votos do candidato de número 28 no 1º turno. Eles estão nos boletins de urna e no resultado oficial por seção. Quem usar só esse arquivo vai achar 9.316.747 votos de eliminados e uma conta que não fecha por 5.246.

## 2. Comparação com 2018 e 2022 (Fato, números reproduzidos pelo cético)

Fonte: [cientista-politico/04](../analysis/cientista-politico/04-linha-de-base-historica.md); números reproduzidos por três scripts independentes no [parecer 14 do cético](../analysis/cetico-revisor/14-linha-de-base-2018-2022.md).

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

Segundo o parecer 14, essas comparações **não servem como prova contra manipulação**: elas não teriam detectado uma troca de votos capaz de virar o resultado.

## 3. Votos × votantes em cada urna (Fato, duas contas independentes)

Em **todas as seções com boletim de presidente**, a soma dos votos (candidatos, brancos e nulos) é igual ao número de eleitores que votaram para presidente: **499.206 no 1º turno e 499.205 no 2º**.

- Conta 1: perfis tirados de cada boletim (`src/comparar-turnos.js`), nas 499.176 seções comparadas entre os turnos.
- Conta 2: banco de dados carregado dos boletins, comparando a soma dos votos com o comparecimento da eleição de presidente.
- **Cuidado de leitura:** nas 27 seções do exterior apuradas manualmente, o campo geral de comparecimento do boletim vem zerado; o comparecimento da eleição de presidente é o que vale.

## 3b. Alguma urna só fecha se eleitor de um finalista tiver ido para o outro? (Fato, duas contas independentes)

Para cada seção, a conta é: votos do finalista no 2º turno, menos tudo o que ele poderia ter recebido sem ninguém trocar de lado. "Tudo" soma os votos dele no 1º turno, os votos dos eliminados, os brancos, os nulos, quem não votou no 1º turno e os eleitores novos da seção. Se ainda sobrar voto, a diferença só fecha com eleitor que votou no outro finalista no 1º turno.

| Finalista | Seções em que sobra voto | Eleitores que precisam ter vindo do outro finalista |
|---|---|---|
| Lula (13) | 10 | 20 (de 1 a 5 por seção) |
| Flávio Bolsonaro (22) | 1 (PI 11878/0028/0099) | 24 |

- As duas contas dão **as mesmas 11 seções e os mesmos números**:
  - perfis, em 499.176 seções (`src/comparar-turnos.js`);
  - banco, em 499.205 seções (`scripts/troca-obrigatoria-banco.mjs`).
- **As 10 seções do Lula:** AL 28754/0049/0135, AM 02755/0022/0070, BA 39659/0041/0400, MA 09555/0078/0296, MG 40282/0063/0194, MG 40690/0016/0347, PA 04073/0021/0296, PA 04472/0004/0580, PE 23876/0021/0149 e SP 71072/0325/0685.
- Trocar de candidato entre os turnos é permitido. A conta mostra só **o mínimo** de trocas que os números exigem. Ela não mede quantos eleitores trocaram de fato, porque o voto é secreto.

## 4. Prorrogação do horário de votação (Fato)

- **A decisão:** o ministro Cristiano Zanin, do STF, na Reclamação 101.673/BA (pedido da coligação de Lula contra os municípios de Salvador, Feira de Santana e Lauro de Freitas, por falta de transporte público), determinou "prorrogação por duas horas, até as 19h, horário de Brasília, do encerramento do recebimento dos votos em todas as seções de todo o Brasil, cabendo ao TSE dar cumprimento". Cópia: `data/raw/stf/rcl-101673-zanin-25out26.pdf`.
- **Votos dados depois das 17h de Brasília no 2º turno, por duas contas independentes:**
  - 34.330 votos em todas as urnas (Auditor C, [linha-do-tempo/02](../analysis/linha-do-tempo/02-votos-apos-17h.md));
  - 34.066 votos nas urnas de seção que registram horário de abertura e de último voto (`scripts/h06-votos-apos-17h.mjs`).
  - A diferença vem só do critério de quais urnas entram. Depois das 18h: 1.993 e 1.960.
- **Tamanho em relação ao resultado:** mesmo que os 34.330 votos fossem todos para um só candidato, seriam 0,77% da diferença de 4.430.191 votos.
- **Pendente:** versão assinada da decisão no portal do STF e horário do ofício do TSE aos TREs.

## 5. Eleitores registrados como "sem biometria cadastrada" acima do cadastro (Fato, revisado pelo cético)

Fonte: [parecer 01 do cético](../analysis/cetico-revisor/01-b1a-sem-biometria-acima-do-cadastro.md), números reproduzidos por dois caminhos.

- Em 16.011 das 497.508 seções analisadas do 2º turno, o boletim registra mais eleitores "sem biometria cadastrada" do que o cadastro público tem. O excesso soma 36.340 eleitores.
- Nenhuma dessas seções tem mais votantes do que eleitores aptos.
- Segundo o parecer, a diferença vem quase toda de definição: o arquivo da urna tinha a foto desses eleitores, mas não a digital, e o cadastro público os conta como "com biometria".
- **Risco que continua, pela premissa de não confiar em pessoas:** esses eleitores foram liberados só com título, ano de nascimento e a conferência da foto pelo mesário, que é humana e não deixa rastro.

## 6. Perda de votos do Flávio em seções onde o comparecimento não caiu (Fato, revisado pelo cético)

Fonte: [parecer 05 do cético](../analysis/cetico-revisor/05-h10-crescimento-cabe-no-disponivel.md).

Em três UFs, Flávio perdeu votos em seções onde o número de votantes não caiu: **MA 10.652, AM 2.841 e TO 1.778**. Matematicamente, isso só acontece se eleitores trocaram o 22 pelo 13, ou se eleitores do Flávio deixaram de votar e foram substituídos por outros eleitores. **Pendente:** qual das duas.

## Pendente (sem número até haver reprodução independente)

| Teste | Para que serve | Situação |
|---|---|---|
| Comparação de cada seção com as vizinhas, 1º × 2º turno | Apontar seções fora do padrão | 1 conta feita (`src/comparar-turnos.js`); em revisão |
| Para onde foram os votos dos eliminados | Estimar a divisão entre os finalistas | estimativa estatística: não entra no relatório |
| Troca de votos pela urna × voto dos eliminados | Separar as duas explicações pela proporção | em revisão (parecer 16 do cético, em andamento) |
| Resultado por modelo de urna e por dia de preparação | Procurar padrão técnico | em revisão |
| Curva da apuração | Ver se a forma da curva é explicada pela ordem de chegada das cidades | em revisão |
| Votantes a mais sem digital, 1º × 2º turno | Medir a porta de voto no lugar de eleitor ausente | 1 conta com as 28 UFs; revisão do cético feita com 25 UFs |
| Teste de Integridade (urnas conferidas com cédulas de papel) | Controle externo contra troca de votos pelo programa da urna | o TSE publicou que não houve divergência; faltam os relatórios por TRE |
| Pesquisas de véspera | Comparação externa à urna | números da imprensa: não entram no relatório |
| Assinaturas digitais de todos os boletins | Provar que cada arquivo saiu de uma urna oficial e não foi alterado | verificação nacional em andamento |

## Limites (o que este tópico não prova)

1. **Quem votou.** Os arquivos mostram como o eleitor foi liberado (com digital ou sem), não quem estava na cabine.
2. **O programa da urna por dentro.** Boletim, registro de votos e diário da urna saem do mesmo programa. Uma troca de votos igual em todas as urnas deixaria esses arquivos coerentes entre si. O controle contra isso é externo à urna (Teste de Integridade), e ele está em Pendente.
3. **Estimativas.** Taxas de "para onde foi o voto" não são dados: o voto é secreto. Por isso ficam fora deste relatório.


=== ARQUIVO 09-padroes-estatisticos.md ===

# 9. Padrões estatísticos de fraude

> **Situação:** escrito em 29/10/2026 a partir de `docs/analysis/forense-estatistica/01` a `07`. **Nenhum item deste tópico tem ainda parecer do revisor cético** (`docs/analysis/cetico-revisor/`), por isso todos os rótulos vêm acompanhados de "aguarda revisão cética". O 2º turno usa o país inteiro. O 1º turno, usado como comparação, é **parcial** (ver abaixo).

## A pergunta

Os resultados de Presidente mostram as marcas estatísticas que fraudes grandes costumam deixar? As três marcas mais conhecidas são:

- **enchimento de urna:** alguém acrescenta votos falsos, e a seção aparece com comparecimento perto de 100% e quase todos os votos para um só candidato;
- **números inventados:** alguém escreve o resultado à mão, e os algarismos ficam com um padrão que contagens reais não têm;
- **números redondos:** quem inventa resultado tende a escolher 100, 150, 200 votos, ou 60%, 75%.

## Resposta curta

| Pergunta | Resposta (2º turno, Presidente, 499.205 seções) | Rótulo |
|---|---|---|
| Há a marca de enchimento de urna? | Não aparece. Nenhuma seção tem comparecimento acima de 100%. Não há um segundo grupo de seções em "100% de comparecimento com 100% para um candidato". Dentro de cada zona, comparecimento e voto quase não andam juntos. | **Fato**, aguarda revisão cética |
| Há marca de número inventado? | Não no último algarismo: 0 de 56 testes acusam diferença em relação a contagens honestas simuladas. No segundo algarismo, 9 de 56 testes acusam diferenças pequenas, que também apareceram no 1º turno (parcial, 15 UFs). | **Fato** (contagem); a causa dos 9 é **Hipótese**; aguarda revisão cética |
| Há excesso de números redondos? | Não. Nem nas contagens de votos, nem nos percentuais, nem no comparecimento. | **Fato**, aguarda revisão cética |
| Há algo fora do padrão? | Sim: há mais seções com 90% a 100% dos votos para o 13 (Lula) do que o modelo prevê. Essas seções estão principalmente em aldeias, quilombos e presídios, e já davam votação parecida ao mesmo candidato no 1º turno (parcial, 15 UFs). Quando se leva em conta o perfil dos eleitores de cada seção, os casos extremos ficam iguais para os dois candidatos (318 e 325). | **Fato** (contagem); a explicação é **Hipótese**; aguarda revisão cética |
| Isso prova que não houve fraude? | Não. Estes métodos só enxergam fraude grande o bastante para mudar o desenho dos números no país. Fraude pequena e espalhada por muitas seções, ou feita de forma proporcional ao voto de cada lugar, passa por eles sem ser vista. | **Fato** (é um limite dos métodos) |

**O que isto prova:** os números do 2º turno não têm as três marcas clássicas de fraude em grande escala que estes métodos conhecidos detectam.

**O que isto não prova:** que nenhum voto foi fraudado. Também não prova que cada seção fora do padrão é honesta: elas têm explicação provável, mas não foram investigadas uma a uma.

## Que dados foram usados

- **Fato, aguarda revisão cética.** 2º turno, Presidente: todas as 499.205 seções com voto, tiradas do banco da auditoria (`data/db/eleicao2026.sqlite`), que guarda o boletim de cada urna. Somam 64.256.232 votos para o 13 e 59.826.041 para o 22, iguais ao resultado oficial seção por seção (tópico [5](05-soma-dos-boletins.md)). Script: `node scripts/auditoria/forense-base.mjs 2`.
- **Perfil dos eleitores de cada seção:** idade, escolaridade, eleitores indígenas e quilombolas, tirados do cadastro público do TSE de 17/07/2026. **Fato:** o perfil cobre cerca de 478 mil das 499 mil seções. As do exterior e algumas sem correspondência no cadastro ficam sem esse ajuste.
- **Tipo de local de votação:** aldeia, quilombo, presídio, exterior ou comum, pelo nome do local e pelo cadastro. **Fato:** muitos locais em aldeia não têm "aldeia" no nome, e a raça/cor vem "não informada" para muitos eleitores. Então o grupo "comum" ainda contém aldeias, comunidades ribeirinhas, quilombos e assentamentos.
- **1º turno, para comparação: parcial.** UFs incluídas (15): AC, AL, AM, AP, BA, CE, DF, ES, GO, MA, MG, MS, MT, PA, PB, com 228.269 seções. **Faltam (13):** PE, PI, PR, RJ, RN, RO, RR, RS, SC, SE, SP, TO e o exterior. Todo número do 1º turno abaixo vale só para essas 15 UFs.

## Como cada teste funciona, em palavras simples

Todos os testes seguem a mesma ideia: primeiro se calcula **o que seria esperado numa eleição honesta** com seções do tamanho e do perfil das brasileiras (isso se chama **modelo sem fraude**, ou modelo de referência). Depois se compara com o que as urnas registraram. Diferença grande é um **sinal** a examinar, não uma prova.

### Teste 1. Seções com quase todos os votos para um candidato

Conta quantas seções deram 90% ou mais, e 100%, dos votos válidos a um candidato. O esperado vem do comportamento das outras seções da mesma zona eleitoral. O modelo usado admite que seções vizinhas variam entre si (um bairro vota diferente do outro); em estatística ele se chama **beta-binomial**. Uma seção é marcada como "surpreendente" quando a chance de aquele resultado sair por acaso é menor que 1 em 20 milhões. O limite é tão baixo porque são testadas 499 mil seções, e com tantas tentativas algum resultado raro sempre aparece.

### Teste 2. O "gráfico de Klimek" (impressão digital do enchimento de urna)

Em 2012, Klimek e colegas publicaram um método (revista *PNAS*) que hoje é o mais usado para procurar enchimento de urna. Cada seção vira um ponto num gráfico:

- na horizontal, o **comparecimento** da seção (quantos dos eleitores aptos votaram);
- na vertical, a **parcela do candidato** naquela seção.

Numa eleição sem enchimento, os pontos formam uma nuvem só. Quando há enchimento, aparece uma "mancha" separada no canto de cima à direita: seções com comparecimento perto de 100% e quase 100% para um candidato, porque quem enche a urna aumenta as duas coisas ao mesmo tempo. Foi assim que o método mostrou problemas em eleições da Rússia e de Uganda.

O teste também mede se, **dentro da mesma zona**, as seções que comparecem mais votam mais num candidato. Essa ligação se mede pela **correlação** (um número de −1 a +1: perto de 0 quer dizer que as duas coisas não andam juntas; perto de +1, que sobem juntas). Para saber quanto seria normal, o teste embaralha o comparecimento entre as seções da mesma zona 20 vezes, o que apaga qualquer ligação real e mostra quanto sai só por acaso (isso se chama **permutação**).

### Teste 3. Os algarismos dos votos

Quem inventa números à mão escolhe algarismos de um jeito que contagens reais não produzem. O teste olha:

- **o último algarismo** dos votos de cada candidato em seções com 100 votos ou mais. Numa contagem real, ele deveria sair de 0 a 9 de forma quase igual;
- **o segundo algarismo**, comparado com a lei de Benford (abaixo) e com o modelo sem fraude.

Cada comparação é feita por UF e por candidato (56 comparações no 2º turno). Como são muitas, usa-se uma correção (método de **Holm**) que evita chamar de anomalia o que é só acaso por causa do número de tentativas.

**Por que a lei de Benford no 1º algarismo não serve aqui.** A lei de Benford diz que, em muitos conjuntos de números reais, o primeiro algarismo é "1" em cerca de 30% dos casos, e "9" em menos de 5%. Ela vale quando os números se espalham por várias ordens de grandeza (unidades, dezenas, milhares, milhões). Votos por seção não fazem isso: ficam entre 0 e uns 400, porque a seção tem esse tamanho. Então o primeiro algarismo depende do tamanho das seções e da força do candidato, e não de a contagem ser honesta.

- **Fato, aguarda revisão cética.** Isso foi medido: os votos simulados pelo modelo **sem fraude por construção** são reprovados pela lei de Benford no 1º algarismo em **56 de 56** testes. No Brasil, para o 13, a distância em relação a Benford dos votos simulados (χ² = 286.706) é quase a mesma dos votos reais (297.064). Um teste que reprova dados honestos não serve para detectar fraude. Por isso ele não é usado como prova de nada neste relatório, nem a favor nem contra.

### Teste 4. Seções muito diferentes da sua zona

Para cada seção, mede quantas vezes ela está longe do "típico" da sua zona, em parcela de cada candidato e em comparecimento. Esse afastamento chama-se **escore z**. Foi usado um z que não se deixa puxar pelos próprios valores extremos (z **robusto**). z de 5 ou mais é muito raro: por uma curva normal, daria menos de uma seção no país inteiro. Depois a conta é refeita **descontando o perfil dos eleitores** da seção (idade, escolaridade, indígenas, quilombolas), para ver o que sobra.

### Teste 5. Números redondos

Conta quantas seções têm votos em múltiplos de 10, 50 e 100, e percentuais em múltiplos de 5% (como 60%, 65%, 70%). O esperado para "200 votos" é a média de quantas seções têm 198, 199, 201 e 202. Para os percentuais, cada seção é sorteada de novo 20 vezes com o mesmo tamanho e a mesma parcela, para saber quantos percentuais redondos aparecem por acaso (método de Kobak, Shpilkin e Pshenichnikov, 2016).

### Teste 6. Para que lado pendem as anomalias

Para cada tipo de anomalia, conta quantas favorecem o 13 e quantas o 22, e compara com o que o modelo de cada teste esperava.

## O que foi encontrado (2º turno, Presidente, país inteiro)

### Enchimento de urna (gráfico de Klimek)

- **Fato, aguarda revisão cética.** Comparecimento por seção: metade das seções ficou abaixo de 81,5%. **Nenhuma seção passou de 100%.** 12 seções tiveram exatamente 100%, todas pequenas (de 26 a 163 eleitores aptos). 639 tiveram 95% ou mais. Fonte: `node scripts/auditoria/forense-klimek.mjs 2` → `data/parsed/auditoria/forense/klimek-2t.json`; gráfico em `klimek-2t-13.svg`.
- **Fato, aguarda revisão cética.** Os pontos formam uma nuvem única, com o centro em 80% a 84% de comparecimento (cerca de 156 mil seções nessa faixa). **Não há uma segunda mancha** em 100% de comparecimento com 100% para um candidato.
- **Fato, aguarda revisão cética.** Dentro da mesma zona, a correlação entre comparecimento e parcela do 13 é **−0,078** (em 2.640 zonas com 20 seções ou mais). Para o 22, é +0,078. Os dois números estão perto de zero: comparecimento e voto quase não andam juntos. Descontado o perfil dos eleitores, a correlação do 13 fica em −0,055.
- **Fato, aguarda revisão cética.** Zonas em que a correlação passa de 0,5 (as duas coisas sobem juntas com força): 20 a favor do 13 e 69 a favor do 22, de 2.640. As do 22 estão sobretudo no Sul. A correlação positiva do 22 por UF é maior em SC (+0,26), PR (+0,25), RS (+0,24), GO (+0,19) e RJ (+0,15); a do 13, em RR (+0,25).
  - **Hipótese:** em zonas urbanas, bairros de renda maior comparecem mais e votam mais no 22. O cadastro não informa renda, então esse efeito não foi descontado. **Pendente:** refazer com renda do Censo por setor.
- **Fato, aguarda revisão cética. Há uma cauda pequena de comparecimento alto com voto forte no 13.** 1.214 seções (0,24% do total) tiveram 94% ou mais de comparecimento. Nas 66 com 98% a 100% de comparecimento, o 13 teve em média 79,7% dos votos. No canto "95% ou mais de comparecimento e 95% ou mais para o candidato" há 64 seções do 13 (a permutação esperava cerca de 7) e 2 do 22 (esperava 0,1). Das 64 do 13: 34 em aldeia, 2 em quilombo, 1 em presídio e 29 classificadas como "comuns".
  - **Fato, aguarda revisão cética.** A parcela do 13 também é maior nas seções de comparecimento **baixo** (59% na faixa de 50% a 60%). Isso indica que a cauda reflete diferenças entre regiões, e não só o comparecimento.
  - **Hipótese:** o excesso no canto vem de aldeias e comunidades pequenas, onde o eleitorado é estável, quase todos votam e o voto é parecido. **Pendente:** conferir se as 29 seções "comuns" do canto ficam em terras indígenas ou quilombos, e comparar com as mesmas seções em 2022.

### Números inventados (algarismos)

| Teste | Quantos acusam diferença (de 56, já corrigido por Holm) | Leitura |
|---|---|---|
| Último algarismo × "todos iguais" | 17 | Diferença real, mas pequena (o 0 aparece em 10,5% das seções e o 9 em 9,6%, para o 13). Vem do fato de haver mais seções pequenas que grandes |
| Último algarismo × modelo sem fraude | **0** | Nenhuma UF mostra sinal de número inventado |
| 2º algarismo × lei de Benford | 52 | O modelo sem fraude também é reprovado. Benford não é a referência certa aqui |
| 2º algarismo × modelo sem fraude | 9 | AL, AM, AP, CE, MG, PA, PB, PI, RJ, todos para o 13 |

Fonte: `node scripts/auditoria/forense-digitos.mjs 2` → `data/parsed/auditoria/forense/digitos-2t.json`. Rótulo: **Fato** (contagens), aguarda revisão cética.

- **Hipótese, aguarda revisão cética.** Os 9 desvios do 2º algarismo são pequenos (até 2,6 pontos percentuais) e espalhados por vários algarismos, sem pico num algarismo só. Número escrito à mão costuma deixar pico. A explicação mais provável é que o modelo de referência se ajusta mal a estados onde o 13 tem 60% a 90% dos votos com seções muito diferentes entre si. **Pendente:** refazer com um modelo de referência mais flexível e ver se os desvios somem.

### Números redondos

| | Múltiplos de 10 (observado / esperado) | Múltiplos de 100 (observado / esperado) | Percentual múltiplo de 5% (observado / esperado) |
|---|---|---|---|
| Votos do 13 | 50.046 / 49.917 | 5.566 / 5.532 | 10.972 / 10.894 |
| Votos do 22 | 49.741 / 49.676 | 4.273 / 4.274 | 10.972 / 10.910 |
| Comparecimento | 50.007 / 49.962 | 5.189 / 5.311 | 8.548 / 8.608 |

Fonte: `node scripts/auditoria/forense-redondos.mjs 2` → `data/parsed/auditoria/forense/redondos-2t.json`.

- **Fato, aguarda revisão cética.** Nenhum excesso de números redondos para os dois candidatos nem para o comparecimento. As diferenças entre observado e esperado estão dentro do que o acaso produz (escore z entre −1,7 e +0,7).
- **Fato, aguarda revisão cética.** Brancos e nulos aparecem com **menos** múltiplos de 10 que o esperado. Isso vem do método: são números pequenos (0 a uns 30), e a média dos vizinhos exagera o esperado nesse trecho. Não é sinal de nada.

### Seções com 90% a 100% dos votos para um candidato

| | 90% a 95% | 95% a 99% | 99% a 100% | 100% | Total com 90% ou mais |
|---|---|---|---|---|---|
| 13, observado | 5.150 | 1.545 | 98 | 106 | 6.899 |
| 13, esperado pelo modelo | 4.039 | 601 | 17 | 8 | 4.664 |
| 22, observado | 343 | 34 | 3 | 4 | 384 |
| 22, esperado pelo modelo | 507 | 97 | 7 | 4 | 615 |

Fonte: `node scripts/auditoria/forense-a3a4.mjs 2` → `data/parsed/auditoria/forense/a3a4-2t.json` e `a3a4-2t-secoes.csv`.

- **Fato, aguarda revisão cética.** O 13 tem mais seções com 90% ou mais do que o modelo espera (6.899 contra 4.664). O 22 tem menos (384 contra 615).
- **Fato, aguarda revisão cética. Onde está o excesso do 13:**

  | Tipo de local | Observado | Esperado | Vezes o esperado |
  |---|---|---|---|
  | Aldeia | 517 | 64 | cerca de 8 |
  | Quilombo | 103 | 16 | cerca de 6,5 |
  | Presídio (presos provisórios) | 39 | 3,6 | cerca de 11 |
  | Comum | 6.153 | 4.477 | — |
  | Temporário / exterior | 73 / 14 | 54 / 50 | — |

  As 106 seções com 100% para o 13 estão em: aldeia 52, comum 45, quilombo 7, presídio 2. As seções "comuns" com mais excesso ficam em municípios com muitos indígenas, ribeirinhos ou assentados (Atalaia do Norte-AM, São Gabriel da Cachoeira-AM, Santa Isabel do Rio Negro-AM, Turiaçu-MA, um assentamento em Ortigueira-PR).
- **Fato, aguarda revisão cética.** Não é efeito de seção minúscula: as 110 seções com 100% (106 do 13 e 4 do 22) têm, no meio da lista, 123 votos válidos. Só 19 têm menos de 50 votos. A maior tem 354 votos.
- **Fato, aguarda revisão cética.** As 4 seções com 100% para o 22 ficam em Arroio do Padre-RS, Cândido Godói-RS, Chaves-PA e Jacareacanga-PA.
- **Fato, aguarda revisão cética.** Seções "surpreendentes" (chance menor que 1 em 20 milhões pelo modelo): 125 do 13 e 7 do 22.

### Seções muito diferentes da sua zona

| | Muito acima da zona (z ≥ 5), sem desconto | Com o perfil dos eleitores descontado |
|---|---|---|
| Parcela do 13 | 715 | **318** |
| Parcela do 22 | 135 | **325** |

Fonte: `node scripts/auditoria/forense-zscore.mjs 2` → `data/parsed/auditoria/forense/zscore-2t.json` e `zscore-2t-cauda.csv`.

- **Fato, aguarda revisão cética.** Sem desconto, os casos extremos pendem para o 13 (715 contra 135). Das 715: 243 em aldeia, 89 em presídio, 6 em quilombo e 374 "comuns". **Descontado o perfil dos eleitores, a cauda fica praticamente igual para os dois: 318 e 325.** O desconto age na direção esperada: seções com mais eleitores indígenas, quilombolas e de escolaridade baixa votam mais no 13.
- **Fato, aguarda revisão cética.** Os casos mais extremos do 13, depois do desconto, são escolas indígenas cujo nome não diz "aldeia" (em Brasnorte-MT, Juara-MT, Barra do Garças-MT, José Boiteux-SC, Charrua-RS e Douradina-MS). Os do 22 ficam em Arroio do Padre-RS, Lábrea-AM, Novo Aripuanã-AM, Muaná-PA, Uruçuí-PI, Porto Velho-RO, e em duas seções indígenas de comparecimento baixo (Barcelos-AM e Novo Progresso-PA). Os povos e o perfil de colonização desses municípios estão **a confirmar** em fonte pública (Funai, ISA, IBGE).
- **Fato, aguarda revisão cética.** Comparecimento muito acima da zona: 40 seções, quase todas pequenas (26 a 315 aptos) e rurais. 35 delas foram vencidas pelo 13 e 5 pelo 22; pela composição das zonas, o esperado era cerca de 26 e 14. É a única assimetria desta rodada que o perfil dos eleitores **não** explicou. São 40 seções num universo de 499.205.
  - **Pendente (aponta-se ao coordenador):** a fonte traz dois números diferentes para "comparecimento muito acima da zona, com o perfil descontado": 35 seções (`docs/analysis/forense-estatistica/05`) e 17 + 3 = 20 seções (`07`). **Fato (causa encontrada na conferência):** o 35 é o total do país (`log-zscore-2t.txt`). O 20 conta só as seções que já estavam entre as 40 sem desconto, porque `forense-assimetria.mjs` lê `zscore-2t-cauda.csv`, e esse arquivo só guarda seções extremas **antes** do desconto. Falta saber quem venceu as outras 15. Até o auditor corrigir o doc 07, este relatório usa só o número sem desconto (40).
- **Fato, aguarda revisão cética.** Comparecimento muito **abaixo** da zona: 597 seções. **Hipótese:** cadastro com eleitores que mudaram ou morreram e continuam aptos. Isso não tem a ver com enchimento de urna, e sim com o tópico [6](06-titulos-de-falecidos.md).

### Para que lado pendem as anomalias

- **Fato, aguarda revisão cética.** As anomalias de **concentração** (100%, 90% ou mais, canto de Klimek) favorecem o 13 bem acima do esperado. A de **correlação dentro da zona** favorece o 22 (69 zonas contra 20). Os casos extremos, **com o perfil dos eleitores descontado**, ficam empatados (318 contra 325; a diferença não passa do que o acaso produz). Fonte: `node scripts/auditoria/forense-assimetria.mjs 2` → `assimetria-2t.json`.

## Comparação com o 1º turno (parcial)

**Parcial:** UFs incluídas AC, AL, AM, AP, BA, CE, DF, ES, GO, MA, MG, MS, MT, PA, PB; faltam PE, PI, PR, RJ, RN, RO, RR, RS, SC, SE, SP, TO e exterior. Os mesmos scripts foram rodados com o argumento `1`.

- **Fato, parcial, aguarda revisão cética.** Nenhuma seção com comparecimento acima de 100% (12 com exatamente 100%). Último algarismo × modelo sem fraude: 0 de 30 testes acusam diferença. 2º algarismo × modelo: 10 de 30, incluindo três do 22 (AC, AP, ES). O mesmo tipo de desvio do 2º turno já existia no 1º, e também para o outro candidato.
- **Fato, parcial, aguarda revisão cética.** O excesso de seções com 90% ou mais para o 13 já existia no 1º turno, com 11 adversários: nas 10 UFs da primeira carga (AC a MA), o observado foi 1,85 vez o esperado no 1º turno e 1,46 vez no 2º. Ou seja, o excesso **diminuiu** no 2º turno.
- **Fato, parcial, aguarda revisão cética.** Das 87 seções com 100% no 2º turno que têm 1º turno carregado, **todas** já davam 90% ou mais ao mesmo candidato no 1º turno. Das 5.071 seções do 13 com 90% ou mais (e 1º turno carregado), 5.055 já tinham 80% ou mais no 1º. Das 131 do 22, todas as 131. Só 2 saltaram 20 pontos ou mais entre os turnos.
- **Fato, parcial, aguarda revisão cética.** No 1º turno, os votos do 22 em múltiplos de 10 aparecem um pouco mais que o esperado (23.218 contra 22.655, escore z +3,7), espalhados por 12 das 15 UFs. Isso não se repete no 2º turno nas mesmas UFs (z −0,3), nem nos múltiplos de 50 e 100, nem no último algarismo.
  - **Hipótese (fraca):** acaso ou efeito do método dos vizinhos numa distribuição de outro formato (no 1º turno o 22 tinha mais seções com poucos votos). Não dá para descartar. **Pendente:** refazer com o 1º turno completo e com o esperado por sorteio em vez dos vizinhos.

## Seções conferidas no arquivo da urna

Os testes acima usam o banco da auditoria. Para confirmar que os números extremos são os que a urna gravou, 25 seções extremas foram abertas no arquivo original da urna (`node scripts/auditoria/forense-conferir.mjs 2 <seção>` → `conferencia-2t.json`). Isso **confirma** casos; não gera número da auditoria (princípio 9).

- **Fato, aguarda revisão cética.** Nas 25 seções, o boletim do arquivo é igual ao do banco. Em 24, todos os lacres digitais conferem (0 falha). Exemplos: seção de aldeia em Confresa-MT (zona 28, seção 200): 309 de 315 aptos votaram, 309 votos no 13; Arroio do Padre-RS (zona 34, seção 433): 116 votos no 22 e 2 brancos; e as 12 seções com 100% de comparecimento, que têm voto dividido entre os candidatos (por exemplo, Caraúbas-RN, zona 36, seção 69: 134 para o 13 e 25 para o 22).
- **Pendente.** Uma seção do CE (zona 55, seção 160) **não teve o lacre conferido**: o programa de conferência para com erro ao ler o certificado dessa urna (modelo UE2015). O boletim dela confere com o banco. Foi encaminhada para o tema de integridade dos arquivos (H04).

## Um caso para examinar

**Hipótese.** Seção em local de aldeia em Ipixuna-AM (zona 45, seção 63).

- **Fato, aguarda revisão cética.** 1º turno: 13 = 135, 22 = 61, comparecimento 227. 2º turno: 13 = 167, **22 = 2**, comparecimento 197. Eleitores aptos: 335 nos dois turnos. Lacres sem falha nos dois turnos. Nos dois turnos a seção usou urna de reserva.
- **Hipótese:** mudança de voto em bloco da comunidade entre os turnos, **ou** algo a investigar. O 22 perdeu 59 votos e o comparecimento caiu 30.
- **Pendente:** ler o diário (log) da urna nos dois turnos: troca de urna, horário de encerramento, eleitores liberados sem biometria e avisos de "eleitor já votou". Este teste sozinho não decide.

## Prova de que o teste funciona (contraprova)

- **Fato, aguarda revisão cética.** O modelo sem fraude reproduz o comportamento dos votos reais onde ele deve: no último algarismo, as diferenças em relação a "todos iguais" (17 de 56) somem quando a comparação é com o modelo (0 de 56). Isso mostra que o modelo captura o efeito do tamanho das seções.
- **Fato, aguarda revisão cética.** O mesmo controle mostrou que um teste não serve: Benford no 1º algarismo reprova o modelo sem fraude em 56 de 56 testes. Por isso ele foi descartado.
- **Fato, aguarda revisão cética.** Os testes acusam diferenças quando elas existem nos dados: apontaram o excesso de concentração do 13 nas aldeias, as zonas do Sul com correlação alta para o 22, os desvios do 2º algarismo e o excesso de múltiplos de 10 do 22 no 1º turno (parcial). Eles não estão "cegos".
- **Fato.** As simulações usam semente fixa: rodar os scripts de novo dá os mesmos números.
- **Pendente.** **Não foi feito o teste com fraude simulada** (inserir de propósito, em dados honestos, um enchimento de urna ou números inventados de tamanho conhecido, e ver a partir de que tamanho cada teste acusa). Sem isso, não se sabe o tamanho mínimo de fraude que estes testes conseguiriam ver nos dados brasileiros. Esse tamanho mínimo se chama **poder do teste** (ver glossário).

## Limites

- **Fato (limite dos métodos).** Estes testes procuram fraude **grande o bastante para mudar o desenho dos números**. Eles não detectam:
  - alteração pequena e espalhada por muitas seções;
  - alteração feita por sistema de forma proporcional ao voto de cada seção (ela preserva o formato das distribuições e os algarismos);
  - votos de terceiros liberados sem biometria em proporção ao voto local. Esse voto entra no boletim e no resultado oficial como qualquer outro, e não deixa marca estatística.
- **Risco (princípio 8).** A liberação de eleitor sem biometria depende do mesário, que digita o número do título e o ano de nascimento. Isso é uma brecha que depende só de comportamento humano, e estes testes estatísticos não conseguem dizer se ela foi usada. Ela é examinada pelo diário da urna nas hipóteses H02 e H05 e no tópico 4.
- **Hipótese não medida.** A explicação benigna para a concentração do 13 em aldeias e comunidades é o **voto em bloco** de comunidades pequenas e homogêneas. Esta mesma explicação não exclui pressão sobre o voto dentro da comunidade, que nenhum arquivo público mede.
- **Fato.** A classificação dos locais (aldeia, quilombo) deixa de fora comunidades cujo nome não indica isso. Então parte das seções "comuns" com excesso pode ser de comunidades. Isso não foi medido.
- **Fato.** O modelo de referência usa uma única medida de variação por zona. Em zonas que misturam cidade e aldeia, ele espera menos casos extremos do que seria normal. Isso exagera o "excesso" medido, para os dois candidatos.
- **Fato.** Anomalia estatística, onde existe, também não prova fraude. Ausência de anomalia não prova honestidade.
- **Fato.** Só foi testado o cargo de Presidente. Governador (2º turno em 12 UFs) não foi testado.

## Como repetir

```
node scripts/auditoria/forense-base.mjs 2 && node scripts/auditoria/forense-base.mjs 1
node scripts/auditoria/forense-eleitorado.mjs perfil && node scripts/auditoria/forense-eleitorado.mjs local
for t in 2 1; do
  for s in a3a4 klimek digitos zscore redondos; do node scripts/auditoria/forense-$s.mjs $t; done
  node scripts/auditoria/forense-assimetria.mjs $t
done
node scripts/auditoria/forense-conferir.mjs 2 <uf/município/zona/seção> ...
```

Saídas em `data/parsed/auditoria/forense/` (JSON, CSV, gráficos SVG e registros `log-*.txt`). Detalhes técnicos em [../analysis/forense-estatistica/](../analysis/forense-estatistica/01-dados-e-metodo.md).

## Próximos passos

1. **Pendente:** parecer do revisor cético sobre todos os itens deste tópico.
2. **Pendente:** refazer todos os testes com o 1º turno completo (faltam 13 UFs e o exterior) e comparar seção a seção com o 2º.
3. **Pendente:** comparar com o 2º turno de 2022 nas mesmas seções, principalmente as 110 seções com 100% e a cauda de comparecimento alto. Se o padrão já existia em 2022, é padrão regional estável; se for novo, vira item de investigação.
4. **Pendente:** teste com fraude simulada, para medir o tamanho mínimo de fraude que cada teste detecta.
5. **Pendente:** ler os diários das urnas da seção de Ipixuna-AM (zona 45, seção 63) nos dois turnos.
6. **Pendente:** conferir o lacre da seção do CE (zona 55, seção 160) depois de corrigir a leitura do certificado (H04).
7. **Pendente:** corrigir no doc 07 o número de seções de comparecimento muito alto depois do desconto do perfil (35 no país; o 20 só conta as que já eram extremas sem desconto) e dizer quem venceu cada uma das 35.
8. **Pendente:** modelo de referência mais flexível para o 2º algarismo e sorteio no lugar dos vizinhos para os redondos do 1º turno.
9. **Pendente:** descontar renda (Censo por setor) nas zonas do Sul com correlação alta para o 22, e classificar aldeias e quilombos por coordenada geográfica.
10. **Pendente:** rodar os mesmos testes para Governador.


=== ARQUIVO 10-quadro-das-hipoteses.md ===

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

