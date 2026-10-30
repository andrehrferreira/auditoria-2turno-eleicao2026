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

## Tópico em revisão: 10-quadro-das-hipoteses.md (parte 3 de 3)

## Testes revisados que não têm número de hipótese

- **Eleitores acima da população ([parecer 04](../analysis/cetico-revisor/04-eleitorado-acima-populacao.md), sustentado com ressalvas). Fato (revisado):** em 2.898 dos 5.570 municípios (52%) o cadastro tem mais eleitores de 16+ do que o Censo 2022 tem moradores de 12+. Isso se concentra em municípios pequenos. No 2º turno, em 120 municípios votou mais gente do que a população total contada em 2022. Os títulos a mais **votam** (em 120 municípios votou mais gente do que a população total; a parcela desses títulos que comparece é estimada por modelo e fica fora deste relatório), com a mesma parcela de digital da UF, o que indica pessoas reais com domicílio eleitoral fora de onde moram, e não títulos fantasmas em massa. **Risco (princípio 8):** a conferência do domicílio é feita por pessoas; os dados não separam mudança de cidade com título mantido, vínculo legítimo e transferência irregular. Para Presidente, o local do voto não muda o total nacional; o risco recai sobre eleições municipais e estaduais.
- **Concentração de votos em seções (forense estatística): Pendente: em verificação.** O achado sobre seções com votação muito concentrada num candidato ([forense 07](../analysis/forense-estatistica/07-assimetria-e-sintese.md)) ainda não foi refeito nem revisado, e por isso nenhum número dele entra aqui.

## Limites deste quadro

- O status de cada hipótese é o do registro em 29/10/2026 e pode mudar com novos testes.
- Os resultados cujas fontes usaram só parte do 1º turno (feitas antes da carga completa) estão como **Pendente** e serão refeitos com os dois turnos completos.
- Os itens **recontados nesta verificação** ainda não têm parecer do revisor cético e podem mudar de alcance depois dele. Os itens **Pendente: em verificação** não têm número porque ainda não foram refeitos.
- Nenhum teste aqui olha para o programa da urna por dentro. Isso depende do Teste de Integridade e da conferência das assinaturas, tratados nos tópicos 1 e 8.

## Como repetir

Cada parecer do revisor cético traz, no fim, os comandos que refazem as contas. Os principais:

```
node scripts/auditoria/cetico-centenarios-excesso-consolidacao.mjs        # H01, excesso no cadastro
node scripts/auditoria/cetico-centenarios-nao-votam-oficial.mjs           # H01, comparecimento oficial dos 100+
node scripts/auditoria/cetico-b1a-definicoes.mjs --turno 2                # H02, excesso sobre o cadastro
node --max-old-space-size=4096 scripts/auditoria/cetico-h10-consolidacao.mjs   # H10 e H03 do 1º turno
node --max-old-space-size=8000 scripts/auditoria/matematico-h03-1turno.mjs        # H03 do 1º turno, todos os cargos (109 totais e nulo técnico)
node --max-old-space-size=8000 scripts/auditoria/cetico-h03-1turno.mjs            # H03 do 1º turno, conferência do parecer 26
node --max-old-space-size=6144 scripts/auditoria/cetico-h05-28ufs.mjs 20               # H05, divisão do voto a mais, 28 UFs (parecer 27)
node --max-old-space-size=6144 scripts/auditoria/cetico-h05-28ufs-covariaveis.mjs       # H05, o resultado com cada característica da seção (parecer 27)
node scripts/auditoria/cetico-a7-reproducao.mjs                           # H05, comparecimento alto
node scripts/auditoria/cetico-vsl-consolidacao.mjs                        # H03, votos sem rastro no diário (parecer 08)
node scripts/auditoria/cetico-vsr25-universo.mjs --turno 2 --procs 2      # H03 e H08, votos sem rastro no diário, dois turnos (parecer 25; e --turno 1)
node scripts/auditoria/cetico-eleitorado-acima-populacao-consolidacao.mjs # eleitores acima da população
node scripts/auditoria/cetico-integridade-recontagem.mjs --turno 2        # H04 e H11, 2º turno
node scripts/auditoria/cetico-integridade-recontagem.mjs --turno 1 --dir data/parsed/auditoria/integridade/1t-identificadores   # H11, 1º turno
node scripts/auditoria/cetico-integridade-controle.mjs                    # H04, adulteração de propósito
node scripts/auditoria/cetico-integridade-casos.mjs                       # H04 (162 e 842 seções) e H11 (Recuperador de Dados)
node scripts/auditoria/cetico-integridade-boot-do-erro.mjs --turno 2      # H04, nenhum voto na inicialização do erro
node scripts/auditoria/cetico-integridade-trocas-modelo.mjs               # H11, troca de urna por modelo
node --max-old-space-size=8192 scripts/auditoria/cetico-chegada-bu.mjs --replicas 200   # H06, chegada dos boletins ao TSE (parecer 28)
node --max-old-space-size=4096 scripts/auditoria/grafico-chegada-bu-dados.mjs          # H06, recontagem por seção e dados dos gráficos (tópico 3, item 12)
node --max-old-space-size=8192 scripts/auditoria/cetico-h14-votos.mjs                  # H14, teste de nível, outra zona e escala (parecer 30)
node --max-old-space-size=4096 scripts/auditoria/grafico-h14-dados.mjs                 # H14, confere os números do tópico 11 e grava os dados dos gráficos
```

Os comandos da varredura completa de lacres, autoverificação e números de série estão nos tópicos [1](01-integridade-e-estrutura-dos-arquivos.md) e [2](02-coerencia-entre-arquivos.md).

A conferência deste tópico (cópia de leitura do banco e perfis por seção dos dois turnos; H03 Presidente do 2º turno, H05 aumento de comparecimento, H06, H07 e H08; a parte de H11 que ela imprime é só do Acre e foi substituída pelo país inteiro, acima) e a das assinaturas em seções de exemplo (AC, ES e os sete arquivos de H09):

```
node --max-old-space-size=8192 scripts/auditoria/verifica-pericia-quadro.mjs
node src/lacres.js data/raw/2t/urnas/ac
node src/lacres.js data/raw/2t/urnas/es/57037/0055/0372
node src/lacres.js data/raw/2t/urnas/es/57037/0055/0364
node --max-old-space-size=8192 scripts/auditoria/verifica-pericia-coerencia-topicos.mjs --turno 1   # H03, 1º turno completo
unzip -Z1 data/raw/2t/zip/<pacote da UF>.zip | grep -E "(jufa\.dat|imgze\.dat|-hash\.dat|mr\.ver|wsq(bio|man|mes)\.jez)$"
```

## Próximos passos

- **Pendente:** revisão cética de H03 (demais campos do 2º turno), H04 do 1º turno, H06 (votos depois das 17h; a apuração já tem o parecer 28), H07, H08 e H12. H09 tem o parecer 29; falta a resposta do TSE sobre a suspensão.
- **Pendente:** refazer os itens marcados **Pendente: em verificação**.
- **Pendente:** refazer com o 1º turno completo os números marcados como parciais.
- ~~Pendente: conferência das assinaturas do 1º turno~~ — feita em 30/10/2026: 499.207 pacotes, 0 falha de arquivo (tópico 1).
- **Pendente:** H13 com a liberação contada no log (mesário identificado), depois que os perfis dos logs forem regerados.
- **Pendente:** pedidos pela Lei de Acesso à Informação: critério de "com biometria" no cadastro e número de eleitores com digital carregada por seção (H02), comparecimento dos 100+ no 2º turno e cancelamentos por óbito (H01).
