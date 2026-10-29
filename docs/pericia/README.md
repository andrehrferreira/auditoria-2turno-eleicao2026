# Relatório de perícia: arquivos das urnas das eleições de 2026 (1º e 2º turno)

> [!WARNING]
> **Relatório em elaboração. Nada aqui é conclusão final.** Os tópicos são atualizados conforme os testes avançam e passam pela revisão cética; o que ainda não foi medido aparece como **Pendente**, sem número. Nenhuma hipótese de fraude foi sustentada até agora, e também não é possível afirmar que não houve fraude: cada tópico diz o que os seus testes não enxergam.

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
| 0 | [Os arquivos de todas as urnas foram obtidos?](00-coleta-completa.md) | Foram examinadas todas as urnas ou só uma amostra? | Verificado do universo completo. Arquivos refeitos um a um nos dois turnos, sem nenhuma falha. Correções: tamanho do 2º turno (124 GB), Sistema de Apuração do 1º turno (31), "Recebida" (parcial: 5.270 em 10 UFs, datas de 25 a 28/10) e confirmação pelo aux.json (parcial: 395.227 seções do 2º turno; faltam SP e TO). |
| 1 | [Integridade e estrutura dos arquivos](01-integridade-e-estrutura-dos-arquivos.md) | Os arquivos que o TSE publica são os mesmos que a urna gerou? O que tem dentro de cada um? | escrito; conferido no Acre inteiro e em 1 seção do ES; falta o país |
| 2 | [Coerência entre os arquivos de uma mesma urna](02-coerencia-entre-arquivos.md) | O boletim, o registro dos votos e o diário da urna contam a mesma história? | Verificado: todos os números do texto foram reproduzidos, pelos scripts verifica-pericia-coerencia*.mjs (cópia de leitura e brutos) ou pelos pareceres cético 08 e 10. 8 itens foram corrigidos, entre eles o C3 2T (539.815 → 539.420) e o C2 1T (153.097 → 153.095). Saíram o p de 1 em 100 bilhões, a contagem 16/8 e as horas não reproduzidas. O 1º turno continua parcial, com 13 UFs listadas. Coerência entre tópicos (29/10/2026): a cópia de leitura vigente (29/10/2026, 10h50 UTC) já tem o 1º turno nas 28 UFs, no ponteiro e na tabela carga; as frases que diziam que o diário do 1º turno de AM e BA não estava no banco foram ajustadas, e o C2 dessas UFs continua Pendente. |
| 3 | [Linha do tempo da urna](03-linha-do-tempo.md) | O que a urna fez da preparação até o envio do resultado, e em que horário? | 118 números conferidos com script próprio (verifica-pericia-linha-do-tempo.mjs; casos no bruto com verifica-pericia-linha-do-tempo-bruto.mjs). 16 corrigidos, entre eles: Noronha 13->10, sinal do efeito dentro da zona −0,26->+0,26, 1º turno completo 3.725.552/779.835, emissão do boletim e explicação do erro de leitura no ES. Saíram os números que dependem da releitura dos diários (784 seções com voto depois do SIM, 1.025 cancelamentos, causas de religamento, pausas, liberação dos tardios, ciclo com 2 cargos), marcados Pendente. Sem parecer cético ainda. Coerência entre tópicos (29/10/2026): governador no 2º turno em 6 UFs, não 11 (como no tópico 9); a decisão do STF passa a citar a cópia guardada no repositório, como nos tópicos 8 e 10. |
| 4 | [Como os eleitores foram liberados para votar](04-liberacao-dos-eleitores.md) | Quantos votaram com digital, quantos sem, e por quê? | Verificado em 29/10/2026. 96 números conferidos: reproduzidos pelos pareceres 01, 06 e 10 ou recalculados de todas as seções (verifica-pericia-liberacao.mjs e verifica-pericia-liberacao-logs.mjs). 12 correções (Acre 733 → 1.424; recorte do RN; já votou 10 → 9 seções e 99,6% só das seções com aviso; rajadas de ES 366 → 382; UE2013 11.433; números do item 5 dentro da zona; Nordeste 3,5%). Item 6.2 e 1º turno do item 3 viraram Pendente, sem número. Só o item 6.1 continua parcial (sem SP, TO e exterior). |
| 5 | [Soma dos boletins × resultado oficial](05-soma-dos-boletins.md) | Somando todas as urnas, chega-se ao resultado divulgado? | Verificado (universo completo, 2º turno, Presidente): os totais e a contagem de 0 de 499.205 seções divergentes foram reproduzidos exatamente, com o CSV oficial lido direto do zip. A contagem parcial de seções 'Recebida' (1.088, AM e BA) e as datas de chegada foram removidas. O 1º turno e os demais cargos continuam pendentes. Coerência entre tópicos (29/10/2026): o 1º turno de Presidente entrou, completo: 0 divergências em 499.206 seções, 28 UFs (verifica-pericia-coerencia-topicos.mjs, CSV oficial lido do zip; igual ao tópico 8). "Recebida" passa a citar o número parcial do tópico 0 (5.270, com as UFs). Continuam pendentes os demais cargos. |
| 6 | [Títulos de pessoas falecidas](06-titulos-de-falecidos.md) | Houve voto registrado em nome de quem já tinha morrido? | Verificado. A Parte 1 e o 1º turno oficial foram sustentados pelos pareceres 02 e 03. Recontei no universo do perfil bruto e do banco os números de biometria por faixa, a tabela por estado, a proporção de homens e os casos RJ e Indaiatuba (script verifica-pericia-06-titulos-falecidos.mjs). Saíram do texto os números de amostra da marca da foto, as estimativas de 52 mil e 100 mil, o resíduo de 330 eleitores e o 1º turno do B1a com a repetição entre turnos, que é parcial (todos viraram Pendente). A marca da foto ficou restrita ao estrato completo de 378 seções. Coerência entre tópicos (29/10/2026): o comparecimento dos títulos excedentes passa a ser o da afirmação revisada do parecer 04 (cerca de 60% a 70%), como nos tópicos 7 e 10. |
| 7 | [Limites desta perícia](07-limites-da-pericia.md) | O que estes arquivos permitem afirmar e o que não permitem | Revisto: 74 números conferidos (os pareceres do cético sustentam uns, scripts/auditoria/verifica-pericia-07-limites.mjs recalcula outros sobre o universo completo e src/lacres.js reconfere o AC). 8 números corrigidos: coleta 499.207+41; 34.330 votos depois das 17h; aumento sem digital 20,6% (601.715) contra 12,2%; BU=RDV 539.815 com nulo após suspensão; 16 s sem as 3 seções com 3 logs; lacres do AC nos dois turnos; cadastro ZZ; mecanismo do parecer 08. Saíram o 538.946, a busca do título, os números do Teste de Integridade e os '7 arquivos', que ficaram como Pendente. Não sobra nenhuma marca 'aguarda revisão'. Coerência entre tópicos (29/10/2026): aumento de comparecimento corrigido para 2.920.461 e 601.543 (a conta contava 2 seções de MG com boletim do Sistema de Apuração no 1º turno; agora igual aos tópicos 4 e 10); BU × oficial do 1º turno completo (499.206 seções, 0 diferença); refação das impressões digitais feita no país (tópico 0); causa dos 0 s nas 3 seções (tópico 3); queda do excesso de "sem biometria" restrita às 378 seções medidas; liberação manual sem mesário no país (2.791.394, tópico 4); lacres em 2 seções do ES; 1º turno do excesso sobre o cadastro como Pendente. |
| 8 | [A virada do 2º turno](08-virada-do-2-turno.md) | O que os números oficiais mostram sobre a virada? | escrito só com números reproduzidos de forma independente; testes em revisão listados como Pendente, sem número |
| 9 | [Padrões estatísticos de fraude](09-padroes-estatisticos.md) | Os resultados de Presidente mostram as marcas estatísticas que fraudes grandes costumam deixar? | Números determinísticos recalculados de forma independente com scripts próprios: verifica-pericia-09-padroes.mjs (cópia de leitura e ZIPs públicos do TSE) e verifica-pericia-09-conferencia.mjs (arquivos das urnas). 12 correções: canto comum 29→27, mediana 123→122,5, perfil 478 mil→498.818, MS na lista de UFs, governador 12→6 UFs, TO com voto não dividido, entre outras. Os números de simulação e de desconto do perfil (318/325, −0,055, 0/56, 9/56, Benford simulado, percentuais redondos, permutação) foram removidos e marcados como 'Pendente: em verificação'. Ainda não há parecer do cético sobre o tópico. |
| 10 | [Quadro geral das hipóteses de fraude testadas](10-quadro-das-hipoteses.md) | Quais suspeitas de fraude foram testadas, como, e o que se concluiu? | Verificado em 29/10: 96 números conferidos. Saem os que têm parecer do cético (01–06, 08, 10) e os recontados do universo completo por scripts/auditoria/verifica-pericia-quadro.mjs, src/lacres.js (AC e ES) e varredura dos ZIPs. Há 9 correções: H05 passa a 20,6%, 601.543 e base de 12,2% (antes 23,7%, 480 mil e 12,7%); 13 hipóteses viram 12 registradas; ES com 25 conferências; H07 e H11 ajustados. Ficam como Pendente, sem número: H03 demais cargos, hashes do país, H06 784 e −0,26, H08 ciclo, H09 busca de título e ordem do RDV, H12 e forense. Marcas 'aguarda revisão' removidas. Coerência entre tópicos (29/10/2026): H03 do 1º turno completo (499.206 seções, 0 diferença); hashes do país refeitos (tópico 0), saem do Pendente; H07 com os números do tópico 4 (modelo lido no diário: 11.432 de 11.433; −0,21; +4,3 e +3,2); H08 com a causa conferida no tópico 3; H02 com o estrato completo das 378 seções; ES com as seções 0364 e 0372. |

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
