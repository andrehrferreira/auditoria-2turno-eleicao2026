# 01. Aumento de comparecimento entre os turnos: dados, modelo nulo e testes

Estatístico eleitoral, 29/10/2026. Rótulos: **Fato** (sai de script do repo sobre arquivo público), **Hipótese**, **Recomendação**. Princípio 8 (doc 01): habilitação por biometria registrada no BU e no log conta como controle técnico. Liberação por ano de nascimento, mesário, fiscal e transporte de eleitor não contam.

## Por que esta análise

O cientista político ([01](../cientista-politico/01-balanco-turnos.md), [04](../cientista-politico/04-linha-de-base-historica.md)) mostrou que a novidade de 2026 é o volume: os votos nominais cresceram **+4,0%** entre os turnos, contra +0,3% em 2022 e −2,1% em 2018. Este estudo pergunta, **seção a seção**, se esse aumento tem a forma de mobilização difusa ou a de inserção concentrada.

## Como reproduzir

```bash
node --max-old-space-size=8192  scripts/auditoria/estatistico-pares.mjs abertos           # ~2 min, 28 UFs
node --max-old-space-size=12288 scripts/auditoria/estatistico-pares.mjs banco             # ~2 min, UFs com o 1º turno na cópia
node --max-old-space-size=8192  scripts/auditoria/estatistico-dc-distribuicao.mjs abertos 10   # ~3 min: perguntas 1, 3 e 4
node --max-old-space-size=8192  scripts/auditoria/estatistico-dc-biometria.mjs            # ~1 min: perguntas 2 e 3 (mesário)
node scripts/auditoria/estatistico-conferir.mjs                                           # BU bruto das 20 seções mais extremas
node --max-old-space-size=10240 scripts/auditoria/estatistico-dc-poder.mjs banco 5        # ~13 min: pergunta 5
```

**Quando o 1º turno de SP (ou outra UF) entrar na cópia de leitura** (`node src/banco-leitura.js --publicar`, feito por quem carrega), rode tudo de novo com:

```bash
node scripts/auditoria/estatistico-dc-refazer.mjs            # ~25 min, um processo pesado por vez
node scripts/auditoria/estatistico-dc-refazer.mjs --sem-abertos   # só a parte do banco (perguntas 2 e 5)
```

Saídas em `data/parsed/auditoria/estatistico-eleitoral/`: `pares-*.csv/json`, `dc-abertos.json` (com `-extremas.csv`, `-zonas.csv`, `-klimek.csv` e `-klimek.svg`), `biometria.json` (com `biometria-extremas.csv`), `conferencia-bruto.csv` e `poder-banco.json`.

Código comum: `scripts/auditoria/estatistico-lib.mjs`. Ele reaproveita a leitura de CSV e os sorteios de `forense-lib.mjs`.

## Dados (Fato)

| Fonte | UFs | Seções pareadas | Usada em |
|---|---|---|---|
| Dados abertos: `detalhe_votacao_secao_2026_BR.csv` (gerado em 26/10 09:49) + `votacao_secao_2026_BR.csv` (26/10 12:07) | 28 (27 + exterior) | 499.207 (498.964 depois do filtro) | perguntas 1, 3 (zona, município, local, modelo de urna), 4 e o lado favorecido |
| Cópia de leitura do banco (`eleicao2026-20261029T092711.sqlite`): BU, detalhamento do comparecimento, urna, perfil do log | 22 | 339.061 (338.884 depois do filtro) | perguntas 2, 3 (mesário, urna trocada) e 5 |

- **A cópia tem o 1º turno em 22 UFs, não 25.** O `atual.json` diz 25, mas as tabelas `secao` e `carga` do 1º turno têm 22: faltam RS, SC, SE, SP, TO e o exterior. O perfil do log do 1º turno falta também em AM e BA (sem análise de mesário nessas duas).
- **H03 no 1º turno, 22 UFs (Fato):** nas 339.061 seções, aptos, comparecimento e votos do 13, do 22, dos demais e brancos/nulos do BU são **iguais** aos dos dados abertos. Exceção: 2 seções de MG do Sistema de Apuração (comparecimento 0 no banco, 281 e 278 nos dados abertos), as mesmas já apontadas pelo cético ([06](../cetico-revisor/06-comparecimento-extra-sem-vies-biometria.md)). Por isso as perguntas 1, 3 e 4 usam os dados abertos das 28 UFs.
- Conferências dos dados abertos: votos de 13 + 22 + demais + brancos + nulos = comparecimento em todas as seções dos dois turnos; nenhum voto sem seção. Ficaram de fora 41 seções sem par ou não instaladas.
- Sem biometria cadastrada + por biometria + por ano de nascimento = comparecimento em 100% das seções do banco, nos dois turnos.
- **Filtro:** aptos ≥ 20 no 2º turno, comparecimento ≥ 10 no 1º e aptos que mudam no máximo 10 entre os turnos (saem 237 seções, quase todas de voto em trânsito).

## Modelo de referência (o "esperado")

Para cada seção i da zona z:

1. **Transição por zona:** c2 ≈ r_z·c1 + s_z·(a2 − c1). r é a taxa de permanência (quem votou no 1º volta) e s a de retorno (quem faltou vota). Elas saem de mínimos quadrados entre as seções da zona: 2.310 zonas com ajuste próprio e 331 (menos de 15 seções ou r, s fora de [0, 1]) com o r do município ou da UF. O modelo já contém a **regressão à média**: a seção que faltou muito no 1º turno sobe mais.
2. **Covariáveis dentro da zona:** parcela 60+ do eleitorado (perfil do eleitorado, com as agregadas somadas à principal) e log dos aptos. Os coeficientes são +0,019 ± 0,003 por unidade de parcela 60+ e +0,015 ± 0,001 por log(aptos), em eleitores por apto (efeito fixo de zona, EP agrupado por município). Isso confirma o efeito de idade do demógrafo ([06](../demografo/06-variacao-entre-turnos.md)).
3. **Excesso** = c2 − esperado, em eleitores.
4. **Nulo binomial:** c2 = Bin(c1, r_i) + Bin(a2 − c1, s_i), eleitores independentes. A variância é V_i = φ_z·a2·p(1 − p), com φ_z calibrado na zona, ou na UF quando a zona tem menos de 30 seções. A calibração usa a **mediana**: mediana de excesso²/V = 0,4549, que é a do χ² com 1 grau de liberdade. Assim uma cauda de seções anômalas não alarga o nulo. **z = excesso/√V.**

**Por que não usar o r e o s da regressão na variância.** Eles são ecológicos. A mediana entre zonas é r = 0,98 e s = 0,17, porque a propensão a votar varia entre eleitores. Com eles, a variância binomial fica artificialmente pequena e o z explode: a primeira versão deste script deu z = 12 para +19 eleitores. A calibração pela massa central resolve isso. O que ela implica é plausível:

- φ entre 0,54 (RS) e 0,93 (BA) no Sul, Sudeste, Centro-Oeste e Nordeste. O Δ da mesma seção é **mais estreito** que uma binomial simples, porque são os mesmos eleitores nos dois turnos.
- Na transição: permanência mediana de 0,89 a 0,95 e retorno de 0,27 a 0,56.
- No Norte e no exterior, φ > 1 (AP 2,2; RR 1,7; AC 1,5; exterior 2,6): Δ mais volátil. Nessas seções (68.805, 14%) o nulo vira beta-binomial. Em 46 seções pequenas, com esperado no limite, ele vira normal.
- **Checagem:** a mediana de z² fica em 0,44–0,50 nas faixas de 100 a 400+ aptos. Nas seções com 20 a 100 aptos (2.786) ela é 0,67: o modelo subestima um pouco a variância das seções pequenas.

O nulo é sorteado 10 vezes (semente fixa) com os mesmos parâmetros, e o z simulado é comparado com o observado.

## Testes feitos (quantos e de que tipo)

| Pergunta | Teste | Nº de testes | Correção | Tipo |
|---|---|---|---|---|
| 1 | Forma da distribuição (modas, assimetria, curtose), caudas observadas × nulo × cauda espelhada | 1 nacional + 28 UFs (cauda direita × esquerda, z ≥ 4) | BH nas 28 | confirmatório (hipótese declarada: inserção concentrada gera cauda ou aglomerado à direita) |
| 1 | Valor-p por seção (z, unilateral) | 498.964 | BH | exploratório (só ordena para conferência; o nulo tem cauda leve demais) |
| 1 | Klimek na variação: inclinação de Δparcela do 13 sobre o excesso, cantos do histograma 2D | 3 (inclinação total, negativa, positiva) + 3 limiares de canto | — | confirmatório |
| 2 | Composição do acréscimo por faixa de z; parte do excesso × do esperado em cada categoria de habilitação | 3 nacionais + 66 por UF | BH nas 66 | confirmatório |
| 2 | E2 por UF com efeito fixo de zona (sem biometria − por biometria) | 42 (21 UFs com EP × 2 finalistas); separado em 2 categorias: 84 | BH | confirmatório (réplica do cientista político) |
| 3 | Massa do excesso no topo; zonas e municípios (z robusto); locais de votação (permutação); modelo de urna; mesários | ~12 nacionais | Bonferroni quando citado | exploratório |
| 3 | Excesso × esperado no voto (termo cruzado) por UF | 54 | BH | exploratório (o nulo "esperado" tem viés ecológico, ver 03) |
| 4 | Gradiente de Δcomparecimento na parcela do 13, antes e depois do modelo | 1 nacional + 28 UFs + 6 regiões | BH nas 28 | confirmatório |
| 5 | 13 cenários × 5 réplicas × 6 regras | 61 rodadas | regras com limiar fixo | simulação |

Total citado no texto: **cerca de 400 testes formais**, mais a ordenação exploratória das 498.964 seções.

## Limites declarados

- **Não há linha de base por seção de 2022 ou 2018 no repositório**: só o `munzona`, que o cientista político usou. Aqui as linhas de base são internas: a cauda esquerda (queda de comparecimento), o nulo binomial, a composição do 1º turno e o aumento esperado da própria zona. **Recomendação:** obter `votacao_secao_2022` e `detalhe_votacao_secao_2022` (rede, com o coordenador) e rodar o mesmo pipeline sobre 2022 1º → 2º turno.
- O modelo absorve na zona tudo o que é comum à zona. **Uma inserção uniforme numa zona, num município ou numa UF inteira é invisível** a este desenho (a pergunta 5 mede isso).
- Inserção do mesmo tamanho nos dois turnos se cancela na diferença.
