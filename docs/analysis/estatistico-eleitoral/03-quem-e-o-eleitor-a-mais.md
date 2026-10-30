# 03. Quem é o eleitor a mais: categoria de habilitação e teste E2 por UF (pergunta 2)

> **Atualização (29/10/2026):** os números de 22 UFs abaixo foram refeitos com as 28 UFs em [06](06-h05-28ufs.md). O `biometria.json` atual já tem 28 UFs e a correção do exterior (null − null). Com efeito fixo de zona e 28 UFs, 2 de 56 testes E2 passam em Bonferroni, os dois de SP e a favor do 22, e não 0 de 42.

Estatístico eleitoral, 29/10/2026. Comando: `node --max-old-space-size=8192 scripts/auditoria/estatistico-dc-biometria.mjs` → `biometria.json`, `biometria-extremas.csv`. Base: cópia de leitura do banco, **22 UFs** com o 1º turno: AC, AL, AM, AP, BA, CE, DF, ES, GO, MA, MG, MS, MT, PA, PB, PE, PI, PR, RJ, RN, RO e RR. São 338.884 seções. Faltam RS, SC, SE, SP, TO e o exterior. Para refazer com elas: `node scripts/auditoria/estatistico-dc-refazer.mjs --sem-abertos`.

As três categorias vêm do `detalhamentoComparecimento` do BU (doc 06): **sem biometria cadastrada**, **por biometria** e **por ano de nascimento** (o eleitor tem biometria, a digital falhou e ele foi liberado pelo ano de nascimento). Pelo princípio 8, só "por biometria" é controle técnico. As outras duas dependem do mesário.

**Hipótese nula.** O eleitor a mais é habilitado como o eleitor comum que volta a votar no 2º turno. **Alternativa (inserção pela brecha):** o excesso se concentra nas categorias sem biometria e vota mais no beneficiado do que o eleitor a mais com biometria.

## Resposta curta

- **Fato:** nas seções com maior aumento, o acréscimo é **mais biométrico**, não menos, que o aumento comum.
  - Cada eleitor de **excesso** (acima do esperado da zona) entrou 84,8% por biometria.
  - Cada eleitor do aumento **esperado** entrou 75,8% por biometria.
- **Fato:** com efeito fixo de zona, o eleitor a mais sem biometria votou como o eleitor a mais com biometria, nas **22 UFs**. Nenhum dos 42 testes passa em BH. O maior |t| é 2,3.
- **Fato:** no agregado, a parte sem biometria no aumento (23,9%) é o dobro da que existe no comparecimento (12,5%). Essa parte está **espalhada** pelo aumento comum, não concentrada nas seções extremas.

## Composição do acréscimo por faixa de excesso (Fato)

| Faixa de z | Seções | Δ comparecimento | Δ sem biometria cadastrada | Δ por biometria | Δ ano de nascimento | Parte sem biometria (as duas) |
|---|---:|---:|---:|---:|---:|---:|
| z ≤ −4 | 395 | −15.132 | −834 | −13.325 | −973 | 12% |
| −4 < z ≤ −2 | 9.889 | −106.782 | −6.542 | −93.713 | −6.527 | 12% |
| −2 < z < 2 | 320.619 | +1.636.653 | +182.952 | +1.248.001 | +205.700 | **24%** |
| 2 ≤ z < 3 | 7.206 | +135.653 | +11.075 | +112.840 | +11.738 | **17%** |
| 3 ≤ z < 4 | 692 | +17.835 | +1.516 | +14.893 | +1.426 | **16%** |
| z ≥ 4 | 83 | +2.856 | +200 | +2.371 | +285 | **17%** |
| **Todas** | 338.884 | +1.671.083 | +188.367 | +1.271.067 | +211.649 | 23,9% |

As mesmas contas pelo Δ bruto, sem modelo: as 1% de seções com maior Δ (3.389 seções, +121.486) somam 19% sem biometria. As 5% maiores somam 20% e as 10% maiores, 20%.

No comparecimento, as parcelas são 5,8% sem biometria cadastrada e 6,7% por ano de nascimento no 1º turno, e 5,9% e 6,8% no 2º.

### Parte de cada eleitor a mais que entra em cada categoria (efeito fixo de zona, EP agrupado por município)

| Categoria | Do excesso | Do aumento esperado | Diferença (t) |
|---|---|---|---|
| Por biometria | **0,848** ± 0,003 | 0,758 ± 0,010 | +0,090 (**+10,2**) |
| Sem biometria cadastrada | 0,073 ± 0,002 | 0,101 ± 0,005 | −0,028 (−8,1) |
| Ano de nascimento | 0,079 ± 0,002 | 0,141 ± 0,008 | −0,062 (−9,1) |

- Por UF (66 testes, BH), o padrão é o mesmo ou nulo na maioria. Em 3 UFs o excesso tem mais "sem biometria cadastrada" do que o esperado:
  - MA: 0,059 contra 0,041, t = 3,6, q = 0,001;
  - PA: 0,061 contra 0,049, t = 3,0, q = 0,007;
  - PI: 0,031 contra 0,019, t = 4,3, q = 0,0001.
  - As diferenças são de 1 a 2 eleitores em cada 100 a mais. **Hipótese:** no interior do Norte e do Nordeste, quem volta a votar por choque local (transporte, comunidade) é mais velho ou mais rural. Pede o perfil etário da seção.
- **Leitura.** Uma inserção pela brecha da liberação sem biometria faria o contrário: o excesso seria mais sem biometria do que o aumento comum. A previsão não se confirma no país nem em 19 das 22 UFs.

### O "24% sem biometria" do aumento agregado é anômalo?

- **Fato:** 23,9% do aumento nas 22 UFs entrou sem biometria, contra 12,5% no comparecimento. O mesmo número aparece na H10 (23,7% e 12,7%, `scripts/habilitacao-1t-2t.mjs`).
- A parte sem biometria cadastrada é 11,3% do aumento, contra 5,8% do comparecimento. Isso é o esperado se o retorno for parecido nos dois grupos. O demógrafo ([06](../demografo/06-variacao-entre-turnos.md)) mediu o comparecimento:
  - grupo sem biometria cadastrada: +1,7 p.p. (48,1% → 49,9%);
  - grupo com biometria: +1,4 p.p.
  - Como o grupo sem biometria falta muito mais, uma alta de mesmo tamanho pesa o dobro na composição do aumento.
- A parte "por ano de nascimento" é 12,7% do aumento, contra 6,8% do comparecimento. **Hipótese benigna:** quem volta é mais velho, e a digital falha mais com a idade (o efeito 60+ do [01](01-dados-e-metodo.md) e do demógrafo).
  - **Fato que vai para a frente de biometria:** no perfil do log das 20 UFs com perfil nos dois turnos, as habilitações com a digital de um mesário registrado (`habilitados_pelo_mesario`) subiram 13,8%, de 3.080.123 para 3.504.063. As liberações por ano de nascimento subiram 3,5% (4.916.561 → 5.087.374). O resto da categoria, a digital colhida e gravada sem associação a mesário, **caiu** de 1,84 milhão para 1,58 milhão. A mudança de forma entre os turnos é grande e merece leitura de log. Ela não muda o comparecimento.
- A distribuição pelas faixas de z mostra que esse excedente é **difuso**: ele está no meio da distribuição (24%), não nas seções de maior aumento (16% a 17%).

## Teste E2 do cientista político, por UF, com efeito fixo de zona (Fato)

Especificação ([cético, 06](../cetico-revisor/06-comparecimento-extra-sem-vies-biometria.md)), mais efeito fixo de **zona**:

> ganho do finalista / c1 ~ Δpor biometria / c1 + Δsem biometria (cadastro + ano de nascimento) / c1 + eliminados do 1º / c1 + brancos e nulos do 1º / c1

Peso c1 e EP agrupado por município. d = coeficiente sem biometria − coeficiente por biometria. Sob o nulo, d = 0.

- **22 UFs juntas:** 13: 0,589 por biometria × 0,588 sem, d = −0,001 ± 0,002 (t = −0,7). 22: 0,369 × 0,369, d = 0,000 ± 0,002 (t = 0,2).
- **Por UF (42 testes, BH): nenhum q < 0,6.**

| UF | Seções | Municípios | 13: d ± EP (t) | 22: d (t) |
|---|---:|---:|---|---|
| BA | 35.451 | 417 | −0,004 ± 0,003 (−1,2) | +0,003 (1,1) |
| MG | 52.033 | 853 | −0,002 ± 0,004 (−0,5) | +0,007 (1,9) |
| PR | 27.130 | 399 | **+0,009 ± 0,004 (2,3)** | −0,009 (−2,0) |
| RJ | 37.666 | 92 | −0,005 ± 0,004 (−1,3) | +0,006 (1,2) |
| PE | 21.403 | 185 | +0,004 ± 0,007 (0,5) | −0,003 (−0,5) |
| CE | 23.761 | 184 | 0,000 ± 0,005 (0,0) | 0,000 (0,0) |
| GO | 15.678 | 246 | +0,012 ± 0,008 (1,4) | −0,013 (−1,4) |
| MT | 8.283 | 142 | −0,015 ± 0,009 (−1,6) | +0,015 (2,0) |
| AC | 2.267 | 22 | +0,030 ± 0,054 (0,6) | −0,019 (−0,4) |
| DF | 6.954 | 1 | −0,014 (sem EP agrupado) | 0,000 |

As 22 linhas estão em `biometria.json`, campo `e2PorUf`.

- **PR:** o cético tinha d = +0,025 (t = 4,2) com efeito fixo de UF e +0,012 (t = 2,8) com efeito fixo de município. Com efeito fixo de zona, fica em **+0,009 (t = 2,3, q = 0,60)**. O sinal encolhe a cada nível de controle geográfico. É o comportamento de composição, não de inserção por seção.
- **MG:** o +0,019 do 22 com efeito fixo de UF vira +0,007 (t = 1,9).

### As duas brechas separadas (84 testes, BH)

O mesmo modelo, com "sem biometria cadastrada" e "ano de nascimento" separados:

- **Ano de nascimento − por biometria:** nenhuma UF com q < 0,2, nos dois finalistas.
- **Sem biometria cadastrada − por biometria:** 4 UFs com q < 0,05 a favor do 13 e o espelho para o 22. Todas com Δ líquido pequeno na categoria:

| UF | d para o 13 (t, q) | d para o 22 (t) | Δ líquido sem biometria cadastrada | Ordem de grandeza (d × Δ) | Sem seções indígenas (≥ 5% do eleitorado) |
|---|---|---|---:|---:|---|
| GO | +0,144 (4,3; 0,0007) | −0,146 (−4,7) | +4.450 | ~640 votos | igual (t = 4,3) |
| MS | +0,270 (4,0; 0,002) | −0,255 (−3,3) | +4.673 | ~1.260 votos | **some** (t = 1,7) |
| PR | +0,180 (3,3; 0,013) | −0,161 (−2,8) | +3.000 | ~540 votos | igual (t = 3,2) |
| RN | +0,136 (2,9; 0,045) | −0,079 (−1,8) | +2.452 | ~330 votos | igual (t = 3,0) |
| PI | −0,097 (−1,9) | **+0,159 (3,4; 0,014)** | −908 | ~140 votos para o 22 | igual |

- **Leitura (Hipótese).** O eleitor sem biometria cadastrada é um grupo demográfico diferente (mais velho, rural, indígena). Quem desse grupo volta a votar pode ter preferência diferente da do eleitor biométrico da mesma zona.
  - Em MS, o sinal vem das seções indígenas: sem elas, t = 1,7.
  - Em GO, PR e RN o sinal resiste. Os sentidos se opõem entre UFs (PI a favor do 22).
  - Os efeitos são de centenas de votos por UF.
  - É Hipótese a examinar pelo perfil etário, não Fato de inserção.
  - Com o limiar de Bonferroni para 84 testes (|t| > 3,6), ficam só GO (4,3 e −4,7) e MS (4,0).
- **Alcance:** este teste não vê inserção uniforme numa UF nem inserção igual nos dois turnos (cético, 06). O poder dele contra inserção concentrada está no [05](05-poder.md).

## Seções extremas (conferidas no bruto)

As 20 maiores, com o detalhamento dos dois turnos, estão no [02](02-distribuicao-e-klimek.md). Em 19 delas, a maior parte do acréscimo é biométrica.

## Pendências

1. Rodar de novo com RS, SC, SE, SP, TO e o exterior, quando entrarem na cópia (`estatistico-dc-refazer.mjs --sem-abertos`). O cientista político apontou o Sul como a região onde este teste mais importa.
2. Perfil etário por seção nos sinais de GO, PR, RN (cadastro) e MA, PA, PI (excesso sem biometria).
3. Frente de biometria: a troca entre "digital de mesário" e "digital não associada" dentro da liberação por ano de nascimento, de um turno para o outro.
