# 02. Geografia do resultado: municípios e seções extremos

Cientista político, 29/10/2026. Mesmos scripts e saídas do [01](01-balanco-turnos.md): `balanco-resumo.json` (`secoes`, `extremos1t`, `persistencia`, `homogeneidade`), `secoes-extremas.jsonl` e `secoes-perda-liquida.jsonl`. Municípios extremos, viradas e capitais vêm de `node scripts/auditoria/politico-limites-municipios.mjs` (`limites-municipios.json`). Habilitações na seção do PI vêm de `node scripts/sql.mjs "select secao, comparecimento, sem_biometria, por_biografia, por_biometria from secao where turno=2 and uf='pi' and municipio='11878' and zona='0028'"`. Princípio 8: a explicação política fica como hipótese, junto com a previsão que foi conferida.

## Seções com 95% ou mais dos votos válidos para um finalista (2º turno, 50 ou mais votos válidos)

| | 13 | 22 |
|---|---|---|
| Seções no 2º turno | **1.707** | **39** |
| Seções no 1º turno (mesmo critério, confronto 13 × 22) | 1.431 | 61 |
| Das extremas do 2º turno, já tinham 90% ou mais no 1º | **98,8%** | **97,4%** |
| UFs com mais casos | MA 499, BA 252, AM 230, PI 152, PA 118, PE 99 | RS 17, PA 8, PR 5, SC 2, ZZ 2 |

- **Fato.** A assimetria já existia no 1º turno, e quase todas as seções extremas eram extremas antes. O 2º turno **não criou** redutos novos. Ele aprofundou os que já existiam.
- **Fato, por tipo de local.** O tipo é classificado pelo nome do local de votação, um indicador grosseiro.

| Tipo | Seções | Fatia do 13 | Extremas do 13 / do 22 |
|---|---|---|---|
| Indígena | 826 | **81,7%** | 280 / 0 |
| Quilombola | 226 | 68,1% | 18 / 0 |
| Assentamento | 164 | 65,1% | 5 / 0 |
| Prisional | 206 | 66,7% | 2 / 1 |
| Exterior | 1.315 | 53,9% | 2 / 2 |
| Demais | 495.678 | 51,7% | 1.400 / 36 |

- **Hipótese compatível:** comunidade homogênea (aldeia, quilombo, povoado rural do Nordeste) tende a votar em bloco, e o 13 é forte nesses grupos. A previsão "extremas em local indígena ou quilombola favorecem o mesmo lado nos dois turnos" se confirma. A comparação com 2022 está pendente (sem dados no repo).
- **Assimetria:** a votação do 22 é forte em regiões de colonização europeia no Sul e em frentes agropecuárias, mas menos homogênea por seção. Por isso ele quase não chega a 95%. **Hipótese**, que pede a linha de base de 2022 para confirmar.

## Municípios extremos (2º turno, 5.000 eleitores aptos ou mais)

- **13 (Fato):** Carnaubeira da Penha/PE 92,3% (1º turno 91,0%), Barreirinha/AM 90,9%, Terra Nova/PE 90,9%, Pariconha/AL 90,8%, Inajá/PE 90,3%, Serrano do Maranhão/MA 90,1%. Todos têm até 1,3 p.p. a mais do que no confronto do 1º turno.
  - **Hipótese:** Sertão de PE/AL, interior do MA/PI e municípios com população indígena relevante (Barreirinha, Pariconha, Carnaubeira da Penha). **[a confirmar]** com o Censo IBGE 2022 (população indígena por município).
- **22 (Fato):** Nova Bassano/RS 85,9%, Nova Santa Rosa/PR 84,5%, Aurora/SC 84,3%, Novo Progresso/PA 84,3%, Cunha Porã/SC 84,2%, Flores da Cunha/RS 83,4%, Itanhangá/MT 83,2%. Todos ficaram **1,3 a 2,8 p.p. abaixo** do confronto do 1º turno: o 13 cresceu até nos redutos do 22.
  - **Hipótese:** Serra gaúcha, oeste e vale do Itajaí em SC, oeste do PR, BR-163 (PA/MT).
- **Capitais (fatia do 13):** de 24,2% (Boa Vista) e 33,4% (Rio Branco) a 73,2% (Salvador). O padrão Norte/Centro-Oeste × Nordeste se repete nas capitais.
- **Por porte (Fato):** a fatia do 13 é maior nos municípios com menos de 50 mil aptos (54% a 56%) do que nos de 200 mil ou mais (47,3%). Nas capitais é 52,8%. A parte do disponível que foi para o 13 é parecida em todos os portes (71% a 78%). O deslocamento entre turnos **não** se concentra num tipo de município.

## Maiores viradas de fatia entre os turnos (Fato), e se a virada é do município todo

Uma virada causada por política local (prefeito, liderança) aparece em quase todas as seções do município. Uma virada causada por problema numa urna aparece em poucas seções. Medido nas seções com 30 ou mais votos nos dois finalistas:

| Município | Virada da fatia do 13 (mediana das seções) | p10 a p90 | Seções com o mesmo sinal |
|---|---|---|---|
| Belo Monte/AL | −8,1 p.p. | −12,3 a −4,8 | 100% de 16 |
| Santo Antônio de Lisboa/PI | −7,3 | −9,6 a −3,0 | 100% de 24 |
| Caldeirão Grande/BA | −3,8 | −9,6 a −1,0 | 100% de 34 |
| Campos dos Goytacazes/RJ | +5,7 | +2,6 a +9,3 | 99% de 1.189 |
| São João da Barra/RJ (vizinho) | +5,7 | +3,3 a +8,7 | 100% de 137 |
| São Tomé/RN | +6,2 | +2,8 a +8,9 | 100% de 27 |
| Paranhos/MS | +5,6 | +0,9 a +8,9 | 97% de 32 |

- **Leitura.** As viradas são **do município inteiro**. No Norte Fluminense, dois municípios vizinhos viraram igual. Isso é o que a hipótese de fator político local ou regional prevê. A causa concreta (aliança local, prefeito, eleição para governador no RJ) é **[a confirmar]**, sem fonte no repo.
- **Neutralidade:** as viradas pró-22 (Belo Monte, Santo Antônio de Lisboa) e pró-13 (Campos, São Tomé) têm o mesmo perfil: homogêneas dentro do município.

## Exceção: a seção destoa até dentro do município

- **PI 11878/0028/0099** (Santo Antônio de Lisboa; local: escola de povoado rural). É a **única seção do país com alerta contábil** na comparação de turnos.
  - 1º turno: 13 = 214, 22 = 56, eliminados 5. 2º turno: 13 = 146, 22 = 122.
  - A fatia do 13 cai **24,8 p.p.**, contra a mediana de −7,3 p.p. no município. Pelo menos **24 eleitores** do 13 no 1º turno votaram no 22 (migração mínima de `src/comparar-turnos.js`).
  - **Fato (banco, 2º turno):** 92,7% dos eleitores da seção foram habilitados **por biometria**, uma das menores parcelas sem biometria do município (7,3%, contra 4,7% a 17,4% nas 24 seções). A virada **não** passou pela brecha da liberação sem biometria.
  - **Hipótese política:** liderança local do povoado mudou de lado entre os turnos. Ela é compatível com a virada geral do município. **Riscos que o arquivo não mostra** (princípio 8): compra de voto, coação. **Recomendação:** tratar como caso (`docs/casos/`), com o log dos dois turnos (horário dos votos e rajadas), e comparar com a seção vizinha do mesmo local.
