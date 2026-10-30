# 0. Os arquivos de todas as urnas foram obtidos?

## A pergunta

A perícia examinou os arquivos de **todas** as urnas do país, nos dois turnos, ou só de uma amostra? Faltou alguma urna?

## Resposta curta

**Fato:** sim, de todas. A lista oficial de seções do TSE tem, em cada turno (04/10 e 25/10/2026), **499.248 seções principais** (as que não votam na urna de outra seção), no país e no exterior. Destas, 41 não tiveram urna instalada, segundo o próprio TSE. Os arquivos das outras 499.207 foram baixados e conferidos um a um: quase todas usaram urna eletrônica, e 31 no 1º turno (2 delas, em MG, só em parte) e 29 no 2º votaram em cédula de papel, apurada depois num sistema próprio (ver **Casos especiais**).

| | 1º turno | 2º turno |
|---|---|---|
| Seções com arquivos completos e íntegros (conferidos contra a "nota fiscal" que acompanha os arquivos; ver **Limites**) | 499.207 | 499.207 |
| Seções sem urna instalada, segundo o próprio TSE (todas no exterior) | 41 | 41 |
| **Total da lista oficial** | **499.248 de 499.248** | **499.248 de 499.248** |
| Seções "agregadas" (votam na urna de outra seção) cobertas | 17.931 de 17.931 | 17.931 de 17.931 |

Fonte: a lista oficial de seções do TSE, cruzada, seção por seção, com a conferência de cada seção. Nenhuma seção da lista ficou sem conferência e nenhuma apareceu em dobro. Cada número desta página foi recontado por uma segunda verificação independente, feita com programa próprio sobre todas as seções dos dois turnos.

## De onde vieram os arquivos

O TSE publica os arquivos de duas formas:

1. **Pacotes por estado.** Um arquivo compactado por UF e um para o exterior, com os arquivos de todas as urnas daquele lugar (28 pacotes por turno, com 124.135.876.999 bytes no 2º turno e 95.066.353.561 bytes no 1º).
2. **Endereço de cada seção.** Uma pasta pública por seção, com a lista oficial do que deveria existir lá (aqui chamada de **lista oficial da seção**).

Os pacotes por estado foram usados por inteiro. O endereço de cada seção foi usado para buscar arquivos que faltavam nos pacotes e para baixar a lista oficial, que ainda não terminou (ver **Limites**).

## Como se sabe que cada arquivo está inteiro

Cada urna grava uma "nota fiscal" (o pacote de lacres, ver o [tópico 1](01-integridade-e-estrutura-dos-arquivos.md)) com a impressão digital de cada arquivo. Para cada uma das 499.207 seções com arquivos, nos dois turnos:

- a impressão digital da própria nota fiscal foi refeita; onde a lista oficial da seção já chegou, ela foi comparada com o código que o TSE publica para a seção (ver **Limites**);
- a impressão digital de cada arquivo (boletim, registro dos votos, diário e boletim impresso) foi refeita e comparada com a anotada na nota fiscal. São 4 arquivos por seção, 1.996.828 por turno.

Um único bit diferente em qualquer desses arquivos faria a seção falhar. **Fato:** nenhuma falhou, em nenhum dos dois turnos.

Isso prova que cada arquivo é exatamente o que a nota fiscal da urna lista. Se a própria nota fiscal é autêntica (assinada pela urna) é assunto do [tópico 1](01-integridade-e-estrutura-dos-arquivos.md).

## Casos especiais encontrados (todos Fatos)

| Caso | Quantidade | O que é |
|---|---|---|
| Seções "não instaladas" | 41 por turno, todas no exterior | O TSE informa que não houve urna nessas seções. Não existe arquivo, e isso consta da lista oficial de cada uma |
| Sistema de Apuração | 31 seções no 1º turno (29 no exterior e 2 em MG); 29 no 2º turno, todas no exterior | Votos em cédula de papel, apurados depois num sistema próprio. Os arquivos têm outros nomes, mas seguem o mesmo esquema de impressões digitais e lacres, que também foi conferido |
| Arquivo faltando no pacote do estado | 1 por turno | No 2º turno, o diário de uma seção de SP (que a lista oficial da seção também não cita). No 1º turno, o registro dos votos de uma seção do MA. Nos dois casos o arquivo **estava publicado no endereço da seção**, foi baixado de lá e a impressão digital confere com a nota fiscal da urna |
| Seções com situação "Recebida" no site (2º turno) | **Pendente** | Na lista oficial, algumas seções têm a situação "Recebida", e não "Totalizada". A quantidade, as UFs, as datas e a comparação dos votos com o boletim da urna só entram quando a lista oficial tiver chegado para todas as seções com urna (falta parte de SP e todo o TO) |

## Limites

- **Parcial:** a lista oficial de cada seção, que diz qual pacote o TSE considerou, ainda está sendo baixada devagar, porque o site do TSE bloqueia acessos rápidos. No 2º turno ela ainda não chegou para todas as seções com urna (faltam seções de SP e de TO): **Pendente**, sem número até o download terminar. No 1º turno, a lista oficial foi baixada só para 1 seção com urna (a do MA citada acima) e para as 41 não instaladas. Onde ela ainda falta, a conferência usou a nota fiscal da própria urna, o que garante que os arquivos estão íntegros, mas ainda não confirma, pela palavra do TSE, que **o pacote publicado é o que o TSE totalizou**.
- Esta etapa diz que os arquivos estão completos e íntegros. **Não** diz se os votos dentro deles são legítimos. Isso é o assunto dos tópicos seguintes.

