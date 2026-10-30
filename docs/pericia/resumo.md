# Resumo: os principais achados

> Situação em 30/10/2026; o relatório está em elaboração. Este resumo não traz número novo: cada número está escrito igual no tópico indicado (→), com a explicação, as tabelas, os gráficos e a forma como a conta foi feita.

Rótulos: **Fato** é conferido nos arquivos oficiais de todas as seções, com um programa que refaz a conta. **Hipótese** é possível, mas não comprovado. **Pendente** ainda não foi conferido e fica sem número.

## Em poucas palavras

Nos arquivos públicos das urnas do 1º turno (04/10/2026) e do 2º turno (25/10/2026), nenhum dos testes concluídos encontrou sinal de fraude no resultado: a soma dos boletins é igual ao resultado oficial para Presidente no 2º turno e para todos os cargos no 1º (onde a única diferença é a classificação de votos como nulo técnico, que pesou no governo do RJ), e nenhum arquivo assinado dos dois turnos foi alterado depois da assinatura. Parte dos testes ainda está em andamento, e um deles não decide. Os testes também acharam pontos fracos: a liberação de eleitores sem digital depende só de pessoas, um certificado de segurança venceu antes da eleição, e o diário público das urnas traz números com formato de título de eleitor. E há perguntas que esses arquivos não respondem, como quem estava na cabine e se o programa da urna era o auditado. Por isso, esta perícia não afirma que houve fraude, nem que não houve.

## O que foi examinado

**Fato:** todas as urnas. A lista oficial tem 499.248 seções (grupos de eleitores que votam na mesma urna) em cada turno. 41 delas, no exterior, não tiveram urna instalada, segundo o TSE. Os arquivos das outras 499.207 foram conferidos um a um; quase todas usaram urna eletrônica, e algumas do exterior (e 2 de MG no 1º turno, em parte) votaram em cédula de papel, apurada num sistema próprio. → [tópico 0](00-coleta-completa.md)

De cada urna saem o **boletim de urna** (o placar da seção), o **registro digital do voto** (a lista dos votos, um por um, sem nome) e o **diário da urna** (que anota com hora tudo o que a urna fez). Abaixo, 13 e 22 são os dois candidatos a Presidente no 2º turno; o 13 venceu por 4.430.191 votos.

## Os principais achados

### O que foi conferido e bate

**1. A soma das urnas é igual ao resultado oficial.** **Fato.** 2º turno, Presidente: 0 diferença em 499.205 seções, conferidas uma a uma (as 499.207 com boletim menos 2 do exterior em que ninguém votou). 1º turno, todos os cargos: 0 divergência nos totais das 499.207 seções com boletim; a única diferença é a classificação de 630.541 votos como nulo técnico (item 10). Nenhuma seção do 2º turno teve mais votantes que eleitores aptos. No 2º turno, também os demais números (aptos, comparecimento, brancos, nulos) de Presidente e de Governador são iguais ao oficial em cada seção, e o voto de cada candidato a Governador é igual em cada zona, município e estado. → [tópico 5](05-soma-dos-boletins.md), [tópico 2](02-coerencia-entre-arquivos.md)

**2. Os arquivos dos dois turnos não foram alterados depois de assinados.** **Fato.** A urna assina seus arquivos com uma assinatura digital, um lacre eletrônico que denuncia qualquer mudança posterior. 2º turno: 499.207 pacotes conferidos, 0 falha; arquivos adulterados de propósito foram rejeitados, o que mostra que a conferência funciona. 1º turno: os 499.207 pacotes desse turno também passaram, sem nenhum arquivo alterado; num deles, de MG, o boletim impresso foi publicado fora da lista lacrada. Todas as urnas anotam a mesma versão de programa (10.23.0.0); é o que o próprio programa declara, e não prova qual programa rodou (ver "O que não dá para afirmar"). Em todas as seções com urna dos dois turnos, o resultado foi assinado pela própria urna que ele declara, menos em 17 seções em que os votos foram recuperados por outra urna, e nenhuma seção fantasma foi encontrada. → [tópico 1](01-integridade-e-estrutura-dos-arquivos.md), [tópico 14](14-outras-formas-de-fraude.md)

**3. Boletim e lista de votos são iguais; o diário confirma quase todos os votos.** **Fato.** No 2º turno, boletim e lista de votos são iguais em todas as seções e cargos (539.815 comparações, 0 diferença). Há votos do boletim sem a linha "voto computado" no diário: 54 em 6 seções no 2º turno e 159 em 9 no 1º. Em 10 dessas seções, o diário mostra o atendimento do eleitor, e a urna caiu ou foi desligada antes de gravar a última linha. Nas outras 5, os arquivos mostram como o diário se perdeu: outra urna, ligada com o cartão de votos da seção, gravou o próprio diário por cima (numa delas, a recusa dessa urna é inferida, sem linha de erro). No 1º turno, boletim e lista de votos também são iguais (2.490.805 comparações, 0 diferença), e, nos dois turnos, todo eleitor liberado aparece no diário com um fim registrado: voto gravado, desistência ou parada da urna. **Pendente:** qual urna gravou 15 desses votos, numa seção de SP. → [tópico 2](02-coerencia-entre-arquivos.md), [tópico 13](13-mesa-e-sessao-do-eleitor.md)

**4. A virada cabe nos votos que estavam disponíveis.** **Fato.** O ganho dos dois finalistas do 1º para o 2º turno é exatamente o que estava disponível (votos dos eliminados, queda de brancos e nulos, aumento do comparecimento): 14.098.232. A suspeita "o vencedor cresceu mais do que havia de votos" foi **refutada**. Limite: essa conta sempre fecha quando cada urna tem tantos votos quantos votantes (o que foi conferido), e não mede troca de votos do 22 para o 13: uma troca assim só reduz o ganho do 22 (3.721.538), e ela só chamaria atenção se o fizesse perder votos no total. → [tópico 8](08-virada-do-2-turno.md)

**5. Nas urnas trocadas por reserva, o teste de votos não encontrou diferença em relação às vizinhas.** **Fato.** No 2º turno, 5.714 seções votaram com urna reserva (a que substitui a urna com defeito). Nas 2.818 trocas novas, o teste que compara a mudança da parcela do 13 entre os turnos com a das seções sem troca da mesma zona não encontrou diferença. Não encontrar diferença não prova que os votos foram iguais: quer dizer que o teste não separou a diferença do acaso. Os números do teste estão na análise técnica separada da auditoria. Mesmo que todos os 742.671 votos do 13 nas 5.714 seções com reserva fossem, na verdade, do 22, o 13 venceria por 2.944.849. → [tópico 11](11-urnas-reserva.md)

**6. Horários de votação e de apuração.** **Fato.** Depois das 17h de Brasília houve 34.315 votos: se fossem todos de um lado, seriam 0,8% da diferença entre os candidatos. Lidos os diários de todas as urnas dos dois turnos, nenhum eleitor votou mais depressa do que uma pessoa consegue digitar: o menor intervalo entre dois votos foi de 16 segundos no 2º turno. Nesses diários, nenhum voto aparece antes do relatório de urna vazia (a zerésima) nem depois do encerramento, e a urna recusa, e anota, qualquer acerto de relógio depois da zerésima. Na apuração, às 19h, 98,64% dos boletins já tinham sido emitidos pelas urnas, e o TSE tinha registrado 1.909 (0,38% das seções): todos os que tinham voto, até as 17:10, e 39 de seções do exterior sem urna; de 17:10 a 19:03:37 não registrou nenhum boletim com voto, e depois registrou em lotes até 21:09. A ordem de registro não muda o total, que é a soma dos boletins. **Pendente:** onde os boletins esperaram e se a ordem dependeu do voto das seções. → [tópico 3](03-linha-do-tempo.md), [tópico 10](10-quadro-das-hipoteses.md), [tópico 14](14-outras-formas-de-fraude.md)

### Brechas e riscos encontrados

**7. A liberação do eleitor sem digital depende só de pessoas.** **Fato.** No 2º turno, 15.884.298 votantes do Brasil (12,4%, sem o exterior) votaram sem a própria digital: ou a urna não tinha a digital deles e o mesário digitou título e ano de nascimento, ou a digital falhou e a mesa liberou à mão. 2.791.394 dessas liberações à mão ficaram no diário sem nenhum mesário ligado a elas. No exterior, todos os 380.612 votantes foram liberados sem digital. Na liberação à mão, a urna aceita o dedo de qualquer pessoa para autorizar, e 172.318 liberações no 1º turno e 212.171 no 2º foram feitas sem que o leitor lesse dedo nenhum (H19). Nenhum arquivo registra quem estava na cabine. No pior caso aritmético (em cada seção, os liberados sem digital dão ao 13 o máximo de votos possível e ao 22 o mínimo, e esses votos são anulados), essa porta basta para inverter o resultado (margem de −11.119.111): isso mede o tamanho da porta, não é sinal de fraude. O teste estatístico que procurou uso dela a favor de um lado **não decide**. → [tópico 4](04-liberacao-dos-eleitores.md), [tópico 14](14-outras-formas-de-fraude.md)

**8. O certificado que confere as urnas antigas venceu antes da eleição.** **Fato.** O certificado é a "carteira de identidade" digital da urna. O certificado público da AC URNA, o "cartório digital" do TSE que confere as urnas de 2013 e 2015 (99.957 pacotes do 2º turno), venceu em 18/07/2026. **Fato:** a chave desse cartório continuou carimbando carteiras de urna depois do vencimento: 54 com início de validade entre 20/07 e 19/10/2026, usadas em 53 seções no 2º turno; o teste que compara a variação dos votos dessas seções entre os turnos com a das vizinhas não encontrou diferença. Nenhuma das 503.525 carteiras de urna dos dois turnos foge do formato das outras do mesmo cartório, o que não exclui uma carteira de teste montada no mesmo formato com a chave verdadeira. O TSE não publicou certificado renovado, e os arquivos não mostram se a totalização confere a validade: é um risco ([relatório temático](temas/certificado-ac-urna.md)). Além disso, um dos dois lacres da urna usa um método secreto do governo, que ninguém de fora confere. → [tópico 1](01-integridade-e-estrutura-dos-arquivos.md)

**9. O diário público das urnas traz números com formato de título de eleitor.** **Fato.** Quando o mesário interrompe a votação de um eleitor que demora na cabine, a urna grava no diário o número digitado. No dia do 1º turno, 55.483 linhas trazem 31.764 números com formato de título que não são de nenhum mesário, presidente de mesa ou servidor registrado no diário de qualquer urna do país; no dia do 2º turno, 5.564 linhas e 3.801 números. **Hipótese:** é o título do próprio eleitor interrompido; confirmação **Pendente** (pergunta ao TSE). Se for, o diário liga esse eleitor ao horário em que esteve na cabine e ao voto nulo que a urna atribui nos cargos que ele não confirmou (**Hipótese**). Não revela voto em candidato: a lista de votos não guarda a ordem em que as pessoas votaram (**Fato**, nos dois turnos). → [tópico 12](12-sigilo-do-voto.md)

**10. Uma classificação de votos pesou no governo do RJ.** **Fato.** No 1º turno, a única diferença entre boletins e resultado oficial é de classificação: 630.541 votos foram contados como **nulo técnico** (voto num número que a totalização não aceita, por exemplo de candidatura que ficou fora da disputa). No RJ, o governador eleito no 1º turno teve 50,880% dos votos válidos. Os 274.411 votos do nº 10 contados como nulo técnico são mais que os 147.771 que tirariam essa maioria. Se esses votos deveriam ou não contar está **Pendente**: depende da situação e da data da decisão que excluiu o nº 10. A perícia não julga se a exclusão estava certa. → [tópico 5](05-soma-dos-boletins.md)

**11. A urna aceita reserva preparada para outra zona.** **Fato.** Em 125 trocas novas, a reserva tinha sido preparada para outra zona eleitoral do mesmo estado. A urna aceitou e registrou isso no diário e no boletim: falta bloqueio, não rastro. O teste de votos não encontrou diferença entre essas seções e a zona, já com a régua mais exigente que se usa quando se fazem muitos testes ao mesmo tempo (para que nenhum resultado apareça só por sorte). → [tópico 11](11-urnas-reserva.md)

**12. Há mais títulos de eleitores com 100 anos ou mais do que pessoas com essa idade.** **Fato.** O cadastro de 2026 tem 297.977 eleitores de 100+ com domicílio no Brasil. O Censo 2022 contou 149.424 pessoas de 96+ e 53.568 de 95 anos, as que poderiam ter 100+ em 2026: o cadastro tem mais eleitores de 100+ do que o Censo contou de pessoas que poderiam ter essa idade. O tamanho desse excedente é **Pendente**: depende da data em que o TSE calcula a idade e da cobertura do Censo. 92% dos títulos de 100+ não têm digital cadastrada. No 1º turno, pela contagem do TSE, compareceram 0,72% dos eleitores de 100+, o que não indica uso sistemático. 2º turno: **Pendente** (falta a contagem oficial por idade). Os votantes de 85 a 99 anos quase dobraram de 2022 para 2026 (de 267.098 para 460.338, no 1º turno), mas o aumento faz parte de uma subida de todos os eleitores de 70 anos ou mais e não se concentra nos títulos sem digital; se algum título de pessoa morta foi usado nesse aumento, os arquivos públicos não dizem (**Pendente**). → [tópico 6](06-titulos-de-falecidos.md)

## O que não dá para afirmar

- **Quem estava na cabine.** Um voto dado no lugar de um eleitor ausente, em ritmo normal, gera boletim, lista de votos e diário coerentes e passa por todos os testes desta perícia. → [tópico 7](07-limites-da-pericia.md)
- **Se o programa que rodou na urna é o auditado.** Os três arquivos saem do mesmo programa; um programa alterado e assinado com a chave oficial escreveria arquivos normais. Os arquivos públicos não bastam para conferir isso; depende de controles fora deles, como a inspeção do código e o Teste de Integridade. → [tópico 7](07-limites-da-pericia.md)
- **O que aconteceu entre a urna e a totalização** além do que as assinaturas cobrem: os registros de transmissão não são públicos. → [tópico 7](07-limites-da-pericia.md)
- **Em quem votou o eleitor liberado sem digital.** O voto é secreto; só dá para cercá-lo por cima e por baixo. → [tópico 4](04-liberacao-dos-eleitores.md)
- **Que não houve fraude.** "O teste não achou" quer dizer que não apareceu o rastro que aquele teste procura. Fraude pequena, espalhada por igual, concentrada em poucas seções ou igual nos dois turnos pode passar pelos testes. → [tópico 7](07-limites-da-pericia.md)

## Pendências e perguntas ao TSE

**Pendente:** as consultas populares do 2º turno, sem resultado oficial para comparar ([tópico 5](05-soma-dos-boletins.md)); se a ordem de registro dos boletins dependeu do voto ([tópico 3](03-linha-do-tempo.md)); os testes de votos em bloco (H15) e do "já votou" (H17) ([tópico 13](13-mesa-e-sessao-do-eleitor.md)); as atas das recargas de urna sem motivo escrito no diário, a lista de sorteio do Teste de Integridade e as atas das seções com relógio errado ([tópico 14](14-outras-formas-de-fraude.md)); a hipótese H26, registrada depois e ainda não levada a este relatório ([tópico 10](10-quadro-das-hipoteses.md)).

**Perguntas ao TSE e aos TREs:** o certificado em vigor da AC URNA e os das autoridades raiz; de quem são os números de título gravados na interrupção do eleitor; quantos eleitores tinham digital carregada na urna, por seção; quantos eleitores de 100+ votaram no 2º turno; onde os boletins esperaram entre 17:10 e 19:03 do 2º turno; o motivo da troca de urnas entre as zonas 1 e 2 de Aracaju.

## Quadro das hipóteses de fraude

**Aberta:** teste não feito ou só começado. **Em teste:** em andamento. **Refutada:** os dados mostram que a hipótese, como foi escrita, é falsa. Nenhuma foi **sustentada** (confirmada). Detalhes no [tópico 10](10-quadro-das-hipoteses.md).

| Nº | A suspeita, em palavras simples | Situação | Onde ler |
|---|---|---|---|
| H01 | Votos com títulos de pessoas que já morreram | em teste | [tópico 6](06-titulos-de-falecidos.md) |
| H02 | Seções com liberação sem digital fora do normal | aberta | [tópico 4](04-liberacao-dos-eleitores.md) |
| H03 | A soma das urnas é diferente do resultado oficial | em teste | [tópico 5](05-soma-dos-boletins.md) |
| H04 | Arquivos alterados ou gerados fora de urna oficial | em teste | [tópico 1](01-integridade-e-estrutura-dos-arquivos.md) |
| H05 | Mesários liberando outras pessoas sem digital | aberta | [tópico 4](04-liberacao-dos-eleitores.md) |
| H06 | Prorrogação do horário e liberação controlada dos boletins | em teste | [tópico 3](03-linha-do-tempo.md) |
| H07 | Urnas antigas postas onde se quer dispensar a digital | **refutada** | [tópico 10](10-quadro-das-hipoteses.md) |
| H08 | Votos rápidos demais para uma pessoa | aberta | [tópico 10](10-quadro-das-hipoteses.md) |
| H09 | Arquivos públicos permitem saber em quem alguém votou | aberta | [tópico 12](12-sigilo-do-voto.md) |
| H10 | O vencedor cresceu mais do que havia de votos | **refutada** | [tópico 8](08-virada-do-2-turno.md) |
| H11 | Mesmo cartão em várias urnas, ou resultado trocado no caminho | em teste | [tópico 2](02-coerencia-entre-arquivos.md) |
| H12 | O QR do título digital pode ser forjado para votar sem digital | aberta | [tópico 10](10-quadro-das-hipoteses.md) |
| H13 | Liberação sem digital ligada a voto no 13 no Nordeste | em teste | [tópico 4](04-liberacao-dos-eleitores.md) |
| H14 | Urnas trocadas por reserva manipuladas | em teste | [tópico 11](11-urnas-reserva.md) |
| H25 | Certificado vencido do cartório das urnas antigas | em teste | [relatório temático](temas/certificado-ac-urna.md) |
| H15 | Votos no lugar de ausentes, liberados em bloco pela mesa | em teste | [tópico 13](13-mesa-e-sessao-do-eleitor.md) |
| H16 | Eleitor liberado sem fim registrado, ou voto sem eleitor liberado | em teste | [tópico 13](13-mesa-e-sessao-do-eleitor.md) |
| H17 | A mesa impediu eleitores de votar, ou votou no lugar de quem chegou depois | em teste | [tópico 13](13-mesa-e-sessao-do-eleitor.md) |
| H18 | Mudança igual em todas as urnas de uma cidade | em teste | [tópico 14](14-outras-formas-de-fraude.md) |
| H21 | Voto nulo usado como "senha" de compra de voto | em teste | [tópico 14](14-outras-formas-de-fraude.md) |
| H22 | Exterior e seções apuradas em cédula usados para pôr votos | em teste | [tópico 14](14-outras-formas-de-fraude.md) |
| H23 | Urna carregada de novo, ou fora do dia previsto | em teste | [tópico 14](14-outras-formas-de-fraude.md) |
| H24 | Eleitores em trânsito usados para inflar seções | em teste | [tópico 14](14-outras-formas-de-fraude.md) |
| H27 | Resultado trocado no caminho, ou seção fantasma | em teste | [tópico 14](14-outras-formas-de-fraude.md) |
| H19 | Falha da digital provocada para liberar à mão | em teste | [tópico 14](14-outras-formas-de-fraude.md) |
| H20 | Relógio da urna ou ordem do diário mexidos para esconder votos fora do horário | em teste | [tópico 14](14-outras-formas-de-fraude.md) |
| H26 | Registrada depois | **Pendente** | [tópico 10](10-quadro-das-hipoteses.md) |
