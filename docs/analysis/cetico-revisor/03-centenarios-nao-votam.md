# 03. Parecer do revisor cético: "centenários não votam" (H01, frente agregada)

Achado revisado: [demografo/03-muito-idosos.md](../demografo/03-muito-idosos.md), seção 2, e o resumo de H01 em [hipoteses.md](../../hipoteses.md). Três lentes independentes (reprodução, definições e alternativas) e uma conferência final do ponto em disputa. Data: 29/10/2026. O 1º turno no banco estava parcial (23 UFs) durante a revisão. Os números de 1º turno do autor vêm do `detalhe_votacao_secao`, que está completo.

## Afirmação original

> Com efeito fixo de município, o coeficiente da parcela de eleitores 100+ sobre o comparecimento da seção é −1,20 (2º turno; −1,11 no 1º), contra cerca de −0,83 esperado se esses títulos nunca votassem; 90–99 sem biometria: −0,97/−0,85. Conclusão do autor: no agregado esses títulos se comportam como quem não vota; não há uso sistemático (H01). Nenhuma das 22.389 seções com 5+ eleitores 100+ exige uso.

## Veredito final: **sustentado com ressalvas** (alcance bem menor)

Os números reproduzem exatamente. A conclusão "não há uso sistemático" está certa para o **1º turno**, mas por outro caminho: a contagem oficial do TSE por faixa etária, que o autor não tinha. A regressão do autor não sustenta essa conclusão. Para o **2º turno** os dados só sustentam "sem uso em massa". Uso de até cerca de 10% dos títulos 100+ (cerca de 30 mil votos) passa despercebido, e uso localizado não foi testado. O número das 22.389 seções é verdadeiro, mas não informa nada: o teste não dispararia nem com 100% de uso.

## Afirmação revisada

> **Fato (1º turno, contagem oficial do TSE):** dos 298.239 eleitores aptos com 100 anos ou mais, 2.141 compareceram (0,72%). Nos 1.068 municípios em que o cadastro tem mais eleitores 100+ do que a população 96+ do Censo 2022 (eles somam 275.334 desses títulos, 92%), compareceram 717 (0,26%). Nos outros municípios compareceram 6,3%, o que é compatível com centenários vivos. No 1º turno não houve uso sistemático desses títulos. O limite é que essa contagem é do próprio TSE e não pode ser refeita com os arquivos públicos de urna.
>
> **2º turno (ainda sem contagem oficial):** a regressão com efeito fixo de município (−1,20) é compatível com nenhum uso. Mas, por estar viesada (dá aos 100+ um comparecimento de −37%, o que é impossível), ela só descarta uso uniforme de cerca de 40% dos títulos (cerca de 119 mil votos). Comparar com o 1º turno na mesma seção descarta, de forma aproximada, uso acima de cerca de 10% dos títulos (cerca de 30 mil votos) feito só no 2º turno. Uso menor que isso, ou localizado em poucas seções e municípios, não é detectável por este desenho. "Nenhuma seção exige uso" não é evidência: o teste não tem poder.

## O que foi reproduzido (Fato)

| Item | Autor | Revisores | Fonte da reprodução |
|---|---|---|---|
| n seções / municípios | 497.385 / — | 497.385 / 5.571 | BU do banco + `secao_agregada` (reprodução); `detalhe_votacao_secao` (definições, alternativas) |
| p100, 2º turno | −1,20 | **−1,2032** (EP agrupado por município 0,046) | as três lentes, 4 casas iguais |
| p100, 1º turno | −1,11 | **−1,1065** (EP 0,064) | definições, alternativas |
| 90–99 sem biometria, 2º / 1º | −0,97 / −0,85 | **−0,9706** (EP 0,034) / **−0,854** (EP 0,036) | as três lentes |
| R², 2º / 1º | 0,18 / 0,21 | 0,1778 / 0,207 | |
| Seções com 5+ eleitores 100+ / que exigem uso | 22.389 / 0 | 22.389 / 0 | as três lentes |
| Valor de referência "−0,83" | −0,83 | intercepto sem efeito fixo 0,8285 (2º) e 0,821 (1º); taxa da base com biometria 0,836–0,855; oficial 18–69 no 1º turno 0,823 | a conta do autor está certa |

Robustez (Fato): o coeficiente não muda com o corte mínimo de eleitores por seção (de −1,200 a −1,2015 para cortes de 1, 20, 100 e 200). Trocar o denominador pelo total do perfil de julho muda p100 em só +0,05. O perfil por seção bate 100% com o zip bruto do TSE em AC (2.411 seções) e RR (1.622). Não há linhas de origem duplicadas. Bug de junção ou de agregação foi descartado.

Caso conferido no bruto (Fato, lente de reprodução): RJ, Rio de Janeiro, zona 0005, seção 0001, BU do 2º turno decodificado com `src/asn1.js`/`src/esquemas.js`. O perfil tem 40 eleitores 100+, 39 deles sem biometria. A seção tem 330 aptos e 202 comparecimentos, e só 7 entraram pelo caminho "sem biometria". Logo, no máximo 8 desses 40 títulos votaram. Obs.: `src/exportar.js` não exportou essa seção (sem `aux.json`, JSON com 0 pacotes), e o BU foi lido direto.

Dado oficial (Fato): o arquivo `perfil_comparecimento_abstencao_2026` chegou ao disco às 05:56, depois da análise do autor (05:48). Ele foi gerado em 13/10/2026 e só cobre o 1º turno. Comparecimento por faixa no 1º turno: 16–17 87,3%; 18–69 82,3%; 70–79 62,1%; 80–89 32,7%; 90–99 10,4%; 100+ 0,72% (2.141 de 298.239). As contagens por faixa do perfil por seção e desse arquivo são idênticas (100+ = 298.239), então a idade tem a mesma referência nas duas bases. O comparecimento total do arquivo (125.277.230) difere do `detalhe_votacao_secao` (125.275.835) em só 1.395.

## Ponto em disputa conferido nesta consolidação

As lentes divergiram na leitura da **diferença entre turnos na mesma seção** (Δ 2º−1º, que cancela o viés fixo da seção):

- Alternativas: p100 = −0,097 ± 0,033 (27 UFs, detalhe). 90–99 sem biometria: −0,117 ± 0,013. Esperado sem uso: cerca de −0,01. Leitura da lente: "compatível com uso de 5–10% desses títulos só no 1º turno".
- Reprodução: p100 = −0,107 (EP 0,046), 23 UFs, banco. Leitura da lente: é viés do próprio desenho, porque o comparecimento oficial dos 100+ no 1º turno foi 0,007 e não pode cair 0,1.

Conferi (script `cetico-centenarios-nao-votam-consolidacao.mjs`, saída `centenarios-consolidacao.json`):

| Hipótese "uso só no 1º turno" | Votos 100+ que o arquivo oficial do 1º turno teria de mostrar | Mostra |
|---|---|---|
| 5% dos títulos | 14.912 | 2.141 |
| 10% dos títulos | 29.824 | 2.141 |

| 1º turno, oficial | Municípios | Aptos 100+ | Compareceram 100+ | Taxa 100+ | Taxa 90–99 |
|---|---|---|---|---|---|
| Com excesso de 100+ no cadastro | 1.068 | 275.334 | 717 | **0,26%** | 6,0% |
| Sem excesso | 3.329 | 22.643 | 1.424 | 6,3% | 16,7% |
| Sem par no IBGE | 59 | 262 | 0 | 0 | 2,2% |

**Decisão:** quem tem razão é a lente de reprodução, para os 100+. A hipótese de uso de 5–10% só no 1º turno é **refutada** pela contagem oficial, desde que essa contagem seja confiável. Uso de um título passa pela urna e aparece como comparecimento daquele título. O Δ de −0,10 é, portanto, viés do desenho, de cerca de −0,09. Isso tem duas consequências. A primeira é que o Δ não é neutro: para ler o uso no 2º turno é preciso descontar esse viés, que só se conhece para os 100+. A segunda é que os Δ de outras faixas também se movem de ±0,05 a ±0,09 (70–79: +0,09; 80–89: +0,07; 16–17: −0,05), e −0,10 fica dentro desse ruído de especificação. Para os 90–99 sem biometria, o Δ de −0,117 não tem calibração. O arquivo oficial não separa a faixa por biometria, e a mesma origem de viés é a explicação mais provável. Fica como Hipótese fraca, sem peso de alarme.

Um ponto a favor do autor, que ele não tinha: nos municípios sem excesso, a lente de alternativas estima o comparecimento dos 100+ no 2º turno em cerca de 8%. O oficial do 1º turno nesses municípios é 6,3%. Nesse subconjunto a regressão acerta a ordem de grandeza.

## Problemas encontrados

1. **A regra de decisão do autor é inválida como prova de não uso (Fato).** O próprio modelo dá aos 100+ um comparecimento de −37% (2º turno) e −28% (1º). Calibrada contra o oficial do 1º turno, a regressão erra o comparecimento das faixas de −0,28 (100+) a +0,20 (80–89). Um coeficiente abaixo de −0,83 mostra que o modelo está mal especificado (efeito do lugar, não do grupo). Não mostra que os títulos não foram usados. O autor nomeia o viés ("outros ausentes no cadastro velho"), mas continua usando −0,83 como linha de decisão.
2. **O poder é baixo (Fato, simulação nas três lentes).** O coeficiente sobe cerca de *u* para uso uniforme de *u* dos títulos 100+. Uso de 10% (≈30 mil votos), 20% (≈60 mil) e 30% (≈89 mil) fica abaixo de −0,83 e passa como "não vota". Só 40% (≈119 mil votos) passa da regra. Mesmo com uma linha de base conhecida, o mínimo detectável a 2 EP é ≈9–10% (≈27–30 mil votos).
3. **O desenho não vê uso cauteloso nem localizado (Fato, simulação).** Um título usado em cada uma das 86.934 seções com algum 100+ dá 87 mil votos e move o coeficiente só +0,10. Usar todos os 100+ das seções com 1 ou 2 deles dá 61,5 mil votos e move +0,006. Usar 100% em 1% dos municípios move +0,004. O autor reconhece que uso localizado não aparece. Mesmo assim, o resumo em H01 diz "sem uso sistemático", sem dizer quanto uso caberia.
4. **O teste de limite por seção tem poder zero e foi usado como apoio (Fato).** Com 100% dos títulos 100+ usados nas 10% das seções com mais centenários (99 mil votos injetados), ele acusa 0 seções. A folga mediana é de 81 eleitores (mínimo 16). O autor diz que o limite é "fraco", mas "nenhuma das 22.389 seções exige uso" aparece em H01 como evidência. Deveria sair.
5. **O efeito fixo de município absorve pouco do uso proporcional (Fato), mas o quanto varia.** O efeito por unidade de uso vai de ≈0,65 a ≈1,2 conforme quais municípios recebem o uso: a lente de definições vê absorção de 25–35% quando o uso cobre municípios inteiros, e as outras duas, quase nenhuma. Sem efeito fixo, p100 fica ainda mais negativo (−1,33 e −1,17), então o efeito fixo não cria o achado. Inflação geral do município, ou votos fixos por seção sem relação com os 100+, ficaria absorvida e não é testável aqui.
6. **"90–99 sem biometria" do perfil não equivale a "habilitado sem digital" na urna (Fato).** Separando pelo BU, a parcela sem biometria dá +0,47 a +0,52 para esse grupo, o que é impossível diante dos 10,4% oficiais da faixa 90–99 inteira. Os −0,97/−0,85 não podem ser lidos como comparecimento do grupo.
7. **O autor não deu erro-padrão nem cenário de poder (Fato).** Os EPs agrupados por município (0,046 e 0,064) foram calculados pelos revisores.
8. **O documento do autor está desatualizado (Fato).** Ele diz que `perfil_comparecimento_abstencao` "não está no disco". O arquivo chegou depois da análise e responde diretamente à pergunta do 1º turno.
9. **Detalhes sem efeito no número (Fato).** Os aptos do BU incluem TTE (transferência temporária), e o perfil de julho não. A regressão não pondera as seções. Cerca de 120 municípios com uma só seção ficam fora do efeito fixo. As 29–31 seções do Sistema de Apuração ficam dentro, sem efeito.

## Explicações alternativas

| Explicação | Sentido | Testada? | Resultado |
|---|---|---|---|
| Bug de junção ou agregação (detalhe × eleitorado, seções agregadas, origens duplicadas) | alarme falso / absolvição falsa | **Testada** | Descartada: fontes independentes dão o mesmo n e o mesmo coeficiente |
| Definição de denominador ou data de referência da idade (julho × eleição; 9999 = 100+) | ambos | **Testada** | Explica no máximo 0,05; as contagens por faixa batem entre as bases |
| Efeito de contexto (cadastro velho, outros ausentes) produz o coeficiente abaixo de −0,83 (hipótese benigna do autor) | absolvição | **Testada pelos revisores** (o autor só supôs) | Confirmada e mais ampla: todo o excesso negativo está na parcela com biometria (p100 = −1,20 com EP 0,071), e com efeito fixo de local de votação o viés persiste (−1,13 ± 0,05). Ela explica o viés, mas também é o que tira o poder |
| Uso uniforme moderado (5–30%) escondido pelo viés | absolvição falsa | **Testada** (simulação) | Indistinguível pela regra do autor. No 1º turno é descartado pelo oficial (0,72%). No 2º, o Δ entre turnos só descarta uso acima de ≈10% |
| Uso só no 1º turno (com disputa de deputado), que explicaria o Δ de −0,10 | absolvição falsa | **Testada nesta consolidação** | Refutada para os 100+: 5% exigiria 14.912 votos no oficial, que mostra 2.141. Nos municípios com excesso, 0,26% |
| Uso concentrado nos municípios com excesso | absolvição falsa | **Testada** | O efeito fixo não absorve o uso. No 1º turno o oficial mostra 0,26% nesses municípios, contra 6,3% fora deles |
| Uso localizado (poucas seções ou municípios) | absolvição falsa | **Parcialmente**: a simulação mostra que é invisível; o oficial do 1º turno aponta casos | Hipóteses para exame do log. Por município (oficial, 1º turno): Icatu (MA) 7/22, Redentora (RS) 6/20, Florianópolis (SC) 7/24, Pirapemas (MA) 7/24 e Pilão Arcado (BA) 6/21 de 100+, todos acima de 25%. Arame (MA) tem 5/20 de 100+ e 37/84 (44%) de 90–99, contra 10,4% no país, e coincide com a seção MA Arame 0104/0070 que o autor já marcou. Números pequenos |
| Medidor alternativo para o 2º turno: p100 na parcela "sem biometria" do BU (−0,002, EP 0,036; no 1º turno +0,034 contra 0,007 oficial) | ambos | **Testada** | Hipótese fraca. Indica uso abaixo de ≈7–8% no 2º turno, mas a mesma regressão dá +0,5 (impossível) para os 90–99 sem biometria. Um ponto de calibração não basta |
| A contagem oficial do TSE por faixa estaria errada | absolvição falsa | **Não testável** com arquivos públicos (o log não traz a idade de quem votou) | Ressalva. Não é procedimento humano no sentido do princípio 8, mas também não é controle verificável por terceiros. A soma bate com o BU (diferença de 1.395 em 125 milhões) |
| Substituição: o mesário vota no lugar de qualquer ausente, de qualquer idade | absolvição falsa | **Não testada** | Este desenho não vê isso por construção. Precisa de teste no log (rajadas de habilitação por ano de nascimento, horário) |
| Mobilização benigna maior no 1º turno (explicação para o Δ) | — | **Só suposta** | Para os 100+ não é necessária, porque o oficial já fecha a questão. Para os 90–99 sem biometria fica em aberto |

Nenhuma explicação benigna aceita aqui depende de procedimento humano. A habilitação por ano de nascimento é justamente a brecha em teste (princípio 8), e o autor corretamente não a usa como controle.

## Poder do teste

| Teste | Detecta | Não detecta |
|---|---|---|
| Regressão com efeito fixo de município, regra "≥ −0,83" (autor) | uso uniforme ≥ ≈40% dos títulos 100+ (≈119 mil votos), ou 100% nas 5–10% das seções com mais centenários (60–99 mil) | 1–30% uniforme; 1 título por seção (87 mil votos); 1–2 títulos por seção; uso em 1–10% das seções ou dos municípios |
| A mesma regressão com linha de base conhecida | ≈9–10% (≈27–30 mil votos) a 2 EP | menos que isso |
| Δ 2º−1º na mesma seção (2º turno) | uso exclusivo do 2º turno acima de ≈10% (≈30 mil), descontado o viés de ≈−0,09 medido nos 100+ | uso igual nos dois turnos (cancela); uso abaixo de ≈10%; uso localizado |
| Limite por seção (22.389 seções) | nada: 0 seções mesmo com 99 mil votos injetados | qualquer uso |
| Limite técnico pela biometria (só vota sem biometria quem não tem digital) | casos isolados como RJ 0005/0001 | no agregado, o teto é 98,8% dos títulos 100+ sem biometria (mediana por seção: 100%) |
| Contagem oficial do TSE por faixa e município (1º turno) | medida direta: 0,72% no país, 0,26% nos municípios com excesso | 2º turno (o arquivo ainda não existe); não pode ser refeita com dados públicos |

## Pendências

1. **Recomendação:** quando o TSE publicar o `perfil_comparecimento_abstencao` com o 2º turno, refazer a medida direta (`cetico-centenarios-nao-votam-oficial.mjs`). Essa é a única forma, com dados públicos, de fechar o 2º turno abaixo de ≈10%.
2. **Recomendação:** examinar no log as Hipóteses localizadas: Arame (MA), incluindo a seção 0104/0070; Icatu e Pirapemas (MA); Redentora (RS); Florianópolis (SC); Pilão Arcado (BA). Procurar horário e rajadas de habilitação por ano de nascimento.
3. **Recomendação ao autor e ao coordenador:** em H01, trocar "sem uso sistemático" por "sem uso sistemático no 1º turno (oficial, 0,72%); no 2º, sem uso em massa (> ≈10%)". Retirar as 22.389 seções como evidência e registrar que o arquivo oficial já está no disco. Quem faz a mudança é o coordenador; este parecer não edita `hipoteses.md`.
4. Os números de 1º turno parcial e de Δ entre turnos tirados do banco (23 UFs) vão mudar quando a carga terminar. O Δ das 27 UFs pelo `detalhe_votacao_secao` (−0,097) já está no `centenarios-poder.json`.
5. Mantém-se o pedido por LAI do autor: títulos 100+ com comparecimento por município nos dois turnos, e cancelamentos por óbito depois de 07/05/2026. É o que permitiria conferir a contagem oficial.
6. `src/exportar.js` não exporta RJ 60011/0005/0001 (falta `aux.json`). Fica registrado para quem mantém o exportador.

## Comandos que reproduzem a revisão

Rodar um por vez (cada um é pesado, exceto o último):

```
node scripts/auditoria/cetico-centenarios-nao-votam-reproducao.mjs        # reprodução pelo BU do banco, poder, Δ entre turnos, limite técnico
node scripts/auditoria/cetico-centenarios-nao-votam-oficial.mjs           # comparecimento oficial do 1º turno por faixa e município
node scripts/auditoria/cetico-centenarios-nao-votam-dados.mjs faixas      # definições: faixas, datas de referência, leiames
node scripts/auditoria/cetico-centenarios-nao-votam-dados.mjs poder       # definições: decomposição pelo BU, simulação, calibração por zona
node --max-old-space-size=4096 scripts/auditoria/cetico-centenarios-poder.mjs   # alternativas: EP, poder, Δ entre turnos, interações
node scripts/auditoria/cetico-centenarios-nao-votam-consolidacao.mjs      # ponto em disputa: Δ entre turnos × oficial do 1º turno
```

Saídas em `data/parsed/auditoria/cetico/`: `centenarios-reproducao.json`, `centenarios-oficial.json`, `centenarios-oficial-municipios.tsv`, `faixas-comparecimento.json`, `zonas-comparecimento-faixa.tsv`, `cnv-dados-poder.json`, `centenarios-poder.json`, `centenarios-consolidacao.json`.
