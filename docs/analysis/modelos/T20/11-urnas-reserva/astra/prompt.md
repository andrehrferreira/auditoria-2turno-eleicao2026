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

## Tópico em revisão: 11-urnas-reserva.md

# 11. Urnas trocadas por reserva no 2º turno

> **Situação:** escrito em 30/10/2026 a partir do [parecer cético 30](../analysis/cetico-revisor/30-h14-urnas-reserva.md) (sustentado com ressalvas), que revisou as duas metades do teste: os votos ([estatístico eleitoral, doc 07](../analysis/estatistico-eleitoral/07-urnas-reserva-1t-2t.md)) e o rastro técnico ([engenheiro de segurança, doc 06](../analysis/engenheiro-seguranca-urna/06-h14-rastro-das-reservas.md)). O texto usa as "afirmações revisadas" do parecer. Os números foram conferidos de novo, contra as saídas dos autores, do revisor e do banco, por `scripts/auditoria/grafico-h14-dados.mjs` (ver "Como repetir"). É a hipótese H14 do [quadro das hipóteses](10-quadro-das-hipoteses.md).

## A pergunta

Pedido do auditor (29/10/2026): as urnas trocadas por urna reserva no 2º turno podem ter sido manipuladas? Para responder, compara-se cada seção que votou com reserva no 2º turno com **ela mesma** no 1º turno, e com as seções vizinhas que não trocaram de urna, para ver se aparece algum padrão fora do normal.

## Resposta curta

- **Fato:** no 2º turno, **5.714 seções** votaram com urna reserva. Em **2.818** a reserva era uma urna diferente da que a seção usou no 1º turno (troca nova). Em **2.893** a reserva já tinha sido usada pela seção no 1º turno e ficou para o 2º (reserva herdada). Em 3, a própria urna da seção foi recarregada como reserva.
- **Fato (votos, 2.818 trocas novas):** do 1º para o 2º turno, essas seções mudaram do mesmo jeito que as seções sem troca da mesma zona: no comparecimento, na parcela do 13 entre os votos do 13 e do 22, e em brancos + nulos. Na parcela do 13, a diferença foi de −0,05 ponto percentual, com intervalo de 95% de −0,12 a +0,03. Em votos: 335 a menos para o 13, com intervalo de 860 a menos a 190 a mais, num total de 708.479 votos em 13 + 22 nessas seções.
- **Fato (votos, 2.893 reservas herdadas):** no 2º turno, a parcela do 13 nelas foi igual à das outras seções do mesmo local de votação: −0,06 ponto, intervalo de −0,21 a +0,09. O comparecimento foi igual ao das vizinhas no 2º turno e 0,75 ponto menor no 1º.
- **Fato (escala):** nas 5.714 seções com reserva, o 13 teve **742.671 votos**. A diferença oficial entre os dois candidatos foi de 4.430.191 votos. Mesmo que todos esses 742.671 votos tivessem sido tirados do 22, o 13 ainda venceria por **2.944.849**. Isso limita o tamanho do que a troca de urnas poderia ter feito; não prova que nada foi feito.
- **Fato (rastro técnico):** no diário da urna reserva das 2.818 seções não aparece nenhum dos sinais que uma adulteração **sem a assinatura do TSE**, ou uma verificação de assinatura pulada, deixaria: 0 inicialização para votar com etapa de verificação falhada, 0 pacote com lacre quebrado, a mesma versão de programa do resto do país, e mensagens de erro de assinatura na mesma taxa das urnas comuns.
- **Fato (Aracaju):** a concentração de trocas nas zonas 1 e 2 de Aracaju (SE) aparece no diário das reservas como uma troca de urnas entre as duas zonas, registrada em 17/10 e 19/10.
- **Fato (lacuna de controle):** em 125 das trocas novas, a reserva tinha sido carregada para outra zona da mesma UF. A urna aceitou a troca e registrou a zona da carga. É uma lacuna de **bloqueio** (a urna não impede), não de **rastro** (fica registrado no diário e no boletim).
- **Não se pode afirmar:** que nenhuma reserva tinha programa adulterado **com** a assinatura oficial do TSE, porque um programa assim escreve um diário normal. Também não se pode afirmar que a mesa não liberou votos de ausentes em ritmo normal, porque isso deixa o mesmo rastro de uma votação legítima, com ou sem troca de urna.

## Termos usados neste tópico

- **Urna reserva (ou de contingência):** urna preparada para substituir a urna da seção quando ela falha. Ela recebe o cartão de votos (mídia de votação) da urna original e continua a votação. A troca pode ser feita no dia da votação ou antes dele, por exemplo entre os turnos. O procedimento de troca se chama **contingência** e fica anotado no diário da reserva.
- **Troca nova:** a seção votou no 2º turno com uma reserva que não é a urna que ela usou no 1º turno.
- **Reserva herdada:** a seção já tinha passado para a reserva no 1º turno (ou entre a véspera e o 1º turno), e a mesma reserva continuou no 2º.
- **Ponto percentual (p.p. ou "ponto"):** a diferença entre duas porcentagens. De 48% para 51% são 3 pontos.
- **Parcela do 13:** votos do 13 divididos pelos votos do 13 mais os do 22, em porcentagem. Brancos, nulos e os demais candidatos do 1º turno ficam fora da conta, para comparar os dois turnos na mesma régua.
- **Diferença-em-diferenças:** a forma de comparar "antes e depois" com um grupo de referência. Exemplo do dia a dia: para saber se um adubo fez uma planta crescer, não basta medir a planta depois. Mede-se antes e depois, e compara-se o quanto ela cresceu com o quanto cresceram as plantas do mesmo canteiro que não receberam o adubo. Se cresceram o mesmo tanto, o adubo não fez diferença. Aqui, a "planta adubada" é a seção que trocou de urna, o "canteiro" é a zona eleitoral, e o crescimento é a mudança do 1º para o 2º turno.
- **Intervalo de 95%:** a faixa de valores compatível com os dados. Se a faixa contém o zero, os dados não distinguem a diferença medida de diferença nenhuma.
- **Correção para muitos testes:** quem faz muitos testes ao mesmo tempo acaba achando alguns resultados "raros" só por acaso, como quem joga a moeda cem vezes e vê sequências de cinco caras. A correção exige mais de cada teste, na proporção de quantos foram feitos.

## Como foi feito

Duas frentes, revisadas pelo cético no parecer 30. Fonte dos votos: o boletim de urna (BU) de Presidente de cada seção, nos dois turnos, na cópia de leitura do banco de 29/10/2026. A soma dos boletins é igual ao resultado oficial nos dois turnos ([tópico 5](05-soma-dos-boletins.md)). Fonte do rastro: o diário (log) de todas as urnas do 2º turno, incluindo o diário da urna substituída que vem dentro do pacote da reserva, e os lacres ([tópico 1](01-integridade-e-estrutura-dos-arquivos.md)).

**Universo (Fato):** 499.176 seções têm boletim de urna nos dois turnos. Ficam fora 72: 41 do exterior sem arquivo (seções não instaladas) e 31 do Sistema de Apuração (cédula de papel). Nenhuma seção do universo mudou de local de votação nem foi agregada a outra entre os turnos ([doc 07](../analysis/estatistico-eleitoral/07-urnas-reserva-1t-2t.md), "Dados e universo").

**Grupos (Fato).** O tipo de troca sai do boletim (tipo e número da urna nos dois turnos):

| Grupo | O que é | Seções |
|---|---|---:|
| Sem troca (referência) | a mesma urna de seção nos dois turnos | 491.843 |
| **Troca nova por reserva** | no 2º turno, uma reserva diferente da urna do 1º turno | **2.818** |
| **Reserva herdada** | a mesma reserva nos dois turnos | **2.893** |
| Outra urna de seção | urna de seção nos dois turnos, mas outra urna, sem contingência no boletim | 1.562 |
| Reserva no 1º turno, urna de seção no 2º | outra urna | 44 |
| Mesma urna, recarregada com outro tipo | 3 delas votaram como reserva no 2º turno | 16 |

As 5.714 seções com reserva no 2º turno são as 2.818 trocas novas, as 2.893 herdadas e as 3 da mesma urna recarregada.

**Quando a troca nova foi feita (Fato, pela data da contingência gravada no diário da reserva).** É a definição que o parecer 30 recomenda, porque tem rastro direto:

- **848** entre os turnos (antes de 25/10);
- **1.968** no dia do 2º turno. Em 1.423 delas a urna original já tinha recebido votos antes da troca (155.894 votos);
- **2** sem registro de contingência no diário da reserva.

A outra forma de dividir, pela atividade da urna original no dia 25/10, classifica 133 seções de outro jeito (trocas feitas na madrugada ou na manhã de 25/10 em que a urna original não ligou nesse dia). O total de 2.818 é o mesmo, e o resultado dos votos não muda com nenhuma das duas definições (parecer 30, item A).

**Teste 1, votos das trocas novas.** Diferença-em-diferenças: para cada seção, o valor do 2º turno menos o do 1º, comparado com o das seções sem troca da mesma zona. A comparação leva em conta o modelo da urna do 1º turno e o tamanho da seção, e cada seção pesa pelo seu número de votos. Três medidas, escolhidas antes de rodar: comparecimento, parcela do 13 e brancos + nulos. A mesma conta foi refeita sorteando ao acaso, 5.000 vezes, quais seções de cada zona "trocaram", sem supor nenhuma forma para a distribuição dos dados: o resultado foi o mesmo. Depois, a mesma conta por UF, por modelo de urna, por zona e por seção, com correção para muitos testes.

**Teste 2, votos das reservas herdadas.** A diferença-em-diferenças tem um ponto cego: se a mesma urna tivesse o mesmo desvio nos dois turnos, o desvio sumiria na subtração. É exatamente o caso das herdadas. Por isso o revisor fez outro teste: o **nível** de cada turno (não a variação) contra as outras seções do **mesmo local de votação**, que votam no mesmo prédio. Entram 2.730 das 2.893 herdadas; as outras 163 estão em locais sem outra seção.

**Teste 3, rastro técnico.** Cada sinal que uma adulteração deixaria nos arquivos públicos (lista abaixo) virou uma marca sim/não por seção, comparada entre as trocas novas, as seções sem troca e as reservas herdadas. As herdadas servem de régua para "ser reserva": uma reserva é carregada de um jeito diferente da urna de seção, e o que aparece nelas também é efeito do procedimento normal, não da troca do 2º turno. Neste teste, o grupo sem troca tem 491.489 seções: além da mesma urna, exige o mesmo código de carga nos dois turnos, o que tira 354 urnas recarregadas.

## O que foi encontrado

### 1. Votos da mesma seção, 1º × 2º turno, por grupo (Fato)

Presidente, soma do boletim de cada grupo. As somas foram refeitas seção a seção e batem com a tabela do estatístico em todos os campos e grupos.

**2º turno**

| Grupo | Seções | Aptos | Comparecimento | 13 | 22 | Brancos | Nulos |
|---|---:|---:|---:|---:|---:|---:|---:|
| Sem troca | 491.843 | 156.386.425 | 126.338.167 | 63.301.298 | 58.943.764 | 1.409.528 | 2.683.577 |
| **Troca nova por reserva** | **2.818** | **908.707** | **731.639** | **364.860** | **343.619** | **7.850** | **15.310** |
| **Reserva herdada** | **2.893** | **936.738** | **751.414** | **377.364** | **350.380** | **8.348** | **15.322** |
| Outra urna de seção | 1.562 | 489.796 | 396.677 | 201.623 | 181.799 | 4.571 | 8.684 |
| Reserva no 1º turno, urna de seção no 2º | 44 | 14.740 | 12.132 | 7.552 | 4.200 | 122 | 258 |
| Mesma urna, recarregada com outro tipo | 16 | 5.739 | 4.554 | 2.765 | 1.613 | 55 | 121 |

**1º turno (as mesmas seções)**

| Grupo | Aptos | Comparecimento | 13 | 22 | Demais candidatos | Brancos | Nulos |
|---|---:|---:|---:|---:|---:|---:|---:|
| Sem troca | 156.386.464 | 123.432.688 | 53.082.245 | 55.280.063 | 9.186.841 | 2.267.587 | 3.615.952 |
| **Troca nova por reserva** | **908.732** | **714.103** | **306.323** | **322.306** | **52.551** | **12.684** | **20.239** |
| **Reserva herdada** | **936.724** | **724.781** | **312.791** | **325.348** | **53.112** | **12.897** | **20.633** |
| Outra urna de seção | 489.746 | 387.328 | 169.064 | 170.882 | 28.407 | 7.344 | 11.631 |
| Reserva no 1º turno, urna de seção no 2º | 14.740 | 11.443 | 6.302 | 3.917 | 678 | 189 | 357 |
| Mesma urna, recarregada com outro tipo | 5.740 | 4.144 | 2.189 | 1.435 | 293 | 76 | 151 |

**Porcentagens, 1º → 2º turno**

| Grupo | Comparecimento | Parcela do 13 | Brancos + nulos (do comparecimento) |
|---|---|---|---|
| Sem troca | 78,93% → 80,79% | 48,99% → 51,78% | 4,77% → 3,24% |
| **Troca nova por reserva** | **78,58% → 80,51%** | **48,73% → 51,50%** | **4,61% → 3,17%** |
| **Reserva herdada** | **77,37% → 80,22%** | **49,02% → 51,85%** | **4,63% → 3,15%** |
| Outra urna de seção | 79,09% → 80,99% | 49,73% → 52,59% | 4,90% → 3,34% |
| Reserva no 1º turno, urna de seção no 2º | 77,63% → 82,31% | 61,67% → 64,26% | 4,77% → 3,13% |
| Mesma urna, recarregada com outro tipo | 72,20% → 79,35% | 60,40% → 63,16% | 5,48% → 3,86% |

![Parcela do 13 nos votos do 13 e do 22, no 1º e no 2º turno, por grupo de seções](graficos/h14-parcela-13-1t-2t.svg)

**Como ler:** cada linha é um grupo de seções. O ponto azul é a parcela do 13 no 1º turno; o laranja, no 2º turno, nas mesmas seções. O que importa é o comprimento da linha entre os dois pontos, escrito à direita: quanto o 13 cresceu. Os três grupos começam em lugares diferentes, porque as seções que trocaram de urna ficam em lugares de perfil um pouco diferente, mas crescem quase o mesmo tanto (2,80 pontos sem troca, 2,77 na troca nova e 2,84 na herdada). O gráfico mostra a soma de cada grupo; o teste compara cada seção com a sua própria zona, e por isso o número do teste (abaixo) não é exatamente a distância entre as linhas do gráfico. Dados: [graficos/dados/h14-parcela-13-1t-2t.csv](graficos/dados/h14-parcela-13-1t-2t.csv) e, com todas as colunas das tabelas acima, [h14-votos-por-grupo.csv](graficos/dados/h14-votos-por-grupo.csv).

### 2. O teste das trocas novas: mudaram como as vizinhas (Fato)

**Fato (parecer 30, afirmação revisada 1):** comparadas com as seções sem troca da mesma zona, as 2.818 seções com troca nova mudaram do 1º para o 2º turno do mesmo jeito no comparecimento, na parcela do 13 e em brancos + nulos.

- **Parcela do 13:** −0,05 ponto percentual, intervalo de 95% de −0,12 a +0,03. Em votos: 335 a menos para o 13, com intervalo de 860 a menos a 190 a mais, num total de 708.479 votos em 13 + 22 nessas seções. O sinal é contra o 13 (ele cresceu um pouco menos nas trocadas), e o intervalo contém o zero.
- **Comparecimento e brancos + nulos:** os intervalos também contêm o zero, e nenhum passa na correção para os três testes.
- **Fato (parecer 30, V1 e V3):** o revisor refez a conta numa cópia isolada e obteve o mesmo resultado, também pelo sorteio. Nenhuma UF (28, contando o exterior), nenhum modelo de urna, nenhuma zona e nenhuma seção com troca fica fora do esperado depois da correção para muitos testes. Isso vale também para as duas zonas de Aracaju (item 5).
- **Fato (parecer 30, V8):** as 57 seções citadas como as mais fora da curva foram conferidas no boletim original dos dois turnos: 0 divergência com o banco.
- **Pendente (sem número):** o tamanho mínimo de desvio que este teste enxergaria é uma estimativa e fica em [doc 07](../analysis/estatistico-eleitoral/07-urnas-reserva-1t-2t.md). Abaixo desse tamanho, o resultado é "não detectado", não "provado ausente".

### 3. As reservas herdadas: igual às vizinhas do mesmo local (Fato)

**Fato (parecer 30, afirmação revisada 2):** 2.893 seções usaram nos dois turnos a mesma urna reserva.

- No 2º turno, a parcela do 13 nelas foi igual à das outras seções do mesmo local de votação: −0,06 ponto, intervalo de −0,21 a +0,09.
- O comparecimento delas foi igual ao das vizinhas no 2º turno e **0,75 ponto menor no 1º turno**.

O que isso quer dizer: a mesma reserva, nos dois turnos, não deu ao 13 uma parcela diferente da das urnas do mesmo prédio. Na comparação de variação (teste 1), o comparecimento das herdadas subiu mais que o da zona. O teste do nível mostra por quê: no 1º turno, essas seções tiveram menos eleitores que as vizinhas; no 2º turno, ficaram iguais. Não há eleitor a mais no 2º turno (parecer 30, V4).

- **Hipótese:** a falha de urna no dia do 1º turno causou fila ou interrupção e fez parte dos eleitores desistir naquele dia.
- **Pendente (sem número):** a causa da queda de comparecimento no 1º turno. Falta a varredura dos diários do 1º turno, com a hora e a duração de cada falha.
- **Pendente (sem número):** brancos + nulos das herdadas no 1º turno ficam um pouco abaixo dos das vizinhas no limite da correção; o parecer marca o ponto como exploratório, fora deste relatório. Não envolve a divisão entre 13 e 22.

### 4. A escala: o máximo que essas urnas poderiam ter mudado (Fato aritmético)

| | Votos |
|---|---:|
| Seções que votaram com urna reserva no 2º turno | 5.714 seções |
| Votos do 13 nessas seções | 742.671 |
| Votos do 22 nessas seções | 694.314 |
| Votos do 13 no Brasil, 2º turno (resultado oficial) | 64.256.232 |
| Votos do 22 no Brasil, 2º turno (resultado oficial) | 59.826.041 |
| Diferença oficial | 4.430.191 |
| Diferença no pior caso: todos os 742.671 votos do 13 nessas seções seriam, na verdade, do 22 | **2.944.849** |

A conta do pior caso: cada voto que passa do 13 para o 22 tira 1 voto de um e dá 1 ao outro, e por isso a diferença cai 2 votos. 4.430.191 − 2 × 742.671 = 4.430.191 − 1.485.342 = 2.944.849. Os votos das 5.714 seções foram somados do boletim de cada seção, e os totais do Brasil vêm do resultado oficial (tabela `voto_oficial` da cópia de leitura).

- **Pode-se afirmar:** a troca de urnas por reserva, sozinha, não poderia ter decidido a eleição de Presidente, mesmo no caso extremo de todos os votos do 13 nessas urnas serem falsos.
- **Não se pode afirmar:** que nenhum voto dessas urnas foi manipulado. A conta limita o tamanho possível do efeito; não diz que ele é zero.

### 5. Aracaju: a troca entre as zonas 1 e 2 está no diário (Fato)

O [tópico 2](02-coerencia-entre-arquivos.md) registra que as zonas 1 e 2 de Aracaju (SE 31054) concentram trocas de urna. O diário das reservas mostra como elas foram feitas (parecer 30, R4, conferido no arquivo original):

- **Zona 0001, 17/10/2026:** 10 contingências na mesma tarde, entre 13:01 e 16:22. As reservas tinham sido carregadas em 28/09 como reservas da **zona 0002**, por um mesmo computador de preparação.
- **Zona 0002, 19/10/2026:** 10 contingências; 9 dessas reservas foram carregadas naquele mesmo dia, como reservas da zona 0002.
- No 2º turno, 16 seções da zona 0001 votaram com reserva carregada para a zona 0002 (10 com troca entre os turnos e 6 no dia).

Trecho do diário da reserva da seção SE 31054/0001/0130 (urna 01794072), conferido no arquivo original pelo revisor:

```
28/09/2026 09:47:22  Seção informada pelo operador: 0000 - Urna de contingência
28/09/2026 09:50:04  Zona Eleitoral: 0002
17/10/2026 14:14:22  Início do procedimento de contingência
17/10/2026 14:16:01  Serial da MV original da urna que está registrada na MI: 52FCA1D2
17/10/2026 14:16:09  Contingência executada com sucesso
17/10/2026 14:19:47  Zona Eleitoral: 0001
```

O boletim dessa seção no 2º turno é do tipo "reserva", urna 1794072: 266 votantes, 13 = 158, 22 = 90, brancos 4, nulos 14. O boletim impresso traz o histórico com os 3 códigos de carga.

- **Fato (votos, parecer 30, C1):** nas 16 seções da zona 0001 com reserva da zona 0002, a parcela do 13 foi de 60,38% para 63,48% (+3,10 pontos); nas seções sem troca da mesma zona, ela subiu 3,42 pontos. No teste por zona, nada passa nas duas zonas de Aracaju (parecer 30, V3).
- **Hipótese:** troca planejada de urnas entre as duas zonas na preparação do 2º turno, feita pelo procedimento de contingência.
- **Pendente:** o motivo das trocas. O diário mostra a troca, não a decisão. Pedir ao TRE-SE o registro das trocas de 17/10 e 19/10.

### 6. Reserva carregada para outra zona: lacuna de bloqueio, não de rastro (Fato)

A carga de cada urna grava, no diário, o município e a zona para os quais ela foi preparada. Uma reserva é carregada à parte, muitas vezes na sede da zona ou do cartório, e por isso o município gravado na carga pode ser outro. Isso é igual nas trocas novas e nas herdadas, o que mostra que é o jeito normal de carregar reserva. O que fica acima das herdadas é a **zona** gravada na carga:

| O que a carga da reserva gravou | Troca nova | Reserva herdada | Sem troca |
|---|---|---|---|
| Município diferente do da seção | 524 de 2.818 (18,59%) | 521 de 2.893 (18,01%) | 0 de 491.489 |
| Zona diferente da da seção | 125 de 2.818 (4,44%) | 45 de 2.893 (1,56%) | 0 de 491.489 |

![Para onde a reserva foi carregada: troca nova × reserva herdada](graficos/h14-carga-reserva.svg)

**Como ler:** cada par de barras mostra, para cada tipo de reserva, a parte das reservas cuja carga gravou um município (em cima) ou uma zona (embaixo) diferente da seção onde votaram. Barras do mesmo tamanho, como no município, querem dizer que a troca nova foi carregada como as reservas herdadas. Na zona, a troca nova fica acima. Dados: [graficos/dados/h14-carga-reserva.csv](graficos/dados/h14-carga-reserva.csv).

- **Fato (parecer 30, R3):** as 125 trocas novas com reserva de outra zona são 78 trocas feitas entre os turnos (9,2% das 848) e 47 feitas no dia (2,4% das 1.968). Somadas às 45 herdadas, são 170 seções. Todas são do mesmo estado da seção: nenhuma reserva veio de outra UF. Das 125, 89 receberam reserva de outra zona da mesma cidade e 36 de outro município. O maior bloco é o de Aracaju (item 5).
- **Fato (o que fica registrado):** depois de ler o cartão de votos da seção, a reserva passa a gravar a zona e a seção desse cartão. Em SE 31054/0001/0130, a zona 0002 passa a 0001 (trecho acima). Em AM 02550/0032/0848, "Seção Eleitoral: 0000" passa a "Seção Eleitoral: 0848". A zona da carga fica no diário, e o código de carga e o histórico de cargas ficam no boletim. Foi por esse rastro que a auditoria achou as 170.
- **Fato (a reserva de outra zona funcionou como reserva da própria zona):** nessas 125 reservas, 11,2% dos votos saíram sem digital (3.222 de 28.884). Nas mesmas seções, no 1º turno, com a urna original, foram 12,4% (4.120 de 33.287). Nas demais reservas das trocas novas, 15,3% (83.754 de 546.478). Nenhuma das 125 passou de 50% sem digital. Se a carga de outra zona não tivesse as digitais dos eleitores da seção, a liberação sem digital teria disparado, e não disparou.
- **Fato (votos, parecer 30, afirmação revisada 4):** os votos dessas 125 seções variaram como os da zona, sem diferença que resista à correção para muitos testes.
- **Hipótese:** o cadastro dos eleitores da seção chega à reserva pelo cartão de votos, ou a carga da reserva cobre mais que a zona. O diário não diz qual das duas.
- **Lacuna de controle (Fato nos 170 casos aceitos):** a contingência não **bloqueia** reserva carregada para outra zona; só a **registra**. Não se pode afirmar que "nada impede" a troca: uma tentativa recusada não deixaria pacote publicado, e por isso não se sabe, por exemplo, se a urna recusaria reserva de outro estado.
- **Risco (premissa 8):** quem decide usar uma reserva de outra zona é uma pessoa. O controle que conta é o rastro técnico, e ele existe.

### 7. O que o diário e o pacote da reserva mostram (Fato)

O que se procurou é o que um programa adulterado **sem** a assinatura do TSE, ou uma conferência de assinatura pulada, deixaria nos arquivos públicos (parecer 30, item D):

- etapa de verificação de assinatura com falha, faltando ou fora de ordem na inicialização para votar;
- mensagem de erro de assinatura no diário da reserva;
- versão de programa diferente;
- lacre do pacote quebrado;
- relógio mexido;
- carga no dia da votação ou fora do padrão das reservas.

| Sinal | Troca nova (2.818) | Reserva herdada (2.893) | Sem troca (491.489) |
|---|---|---|---|
| Pacote com lacre quebrado | 0 | 0 | 0 |
| Inicialização para votar com etapa de verificação sem SUCESSO | 0 | 0 | 0 |
| Mensagem de erro de assinatura no diário da urna que votou | 6 (0,21%) | 4 (0,14%) | 767 (0,16%) |
| Relógio que voltou sem ajuste registrado (diário da urna que votou) | 114 (4,05%) | 151 (5,22%) | 21.634 (4,40%) |
| Reserva carregada no dia da votação | 0 | 0 | — |

![Sinais no diário e no pacote: urna reserva × urna comum, 2º turno](graficos/h14-rastro-sinais.svg)

**Como ler:** para cada sinal, as três barras mostram a parte das seções de cada grupo em que ele aparece: troca nova (azul), reserva herdada (laranja) e seções sem troca (cinza). Barras de 0% não aparecem, mas o número está escrito. Se a reserva tivesse sido adulterada sem a assinatura oficial, a barra azul ficaria acima das outras em algum sinal; ela fica no mesmo nível. Dados: [graficos/dados/h14-rastro-sinais.csv](graficos/dados/h14-rastro-sinais.csv).

- **Fato (parecer 30, R1):** a mensagem de erro de assinatura aparece no diário da reserva em 6 seções. Pela taxa das urnas de seção do mesmo estado e do mesmo modelo, eram esperadas 6,56. Nas 6, conferidas no arquivo original, a reserva votou depois numa inicialização com as 34 etapas de verificação em SUCESSO.
- **Fato (parecer 30, R9):** o relógio que volta sem ajuste aparece no diário da reserva em 114 seções, contra 116,08 esperadas pela mesma régua.
- **Fato ([tópico 1](01-integridade-e-estrutura-dos-arquivos.md), parecer 24):** todas as 499.207 urnas do 2º turno registram a mesma versão de programa, 10.23.0.0.
- **Fato (carga):** nenhuma das 2.818 reservas foi carregada no dia da votação. 2.546 foram carregadas até 04/10 (para o 1º turno) e ficaram guardadas, 261 entre 05/10 e 23/10 e 11 na véspera, 24/10. As 5 cargas no dia da votação do 2º turno são de urnas de seção ([tópico 2](02-coerencia-entre-arquivos.md)).

**Afirmação revisada (parecer 30, item D):** nas 2.818 seções, o diário da reserva não mostra nenhum dos sinais que uma adulteração **sem a assinatura do TSE**, ou uma verificação de assinatura pulada, deixaria. Também não há pacote com lacre quebrado nem versão diferente. **Os arquivos públicos não permitem detectar um programa adulterado e assinado com a chave oficial**, porque é o próprio programa que escreve o diário: um programa assim grava as mesmas mensagens de SUCESSO e a mesma versão.

## Prova de que o teste funciona (contraprova)

- **Fato (os sinais do diário disparam quando há o que mostrar):** a mensagem de erro de assinatura aparece em **31** seções de troca nova quando se olha qualquer diário do pacote, contra 6,56 esperadas. O excesso está no diário da **urna substituída**, que vem no mesmo pacote: ela falhou, e por isso foi trocada. No diário da reserva, a taxa volta ao normal (6 × 6,56). O mesmo indicador que fica no normal na reserva acusa a urna com defeito.
- **Fato (o rastro da carga acha o que está lá):** foi pela zona gravada na carga que a auditoria achou as 125 + 45 reservas de outra zona e a troca de Aracaju, e cada caso conferido no arquivo original bateu (parecer 30, itens C e E).
- **Fato (o teste de votos vê efeito no comparecimento):** a mesma comparação que não acha nada nas trocas novas achou a diferença de comparecimento das reservas herdadas no 1º turno (item 3), confirmada pelo teste de nível.
- **Pendente:** não há contraprova para a **parcela do 13**. Nenhum grupo de seções com desvio conhecido no voto foi usado para mostrar que o teste o acusaria (parecer 30, V5).
- **Fato (reprodução):** o revisor rodou de novo os programas dos dois autores em cópia isolada. A saída do estatístico saiu idêntica (só muda a data), e a do engenheiro, idêntica byte a byte. As duas metades usam o mesmo conjunto de 2.818 seções. O script deste tópico refez as somas por grupo seção a seção e conferiu cada número citado aqui contra as saídas e contra o resultado oficial.

## Limites (o que não se pode afirmar)

1. **Programa adulterado e assinado.** Quem tivesse a chave de assinatura de programas do TSE poderia preparar uma carga que passa em todas as etapas, grava a versão oficial e escreve um diário normal. Nenhum teste deste tópico enxerga isso, nem em reserva, nem em urna de seção ([tópico 1](01-integridade-e-estrutura-dos-arquivos.md)).
2. **Votos de ausentes liberados pela mesa em ritmo normal.** Um mesário que libera eleitores ausentes pelo título e ano de nascimento, sem pressa e sem rajada, gera o mesmo diário de uma liberação legítima, em qualquer urna ([tópico 4](04-liberacao-dos-eleitores.md)). O teste deste tópico só vê o que muda a votação da seção em relação às vizinhas ou ao 1º turno.
3. **Desvio igual em todas as urnas do mesmo local.** O teste das herdadas compara com as urnas do mesmo prédio. Se todas tivessem o mesmo desvio, não haveria vizinha honesta para comparar. Esse caso é dos testes que comparam seções e zonas do país inteiro ([tópico 9](09-padroes-estatisticos.md)), não deste.
4. **Desvio pequeno.** Um desvio menor que o tamanho que os testes enxergam não aparece (Pendente sem número, item 2). O limite da escala (item 4) vale para qualquer tamanho.
5. **Manipulação que mexe no 13 e no 22 juntos**, sem mudar a parcela nem o comparecimento, só é coberta em parte pela medida de brancos + nulos.
6. **Por que cada urna foi trocada.** O diário grava a falha que vem antes da troca, mas não a decisão. A troca planejada e a troca por defeito usam o mesmo procedimento (premissa 8).
7. **Reservas que não votaram** não aparecem nos pacotes publicados.
8. **As vizinhas do mesmo local** costumam ter perfil parecido, mas não idêntico. 163 herdadas ficam fora do teste de nível por estarem em locais de uma seção só.

## Pendentes (sem número)

- **Reservas que liberaram quase todos os eleitores sem digital.** O padrão é mais comum nas reservas que nas urnas comuns, mas os votos dessas seções não mudaram em relação à zona, e o comparecimento delas não subiu. O diário não separa leitor de digitais com defeito de mesa usando a digital de outra pessoa para liberar eleitores presentes. O critério foi escolhido depois de ver os casos, e por isso a contagem fica em `docs/analysis/cetico-revisor/30-h14-urnas-reserva.md` (item C2). Faltam as atas das seções e o registro de manutenção do leitor dessas urnas.
- **Causa da queda de comparecimento no 1º turno** nas seções com reserva herdada: falta a varredura dos diários do 1º turno.
- **Motivo das trocas entre as zonas 1 e 2 de Aracaju:** pedido ao TRE-SE.
- **Contingências feitas em 04/10 depois do encerramento do 1º turno**, com a reserva ficando na seção para o 2º turno: pedir as atas. A contagem está no [doc 06 do engenheiro](../analysis/engenheiro-seguranca-urna/06-h14-rastro-das-reservas.md), item 5, e não foi revista uma a uma pelo revisor.
- **O mesmo teste no 1º turno**, com as reservas que assumiram em 04/10.
- **Tamanho mínimo de desvio que os testes enxergam** (estimativa, fora deste relatório).

## Como repetir

```
# votos (estatístico, doc 07)
node --max-old-space-size=8192 scripts/auditoria/estatistico-reservas-1t2t-dados.mjs   # ~45 s: secoes.csv
node --max-old-space-size=8192 scripts/auditoria/estatistico-reservas-1t2t.mjs         # ~2 min: diferença-em-diferenças, sorteio, por UF, modelo, zona e seção
node scripts/auditoria/estatistico-reservas-1t2t-bruto.mjs --n 15                      # boletim original dos dois turnos: extremas e Aracaju

# rastro técnico (engenheiro de segurança, doc 06)
node scripts/auditoria/seguranca-h14-varrer.mjs --procs 4                              # 51 min: todos os diários do 2º turno
node scripts/auditoria/seguranca-h14-grupos.mjs
node --max-old-space-size=8192 scripts/auditoria/seguranca-h14-itens.mjs               # carga, assinaturas, relógio, histórico, lacres
node scripts/auditoria/seguranca-h14-biometria-por-urna.mjs                            # reserva × urna substituída
node scripts/auditoria/seguranca-h14-dump-log.mjs --secao se/31054/0001/0130 --filtro "Zona Eleitoral|contingência"
node scripts/auditoria/seguranca-h14-dump-log.mjs --secao am/02550/0032/0848 --filtro "Turno|Seção|contingência" --dia 25/10/2026
node src/exportar.js --uf se --municipio 31054 --zona 0001 --secao 0130 --log nao --stdout

# revisão cética (parecer 30)
node scripts/auditoria/cetico-h14-grupos.mjs                                           # as duas metades usam as mesmas 2.818
node --max-old-space-size=8192 scripts/auditoria/cetico-h14-votos.mjs                  # ~70 s: teste de nível, outra zona, escala
node scripts/auditoria/cetico-h14-bio-outra-zona.mjs                                   # ~4 min: digital nas reservas de outra zona

# tabelas e gráficos deste tópico (confere cada número contra as saídas acima e o resultado oficial)
node --max-old-space-size=4096 scripts/auditoria/grafico-h14-dados.mjs
node scripts/auditoria/grafico-h14.mjs
```

Saídas dos autores em `data/parsed/auditoria/reservas-1t2t/` e `data/parsed/auditoria/reservas-rastro/`; do revisor, em `data/parsed/auditoria/cetico-revisor/` (`h14-votos.json`, `h14-bio-outra-zona.json`). Nenhum título de eleitor ou de mesário é gravado.

## Próximos passos

- [x] Votos das trocas novas e das herdadas, rastro técnico e escala, com revisão cética ([parecer 30](../analysis/cetico-revisor/30-h14-urnas-reserva.md)).
- [ ] **Pendente.** Pedir ao TRE-SE o registro das trocas de urna das zonas 0001 e 0002 de Aracaju em 17/10 e 19/10.
- [ ] **Pendente.** Pedir ao TSE a regra que permite usar, na contingência, reserva carregada para outra zona, e a lista de reservas por zona.
- [ ] **Pendente.** Pedir aos TREs as atas e o registro de manutenção do leitor de digitais das reservas que liberaram quase todos os eleitores sem digital.
- [ ] **Pendente.** Varredura dos diários do 1º turno: hora e duração das falhas nas seções com reserva herdada, e o mesmo teste de rastro com as reservas que assumiram em 04/10.
- [ ] **Pendente.** Atas das contingências feitas em 04/10 depois do encerramento.
- [ ] **Pendente.** Uma contraprova para a parcela do 13 (grupo de seções com desvio conhecido no voto).
