# 06. H26: plano pré-registrado do fechamento (virada para o 13 por zona)

Cientista político, 02/11/2026. **Plano escrito antes de ler, baixar ou calcular qualquer dado novo.** Para escrevê-lo, li só documentos e scripts que já existiam: [virada-zonas/01](../virada-zonas/01-plano.md) a [04](../virada-zonas/04-casos.md), o [parecer cético 34](../cetico-revisor/34-h26-virada-zonas.md), o [doc 04](04-linha-de-base-historica.md) e os cabeçalhos de `virada-zonas*.mjs`, `cetico-34-h26-*.mjs`, `cetico-h06-reproducao-logs.mjs` e `src/dadosabertos.js`. Também listei os nomes dos arquivos em `data/raw/dadosabertos/`, sem abrir nenhum. O resultado sai em `06-h26-resultado-final.md`, depois que este plano estiver num commit próprio.

Rótulos do resultado: **Fato** (sai de script do repo sobre arquivo público, universo completo), **Hipótese**, **Recomendação**, **Pendente**.

## 0. Objetivo e o que este plano não refaz

**Pergunta da H26:** há zonas em que o 13 ganhou, do 1º para o 2º turno, muito mais do que o voto da própria zona no 1º turno explica? Se há, elas se concentram numa região, num modelo de urna ou num horário?

**Já respondido, e não refeito aqui:** a triagem por zona (0 zonas para o 13, 4 para o 22), o contraste por modelo de urna (nenhum |z| ≥ 3 em 30 testes), o pico de horário e as 4 zonas do 22 seção a seção.

**O que fica para fechar a H26:**

| Parte | Pergunta | Por que falta |
|---|---|---|
| (a) | As zonas perto do corte têm algumas seções que carregam o desvio, ou o desvio é da zona inteira? | O doc 04 olhou só as 4 zonas que passaram do corte, todas do lado do 22. Nenhuma zona do lado do 13 foi olhada seção a seção. |
| (b) | A forma da virada de 2026 entre as zonas sai do que aconteceu em 2018 e 2022? | O doc 03 comparou zonas isoladas (correlação, caudas), usando só votos nominais. Não comparou a forma da distribuição, não usou brancos, nulos e abstenção, e não testou o ponto cego da "inserção proporcional ao 13" (parecer 34, A.4). |
| (c) | A associação positiva entre o voto depois das 17h no 2º turno e a virada para o 13 (cerca de 12.900 votos) tem explicação? | Pendente desde o parecer 34, recomendação 2. |

## 1. Regras gerais deste plano

1. **Ordem.** O plano entra num commit antes de qualquer leitura de dado. Mudanças depois de ver os dados são marcadas como **desvio do plano**, com o motivo, e o resultado da regra original é publicado ao lado.
2. **Universo completo.** Todas as seções e zonas, nas 28 UFs (27 + exterior). Exclusões têm contagem e motivo. O exterior é uma zona só: entra nos totais e fica fora dos testes que comparam zonas (z, régua, ICC), como no plano 01.
3. **Neutralidade.** Cada teste roda para os dois lados (13 e 22) e, na linha de base, para os dois finalistas de cada ano. O relatório diz quantos sinais saem de cada lado. Um sinal do lado do 22 é registrado como Fato, mesmo não sendo a pergunta da H26.
4. **Sem acusação por estatística.** Um desvio fora do padrão é um fato que pede explicação, não prova de fraude. Uma explicação política só entra como Hipótese com previsão conferida nos dados (princípio 8).
5. **Sem rede.** Tudo sai de arquivos já baixados. Nenhuma parte depende de resposta do TSE.
6. **Sementes fixas.** Toda reamostragem (bootstrap) e todo sorteio usam semente declarada no script.

## 2. Definições comuns

- **Zona:** UF + número da zona, somando todos os municípios da zona (plano 01, suposição 2).
- **Esperado:** previsão dos votos de cada finalista no 2º turno a partir dos votos do 1º turno da mesma unidade. Mínimos quadrados (MQ) por UF, sem intercepto. Preditores: cada candidato com 2% ou mais dos votos no país, os demais somados, brancos + nulos, abstenção. As UFs com poucas unidades usam o ajuste da região, como no doc 03 (AC, AP, RO, RR e DF; a lista de cada ano é a do doc 03).
- **Virada além do esperado:** (resíduo do 13 − resíduo do 22) da unidade, em votos e em p.p. dos votos nominais do 2º turno. Na linha de base, o mesmo com os dois finalistas do ano.
- **z robusto:** resíduo líquido ÷ √(nominais do 2º turno), centrado na mediana da região e dividido por 1,4826 × MAD das zonas da região (MAD: mediana dos desvios absolutos, uma régua que poucos valores extremos não movem).
- **Corte do plano 01:** q de Benjamini-Hochberg (BH, correção para muitos testes ao mesmo tempo) < 0,01 e virada além do esperado ≥ 2 p.p.
- **Lado de quem cresceu:** em 2018, o 13 (contra o 17); em 2022, o 22 (contra o 13); em 2026, o 13 (contra o 22). A comparação principal entre os anos é pelo lado de quem cresceu, porque a pergunta é se o crescimento de 2026 tem forma diferente. A comparação pelo partido (lado do 13 em todos os anos) sai como conferência secundária.
- **Margem do resultado:** 64.256.232 − 59.826.041 = 4.430.191 votos. Muda o vencedor uma inserção de 4.430.191 votos a mais para o 13, ou uma troca de 2.215.096 votos do 22 para o 13.

## 3. Parte (a): zonas perto do corte, seção a seção

### 3.1 Quais zonas

A lista é fixada agora, por regra, e depende só de resultados já publicados:

- **Z1:** toda zona com |z| ≥ 2,5 na especificação do plano 01, dos dois lados (sai de `data/parsed/auditoria/virada-zonas/zonas.csv`);
- **Z2:** toda zona que passa do corte em pelo menos uma das 5 variantes do parecer 34 (régua por UF, por região × tamanho, em p.p., variância que cresce com o tamanho, pesos restritos a [0, 1]), dos dois lados (sai de `data/parsed/auditoria/cetico-revisor/34-h26-reproduz.json` e `34-h26-zonas.csv`).

As zonas examinadas são Z1 ∪ Z2. A lista entra no resultado antes de qualquer número seção a seção. Já se sabe que ela inclui as 22 zonas com z ≥ 3, as 17 com z ≤ −3, AM 0042, GO 0047, GO 0028, BA 0014 e SC 0013.

### 3.2 Medidas por seção

Para cada seção do país (não só das zonas examinadas), com o modelo do plano 01 refeito por UF:

- **t da seção:** resíduo líquido da seção ÷ √(nominais do 2º turno da seção);
- **t centrado:** t da seção menos a mediana dos t da sua zona. Assim se mede quanto a seção se afasta da **própria zona**, e não da UF. Uma zona inteira deslocada não gera seções extremas por isso;
- **estrato:** região × quintil de aptos da seção.

### 3.3 Teste A1: seções extremas dentro da zona

- **Régua nacional:** os percentis 0,01% e 99,99% do t centrado, por estrato, calculados com todas as seções do país **fora** das zonas examinadas.
- **Contagem:** nas zonas examinadas, quantas seções passam do percentil 99,99% (lado do 13) e quantas ficam abaixo do 0,01% (lado do 22).
- **Esperado por acaso:** 0,0001 × número de seções examinadas, de cada lado.
- **Teste:** Poisson unilateral, um por lado. **Corte:** p < 0,005 em cada lado (Bonferroni: 0,01 dividido pelos 2 lados).
- Toda seção que passa da régua entra numa lista, com ou sem significância da contagem.

### 3.4 Teste A2: concentração do desvio da zona

- **Medida:** parte do resíduo líquido da zona que vem dos 10% de seções mais extremas no sentido da zona. É a mesma medida do doc 04. Se o desvio é espalhado por igual, ela fica perto de 10%. Se vem de poucas seções, fica perto de 100%.
- **Nulo (o que se espera sem concentração):** 10.000 zonas simuladas com o mesmo número de seções, o mesmo deslocamento médio e os mesmos nominais. O ruído de cada seção é sorteado dos t centrados do mesmo estrato, das seções fora das zonas examinadas, e volta à escala de votos multiplicado por √nominais.
- **p da zona:** fração das simulações com concentração ≥ a observada.
- **Corte:** BH sobre as zonas examinadas, q < 0,01, separado por lado.

### 3.5 Conferência no bruto de cada seção listada

Para cada seção que passa em A1, e para as 3 seções de maior peso de cada zona que passa em A2, confiro:

1. BU × resultado oficial por seção (`voto_oficial`);
2. aptos do 1º × 2º turno (mudança acima de 5% indica agregação ou remanejamento de seção, e então o 1º turno não prevê o 2º);
3. seção nova (sem par em 2022 no `votacao_secao_2022` pela chave município/zona/seção);
4. troca de urna entre turnos, RED ou urna de contingência (`secao.tipo_arquivo`, `numero_interno_urna`, `modelo_urna`);
5. habilitação do comparecimento (`sem_biometria`, `por_biometria`, `por_biografia`) e da variação entre turnos; liberação pelo mesário no log (`perfil_log`);
6. votos depois das 17h e hora de encerramento;
7. maior rajada sem biometria em 10 minutos (`perfil_log`);
8. as outras seções do mesmo local de votação (`secao.local`): o desvio é do prédio ou só da seção?
9. a mesma seção, ou o mesmo local, no 2º turno de 2022 (virada da seção em 2022, quando a chave existir).

**Explicação por rastro técnico** só vale com os itens 2, 3 ou 4: são os casos em que o próprio arquivo mostra por que o 1º turno não prevê o 2º. Os itens 5 a 9 descrevem o caso. Uma explicação política, como um reduto, uma aldeia ou um local de votação com eleitorado próprio, fica como Hipótese.

### 3.6 Decisão da parte (a)

- **Sinal (S) do lado do 13**, se ao menos um destes ocorrer:
  - A1 do lado do 13 com p < 0,005, e as seções extremas sem rastro técnico somam mais da metade dos votos de resíduo das seções extremas desse lado;
  - alguma zona do lado do 13 com A2 q < 0,01, e as 3 seções de maior peso dela sem rastro técnico.
- **Sem sinal (L):** nenhum dos dois.
- O mesmo critério, do lado do 22, gera um Fato registrado à parte.
- **Comparação dos lados:** teste binomial exato do número de seções extremas do 13 contra o do 22, condicionado ao total, com probabilidade igual à parte de seções examinadas em zonas de cada lado. Só descritivo, sem entrar na decisão.

## 4. Parte (b): linha de base de 2018 e 2022

### 4.1 Dois níveis

| Nível | Unidade | Anos | Dados | Papel |
|---|---|---|---|---|
| **A (principal)** | município × zona | 2018, 2022, 2026 | candidatos do `votacao_candidato_munzona_<ano>`; brancos, nulos, abstenção, aptos e comparecimento do `detalhe_votacao_secao_<ano>`, somados por município × zona | decide |
| **B (robustez)** | seção | 2022, 2026 | `votacao_secao_2022_BR` (com 95 = branco e 96 = nulo) + `detalhe_votacao_secao_2022`; 2026 pelo caminho do plano 01 | confirma ou contradiz o nível A |

- O nível A usa a mesma especificação nos três anos, inclusive 2026, que é refeito por esse caminho. Não comparo o 2026 por seção com o 2018 por município × zona.
- Preditores do 1º turno com 2% ou mais no país: 2018 com 13, 17, 12, 45 e 30; 2022 com 13, 22, 15 e 12; 2026 com 13, 22, 70, 14 e 55. Os demais são somados, como no doc 03. Se as contas do arquivo derem outra lista, vale a regra dos 2%, e a mudança vai como desvio do plano.
- O `votacao_secao` de 2018 não está baixado. O nível B não tem 2018. Isso não muda a decisão, que é do nível A.

### 4.2 Estatísticas comparadas (a família de testes)

Cada estatística é calculada para 2018, 2022 e 2026 no nível A, e para 2022 e 2026 no nível B.

| # | Estatística | O que mede | Direção que conta como sinal a favor de quem cresceu |
|---|---|---|---|
| B1 | Dispersão: 1,4826 × MAD da virada além do esperado das zonas (p.p.) | Se a virada foi mais desigual entre as zonas | maior |
| B2g / B2p | Zonas com z ≥ 3 do lado de quem cresceu (g) e do outro lado (p) | Peso da cauda | maior |
| B3g / B3p | Zonas que passam do corte do plano 01, de cada lado | O que a triagem acenderia | maior |
| B4g / B4p | Peso do 1º turno de cada finalista sobre ele mesmo no 2º turno, média das UFs ponderada pelos votos do finalista (o número de UFs com peso > 1 sai como descrição, sem teste) | A marca de uma inserção proporcional ao próprio voto, que o esperado absorve (parecer 34, A.4) | maior |
| B5 | Inclinação, dentro da UF, da virada além do esperado (lado de quem cresceu) sobre a variação de comparecimento da zona (p.p. dos aptos) | Se o ganho além do esperado vem junto com eleitor a mais | maior |
| B6a / B6b | Correlação intraclasse (ICC, quanto as zonas de uma mesma cidade se parecem) dos z das zonas de um mesmo município; municípios que passam do corte na triagem por município (mesma regra, unidade = município) | Efeito de cidade inteira, como Salvador | maior |
| B7a / B7b | Parte das zonas em que quem cresceu melhorou a margem; coeficiente de variação da virada bruta (desvio robusto ÷ virada nacional) | Uniformidade do deslocamento | parte maior; coeficiente menor |

São **12 comparações**: B1, B2g, B2p, B3g, B3p, B4g, B4p, B5, B6a, B6b, B7a e B7b. A correção para múltiplas comparações é de Bonferroni: cada intervalo tem confiança de 1 − 0,05/12, ou seja, **99,58%**.

### 4.3 Incerteza e o corte "dentro" × "fora do padrão"

- **Bootstrap:** 5.000 reamostragens das unidades dentro de cada UF, com reajuste completo do MQ, do z, do BH e do corte em cada reamostragem. Gera o intervalo de 99,58% de cada estatística em cada ano.
- **"Fora do padrão"**, para uma estatística: o intervalo de 2026 **não toca** a união dos intervalos de 2018 e 2022.
- **"Dentro do padrão":** o intervalo de 2026 toca essa união.
- **Sinal (S) da parte (b):** pelo menos uma estatística fora do padrão no nível A, na direção da tabela, a favor do 13, e o nível B, onde a estatística existe, sem contradizer (o 2026 no nível B não fica do lado oposto do 2022). Fora do padrão na direção contrária, ou a favor do 22, é registrado como Fato e não entra como sinal da H26.
- **Sem sinal (L):** todas as estatísticas dentro do padrão, ou fora só na direção sem sinal.
- **Não decidível (N):** se uma estatística não puder ser calculada igual nos três anos, por falta de coluna ou por fechamento que não bate (seção 6), ela sai da família, e o motivo é registrado. Se B4 ou B5 saírem, a parte (b) é N para o ponto cego correspondente.
- **Limite declarado agora:** duas eleições formam uma linha de base curta. "Dentro do padrão" quer dizer "dentro do que já aconteceu em 2018 ou 2022", e não "normal" em sentido absoluto. 2014 não está baixado. Se o resultado ficar na fronteira, a Recomendação é baixar `votacao_candidato_munzona_2014` e `detalhe_votacao_secao_2014` (CDN do TSE, dado público), com autorização do coordenador.

### 4.4 Poder: o que a linha de base enxergaria

Insiro votos simulados no 2026 do nível A, refaço as 12 estatísticas e a triagem do plano 01, e meço o menor total inserido que leva a parte (b), ou a triagem, a acender em pelo menos 80% de 200 sorteios. As formas de inserção, fixadas agora:

| Forma | Como |
|---|---|
| F1 | Proporcional ao voto do 13 no 1º turno, em todas as UFs (acréscimo) |
| F2 | Proporcional ao voto do 13, só nas UFs do Nordeste; depois, só nas do Sudeste |
| F3 | O mesmo número de votos por seção, no país |
| F4 | Só nas 27 capitais, proporcional aos nominais |
| F5 | Troca do 22 para o 13, proporcional ao voto do 22 |
| F6 | 5 p.p. em 10% das zonas sorteadas, aumentando o total até acender |

Para cada forma, o resultado diz o menor total que seria visto e se ele fica abaixo do que muda o vencedor (4.430.191 votos a mais, ou 2.215.096 trocados).

### 4.5 Leitura política que acompanha (não decide)

- 2º turno para governador por UF em cada ano, lido no `detalhe_votacao_secao` (cargo 3, turno 2): B5 e B7 por grupo de UFs com e sem 2º turno de governador. Isso testa o "efeito de arrasto": quem volta para votar no governador também vota para presidente.
- Separação do aumento de votos nominais de 2026 (+4,0%, doc 04) entre comparecimento e queda de brancos e nulos, nos três anos. É a Recomendação pendente do doc 04, agora com o `detalhe`.
- Correlação, zona a zona, entre os anos (o doc 03 já deu 0,29 com 2018), só para conferir com o nível A.

## 5. Parte (c): voto do fim do dia

### 5.1 Universo e dados

- **Todas as seções do 2º turno** entram na regressão (497.896 com log nos dois turnos, a contagem do doc 02).
- **Voto tardio:** votos computados às 17:00:00 de Brasília ou depois, no 2º turno, contados pelo diário da urna, com o fuso do plano 01 (moda da abertura do município − 8 h e exceções de `relogio-fora-do-fuso.csv`).
- **Tipo de liberação de cada voto tardio**, pelo diário: biometria; ano de nascimento; dado pessoal conferido pelo mesário; não identificado. A regra é a mesma do parser de `cetico-h06-reproducao-logs.mjs`.
- **Fonte:** reaproveito `data/parsed/auditoria/cetico/h06-reproducao-logs.jsonl` **só se** cobrir todas as seções com voto tardio pelo `votosPorHoraLocal` do `perfil_log`. Cada seção que faltar é lida de novo do diário bruto (urnas extraídas no F:), com o mesmo parser, num processo só. A contagem do que foi relido sai no resultado.
- **Conciliação H06 (grupos, fixados agora):**
  - **G1:** seções de Salvador, Feira de Santana e Lauro de Freitas, os municípios da Reclamação 101.673/BA;
  - **G2:** demais seções com encerramento às 19:00 de Brasília ou depois (`secao.encerramento`, convertido pelo mesmo fuso);
  - **G3:** demais seções com voto tardio;
  - **G0:** seções sem voto tardio.
- **Votos depois do "Todas as pessoas presentes já votaram? SIM"**, por seção, do mesmo jsonl ou da releitura.

### 5.2 Modelo

- **Resposta:** resíduo líquido da seção (13 − 22 além do esperado), em **votos**, do modelo do plano 01.
- **Variáveis de interesse:** votos tardios do 2º turno separados por tipo de liberação, `L_bio`, `L_ano`, `L_dado` e `L_nid`, cada um com interação por grupo G1, G2 e G3.
- **Controles:** efeito fixo de zona; parcela de votos às 15h ou depois e às 17h ou depois no 1º turno (efeito de lugar e de fila); parcela às 15h ou depois no 2º turno; log dos aptos; variação do comparecimento; parcela do 13 e abstenção no 1º turno.
- **Erro-padrão:** agrupado por zona.
- **Conferência de sanidade:** a especificação do parecer 34 em p.p. tem de reproduzir +0,39 (z ≈ 7) desde as 17h, com no máximo 0,01 de diferença. Sem isso, a parte (c) não segue.

### 5.3 Testes (família de 3; corte |z| ≥ 3, que dá α de família abaixo de 0,01)

| # | Pergunta | Estatística | Sinal (S) se |
|---|---|---|---|
| C1 | A associação vem da liberação sem digital (o caminho do mesário)? | z de (β das liberações sem digital juntas, `L_ano` + `L_dado`) − β de `L_bio` | z ≥ 3, **e** β_sem_digital × votos tardios sem digital ≥ 50% da associação total em votos |
| C2 | Há margem a mais onde houve voto depois de o mesário responder que todos já tinham votado? | coeficiente dos votos depois do SIM, com os mesmos controles | z ≥ 3 na direção do 13 (z ≤ −3 é registrado como Fato do lado do 22) |
| C3 | A associação fica onde houve a prorrogação? | β de voto tardio em G3, fora de G1 e G2 | não gera S; decide qual explicação política sobra (abaixo) |

**O que cada explicação prevê:**

- **E2, prorrogação por falta de transporte:** associação concentrada em G1 e G2; em G3, |z| < 3.
- **E3, eleitor tardio diferente** (mais jovem, trabalha, depende de transporte): associação também em G3, nas 5 regiões, com β parecido entre os tipos de liberação.
- **P1, liberação manual no fim do dia:** C1 positivo.
- **Limite aritmético:** a associação não pode passar do total de votos tardios. Se ela passar dos votos tardios sem digital, P1 sozinho não a explica. Esse limite é conta, não teste, e sai no resultado.

### 5.4 Decisão da parte (c)

- **S:** C1 ou C2 com sinal na direção do 13.
- **L (sem sinal de processo):** C1 e C2 sem sinal. O resultado diz se E2 ou E3 é a explicação compatível, pelo C3, sempre como Hipótese. Pelo sigilo do voto, nenhum arquivo público mostra em quem o eleitor tardio votou.
- **N:** se mais de 5% dos votos tardios ficarem com liberação "não identificada" no diário, ou se a releitura não cobrir todas as seções com voto tardio. O resultado diz quais seções faltam e qual arquivo público as cobriria.
- Também sai no resultado: mesmo que todos os 34.330 votos tardios fossem do 13, o efeito máximo seria 0,77% da margem. A parte (c) não tem como mudar o vencedor.

## 6. Conferências obrigatórias, antes de qualquer teste

| Conferência | Critério |
|---|---|
| `munzona` × `detalhe` em cada ano (nível A) | soma dos votos nominais de presidente por município × zona e turno igual nos dois arquivos; divergência listada e, se passar de 0,1% dos votos da UF, a UF sai do nível A daquele ano, com motivo |
| Totais nacionais por ano | finalistas e comparecimento iguais ao total do próprio arquivo e aos números do doc 03 (viradas de +6,49, −3,43 e +5,44 p.p. no `munzona`) |
| Fechamento do comparecimento | comparecimento = nominais + brancos + nulos (+ anulados em separado, quando existir), por unidade, como no `cetico-lbh-dados.mjs` |
| 2022 por seção (nível B) | `votacao_secao_2022` somado por município × zona igual ao `munzona_2022`; pares de seção entre os turnos contados, e seções sem par listadas |
| 2026 nível B | reproduz o plano 01: 0 zonas para o 13, as mesmas 4 para o 22, z das 4 com no máximo 0,01 de diferença |
| Parte (c) | 34.330 votos tardios e 29.853 seções (doc 02) ou a diferença explicada (29.854 no doc 02 da linha do tempo) |
| Bruto | cada seção listada na parte (a) conferida via `src/exportar.js` antes de virar Fato |

## 7. Conclusão final da H26 (regra fixada agora)

Cada parte termina como **S** (sinal), **L** (sem sinal) ou **N** (não decidível). Só os sinais na direção do 13 entram. Os do lado do 22 são publicados como Fato à parte.

| Situação | Conclusão da H26 |
|---|---|
| Alguma parte com S | **Fato que pede explicação.** O texto diz qual medida, onde, quanto em votos, e o que a explicação política prevê e se os dados batem |
| Nenhum S, alguma parte com N | **Não decidível com dados públicos.** O texto diz exatamente qual dado público falta, com nome do conjunto e campo |
| (a), (b) e (c) com L, e toda forma de inserção de F1 a F6 do tamanho que muda o vencedor é vista com poder ≥ 80% | **Refutada**, para as formas testadas. O texto diz o menor total visível de cada forma |
| (a), (b) e (c) com L, mas alguma forma do tamanho que muda o vencedor passa sem ser vista | **Sem sinal nos dados públicos.** O texto diz qual forma e de que tamanho passaria |

O que esta regra **não** cobre, e o texto final vai dizer: uma manipulação dentro da urna que escreva o BU e o diário de forma coerente, e que imite a geografia de 2018 e 2022. Isso é pergunta das H05 e H16, não da H26.

## 8. Arquivos que vou ler (e nenhum outro)

**Dados abertos (F:, já baixados, sem rede):**
- `data/raw/dadosabertos/votacao_candidato_munzona/votacao_candidato_munzona_2018.zip`, `_2022.zip` e `_2026.zip`;
- `data/raw/dadosabertos/detalhe_votacao_secao/detalhe_votacao_secao_2018.zip`, `_2022.zip` e `_2026.zip` (o de 2020 não);
- `data/raw/dadosabertos/votacao_secao/votacao_secao_2022_BR.zip`.

**Banco e saídas já existentes:**
- cópia de leitura indicada por `data/db/leitura/atual.json`, via `abrirLeitura()`: tabelas `secao`, `voto_bu`, `voto_oficial` e `perfil_log`;
- `data/parsed/auditoria/estatistico-eleitoral/pares-banco.csv`;
- `data/parsed/auditoria/virada-zonas/zonas.csv`, `historico-zonas.csv`, `resumo.json` e `relogio-fora-do-fuso.csv` (ou o caminho usado por `virada-zonas.mjs`);
- `data/parsed/auditoria/cetico-revisor/34-h26-reproduz.json` e `34-h26-zonas.csv` (só para a lista Z2);
- `data/parsed/auditoria/cetico/h06-reproducao-logs.jsonl` (parte c, com a conferência de cobertura).

**Bruto (F:):** os diários das seções com voto tardio que faltarem no jsonl, e o BU e o diário das seções listadas na parte (a), via `src/perfil-secoes.js:lerLogs` e `src/exportar.js`.

**Não leio:** `data/private/`, os zips de 2026 movidos para L:, e nada por `find` em `data/raw`.

## 9. Saídas da etapa 2

- **Scripts** (Node 24, sem dependências, só leitura):
  - `scripts/auditoria/politico-h26-lib.mjs`: MQ, z, BH, bootstrap, leitura dos zips;
  - `politico-h26-a-secoes.mjs`: parte (a);
  - `politico-h26-b-historico.mjs`: parte (b), níveis A e B;
  - `politico-h26-b-poder.mjs`: poder, formas F1 a F6;
  - `politico-h26-c-tardio.mjs`: parte (c).
- **Dados:** `data/parsed/auditoria/cientista-politico/h26-*.json` e `.csv`.
- **Resultado:** `docs/analysis/cientista-politico/06-h26-resultado-final.md`, com os comandos para reproduzir, as conferências da seção 6, os desvios do plano (se houver) e a conclusão da seção 7.
- Recursos: no máximo 2 processos pesados ao mesmo tempo, para não disputar com os outros agentes.
