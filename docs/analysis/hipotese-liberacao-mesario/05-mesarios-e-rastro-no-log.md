# 05. H13 no nível do mesário: distribuição das liberações e rastro no log

Engenheiro de segurança de urna, 29/10/2026. Presidente: 2º turno (13 × 22, 25/10/2026). Linha de base: 1º turno (04/10/2026). Rótulos: **Fato** (sai de script do repo sobre arquivo público), **Hipótese**, **Recomendação**. Este documento usa o trabalho do Auditor B em [biometria-mesarios/04](../biometria-mesarios/04-mesarios.md), que cobre a liberação manual em massa, a última hora e o A13, e o método ecológico em [03](03-regressao-ecologica-por-regiao.md). Os pontos já cobertos lá não são refeitos aqui.

## Resposta curta

- **Fato.** No 2º turno, 754.719 pares mesário × seção liberaram 5.841.094 eleitores (L1, 4,55% do comparecimento). Na mediana, um mesário liberou 5 eleitores. O p99 é 33 e o máximo, 265. O Nordeste tem 28,3% do comparecimento, 30,7% das liberações L1 e 46% das 2.923 seções em que um único mesário liberou 40 ou mais. A taxa dessa cauda no Nordeste (9,6 por mil seções) é igual à do Sul (9,4), onde o 22 venceu.
- **Fato.** Nas seções desses mesários, a parcela do 13 fica perto da zona: +1,2 ponto no Nordeste, contra +0,3 nas seções de controle. A diferença é **a mesma do 1º turno**: a diferença em diferenças é −0,16 ponto. Nas 31 seções do Nordeste com um mesário acima de 100 liberações, a parcela do 13 fica 0,5 ponto **abaixo** da zona. A seção mais extrema do país, com 265 liberações de um único mesário, deu ao 13 53,4%, contra 67,2% da zona.
- **Fato.** Dentro da zona, no Nordeste, cada ponto a mais de taxa L1 acompanha +0,060 ponto na parcela do 13. O valor é o mesmo no 1º turno (+0,060). Onde a liberação cresceu do 1º para o 2º turno, a parcela do 13 não cresceu (β = −0,0006, t −0,4). No Sul e no Centro-Oeste o sinal é o contrário: −0,104 e −0,085.
- **Fato.** O log bruto das 49 seções da cauda (≥ 100 liberações de um mesário) mostra o ciclo completo em todos os votos. Não há voto sem habilitação, nem liberação sem a digital do mesário reconhecida, nem liberação com menos de 4 tentativas de digital do eleitor. As liberações não se concentram na última hora. O menor intervalo entre duas liberações do mesmo mesário é de 50 s. 94% dessas urnas são UE2013, contra 2,5% no país.
- **Fato (rastro novo, sem explicação fechada).** Nas seções da cauda, 7,5% das liberações pelo mesário vão da habilitação à confirmação do voto em menos de 5 s. Entre os eleitores por biometria das mesmas seções, a taxa é 0,6%. Essa rapidez não se associa à parcela do 13 (Spearman 0,03).
- **Resposta à H13 neste método.** Os liberados pelo mesário votam um pouco mais no 13 no Nordeste. O padrão é igual no 1º turno, não cresce onde a liberação cresceu e tem o sinal oposto no Sul. Não aparece rastro de liberação usada para inclinar o resultado para o 13. **O voto de cada liberado continua desconhecido**, e uma fraude igual nos dois turnos não seria vista por estes testes (ver Limites).

## Pergunta, hipótese nula e modelo de ataque

**H13 (usuário).** Os votos dos eleitores liberados sem biometria pelo mesário foram majoritariamente para o 13, principalmente no Nordeste.

**Ataque modelado.** Um mesário vota no lugar de eleitores ausentes.
- **O que ele precisaria ter:**
  - registro como mesário na urna, com digital gravada de manhã;
  - o título ou o CPF do ausente e um dado pessoal dele (estão no caderno de votação);
  - um dedo qualquer para as 4 tentativas de digital do eleitor;
  - alguém na cabine para votar.
- **Rastros esperados nos arquivos públicos:**
  - volume de liberações concentrado num mesário;
  - horário atípico: última hora, rajadas;
  - comparecimento acima da zona e do 1º turno;
  - `já votou` quando o eleitor verdadeiro aparece depois;
  - ciclo identificação → voto mais curto que o físico;
  - parcela do 13 acima da zona e do 1º turno da mesma seção.

**H0.** Nas seções em que um mesário liberou muitos eleitores, a parcela do 13 é a que a zona e o 1º turno da mesma seção preveem. A taxa de liberação, dentro da zona, não se associa à parcela do 13 de forma diferente entre os turnos.

**Princípio 8.** A conferência de documento, a foto na tela do mesário e a presença de fiscal não contam como controle. Só conta o que está no log: a digital do mesário reconhecida, a sequência das mensagens e o horário.

**O que separa fraude de perfil.** Quem é liberado sem digital tende a ser mais idoso e de menor escolaridade, e mora mais no Nordeste, um perfil que já vota mais no 13. Votar mais no 13 não basta como sinal. O teste é se o 13 sobe **acima** do que a zona e o 1º turno da mesma seção explicam.

## Definições e dados

- **L1:** `Mesário <título> habilitou o eleitor` no log, seguido de voto computado (`habilitadosPeloMesario`, `src/perfil-secoes.js`). É um subconjunto de `dadoPessoalConfere`: liberação manual depois de 4 falhas de digital, com a digital de um mesário identificado. A L1 é 67,7% de toda liberação manual. O resto é liberação "sem associação nominal", tratada no doc 04 do Auditor B.
- **L2:** `sem_biometria + por_biografia` do BU. É todo habilitado sem a digital do próprio eleitor.
- **Par:** mesário × seção × dia, com pelo menos 1 liberação L1. O **mesário-topo** é o que mais liberou na seção. Os títulos viram pseudônimo HMAC com a chave do Auditor B. Nenhum título aparece neste documento.
- **s13** = votos 13 ÷ (13 + 22). **Zona sem a seção:** s13 da zona excluindo a própria seção. **Diferença em diferenças (DiD):** (s13 − zona) no 2º turno menos (s13 − zona) no 1º turno, na mesma seção.
- **Fontes:**
  - perfis por seção `data/parsed/<t>t/perfil/*.jsonl`. Nos dois turnos são 499.207 seções, e o 1º turno inclui SP;
  - logs brutos `data/raw/2t/urnas/...` das 98 seções lidas a fundo, que trazem também o dia do 1º turno quando a urna é a mesma.
- **Diferença de contagem com o Auditor B.** L1 = 5.841.094 aqui, 5.838.665 no doc 04. O doc 04 descarta os dias de log de outra seção. Isso não muda nenhum resultado.

## O que o log permite afirmar e o que não permite

Sequência gravada para cada eleitor liberado pelo mesário (Fato; conferido no bruto em BA 36854/0180/0202):

```
Identificador do eleitor digitado pelo mesário → Foto do eleitor apresentada →
Solicita digital. Tentativa [1..4] de [4] / Capturada a digital / Número de tentativas de reconhecimento →
Solicitação de dado pessoal … habilitação manual → Dado digitado confere → Solicita digital do mesário →
Batimento de digitais retornou o score N / Biometria do mesário <título> encontrada → Mesário <título> habilitou o eleitor →
Eleitor foi habilitado → Voto confirmado para [Presidente] → O voto do eleitor foi computado
```

**O log permite afirmar (Fato):**
- qual mesário liberou e em que segundo;
- que a urna pediu e **capturou** 4 imagens de digital do eleitor e não reconheceu nenhuma;
- que a digital do mesário foi reconhecida, com o score;
- quanto tempo durou o ciclo e quanto tempo passou da habilitação à confirmação;
- a ordem das liberações no dia.

**O log não permite afirmar:**
- **em quem a pessoa votou**. O RDV embaralha os votos e não liga voto a eleitor;
- **de quem era o dedo** das 4 tentativas;
- se o eleitor estava presente;
- quem apertou as teclas na cabine.

Por isso o voto dos liberados só pode ser estimado por comparação entre seções ou cercado por limites aritméticos. Os limites estão em [02](02-limites-deterministicos.md).

## Resultados

### 1. Distribuição das liberações L1 por mesário (Fato; `liberacao-mesarios-analise.mjs`)

| Recorte | Seções | L1 2º t (taxa) | L1 1º t (taxa) | Taxa L2 2º / 1º t | Liberações por par p50/p99/p99,9/máx | Seções com topo ≥ 40, 2º t (por mil) | Topo ≥ 40, 1º t | Topo ≥ 100, 2º / 1º t | s13 2º t |
|---|---|---|---|---|---|---|---|---|---|
| Brasil | 499.207 | 5.841.094 (4,55%) | 5.120.432 (4,09%) | 12,42% / 12,23% | 5/33/49/265 | 2.923 (5,9) | 1.908 | 49 / 61 | 51,8% |
| **Nordeste** | 140.828 | **1.795.037 (4,94%)** | 1.545.121 (4,35%) | 11,75% / 11,45% | 6/37/55/265 | **1.350 (9,6)** | 869 | 31 / 32 | 69,4% |
| AL | 7.101 | 96.551 (4,95%) | 83.260 (4,30%) | 10,55% / 10,17% | 6/40/60/114 | 114 (16,1) | 69 | 1 / 0 | 60,8% |
| BA | 35.476 | 441.566 (4,69%) | 364.271 (4,02%) | 12,26% / 12,01% | 6/38/64/265 | 417 (11,8) | 301 | 20 / 20 | 71,3% |
| CE | 23.765 | 307.281 (5,10%) | 269.560 (4,56%) | 11,17% / 10,90% | 6/37/57/155 | 243 (10,2) | 157 | 6 / 5 | 68,9% |
| MA | 18.093 | 170.045 (4,12%) | 145.008 (3,49%) | 9,94% / 9,67% | 6/30/43/95 | 45 (2,5) | 42 | 0 / 2 | 69,5% |
| PB | 10.712 | 147.473 (5,38%) | 131.055 (4,88%) | 10,27% / 9,99% | 7/34/46/58 | 70 (6,5) | 35 | 0 / 0 | 67,5% |
| PE | 21.418 | 283.892 (4,63%) | 243.049 (4,11%) | 14,33% / 13,92% | 5/35/51/216 | 163 (7,6) | 82 | 4 / 5 | 69,2% |
| PI | 10.225 | 138.605 (6,19%) | 122.681 (5,47%) | 11,00% / 10,69% | 7/40/57/73 | 149 (14,6) | 107 | 0 / 0 | 75,9% |
| RN | 8.115 | 135.318 (6,06%) | 119.348 (5,50%) | 11,85% / 11,66% | 7/39/52/65 | 132 (16,3) | 67 | 0 / 0 | 65,7% |
| SE | 5.923 | 74.306 (5,07%) | 66.889 (4,65%) | 10,57% / 10,40% | 5/30/44/96 | 17 (2,9) | 9 | 0 / 0 | 69,5% |
| Norte | 43.769 | 385.951 (3,74%) | 349.147 (3,31%) | 9,08% / 9,09% | 5/27/38/116 | 42 (1,0) | 39 | 1 / 0 | 50,0% |
| Centro-Oeste | 38.048 | 425.854 (4,44%) | 386.590 (4,11%) | 10,36% / 10,55% | 5/31/46/139 | 152 (4,0) | 112 | 2 / 5 | 40,0% |
| Sudeste | 203.237 | 2.219.043 (4,20%) | 1.910.238 (3,73%) | 13,97% / 13,72% | 5/30/45/228 | 704 (3,5) | 376 | 7 / 9 | 47,2% |
| Sul | 72.015 | 1.015.209 (5,43%) | 929.336 (5,11%) | 12,26% / 12,26% | 6/36/52/189 | 675 (9,4) | 512 | 8 / 15 | 37,4% |
| Exterior | 1.310 | 0 | 0 | sem detalhamento | — | 0 | 0 | 0 / 0 | 53,9% |

- **Fato.** A L1 subiu de 4,09% para 4,55% do comparecimento entre os turnos, em todas as regiões. No Nordeste foi de 4,35% para 4,94%. A cauda (topo ≥ 40) cresceu 53% no país, 55% no Nordeste, 87% no Sudeste e 32% no Sul. A cauda extrema (topo ≥ 100) **não** cresceu: 61 seções no 1º turno, 49 no 2º.
- **Fato.** Nas seções com 10 ou mais liberações L1, o mesário-topo fez a mediana de 91% delas (93% no Nordeste). A liberação na seção costuma ficar com um mesário só, o que está no terminal.
- **Fato.** 60 mesários liberaram em mais de uma seção no 2º turno, 59 deles na mesma zona: 17 no Nordeste e 30 no Sudeste. O maior somou 60 liberações, numa seção do MA (57 + 3). No 1º turno foram 120. Mesmo número do doc 04 (A13).

### 2. Cauda: seções em que um mesário liberou 40 ou mais (Fato)

Controle: seções das mesmas regiões com mesário-topo abaixo de 10 liberações.

| Recorte | Seções da cauda | s13 − zona, média (mediana) | DiD 2º − 1º t | Controle: s13 − zona / DiD | Comparecimento − zona / DiD | Controle: comparecimento DiD | `já votou` por mil votos (controle) | Mesmo mesário ≥ 40 no 1º t | UE2013 |
|---|---|---|---|---|---|---|---|---|---|
| Brasil | 2.923 | +0,31 (+0,18) | −0,12 | +0,28 / +0,01 | +0,20 / +0,97 | −0,19 | 1,01 (0,93) | 22% | 15% |
| **Nordeste** | **1.350** | **+1,18 (+0,95)** | **−0,16** | +0,27 / 0,00 | +0,55 / +1,09 | −0,31 | 1,30 (1,18) | 22% | 14% |
| BA | 417 | +1,31 | −0,12 | +0,42 / −0,02 | +0,21 / +1,07 | −0,30 | 1,43 (1,27) | 24% | 16% |
| CE | 243 | +1,16 | −0,05 | +0,07 / +0,04 | +0,60 / +1,03 | −0,30 | 1,12 (1,00) | 23% | 12% |
| PE | 163 | +1,29 | −0,43 | +0,05 / −0,02 | +0,65 / +1,32 | −0,31 | 1,09 (0,90) | 16% | 18% |
| PI | 149 | +2,13 | −0,21 | +0,13 / +0,03 | +1,50 / +1,30 | −0,37 | 2,78 (1,41) | 23% | 7% |
| RN | 132 | +0,64 | −0,15 | −0,05 / 0,00 | +0,16 / +1,20 | −0,44 | 0,70 (1,10) | 18% | 0% |
| AL | 114 | +0,89 | −0,08 | −0,01 / +0,02 | +0,90 / +1,07 | −0,39 | 0,67 (0,93) | 25% | 26% |
| PB | 70 | −0,51 | +0,09 | −0,05 / 0,00 | +0,93 / +0,89 | −0,32 | 1,01 (0,96) | 17% | 21% |
| MA | 45 | +1,59 | −0,43 | +0,79 / −0,03 | −0,40 / +0,26 | −0,21 | 1,76 (1,71) | 22% | 18% |
| SE | 17 | +1,23 | −0,89 | +0,21 / +0,01 | +0,46 / +0,96 | −0,40 | 1,00 (0,99) | 12% | 6% |
| Norte | 42 | +1,80 | +0,09 | +0,46 / +0,04 | +0,67 / +1,06 | −0,24 | 0,17 (1,10) | 33% | 5% |
| Centro-Oeste | 152 | +0,93 | −0,38 | +0,30 / 0,00 | +1,02 / +0,96 | −0,12 | 1,07 (0,94) | 21% | 22% |
| Sudeste | 704 | −0,36 | −0,16 | +0,18 / +0,01 | −0,77 / +1,26 | −0,16 | 0,76 (0,78) | 17% | 11% |
| Sul | 675 | −0,96 | +0,03 | +0,51 / −0,03 | +0,28 / +0,41 | −0,10 | 0,71 (0,84) | 26% | 21% |

Pontos percentuais, exceto `já votou`.

**Cauda extrema (topo ≥ 100), Fato:**
- 49 seções no país: Nordeste 31 (BA 20, CE 6, PE 4, AL 1), Sul 8, Sudeste 7, Centro-Oeste 2, Norte 1.
- 94% são UE2013, contra 2,5% das seções do país. 12 das 49 são urna de reserva (`reservaSecao`), contra 1,1% no país.
- Em 61% das 49, o mesmo mesário liberou 40 ou mais também no 1º turno.
- No Nordeste: s13 − zona = −0,48 ponto (mediana +0,11); DiD = −0,43 ponto. No Sudeste: +1,43 / +0,88. No Sul: −0,65 / +0,18.

**Limites aritméticos da cauda extrema (Fato):**
- Nas 31 seções do Nordeste, a parcela do 13 **entre os liberados L1** fica, somando as seções, entre 59,5% e 88,3%. Em 25 delas os números obrigam a maioria dos liberados a ter votado no 13.
- Isso não é sinal de fraude. Quando 80% da seção é liberada e a seção dá 70% ao 13, a conta obriga.
- No Sul acontece o simétrico: em 5 das 8 seções os números obrigam a maioria dos liberados a ter votado no 22.

**Leitura:**
- **Fato.** A cauda do Nordeste vota no 13 cerca de 0,9 ponto acima do controle, comparando com a zona. A diferença já existia no 1º turno: a DiD é −0,16 ponto, contra 0,00 no controle.
- **Fato.** No 2º turno, o comparecimento das seções da cauda cresceu cerca de 1 ponto acima da zona e do 1º turno, contra −0,2 a −0,4 no controle. O efeito aparece em todas as regiões. Ele continua quando a cauda é escolhida pelo 1º turno (+0,59 ponto no Nordeste, +0,28 no Sul; `caudaSelecionadaNo1t`). Mesmo assim, a parcela do 13 nessas seções não mudou entre os turnos (DiD −0,02 ponto no Nordeste).
- **Hipótese.** Esse comparecimento extra se explica por seções com sensor ruim (UE2013/UE2015) e eleitorado mais idoso, que voltam a votar mais no 2º turno. Não se explica por votos de ausentes dirigidos a um lado. Fica como teste para o demógrafo, com idade por seção.
- **Fato.** O `já votou` nas seções da cauda é de 1,0 a 1,3 por mil votos, igual ao do controle. Só o PI tem o dobro (2,78 contra 1,41), em 149 seções. Ver a Recomendação 3.

### 3. Dose-resposta: taxa do mesário-topo × parcela do 13 (Fato)

Média de (s13 − zona) e DiD, em pontos, por faixa de liberações do mesário-topo ÷ comparecimento:

| Faixa do topo | Brasil n / dif / DiD | Nordeste n / dif / DiD | Sudeste dif / DiD | Sul dif / DiD |
|---|---|---|---|---|
| 0–2% | 151.247 / +0,33 / +0,02 | 38.036 / +0,33 / 0,00 | +0,19 / +0,04 | +0,62 / −0,01 |
| 2–5% | 197.535 / −0,04 / 0,00 | 51.752 / −0,19 / +0,01 | +0,01 / −0,01 | +0,09 / −0,01 |
| 5–10% | 124.459 / +0,04 / −0,08 | 40.601 / +0,22 / −0,03 | −0,02 / −0,14 | −0,14 / −0,07 |
| 10–20% | 24.973 / +0,57 / −0,19 | 10.016 / +1,27 / −0,13 | +0,19 / −0,28 | −0,38 / −0,23 |
| 20–40% | 797 / +1,57 / −0,26 | 377 / +2,82 / −0,33 | +1,41 / −0,33 | −0,66 / −0,30 |
| 40–100% | 52 / +0,40 / −0,09 | 32 / −0,35 / −0,58 | +1,70 / +1,21 | −0,23 / +0,33 |

- **Fato.** No Nordeste, a parcela do 13 sobe com a taxa do mesário-topo até 40%: +2,8 pontos na faixa de 20–40%. Ela volta a cair onde quase todos foram liberados. A DiD fica negativa em todas as faixas: o 13 ganhou **menos** do 1º para o 2º turno onde o mesário liberou mais. No Sul a parcela do 13 **cai** com a taxa.
- **Hipótese.** O gradiente do Nordeste é composição: idosos e menor escolaridade nas seções com muita falha de digital. Se as liberações fossem votos inseridos para o 13, a DiD seria positiva nas faixas altas, porque a L1 cresceu entre os turnos. Ela é negativa.

### 4. Regressão dentro da zona (Goodman com efeito fixo de zona, erro agrupado por município; Fato)

Coeficiente da taxa (liberados ÷ comparecimento) sobre s13. Pela leitura de Goodman, ele estima quanto os liberados votam a mais no 13 do que os outros eleitores da mesma zona.

| Recorte | L1, 2º t | L1, 1º t | Δ L1 (mesma seção, 2º − 1º) | L2, 2º t | Δ L2 |
|---|---|---|---|---|---|
| Brasil | −0,013 (t −1,5) | −0,003 (t −0,4) | −0,0005 (t −0,5) | +0,021 (t 2,3) | −0,0001 (t −0,1) |
| **Nordeste** | **+0,060 (t 5,6)** | **+0,060 (t 6,0)** | **−0,0006 (t −0,4)** | +0,077 (t 10,8) | −0,0028 (t −1,4) |
| AL | +0,054 (t 3,0) | +0,072 (t 3,6) | +0,0005 (t 0,1) | +0,071 (t 1,9) | −0,0098 (t −1,1) |
| BA | +0,021 (t 0,9) | +0,019 (t 0,9) | −0,0012 (t −0,5) | +0,060 (t 5,7) | −0,0001 (t 0,0) |
| CE | +0,134 (t 6,7) | +0,147 (t 7,6) | −0,0001 (t 0,0) | +0,147 (t 9,7) | −0,0039 (t −0,7) |
| MA | +0,002 (t 0,1) | +0,023 (t 1,1) | −0,0055 (t −1,2) | +0,118 (t 6,1) | −0,0009 (t −0,1) |
| PB | +0,106 (t 3,1) | +0,081 (t 2,6) | −0,0043 (t −0,9) | +0,100 (t 4,4) | +0,0038 (t 0,5) |
| PE | +0,089 (t 3,3) | +0,074 (t 2,9) | **+0,0095 (t 2,3)** | +0,031 (t 1,8) | −0,0010 (t −0,2) |
| PI | +0,059 (t 2,3) | +0,052 (t 1,9) | −0,0005 (t −0,1) | +0,083 (t 2,2) | −0,0174 (t −2,5) |
| RN | +0,077 (t 1,3) | +0,072 (t 1,1) | −0,0035 (t −0,7) | +0,089 (t 5,6) | +0,0058 (t 0,6) |
| SE | −0,002 (t 0,0) | +0,013 (t 0,2) | −0,0059 (t −0,9) | +0,061 (t 3,6) | −0,0073 (t −0,7) |
| Norte | +0,012 (t 0,4) | −0,001 (t 0,0) | +0,0070 (t 1,5) | +0,056 (t 2,5) | +0,0031 (t 0,5) |
| Centro-Oeste | −0,085 (t −3,2) | −0,065 (t −2,8) | +0,0046 (t 1,5) | +0,101 (t 5,4) | +0,0037 (t 0,6) |
| Sudeste | −0,031 (t −1,9) | −0,021 (t −1,3) | −0,0031 (t −1,7) | −0,048 (t −4,5) | −0,0009 (t −0,4) |
| Sul | −0,104 (t −6,3) | −0,062 (t −4,2) | +0,0004 (t 0,2) | +0,057 (t 4,0) | +0,0037 (t 1,2) |

- **Fato.** No Nordeste, os liberados pelo mesário votam cerca de 6 pontos a mais no 13 do que os outros eleitores da mesma zona, **sem controle de perfil**. O tamanho é idêntico no 1º turno. Com os controles de perfil do método ecológico, a diferença L1 no Nordeste vai a −0,5 ponto [−1,8; +0,8] (doc [03](03-regressao-ecologica-por-regiao.md)).
- **Fato.** A variação na mesma seção não se relaciona com a variação da parcela do 13, no Nordeste e em 8 das 9 UFs. A exceção é PE: Δ = +0,0095, t 2,3, um entre 30 testes desta tabela. Uma seção de PE com 10 pontos a mais de L1 no 2º turno ganhou 0,1 ponto de 13.
- **Hipótese (limite de tamanho).** Suponha que as liberações extras do 2º turno no Nordeste fossem votos inseridos para o 13. Cada ponto de taxa somaria cerca de (1 − 0,69) ≈ 0,31 ponto de s13. O limite superior de 95% observado é +0,0021, cerca de 150 vezes menor. Os dados são compatíveis com no máximo ~1% das liberações extras virando voto inserido para um lado só. Isso é inferência de modelo, não contagem.

### 5. Rastro no log bruto: 49 seções da cauda (topo ≥ 100) × 49 controles da mesma zona (Fato; `liberacao-mesarios-log.mjs`)

| Medida (2º turno) | Cauda | Controle |
|---|---|---|
| Votos / liberações do mesário-topo | 12.977 / 7.511 | 12.991 / 191 |
| Voto sem habilitação; habilitação sem voto | 0; 0 | 0; 0 |
| Liberação sem `Biometria do mesário … encontrada` | 0 | 0 |
| Liberação manual com menos de 4 tentativas de digital do eleitor | 0 | 0 |
| Liberação por mesário não registrado no dia | 0 | 0 |
| Mesário-topo registrado na urna / eleitor da própria seção | 49 de 49 / 16 de 49 | 24 de 24 / 12 de 24 |
| Fração das liberações do topo na última hora / fração de todos os votos na última hora (medianas) | 3,9% / 4,6% | — / 4,8% |
| Máximo de liberações do topo em 10 min / menor intervalo entre duas | 11 / 50 s | 4 / 73 s |
| Ciclo identificação → voto, mediana: liberado pelo mesário / biometria | 66 s / 33 s | 90 s / 28 s |
| Sequências longas de liberações do topo (permutação, p < 0,001) | 25 de 49 | 0 de 24 |
| Idem, qualquer liberação manual (com ou sem mesário) | 9 de 49 | 0 de 49 |
| Habilitação → confirmação < 5 s: liberado pelo mesário | **681 de 9.064 (7,5%)** | 7 de 263 (2,7%) |
| Idem: sem associação nominal / ano de nascimento / biometria | 159 de 1.527 (10,4%) / 7 de 669 (1,0%) / **11 de 1.717 (0,6%)** | 18 de 965 (1,9%) / 14 de 784 (1,8%) / 75 de 10.979 (0,7%) |
| Menor tempo habilitação → confirmação | 2 s (6 casos) | 2 s (1 caso) |

**Leitura:**
- **Fato.** A urna seguiu o ciclo completo em todos os 25.968 votos das 98 seções no 2º turno: 4 capturas de digital do eleitor, dado pessoal e digital do mesário reconhecida. Não há atalho no software: nenhuma liberação pulou etapas.
- **Fato.** O ritmo não permite rajada: o mesário-topo nunca liberou dois eleitores em menos de 50 s, e o máximo em 10 min foi 11. Com ciclo mediano de 66 s, 265 liberações ocupam praticamente o dia de votação. O doc 04 mostra que, nas seções de liberação em massa, a falha começa no primeiro eleitor em 79 de 96. A última hora não concentra liberações.
- **Fato.** As sequências longas do mesário-topo são significativas em 25 de 49 seções, mas as de qualquer liberação manual só em 9. **Hipótese:** é troca de mesário no terminal. Enquanto um mesário opera, as liberações são dele.
- **Fato (sem explicação fechada).** Liberações manuais (com ou sem mesário) têm muito mais confirmação rápida (< 5 s) que votos por biometria, e mais na cauda que no controle. A fração rápida varia de 0% a 31% entre as 49 seções. As que mais têm são BA 39136/0033/0222 (31%), PE 23817/0105/0324 (25%) e BA 34290/0127/0014 (25%). Nas 3 seções conferidas no bruto (seção 6), as confirmações rápidas se espalham das 8h às 16h. Não formam bloco. A fração rápida não se associa à parcela do 13 da seção nem à DiD: Spearman 0,03 e −0,005 nas 49. As 5 seções mais rápidas têm s13 **abaixo** da zona. No 1º turno a medida não é comparável, porque o presidente é o último de 6 cargos.
  - **Hipótese (benigna, técnica):** o relógio de cabine começa em `Eleitor foi habilitado`, e a liberação manual tem passos do mesário no terminal, que gastam 2 a 3 s. Nesse tempo o eleitor já pode estar a caminho da cabine. Por isso a liberação sem associação nominal (10,4%) também é rápida.
  - **Hipótese (risco):** alguém já posicionado na cabine vota em sequência pelos liberados.
  - O log não distingue as duas. Nenhuma das duas mostra direção de voto.

### 6. Seções conferidas no arquivo bruto (`src/exportar.js --stdout`)

| Seção | Bruto (BU + log do dia) | Leitura |
|---|---|---|
| BA 36854/0180/0202 (Lauro de Freitas), UE2013, urna de seção | BU: comparecimento 348; por biometria 11, por biografia 302, sem biometria 35; 13 = 181, 22 = 158. Log: 266 `Mesário … habilitou`, 265 do mesmo título; 302 `Dado digitado confere`; 11 `biométrica`. Integridade: 0 falhas | Maior mesário do país. s13 = 53,4% contra 67,2% da zona (−13,9 pontos). Mesmo mesário com 253 no 1º turno. 22,6% de confirmações < 5 s |
| BA 39136/0033/0222 (Simões Filho), UE2013, urna de seção | BU: 339; 9 / 306 / 24; 13 = 235, 22 = 86. Log: 289 liberações, 264 do mesário-topo. 0 falhas | 2º maior. s13 = 73,2% contra 74,2% da zona. No 1º turno o mesmo mesário liberou 34. Maior fração de confirmação rápida (31%), espalhada das 8h às 16h |
| PE 23817/0105/0324 (Caruaru), UE2013, **urna de reserva** (`reservaSecao`) | BU: 331; 15 / 303 / 13; 13 = 168, 22 = 153. Log: 263 liberações, 216 do topo | Maior do Nordeste fora da BA. s13 = 52,3% contra 56,9% da zona. Urna trocada; o dia do 1º turno no log é de outra seção |

## Nordeste em destaque

- **Fato.** O Nordeste concentra a cauda em número absoluto: 1.350 das 2.923 seções com um mesário ≥ 40 e 31 das 49 com ≥ 100, 20 delas na BA. Dessas, 19 ficam em 7 zonas da Região Metropolitana de Salvador e do Recôncavo: Lauro de Freitas 6, Candeias 4, Simões Filho 2, Terra Nova 2, Dias d'Ávila 2, São Sebastião do Passé 2, São Francisco do Conde 1. A outra fica em Glória. Na taxa por mil seções (9,6), fica junto do Sul (9,4). Dentro do Nordeste, a taxa vai de 2,5 por mil (MA) a 16,3 (RN).
- **Fato.** Nessas seções, a parcela do 13 está +1,2 ponto acima da zona. O controle está +0,3. Essa vantagem já existia no 1º turno (DiD −0,16). Na cauda extrema, a parcela fica abaixo da zona (−0,5 ponto).
- **Fato.** Dentro da zona, a associação L1 × 13 no Nordeste (+0,060) é igual nos dois turnos e some com controle de perfil (doc 03). A variação entre turnos é nula (−0,0006 ± 0,0014).
- **Fato.** O rastro de fraude por mesário procurado no log não aparece no Nordeste nem fora dele: atalho no ciclo, ritmo acima do físico, concentração na última hora e `já votou` acima do controle. A exceção é o `já votou` do PI (Recomendação 3).
- **Hipótese.** O padrão do Nordeste é composição (perfil e lugar) mais falha de leitor nas urnas antigas da Região Metropolitana de Salvador. Não aparece liberação dirigida ao 13.

## Limites (o que não deixa rastro nos arquivos públicos)

1. **Voto secreto.** Nenhum teste observa o voto de um liberado. Tudo sobre direção de voto é comparação entre seções (ecológica) ou limite aritmético.
2. **Fraude constante nos dois turnos.** Um mesário que inserisse votos do mesmo jeito em 04/10 e em 25/10 passaria pela DiD e pela regressão da variação. O teste de nível (s13 − zona) a pegaria só se fosse maior que o efeito de composição, que não está controlado aqui. O controle de perfil está no doc 03.
3. **Fraude espalhada por toda a zona** some no efeito fixo de zona.
4. **De quem é o dedo.** O log grava que a digital do eleitor foi capturada 4 vezes e não reconhecida. Não grava de quem era. A digital do mesário identifica o mesário, não o eleitor.
5. **Quem estava na cabine.** A confirmação rápida (< 5 s) é compatível com o eleitor a caminho e com alguém já posicionado. A disposição física da mesa não está nos arquivos.
6. **Liberação sem associação nominal** (2,79 milhões de votos, doc 04): o log não identifica ninguém, e ela fica fora da análise por mesário. Ela entra na L2.
7. **Leitura a fundo só em 98 seções.** O teste de cabine rápida não foi feito no país. As medidas nacionais por mesário vêm do perfil: contagem por mesário, sem horário de cada liberação.
8. **Urbano/rural e renda** não estão nos dados abertos por seção. A composição do Nordeste é hipótese, não medida.

## Recomendações

1. **Cabine rápida no país.** Medir, nas 499 mil seções, a fração de confirmações < 5 s por classe de habilitação, a partir dos logs do 2º turno. Testar se ela se associa à parcela do 13 dentro da zona. Essa é a única medida do log que chega perto de "alguém já estava na cabine".
2. **Inspeção técnica das urnas UE2013** das zonas da BA com mais seções na cauda (36854/0180, 34290/0127, 39136/0033, 39330/0128) e de PE 23817/0105. Verificar o sensor e comparar os scores de digital do eleitor por urna. A maior seção (BA 36854/0180/0202) já está no doc 04.
3. **`Já votou` no PI:** 2,78 por mil votos nas 149 seções da cauda, contra 1,41 no controle. Listar essas seções e conferir as rajadas com `biometria-rajadas.mjs` (doc 03 do Auditor B).
4. **PE, variação entre turnos** (Δ L1 +0,0095, t 2,3): repetir com o controle de perfil do doc 03, antes de tratar como sinal.

## Reprodução

```bash
node --max-old-space-size=4096 scripts/auditoria/liberacao-mesarios-dados.mjs        # ~5 min; perfis → linhas compactas, títulos em pseudônimo
node --max-old-space-size=8000 scripts/auditoria/liberacao-mesarios-analise.mjs      # ~2 min; seções 1 a 4 e escolha das 98 seções
node scripts/auditoria/liberacao-mesarios-log.mjs                                     # ~10 s; seção 5 (log bruto das 98)
node src/exportar.js --turno 2 --uf ba --municipio 36854 --zona 0180 --secao 0202 --stdout   # conferência da seção 6
```

Saídas em `data/parsed/auditoria/liberacao/`:
- `mesarios-secoes-{1t,2t}.jsonl`: uma linha por seção, com pseudônimos;
- `mesarios-resumo.json`: distribuição, cauda, cauda escolhida pelo 1º turno, dose-resposta e regressões;
- `mesarios-cauda-2t.jsonl`: as 2.923 seções com topo ≥ 40;
- `mesarios-alvos-log.json`, `mesarios-log.jsonl`, `mesarios-log-resumo.json`;
- `*.stdout`.
