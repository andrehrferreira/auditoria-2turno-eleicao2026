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

## Tópico em revisão: 12-sigilo-do-voto.md (parte 2 de 2)

## Pendentes (sem número)

- **Dono dos números da suspensão** ("inválido" e "válido"): perguntas ao TSE (item 5).
- **Quantos atendimentos terminam em voto nulo por suspensão com um desses números:** fora do relatório até a confirmação do dono (parecer 29).
- **Sequências com dígito verificador de CPF na mensagem de encerramento:** não conferidas.
- **Ordem das cédulas de MG:** se a ordem de digitação reflete a ordem de votação.
- **Voto nulo com número próprio:** o RDV publica o número digitado em todo voto nulo. Um eleitor pode anular com um número combinado e alguém conferir depois no arquivo da seção. O tamanho desse canal foi medido pelo engenheiro e não foi revisado pelo cético.
- **Características do eleitor no diário** (por exemplo, áudio ativado por cadastro de deficiência visual, preso provisório, militar em serviço): só identificam alguém se combinadas com um número de título na mesma sessão. Contagem não revisada.
- **Busca do número de título em formas codificadas:** feita só no ES, 2º turno, a pedido do próprio titular, e ainda não refeita de forma independente ([tópico 7](07-limites-da-pericia.md)).

## Recomendação ao TSE

Não gravar no diário o número digitado na suspensão nem no encerramento. Gravar só o resultado (aceito ou recusado) e o papel de quem autorizou. E ordenar também as listas de cédula do Sistema de Apuração (parecer 29, Recomendações).

## Como repetir

```
# leitura dos dois turnos (engenheiro de segurança, doc 05): ~40 min por turno
node scripts/auditoria/seguranca-h09-sigilo.mjs --turno 2 --procs 6
node scripts/auditoria/seguranca-h09-sigilo.mjs --turno 1 --procs 6

# revisão cética (parecer 29): os dois turnos juntos, 46 min; cédulas de MG; conferência rápida no AC
node scripts/auditoria/cetico-h09-sigilo.mjs --turnos 1,2 --procs 4
node scripts/auditoria/cetico-h09-cedula.mjs
node scripts/auditoria/cetico-h09-sigilo.mjs --turnos 1,2 --uf ac

# tabelas e gráficos deste tópico (confere cada número contra as saídas acima e o banco; ~5 min)
node --max-old-space-size=4096 scripts/auditoria/grafico-h09-dados.mjs
node scripts/auditoria/grafico-h09.mjs
```

Saídas em `data/parsed/auditoria/engenheiro-seguranca-urna/h09/` e `data/parsed/auditoria/cetico-revisor/h09/`, só com contagens. Nenhum número de título ou de CPF é gravado, e o script deste tópico se recusa a gravar um CSV com sequência de 10 ou mais dígitos.

## Próximos passos

- [x] Ordem do RDV, cédulas de MG, seções unânimes e números no diário, nos dois turnos, com revisão cética ([parecer 29](../analysis/cetico-revisor/29-h09-sigilo.md)).
- [ ] **Pendente.** Enviar ao TSE as três perguntas do item 5 sobre a suspensão.
- [ ] **Pendente.** Revisão cética do canal do voto nulo com número próprio e das características do eleitor no diário.
- [ ] **Pendente.** Conferir as sequências com dígito verificador de CPF na mensagem de encerramento.
- [ ] **Pendente.** Pedir ao TSE a norma de digitação das cédulas no Sistema de Apuração.
