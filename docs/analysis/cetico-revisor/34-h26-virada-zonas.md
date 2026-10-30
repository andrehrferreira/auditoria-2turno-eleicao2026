# 34. Parecer: H26, triagem das zonas com virada para o 13

Achado revisado: [virada-zonas/01-plano.md](../virada-zonas/01-plano.md) e [virada-zonas/02-resultado.md](../virada-zonas/02-resultado.md), script `scripts/auditoria/virada-zonas.mjs` (commit 6d1175a), saídas em `data/parsed/auditoria/virada-zonas/`.

Data: 30/10/2026. Base: cópia de leitura `eleicao2026-20261029T105000` (28 UFs nos dois turnos). Rótulos: **Fato** (sai de script do repo sobre arquivo público, universo completo), **Hipótese**, **Recomendação**, **Pendente**. Sem rede.

Fora deste parecer, por pedido do coordenador: a linha de base de 2018/2022 ([03](../virada-zonas/03-linha-de-base.md)), as 4 zonas do 22 seção a seção ([04](../virada-zonas/04-casos.md)) e a conciliação dos votos depois das 17h com a H06.

> **Termos.**
> - *Esperado*: o que a zona "deveria" dar ao 13 e ao 22 no 2º turno, previsto pelos votos da própria zona no 1º turno. Os pesos são estimados por UF com mínimos quadrados (MQ), sem intercepto.
> - *Além do esperado*: o que sobra depois de tirar a previsão. É o resíduo do 13 menos o resíduo do 22, em pontos percentuais (p.p.) dos votos nominais do 2º turno.
> - *z robusto*: quantas "réguas" a zona está longe do meio da sua região. A régua é o MAD, uma medida de dispersão que não se deixa levar por poucos valores extremos.
> - *q de BH*: o p-valor corrigido por Benjamini-Hochberg, porque são 2.640 zonas testadas de uma vez.
> - *Poder*: a chance de o teste acender quando existe mesmo um efeito de certo tamanho.

## Resposta curta

- **Os números se reproduzem por outro caminho.**
  - Refiz tudo do banco com código próprio: extração, MQ por Cholesky, MAD, BH e o corte. Não usei `pares-banco.csv` nem as bibliotecas do autor.
  - Batem: 499.207 seções, os votos do 13 e do 22 nos dois turnos, os coeficientes (diferença máxima 0,00005), o z de cada zona (diferença máxima 0,005) e as 4 zonas fora da curva, as mesmas.
  - Também batem a virada geral, os picos de horário, as duas inclinações e as parcelas de biometria da cauda.
  - O BU de presidente é igual ao resultado oficial por seção, candidato a candidato, nas 499.207 seções dos dois turnos (0 divergência).
- **"0 zonas fora da curva para o 13" vale só para a especificação do plano e tem pouco poder.**
  - **Poder.** Para uma zona acender, é preciso inserir nela, em média, **4,6 p.p. dos votos nominais** (mediana de 1.639 votos, uns 11 por seção). Nas zonas pequenas, 7,3 p.p.; nas grandes, 2,8 p.p. Se o voto for trocado do 22 para o 13, basta metade disso.
  - **Inserção em muitas zonas.** Inserindo 5 p.p. em 25% das zonas de SP, só 30% delas acendem.
  - **Inserção na UF inteira.** Some por completo. O próprio plano já dizia isso.
  - **Inserção na capital inteira.** Fica cerca de metade. Exemplo: 5 p.p. em todas as 17 zonas de Fortaleza, uns 78 mil votos, não acendem nenhuma.
  - **Robustez.** Com outras escolhas razoáveis de régua ou de modelo, aparecem de 1 a 9 zonas para o 13: régua por UF, 5; coeficientes restritos a [0, 1], 9.
- **O teste de horário foi lido ao contrário.**
  - A inclinação negativa reproduz exatamente (−0,017 e −0,035). Mas ela vem do horário do **1º** turno, porque depois das 17h há 3,0% dos votos no 1º turno e 0,027% no 2º.
  - Separando os dois turnos, dentro da zona, **a seção que votou mais tarde no 2º turno virou mais para o 13**, não menos: +0,069 p.p. de virada por p.p. de votos depois das 15h (z 22) e +0,39 por p.p. depois das 17h (z 7). As seções com algum voto depois das 17h viraram +0,18 p.p. a mais que a própria zona (z 7,6, com controles). O sinal aparece nas 5 regiões.
  - O tamanho é pequeno: cerca de 12.900 votos de margem, 0,19% da virada nacional de 6.655.156 votos.
  - O teste do autor não tinha poder para o caso que devia cobrir. Inserindo 20 votos do 13 depois das 17h em 1% das seções (~99 mil votos), a inclinação continua negativa (z −3,1).
- **Modelo da urna: a conclusão fica, a régua muda.**
  - O estimador do autor dilui o desvio. Ele divide pelos votos de todas as seções do modelo, inclusive as de zonas que só têm aquele modelo, onde o desvio é zero por construção. São 65% dos votos das UE2020/UE2022.
  - O contraste certo, cada modelo contra as outras urnas da mesma zona, dá UE2015 −0,11 p.p. (z −2,8) e UE2013 +0,09 (z 1,5). Nada significativo.
  - O teste enxergaria desvios de 0,11 a 0,18 p.p., não de 0,04.
- **Cauda do 13: biometria e comparecimento reproduzem, mas nenhum script do autor gera esses números.**
  - As definições estão certas.
  - O campo de biometria do BU bate com a contagem de biometria do log em 99,997% das seções.
  - A biometria é um argumento contra a "liberação manual em massa", não contra qualquer inserção.
  - Um caso não cabe na hipótese "volta do eleitor": RJ 0075 tem z 3,48 com o comparecimento **caindo** (−1.255 eleitores).

## Vereditos

| # | Afirmação do autor | Veredito |
|---|---|---|
| 1 | Corte do plano (q < 0,01 e ≥ 2 p.p.): 0 zonas para o 13, 4 para o 22 (MA 0032, SP 0002, CE 0020, BA 0105) | **Sustentado com ressalvas.** Reproduzido exatamente. Ressalvas: (a) o poder é baixo (seção A); (b) o resultado não resiste a variações razoáveis do método, que dão de 0 a 9 zonas para o 13 e de 3 a 8 para o 22 (seção B); (c) o z não está calibrado: |z| ≥ 3 acontece 6 vezes mais que na normal, |z| ≥ 4 de 25 a 90 vezes mais. As 4 do 22 também não são "raras" na escala que o q sugere. O texto tem de dizer até onde a triagem enxerga (uma inserção de 3 a 7 p.p. numa zona, mais nas muito pequenas), e não "nenhuma zona fora da curva" sem limite. Exemplo: AM 0042 (32 seções) já está +7,04 p.p. além do esperado, não passa e precisaria de mais 5,5 p.p. |
| 2 | Virada geral: +5,44 p.p.; 2.626 de 2.641 zonas; 128 viraram 22→13; nenhuma 13→22; maior desvantagem virada 7,77 p.p. | **Sustentado.** Tudo reproduzido (margens −1,86 → +3,57; 15 zonas para o 22, a pior RS 0129 com −1,47; percentis 0,51 / 5,09 / 9,08; 127 zonas com o 22 à frente por menos que 5,44). Ressalva de leitura: uma virada uniforme é o que a triagem **não** vê (item 1 e seção A.4). "Geral, não concentrada" descreve a distribuição, mas não serve de argumento contra uma inserção espalhada |
| 2b | "O peso do 22 no 1º turno sobre o 13 no 2º fica entre −0,08 e +0,04: não há sinal de eleitor do 22 que passou para o 13" (Fato) | **Rebaixar para Hipótese.** O número reproduz, mas 132 dos 504 coeficientes saem de [0, 1] (77 negativos, 55 acima de 1). Exemplos: Zema → 13 de −0,42 (DF) a −0,30 (CE, RR); Zema → 22 = 1,71 (AC). Um peso de transferência negativo é impossível. Esses pesos preveem, mas não medem quem foi para onde. O próprio doc diz isso duas linhas antes |
| 3 | Modelo da urna sem efeito dentro da zona (maior |z| 2,77 em 56 linhas; nenhum desvio acima de 0,04 p.p.) | **Sustentado com ressalvas.** Maior |z| reproduzido (2,77, as 7 seções UE2013 → UE2022 do Sudeste). O estimador dilui o desvio (seção E). Com o contraste certo, continua sem efeito, mas a frase "acima de 0,04 p.p." deve virar "o teste enxergaria de 0,11 a 0,18 p.p.". A comparação "4 zonas fora da curva com 9,85% de urnas antigas contra 20,04%" tem n = 4 e deve sair |
| 4a | Pico: 11h no 1º turno (1.309 zonas; 275 às 15h ou 16h) → 8h no 2º (1.897 zonas; nunca depois das 12h) | **Sustentado.** Reproduzido exatamente, com fuso calculado por código próprio. Votos depois das 17h: 3.723.358 e 34.330 |
| 4b | "Dentro da zona, a seção que votou mais tarde virou **menos** para o 13" (−0,017 desde 15h; −0,035 desde 17h) | **Refutado como leitura** (números reproduzidos). A variação Δ = parcela tardia no 2º turno − parcela no 1º mede sobretudo o 1º turno. Separando, a parcela tardia do **2º** turno tem associação **positiva** com a virada para o 13, nas 5 regiões, com e sem controles. O teste também não tinha poder (seção C). A frase precisa ser trocada, e a associação positiva, pequena, precisa entrar como achado a explicar |
| 5a | Cauda do 13 (22 zonas, z ≥ 3): comparecimento +3,90 p.p., 1,28 acima da UF | **Sustentado com ressalvas.** Reproduzo 3,93 e 1,29, uma diferença pequena de definição. **Nenhum script do repo gera esses números.** O doc 02 os dá como Fato sem comando. Comparecimento acima da UF não separa as hipóteses: encher a urna também sobe o comparecimento. Entre as zonas, a correlação de z com o comparecimento acima da UF é de 0,22 |
| 5b | 82,1% do aumento por biometria (78,3% nas demais), 10,5% sem digital, 7,4% por ano de nascimento | **Sustentado com ressalvas.** Reproduzido (82,15 / 10,50 / 7,35 contra 78,28 / 10,49 / 9,84; nas demais zonas das mesmas UFs, 78,63 / 11,62 / 9,75). As definições conferem (seção D). Mesmas ressalvas: sem script do autor; o argumento vale contra a liberação pelo mesário, não contra manipulação dentro da urna; é heterogêneo (RJ 0161, 35% sem digital; RJ 0075 sem aumento) |
| 6 | Reprodutibilidade e pré-registro | **Ressalva.** O plano (corte "fixado antes") e o resultado entraram no mesmo commit (6d1175a). Não acuso nada, só não há rastro técnico da ordem. Recomendação já feita no parecer 33 (V7) |

## A. Poder da triagem (o pedido principal)

**Como medi (Fato, `cetico-34-h26-poder.mjs`).**

- Insiro votos simulados para o 13 e refaço **tudo**: o MQ da UF, com a inserção entrando nas seções do ajuste, o esperado de todas as zonas da UF, a mediana e o MAD da região, o BH nas 2.640 zonas e o corte.
- A conta é exata em forma fechada: a inserção muda Xᵀy da UF.
- Dois modos:
  - **acréscimo**: votos a mais para o 13, que sobem o comparecimento;
  - **troca**: voto do 22 que vira voto do 13.
- Os votos são repartidos entre as seções da zona na proporção do comparecimento.
- Sanidade: sem inserção, o script devolve 0 zonas para o 13 e 4 para o 22, como o autor.

### A.1 Uma zona por vez (todas as 2.640 zonas, busca binária)

| Grupo | Acréscimo que acende: mediana (p10–p90) | Em votos (mediana) | Votos por seção | Troca que acende (mediana) | Zonas que acendem com ≤ 2 / 3 / 5 / 10 p.p. de acréscimo |
|---|---|---|---|---|---|
| Brasil | **4,6 p.p.** (2,3–8,1) | 1.639 | 11 | 2,25 p.p. (801 votos) | 178 / 573 / 1.494 / 2.555 |
| Quintil 1 (zonas menores, ~15 mil nominais) | 7,3 p.p. (5,0–10,7) | 1.109 | 16 | 3,5 p.p. | 0 / 2 / 52 / 453 de 528 |
| Quintil 5 (zonas maiores, ~93 mil nominais) | 2,8 p.p. (1,6–4,2) | 2.675 | 7 | 1,4 p.p. | 99 / 300 / 514 / 528 de 528 |
| Norte | 6,5 p.p. | 1.768 | 13 | 3,2 p.p. | 1 / 21 / 83 / 206 de 252 |
| Sul | 3,9 p.p. | 1.137 | 9 | 1,9 p.p. | 54 / 145 / 317 / 451 de 451 |

- **Como ler o limiar:** é a inserção que se soma ao estado real da zona. Uma zona que já tem resíduo positivo precisa de menos; uma com resíduo negativo, de mais.
- **Fato:** o esperado "engole" uma parte pequena da inserção na própria zona: mediana de 1,4%, 99º percentil de 17%. As maiores perdas são em UFs com poucas zonas: RR 0001, 51%; TO 0029, 46%; AC 0009, 39%.
- **Fato:** o que limita é a régua, não a absorção. O BH, com 2.640 zonas, exigiu na prática |z| ≥ 4,36. Com MAD de cerca de 2 na escala resíduo/√n, isso dá uns 9 votos de margem por raiz de voto nominal.

### A.2 Várias zonas da mesma UF (40 sorteios por cenário, acréscimo de 5 p.p.)

| UF (zonas) | 1% das zonas | 5% | 10% | 25% | 100% |
|---|---|---|---|---|---|
| SP (393) | 66% acendem | 71% | 64% | 30% | 0% |
| BA (199) | 50% | 44% | 43% | 28% | 0% |
| GO (92) | 70% | 77% | 67% | 32% | 0% |
| AM (60) | 35% | 35% | 29% | 10% | 0% |
| AP (11) | 18% | 20% | 20% | 6% | 0% |
| Fica no resíduo das zonas inseridas | 98% | 94% | 89% | 74% | 0% |

- **Fato:** o MQ por UF, sem intercepto, faz o resíduo da UF somar praticamente zero. Em todos os cenários, a sobra na UF inteira ficou entre −0,01 e +0,04 do inserido. O que é inserido numa zona aparece como resíduo negativo espalhado nas outras zonas da mesma UF.
- Consequência: a coluna `alemEsperado` por UF em `por-regiao.csv` (−0,16 a +0,10 p.p.) é zero por construção e não pode ser lida como "nenhuma UF além do esperado".
- Tabela completa, com troca, 2, 3 e 10 p.p. e 11 UFs: `34-h26-poder.json` (`variasZonas`).

### A.3 Capital inteira

| Capital (zonas, nominais do 2º turno) | Fica no resíduo | Acendem com 3 p.p. | Acendem com 5 p.p. de acréscimo (votos inseridos) | Acendem com 5 p.p. de troca |
|---|---|---|---|---|
| Salvador (19; 1,58 mi) | 50% | 9 | 15 (≈ 79 mil) | 19 |
| São Paulo (57; 6,96 mi) | 49% | 10 | 39 (≈ 348 mil) | 50 |
| Rio de Janeiro (49; 3,68 mi) | 41% | 2 | **2** (≈ 184 mil) | 36 |
| Fortaleza (17; 1,55 mi) | 45% | 0 | **0** (≈ 78 mil) | 15 |
| Belo Horizonte (18; 1,51 mi) | 74% | 2 | 13 (≈ 75 mil) | 18 |

- **Fato:** a capital tem uma composição de 1º turno própria (urbana, mais abstenção), e o MQ usa essa direção para "explicar" cerca de metade do que se insere nela. **Essa limitação não está no doc 02.** Ele só fala da UF inteira.

### A.4 Inserção espalhada pela UF (o método declara não ver)

- **Fato:** confirmado. Em todas as zonas de uma UF, 2 a 10 p.p. de acréscimo ou troca: 0 zonas acendem, e a sobra é ~0.
- **Fato:** uma inserção proporcional ao voto do 13 no 1º turno (multiplicar o 13 por 1 + α) é absorvida 100%, só pela álgebra. Em BA, com α = 5%: 283.239 votos inseridos e 283.239 absorvidos. O coeficiente do 13 sobre o próprio 13 sobe exatamente α.
- **Hipótese:** em 13 UFs esse coeficiente passa de 1 (SP 1,066; SC 1,064; GO 1,059; RS 1,042; RJ 1,038; exterior 1,129). Nesse modelo, um coeficiente acima de 1 é compatível com uma inserção proporcional ao 13. Também é compatível com o voto do eleitor que se absteve no 1º turno estar correlacionado com o voto do 13. O método não separa as duas coisas. A pergunta é da H10 e da linha de base (doc 03, onde 2018 teve virada nacional de +6,49 p.p., número do coordenador que não conferi).

**Leitura do poder:** a triagem acharia uma zona com desvio de **3 a 7 p.p.** (conforme o tamanho), ou dezenas de zonas com 5 p.p. Não acharia um desvio de 1 a 2 p.p. por zona, nem algo espalhado por uma capital ou uma UF. Esse é o alcance do "nenhuma zona fora da curva para o 13".

## B. A régua (z robusto por região): calibração e alternativas

**Fato (`cetico-34-h26-reproduz.mjs`, `corte.caudas` e `escalaPorTamanho`).**

- **Cauda pesada:**
  - |z| ≥ 3: 22 zonas para o 13 e 17 para o 22, contra 3,6 esperadas de cada lado na normal;
  - |z| ≥ 4: 2 e 7, contra 0,08.
  - O p-valor normal subestima a raridade nas pontas. O q < 0,01 das 4 zonas do 22 também está inflado. O falso alarme possível está **desse** lado.
- **A régua depende do tamanho da zona:**
  - o MAD de t = resíduo/√n cresce com o tamanho: no Sudeste, 1,62 no quintil menor e 2,64 no maior; inclinação log-log de 0,25. A dispersão cresce mais rápido que √n, então zona grande tende a ter z maior (11 das 21 zonas |z| ≥ 3 do Sudeste estão no quintil maior);
  - em p.p., é o contrário: zona pequena oscila mais (MAD 1,9 p.p. no quintil menor do Norte e 0,64 no maior).
- **Zonas não são independentes:**
  - correlação intraclasse (ICC) de 0,30 entre os z de zonas do mesmo município, em 187 municípios com mais de uma zona;
  - as 19 zonas de Salvador têm z mediano +1,94, a cidade inteira deslocada;
  - um efeito de cidade aparece como várias zonas "moderadas", e nenhuma passa o corte.

**Alternativas (Fato; cada uma refaz o BH e o corte, com o mesmo modelo de esperado):**

| Variante | Para o 13 | Para o 22 | Zonas para o 13 |
|---|---|---|---|
| Plano (MAD por região, t = resíduo/√n) | **0** | 4 | — |
| MAD por UF | 5 | 6 | PE 0083, PE 0145 (Petrolina), SP 0118 (Santos), SP 0340 (São Vicente), SP 0418 (São Paulo) |
| MAD por região × quintil de tamanho | 1 | 8 | GO 0047 (São Domingos, +4,13 p.p.) |
| Régua em p.p. (sem √n) | 2 | 7 | AM 0042 (Atalaia do Norte, **+7,04 p.p.**, 32 seções), GO 0047 |
| Variância que cresce com o tamanho (σ²(1 + n/n₀) por região) | 0 | 6 | — |
| Coeficientes restritos a [0, 1] (seção D) | 9 | 3 | BA 0014, GO 0028, SC 0013, SP 0020, SP 0371, SP 0372, SP 0373, SP 0381, SP 0418 |

- **Leitura:** as variantes não concordam entre si. Isso mostra que a cauda do 13 depende do modelo, e não que ali exista uma anomalia escondida. As zonas que aparecem são, em geral, as mesmas da lista z ≥ 3 do autor (urbanas de SP, BA e PE).
- As exceções valem uma olhada, não um alarme, porque saem de escolhas feitas depois de ver os dados:
  - GO 0047 e AM 0042: zonas pequenas com desvio grande em p.p.; a régua √n do plano as esconde;
  - SC 0013 (Florianópolis): vai de +0,13 a +3,42 p.p. só por restringir os coeficientes.

## C. O teste de horário

**Fato (`cetico-34-h26-horario.mjs`; 497.894 seções; efeito fixo de zona, peso = nominais do 2º turno, erro-padrão agrupado por zona).**

| Regressão da virada além do esperado da seção (p.p.) | Desde 15h: coef. (z) | Desde 17h: coef. (z) |
|---|---|---|
| Autor: Δ parcela tardia (2º − 1º) | −0,0170 (−13,7) | −0,0346 (−19,2) |
| Separado: parcela tardia do 2º turno | **+0,060 (+19,4)** | **+0,381 (+7,0)** |
| Separado: parcela tardia do 1º turno | +0,035 (+25,0) | +0,035 (+19,3) |
| Separado com controles (log aptos, Δcomparecimento, 13 e abstenção no 1º turno): 2º turno | **+0,069 (+22,1)** | **+0,390 (+7,2)** |
| Mesmo, parcela do 1º turno | +0,025 (+15,0) | +0,019 (+9,2) |
| Indicador "seção com voto depois das 17h no 2º turno" (29.853 seções), com controles | — | **+0,18 p.p. (+7,6)** |

- **Por que o sinal do autor se inverte:**
  - Δ = parcela do 2º − parcela do 1º obriga os dois turnos a terem pesos iguais e opostos. Desde 17h, a parcela tardia é muito maior no 1º turno (3,01% contra 0,027%), então Δ ≈ −(parcela do 1º turno). Desde 15h (22,1% contra 12,8%), a parcela do 1º turno, que varia mais entre as seções, ainda domina.
  - A seção com muita gente votando tarde no 1º turno (fila longa, urbana) virou mais para o 13. Isso aparece como "Δ negativo, virada positiva".
  - O problema principal não é regressão à média nem tamanho da seção (o log dos aptos está nos controles). É a mistura de duas variáveis com o mesmo sinal numa diferença.
- **Por região (desde 17h, com controles):** N +0,65 (z 3,5); NE +0,25 (2,9); CO +0,60 (3,7); SE +0,41 (4,7); S +0,34 (1,7). Desde 15h, positivo nas 5 regiões, o maior no SE (+0,13; z 26,8). Não é concentrado.
- **Tamanho:** a associação com a parcela depois das 17h equivale a ~12.900 votos de margem no país, 0,19% da virada de 6.655.156 votos. Os votos depois das 17h no 2º turno são 34.330. Mesmo que todos fossem do 13, não mudariam a eleição.
- **Poder do teste do autor:** inserindo k votos para o 13 depois das 17h em 1% das seções (4.959), a inclinação Δ fica −0,034 com k = 1, −0,027 com k = 10 e −0,006 (z −3,1) com k = 20, uns 99 mil votos inseridos. Desde 15h, o mesmo (−0,004; z −3,0 com k = 20). **O teste Δ não acenderia nem com 99 mil votos inseridos no fim do dia.** O teste separado já dá positivo nos dados reais.
- **Hipótese benigna (não testada):** quem vota tarde no 2º turno é diferente de quem vota cedo (mais jovem, trabalha, depende de transporte). O aumento de comparecimento a favor do 13 se concentra nesse grupo. Os controles de tamanho e de Δcomparecimento não tiram a associação. Pelo princípio 8, a explicação benigna fica como Hipótese até ter rastro técnico.
- **Caso conferido no bruto:** BA 38490/0014/0656 (Salvador, zona da cauda), 2º turno, via `src/exportar.js`:
  - abertura 08:00:01 e encerramento **19:05:27**;
  - 13 = 272, 22 = 65, branco 4, nulo 16, comparecimento 357;
  - biometria 329, sem biometria cadastrada 1, ano de nascimento 27;
  - 22 conferências de assinatura, 0 falha;
  - igual à minha extração (4 votos depois das 17h nesta seção).
  - O encerramento às 19h é o da prorrogação (H06). A conciliação é do coordenador.

## D. Coeficientes fora de [0, 1] e definições de biometria

**Coeficientes (Fato).**

- 132 dos 504 coeficientes (28 UFs × 9 preditores × 2 candidatos) saem de [0, 1]; em 58 casos a soma 13 + 22 de um mesmo preditor passa de 1,05.
- Os mais fora: Zema → 13 negativo em 10 UFs (DF −0,42; CE −0,30; RR −0,30; RJ −0,27); Zema → 22 acima de 1 em 13 (AC 1,71; AM 1,47; AL 1,36); "demais" → 13 + 22 = 3,05 no AP.
- Com MQ restrito a [0, 1] (descida por coordenada), o resíduo de cada zona muda em média 0,85 p.p. (raiz da média dos quadrados); no máximo, 5,8 p.p.
- A ordem das zonas pelo z mantém correlação de Spearman de 0,83. Para o 13, as zonas com z ≥ 3 passam de 22 para 43, e as que passam o corte, de 0 para 9.
- **Leitura:** a mudança no resíduo é do mesmo tamanho do corte de 2 p.p. Os coeficientes impossíveis afetam, sim, o resíduo da zona. O modelo restrito ajusta pior e também não é "o certo". Por isso o resultado tem de ser apresentado como dependente do modelo.

**Biometria (Fato).**

- `sb`, `pb` e `pg` dos pares são os campos `sem_biometria`, `por_biometria` e `por_biografia` da tabela `secao`. Eles vêm do próprio BU (`detalhamentoComparecimento`): `qtdEleitoresCompareceramSemBiometria` (sem digital cadastrada), `qtdEleitoresHabilitadosPorBiometria` e `qtdEleitoresHabilitadosPorBiografia` (tem digital, mas foi liberado pelo ano de nascimento). As palavras do doc 02 estão certas.
- sb + pb + pg = comparecimento em todas as seções do Brasil. As 1.281 exceções de cada turno são todas do exterior.
- O `por_biometria` do BU é igual a `habilitados_biometria` do log em 497.884 de 497.897 seções no 1º turno e em 497.890 no 2º. O BU e o log são arquivos diferentes, mas a mesma urna escreve os dois.
- Na cauda, o **nível** de habilitação por digital quase não muda: 86,63% no 1º turno e 86,42% no 2º. Nas demais zonas: 87,55% e 87,34%.
- **Leitura:**
  - O dado é contra uma inserção pelo caminho do mesário (ano de nascimento). Esse caminho cresceu **menos** na cauda (7,35% do aumento, contra 9,75% nas mesmas UFs).
  - Não diz nada sobre uma manipulação feita dentro da urna, que escreveria o BU e o log do mesmo jeito. Essa é a pergunta das H05/H16, não da H26.
  - A frase do doc 02, "voto inserido sem digital deixaria a parte sem digital maior", é verdadeira só para esse caminho, e o texto precisa dizer isso.
- Heterogeneidade, por zona, de comparecimento a mais sem digital:
  - de −2% (DF 0006, aumento 102% por digital) a 35% (RJ 0161) e 31% (RJ 0179);
  - **RJ 0075** (z 3,48) teve o comparecimento **caindo** 1,08 p.p. (−1.255 eleitores). Ali, "volta do eleitor urbano" não explica o resíduo.

## E. Modelo da urna: o estimador

- **O que o autor faz:** desvio da seção = resíduo − nominais × taxa da zona, somado no modelo e dividido pelos nominais de **todas** as seções do modelo.
- **O problema:** numa zona com um só modelo, o desvio soma zero por construção, mas os votos dela entram no denominador. Isso acontece com 65,0% dos votos das UE2020, 64,6% das UE2022, 19,5% das UE2013 e 10,3% das UE2015. Além disso, a taxa da zona inclui as próprias seções do modelo.

**Fato (`cetico-34-h26-modelo.mjs`, contraste com efeito fixo de zona, só zonas mistas, erro-padrão agrupado):**

| Modelo | Desvio do autor (p.p.) | Contraste com as outras urnas da zona (p.p.) | z | Zonas mistas | Menor desvio visível (z = 3) |
|---|---|---|---|---|---|
| UE2013 | +0,035 | +0,092 | 1,54 | 624 | 0,18 p.p. |
| UE2015 | −0,026 | **−0,106** | −2,79 | 788 | 0,11 p.p. |
| UE2020 | +0,004 | +0,027 | 0,72 | 695 | 0,11 p.p. |
| UE2022 | +0,006 | +0,036 | 1,01 | 698 | 0,11 p.p. |

- A conclusão "sem efeito por modelo" se mantém: nenhum |z| ≥ 3 em 4 testes. O z da UE2015 aponta para **menos** 13.
- A ordem de grandeza certa do que se mede é 0,1 p.p., não 0,04.
- Um desvio igual em todas as urnas de uma zona, por modelo ou não, fica fora desse teste. Esse é o limite já registrado nas H14 e H25.

## Explicações alternativas: testadas × supostas

| Explicação | Situação |
|---|---|
| Transferência dos eliminados (Caiado, Zema) | Testada no esperado. Mas os pesos são ecológicos e 26% deles estão fora de [0, 1] (seção D) |
| Zona pequena | Testada em parte: a régua √n não remove a dependência do tamanho (seção B) |
| Abstenção diferencial / volta do eleitor | **Suposta** como causa da cauda do 13. O comparecimento acima da UF também é o que uma inserção produziria. A biometria do aumento tira só o caminho do mesário. RJ 0075 não se encaixa |
| Prorrogação até 19h e fuso | Fuso refeito por código próprio, com os mesmos números. A ligação com a associação positiva do voto tardio (seção C) não foi testada. É o trabalho de conciliação do coordenador |
| Padrão histórico | Fora do parecer (doc 03 do coordenador) |
| Inserção espalhada (UF, capital, proporcional ao 13) | **Não testável por esta triagem** (seção A). Precisa da H10 e da linha de base |

## Recomendações

1. **Recomendação (doc 02, Resposta curta e §2):** trocar "nenhuma das 2.641 zonas passa do corte a favor do 13" por "pelo corte do plano, nenhuma zona isolada desviou para o 13 o bastante para ser vista; a triagem enxerga uma inserção de 3 a 7 p.p. dos votos de uma zona, conforme o tamanho, e não enxerga menos que isso". Acrescentar ao "Limites" as capitais (~50% absorvido; 5 p.p. em Fortaleza não acendem nenhuma zona) e o resíduo da UF zero por construção.
2. **Recomendação (doc 02, §4):** retirar "a seção que votou mais tarde virou menos para o 13". Pôr no lugar a regressão separada por turno: associação positiva e pequena com o voto tardio do 2º turno, ~12.900 votos, nas 5 regiões, **Pendente** de explicação. Cruzar com a conciliação H06 (municípios com prorrogação) e, nas 29.853 seções com voto depois das 17h, contar pelo log o tipo de habilitação desses eleitores (digital, ano de nascimento, sem digital).
3. **Recomendação (doc 02, §2):** escrever o script que gera os números de comparecimento e biometria da cauda (hoje sem script). Os meus servem de conferência (`cetico-34-h26-reproduz.mjs`, `cauda`). Dizer que o argumento da biometria afasta a liberação pelo mesário, não a manipulação dentro da urna. Citar RJ 0075 como exceção.
4. **Recomendação (doc 02, §2):** rebaixar a frase sobre "eleitor do 22 que passou para o 13" para Hipótese. Mostrar a contagem de coeficientes fora de [0, 1] e a variante restrita como robustez.
5. **Recomendação (doc 02, §3):** usar o contraste com efeito fixo de zona e o menor desvio visível (0,11 a 0,18 p.p.). Tirar a comparação de urnas antigas nas 4 zonas (n = 4).
6. **Recomendação (método, para uma rodada nova pré-registrada e commitada antes):** além da zona, triar **município** (Salvador, z mediano +1,94 em 19 zonas). Usar uma régua que dependa do tamanho, calibrada por simulação de nulo (ou por 2018/2022, se o doc 03 permitir) em vez do p-valor normal. Fixar uma especificação para os coeficientes.
7. **Recomendação (perícia):** o relatório temático pode dizer: "a virada foi geral; a triagem acharia uma zona com desvio de vários pontos e não achou nenhuma a favor do 13". **Não** pode dizer que a triagem mostra ausência de inserção espalhada nem que o horário tardio desfavoreceu o 13.

## Arquivos e comandos

Scripts (Node 24, só leitura, sem dependências):

```
node --max-old-space-size=12288 scripts/auditoria/cetico-34-h26-secoes.mjs     # ~1,5 min: extração do banco + conferência com voto_oficial + horas
node --max-old-space-size=8192  scripts/auditoria/cetico-34-h26-reproduz.mjs   # ~5 s: corte, virada geral, réguas, [0,1], cauda, modelo (estimador do autor)
node --max-old-space-size=8192  scripts/auditoria/cetico-34-h26-poder.mjs      # ~2,5 min: simulação de inserção
node --max-old-space-size=8192  scripts/auditoria/cetico-34-h26-horario.mjs    # ~10 s: horário separado por turno, controles, poder, picos
node --max-old-space-size=8192  scripts/auditoria/cetico-34-h26-modelo.mjs     # ~5 s: contraste por modelo com efeito fixo de zona
```

Funções comuns: `scripts/auditoria/cetico-34-h26-lib.mjs`. Saídas em `data/parsed/auditoria/cetico-revisor/`: `34-h26-secoes.csv`, `34-h26-horas-zona.csv`, `34-h26-secoes.json`, `34-h26-reproduz.json`, `34-h26-zonas.csv`, `34-h26-poder.json`, `34-h26-poder-zonas.csv`, `34-h26-horario.json`, `34-h26-modelo.json`.

Consulta avulsa (biometria do BU × log): `node scripts/sql.mjs` com `secao` ⋈ `perfil_log` pelo hash, comparando `por_biometria` com `habilitados_biometria` (números na seção D).
