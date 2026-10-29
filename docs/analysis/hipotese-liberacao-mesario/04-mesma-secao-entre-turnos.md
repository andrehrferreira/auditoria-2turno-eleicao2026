# 04. H13 pela mesma seção nos dois turnos (painel)

Estatístico eleitoral, 29/10/2026. Rótulos: **Fato** (sai de script do repositório sobre arquivo público), **Hipótese**, **Recomendação**. Princípio 8 (doc 01): a liberação pelo mesário é tratada como brecha a medir, não como controle.

## Resposta curta

**Fato.** Nas 497.667 seções das 27 UFs, comparadas com elas mesmas entre o 1º e o 2º turno, as liberações sem biometria **a mais** se dividiram entre o 13 e o 22 do mesmo jeito que os eleitores biométricos a mais. No **Nordeste** (140.757 seções), cada 100 liberações a mais moveram a margem 13 − 22 em **+0,14 voto** além do que 100 eleitores quaisquer a mais moveriam. O intervalo de 95% vai de −0,7 a +1,0. Se as liberações a mais fossem votos inseridos no 13, o esperado seria **+55,5**. Nas duas definições de liberação, a fração das liberações a mais compatível com voto inserido no 13 é de no máximo **1,7%** (L2) e **1,4%** (L1), cerca de 3.500 votos no Nordeste inteiro.

**Limite estrutural.** O voto é secreto. O log diz como cada eleitor foi habilitado, mas não em quem votou, e o RDV embaralha os votos. O voto dos liberados aqui é **estimado** pela variação entre turnos, nunca observado. Este método também não enxerga uma fraude **igual nos dois turnos**, que a diferença cancela.

## Pergunta e hipótese nula

Quando uma seção liberou mais gente sem biometria no 2º turno do que no 1º, esse acréscimo acompanhou mais votos do 13 do que o acréscimo de eleitores biométricos acompanhou?

**Definições** (`src/perfil-secoes.js`, doc 06):

- **L1** = `habilitadosPeloMesario` do log: liberação manual com o registro "Mesário … habilitou o eleitor", contada só quando termina em voto.
- **L2** = `semBiometriaCadastrada` + `comBiometriaHabilitadosPorAnoNascimento` do BU: todo eleitor habilitado sem digital. L2 contém L1.
- Componentes de L2: **SB** (sem biometria cadastrada, habilitado só por ano de nascimento) e **PG** (tinha biometria, a digital falhou, liberado manualmente). PG = L1 + PGsem, em que PGsem é a liberação manual sem mesário associado.

**Modelo** (primeira diferença, que funciona como efeito fixo de seção, mais efeito fixo de zona e erro-padrão agrupado por município):

```
Δy = β_C·Δcomparecimento + γ·ΔL + δ1·eliminados_1T + δ2·brancos-nulos_1T + zona + erro
y ∈ {votos 13, votos 22, margem 13 − 22}
```

- γ mede o voto a mais que uma liberação a mais traz **além** de um eleitor a mais qualquer.
- Os controles de eliminados e de brancos e nulos do 1º turno entram porque esses votos tinham de ir para algum lugar no 2º.
- **H0:** γ = 0 para a margem. A liberação a mais vota como qualquer eleitor a mais.
- **Assinatura de fraude:** se uma fração f das liberações a mais fosse voto inserido no 13, então γ_margem = f·(1 − β_C,margem). O script calcula f com o seu intervalo.

**Testes declarados antes de rodar** (cabeçalho do script, 2 testes, Bonferroni α = 0,025 cada):

- **C1:** Nordeste, L2, γ_margem = 0.
- **C2:** Nordeste, L1, γ_margem = 0.

Todo o resto é **exploratório**: outras regiões, UFs, classes de mesário, decomposição, cauda e extremos.

## Dados e amostra (Fato)

- **Fonte:** perfis de seção `data/parsed/<t>t/perfil/<uf>.jsonl`, a mesma fonte do `perfil_log` do banco.
  - A cópia de leitura vigente (09:27 UTC) tem o 1º turno em só 22 UFs na tabela `secao` e 20 no `perfil_log` (faltam AM e BA no log).
  - Os perfis do 1º turno estão completos nas 28 UFs (`data/manifest/1t/resumo.json`, mesmo número de seções do 2º turno), e a análise usa as **27 UFs**.
  - O exterior fica fora porque o BU de lá não tem detalhamento de habilitação.
- **Painel:** 497.667 seções, de 497.897. Ficaram fora:
  - 139 em que os aptos mudaram mais de 5% entre os turnos;
  - 60 com menos de 20 votantes;
  - 29 em que o log não reproduz o detalhamento do BU;
  - 2 sem detalhamento.
- **Validação:** nas seções que entraram, o log reproduz o detalhamento do BU nos dois turnos (biometria, ano de nascimento e dado pessoal). Os votos de presidente fecham com o comparecimento.

## Resultados por região (Fato, `entreturnos-resumo.json`)

γ_margem = votos a mais na margem 13 − 22 por liberação a mais, acima de um eleitor qualquer a mais. f = fração das liberações a mais compatível com voto inserido no 13, com intervalo de 95%.

| Região | Seções | L2 % 1º→2º | L1 % 1º→2º | ΔL2 | ΔL1 | γ_margem L2 (t) | f L2 [IC 95%] | γ_margem L1 (t) | f L1 [IC 95%] |
|---|---|---|---|---|---|---|---|---|---|
| Brasil | 497.667 | 12,23→12,42 | 4,10→4,57 | +601.722 | +720.677 | −0,0024 (−0,9) | −0,3% [−0,9; 0,4] | −0,0013 (−0,6) | −0,2% [−0,6; 0,3] |
| **Nordeste** | **140.757** | **11,45→11,75** | **4,35→4,94** | **+204.706** | **+249.957** | **+0,0014 (0,3)** | **+0,3% [−1,2; 1,7]** | **+0,0014 (0,5)** | **+0,3% [−0,9; 1,4]** |
| Norte | 43.749 | 9,09→9,08 | 3,31→3,74 | −22.362 | +36.813 | −0,0061 (−0,5) | −0,6% [−2,9; 1,7] | +0,0100 (1,4) | +1,0% [−0,4; 2,5] |
| Centro-Oeste | 38.028 | 10,55→10,36 | 4,11→4,44 | +2.903 | +39.263 | +0,0118 (1,1) | +1,2% [−1,0; 3,5] | +0,0026 (0,4) | +0,3% [−1,0; 1,6] |
| Sudeste | 203.153 | 13,72→13,97 | 3,73→4,19 | +351.721 | +308.607 | **−0,0149 (−4,0)** | **−1,7% [−2,5; −0,8]** | −0,0074 (−2,5) | −0,8% [−1,5; −0,2] |
| Sul | 71.980 | 12,26→12,26 | 5,11→5,43 | +64.754 | +86.037 | +0,0055 (1,0) | +0,6% [−0,6; 1,7] | −0,0037 (−1,0) | −0,4% [−1,1; 0,4] |

### Nordeste em detalhe

| UF | Seções | ΔL2 | ΔL1 | γ_margem L2 (t) | f L2 [IC 95%] | γ_margem L1 (t) | f L1 [IC 95%] |
|---|---|---|---|---|---|---|---|
| AL | 7.096 | +8.582 | +13.288 | −0,021 (−1,1) | −2,7% [−7,7; 2,3] | +0,004 (0,4) | +0,5% [−2,2; 3,2] |
| BA | 35.464 | +67.587 | +77.320 | −0,008 (−1,5) | −1,8% [−4,1; 0,6] | −0,002 (−0,3) | −0,4% [−2,6; 1,8] |
| CE | 23.759 | +28.303 | +37.721 | +0,008 (0,8) | +1,4% [−2,2; 5,0] | +0,004 (0,5) | +0,8% [−2,4; 3,9] |
| MA | 18.076 | +7.886 | +25.025 | −0,002 (−0,1) | −0,3% [−4,0; 3,4] | −0,015 (−1,6) | −2,5% [−5,6; 0,5] |
| PB | 10.708 | +13.637 | +16.419 | +0,020 (1,0) | +3,1% [−3,0; 9,2] | −0,010 (−1,1) | −1,6% [−4,4; 1,2] |
| PE | 21.405 | +54.870 | +40.871 | +0,010 (0,7) | +2,0% [−3,7; 7,8] | **+0,023 (2,9)** | **+4,7% [1,5; 7,9]** |
| PI | 10.220 | +6.845 | +15.921 | −0,005 (−0,3) | −0,8% [−6,1; 4,4] | +0,002 (0,2) | +0,3% [−2,6; 3,3] |
| RN | 8.110 | +11.596 | +15.983 | +0,022 (1,3) | +3,3% [−1,5; 8,2] | +0,005 (0,5) | +0,7% [−2,4; 3,8] |
| SE | 5.919 | +5.400 | +7.409 | −0,008 (−0,4) | −1,4% [−8,3; 5,6] | −0,019 (−1,5) | −3,4% [−7,7; 1,0] |

### Testes confirmatórios (Fato)

| Teste | γ_margem | Erro-padrão | p (normal) | p (permutação na zona, 2.000) | Decisão (α = 0,025) |
|---|---|---|---|---|---|
| C1, Nordeste, L2 | +0,0014 | 0,0042 | 0,76 | 0,72 | não rejeita H0 |
| C2, Nordeste, L1 | +0,0014 | 0,0031 | 0,62 | 0,63 | não rejeita H0 |

- **Poder (Fato).** Com estes erros-padrão, o teste detectaria com 80% de chance uma fração f de **2,1%** (L2) ou **1,6%** (L1) das liberações a mais virando voto no 13. Isso equivale a cerca de 4.300 e 4.000 votos no Nordeste. O teste não é cego. Ele exclui um efeito desse tamanho ou maior.
- **Robustez (Fato).** O resultado não depende do nível do efeito fixo. Trocar a zona pelo município ou pela UF serve para o caso de uma fraude que atingisse a zona inteira, que o efeito de zona absorveria. γ_margem no Nordeste:
  - L2: +0,0014 (zona), +0,0008 (município), −0,0007 (UF);
  - L1: +0,0014, +0,0006, +0,0018;
  - todos com |t| ≤ 0,5.

### Por caminho de habilitação (exploratório, Fato)

Modelo C: voto a mais por eleitor a mais de cada tipo. As quatro parcelas somam o comparecimento.

| Nordeste | Biométrico | Sem biometria cadastrada (SB) | Liberado pelo mesário (L1) | Liberado manual sem mesário (PGsem) |
|---|---|---|---|---|
| 13 | 0,690 | 0,755 | 0,687 | 0,685 |
| 22 | 0,251 | 0,208 | 0,251 | 0,252 |
| Margem | 0,439 | 0,547 | 0,437 | 0,433 |

- **O caminho que depende do mesário vota igual ao biométrico.** No modelo D, o excesso da liberação manual (PG = L1 + PGsem) sobre um eleitor qualquer a mais, na margem, é:

| Região | Excesso de PG na margem (t) |
|---|---|
| Nordeste | −0,004 (−0,8) |
| Norte | −0,005 (−0,4) |
| Centro-Oeste | −0,004 (−0,4) |
| Sul | −0,002 (−0,4) |
| Sudeste | −0,013 (−3,4) |

- **O eleitor sem biometria cadastrada a mais inclina para o 13, e não só no Nordeste.** Excesso de SB na margem:

| Região | Excesso de SB na margem (erro-padrão, t) |
|---|---|
| Nordeste | +0,108 (0,031; 3,4) |
| Centro-Oeste | +0,280 (0,059; 4,7) |
| Sul | +0,173 (0,054; 3,2) |
| Sudeste | −0,033 (0,019; −1,8) |
| Norte | −0,022 (0,044; −0,5) |

  - No Nordeste, os 55.709 SB a mais valem cerca de **6.000 votos de margem**, ou 0,24% do ganho de margem do 13 na região (+2.557.677).
  - Com Bonferroni sobre as 15 regiões e UFs do modelo D, Nordeste, Centro-Oeste e Sul passam. Sobre os 254 testes do script, só o Centro-Oeste passa.
- **Hipótese (benigna, composição).** SB não é decisão do mesário. É um tipo de eleitor: quem não tem digital no cadastro. Quando o comparecimento desse grupo sobe, a seção recebe mais eleitores com o perfil dele.
  - O mesmo grupo já se associa ao 13 no corte transversal do **1º turno**, com tamanho parecido (A9, [biometria-mesarios/05](../biometria-mesarios/05-a9-regressao.md): β = 0,155 no 1º turno e 0,142 no 2º).
  - O efeito é maior no Centro-Oeste e no Sul do que no Nordeste. Isso não combina com uma ação concentrada no Nordeste.
- **Hipótese (risco).** Pelo princípio 8, a habilitação por ano de nascimento também é humana: a mesa digita o título e o ano. Votos inseridos por esse caminho também produziriam este sinal. Não dá para separar as duas hipóteses sem a idade do grupo sem biometria por seção.

### Mesário igual ou diferente entre os turnos (exploratório, Fato)

A classe vem dos títulos que habilitaram eleitores em cada turno (`liberacoesPorMesario`). Os títulos não saem do script.

| Nordeste | Seções | ΔL1 médio | γ_margem L1 (erro-padrão, t) | γ_margem L2 (t) |
|---|---|---|---|---|
| Mesmo habilitador nos dois turnos | 96.880 | +1,2 | +0,0040 (0,0041; 1,0) | +0,0052 (1,1) |
| Habilitadores diferentes | 18.139 | +1,9 | −0,0154 (0,0080; −1,9) | −0,0205 (−1,8) |
| Habilitador só num dos turnos | 18.218 | +5,4 | +0,0048 (0,0060; 0,8) | +0,0019 (0,2) |
| Nenhum habilitador | 7.520 | 0 | — | +0,0012 (0,1) |

- Onde o mesário habilitador mudou, a liberação a mais pendeu de leve **para o 22**, sem significância depois da correção. No Brasil: −0,0093 (t −1,9).
- **Fato (reclassificação, não liberação nova).** L1 cresceu muito mais que L2 porque parte da liberação manual passou de "sem mesário associado" para "com mesário". No Nordeste:

| Nordeste | 1º turno | 2º turno | Variação |
|---|---|---|---|
| L1 | 1.544.679 | 1.794.636 | +16,2% |
| PGsem | 916.686 | 815.726 | −11,0% |
| PG total | 2.461.365 | 2.610.362 | +6,1% |
| Comparecimento | | | +2,3% |

  - No Brasil, L1 subiu 14,1% e PGsem caiu 13,4%.
  - A classe "só num dos turnos" concentra o salto: no Brasil, de 136.075 para 450.520 liberações em L1.

### Cauda e seções extremas (exploratório)

- **Cauda (Fato).** Comparamos os votos observados com os previstos por um modelo sem liberação.
  - Nordeste, ΔL2 ≥ 20: 760 seções, 19.679 liberações a mais. O 13 teve **+76 votos** acima do previsto (erro-padrão 155, z 0,49) e o 22, −75.
  - Nordeste, ΔL1 ≥ 10: 19.184 seções. O 13 teve −378 (z −0,55).
  - No Brasil, com ΔL1 ≥ 10 (61.919 seções), o 13 ficou **5.837 votos abaixo** do previsto (z −4,5) e o 22, 4.711 acima (z 3,7). A diferença vem do Sudeste (−4.218) e do Sul (−1.807). É o sentido **contrário** ao da H13, e pequeno: 0,006 voto por liberação.
- **Extremos (Fato).** Calculamos o z robusto (mediana/MAD) do resíduo da margem nas 497.667 seções. O corte de Bonferroni é |z| > 5,33.
  - **34 seções** passam do corte: 26 pró-13 e 8 pró-22.
  - **Só 2 delas** têm ΔL2 ≥ 10, uma em cada sentido, as duas na capital paulista.
  - As caudas do resíduo são mais pesadas que a normal, então o corte só ordena as seções.
- **Conferidas no arquivo bruto, nos dois turnos** (`-bu.dat`, `-imgbu.dat` impresso e `-log.jez`, por `liberacao-entreturnos-conferir.mjs`). Os números batem com o painel.
  - **SE, Itabaianinha, 31593/0030/0173** (z +4,77, maior pró-13 do Nordeste com liberação):
    - liberação manual de 18 para 47, L1 de 0 para 35, e um só habilitador fez 34;
    - 13 de 192 para 254, 22 de 66 para 57, comparecimento de 285 para 320;
    - BU impresso: "LULA 13 0254 / FLAVIO BOLSONARO 22 0057".
    - Leitura: mesmo que as 29 liberações manuais a mais tivessem ido todas para o 13, ainda faltariam 33 votos, que vieram de eliminados, de brancos e nulos e da queda do 22. As liberações não forçam o resultado.
  - **BA, Mucugê, 37397/0119/0060** (z −4,91, espelho pró-22):
    - L1 de 23 para 36, com o habilitador do 2º turno diferente do do 1º;
    - 22 de 71 para 105 e 13 de 253 para 262;
    - BU impresso: "FLAVIO BOLSONARO 22 0105".
  - **SP, São Paulo, 71072/0326/0782** (z +5,44, acima do corte):
    - L1 de 17 para 32, com 4 habilitadores presentes nos dois turnos;
    - 13 de 132 para 199 e 22 de 106 para 99;
    - BU impresso: "LULA 13 0199".
  - Casos extremos existem **nos dois sentidos** e em tamanho parecido. É o que se espera do acaso em meio milhão de seções.
  - **Recomendação:** passar Itabaianinha 0173, com 34 liberações de um só mesário depois de 0 no 1º turno, para a frente de mesários (rajadas e horários). Isso não é sinal de voto para um lado.

## Leitura

- **Fato.** No Nordeste, a liberação sem biometria a mais entre os turnos não trouxe voto a mais para o 13, nas duas definições. O resultado não depende do nível do efeito fixo, da permutação nem da troca de mesário. Ficam excluídos, com 95%, efeitos acima de 1,7% (L2) ou 1,4% (L1) das liberações a mais.
- **Fato.** O caminho que depende do mesário (liberação manual, com ou sem associação a mesário) vota igual ao eleitor biométrico em todas as regiões. A única exceção é o Sudeste, que pende de leve para o 22.
- **Hipótese (exploratória, a acompanhar).** **PE com L1:** f = 4,7% [1,5; 7,9], t 2,9, estável com efeito fixo de município (2,9) e de UF (2,5).
  - Isso equivale a cerca de 940 votos de margem (0,0231 × 40.871), ou 0,2% do ganho de margem do 13 em PE (+469.121). Em votos inseridos equivalentes, seriam cerca de 1.900.
  - Não sobrevive a Bonferroni nem entre as 18 combinações de UF e definição do Nordeste (p corrigido ≈ 0,07).
  - Com L2 em PE o efeito some (t 0,7).
- **Hipótese (exploratória).** **Sudeste:** a liberação a mais favoreceu de leve o 22. Com L2, f = −1,7% [−2,5; −0,8], t −4,0, robusto ao efeito fixo; equivale a cerca de 5.200 votos de margem a favor do 22 (0,0149 × 351.721). Passa Bonferroni sobre 254 testes. Explicação candidata: composição. No Sudeste, o eleitor SB a mais inclina menos para o 13 que o biométrico.
- **Hipótese.** O excesso do eleitor sem biometria cadastrada a mais pró-13 (Nordeste, Centro-Oeste e Sul) é compatível com composição do grupo, que já aparece no 1º turno. Votos inseridos pelo caminho do ano de nascimento também o explicariam. Os dados não separam as duas hipóteses.
- **Anomalia estatística não é prova de fraude, e ausência de anomalia não é prova de integridade.** Este método só olha o **acréscimo** de liberações entre turnos.

## Limites

1. **Voto secreto.** Não há ligação entre eleitor e voto. Tudo é inferência ecológica sobre a variação entre turnos.
2. **Fraude igual nos dois turnos é invisível**, porque a diferença cancela. Também não aparece aqui a troca de liberações genuínas por falsas sem mudar a contagem.
3. **Cada turno tem seu mesário.** A classe de mesário vem dos títulos que habilitaram. A mesa pode ter mudado de outro jeito, por exemplo com o presidente que digita o ano de nascimento.
4. **Composição variável entre turnos.** O efeito fixo de seção tira o perfil estável, mas não a mudança de quem comparece. Não há idade nem escolaridade **dos liberados** por seção.
5. **Erro-padrão** agrupado por município, com efeito fixo de zona. Os valores-p normais vêm do t arredondado a 1 casa.
6. **Exterior fora:** o BU não tem detalhamento. Com isso as 28 UFs ficam cobertas até onde os dados permitem.
7. **O modelo D foi acrescentado depois de ver o modelo C**, então é exploratório por construção.

## Testes feitos

- **Confirmatórios:** 2 (C1, C2).
- **Exploratórios no script principal:** 254 regressões, contando as 4 especificações (A, B, C, D) × 3 desfechos em 15 grupos, a cauda e as classes de mesário. Mais 2 permutações (2.000 cada).
- **Robustez:** mais 2 × 209 regressões, com efeito fixo de município e de UF.
- **Extremos:** 497.667 testes por seção, com Bonferroni.

## Recomendações

1. Juntar a faixa etária do grupo sem biometria por seção (`perfil_eleitor_secao`, `QT_ELEITORES_BIOMETRIA` por idade) e refazer o modelo D com ela. Isso decide entre composição e caminho do ano de nascimento.
2. PE com L1: localizar onde o efeito se concentra, por zona e por habilitador que liberou mais, e cruzar com o doc de mesários desta pasta.
3. Para fraude constante nos dois turnos, este método não serve. Usar os limites determinísticos e a regressão ecológica desta pasta (docs 02 e 03).

## Como reproduzir

```bash
# painel, regressões, permutação, cauda e extremos (~3 min; 27 UFs com perfil nos dois turnos)
node --max-old-space-size=12000 scripts/auditoria/liberacao-entreturnos-painel.mjs
# robustez do efeito fixo
node --max-old-space-size=12000 scripts/auditoria/liberacao-entreturnos-painel.mjs --efeito municipio --sufixo=-efmun --perm 500 --sem-painel
node --max-old-space-size=12000 scripts/auditoria/liberacao-entreturnos-painel.mjs --efeito uf --sufixo=-efuf --perm 500 --sem-painel
# conferência no arquivo bruto (BU, BU impresso e log, nos dois turnos)
node scripts/auditoria/liberacao-entreturnos-conferir.mjs se/31593/0030/0173 ba/37397/0119/0060 sp/71072/0326/0782
```

- Saídas em `data/parsed/auditoria/liberacao/`:
  - `entreturnos-resumo.json` (todas as regressões);
  - `entreturnos-extremos.json`;
  - `entreturnos-painel.jsonl` (uma linha por seção, sem título de mesário);
  - `entreturnos-resumo-efmun.json` e `entreturnos-resumo-efuf.json`.
- `--ufs` limita as UFs.
- `src/exportar.js` não serve para estas seções: sem `aux.json`, que as seções vindas dos ZIPs não têm, ele não lista o pacote. Por isso a conferência usa o leitor próprio.
