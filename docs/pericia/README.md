# Relatório de perícia: arquivos das urnas das eleições de 2026 (1º e 2º turno)

> [!WARNING]
> **Relatório em elaboração. Nada aqui é conclusão final.** Os tópicos são atualizados conforme os testes avançam e passam por revisão independente; o que ainda não foi medido aparece como **Pendente**, sem número. Nenhuma hipótese de fraude foi sustentada até agora, e também não é possível afirmar que não houve fraude: cada tópico diz o que os seus testes não enxergam.

Este relatório é escrito para quem não é da área de tecnologia. Cada termo técnico é explicado na primeira vez que aparece, e há um glossário no fim desta página.

Toda afirmação traz um destes rótulos:

- **Fato**: conferido nos arquivos oficiais, com indicação de onde.
- **Hipótese**: possibilidade ainda não comprovada.
- **Pendente**: o que ainda falta conferir, e como será feito.

**Regra deste relatório (pedido do auditor, 29/10/2026): só entra dado 100% correto e completo.**

- **Número só entra se tiver sido reproduzido de forma independente:** uma revisão independente, que tentou derrubá-lo e o confirmou, ou duas contas independentes que batem.
- **Universo completo:** todas as seções e todas as UFs. Dado parcial não entra.
- **Fica fora:** estimativa estatística, amostra, "cerca de", número de terceiros não conferido (imprensa, pesquisas) e conta feita sobre suposição. Esses ficam nos documentos de trabalho, fora deste relatório.
- **O que ainda não cumpre a regra entra como Pendente, sem o número.**
- **Este relatório é independente:** os programas, os dados intermediários e as verificações de cada número estão num índice técnico separado, disponível para quem for auditar o trabalho.

**Regra de controle (princípio 8), usada em todos os tópicos:** uma regra cumprida por pessoas, como "o mesário só deixa votar quem estava na fila às 17h", **não conta como controle**. Só conta o que a urna trava sozinha e registra. Onde o controle depende só de pessoas, o texto marca **risco**, e os dados são examinados para ver se a brecha foi usada.

**Premissa de forma (pedido do auditor, 29/10/2026): dados detalhados, com gráficos, em linguagem que qualquer pessoa entenda.**

- **Detalhe:** além do total, cada tópico mostra os números abertos (por estado, por turno, por tipo de caso) e os casos concretos, identificados por estado, município, zona e seção, para que cada um possa ser conferido.
- **Gráficos:** cada gráfico tem um título que diz o que ele mostra, eixos com unidade, legenda e uma frase "como ler". Os dados de cada gráfico, e o programa que o desenha, ficam guardados no índice técnico.
- **Linguagem:** frases curtas, sem jargão. Todo termo técnico é explicado na primeira vez, com uma comparação do dia a dia.

**Comece pelo resumo:** os principais achados (o resumo executivo, no início do relatório completo), em poucas páginas: o que foi conferido e bate, as brechas encontradas, o que não dá para afirmar e o que está pendente. Ele não traz número novo; cada número remete ao tópico onde está.

## Tópicos

| # | Tópico | Pergunta que responde | Situação |
|---|---|---|---|
| 0 | [Os arquivos de todas as urnas foram obtidos?](00-coleta-completa.md) | Foram examinadas todas as urnas ou só uma amostra? | Concluído para os dois turnos: todas as seções, arquivos conferidos um a um, sem nenhuma falha. Pendente: a lista oficial de parte das seções (no 2º turno, faltam parte de SP e o TO) e as seções com situação "Recebida". |
| 1 | [Integridade e estrutura dos arquivos](01-integridade-e-estrutura-dos-arquivos.md) | Os arquivos que o TSE publica são os mesmos que a urna gerou? O que tem dentro de cada um? | Concluído para os dois turnos: nenhum arquivo alterado depois de assinado (2º turno com revisão independente). Inclui o que a urna anota sobre o próprio programa e o certificado vencido da AC URNA. Pendente: contagem das inicializações, boletim impresso de uma seção de MG no 1º turno e resposta do TSE sobre a AC URNA. |
| 2 | [Coerência entre os arquivos de uma mesma urna](02-coerencia-entre-arquivos.md) | O boletim, o registro dos votos e o diário da urna contam a mesma história? | Concluído para o 2º turno. 1º turno: boletim × registro dos votos e diário × boletim concluídos; faltam as contas internas do boletim. Concluída a identificação da urna e dos cartões nos dois turnos. Pendente: a urna que gravou 15 votos numa seção de SP no 1º turno e as demais conferências de identificação. |
| 3 | [Linha do tempo da urna](03-linha-do-tempo.md) | O que a urna fez da preparação até o envio do resultado, e em que horário? | Números conferidos por uma segunda conta; a apuração na noite do 2º turno também com revisão independente. Pendente: os números que dependem de nova leitura dos diários, onde os boletins esperaram e se a ordem de registro dependeu do voto. |
| 4 | [Como os eleitores foram liberados para votar](04-liberacao-dos-eleitores.md) | Quantos votaram com digital, quantos sem, e por quê? | Concluído para o 2º turno, com revisão independente; o teste de uso da liberação sem digital a favor de um lado não decide. Pendente: parte do 1º turno e testes de detalhe (PR, SP, inserção detectável, votos na faixa entre modelos). |
| 5 | [Soma dos boletins × resultado oficial](05-soma-dos-boletins.md) | Somando todas as urnas, chega-se ao resultado divulgado? | Concluído: 2º turno, Presidente seção a seção e Governador por zona; 1º turno, todos os cargos. Pendente: demais campos do 2º turno, voto por candidato e seção nos outros cargos, situação das candidaturas excluídas e consulta popular de PE. |
| 6 | [Títulos de pessoas falecidas](06-titulos-de-falecidos.md) | Houve voto registrado em nome de quem já tinha morrido? | Verificados o cadastro e o 1º turno. Pendente: o 2º turno (falta a contagem oficial por idade) e as medidas que hoje só existem como amostra ou estimativa. |
| 7 | [Limites desta perícia](07-limites-da-pericia.md) | O que estes arquivos permitem afirmar e o que não permitem | Revisto e atualizado com os demais tópicos em 30/10/2026. |
| 8 | [A virada do 2º turno](08-virada-do-2-turno.md) | O que os números oficiais mostram sobre a virada? | Escrito só com números reproduzidos de forma independente; testes ainda em revisão aparecem como Pendente, sem número. |
| 9 | [Padrões estatísticos de fraude](09-padroes-estatisticos.md) | Os resultados de Presidente mostram as marcas estatísticas que fraudes grandes costumam deixar? | Parcial: os números exatos foram refeitos por uma segunda conta; os que dependem de simulação estão Pendentes. O tópico ainda não teve revisão independente completa. |
| 10 | [Quadro geral das hipóteses de fraude testadas](10-quadro-das-hipoteses.md) | Quais suspeitas de fraude foram testadas, como, e o que se concluiu? | Atualizado em 30/10/2026: 18 hipóteses no quadro (H01 a H17 e H25). As registradas depois (H18 a H24) estão Pendentes. |
| 11 | [Urnas trocadas por reserva no 2º turno](11-urnas-reserva.md) | As seções que votaram com urna reserva no 2º turno mostram votos ou rastro técnico fora do normal, comparadas com elas mesmas no 1º turno e com as vizinhas? | Concluído para o 2º turno, com revisão independente. Pendente: motivo da troca de urnas em Aracaju, causa do comparecimento menor das reservas herdadas no 1º turno e os demais pontos listados no tópico. |
| 12 | [Sigilo do voto](12-sigilo-do-voto.md) | Os arquivos públicos permitem ligar um voto a um eleitor? | Concluído para os dois turnos, com revisão independente. Pendente: de quem são os números de título gravados no diário (pergunta ao TSE) e a busca em formas codificadas. |
| 13 | [A mesa e o atendimento de cada eleitor](13-mesa-e-sessao-do-eleitor.md) | Todo eleitor liberado tem um fim registrado no diário? A mesa liberou votos em bloco, impediu alguém de votar ou votou no lugar de quem chegou depois? | Escrito em 30/10/2026, com revisão independente. Concluído para os dois turnos o atendimento de cada eleitor, a lista de votos × boletim do 1º turno e a causa das interrupções. Pendente: os testes de votos em bloco (H15) e do "já votou" (H17) e o pedido de ata e caderno de votação de duas seções. |

**Relatórios temáticos** (cada um sai também em PDF próprio):

| Tema | Pergunta que responde | Situação |
|---|---|---|
| [O certificado vencido da AC URNA](temas/certificado-ac-urna.md) | O certificado do "cartório digital" das urnas 2013 e 2015 venceu antes da eleição. O que isso permite e o que não permite afirmar? | Versão de 30/10/2026, com revisão independente: inclui a busca por carteiras de teste ou fora do padrão nas três autoridades (nenhuma fora do molde; 6 urnas receberam a carteira entre os turnos) e as respostas, ponto por ponto, às perguntas do auditor. Pendente: resposta do TSE, lista de revogação e política da AC URNA. |

**Registro de evidências:** um registro técnico separado deste relatório guarda o índice de todos os arquivos de dados usados (com a impressão digital de cada um), o livro de registro encadeado de cada verificação e as cópias dos documentos de referência.

## Glossário

| Termo | Em palavras simples |
|---|---|
| **BU** (Boletim de Urna) | O "placar" da urna: quantos votos cada candidato teve naquela seção. É impresso e afixado na porta da seção no fim do dia, e também gravado em arquivo |
| **RDV** (Registro Digital do Voto) | A lista de todos os votos da urna, um por um, ordenada por tipo de voto e número digitado, e não pela ordem em que as pessoas votaram, para que não dê para saber quem votou em quem ([tópico 12](12-sigilo-do-voto.md)) |
| **Log** | O "diário de bordo" da urna: anota, com data e hora, cada coisa que aconteceu (ligou, imprimiu, liberou eleitor, recebeu voto, encerrou) |
| **Hash** | A "impressão digital" de um arquivo: um código calculado a partir do conteúdo. Se mudar uma única letra do arquivo, o código muda completamente |
| **Assinatura digital** | Um "lacre com carimbo": prova que o arquivo foi produzido por quem diz que produziu (aqui, a urna) e que não foi mexido depois |
| **Certificado** | A "carteira de identidade" digital da urna, emitida pelo TSE, usada para conferir a assinatura |
| **Autoridade certificadora (AC)** | O "cartório" digital do TSE que emite as carteiras de identidade (certificados) das urnas |
| **Chave privada (chave secreta)** | O número secreto que só o dono tem (a urna, ou o cartório digital) e que produz a assinatura. A parte pública da chave serve para conferir a assinatura, mas não para produzi-la. Como o carimbo de um cartório: qualquer um confere, só o cartório faz |
| **Cadeia de certificados** | A fila de quem confia em quem: a carteira da urna é carimbada por um cartório digital (AC URNA, AC UE2020 ou AC UE2022), e o certificado desse cartório é carimbado por um cartório raiz do TSE |
| **Validade do certificado** | O período impresso no certificado ("válido de ... até ..."), como o prazo de uma carteira de identidade. É uma regra que quem confere decide aplicar; não entra na conta da assinatura |
| **Ed521** | O método de cálculo usado pelas urnas novas (modelos 2020 e 2022) para produzir e conferir lacres. É público e também adotado pela ICP-Brasil |
| **ECDSA** | O método de cálculo usado pelas urnas antigas (modelos 2013 e 2015) para produzir e conferir lacres. É público e padrão internacional |
| **CEPESC** | Método de lacre do governo usado pelo software do TSE. Não é público, então ninguém de fora consegue conferi-lo |
| **Autoverificação** | A conferência que a urna faz, cada vez que é ligada, das assinaturas dos seus próprios programas. O resultado de cada etapa ("SUCESSO" ou "ERRO") fica anotado no diário |
| **Inicialização** | Cada vez que a urna é ligada e o programa começa a rodar |
| **Carga** | A instalação, antes da eleição, do programa e dos dados da seção na urna, feita por técnicos da Justiça Eleitoral com um cartão próprio (mídia de carga). Cada instalação recebe um código de carga |
| **Nulo técnico** | Voto dado na urna a um número que a totalização não aceita como válido, por exemplo de candidatura que ficou fora da disputa. O voto está no boletim, mas a totalização o soma como nulo, numa conta à parte |
| **Cartão de votação (mídia de votação, MV)** | O cartão de memória onde a urna grava os votos. Na troca por urna reserva, ele passa da urna com defeito para a reserva |
| **Mídia de resultado (MR)** | O cartão de memória em que a urna grava o resultado no fim do dia, para levá-lo ao cartório |
| **Número de série** | O número que identifica cada urna e cada cartão de memória |
| **Recuperador de Dados (RED)** | Programa usado no cartório para gerar o boletim a partir do cartão de votação de uma urna que não conseguiu gerá-lo. Às vezes roda em outra urna |
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
| **Ponto percentual** | A diferença entre duas porcentagens. De 48% para 51% são 3 pontos percentuais |
| **Intervalo de 95%** | A faixa de valores compatível com os dados. Se a faixa contém o zero, os dados não distinguem a diferença medida de diferença nenhuma |
| **Diferença-em-diferenças** | Comparar o "antes e depois" de um grupo com o "antes e depois" de um grupo de referência. Como medir quanto uma planta adubada cresceu e comparar com o quanto cresceram as do mesmo canteiro sem adubo |
| **Correção para muitos testes** | Quem faz muitos testes ao mesmo tempo acha alguns resultados "raros" só por acaso. A correção exige mais de cada teste, na proporção de quantos foram feitos |
| **Urna reserva herdada** | Urna reserva que substituiu a urna da seção no 1º turno (ou antes dele) e continuou na seção no 2º turno |
| **Atendimento do eleitor (sessão)** | O trecho do diário da urna que vai da liberação do eleitor até o fim registrado: voto gravado, desistência ou parada da urna. Como a ficha de um paciente no pronto-socorro, que abre na entrada e fecha na alta ([tópico 13](13-mesa-e-sessao-do-eleitor.md)) |
| **Caderno de votação** | A lista de eleitores da seção, em papel, que cada eleitor assina ao votar. Não é pública. É o único registro de quem assinou e em que ordem |
| **LAI** (Lei de Acesso à Informação) | A lei que permite a qualquer pessoa pedir informações a órgãos públicos |
