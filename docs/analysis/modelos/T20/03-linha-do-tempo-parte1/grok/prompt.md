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

## Tópico em revisão: 03-linha-do-tempo.md (parte 1 de 3)

# 3. Linha do tempo da urna

## A pergunta

O que a urna fez desde a preparação até o encerramento, e em que horário? Houve votos fora do horário permitido ou votos em ritmo impossível para uma pessoa?

## Situação da verificação

Os achados deste tópico ainda não têm parecer do revisor cético (`docs/analysis/cetico-revisor/`). Por isso, em 29/10/2026, cada número deste texto foi **recalculado de forma independente**, sobre o universo completo, por um script próprio (`scripts/auditoria/verifica-pericia-linha-do-tempo.mjs`). Ele lê os boletins e os perfis dos diários no banco (cópia de leitura) e os perfis completos do 1º turno, e não usa as saídas dos scripts do auditor de linha do tempo. Os casos citados como exemplo foram conferidos no diário original (`scripts/auditoria/verifica-pericia-linha-do-tempo-bruto.mjs`). Só ficou no texto o número que bateu. Os números que não puderam ser refeitos foram retirados e aparecem como **"Pendente: em verificação"**.

**Item 12 (a apuração na noite do 2º turno), atualizado em 30/10/2026:** este item tem parecer do revisor cético ([parecer 28](../analysis/cetico-revisor/28-chegada-dos-bus.md), sustentado com ressalvas; o revisor refez as contas do autor e chegou aos mesmos arquivos, byte a byte). O texto usa só a "afirmação revisada" do parecer. Os números foram contados de novo, seção a seção, por `scripts/auditoria/grafico-chegada-bu-dados.mjs`, que confere minuto a minuto a recontagem com a conta do autor (0 diferença) e com os arquivos do parecer.

## Resposta curta

Tudo abaixo vale para o **2º turno (25/10/2026)**, salvo quando o texto diz "1º turno". Os testes de horário (abertura, encerramento e votos depois das 17h) cobrem as 497.896 seções do Brasil. As 1.310 seções do exterior ficam fora, porque falta o fuso de cada país (ver "Limites").

| Pergunta | O que se encontrou | Rótulo |
|---|---|---|
| Alguma urna abriu ou recebeu voto antes das 8h de Brasília? | Nenhuma | **Fato** |
| Alguma urna encerrou antes das 17h de Brasília? | Nenhuma. A urna tem uma trava que impede o encerramento antes das 17h | **Fato** |
| Houve voto depois das 17h de Brasília? | Sim: 34.330 votos (0,027% do total) em 29.854 seções. A urna **não tem trava** para isso: quem decide até quando entra eleitor é o mesário | **Fato** |
| Houve seções que ficaram abertas até 19h? | Sim: 6.352 seções encerraram às 19h ou depois. A própria urna não exigia isso | **Fato** |
| Os votos depois das 17h mudaram o resultado? | Não. Mesmo se fossem todos de um lado só, seriam 0,8% da diferença entre os dois candidatos | **Fato** |
| Houve voto em ritmo impossível para uma pessoa? | Não. Fora 3 seções com erro de leitura desta auditoria, o menor intervalo entre dois votos seguidos é de 16 segundos | **Fato** |
| O mesário seguiu as regras de horário? | Não se pode afirmar. Há seções em que o mesário declarou à urna que "todas as pessoas presentes já votaram" e depois disso ainda houve voto. Quantas são: **Pendente: em verificação** | **Fato** (o registro existe); a contagem e o motivo são **Pendentes** |
| Às 19h os boletins já existiam, mas o TSE os liberou aos poucos? (item 12) | Às 19h, 98,64% dos boletins do Brasil já tinham sido emitidos pelas urnas, e o TSE tinha registrado como recebidos 1.909 (0,38% das seções). De 17:10 a 19:03:37 o TSE não registrou nenhum boletim com voto; depois, registrou em lotes e com vazão limitada até 21:09. Onde os boletins esperaram, e se a ordem de liberação dependeu do voto das seções: **Pendente** | **Fato** (horários e contagens); **Pendente** (onde esperaram e a ordem) |

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
| **p99** | O valor abaixo do qual ficam 99% das seções. Mostra até onde vão quase todos os casos, deixando de fora só os extremos |
| **Ponto percentual (p.p.)** | A diferença entre duas porcentagens. De 52% para 51% é uma queda de 1 ponto percentual |
| **Correlação** | Um número de −1 a +1 que diz se duas coisas sobem e descem juntas. Perto de 0 quer dizer que não há relação em linha reta entre elas; não exclui uma relação de outro formato |
| **Comparação dentro da mesma zona** | Comparar seções vizinhas, da mesma zona eleitoral, para que diferenças de região, renda ou preferência política não se misturem ao efeito medido |
| **Emissão do boletim** | O momento em que a urna, depois de encerrada a votação, imprime e grava o boletim (BU) da seção. Fica gravado no próprio boletim |
| **Registro como recebido** | A hora em que o sistema do TSE anotou que recebeu o boletim de uma seção. Não é a hora em que o boletim saiu da seção: é como o carimbo de "protocolado" num balcão, que marca quando o atendente registrou o papel, e não quando a pessoa chegou na fila |
| **Totalização** | A soma dos boletins feita pelo TSE para formar o resultado. Cada boletim tem a hora em que entrou nessa soma |
| **Lote** | Um grupo de boletins registrados juntos, no mesmo segundo ou em poucos segundos, em vez de um a um |
| **Vazão** | Quantos boletins o sistema registrou por minuto. "Vazão limitada" quer dizer que o número por minuto ficou preso num teto, como a água que sai de um cano estreito |

## Como foi feito

1. **Universo.** O 2º turno tem 499.207 seções com boletim. Dessas, 497.896 entram nos testes de horário. Ficam de fora as 1.310 seções do exterior, porque o repositório não tem a tabela do fuso de cada país e não é possível converter o horário delas para Brasília. Fica de fora também 1 seção (SP 64777/0395/0298): o arquivo do diário existe, mas o programa de leitura não o leu. **Fato.**
2. **Fuso de cada município.** Como todas as urnas abrem às 8h de Brasília, a hora local em que a maioria das urnas do município abriu mostra o fuso dele. Exemplo: no Acre, todas as 2.270 seções ficaram prontas às 6h locais, logo o Acre está 2 horas atrás de Brasília. O fuso tirado da abertura no boletim e o tirado da "urna pronta" no diário coincidem em todos os municípios.
3. **Linha do tempo.** Para cada urna, foram usados os horários de carga, abertura, encerramento e emissão gravados no boletim, e os horários de "urna pronta", de cada voto e de início do encerramento gravados no diário.
4. **Ritmo.** Foi medido o tempo entre dois votos seguidos e entre a habilitação do eleitor e o voto, em todas as seções.
5. **Votos tardios.** Foram contados os votos depois das 17h, das 18h e das 19h de Brasília, em todas as seções.
6. **Efeito no resultado.** Foram comparadas seções da mesma zona com e sem voto tardio, e locais de votação que foram até 19h com locais vizinhos que fecharam às 17h.
7. **Casos extremos** foram conferidos no diário original, linha por linha. Esses casos servem só para confirmar o que já foi medido no total, não para gerar números.

Ponto de partida do teste (o que se espera se nada estiver fora do normal): a urna é preparada antes do 1º turno, abre às 8h, fica ligada até as 17h, recebe votos só de quem estava na fila às 17h, encerra e emite o boletim em poucos minutos. Desvios vêm de falha de equipamento ou de energia e deixam marca no diário.

Princípio usado (princípio 8 de [../01-premissas.md](../01-premissas.md)): uma regra cumprida por pessoas, como "o mesário só deixa votar quem estava na fila às 17h", **não conta como controle**. Só conta o que a urna trava sozinha e registra. Onde o controle depende só de pessoas, isso aparece como **risco**, e os dados são examinados para ver se a brecha foi usada.
