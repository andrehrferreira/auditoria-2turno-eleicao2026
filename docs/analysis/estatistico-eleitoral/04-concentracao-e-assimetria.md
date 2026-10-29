# 04. Concentração do excesso e assimetria pró-13 × pró-22 (perguntas 3 e 4)

Estatístico eleitoral, 29/10/2026. Comandos:

- `node --max-old-space-size=8192 scripts/auditoria/estatistico-dc-distribuicao.mjs abertos 10` → `dc-abertos.json` (`p3concentracao`, `p3proporcao`, `p4`) e `dc-abertos-zonas.csv`. São 28 UFs e 498.964 seções.
- Mesários e urna trocada: `scripts/auditoria/estatistico-dc-biometria.mjs` → `biometria.json` (`mesarios`). São 20 UFs com perfil de log nos dois turnos e 295.275 seções.

O excesso é c2 menos o esperado do modelo da zona ([01](01-dados-e-metodo.md)), em eleitores. z é o excesso padronizado.

## Resposta curta

- **Fato:** o excesso **não se concentra** em seções. As 1% de cima têm 8,1% da massa positiva do excesso, e o nulo binomial dá o mesmo 8,1%.
  - Ele também não se concentra em mesários, em urna trocada nem em modelo de urna. As diferenças são de no máximo 0,07 desvio-padrão.
- **Fato:** ele **se agrupa por local de votação**, nos dois sentidos e mais na queda. É o que se espera de condições locais compartilhadas: escola, bairro, transporte.
- **Fato:** dentro da zona, o aumento foi um pouco maior nas seções pró-13, +0,23 p.p. por +10 p.p. de parcela do 13. Cerca de 40% disso se explica pela volta de abstencionistas: as seções pró-13 tinham mais faltosos no 1º turno. O resto (+0,14 p.p.) está no decil mais pró-13 e equivale a cerca de 0,35 eleitor por seção (17.649 eleitores no decil).
- **Fato:** nos votos nominais, a queda de brancos e nulos pesa mais que o comparecimento: +0,29 p.p. por +10 p.p. de parcela do 13.

## Pergunta 3: o excesso se concentra?

### Em seções (Fato)

| | Observado | Nulo binomial (1 sorteio) |
|---|---|---|
| Massa positiva do excesso | 1.150.346 eleitores | 1.185.043 |
| Parte nas 1% de seções com maior excesso | **8,1%** | 8,1% |
| Parte nas 5% de cima | **27,9%** | 27,7% |

Uma inserção concentrada aumentaria a parte do topo. Ela é a do acaso.

### Em zonas e municípios (Fato, z robusto entre grupos da mesma UF, depois de descontar a abstenção do 1º turno)

| | Grupos | z ≥ 3 | z ≤ −3 | Esperado pela normal (cada lado) | z ≥ 5 | z ≤ −5 |
|---|---:|---:|---:|---:|---:|---:|
| Zonas (≥ 10 seções) | 2.640 | 19 | 36 | 3,6 | 3 | 5 |
| Municípios (≥ 5 seções) | 5.612 | 51 | 107 | 7,6 | 3 | 23 |

- As caudas são mais pesadas que a normal **nos dois lados**, e a de queda é maior. Isso é heterogeneidade política e logística entre lugares, não um conjunto de lugares só com alta.
- Maiores altas relativas:
  - zonas SC 0063 (+3,7 p.p., z = 6,0), MG 0217 (+5,9, z = 5,1), RS 0099 (+4,4, z = 5,0) e CE 0016 (+6,0, z = 4,8);
  - municípios SP 67458 (13 seções, +8,2 p.p.) e PE 25631 (52 seções, +7,9 p.p.).
  - Lista completa em `dc-abertos-zonas.csv`.
  - Estão em UFs e lados políticos diferentes (SC e RS pró-22, CE e PE pró-13). **Exploratório:** são candidatos para o cientista político (evento local, campanha municipal).

### Em locais de votação (Fato, permutação dentro da zona)

- A variância entre locais do z médio, dentro da zona, é **1,78 vezes** a da permutação (z da permutação = 97; 498.533 seções em 59.918 locais com 3 ou mais seções).
- Locais com z do local ≥ 4: **151** (a permutação dá 5). Locais com z ≤ −4: **409** (a permutação dá 52).
- Os 151 locais de alta reúnem 1.540 seções e 17.971 eleitores de excesso.
  - No ganho dos dois finalistas, 73% foi para o 13 (56.008 contra 20.632), com parcela do 13 de 57,1% no 1º turno.
  - No país, a seção comum (|z| < 1) deu 73,3% do ganho ao 13, com parcela de 48,8%.
  - **Os locais de alta não pendem para o 13 mais do que a seção comum.**
- Os locais de maior alta têm lados diferentes:
  - SP 71072/0002, locais 1546 e 1090: ganho maior do 22, 398 contra 142 e 1.206 contra 611;
  - exterior 29955/0001, local 1080: 49 seções, +2.365 eleitores, 2.469 votos a mais para o 13 e 1.199 para o 22;
  - PA 05835/0106, local 1210: 3 seções, +207, quase todo para o 13. É o par de seções já conferido no bruto, com o acréscimo por biometria ([02](02-distribuicao-e-klimek.md));
  - RJ 60011, locais 1503, 1236 e 1686.
  - A lista está em `dc-abertos.json` (`p3concentracao.locais.topoAcima`).
- **Leitura.** O agrupamento por local é real e forte nos dois sentidos. Ele é a marca de condições compartilhadas e, ao mesmo tempo, o lugar onde uma ação coordenada apareceria. **Recomendação:** cruzar os 151 locais de alta com a habilitação por biometria (frente de biometria) quando o 1º turno de SP e do exterior estiverem no banco. Nas seções do PA e do MG já conferidas, o acréscimo é biométrico.

### Em modelo de urna (Fato, z médio dentro da zona; base: UE2020)

| Modelo | Seções | Diferença de z na zona (t) | Cauda z ≥ 4 / z ≤ −4 |
|---|---:|---|---|
| UE2013 | 12.437 | +0,065 ± 0,024 (2,7) | 5 / 10 |
| UE2015 | 87.470 | +0,040 ± 0,018 (2,2) | 29 / 68 |
| UE2020 | 200.393 | (base) | 31 / 146 |
| UE2022 | 198.664 | −0,011 ± 0,011 (−1,0) | 40 / 215 |

- Com 3 testes, a correção de Bonferroni pede |t| > 2,39. A UE2013 passa por pouco. O efeito é de 0,065 desvio-padrão, cerca de 0,4 eleitor por seção, o que dá uns 5 mil eleitores nas 12.437 seções.
- **Hipótese benigna:** as urnas mais antigas vão para seções de perfil diferente (rurais e pequenas). Nenhum modelo concentra a cauda direita.
- 1.205 seções trocaram de modelo entre os turnos. O z médio delas é −0,015.

### Em mesários e urna trocada (Fato, 20 UFs, efeito fixo de zona, EP agrupado por município)

| Grupo | Seções | z médio | Diferença na zona (t) |
|---|---:|---:|---|
| Todas | 295.275 | −0,018 | |
| Mesa toda trocada (nenhum título igual) | 464 | −0,011 | +0,01 (0,2) |
| Mesa igual nos dois turnos | 220.696 | −0,014 | |
| Presidente que encerrou trocado | 38.588 | −0,020 | 0,00 (0,0) |
| Algum mesário registrado em 2 ou mais seções no 2º turno | 3.986 | −0,049 | −0,04 (−1,7) |
| Urna trocada (nº interno diferente) | 2.553 | −0,027 | 0,00 (−0,2) |

Os títulos de mesário não saem do script. Ele só conta e compara (regra 6).

- **Liberações sem biometria por eleitor a mais:**
  - eleitor de **excesso**: 0,154 ± 0,003;
  - eleitor do aumento **esperado**: 0,255 ± 0,012 (t da diferença = −10,3).
- **Habilitações com a digital de um mesário registrado:** 0,059 por eleitor de excesso, contra 0,139 no esperado (t = −10,9).
- Nas 680 seções com z ≥ 3, o Δ de liberações sem biometria é 3.014 para 17.557 eleitores a mais (17%). Nas 295.275 seções, é 338.601 para 1.345.083 (25%).
- A cauda direita fica espalhada pelas zonas. Nenhuma zona passa de 5 seções com z ≥ 3. O máximo esperado entre 2.640 zonas é de cerca de 1 zona com 5 quando a média é 0,6 por zona (Poisson). MG 0187, MG 0237 e PA 0095 têm 5 cada.
- **Leitura (princípio 8).** Se mesários tivessem liberado eleitores sem biometria para inflar o comparecimento, o excesso teria **mais** liberação manual, não menos. Também se concentraria em mesas específicas, e não se concentra. Isso não exclui o uso local da brecha numa seção isolada. As candidatas são as do [02](02-distribuicao-e-klimek.md), com alta por ano de nascimento.

### O excesso favorece um lado mais do que a proporção da seção prevê? (exploratório)

Modelo: Δvotos do finalista ~ excesso × parcela do 1º turno + excesso × (1 − parcela) + o mesmo para o aumento esperado + eliminados + queda de brancos e nulos, com efeito fixo de zona.

**Nacional (Fato):**

| | Vai para o 13 | Vai para o 22 |
|---|---|---|
| Excesso onde o 13 é forte (× parcela do 13) | 0,970 | 0,049 |
| Excesso onde o 22 é forte (× parcela do 22) | 0,180 | 0,814 |
| Aumento esperado onde o 13 é forte | 1,205 | −0,136 |
| Aumento esperado onde o 22 é forte | 0,336 | 0,833 |

- Por decil da parcela do 13 no 1º turno, a parte do excesso que vai ao 13 é cerca de 0,11 + 0,86 × parcela:
  - 0,317 no decil de parcela 21,8%;
  - 0,526 no de 44,5%;
  - 0,821 no de 82,6%.
  - O eleitor a mais pende uns 8 a 10 p.p. para o 13 em relação à seção dele, em todos os decis menos o último, e de forma suave. O retorno de abstencionistas estimado por Goodman tem essa mesma inclinação (0,07 para o 13 contra 0,04 para o 22, [cientista-politico/01](../cientista-politico/01-balanco-turnos.md)).
- **Excesso contra esperado:** o excesso é **menos** pró-13 que o aumento esperado (d = −0,156, t = −7,5, no termo "13 onde é fraco") e mais pró-22 (d = +0,185, t = +12,3).
- Por UF (54 testes, BH), o sinal segue a região:
  - o excesso pende mais para o 22 que o esperado em GO, SC, RS, MT, PR, ES, MG, SP, TO, MS e PI;
  - pende mais para o 13 em AM, AP e RR, no Norte, onde o comparecimento caiu.
- **Por que este teste é só exploratório:** o "aumento esperado" varia dentro da zona pela abstenção do 1º turno, e essa abstenção se correlaciona com renda e região. O coeficiente dele tem viés ecológico: passa de 1 e fica negativo.
  - A simulação do [05](05-poder.md) confirma: sem nenhuma inserção, a regra "excesso mais pró-22 que o esperado" já dispara (t = 12,6).
  - **Este teste não deve ser usado como alarme.** O que ele mostra com segurança é que **não há um único sentido**: o excesso não favorece sistematicamente o 13, e no Sul e no Centro-Oeste pende para o 22.

## Pergunta 4: o aumento foi maior em seções pró-13 ou pró-22?

Gradiente dentro da zona, em p.p. por +10 p.p. de parcela do 13 entre os finalistas no 1º turno (peso aptos, EP agrupado por município):

| | Nacional | N | NE | CO | SE | S | Exterior |
|---|---|---|---|---|---|---|---|
| Δ comparecimento bruto | **+0,234** (t = 12,7) | −0,251 | +0,366 | +0,275 | +0,279 | +0,258 | +0,304 |
| Abstenção do 1º turno | +0,563 (12,0) | −0,387 | +0,253 | +0,916 | +0,997 | +1,389 | −1,147 |
| Δ comparecimento depois do modelo | **+0,141** (7,9) | −0,156 | **+0,320** | +0,075 | +0,108 | +0,042 | +0,518 |
| Queda de brancos e nulos | **+0,285** (20,7) | +0,056 | +0,267 | +0,282 | +0,390 | +0,391 | −0,017 |

Por decil da parcela do 13, entre todas as seções do país:

| Decil | Parcela do 13 | Abstenção 1º | Δ comparecimento (p.p.) | Esperado pelo modelo | Excesso | Queda de BN (p.p. dos aptos) |
|---|---|---|---|---|---|---|
| 1 | 21,9% | 20,2% | +1,51 | +1,59 | −0,08 | 0,48 |
| 3 | 35,5% | 21,5% | +1,85 | +1,90 | −0,05 | 0,80 |
| 5 | 44,5% | 22,0% | +1,93 | +2,01 | −0,09 | 1,04 |
| 7 | 55,3% | 21,2% | +2,08 | +2,15 | −0,07 | 1,42 |
| 9 | 70,4% | 20,3% | +1,88 | +1,96 | −0,08 | 1,70 |
| 10 | 82,5% | 20,1% | +1,68 | +1,59 | **+0,13** | 1,65 |

- **Fato:** o aumento tem forma de U invertido. Ele é maior nas seções disputadas (decis 5 a 8) e menor nos dois extremos. A abstenção do 1º turno tem a mesma forma, e o modelo de transição reproduz o padrão do decil 1 ao 9.
- **Fato:** sobra um excesso de +0,13 p.p. no decil mais pró-13 (82,5%), contra −0,05 a −0,10 nos outros. Isso dá 17.649 eleitores de excesso nas 49.897 seções do decil (14,0 milhões de aptos), cerca de 0,35 por seção.
- **Fato:** a queda de brancos e nulos sobe com a parcela do 13, de 0,48 a 1,70 p.p. dos aptos. **Nos votos nominais, a assimetria vem mais da queda de brancos e nulos (+0,29 por 10 p.p.) do que do comparecimento (+0,23).**
- Por UF, depois do modelo (28 testes, BH), 15 UFs têm q < 0,05:
  - positivas: PI +0,49, exterior +0,52, BA +0,33, CE +0,32, MA +0,31, PB +0,30, PE +0,27, RN +0,27, SE +0,24, MS +0,19, SP +0,15, MG +0,15, ES +0,11;
  - negativas: RJ −0,14 e PA −0,22;
  - no Norte o sinal é negativo, como o cientista político já tinha visto.
- **Leitura.** "O aumento veio das seções pró-13" é verdade só em parte e com efeito pequeno:
  - a maior parte se explica pela volta de quem faltou no 1º turno e pela queda de brancos e nulos, maior onde o 13 é forte;
  - o resíduo está no Nordeste (+0,32) e nos redutos mais fortes do 13, e é de décimos de ponto.
  - **Hipótese benigna:** mobilização de 2º turno nos redutos do Nordeste. Ela inclui transporte de eleitor, que é comportamento humano sem rastro técnico (princípio 8): fica como **risco**.
  - A pergunta 2 mostra que, nas seções de maior excesso, o eleitor a mais foi habilitado pela digital.
  - **Ordem de grandeza:** mesmo se os 17.649 eleitores de excesso do decil 10 fossem todos falsos e votassem no 13 com a parcela da seção (82,6%), seriam ~14,6 mil votos líquidos para o 13 (≈ 11,5 mil de diferença sobre o 22), cerca de 0,3% da diferença final de 4,43 milhões.

## Pendências

1. Linha de base de 2022 por seção para o gradiente da pergunta 4: se em 2022 o aumento também foi maior nos redutos de quem crescia (o 22), o padrão é estrutural.
2. Cruzar os 151 locais de alta com biometria e horário (frente de biometria e linha do tempo).
3. Perfil de renda por setor censitário para as altas relativas de SC 0063, RS 0099 e SP 67458.
