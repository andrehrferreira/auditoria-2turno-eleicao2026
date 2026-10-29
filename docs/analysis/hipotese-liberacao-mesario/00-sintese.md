# 00. H13: síntese dos cinco métodos sobre o voto dos liberados sem biometria

**Pergunta (H13, do usuário).** Como se distribuem os votos dos eleitores liberados pelo mesário sem biometria? Esses votos foram majoritariamente para o 13 (LULA), principalmente no Nordeste? Escopo: 2º turno de presidente (13 × 22, 25/10/2026), com o 1º turno (04/10/2026) como linha de base.

Documentos de origem: [01 descritivo](01-distribuicao-das-liberacoes.md), [02 limites determinísticos](02-limites-deterministicos.md), [03 regressão ecológica](03-regressao-ecologica-por-regiao.md), [04 mesma seção entre turnos](04-mesma-secao-entre-turnos.md), [05 mesários e rastro no log](05-mesarios-e-rastro-no-log.md).

## Limite estrutural (vale para tudo abaixo)

O voto é secreto. O log grava **como** cada eleitor foi habilitado (digital, dado pessoal, digital do mesário, ano de nascimento), mas não **em quem** votou. O RDV embaralha os votos e não liga voto a eleitor. Por isso o voto dos liberados **nunca é observado**, nem numa seção. Ele só pode ser:

- **cercado** por limites aritméticos da própria seção (método 02); ou
- **estimado** por inferência ecológica, comparando seções com mais e menos liberação (métodos 03, 04 e 05).

Pelo princípio 8 ([01-premissas](../../01-premissas.md)), a liberação pelo mesário é uma brecha humana a medir, e não conta como controle nem como explicação benigna.

## Definições

| Sigla | Quem conta | Fonte |
|---|---|---|
| **L1** | tinha biometria cadastrada, a digital falhou e o eleitor foi habilitado com a digital de um **mesário identificado** ("Mesário … habilitou o eleitor") | log, `habilitadosPeloMesario` |
| **L2** | **todo habilitado sem a própria digital**: sem biometria cadastrada (ano de nascimento) + com biometria e liberado por dado pessoal | BU, `sem_biometria + por_biografia` |

L1 está contido em L2 (0 violações nos dois turnos, método 02). Regiões: Nordeste = AL, BA, CE, MA, PB, PE, PI, RN, SE; Norte = AC, AM, AP, PA, RO, RR, TO; Centro-Oeste = DF, GO, MS, MT; Sudeste = ES, MG, RJ, SP; Sul = PR, RS, SC; exterior = ZZ (fora de L2 e com L1 = 0).

## Resposta curta

A hipótese tem duas partes, e a resposta é diferente para cada uma.

1. **"Os liberados do Nordeste votaram majoritariamente no 13."** Provavelmente sim, cerca de **70%**. Mas os eleitores reconhecidos pela digital no Nordeste também votaram cerca de **69%** no 13. A maioria é da região, não da liberação. *Grau de certeza: alto para a estimativa, sob a suposição ecológica.* Pela aritmética pura, sem suposição, a parcela dos liberados no 13 pode estar em qualquer ponto entre 1% e 100% (método 02).
2. **"A liberação sem biometria favoreceu o 13 além do que o perfil explica."** **Não foi encontrado.** A diferença bruta entre liberados e biométricos (+18 pontos em L2 e +42 em L1) cai para **+0,8 [−0,5; +2,1]** (L2) e **−0,5 [−1,8; +0,8]** (L1) na mesma zona e com o mesmo perfil. A diferença não cresce do 1º para o 2º turno. Onde a liberação cresceu entre os turnos, a margem não andou para o 13 (no máximo 1,4% a 1,7% das liberações a mais seriam compatíveis com voto inserido no 13). Os 6 testes confirmatórios declarados antes de rodar não rejeitam a hipótese nula. *Grau de certeza: alto para excesso dentro da zona e para excesso que cresce entre os turnos. Baixo para fraude espalhada por igual numa zona inteira, ou igual nos dois turnos: esses dados não conseguem enxergá-la (ver "O que derrubaria ou sustentaria").*

A liberação também não está concentrada no Nordeste: o Sul libera mais em L1 (5,43% contra 4,94%), e a taxa L2 do Nordeste (11,75%) fica abaixo da nacional (12,42%). Fora do Nordeste, com controle de perfil, os liberados votam **menos** no 13 que os biométricos: Sudeste −5,9 e Sul −6,2 pontos (L1).

## Tabela por região

### A. Quanto se liberou e o que a aritmética permite (Fato)

2º turno, com o 1º turno entre parênteses. "Faixa 13" é a parcela dos liberados que votou no 13, com mínimo e máximo exatos somados seção a seção (método 02). "Homog." é o ponto em que os liberados votam como a própria seção, em 13/(13+22). "13 na região" é o resultado da região em 13/(13+22).

| Região | L1, % do comp. | L2, % do comp. | Faixa 13 em L1 | Faixa 13 em L2 | Homog. L1 | Homog. L2 | 13 na região | Seções que obrigam votos no 13, observado/esperado (L1) | Obrigam votos no 22 (L1) |
|---|---|---|---|---|---|---|---|---|---|
| Brasil (sem ZZ) | 4,57 (4,10) | 12,42 (12,23) | 0,4–99,9 | 1,4–98,8 | 52,1 | 52,2 | 51,8 | 2.054/1.943 (1,06) | 272/197 (1,38) |
| **Nordeste** | **4,94 (4,35)** | **11,75 (11,45)** | **1,0–100,0** | **3,4–99,9** | **70,5** | **70,0** | **69,4** | **1.811/1.635 (1,11); 1º t 1,20** | 19/18 (1,08) |
| Norte | 3,74 (3,31) | 9,08 (9,09) | 0,2–100,0 | 0,9–99,7 | 49,3 | 50,6 | 50,0 | 139/168 (0,83) | 11/12 (0,92) |
| Centro-Oeste | 4,44 (4,11) | 10,36 (10,55) | 0,1–100,0 | 0,4–99,6 | 39,9 | 40,4 | 40,0 | 30/67 (0,45) | 6/8 (0,74) |
| Sudeste | 4,20 (3,73) | 13,97 (13,72) | 0,1–100,0 | 0,8–97,9 | 47,1 | 47,9 | 47,2 | 61/49 (1,24) | 15/14 (1,09) |
| Sul | 5,43 (5,11) | 12,26 (12,26) | 0,0–99,6 | 0,1–98,7 | 36,9 | 38,9 | 37,4 | 13/23 (0,56) | **221/145 (1,52); 1º t 1,73** |

Em números absolutos, 2º turno: L1 = 5.841.094 no país e 1.795.037 no Nordeste; L2 = 15.884.298 e 4.269.379. O esperado das seções forçadas vem de embaralhar a taxa de liberação entre seções da mesma zona (200 repetições).

### B. Voto estimado dos liberados e efeito entre turnos (Hipótese de modelo: estimativas ecológicas)

Parcela do 13 em 13/(13+22), em pontos. "Sem perfil" = método 03, modelo M1 (efeito fixo de zona). "Com perfil" = M2 (zona + idade, escolaridade, % sem biometria cadastrada, indígena, quilombola, tamanho). "Dif." = liberados − biométricos da mesma zona e perfil, com IC 95% por bootstrap de municípios. "f" = fração das liberações **a mais** entre os turnos compatível com voto inserido no 13 (método 04, IC 95%).

| Região | L1: lib × bio, sem perfil | L1: lib × bio, com perfil | Dif. L1 com perfil | Dif. L2 com perfil | Dif. L1, 2º − 1º turno | f L1 entre turnos | f L2 entre turnos |
|---|---|---|---|---|---|---|---|
| Brasil | 52,0 × 51,5 | 48,5 × 52,1 | −4,0 [−5,5; −2,5] | −3,1 [−5,1; −1,1] | −0,4 [−1,1; +0,3] | −0,2% [−0,6; +0,3] | −0,3% [−0,9; +0,4] |
| **Nordeste** | **78,7 × 68,4** | **69,9 × 69,2** | **−0,5 [−1,8; +0,8]** | **+0,8 [−0,5; +2,1]** | **−0,9 [−1,8; 0,0]** | **+0,3% [−0,9; +1,4]** | **+0,3% [−1,2; +1,7]** |
| Norte | 50,8 × 49,6 | 46,7 × 49,9 | −2,7 [−7,4; +1,6] | −0,5 [−4,1; +3,3] | −0,6 [−3,9; +2,8] | +1,0% [−0,4; +2,5] | −0,6% [−2,9; +1,7] |
| Centro-Oeste | 39,7 × 39,2 | 41,2 × 39,3 | +2,0 [−1,2; +5,4] | **+5,8 [+2,3; +9,3]** | +0,3 [−2,0; +2,6] | +0,3% [−1,0; +1,6] | +1,2% [−1,0; +3,5] |
| Sudeste | 42,8 × 47,7 | 42,1 × 47,9 | **−5,9 [−7,8; −3,8]** | **−5,8 [−8,6; −2,6]** | −0,3 [−1,7; +1,3] | −0,8% [−1,5; −0,2] | **−1,7% [−2,5; −0,8]** |
| Sul | 32,8 × 36,5 | 31,4 × 37,7 | **−6,2 [−8,9; −3,7]** | **−4,7 [−7,4; −2,2]** | −2,4 [−5,3; +0,2] | −0,4% [−1,1; +0,4] | +0,6% [−1,7; +1,7] |

Em negrito, o Nordeste e os intervalos que não contêm zero. Um "f" de 100% seria a assinatura de toda liberação a mais virar voto no 13. O teste do método 04 tem 80% de poder para detectar f = 1,6% (L1) ou 2,1% (L2) no Nordeste.

## Nordeste por UF (2º turno)

| UF | L1 % | L2 % | Faixa 13 em L2 | Homog. L2 | 13 na UF | Dif. L1 sem perfil (M1) | Dif. L1 com perfil (M2) | Dif. L2 com perfil (M2) | f L1 entre turnos | Obrigam 13, obs/esp (L2) |
|---|---|---|---|---|---|---|---|---|---|---|
| AL | 4,95 | 10,55 | 2,1–100,0 | 63,3 | 60,8 | +9,7 | +0,3 [−4,0; +4,5] | +0,1 [−3,6; +4,2] | +0,5% [−2,2; +3,2] | 294/292 (1,01) |
| BA | 4,69 | 12,26 | 4,1–99,8 | 71,9 | 71,3 | +4,3 | **−2,2 [−4,1; −0,4]** | −0,5 [−2,3; +1,5] | −0,4% [−2,6; +1,8] | 2.838/2.675 (1,06) |
| CE | 5,10 | 11,17 | 2,5–100,0 | 70,0 | 68,9 | +19,7 | +3,1 [−0,5; +5,8] | **+4,6 [+0,7; +7,2]** | +0,8% [−2,4; +3,9] | 1.443/1.299 (1,11) |
| MA | 4,12 | 9,94 | 3,0–100,0 | 69,7 | 69,5 | +7,1 | −0,4 [−5,1; +2,4] | +2,3 [−2,3; +5,3] | −2,5% [−5,6; +0,5] | 1.246/1.217 (1,02) |
| PB | 5,38 | 10,27 | 0,7–100,0 | 67,3 | 67,5 | +15,0 | +3,7 [−0,5; +5,8] | **+4,7 [+0,3; +7,0]** | −1,6% [−4,4; +1,2] | 212/181 (1,17) |
| PE | 4,63 | 14,33 | 5,1–99,9 | 69,5 | 69,2 | +10,3 | +2,3 [−0,1; +5,0] | **+3,0 [+0,3; +5,6]** | **+4,7% [+1,5; +7,9]** | 2.542/2.516 (1,01) |
| PI | 6,19 | 11,00 | 5,4–100,0 | 76,7 | 75,9 | +8,1 | −3,0 [−7,1; +1,2] | −2,5 [−6,3; +1,8] | +0,3% [−2,6; +3,3] | 1.198/1.143 (1,05) |
| RN | 6,06 | 11,85 | 0,6–100,0 | 66,0 | 65,7 | +11,9 | −1,3 [−4,8; +4,6] | −1,8 [−5,9; +4,4] | +0,7% [−2,4; +3,8] | 148/132 (1,12) |
| SE | 5,07 | 10,57 | 2,3–100,0 | 69,7 | 69,5 | +3,7 | −1,9 [−6,2; +7,1] | −0,1 [−4,4; +8,4] | −3,4% [−7,7; +1,0] | 200/185 (1,08) |

Nenhum valor de UF do 2º turno passa por correção de múltiplas comparações (Bonferroni sobre 86 testes no método 03; sobre 18 combinações UF × definição no método 04). No CE, o efeito com perfil é **maior no 1º turno** (+6,2 em L1 e +6,0 em L2, os únicos positivos que passam por Bonferroni). Pelo princípio 8, ser maior no 1º turno não absolve: só mostra que não é um efeito do 2º turno.

## Onde os métodos convergem

- **Fato (02, 03, 05).** No Nordeste, o voto estimado dos liberados fica em 69,9% a 70,7% para o 13, encostado no dos biométricos (69,2%) e no da região (69,4%).
- **Fato (03, 05).** A vantagem bruta do 13 entre liberados vem do lugar e do perfil. Dentro da zona e sem perfil, ela é de +6 a +9 pontos em L1 no Nordeste e quase igual nos dois turnos. Com perfil, cai a zero.
- **Fato (03, 04, 05).** Não há aumento entre turnos ligado à liberação: Nordeste, L1, variação do efeito −0,9 [−1,8; 0,0] (03); γ da margem +0,0014, p 0,62 (04); β ΔL1 −0,0006, t −0,4 (05).
- **Fato (01, 02, 05).** As seções extremas e os mesários com volume extremo votam como a própria zona e como o 1º turno da mesma seção. Seções rejeitadas no beta-binomial (L1): 59,6% para o 13 contra 59,2% esperados. Cauda de 31 seções com um mesário liberando 100 ou mais no Nordeste: −0,48 ponto em relação à zona.
- **Fato (02, 03, 04, 05).** O sinal muda com a região: a favor do 22 no Sul e no Sudeste, que estão entre as regiões que mais liberam. Isso combina mais com heterogeneidade de perfil do que com liberação dirigida ao 13.
- **Fato (01, 04, 05).** A alta de L1 do 1º para o 2º turno (+720.662 no país, +16% no Nordeste) é sobretudo reclassificação: a liberação manual sem mesário identificado caiu (−430.449). A liberação manual total subiu pouco (6,68% para 6,75% do comparecimento).
- **Fato (01, 05).** A cauda extrema é técnica e persistente. 94% das 49 seções com um mesário liberando 100 ou mais são de urna UE2013 (2,5% no país). Em 61% delas, o mesmo mesário já tinha liberado 40 ou mais no 1º turno. Todo liberado passou por 4 tentativas de digital sem reconhecimento.

## Onde divergem, e o que conferi

Conferi cada número em que dois métodos discordam com `scripts/auditoria/liberacao-sintese-conferencia.mjs` (saída `data/parsed/auditoria/liberacao/sintese-conferencia.json`) e com o banco.

| Divergência | Conferência | Resultado |
|---|---|---|
| Vantagem do 13 entre liberados L1 no Nordeste, dentro da zona e sem perfil: +6,0 (05) contra +9,3 (03, M1) | Refiz o Goodman com efeito fixo de zona em dois grupos (L1 contra todo o resto): **+6,1** em L1 e **+7,2** em L2 (03 dá +7,3 em L2). Inclinação de s13 sobre a taxa L1: 0,061 a 0,063 (05: 0,060). | **Fato, reconciliado.** O método 03 usa três grupos (L1, outros sem digital e biométricos) e compara L1 só com os biométricos. O método 05 compara L1 com todos os outros, inclusive os sem digital que não são L1, que também pendem para o 13. Mesmo dado, referência diferente. |
| Margem nacional: 4.430.191 (02) contra 4,39 milhões (03) | Soma dos perfis: 4.430.191 com exterior e 4.401.534 sem. O 03 usa 4.389.493, na amostra dele (≥ 20 votantes, com perfil, sem exterior). | **Fato.** É diferença de amostra, não de dado. |
| Taxa L1 Brasil: 4,57% (01) contra 4,55% (05) | 5.841.094 ÷ 127.854.631 = 4,569% sem exterior; ÷ 128.235.243 = 4,555% com exterior. | **Fato.** É só o denominador. |
| Liberados L1 no Nordeste: 1.795.037 (01, 05), 1.794.975 (02), 1.793.877 (03) | Filtros: 02 exclui as seções em que o log e o BU divergem; 03 exige ≥ 20 votantes e perfil. | **Fato.** Diferença de filtro. |
| Cobertura do 1º turno no banco: os métodos dizem 22 UFs; o ponteiro da cópia diz 25 | `node scripts/sql.mjs`: a tabela `secao` tem 22 UFs no 1º turno (faltam RS, SC, SE, SP, TO e ZZ); `perfil_log` tem 20 (faltam também AM e BA). O ponteiro registra "1º turno 25 UFs". | **Fato.** O ponteiro superestima a carga. Os métodos 01, 02, 04 e 05 usaram os perfis jsonl, completos nos dois turnos. O método 03 tem o 1º turno sem RS, SC, SE, SP e TO. |
| PE, L1: o painel acha f = 4,7% [1,5; 7,9] (04), e a variação do efeito ecológico é −0,5 [−2,4; +1,3] (03) | f = 4,7% de ΔL1 (40.871) ≈ 1.920 votos inseridos equivalentes, ou 0,67 ponto sobre 283.892 liberados de PE. | **Fato: não há contradição.** 0,67 ponto cabe no intervalo do 03. Os dois medem coisas diferentes: o 04 mede só as liberações a mais, o 03 compara o estoque inteiro. O caso de PE continua Hipótese a acompanhar. |
| Centro-Oeste: L1 pende para o 22 sem perfil (05: β −0,085, t −3,2), mas L2 pende para o 13 com perfil (03: +5,8 [+2,3; +9,3]) | 03 sem perfil: L1 +0,6; L2 +11,3. A parte de L2 que não é L1 (sem biometria cadastrada e manual sem mesário) é que pende para o 13. | **Hipótese.** É composição de grupos diferentes, não conflito de método. O excesso fica no eleitor **sem biometria cadastrada** (ver abaixo), não no liberado pelo mesário. |

**O único resíduo que dois métodos acham, e que fica como Hipótese:** o eleitor **sem biometria cadastrada**, habilitado pelo ano de nascimento, que é parte de L2 mas não de L1. No Nordeste, cada eleitor desses a mais entre os turnos rende +0,108 voto de margem acima do biométrico (t 3,4, cerca de 6.000 votos, 0,24% do ganho do 13 na região; método 04). No método 03, "outros sem digital" no Nordeste dá +2,4 [+0,8; +4,0] com perfil (exploratório). O mesmo excesso aparece maior no Centro-Oeste (+0,280) e no Sul (+0,173), e já existia no corte do 1º turno (A9, β 0,155). Isso aponta para composição do grupo, mas pelo princípio 8 a habilitação por ano de nascimento também é humana. Os dados atuais não separam as duas leituras.

## O que derrubaria ou sustentaria a hipótese

**Sustentaria H13 (excesso a favor do 13 vindo da liberação):**
- liberados votando acima dos biométricos da **mesma seção e perfil**, com intervalo acima de zero no Nordeste. Hoje: +0,8 [−0,5; +2,1] (L2) e −0,5 [−1,8; +0,8] (L1);
- margem andando para o 13 onde a liberação cresceu entre os turnos. Hoje: f ≤ 1,7% (L2) e ≤ 1,4% (L1), com poder para ver 2%;
- seções forçadas para o 13 muito acima do sorteio na zona, e mais no 2º turno que no 1º. Hoje: 1,11 no 2º turno contra 1,20 no 1º;
- rastro no log de liberação em rajada, na última hora ou sem 4 tentativas de digital, ligado à parcela do 13. Hoje: 0 liberações sem 4 tentativas, 0 sem "Biometria do mesário … encontrada" nas 98 seções lidas; nenhuma rajada (máximo de 11 em 10 minutos, nunca menos de 50 s entre duas liberações do mesário-topo); a confirmação em menos de 5 s não se associa ao 13 (Spearman 0,03).

**Derrubaria de vez (o que estes dados não conseguem):**
- uma fraude **espalhada por igual numa zona inteira** é absorvida pelo efeito fixo de zona (03, 05). O teto, se nenhum controle for aceito (M1), é um saldo 13−22 de +596 mil (L2) ou +316 mil (L1) no Nordeste. Esse teto mistura perfil com qualquer efeito real e **não** é estimativa de fraude;
- uma fraude **igual nos dois turnos** some na diferença entre turnos (04, 05) e na comparação com o 1º turno (02);
- uma fraude **alinhada ao perfil** (por exemplo, só em seções rurais pobres) é absorvida pelos controles. Faltam renda e urbano/rural por seção;
- para fechar essas três portas é preciso uma linha de base externa (eleições de 2022, com o mesmo cadastro de seção) e a verificação nominal (ver abaixo).

**Teto de impacto (Fato, método 02).** No pior caso para o 13, com todos os liberados do Nordeste anulados, o 13 ainda venceria no país por pelo menos 2.636.721 votos (L1) ou 166.144 (L2). No país inteiro, a brecha é maior que a margem (5,84 milhões em L1 e 15,9 milhões em L2, contra 4.430.191 de margem). Os limites, sozinhos, não excluem que os liberados tenham decidido a eleição, nem que tenham ido em massa para o 22.

## Seções e casos para a auditoria nominal (Recomendação)

Conferi no bruto, para esta síntese, as duas primeiras seções abaixo (`node src/exportar.js --turno 2 ... --log nao --stdout`). As demais foram conferidas no bruto pelos métodos de origem, salvo onde indicado.

| Seção | Por que ir à nominal | Conferência |
|---|---|---|
| BA 34290 (Candeias) / 0127 / 0335 | BU: 314 votos, 7 por biometria, 281 por biografia, 26 sem biometria; 13 = 256, 22 = 51, nulos 7; UE2013. Log: 279 L1 por 2 mesários (199 e 80). Obriga pelo menos 221 liberados no 13, o maior mínimo do país. No 1º turno: 219 por biometria e L1 = 36, com parcela do 13 quase igual (81,1% contra 83,4%). | Bruto, nesta síntese (BU) e nos métodos 02 e 03 (log) |
| PR 79111 (Tapejara) / 0086 / 0218 | Espelho pró-22. BU: 175 votos, 19 por biometria, 153 por biografia, 3 sem biometria; 13 = 51, 22 = 117, brancos 2, nulos 5. Log: 146 L1, 142 pelo mesmo mesário. Obriga pelo menos 88 no 22. | Bruto, nesta síntese (BU) e no método 02 (log) |
| MA 08494 (Paço do Lumiar) / 0093 / 0328 | 188 de 195 votantes L1 por 3 mesários; 189 eleitores chegaram à 4ª tentativa de digital; 13 × 22 = 96 × 92, abaixo da zona (64,2%). | Métodos 01 e 03 |
| BA 36854 (Lauro de Freitas) / 0180 / 0202 | Maior mesário do país: 265 liberações de um único título (253 no 1º turno); s13 −13,9 pontos abaixo da zona. | Método 05 |
| BA 39136 (Simões Filho) / 0033 / 0222 | 289 liberações (máximo do país), 264 do topo; 31% das confirmações em menos de 5 s. | Método 05 |
| PE 23817 (Caruaru) / 0105 / 0324 | Urna de reserva; 263 liberações, 216 do topo; o log do 1º turno é de outra seção (urna trocada). | Método 05 |
| CE 13510 (Camocim) / 0032 / 0175 | 167 de 182 votantes L1 nos dois turnos. | Método 03 |
| SE 31593 (Itabaianinha) / 0030 / 0173 | Maior z pró-13 do Nordeste com liberação: L1 de 0 para 35, 34 por um habilitador. As liberações não forçam o resultado (faltariam 33 votos). | Método 04 |
| BA 38890 (São Sebastião do Passé) / 0128 / 0054 | 1º turno: 217 de 238 L1. 2º turno: urna de contingência, log com 231 votos e BU com 252. **Encaminhar à frente de integridade.** | Método 01 (2º turno no bruto; o 1º turno não tem aux.json) |
| RS 89770/0088/0113 e SC 81639/0091/0005 | Topo do lado do 22 nos perfis. | **Pendente: aux.json ausente; não citar como Fato** |
| PE, todas as zonas (L1) | f = 4,7% [1,5; 7,9] no painel, cerca de 940 votos de margem. Localizar por zona e por habilitador. | Recomendação |
| 60 mesários que liberaram em mais de uma seção (59 na mesma zona; 17 no Nordeste) e o PI no "já votou" (2,78 contra 1,41 por mil) | Brecha do princípio 8. | Recomendação |

**Recomendação.** A amostra nominal deve incluir os dois lados (Candeias e Tapejara). Se só um lado for auditado, um achado vira viés de seleção.

## Testes feitos e o que é confirmatório

- **Confirmatórios, declarados antes de rodar: 6, nenhum rejeita H0.** Método 03: Nordeste, 2º turno e variação entre turnos, L1 e L2 (Bonferroni sobre 4). Menor p 0,034 (0,14 corrigido), no sentido **contrário** ao da H13. Método 04: C1 (L2) p 0,76 e C2 (L1) p 0,62, com α 0,025 cada. Bonferroni sobre os 6 (α 0,0083) não muda nada.
- **Exploratórios.** 01: cerca de 1,99 milhão de testes de seção no beta-binomial, com Benjamini-Hochberg q 0,05 em 4 famílias (36 seções rejeitadas em L1 e 627 em L2; a binomial ingênua rejeitaria cerca de 55 mil). 02: permutação na zona, sem correção. 03: 86 diferenças, com Bonferroni e BH. 04: 254 regressões, 418 de robustez, 2 permutações e 497.667 z robustos por seção. Os 34 com |z| > 5,33 se dividem em 26 pró-13 e 8 pró-22, e os dois que passam do corte com ΔL2 ≥ 10 ficam em São Paulo, um em cada sentido. 05: cerca de 30 regressões por UF e 49 permutações de sequência.
- **Ferramentas descartadas e por quê.** Klimek e Benford não se aplicam aqui: a H13 não pergunta pelo voto total, e sim pela forma de habilitação. O primeiro dígito de Benford também não serve para contagens de seção limitadas a cerca de 400 eleitores. O z por mediana e MAD foi trocado pelo beta-binomial no método 01, porque L1 tem mediana 10 e 9% de zeros.

## Pendências

1. **1º turno incompleto no banco:** 22 UFs na tabela `secao` (faltam RS, SC, SE, SP, TO e ZZ) e 20 no `perfil_log`, embora o ponteiro diga 25. O método 03 deve ser refeito com o 1º turno completo, ou lido dos perfis jsonl, que estão completos.
2. **aux.json ausente** em SP, RS e SC do topo e no 1º turno: o exportar não lista os pacotes, e essas seções não podem ser citadas como Fato no bruto.
3. **Ferramenta:** o exportar não conclui a verificação de assinatura em algumas UE2013 ("DER: comprimento ausente", PE 25836/0026/0153, BA 38890/0128/0054, BA Candeias). É defeito de leitura conhecido (cetico-revisor/08), não achado.
4. **Covariáveis:** faltam renda e urbano/rural por seção, e a idade vem de faixas largas. É o que impede separar perfil de fraude alinhada ao perfil.
5. **Linha de base externa:** comparar com 2022 (mesmas seções, se o arranjo permitir) para fechar a porta da "fraude igual nos dois turnos".
6. **Teste confirmatório novo (H13b), a declarar antes de rodar:** o eleitor sem biometria cadastrada (L2a) vota no 13 acima do biométrico da mesma seção, no Nordeste, no corte do 2º turno e na variação entre turnos.
7. **Confirmação em menos de 5 s:** medir no país inteiro, e não só nas 98 seções lidas, e cruzar com a parcela do 13.
8. **BA 38890/0128/0054:** a divergência de 231 votos no log contra 252 no BU vai para a frente de integridade.

## Reprodução

```
node scripts/auditoria/liberacao-descritivo-distribuicao.mjs        # 01
node scripts/auditoria/liberacao-limites-deterministicos.mjs        # 02
node scripts/auditoria/liberacao-ecologico-regressao.mjs            # 03
node scripts/auditoria/liberacao-entreturnos-painel.mjs             # 04
node scripts/auditoria/liberacao-mesarios-dados.mjs && node scripts/auditoria/liberacao-mesarios-analise.mjs && node scripts/auditoria/liberacao-mesarios-log.mjs   # 05
node scripts/auditoria/liberacao-sintese-conferencia.mjs            # conferência desta síntese
```

As saídas ficam em `data/parsed/auditoria/liberacao/`.
