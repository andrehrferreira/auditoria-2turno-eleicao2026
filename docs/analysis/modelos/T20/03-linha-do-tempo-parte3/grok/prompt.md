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

## Tópico em revisão: 03-linha-do-tempo.md (parte 3 de 3)

## Limites

- **Exterior fora dos testes de horário.** As 1.310 seções do exterior não entram porque falta a tabela de fuso por país. No relógio local, o exterior teve 417 votos depois das 17h, em 252 seções. **Fato.**
- **Erro de leitura em 3 seções.** O programa desta auditoria junta no mesmo diário cópias repetidas da urna original (2 seções) e o diário de outra seção que veio no mesmo pacote (1 seção). Afeta 3 seções no 2º turno e não afeta o boletim. **Pendente:** correção em `src/perfil-secoes.js` e nova leitura de todos os diários.
- **Ciclos com 2 cargos.** Não medidos no universo completo (item 5).
- **Contagens de votos tardios.** Uma contagem da coordenação (`scripts/h06-votos-apos-17h.mjs`) dá 34.066 votos depois das 17h e 1.960 depois das 18h no 2º turno. A diferença para 34.330 está explicada: aquela conta usa só seções cujo boletim saiu da urna da própria seção e inclui o exterior pelo relógio local. Sem o exterior, ela dá 33.668; os 662 votos que faltam para 34.330 estão em seções cujo boletim saiu de urna de reserva. **Fato.**
- **Sigilo do voto.** Não dá para saber em quem votou o eleitor tardio, só comparar seções.
- **Hora de envio do boletim (item 12).** Os arquivos públicos têm a hora de emissão, de registro e de totalização, mas não a hora em que o boletim saiu da seção ou do ponto de transmissão. **Fato.**
- **Relógio de urnas de MT no 1º turno.** O revisor do item 12 achou sinais de que, no 1º turno, o relógio das urnas de três municípios de MT (90069, 90905 e 90921) estava na hora de Brasília, e não na local ([parecer 28](../analysis/cetico-revisor/28-chegada-dos-bus.md), item 7). **Fato (corrigido em 30/10/2026):** em 81 seções do 1º turno o operador digitou a hora de Brasília ao preparar a urna, e o relógio dela ficou 1 hora adiantado (MT 90069, 90905 e 90921, zona 0053; AM 02615/0005, seções 0119 e 0120; RS 88994/0131/0008). As contas dos itens 6 e 7 já usam a hora certa dessas seções ([linha do tempo 07](../analysis/linha-do-tempo/07-fuso-mt-1turno.md)). Nelas, a trava de abertura da urna usou o relógio adiantado, e 3 votos foram dados antes das 8h de Brasília. A trava é um controle técnico, mas a hora que ela usa é digitada por uma pessoa.

## Como repetir

```
node scripts/auditoria/verifica-pericia-linha-do-tempo.mjs       # todos os números deste tópico, do universo completo
node scripts/auditoria/verifica-pericia-linha-do-tempo-bruto.mjs --turno 2 --secao uf/municipio/zona/secao [--filtro re] [--de hh:mm --ate hh:mm]   # confere um caso no diário original
```

Item 12 (chegada dos boletins ao TSE):

```
node --max-old-space-size=4096 scripts/auditoria/grafico-chegada-bu-dados.mjs   # reconta seção a seção, confere com o autor e o revisor, grava os CSVs
node scripts/auditoria/grafico-chegada-bu.mjs                                   # gera os dois gráficos
node scripts/auditoria/estatistico-chegada-bu-aux.mjs                           # autor: lê os aux.json
node --max-old-space-size=8192 scripts/auditoria/estatistico-chegada-bu-dados.mjs   # autor: arquivo por seção (secoes.csv)
node --max-old-space-size=8192 scripts/auditoria/estatistico-chegada-bu.mjs         # autor: contagens por minuto e resumo
node --max-old-space-size=8192 scripts/auditoria/cetico-chegada-bu.mjs --replicas 200   # revisor (parecer 28)
```

A saída fica em `data/parsed/auditoria/verifica-pericia/linha-do-tempo.json`; a do item 12, em `docs/pericia/graficos/dados/chegada-bu-*.csv`. As análises originais do auditor de linha do tempo estão em `docs/analysis/linha-do-tempo/01` a `05` e em `scripts/auditoria/tempo-*.mjs`.

## Próximos passos

- **Pendente:** revisão cética dos itens 1 a 11 deste tópico (`docs/analysis/cetico-revisor/`). O item 12 já tem (parecer 28).
- **Pendente (item 12):** pedir ao TSE os registros de transmissão e da fila de recepção (hora de chegada e hora de registro de cada boletim, e a regra de atendimento), o ato que suspendeu o registro depois da decisão do STF e o histórico dos arquivos de resultado publicados durante a apuração.
- **Pendente:** refazer, no universo completo, as medidas que dependem de reler cada diário: religamentos por causa e tempo parado, votos depois do "SIM", cancelamentos de encerramento, votos depois de pausa e forma de liberação dos votos tardios.
- **Pendente:** conferir a versão assinada da decisão judicial no portal do STF e o ato do TSE ou dos TREs que estenderam o horário até 19h, com a lista de locais, e cruzar com os 313 locais inteiros e os 818 mistos.
- **Pendente:** repetir a linha do tempo completa no 1º turno.
- **Feito** ([parecer 24](../analysis/cetico-revisor/24-integridade-h04-h11.md)): os lacres das 5 urnas carregadas no dia da eleição e das 20 de Volta Redonda conferem; estão entre os 499.207 pacotes do 2º turno, com 0 falha.
- **Pendente:** corrigir a leitura dos diários e repetir as contas.
- **Pendente:** cruzar os votos tardios sem digital com o mesário que liberou e com as rajadas de liberação (tópico 4).
- **Pendente:** tabela de fuso do exterior, para incluir as 1.310 seções.
- **Pendente:** atas da seção 0063 de Ipixuna-AM nos dois turnos e da zona 0090 de Volta Redonda-RJ.
