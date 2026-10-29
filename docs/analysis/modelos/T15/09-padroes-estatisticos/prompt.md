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

## Tópico em revisão: 09-padroes-estatisticos.md

# 9. Padrões estatísticos de fraude

> **Situação:** escrito em 29/10/2026 a partir de `docs/analysis/forense-estatistica/01` a `07`. **Nenhum item deste tópico tem ainda parecer do revisor cético** (`docs/analysis/cetico-revisor/`), por isso todos os rótulos vêm acompanhados de "aguarda revisão cética". O 2º turno usa o país inteiro. O 1º turno, usado como comparação, é **parcial** (ver abaixo).

## A pergunta

Os resultados de Presidente mostram as marcas estatísticas que fraudes grandes costumam deixar? As três marcas mais conhecidas são:

- **enchimento de urna:** alguém acrescenta votos falsos, e a seção aparece com comparecimento perto de 100% e quase todos os votos para um só candidato;
- **números inventados:** alguém escreve o resultado à mão, e os algarismos ficam com um padrão que contagens reais não têm;
- **números redondos:** quem inventa resultado tende a escolher 100, 150, 200 votos, ou 60%, 75%.

## Resposta curta

| Pergunta | Resposta (2º turno, Presidente, 499.205 seções) | Rótulo |
|---|---|---|
| Há a marca de enchimento de urna? | Não aparece. Nenhuma seção tem comparecimento acima de 100%. Não há um segundo grupo de seções em "100% de comparecimento com 100% para um candidato". Dentro de cada zona, comparecimento e voto quase não andam juntos. | **Fato**, aguarda revisão cética |
| Há marca de número inventado? | Não no último algarismo: 0 de 56 testes acusam diferença em relação a contagens honestas simuladas. No segundo algarismo, 9 de 56 testes acusam diferenças pequenas, que também apareceram no 1º turno (parcial, 15 UFs). | **Fato** (contagem); a causa dos 9 é **Hipótese**; aguarda revisão cética |
| Há excesso de números redondos? | Não. Nem nas contagens de votos, nem nos percentuais, nem no comparecimento. | **Fato**, aguarda revisão cética |
| Há algo fora do padrão? | Sim: há mais seções com 90% a 100% dos votos para o 13 (Lula) do que o modelo prevê. Essas seções estão principalmente em aldeias, quilombos e presídios, e já davam votação parecida ao mesmo candidato no 1º turno (parcial, 15 UFs). Quando se leva em conta o perfil dos eleitores de cada seção, os casos extremos ficam iguais para os dois candidatos (318 e 325). | **Fato** (contagem); a explicação é **Hipótese**; aguarda revisão cética |
| Isso prova que não houve fraude? | Não. Estes métodos só enxergam fraude grande o bastante para mudar o desenho dos números no país. Fraude pequena e espalhada por muitas seções, ou feita de forma proporcional ao voto de cada lugar, passa por eles sem ser vista. | **Fato** (é um limite dos métodos) |

**O que isto prova:** os números do 2º turno não têm as três marcas clássicas de fraude em grande escala que estes métodos conhecidos detectam.

**O que isto não prova:** que nenhum voto foi fraudado. Também não prova que cada seção fora do padrão é honesta: elas têm explicação provável, mas não foram investigadas uma a uma.

## Que dados foram usados

- **Fato, aguarda revisão cética.** 2º turno, Presidente: todas as 499.205 seções com voto, tiradas do banco da auditoria (`data/db/eleicao2026.sqlite`), que guarda o boletim de cada urna. Somam 64.256.232 votos para o 13 e 59.826.041 para o 22, iguais ao resultado oficial seção por seção (tópico [5](05-soma-dos-boletins.md)). Script: `node scripts/auditoria/forense-base.mjs 2`.
- **Perfil dos eleitores de cada seção:** idade, escolaridade, eleitores indígenas e quilombolas, tirados do cadastro público do TSE de 17/07/2026. **Fato:** o perfil cobre cerca de 478 mil das 499 mil seções. As do exterior e algumas sem correspondência no cadastro ficam sem esse ajuste.
- **Tipo de local de votação:** aldeia, quilombo, presídio, exterior ou comum, pelo nome do local e pelo cadastro. **Fato:** muitos locais em aldeia não têm "aldeia" no nome, e a raça/cor vem "não informada" para muitos eleitores. Então o grupo "comum" ainda contém aldeias, comunidades ribeirinhas, quilombos e assentamentos.
- **1º turno, para comparação: parcial.** UFs incluídas (15): AC, AL, AM, AP, BA, CE, DF, ES, GO, MA, MG, MS, MT, PA, PB, com 228.269 seções. **Faltam (13):** PE, PI, PR, RJ, RN, RO, RR, RS, SC, SE, SP, TO e o exterior. Todo número do 1º turno abaixo vale só para essas 15 UFs.

## Como cada teste funciona, em palavras simples

Todos os testes seguem a mesma ideia: primeiro se calcula **o que seria esperado numa eleição honesta** com seções do tamanho e do perfil das brasileiras (isso se chama **modelo sem fraude**, ou modelo de referência). Depois se compara com o que as urnas registraram. Diferença grande é um **sinal** a examinar, não uma prova.

### Teste 1. Seções com quase todos os votos para um candidato

Conta quantas seções deram 90% ou mais, e 100%, dos votos válidos a um candidato. O esperado vem do comportamento das outras seções da mesma zona eleitoral. O modelo usado admite que seções vizinhas variam entre si (um bairro vota diferente do outro); em estatística ele se chama **beta-binomial**. Uma seção é marcada como "surpreendente" quando a chance de aquele resultado sair por acaso é menor que 1 em 20 milhões. O limite é tão baixo porque são testadas 499 mil seções, e com tantas tentativas algum resultado raro sempre aparece.

### Teste 2. O "gráfico de Klimek" (impressão digital do enchimento de urna)

Em 2012, Klimek e colegas publicaram um método (revista *PNAS*) que hoje é o mais usado para procurar enchimento de urna. Cada seção vira um ponto num gráfico:

- na horizontal, o **comparecimento** da seção (quantos dos eleitores aptos votaram);
- na vertical, a **parcela do candidato** naquela seção.

Numa eleição sem enchimento, os pontos formam uma nuvem só. Quando há enchimento, aparece uma "mancha" separada no canto de cima à direita: seções com comparecimento perto de 100% e quase 100% para um candidato, porque quem enche a urna aumenta as duas coisas ao mesmo tempo. Foi assim que o método mostrou problemas em eleições da Rússia e de Uganda.

O teste também mede se, **dentro da mesma zona**, as seções que comparecem mais votam mais num candidato. Essa ligação se mede pela **correlação** (um número de −1 a +1: perto de 0 quer dizer que as duas coisas não andam juntas; perto de +1, que sobem juntas). Para saber quanto seria normal, o teste embaralha o comparecimento entre as seções da mesma zona 20 vezes, o que apaga qualquer ligação real e mostra quanto sai só por acaso (isso se chama **permutação**).

### Teste 3. Os algarismos dos votos

Quem inventa números à mão escolhe algarismos de um jeito que contagens reais não produzem. O teste olha:

- **o último algarismo** dos votos de cada candidato em seções com 100 votos ou mais. Numa contagem real, ele deveria sair de 0 a 9 de forma quase igual;
- **o segundo algarismo**, comparado com a lei de Benford (abaixo) e com o modelo sem fraude.

Cada comparação é feita por UF e por candidato (56 comparações no 2º turno). Como são muitas, usa-se uma correção (método de **Holm**) que evita chamar de anomalia o que é só acaso por causa do número de tentativas.

**Por que a lei de Benford no 1º algarismo não serve aqui.** A lei de Benford diz que, em muitos conjuntos de números reais, o primeiro algarismo é "1" em cerca de 30% dos casos, e "9" em menos de 5%. Ela vale quando os números se espalham por várias ordens de grandeza (unidades, dezenas, milhares, milhões). Votos por seção não fazem isso: ficam entre 0 e uns 400, porque a seção tem esse tamanho. Então o primeiro algarismo depende do tamanho das seções e da força do candidato, e não de a contagem ser honesta.

- **Fato, aguarda revisão cética.** Isso foi medido: os votos simulados pelo modelo **sem fraude por construção** são reprovados pela lei de Benford no 1º algarismo em **56 de 56** testes. No Brasil, para o 13, a distância em relação a Benford dos votos simulados (χ² = 286.706) é quase a mesma dos votos reais (297.064). Um teste que reprova dados honestos não serve para detectar fraude. Por isso ele não é usado como prova de nada neste relatório, nem a favor nem contra.

### Teste 4. Seções muito diferentes da sua zona

Para cada seção, mede quantas vezes ela está longe do "típico" da sua zona, em parcela de cada candidato e em comparecimento. Esse afastamento chama-se **escore z**. Foi usado um z que não se deixa puxar pelos próprios valores extremos (z **robusto**). z de 5 ou mais é muito raro: por uma curva normal, daria menos de uma seção no país inteiro. Depois a conta é refeita **descontando o perfil dos eleitores** da seção (idade, escolaridade, indígenas, quilombolas), para ver o que sobra.

### Teste 5. Números redondos

Conta quantas seções têm votos em múltiplos de 10, 50 e 100, e percentuais em múltiplos de 5% (como 60%, 65%, 70%). O esperado para "200 votos" é a média de quantas seções têm 198, 199, 201 e 202. Para os percentuais, cada seção é sorteada de novo 20 vezes com o mesmo tamanho e a mesma parcela, para saber quantos percentuais redondos aparecem por acaso (método de Kobak, Shpilkin e Pshenichnikov, 2016).

### Teste 6. Para que lado pendem as anomalias

Para cada tipo de anomalia, conta quantas favorecem o 13 e quantas o 22, e compara com o que o modelo de cada teste esperava.

## O que foi encontrado (2º turno, Presidente, país inteiro)

### Enchimento de urna (gráfico de Klimek)

- **Fato, aguarda revisão cética.** Comparecimento por seção: metade das seções ficou abaixo de 81,5%. **Nenhuma seção passou de 100%.** 12 seções tiveram exatamente 100%, todas pequenas (de 26 a 163 eleitores aptos). 639 tiveram 95% ou mais. Fonte: `node scripts/auditoria/forense-klimek.mjs 2` → `data/parsed/auditoria/forense/klimek-2t.json`; gráfico em `klimek-2t-13.svg`.
- **Fato, aguarda revisão cética.** Os pontos formam uma nuvem única, com o centro em 80% a 84% de comparecimento (cerca de 156 mil seções nessa faixa). **Não há uma segunda mancha** em 100% de comparecimento com 100% para um candidato.
- **Fato, aguarda revisão cética.** Dentro da mesma zona, a correlação entre comparecimento e parcela do 13 é **−0,078** (em 2.640 zonas com 20 seções ou mais). Para o 22, é +0,078. Os dois números estão perto de zero: comparecimento e voto quase não andam juntos. Descontado o perfil dos eleitores, a correlação do 13 fica em −0,055.
- **Fato, aguarda revisão cética.** Zonas em que a correlação passa de 0,5 (as duas coisas sobem juntas com força): 20 a favor do 13 e 69 a favor do 22, de 2.640. As do 22 estão sobretudo no Sul. A correlação positiva do 22 por UF é maior em SC (+0,26), PR (+0,25), RS (+0,24), GO (+0,19) e RJ (+0,15); a do 13, em RR (+0,25).
  - **Hipótese:** em zonas urbanas, bairros de renda maior comparecem mais e votam mais no 22. O cadastro não informa renda, então esse efeito não foi descontado. **Pendente:** refazer com renda do Censo por setor.
- **Fato, aguarda revisão cética. Há uma cauda pequena de comparecimento alto com voto forte no 13.** 1.214 seções (0,24% do total) tiveram 94% ou mais de comparecimento. Nas 66 com 98% a 100% de comparecimento, o 13 teve em média 79,7% dos votos. No canto "95% ou mais de comparecimento e 95% ou mais para o candidato" há 64 seções do 13 (a permutação esperava cerca de 7) e 2 do 22 (esperava 0,1). Das 64 do 13: 34 em aldeia, 2 em quilombo, 1 em presídio e 29 classificadas como "comuns".
  - **Fato, aguarda revisão cética.** A parcela do 13 também é maior nas seções de comparecimento **baixo** (59% na faixa de 50% a 60%). Isso indica que a cauda reflete diferenças entre regiões, e não só o comparecimento.
  - **Hipótese:** o excesso no canto vem de aldeias e comunidades pequenas, onde o eleitorado é estável, quase todos votam e o voto é parecido. **Pendente:** conferir se as 29 seções "comuns" do canto ficam em terras indígenas ou quilombos, e comparar com as mesmas seções em 2022.

### Números inventados (algarismos)

| Teste | Quantos acusam diferença (de 56, já corrigido por Holm) | Leitura |
|---|---|---|
| Último algarismo × "todos iguais" | 17 | Diferença real, mas pequena (o 0 aparece em 10,5% das seções e o 9 em 9,6%, para o 13). Vem do fato de haver mais seções pequenas que grandes |
| Último algarismo × modelo sem fraude | **0** | Nenhuma UF mostra sinal de número inventado |
| 2º algarismo × lei de Benford | 52 | O modelo sem fraude também é reprovado. Benford não é a referência certa aqui |
| 2º algarismo × modelo sem fraude | 9 | AL, AM, AP, CE, MG, PA, PB, PI, RJ, todos para o 13 |

Fonte: `node scripts/auditoria/forense-digitos.mjs 2` → `data/parsed/auditoria/forense/digitos-2t.json`. Rótulo: **Fato** (contagens), aguarda revisão cética.

- **Hipótese, aguarda revisão cética.** Os 9 desvios do 2º algarismo são pequenos (até 2,6 pontos percentuais) e espalhados por vários algarismos, sem pico num algarismo só. Número escrito à mão costuma deixar pico. A explicação mais provável é que o modelo de referência se ajusta mal a estados onde o 13 tem 60% a 90% dos votos com seções muito diferentes entre si. **Pendente:** refazer com um modelo de referência mais flexível e ver se os desvios somem.

### Números redondos

| | Múltiplos de 10 (observado / esperado) | Múltiplos de 100 (observado / esperado) | Percentual múltiplo de 5% (observado / esperado) |
|---|---|---|---|
| Votos do 13 | 50.046 / 49.917 | 5.566 / 5.532 | 10.972 / 10.894 |
| Votos do 22 | 49.741 / 49.676 | 4.273 / 4.274 | 10.972 / 10.910 |
| Comparecimento | 50.007 / 49.962 | 5.189 / 5.311 | 8.548 / 8.608 |

Fonte: `node scripts/auditoria/forense-redondos.mjs 2` → `data/parsed/auditoria/forense/redondos-2t.json`.

- **Fato, aguarda revisão cética.** Nenhum excesso de números redondos para os dois candidatos nem para o comparecimento. As diferenças entre observado e esperado estão dentro do que o acaso produz (escore z entre −1,7 e +0,7).
- **Fato, aguarda revisão cética.** Brancos e nulos aparecem com **menos** múltiplos de 10 que o esperado. Isso vem do método: são números pequenos (0 a uns 30), e a média dos vizinhos exagera o esperado nesse trecho. Não é sinal de nada.

### Seções com 90% a 100% dos votos para um candidato

| | 90% a 95% | 95% a 99% | 99% a 100% | 100% | Total com 90% ou mais |
|---|---|---|---|---|---|
| 13, observado | 5.150 | 1.545 | 98 | 106 | 6.899 |
| 13, esperado pelo modelo | 4.039 | 601 | 17 | 8 | 4.664 |
| 22, observado | 343 | 34 | 3 | 4 | 384 |
| 22, esperado pelo modelo | 507 | 97 | 7 | 4 | 615 |

Fonte: `node scripts/auditoria/forense-a3a4.mjs 2` → `data/parsed/auditoria/forense/a3a4-2t.json` e `a3a4-2t-secoes.csv`.

- **Fato, aguarda revisão cética.** O 13 tem mais seções com 90% ou mais do que o modelo espera (6.899 contra 4.664). O 22 tem menos (384 contra 615).
- **Fato, aguarda revisão cética. Onde está o excesso do 13:**

  | Tipo de local | Observado | Esperado | Vezes o esperado |
  |---|---|---|---|
  | Aldeia | 517 | 64 | cerca de 8 |
  | Quilombo | 103 | 16 | cerca de 6,5 |
  | Presídio (presos provisórios) | 39 | 3,6 | cerca de 11 |
  | Comum | 6.153 | 4.477 | — |
  | Temporário / exterior | 73 / 14 | 54 / 50 | — |

  As 106 seções com 100% para o 13 estão em: aldeia 52, comum 45, quilombo 7, presídio 2. As seções "comuns" com mais excesso ficam em municípios com muitos indígenas, ribeirinhos ou assentados (Atalaia do Norte-AM, São Gabriel da Cachoeira-AM, Santa Isabel do Rio Negro-AM, Turiaçu-MA, um assentamento em Ortigueira-PR).
- **Fato, aguarda revisão cética.** Não é efeito de seção minúscula: as 110 seções com 100% (106 do 13 e 4 do 22) têm, no meio da lista, 123 votos válidos. Só 19 têm menos de 50 votos. A maior tem 354 votos.
- **Fato, aguarda revisão cética.** As 4 seções com 100% para o 22 ficam em Arroio do Padre-RS, Cândido Godói-RS, Chaves-PA e Jacareacanga-PA.
- **Fato, aguarda revisão cética.** Seções "surpreendentes" (chance menor que 1 em 20 milhões pelo modelo): 125 do 13 e 7 do 22.

### Seções muito diferentes da sua zona

| | Muito acima da zona (z ≥ 5), sem desconto | Com o perfil dos eleitores descontado |
|---|---|---|
| Parcela do 13 | 715 | **318** |
| Parcela do 22 | 135 | **325** |

Fonte: `node scripts/auditoria/forense-zscore.mjs 2` → `data/parsed/auditoria/forense/zscore-2t.json` e `zscore-2t-cauda.csv`.

- **Fato, aguarda revisão cética.** Sem desconto, os casos extremos pendem para o 13 (715 contra 135). Das 715: 243 em aldeia, 89 em presídio, 6 em quilombo e 374 "comuns". **Descontado o perfil dos eleitores, a cauda fica praticamente igual para os dois: 318 e 325.** O desconto age na direção esperada: seções com mais eleitores indígenas, quilombolas e de escolaridade baixa votam mais no 13.
- **Fato, aguarda revisão cética.** Os casos mais extremos do 13, depois do desconto, são escolas indígenas cujo nome não diz "aldeia" (em Brasnorte-MT, Juara-MT, Barra do Garças-MT, José Boiteux-SC, Charrua-RS e Douradina-MS). Os do 22 ficam em Arroio do Padre-RS, Lábrea-AM, Novo Aripuanã-AM, Muaná-PA, Uruçuí-PI, Porto Velho-RO, e em duas seções indígenas de comparecimento baixo (Barcelos-AM e Novo Progresso-PA). Os povos e o perfil de colonização desses municípios estão **a confirmar** em fonte pública (Funai, ISA, IBGE).
- **Fato, aguarda revisão cética.** Comparecimento muito acima da zona: 40 seções, quase todas pequenas (26 a 315 aptos) e rurais. 35 delas foram vencidas pelo 13 e 5 pelo 22; pela composição das zonas, o esperado era cerca de 26 e 14. É a única assimetria desta rodada que o perfil dos eleitores **não** explicou. São 40 seções num universo de 499.205.
  - **Pendente (aponta-se ao coordenador):** a fonte traz dois números diferentes para "comparecimento muito acima da zona, com o perfil descontado": 35 seções (`docs/analysis/forense-estatistica/05`) e 17 + 3 = 20 seções (`07`). **Fato (causa encontrada na conferência):** o 35 é o total do país (`log-zscore-2t.txt`). O 20 conta só as seções que já estavam entre as 40 sem desconto, porque `forense-assimetria.mjs` lê `zscore-2t-cauda.csv`, e esse arquivo só guarda seções extremas **antes** do desconto. Falta saber quem venceu as outras 15. Até o auditor corrigir o doc 07, este relatório usa só o número sem desconto (40).
- **Fato, aguarda revisão cética.** Comparecimento muito **abaixo** da zona: 597 seções. **Hipótese:** cadastro com eleitores que mudaram ou morreram e continuam aptos. Isso não tem a ver com enchimento de urna, e sim com o tópico [6](06-titulos-de-falecidos.md).

### Para que lado pendem as anomalias

- **Fato, aguarda revisão cética.** As anomalias de **concentração** (100%, 90% ou mais, canto de Klimek) favorecem o 13 bem acima do esperado. A de **correlação dentro da zona** favorece o 22 (69 zonas contra 20). Os casos extremos, **com o perfil dos eleitores descontado**, ficam empatados (318 contra 325; a diferença não passa do que o acaso produz). Fonte: `node scripts/auditoria/forense-assimetria.mjs 2` → `assimetria-2t.json`.

## Comparação com o 1º turno (parcial)

**Parcial:** UFs incluídas AC, AL, AM, AP, BA, CE, DF, ES, GO, MA, MG, MS, MT, PA, PB; faltam PE, PI, PR, RJ, RN, RO, RR, RS, SC, SE, SP, TO e exterior. Os mesmos scripts foram rodados com o argumento `1`.

- **Fato, parcial, aguarda revisão cética.** Nenhuma seção com comparecimento acima de 100% (12 com exatamente 100%). Último algarismo × modelo sem fraude: 0 de 30 testes acusam diferença. 2º algarismo × modelo: 10 de 30, incluindo três do 22 (AC, AP, ES). O mesmo tipo de desvio do 2º turno já existia no 1º, e também para o outro candidato.
- **Fato, parcial, aguarda revisão cética.** O excesso de seções com 90% ou mais para o 13 já existia no 1º turno, com 11 adversários: nas 10 UFs da primeira carga (AC a MA), o observado foi 1,85 vez o esperado no 1º turno e 1,46 vez no 2º. Ou seja, o excesso **diminuiu** no 2º turno.
- **Fato, parcial, aguarda revisão cética.** Das 87 seções com 100% no 2º turno que têm 1º turno carregado, **todas** já davam 90% ou mais ao mesmo candidato no 1º turno. Das 5.071 seções do 13 com 90% ou mais (e 1º turno carregado), 5.055 já tinham 80% ou mais no 1º. Das 131 do 22, todas as 131. Só 2 saltaram 20 pontos ou mais entre os turnos.
- **Fato, parcial, aguarda revisão cética.** No 1º turno, os votos do 22 em múltiplos de 10 aparecem um pouco mais que o esperado (23.218 contra 22.655, escore z +3,7), espalhados por 12 das 15 UFs. Isso não se repete no 2º turno nas mesmas UFs (z −0,3), nem nos múltiplos de 50 e 100, nem no último algarismo.
  - **Hipótese (fraca):** acaso ou efeito do método dos vizinhos numa distribuição de outro formato (no 1º turno o 22 tinha mais seções com poucos votos). Não dá para descartar. **Pendente:** refazer com o 1º turno completo e com o esperado por sorteio em vez dos vizinhos.

## Seções conferidas no arquivo da urna

Os testes acima usam o banco da auditoria. Para confirmar que os números extremos são os que a urna gravou, 25 seções extremas foram abertas no arquivo original da urna (`node scripts/auditoria/forense-conferir.mjs 2 <seção>` → `conferencia-2t.json`). Isso **confirma** casos; não gera número da auditoria (princípio 9).

- **Fato, aguarda revisão cética.** Nas 25 seções, o boletim do arquivo é igual ao do banco. Em 24, todos os lacres digitais conferem (0 falha). Exemplos: seção de aldeia em Confresa-MT (zona 28, seção 200): 309 de 315 aptos votaram, 309 votos no 13; Arroio do Padre-RS (zona 34, seção 433): 116 votos no 22 e 2 brancos; e as 12 seções com 100% de comparecimento, que têm voto dividido entre os candidatos (por exemplo, Caraúbas-RN, zona 36, seção 69: 134 para o 13 e 25 para o 22).
- **Pendente.** Uma seção do CE (zona 55, seção 160) **não teve o lacre conferido**: o programa de conferência para com erro ao ler o certificado dessa urna (modelo UE2015). O boletim dela confere com o banco. Foi encaminhada para o tema de integridade dos arquivos (H04).

## Um caso para examinar

**Hipótese.** Seção em local de aldeia em Ipixuna-AM (zona 45, seção 63).

- **Fato, aguarda revisão cética.** 1º turno: 13 = 135, 22 = 61, comparecimento 227. 2º turno: 13 = 167, **22 = 2**, comparecimento 197. Eleitores aptos: 335 nos dois turnos. Lacres sem falha nos dois turnos. Nos dois turnos a seção usou urna de reserva.
- **Hipótese:** mudança de voto em bloco da comunidade entre os turnos, **ou** algo a investigar. O 22 perdeu 59 votos e o comparecimento caiu 30.
- **Pendente:** ler o diário (log) da urna nos dois turnos: troca de urna, horário de encerramento, eleitores liberados sem biometria e avisos de "eleitor já votou". Este teste sozinho não decide.

## Prova de que o teste funciona (contraprova)

- **Fato, aguarda revisão cética.** O modelo sem fraude reproduz o comportamento dos votos reais onde ele deve: no último algarismo, as diferenças em relação a "todos iguais" (17 de 56) somem quando a comparação é com o modelo (0 de 56). Isso mostra que o modelo captura o efeito do tamanho das seções.
- **Fato, aguarda revisão cética.** O mesmo controle mostrou que um teste não serve: Benford no 1º algarismo reprova o modelo sem fraude em 56 de 56 testes. Por isso ele foi descartado.
- **Fato, aguarda revisão cética.** Os testes acusam diferenças quando elas existem nos dados: apontaram o excesso de concentração do 13 nas aldeias, as zonas do Sul com correlação alta para o 22, os desvios do 2º algarismo e o excesso de múltiplos de 10 do 22 no 1º turno (parcial). Eles não estão "cegos".
- **Fato.** As simulações usam semente fixa: rodar os scripts de novo dá os mesmos números.
- **Pendente.** **Não foi feito o teste com fraude simulada** (inserir de propósito, em dados honestos, um enchimento de urna ou números inventados de tamanho conhecido, e ver a partir de que tamanho cada teste acusa). Sem isso, não se sabe o tamanho mínimo de fraude que estes testes conseguiriam ver nos dados brasileiros. Esse tamanho mínimo se chama **poder do teste** (ver glossário).

## Limites

- **Fato (limite dos métodos).** Estes testes procuram fraude **grande o bastante para mudar o desenho dos números**. Eles não detectam:
  - alteração pequena e espalhada por muitas seções;
  - alteração feita por sistema de forma proporcional ao voto de cada seção (ela preserva o formato das distribuições e os algarismos);
  - votos de terceiros liberados sem biometria em proporção ao voto local. Esse voto entra no boletim e no resultado oficial como qualquer outro, e não deixa marca estatística.
- **Risco (princípio 8).** A liberação de eleitor sem biometria depende do mesário, que digita o número do título e o ano de nascimento. Isso é uma brecha que depende só de comportamento humano, e estes testes estatísticos não conseguem dizer se ela foi usada. Ela é examinada pelo diário da urna nas hipóteses H02 e H05 e no tópico 4.
- **Hipótese não medida.** A explicação benigna para a concentração do 13 em aldeias e comunidades é o **voto em bloco** de comunidades pequenas e homogêneas. Esta mesma explicação não exclui pressão sobre o voto dentro da comunidade, que nenhum arquivo público mede.
- **Fato.** A classificação dos locais (aldeia, quilombo) deixa de fora comunidades cujo nome não indica isso. Então parte das seções "comuns" com excesso pode ser de comunidades. Isso não foi medido.
- **Fato.** O modelo de referência usa uma única medida de variação por zona. Em zonas que misturam cidade e aldeia, ele espera menos casos extremos do que seria normal. Isso exagera o "excesso" medido, para os dois candidatos.
- **Fato.** Anomalia estatística, onde existe, também não prova fraude. Ausência de anomalia não prova honestidade.
- **Fato.** Só foi testado o cargo de Presidente. Governador (2º turno em 12 UFs) não foi testado.

## Como repetir

```
node scripts/auditoria/forense-base.mjs 2 && node scripts/auditoria/forense-base.mjs 1
node scripts/auditoria/forense-eleitorado.mjs perfil && node scripts/auditoria/forense-eleitorado.mjs local
for t in 2 1; do
  for s in a3a4 klimek digitos zscore redondos; do node scripts/auditoria/forense-$s.mjs $t; done
  node scripts/auditoria/forense-assimetria.mjs $t
done
node scripts/auditoria/forense-conferir.mjs 2 <uf/município/zona/seção> ...
```

Saídas em `data/parsed/auditoria/forense/` (JSON, CSV, gráficos SVG e registros `log-*.txt`). Detalhes técnicos em [../analysis/forense-estatistica/](../analysis/forense-estatistica/01-dados-e-metodo.md).

## Próximos passos

1. **Pendente:** parecer do revisor cético sobre todos os itens deste tópico.
2. **Pendente:** refazer todos os testes com o 1º turno completo (faltam 13 UFs e o exterior) e comparar seção a seção com o 2º.
3. **Pendente:** comparar com o 2º turno de 2022 nas mesmas seções, principalmente as 110 seções com 100% e a cauda de comparecimento alto. Se o padrão já existia em 2022, é padrão regional estável; se for novo, vira item de investigação.
4. **Pendente:** teste com fraude simulada, para medir o tamanho mínimo de fraude que cada teste detecta.
5. **Pendente:** ler os diários das urnas da seção de Ipixuna-AM (zona 45, seção 63) nos dois turnos.
6. **Pendente:** conferir o lacre da seção do CE (zona 55, seção 160) depois de corrigir a leitura do certificado (H04).
7. **Pendente:** corrigir no doc 07 o número de seções de comparecimento muito alto depois do desconto do perfil (35 no país; o 20 só conta as que já eram extremas sem desconto) e dizer quem venceu cada uma das 35.
8. **Pendente:** modelo de referência mais flexível para o 2º algarismo e sorteio no lugar dos vizinhos para os redondos do 1º turno.
9. **Pendente:** descontar renda (Censo por setor) nas zonas do Sul com correlação alta para o 22, e classificar aldeias e quilombos por coordenada geográfica.
10. **Pendente:** rodar os mesmos testes para Governador.


## Tabela nacional de referência (gerada por script sobre o universo completo do 2º turno)

# Números nacionais do 2º turno (universo completo)

Gerado por `node scripts/auditoria/nacional-resumo.mjs` sobre a cópia de leitura do banco (2026-10-29T09:27:11.866Z). Todas as seções do 2º turno; nenhuma amostra (princípio 9).

## 1. Votos depois das 17h de Brasília

Fonte: diário (log) de cada urna, contagem de "O voto do eleitor foi computado" por hora local, convertida para Brasília pelo fuso de cada município (moda da hora de "urna pronta", que é 08:00 de Brasília). **Exterior:** vota no horário local de cada país, então ali se conta após 17h **locais**. Seções sem horário de "urna pronta" para estimar o fuso: 29.

| Região | Seções com log | Seções com voto após 17h | Votos após 17h | Após 18h | Após 19h | % dos votos do log |
|---|---|---|---|---|---|---|
| Norte | 43.769 | 3.158 | 3.535 | 4 | 0 | 0,03 |
| Nordeste | 140.828 | 8.576 | 9.975 | 462 | 2 | 0,03 |
| Centro-Oeste | 38.048 | 2.704 | 3.045 | 3 | 0 | 0,03 |
| Sudeste | 203.236 | 13.358 | 15.557 | 1.524 | 9 | 0,03 |
| Sul | 72.015 | 2.058 | 2.218 | 0 | 0 | 0,01 |
| Exterior | 1.281 | 252 | 417 | 0 | 0 | 0,11 |
| **Brasil (sem exterior)** | 497.896 | 29.854 | 34.330 | 1.993 | 11 | 0,03 |
| **Total com exterior** | 499.177 | 30.106 | 34.747 | 1.993 | 11 | 0,03 |

Por UF:

| UF | Seções com log | Seções com voto após 17h | Votos após 17h | Após 18h | Após 19h | % dos votos do log |
|---|---|---|---|---|---|---|
| AC | 2.270 | 141 | 158 | 0 | 0 | 0,03 |
| AL | 7.101 | 552 | 646 | 0 | 0 | 0,03 |
| AM | 8.157 | 879 | 1.004 | 0 | 0 | 0,05 |
| AP | 1.914 | 131 | 142 | 0 | 0 | 0,03 |
| BA | 35.476 | 3.449 | 4.190 | 287 | 2 | 0,04 |
| CE | 23.765 | 960 | 1.074 | 1 | 0 | 0,02 |
| DF | 6.969 | 876 | 980 | 2 | 0 | 0,05 |
| ES | 9.844 | 269 | 294 | 0 | 0 | 0,01 |
| GO | 15.686 | 643 | 734 | 0 | 0 | 0,02 |
| MA | 18.093 | 828 | 921 | 10 | 0 | 0,02 |
| MG | 52.062 | 2.084 | 2.253 | 0 | 0 | 0,02 |
| MS | 7.106 | 388 | 422 | 0 | 0 | 0,03 |
| MT | 8.287 | 797 | 909 | 1 | 0 | 0,04 |
| PA | 20.827 | 1.173 | 1.308 | 4 | 0 | 0,03 |
| PB | 10.712 | 416 | 471 | 41 | 0 | 0,02 |
| PE | 21.418 | 1.436 | 1.636 | 113 | 0 | 0,03 |
| PI | 10.225 | 299 | 337 | 1 | 0 | 0,02 |
| PR | 27.142 | 877 | 926 | 0 | 0 | 0,01 |
| RJ | 37.675 | 3.431 | 4.150 | 883 | 4 | 0,04 |
| RN | 8.115 | 372 | 413 | 2 | 0 | 0,02 |
| RO | 4.698 | 496 | 555 | 0 | 0 | 0,06 |
| RR | 1.519 | 135 | 145 | 0 | 0 | 0,05 |
| RS | 27.547 | 748 | 829 | 0 | 0 | 0,01 |
| SC | 17.326 | 433 | 463 | 0 | 0 | 0,01 |
| SE | 5.923 | 264 | 287 | 7 | 0 | 0,02 |
| SP | 103.655 | 7.574 | 8.860 | 641 | 5 | 0,03 |
| TO | 4.384 | 203 | 223 | 0 | 0 | 0,02 |
| ZZ | 1.281 | 252 | 417 | 0 | 0 | 0,11 |

## 2. Habilitação sem digital e parcela do 13

Fontes: BU de cada urna (detalhamento do comparecimento, especificação oficial) e log (liberações com registro do mesário). A "% 13" é a parcela do 13 entre os votos 13 + 22 de **todas** as seções do recorte. Ela mostra onde os votos sem digital aconteceram, não como esses eleitores votaram, porque o voto é secreto (ver H13).

| Recorte | Comparecimento (BU) | Sem biometria cadastrada (ano de nascimento) | Biometria falhou → dado pessoal | Total sem digital | % do comparecimento | Liberações com registro do mesário (log) | % 13 entre 13+22 |
|---|---|---|---|---|---|---|---|
| Norte | 10.317.110 | 376.554 | 560.476 | 937.030 | 9,08 | 385.951 | 50,01 |
| Nordeste | 36.335.632 | 1.658.304 | 2.611.075 | 4.269.379 | 11,75 | 1.795.037 | 69,37 |
| Centro-Oeste | 9.595.354 | 387.894 | 605.894 | 993.788 | 10,36 | 425.854 | 39,99 |
| Sudeste | 52.895.255 | 3.967.830 | 3.421.710 | 7.389.540 | 13,97 | 2.219.043 | 47,24 |
| Sul | 18.711.280 | 861.228 | 1.433.333 | 2.294.561 | 12,26 | 1.015.209 | 37,42 |
| Exterior | 380.612 | 0 | 0 | 0 | 0,00 | 0 | 53,86 |
| **Brasil** | 128.235.243 | 7.251.810 | 8.632.488 | 15.884.298 | 12,39 | 5.841.094 | 51,79 |

Por UF:

| UF | Comparecimento (BU) | Sem biometria cadastrada | Biometria falhou → dado pessoal | Total sem digital | % do comparecimento | Liberações com registro do mesário (log) | % 13 entre 13+22 |
|---|---|---|---|---|---|---|---|
| AC | 453.654 | 15.325 | 22.654 | 37.979 | 8,37 | 15.680 | 33,43 |
| AL | 1.951.632 | 69.950 | 135.874 | 205.824 | 10,55 | 96.551 | 60,77 |
| AM | 2.192.059 | 95.104 | 118.955 | 214.059 | 9,77 | 81.200 | 54,02 |
| AP | 429.975 | 15.323 | 19.685 | 35.008 | 8,14 | 13.775 | 52,88 |
| BA | 9.422.047 | 452.648 | 702.255 | 1.154.903 | 12,26 | 441.566 | 71,31 |
| CE | 6.024.843 | 243.464 | 429.294 | 672.758 | 11,17 | 307.281 | 68,93 |
| DF | 1.868.280 | 59.213 | 84.114 | 143.327 | 7,67 | 59.627 | 45,72 |
| ES | 2.409.214 | 507.891 | 151.401 | 659.292 | 27,37 | 97.838 | 43,63 |
| GO | 4.047.280 | 180.295 | 268.656 | 448.951 | 11,09 | 187.598 | 40,34 |
| MA | 4.127.771 | 150.516 | 259.852 | 410.368 | 9,94 | 170.045 | 69,54 |
| MG | 13.044.203 | 1.502.075 | 887.910 | 2.389.985 | 18,32 | 580.336 | 50,43 |
| MS | 1.594.460 | 67.852 | 115.545 | 183.397 | 11,50 | 82.538 | 40,40 |
| MT | 2.085.334 | 80.534 | 137.579 | 218.113 | 10,46 | 96.091 | 33,94 |
| PA | 4.989.573 | 199.204 | 277.373 | 476.577 | 9,55 | 183.890 | 55,02 |
| PB | 2.743.560 | 82.348 | 199.353 | 281.701 | 10,27 | 147.473 | 67,46 |
| PE | 6.126.467 | 477.992 | 399.764 | 877.756 | 14,33 | 283.892 | 69,20 |
| PI | 2.239.830 | 44.724 | 201.641 | 246.365 | 11,00 | 138.605 | 75,88 |
| PR | 7.059.339 | 49.132 | 493.321 | 542.453 | 7,68 | 367.600 | 37,42 |
| RJ | 10.077.449 | 727.958 | 750.301 | 1.478.259 | 14,67 | 484.610 | 46,90 |
| RN | 2.232.823 | 83.833 | 180.838 | 264.671 | 11,85 | 135.318 | 65,72 |
| RO | 988.489 | 15.945 | 61.938 | 77.883 | 7,88 | 47.466 | 30,39 |
| RR | 308.597 | 9.093 | 12.646 | 21.739 | 7,04 | 9.518 | 27,54 |
| RS | 6.889.638 | 559.431 | 582.380 | 1.141.811 | 16,57 | 398.026 | 42,16 |
| SC | 4.762.303 | 252.665 | 357.632 | 610.297 | 12,82 | 249.583 | 30,58 |
| SE | 1.466.659 | 52.829 | 102.204 | 155.033 | 10,57 | 74.306 | 69,53 |
| SP | 27.364.389 | 1.229.906 | 1.632.098 | 2.862.004 | 10,46 | 1.056.259 | 46,15 |
| TO | 954.763 | 26.560 | 47.225 | 73.785 | 7,73 | 34.422 | 48,63 |
| ZZ | 380.612 | 0 | 0 | 0 | 0,00 | 0 | 53,86 |

