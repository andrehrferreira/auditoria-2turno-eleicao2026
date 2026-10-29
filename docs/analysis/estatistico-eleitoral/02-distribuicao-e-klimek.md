# 02. A distribuição do Δcomparecimento e a impressão digital de Klimek aplicada à variação (pergunta 1)

Estatístico eleitoral, 29/10/2026. Comando: `node --max-old-space-size=8192 scripts/auditoria/estatistico-dc-distribuicao.mjs abertos 10` → `dc-abertos.json` (`p1`, `klimek`), `dc-abertos-klimek.csv` (histograma 2D, faixas de 1 p.p.), `dc-abertos-klimek.svg`, `dc-abertos-extremas.csv`. Conferência no bruto: `node scripts/auditoria/estatistico-conferir.mjs` → `conferencia-bruto.csv`. Método e modelo nulo em [01](01-dados-e-metodo.md).

**Hipótese nula (declarada antes).** O aumento de comparecimento é mobilização difusa: dentro da zona, cada seção varia em torno do esperado por modelo de transição e idade, com ruído de eleitores independentes. **Alternativa:** inserção concentrada, isto é, um grupo de seções com aumento grande. A previsão é uma cauda direita mais pesada que a esquerda, ou um segundo aglomerado, e excesso que puxa a parcela do beneficiado.

## Resposta curta

- **Fato:** a distribuição é **unimodal e suave**. A cauda que existe é a **esquerda** (queda de comparecimento), não a direita.
- **Fato:** nenhuma das 28 UFs tem cauda direita maior que a esquerda.
- **Fato:** o excesso de comparecimento **não move** a parcela do 13 dentro da zona. A impressão digital de Klimek aplicada à variação é nula.

## Distribuição (Fato, 498.964 seções, 28 UFs)

| | Δ em p.p. dos aptos | Δ em eleitores |
|---|---|---|
| Mediana | **+1,91** | **+6** |
| p25 / p75 | +0,31 / +3,46 | +1 / +11 |
| p5 / p95 | −2,99 / +5,83 | −8 / +20 |
| p1 / p99 / p99,9 | −7,60 / +7,84 / +10,95 | −21 / +29 / +46 |
| Mín. / máx. | −70,7 / +25,9 | −152 / +117 |
| Assimetria / curtose em excesso | **−1,42** / 9,4 | −0,46 / 5,6 |

- Total: +2.961.430 comparecimentos nas seções analisadas. O modelo da zona espera +3.054.352.
- **Uma moda só**, em +2,25 p.p. no histograma de 0,5 p.p. suavizado. Não há segundo pico nem ombro à direita. As contagens caem de forma monotônica a partir da moda: 12.041 seções entre +6 e +7 p.p., 2.413 entre +8 e +9, 513 entre +10 e +11, 56 entre +13 e +14 e 1 entre +20 e +21.
- A cauda longa é a de **queda**: 42 seções abaixo de −30 p.p. e nenhuma acima de +26.

## Resíduo padronizado z contra o nulo (Fato)

| Limiar | Observado acima (z ≥ k) | Nulo (média de 10 sorteios; máximo) | Observado abaixo (z ≤ −k) | Nulo |
|---|---|---|---|---|
| 2 | 11.693 | 10.387 (10.496) | 14.367 | 12.292 |
| 3 | **1.113** | 492 (516) | **2.125** | 893 |
| 4 | **105** | 7,9 (12) | **439** | 33,8 |
| 5 | 16 | 0 (0) | 155 | 0,8 |
| 6 | 6 | 0 | 66 | 0 |
| 8 | 0 | 0 | 22 | 0 |

- O z observado tem desvio-padrão 1,04 e curtose em excesso 8,3. O nulo sorteado tem 1,00 e 0,02. A massa central é a do nulo, como a calibração exige. **As duas caudas são mais pesadas que a binomial:** existe heterogeneidade extra-binomial entre seções da mesma zona.
- **A cauda direita é bem mais leve que a esquerda:** 105 contra 439 em z ≥ 4 e 16 contra 155 em z ≥ 5. Teste binomial da simetria por UF (cauda direita maior que a esquerda, z ≥ 4, 28 testes, BH): **nenhuma UF** tem q < 1.
  - A mais equilibrada é MG: 23 seções acima e 28 abaixo.
  - O RS empata: 7 e 7.
- **Leitura.** O excesso de seções em relação ao nulo é de cerca de 97 em z ≥ 4 à direita (105 − 8) e de cerca de 405 à esquerda. Ele vem de choques locais nos dois sentidos, mais frequentes no sentido da queda. Na queda, os casos conhecidos são o interior amazônico e as comunidades ribeirinhas ([cientista-politico/01, E1](../cientista-politico/01-balanco-turnos.md)).
  - **Tamanho em votos:** as 105 seções com z ≥ 4 somam **2.894 eleitores de excesso** (3.782 de Δ bruto). As 1.113 com z ≥ 3 somam 21.402 (29.895 de Δ bruto). São 0,1% e 0,7% do aumento nacional de 2,96 milhões. Mesmo que todo esse excesso fosse falso, ele não explicaria o +4%.
- **Valor-p por seção (exploratório):** 42 seções têm q (BH) < 0,05 entre 498.964 testes. Como o nulo tem caudas leves demais nos dois sentidos, esse q é otimista. Ele serve para ordenar, não para acusar.

### Conferência no BU bruto das 20 seções de maior z (Fato)

As 20 batem com o BU .dat dos dois turnos: comparecimento, 13 e 22 (`conferencia-bruto.csv`). Em **19 das 20, a maior parte do acréscimo veio de habilitação por biometria**, que é controle técnico com rastro (princípio 8). Em 14 delas, a biometria responde por 80% ou mais do acréscimo. Exemplos:

| Seção | z | Comparecimento | 13 | 22 | Por biometria | Ano de nascimento | Sem biometria cadastrada |
|---|---|---|---|---|---|---|---|
| PA 04421/0101/0163 | 7,4 | 263 → 310 | 260 → 308 | 0 → 1 | 261 → 309 | 2 → 1 | 0 → 0 |
| PR 75663/0146/0434 | 7,4 | 250 → 310 | 225 → 289 | 15 → 20 | 245 → 301 | 5 → 9 | 0 → 0 |
| MT 98310/0035/0321 | 7,3 | 294 → 355 | 275 → 337 | 17 → 15 | 258 → 322 | 22 → 16 | 14 → 17 |
| PA 05835/0106/0330 | 5,2 | 128 → 212 | 126 → 212 | 2 → 0 | 125 → 203 | 3 → 9 | 0 → 0 |
| SP 63452/0075/0459 | 5,0 | 248 → 292 | 91 → 131 | 128 → 147 | 221 → 253 | 22 → 35 | 5 → 4 |

- A exceção e os dois casos mistos, em que a liberação por ano de nascimento pesou:
  - **MA 08630/0045/0068 (exceção):** comparecimento 175 → 202, ano de nascimento 8 → 29, por biometria 149 → 152;
  - **PE 23094/0064/0218 (misto):** comparecimento 295 → 355, ano de nascimento 35 → 60 (42% do acréscimo). No perfil do log, as habilitações pelo mesário passaram de 0 para 48;
  - **MG 41033/0009/0220 (misto):** comparecimento 212 → 247, ano de nascimento 10 → 26 (46% do acréscimo).
  - **Recomendação** (frente de biometria): ler o log dessas três seções. Ver o horário das liberações por ano de nascimento, se houve rajada e qual mesário as fez. Pelo princípio 8, a liberação por ano de nascimento é brecha humana. As três são **Hipótese** a testar, não Fato de inserção.
- Várias das maiores altas são seções quase unânimes para o 13 no 1º turno (PA 04421/0163: 260 de 263; PA 05835/0106: 0244 e 0330). O perfil é de comunidade indígena ou isolada, onde o comparecimento depende de transporte e varia muito entre turnos. O demógrafo e o cientista político viram o mesmo em MS e no Norte. **Hipótese** benigna, mas o transporte de eleitor é comportamento humano: fica como **risco**, não como explicação que reduz risco (princípio 8). O que reduz o risco aqui é o rastro técnico: os eleitores a mais foram habilitados pela digital.

## Klimek aplicado à variação (Fato)

Eixo x: excesso de comparecimento sobre o modelo da zona (p.p. dos aptos). Eixo y: Δ da parcela do 13 entre os finalistas, do 1º para o 2º turno, menos a média da zona. Assinatura de enchimento: nuvem esticada para (+, +), com o excesso puxando a parcela do beneficiado (para o 22, o canto (+, −)).

| | Valor |
|---|---|
| Seções | 498.962 |
| Correlação x × y | **+0,002** |
| Inclinação dentro da zona (EP agrupado por município) | +0,003 ± 0,003 p.p. por p.p. (t = 1,0) |
| Só o lado do excesso positivo | **−0,005 ± 0,005** (t = −1,1) |
| Canto x ≥ +5 p.p.: y ≥ +5 / y ≤ −5 | 118 / 154 |
| Canto x ≥ +10 p.p.: y ≥ +5 / y ≤ −5 | 11 / 12 |
| Canto x ≥ +10 e \|y\| ≥ 10 | 4 / 2 |
| Espelho x ≤ −10 p.p.: y ≥ +5 / y ≤ −5 | 106 / 104 |

- **A nuvem é redonda e não tem inclinação.** As seções com mais comparecimento que o esperado não viraram mais para o 13 nem para o 22. Os cantos são simétricos e pequenos: 11 contra 12 seções com x ≥ +10 p.p.
- O 1º turno não serve de linha de base para este gráfico, porque ele já é a variação entre os turnos. A linha de base é o espelho: o lado da queda (x ≤ −10) é simétrico (106 / 104), como o lado da alta.
- A figura (`dc-abertos-klimek.svg`, escala log) mostra uma mancha única centrada na origem.

## O que este resultado não exclui

- **Inserção uniforme numa zona inteira** cai no esperado da zona e não aparece no z. No [05](05-poder.md), a inserção de +10 votos em 5% das seções, concentrada em zonas inteiras, **não foi detectada por nenhuma regra**.
- **Inserção pequena e espalhada** (+5 em 5% das seções): ver o poder no [05](05-poder.md).
- **Inserção que se repete nos dois turnos** some na diferença.
- **Fraude que muda o voto e não o comparecimento**, como troca de voto ou voto de quem já estava no comparecimento, não deixa marca no Δcomparecimento.

## Explicações alternativas

| Explicação | Testada? | Resultado |
|---|---|---|
| Regressão à média (seção com falta alta no 1º sobe mais) | Sim, está no modelo (transição por zona) | Absorve o grosso. Sem ela, o Δ bruto tem cauda maior |
| Idade: idosos faltam mais no 1º e são mobilizados no 2º | Sim, covariável dentro da zona | +0,019 por unidade de parcela 60+ (t ≈ 6). Pequeno, suave e monotônico, como no demógrafo |
| Seções pequenas são mais voláteis | Sim, calibração por tamanho | Mediana de z² 0,67 nas seções de 20–100 aptos (2.786). Viés leve para z alto nelas. Nenhuma das 20 maiores é desse grupo |
| Choques locais (transporte, evento, clima) | Indireta: as caudas são pesadas nos dois sentidos, e mais na queda | Compatível. O caso por caso fica com o cientista político |
