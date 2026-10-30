# 12. H18: resultado do teste de inserção uniforme num município inteiro (30/10/2026)

Estatístico eleitoral. Plano registrado antes de rodar: [11-h18-plano.md](11-h18-plano.md). Os cortes do plano foram aplicados sem mudança. O que veio depois está marcado como **exploratório**. Revisado pelo cético no [parecer 37](../cetico-revisor/37-h18-h21-h22.md), que reproduziu todos os números por outro caminho; as correções desse parecer estão aplicadas aqui (30/10/2026).

## Resposta curta

- **Fato:** nenhum município tem seções parecidas demais entre si. Em 5.241 municípios testados, nenhum tem a parcela do 13 contra o 22 no 2º turno mais homogênea que o acaso (sinal B2: 0 municípios com q < 0,01; o menor valor-p é 0,0063, antes da correção). O B2 rodou nos 5.241 municípios elegíveis (10 ou mais seções de 20+ votos nominais), que são 94% dos 5.571; os 330 menores ficaram fora do B2. Nesses 5.241, isso descarta o mecanismo M3 só na forma **sem ruído** (a urna devolve a parcela-alvo exata). Uma parcela-alvo sorteada com ruído binomial não cai no B2.
- **Fato:** 19 municípios têm virada além do esperado acima do corte (sinal A): 4 para o 13 e 15 para o 22. São todos pequenos (6 a 96 seções). Somados, equivalem a deslocar 589 votos para o 13 e 5.106 para o 22, contra uma margem nacional de 4.401.534 votos (sem o exterior). Os 19 conferem no BU bruto.
- **Fato:** a conjunção literal da T19 (virada alta **e** variância baixa, A ∧ B1) marca 1 município, Uirapuru (GO), do lado do 22. Se os dois sinais fossem independentes, seriam esperados 0,81. O número observado é o do acaso.
- **Fato:** dos 19, 10 já estavam do mesmo lado em 2018 ou 2022 (por acaso seriam ~3,6), e 14 tiveram virada extrema de algum lado num desses anos (por acaso, ~6,8): são municípios voláteis. 5 têm queda de comparecimento de 800 a 2.600 votos com os **dois** candidatos perdendo votos (MA, PA e AP).
- **Hipótese:** nesses 5, abstenção diferencial. A queda dos dois lados exclui inserção pura, que somaria votos, mas **não exclui** troca de votos somada à queda, nem supressão de comparecimento (H17). Os outros são candidatos a explicação local e entram na lista de campo.
- **Alcance (Fato):** num município sozinho, o sinal A vê uma virada com 50% de chance a partir de ~7 a 9 p.p. de margem (passar de 3,4% a 4,4% dos votos nominais de um lado para o outro) e com 80% de chance a partir de ~8 a 10 p.p. Abaixo disso, não vê. Contra uma inserção numa UF inteira ou em muitos municípios ao mesmo tempo, fica praticamente cego. A injeção do parecer 37 mostra o tamanho: passar 2% dos votos do 22 ao 13 em todas as seções de SP (526.479 votos) não marca nenhum município; numa amostra de 448 municípios do Nordeste (25%), uma virada de 4 p.p. em cada um (158.597 votos) é vista em 0 deles, e uma de 7 p.p. (276.710 votos) em 4. O esperado da UF e a calibração da região absorvem quase toda a inserção.

## Como reproduzir

```bash
node --max-old-space-size=8192  scripts/auditoria/estatistico-h18-historico.mjs    # ~5 s: 2018, 2022 e 2026 por município (munzona)
node --max-old-space-size=12288 scripts/auditoria/estatistico-h18-municipios.mjs   # ~85 s: esperado, sinais A, B1, B2, controles
node --max-old-space-size=8192  scripts/auditoria/estatistico-h18-bruto.mjs        # ~1 min: BU bruto (exportar) dos 19 marcados
```

Saídas em `data/parsed/auditoria/estatistico-eleitoral/h18/`: `municipios.csv` (os 5.571 municípios com todos os sinais), `marcados.csv`, `marcados-conferencia.csv`, `historico-municipios.csv`, `resumo.json` e `historico.json`. Fonte: cópia de leitura `eleicao2026-20261029T105000.sqlite` (28 UFs nos dois turnos).

## Dados e conferências (Fato)

| Item | Valor |
|---|---|
| Seções pareadas (`pares-banco.csv`) | 499.207; fora o exterior (1.310, H22): **497.897** |
| Municípios | 5.571 (27 UFs) |
| 13 e 22 das seções × resultado oficial sem exterior | iguais nos dois turnos (1º: 53.722.151 e 55.960.603; 2º: 64.056.078 e 59.654.544) |
| Votos de eliminados, governador e senador sem seção pareada | 0 |
| Soma dos eliminados ≠ "demais" da seção | 0 seções |
| Sinal A: municípios testados | 5.570 (sai o DF, município único; nenhum com menos de 3 seções) |
| Sinais B1 e B2: municípios com 10+ seções de 20+ nominais | 5.241 |
| Governador no 2º turno (controle) | AC, AM, DF, ES, RN, TO: 468 municípios |
| Eleição suplementar de prefeito no dia do 2º turno | 7 municípios (nenhum entre os marcados) |

Os 4 preditores de outros cargos usam os 2 governadores e os 2 senadores mais votados de cada UF no 1º turno (`resumo.json`, `governador1tTop2` e `senador1tTop2`).

## Número de testes

- A: 5.570 testes bilaterais, Benjamini-Hochberg (BH). z crítico de Bonferroni para o efeito mínimo: 4,78.
- B1: 5.241 (corte unilateral z ≤ −1,645, sem correção, por ser parte da conjunção).
- B2: 5.241 testes unilaterais (cauda inferior), BH.
- Total: 16.052 testes em três famílias, cada família corrigida em separado.

## Resultado

### Sinal A: virada além do esperado do município

Calibração (Fato): a heterogeneidade normal entre municípios (τ) é de 1,16 p.p. no Sul a 1,56 p.p. no Norte. A mediana da virada além do esperado fica em −0,29 a −0,38 p.p. em todas as regiões, e 98% dos municípios ficam entre −5,52 e +3,67 p.p.

| | Municípios |
|---|---|
| q < 0,01 | 19 (todos também com \|VAE\| ≥ 2 p.p.) |
| Para o 13 | 4: Pracuúba (AP), Mutunópolis (GO), Guarani de Goiás (GO), Rafael Godeiro (RN) |
| Para o 22 | 15: Belo Monte (AL), Uirapuru (GO), Icatu, Primeira Cruz, Santo Amaro do Maranhão (MA), Bagre (PA), Santo Antônio de Lisboa (PI), Itatiba do Sul, Novo Xingu, Poço das Antas (RS), Caldeirão Grande, Mansidão, Governador Mangabeira, Rio do Pires, Nova Ibiá (BA) |

Os 19, um a um (votos do município inteiro; a seção conferida é a de mais aptos):

| Município | Lado | VAE (p.p.) | Seções | Δ13 | Δ22 | Δ comparecimento | Já no mesmo lado em 2018/2022 | BU bruto |
|---|---|---|---|---|---|---|---|---|
| Belo Monte (AL) | 22 | −24,2 | 16 | −304 | +440 | −187 | não | confere |
| Santo Antônio de Lisboa (PI) | 22 | −19,2 | 24 | −350 | +398 | −239 | sim (2022: percentil 0,5) | confere |
| Caldeirão Grande (BA) | 22 | −14,0 | 34 | +59 | +491 | +134 | sim (2022: 0,04) | confere |
| Rafael Godeiro (RN) | 13 | +13,9 | 11 | +314 | −280 | −59 | sim (2018: 94) | confere |
| Guarani de Goiás (GO) | 13 | +9,6 | 17 | +796 | +394 | −119 | sim (2022: 97) | confere |
| Santo Amaro do Maranhão (MA) | 22 | −9,6 | 49 | −522 | −272 | −1.440 | não | confere |
| Nova Ibiá (BA) | 22 | −9,5 | 19 | +22 | +196 | −27 | não | confere |
| Primeira Cruz (MA) | 22 | −9,1 | 46 | −525 | −325 | −1.403 | não | confere |
| Rio do Pires (BA) | 22 | −9,1 | 38 | +146 | +130 | −212 | não | confere |
| Bagre (PA) | 22 | −8,6 | 54 | −747 | −234 | −1.724 | não | confere |
| Pracuúba (AP) | 13 | +8,4 | 16 | −132 | −469 | −803 | sim (2018: 93) | confere |
| Uirapuru (GO) | 22 | −8,3 | 10 | +139 | +233 | −53 | não | confere |
| Mansidão (BA) | 22 | −7,7 | 37 | +69 | +78 | −125 | sim (2018: 6,8) | confere |
| Mutunópolis (GO) | 13 | +7,4 | 14 | +429 | +207 | +23 | sim (2022: 95) | confere |
| Itatiba do Sul (RS) | 22 | −7,2 | 13 | +132 | +171 | +126 | sim (2018 e 2022) | confere |
| Governador Mangabeira (BA) | 22 | −7,2 | 60 | +1.102 | +781 | +655 | sim (2022: 3,9) | confere |
| Novo Xingu (RS) | 22 | −7,2 | 6 | +56 | +97 | +27 | não | confere |
| Icatu (MA) | 22 | −6,9 | 96 | −968 | −669 | −2.583 | não | confere |
| Poço das Antas (RS) | 22 | −6,4 | 7 | +69 | +168 | +35 | sim (2018 e 2022) | confere |

"Já no mesmo lado" segue o critério do plano: o município estava entre os 10% de virada relativa à UF do mesmo lado em 2018 ou em 2022. Os percentis estão em `marcados.csv`.

- **Fato:** 10 dos 19 repetem o padrão de 2018 ou 2022. A base de acaso desse marcador é frouxa: estar entre os 10% do mesmo lado em **um** dos dois anos acontece com ~19% dos municípios, ou seja, ~3,6 dos 19 (parecer 37). Além disso, 14 dos 19 tiveram virada extrema, de qualquer lado, em 2018 ou 2022, contra ~6,8 por acaso. Rafael Godeiro, por exemplo, estava no topo do lado do 13 em 2018 e no fundo em 2022.
- **Fato:** em Icatu, Primeira Cruz, Santo Amaro do Maranhão, Bagre e Pracuúba, o 13 e o 22 perdem votos ao mesmo tempo e o comparecimento cai de 803 a 2.583 votos. Inserção de votos aumentaria o comparecimento.
- **Hipótese:** abstenção diferencial. Não exclui troca de votos somada à queda nem supressão de comparecimento (H17). Icatu já aparecia como zona do lado do 22 na H26 ([virada-zonas/03](../virada-zonas/03-linha-de-base.md)), também com queda de comparecimento.
- **Fato:** Rafael Godeiro (RN) é o único marcado com governador no 2º turno. O governador virou no mesmo sentido, +25,4 p.p. acima da UF. Isso aponta para dinâmica política local, sem afastar outra causa.
- **Hipótese:** Belo Monte (AL), Santo Antônio de Lisboa (PI) e Rafael Godeiro (RN) são os casos em que um lado ganha o que o outro perde, com comparecimento estável ou em queda. É o padrão de troca de voto entre os candidatos. Um software que trocasse votos deixaria o mesmo padrão, e estes dados não separam os dois. Ficam na lista de campo.

### Sinal B2: resultado fixado (homogêneo abaixo do acaso)

- **Fato:** 0 de 5.241 municípios (q mínimo = 1). A dispersão mediana da parcela do 13 entre as seções é φ2 = 3,81 no 2º turno e φ1 = 3,63 no 1º: as seções variam quase 4 vezes mais que o acaso, nos dois turnos. Votação real é assim, porque bairros diferem.
- 183 municípios têm φ2 < 1 (pequenos, mediana de 14 seções). Em 104 deles φ1 também é < 1: já eram homogêneos no 1º turno. O mais baixo é São Domingos (PB), com φ2 = 0,20 em 10 seções (p = 0,0063 antes da correção, q = 1).
- **Poder (Fato):** nos 5.241 municípios elegíveis (todos com 10 ou mais seções), um resultado fixado sem ruído (φ ≈ 0,002, só o arredondamento) passaria o corte. Os 330 municípios com menos de 10 seções de 20+ votos não foram testados. Uma parcela-alvo com sorteio binomial (φ ≈ 1) não é detectável por este sinal.

### Sinal B1 e a conjunção da T19

- **Fato:** B1 marca 250 municípios (4,8%, como o corte de 5% prevê). São menores que a média (mediana de 24 seções contra 35). Dois têm z_B1 ≤ −4, contra 0,17 esperado pela normal: Colômbia (−4,00) e Águas de São Pedro (−4,11), ambos em SP. Os dois já eram homogêneos no 1º turno (φ1 = 2,07 e 1,69; φ2 = 2,22 e 1,68) e têm virada além do esperado pequena (+1,46 e +0,84 p.p.). Não há o que investigar.
- **Fato:** A ∧ B1 = 1 (Uirapuru, GO, lado do 22: VAE −8,3 p.p., 10 seções, z_B1 = −1,86). O esperado por independência é 0,81. A ∧ B2 = 0.
- Como o plano previu, a conjunção só tem poder contra M3 ou contra um município homogêneo por natureza. Contra M1 (fração fixa) e M2 (número fixo de votos), quem decide é o sinal A sozinho.

### Controles e linha de base

- **Fato:** a virada além do esperado de 2026 tem correlação de 0,19 com a virada relativa à UF de 2018 e de −0,01 com a de 2022 (5.569 municípios). Isso repete o achado por zona da H26: 2026 lembra 2018, não 2022.
- **Fato:** correlação de 0,72 com a virada bruta relativa de 2026 calculada pelo `munzona`, que é outro caminho com outra fonte.
- **Fato:** nos 468 municípios com governador no 2º turno, a correlação entre a virada do presidente além do esperado e a virada relativa do governador é −0,03. Não há componente municipal comum aos dois cargos em geral.

### Efeito mínimo detectável do sinal A (Fato)

O MDE do plano (z_Bonferroni · √(τ² + σ²)) é o efeito que fica exatamente no corte: é detectado em 50% das vezes. A coluna de 80% é do parecer 37.

| Seções no município | Municípios | MDE mediano a 50% (p.p. de margem) | MDE a 80% (p.p.) | Parcela dos nominais deslocada (50%) | Votos deslocados (50%) |
|---|---|---|---|---|---|
| 3–9 | 330 | 8,8 | 10,3 | 4,4% | 80 |
| 10–49 | 3.317 | 7,7 | 9,0 | 3,8% | 192 |
| 50–199 | 1.526 | 7,0 | 8,3 | 3,5% | 622 |
| 200–999 | 346 | 6,9 | 8,1 | 3,5% | 2.618 |
| 1.000+ | 51 | 6,9 | 8,1 | 3,4% | 14.970 |

O piso vem da heterogeneidade política normal entre municípios (τ ≈ 1,2 a 1,6 p.p.), multiplicada pelo z crítico de 4,78, e não do tamanho do município. Uma inserção que mude a margem de um município isolado em menos de ~7 p.p. não se distingue da variação normal entre municípios.

**Inserção em muitos lugares (Fato, injeção do parecer 37).** Passando votos do 22 ao 13 e refazendo o teste:

| Onde | Votos movidos | Margem muda | Municípios marcados a mais |
|---|---|---|---|
| Todas as seções de SP (2%) | 526.479 | 4 p.p. | 0 |
| Todas as seções de MG (2%) | 252.494 | 4 p.p. | 0 |
| Todas as seções da BA (2%) | 182.316 | 4 p.p. | 1 |
| Todas as seções de GO (4%) | 157.211 | 8 p.p. | 0 |
| 448 municípios do NE (25%) | 158.597 | 4 p.p. em cada | 0 de 448 (τ do NE 1,38 → 2,06) |
| 448 municípios do NE (25%) | 276.710 | 7 p.p. em cada | 4 de 448 (τ do NE 1,38 → 2,38) |

O esperado da UF e a calibração da região absorvem quase toda a inserção: τ cresce junto com ela e a mediana da região se desloca.

## O que o resultado permite e não permite afirmar

**Permite (Fato):**
- Nenhum dos 5.241 municípios elegíveis (10 ou mais seções de 20+ votos) tem o resultado do 2º turno fixado sem ruído pela urna (M3). Os 330 menores não foram testados.
- Fora os 19, nenhum município passa do corte do sinal A. O corte vê, num município isolado, uma virada além do esperado com 50% de chance a partir de ~7 a 9 p.p. e com 80% a partir de ~8 a 10 p.p. (tabela do MDE). Os 19 somam o equivalente a 5.695 votos deslocados (0,13% da margem nacional).
- A conjunção "virada alta e variância baixa" não ocorre acima do acaso (1 observado, 0,81 esperado).

**Não permite:**
- Absolver uma inserção menor que ~8 a 10 p.p. num município, uma inserção que mude a margem de muitos municípios em poucos pontos cada (0 de 448 vistos com 4 p.p.) ou uma inserção uniforme numa UF inteira (0 municípios marcados com 526 mil votos em SP). Esse ponto cego vem do desenho (esperado por UF, calibração por região) e continua aberto. A recomendação é uma régua externa: 2018, 2022 e pesquisas, já feitas por zona e por município na H26 e pelo cientista político.
- Dizer que os 19 são fraude ou que não são. A anomalia estatística não separa troca de voto por software de dinâmica política local.

## Pendente

- Revisão cética deste resultado.
- Auditoria de campo dos 9 marcados sem padrão histórico, prioridade para Belo Monte (AL), Uirapuru (GO), Nova Ibiá e Rio do Pires (BA) e Novo Xingu (RS): eleição local, prefeito, transporte, mudança de local de votação.
- Os 5 municípios de MA, PA e AP com queda de comparecimento: cruzar com a H15 (liberação sem digital) e a H17 (supressão na mesa), que medem o mecanismo oposto (votos a menos).
- Ponto cego por UF: precisa de uma régua externa ao próprio 2026 (pesquisas por UF, 2018 e 2022); não sai destes dados.
