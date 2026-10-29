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
