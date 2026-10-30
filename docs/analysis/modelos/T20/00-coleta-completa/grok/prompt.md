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

## Tópico em revisão: 00-coleta-completa.md

# 0. Os arquivos de todas as urnas foram obtidos?

## A pergunta

A perícia examinou os arquivos de **todas** as urnas do país, nos dois turnos, ou só de uma amostra? Faltou alguma urna?

## Resposta curta

**Fato:** sim, de todas. A lista oficial de seções do TSE tem, em cada turno (04/10 e 25/10/2026), **499.248 seções principais** (as que não votam na urna de outra seção), no país e no exterior. Os arquivos das 499.207 que tiveram urna foram baixados e conferidos um a um. As outras 41 não tiveram urna, segundo o próprio TSE.

| | 1º turno | 2º turno |
|---|---|---|
| Seções com arquivos completos e íntegros | 499.207 | 499.207 |
| Seções sem urna instalada, segundo o próprio TSE (todas no exterior) | 41 | 41 |
| **Total da lista oficial** | **499.248 de 499.248** | **499.248 de 499.248** |
| Seções "agregadas" (votam na urna de outra seção) cobertas | 17.931 de 17.931 | 17.931 de 17.931 |

Fonte: a lista oficial de seções do TSE (`data/raw/<turno>/config/*-cs.json`) cruzada, seção por seção, com a conferência de cada seção (`data/manifest/<turno>/cobertura/`). Nenhuma seção da lista ficou sem conferência e nenhuma apareceu em dobro. Detalhes técnicos no [doc 03](../03-coleta-bus-logs.md).

## De onde vieram os arquivos

O TSE publica os arquivos de duas formas:

1. **Pacotes por estado.** Um arquivo compactado por UF e um para o exterior, com os arquivos de todas as urnas daquele lugar (28 pacotes por turno, com 124.135.876.999 bytes no 2º turno e 95.066.353.561 bytes no 1º).
2. **Endereço de cada seção.** Uma pasta pública por seção, com a lista oficial do que deveria existir lá (o `aux.json`).

Os pacotes por estado foram usados por inteiro. O endereço de cada seção foi usado para buscar arquivos que faltavam nos pacotes e para baixar a lista oficial, que ainda não terminou (ver **Limites**).

## Como se sabe que cada arquivo está inteiro

Cada urna grava uma "nota fiscal" (o pacote de lacres, ver o [tópico 1](01-integridade-e-estrutura-dos-arquivos.md)) com a impressão digital de cada arquivo. Para cada uma das 499.207 seções com urna, nos dois turnos:

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

- **Parcial:** a lista oficial de cada seção (`aux.json`), que diz qual pacote o TSE considerou, ainda está sendo baixada devagar, porque o site do TSE bloqueia acessos rápidos. No 2º turno ela ainda não chegou para todas as seções com urna (faltam seções de SP e de TO): **Pendente**, sem número até o download terminar. No 1º turno, a lista oficial foi baixada só para 1 seção com urna (a do MA citada acima) e para as 41 não instaladas. Onde ela ainda falta, a conferência usou a nota fiscal da própria urna, o que garante que os arquivos estão íntegros, mas ainda não confirma, pela palavra do TSE, que **o pacote publicado é o que o TSE totalizou**.
- Esta etapa diz que os arquivos estão completos e íntegros. **Não** diz se os votos dentro deles são legítimos. Isso é o assunto dos tópicos seguintes.

## Como repetir

```
node src/coleta.js --turno 2          # baixa, extrai e confere (doc 03)
node src/coleta.js --turno 1
node scripts/auditoria/verifica-pericia-coleta.mjs --turno 2 --rehash   # recontagem independente deste tópico
node scripts/auditoria/verifica-pericia-coleta.mjs --turno 1 --rehash
```
