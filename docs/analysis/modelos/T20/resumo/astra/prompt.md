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


## Atenção especial (resumo executivo)

Este é o resumo que abre o relatório, para leitor leigo com 3 minutos. Além dos tipos 1–5, aponte:
6. **Fidelidade:** algum achado está mais forte ou mais fraco do que deveria, em qualquer sentido (fraude ou absolvição)?
7. **Omissão:** falta algum ponto que um leitor leigo precisa saber para não sair com a impressão errada?
8. **Clareza:** frase que um leigo entenderia errado (cite e proponha a frase reescrita).

## Texto em revisão: resumo.md (resumo executivo)

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

**2. Os arquivos dos dois turnos não foram alterados depois de assinados.** **Fato.** A urna assina seus arquivos com uma assinatura digital, um lacre eletrônico que denuncia qualquer mudança posterior. 499.207 pacotes conferidos, 0 falha; arquivos adulterados de propósito foram rejeitados, o que mostra que a conferência funciona. Todas as urnas rodaram a mesma versão de programa (10.23.0.0). No 1º turno, os mesmos 499.207 pacotes também passaram, com 0 falha de arquivo. → [tópico 1](01-integridade-e-estrutura-dos-arquivos.md)

**3. Boletim, lista de votos e diário contam a mesma história.** **Fato.** No 2º turno, boletim e lista de votos são iguais em todas as seções e cargos (539.815 comparações, 0 diferença). Há votos do boletim sem a linha "voto computado" no diário: 54 em 6 seções no 2º turno e 159 em 9 no 1º. Os próprios arquivos mostram a causa: a urna caiu antes de gravar a última linha, ou outra urna, ligada com o cartão de votos da seção, gravou o próprio diário por cima. **Pendente:** qual urna gravou 15 desses votos, numa seção de SP. → [tópico 2](02-coerencia-entre-arquivos.md)

**4. A virada cabe nos votos que estavam disponíveis.** **Fato.** O ganho dos dois finalistas do 1º para o 2º turno é exatamente o que estava disponível (votos dos eliminados, queda de brancos e nulos, aumento do comparecimento): 14.098.232. A suspeita "o vencedor cresceu mais do que havia de votos" foi **refutada**. Limite: a conta não enxerga troca de votos do 22 para o 13 menor que o ganho do 22 (3.721.538). → [tópico 8](08-virada-do-2-turno.md)

**5. As urnas trocadas por reserva votaram como as vizinhas.** **Fato.** No 2º turno, 5.714 seções votaram com urna reserva (a que substitui a urna com defeito). Nas 2.818 trocas novas, a parcela do 13 mudou entre os turnos como nas seções sem troca da mesma zona: −0,05 ponto percentual, numa faixa de −0,12 a +0,03, que inclui o zero. Mesmo que todos os 742.671 votos do 13 nessas seções fossem tirados do 22, o 13 venceria por 2.944.849. → [tópico 11](11-urnas-reserva.md)

**6. Horários de votação e de apuração.** **Fato.** Depois das 17h de Brasília houve 34.330 votos: se fossem todos de um lado, seriam 0,8% da diferença entre os candidatos. Fora 3 seções com erro de leitura desta auditoria, o menor intervalo entre dois votos foi de 16 segundos. Na apuração, às 19h, 98,64% dos boletins já tinham sido emitidos pelas urnas, e o TSE tinha registrado 1.909 (0,38% das seções); de 17:10 a 19:03:37 não registrou nenhum boletim com voto, e depois registrou em lotes até 21:09. A ordem de registro não muda o total, que é a soma dos boletins. **Pendente:** onde os boletins esperaram e se a ordem dependeu do voto das seções. → [tópico 3](03-linha-do-tempo.md)

### Brechas e riscos encontrados

**7. A liberação do eleitor sem digital depende só de pessoas.** **Fato.** No 2º turno, 15.884.298 votantes do Brasil (12,4%, sem o exterior) votaram sem a própria digital: ou a urna não tinha a digital deles e o mesário digitou título e ano de nascimento, ou a digital falhou e a mesa liberou à mão. 2.791.394 dessas liberações à mão ficaram no diário sem nenhum mesário ligado a elas. No exterior, todos os 380.612 votantes foram liberados sem digital. Nenhum arquivo registra quem estava na cabine. No pior caso aritmético, essa porta basta para inverter o resultado (margem de −11.119.111): isso mede o tamanho da porta, não é sinal de fraude. O teste estatístico que procurou uso dela a favor de um lado **não decide**. → [tópico 4](04-liberacao-dos-eleitores.md)

**8. O certificado que confere as urnas antigas venceu antes da eleição.** **Fato.** O certificado é a "carteira de identidade" digital da urna. O certificado público da AC URNA, o "cartório digital" do TSE que confere as urnas de 2013 e 2015 (99.957 pacotes do 2º turno), venceu em 18/07/2026. **Hipótese**, não testável com os arquivos públicos: foi renovado com a mesma chave. Até o TSE publicar o certificado em vigor, é um risco. **Pendente:** o assunto está em teste (H25, os certificados de cada urna e os votos dessas urnas), com resultado ainda em revisão cética; um relatório próprio sobre ele será publicado. Além disso, um dos dois lacres da urna usa um método secreto do governo, que ninguém de fora confere. → [tópico 1](01-integridade-e-estrutura-dos-arquivos.md)

**9. O diário público das urnas traz números de título de eleitor.** **Fato.** Quando o mesário interrompe a votação de um eleitor que demora na cabine, a urna grava no diário o número digitado. No dia do 1º turno, 55.483 linhas trazem 31.764 números com formato de título que não são de nenhum mesário, presidente de mesa ou servidor; no dia do 2º turno, 5.564 linhas e 3.801 números. **Hipótese:** é o título do próprio eleitor interrompido; confirmação **Pendente** (pergunta ao TSE). Não revela voto em candidato: a lista de votos não guarda a ordem em que as pessoas votaram (**Fato**, nos dois turnos). → [tópico 12](12-sigilo-do-voto.md)

**10. Uma classificação de votos pesou no governo do RJ.** **Fato.** No 1º turno, a única diferença entre boletins e resultado oficial é de classificação: 630.541 votos foram contados como **nulo técnico** (voto num número que a totalização não aceita, por exemplo de candidatura que ficou fora da disputa). No RJ, o governador eleito no 1º turno teve 50,880% dos votos válidos. Os 274.411 votos do nº 10 contados como nulo técnico são mais que os 147.771 que tirariam essa maioria; contados como válidos, o eleito teria 49,270%. **Pendente:** situação e data da decisão que excluiu o nº 10. A perícia não julga se a exclusão estava certa. → [tópico 5](05-soma-dos-boletins.md)

**11. A urna aceita reserva preparada para outra zona.** **Fato.** Em 125 trocas novas, a reserva tinha sido preparada para outra zona eleitoral do mesmo estado. A urna aceitou e registrou isso no diário e no boletim: falta bloqueio, não rastro. Os votos nessas seções variaram como os da zona. → [tópico 11](11-urnas-reserva.md)

**12. Há mais títulos de eleitores com 100 anos ou mais do que pessoas com essa idade.** **Fato.** Comparado ao Censo 2022, o cadastro tem 94.985 títulos de 100+ sem pessoa correspondente, para qualquer data de 2026 (148.553 se o TSE conta a idade até o fim de julho), mesmo supondo que ninguém morreu desde o Censo. 92% deles não têm digital cadastrada. No 1º turno, pela contagem do TSE, compareceram 0,72% dos eleitores de 100+, sem sinal de uso sistemático. 2º turno: **Pendente** (falta a contagem oficial por idade). → [tópico 6](06-titulos-de-falecidos.md)

## O que não dá para afirmar

- **Quem estava na cabine.** Um voto dado no lugar de um eleitor ausente, em ritmo normal, gera boletim, lista de votos e diário coerentes e passa por todos os testes desta perícia. → [tópico 7](07-limites-da-pericia.md)
- **Se o programa que rodou na urna é o auditado.** Os três arquivos saem do mesmo programa; um programa alterado e assinado com a chave oficial escreveria arquivos normais. Isso só se confere na inspeção do código e nos testes do TSE. → [tópico 7](07-limites-da-pericia.md)
- **O que aconteceu entre a urna e a totalização** além do que as assinaturas cobrem: os registros de transmissão não são públicos. → [tópico 7](07-limites-da-pericia.md)
- **Em quem votou o eleitor liberado sem digital.** O voto é secreto; só dá para cercá-lo por cima e por baixo. → [tópico 4](04-liberacao-dos-eleitores.md)
- **Que não houve fraude.** "O teste não achou" quer dizer que não apareceu o rastro que aquele teste procura. Fraude pequena, espalhada por igual, concentrada em poucas seções ou igual nos dois turnos pode passar pelos testes. → [tópico 7](07-limites-da-pericia.md)

## Pendências e perguntas ao TSE

**Pendente:** demais campos do 2º turno contra o resultado oficial ([tópico 5](05-soma-dos-boletins.md)); se a ordem de registro dos boletins dependeu do voto ([tópico 3](03-linha-do-tempo.md)); as hipóteses H15 a H25, registradas depois, cujos testes ainda não passaram pela revisão ([registro](../hipoteses.md)).

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
| H08 | Votos rápidos demais para uma pessoa | aberta | [tópico 3](03-linha-do-tempo.md) |
| H09 | Arquivos públicos permitem saber em quem alguém votou | aberta | [tópico 12](12-sigilo-do-voto.md) |
| H10 | O vencedor cresceu mais do que havia de votos | **refutada** | [tópico 8](08-virada-do-2-turno.md) |
| H11 | Mesmo cartão em várias urnas, ou resultado trocado no caminho | em teste | [tópico 2](02-coerencia-entre-arquivos.md) |
| H12 | O QR do título digital pode ser forjado para votar sem digital | aberta | [tópico 10](10-quadro-das-hipoteses.md) |
| H13 | Liberação sem digital ligada a voto no 13 no Nordeste | em teste | [tópico 4](04-liberacao-dos-eleitores.md) |
| H14 | Urnas trocadas por reserva manipuladas | em teste | [tópico 11](11-urnas-reserva.md) |
| H15 a H25 | Registradas depois | **Pendente** | [registro](../hipoteses.md) |
