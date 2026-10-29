# Relatório de perícia: arquivos das urnas do 2º turno de 2026

Este relatório é escrito para quem não é da área de tecnologia. Cada termo técnico é explicado na primeira vez que aparece, e há um glossário no fim desta página.

Toda afirmação traz um destes rótulos:

- **Fato**: conferido nos arquivos oficiais, com indicação de onde.
- **Hipótese**: possibilidade ainda não comprovada.
- **Pendente**: o que ainda falta conferir, e como será feito.

## Tópicos

| # | Tópico | Pergunta que responde | Situação |
|---|---|---|---|
| 1 | [Integridade e estrutura dos arquivos](01-integridade-e-estrutura-dos-arquivos.md) | Os arquivos que o TSE publica são os mesmos que a urna gerou? O que tem dentro de cada um? | em andamento |
| 2 | Coerência entre os arquivos de uma mesma urna | O boletim, o registro dos votos e o diário da urna contam a mesma história? | a escrever |
| 3 | Linha do tempo da urna | O que a urna fez da preparação até o envio do resultado, e em que horário? | a escrever |
| 4 | Como os eleitores foram liberados para votar | Quantos votaram com digital, quantos sem, e por quê? | a escrever |
| 5 | Soma dos boletins × resultado oficial | Somando todas as urnas, chega-se ao resultado divulgado? | a escrever |
| 6 | Títulos de pessoas falecidas | Houve voto registrado em nome de quem já tinha morrido? | a escrever |
| 7 | Limites desta perícia | O que estes arquivos permitem afirmar e o que não permitem | a escrever |

## Glossário

| Termo | Em palavras simples |
|---|---|
| **BU** (Boletim de Urna) | O "placar" da urna: quantos votos cada candidato teve naquela seção. É impresso e afixado na porta da seção no fim do dia, e também gravado em arquivo |
| **RDV** (Registro Digital do Voto) | A lista de todos os votos da urna, um por um, embaralhada para que não dê para saber quem votou em quem |
| **Log** | O "diário de bordo" da urna: anota, com data e hora, cada coisa que aconteceu (ligou, imprimiu, liberou eleitor, recebeu voto, encerrou) |
| **Hash** | A "impressão digital" de um arquivo: um código calculado a partir do conteúdo. Se mudar uma única letra do arquivo, o código muda completamente |
| **Assinatura digital** | Um "lacre com carimbo": prova que o arquivo foi produzido por quem diz que produziu (aqui, a urna) e que não foi mexido depois |
| **Certificado** | A "carteira de identidade" digital da urna, emitida pelo TSE, usada para conferir a assinatura |
| **Seção** | O grupo de eleitores que vota numa mesma urna |
| **Zona** | A divisão do cartório eleitoral que agrupa várias seções |
