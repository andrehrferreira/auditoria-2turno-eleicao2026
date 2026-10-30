# 05. H22: exterior e urnas de fluxo especial, comparecimento e ritmo entre os turnos

Cientista político, 30/10/2026. Rótulos: **Fato**, **Hipótese**, **Recomendação**, **Pendente**. Plano: discussão T19 ([../modelos/T19/sintese.md](../modelos/T19/sintese.md)), linha H22 de [../../hipoteses.md](../../hipoteses.md). Princípio 8 (doc 01): no exterior não há controle técnico de identidade (100% dos eleitores liberados por título e ano de nascimento, [biometria-mesarios/07](../biometria-mesarios/07-exterior-sem-biometria.md)), e a apuração em cédula é 100% humana. Explicação política só conta se a previsão dela bater com os dados.

## Resposta curta

- **Fato.** Nenhum sinal de anomalia de processo no universo completo do exterior. São 1.351 seções em cada turno: 1.281 com urna, 29 apuradas em cédula e 41 não instaladas. O que foi verificado:
  - 0 seção com comparecimento acima dos aptos ou do cadastro;
  - 0 seção que aparece num turno só ou muda de categoria (só 1 urna virou RED no 2º turno);
  - 0 diferença entre o BU e o diário da urna, nos dois turnos;
  - 0 voto fora da janela;
  - nenhum intervalo entre votos abaixo de 15 s;
  - 0 BU de cédula emitido antes do fim da votação no posto. Isso só vale se o relógio da máquina do SA estiver na hora de Brasília. Sem depender dessa premissa: no 2º turno, os 29 BUs foram recebidos pelo TSE 160 min ou mais depois do fechamento do posto.
- **Fato.** O comparecimento do exterior subiu **11,6%** do 1º para o 2º turno: de 341.766 para 381.443 (37,3% → 41,6% dos aptos). Os votos nominais subiram +12,3%. Para comparar:

  | Ano | Votos nominais 1º → 2º no exterior | No Brasil |
  |---|---|---|
  | 2022 | +1,2% | +0,3% |
  | 2018 | −4,1% | −2,1% |
  | 2026 | +12,3% | +4,0% |

  - O volume de 2026 é novo.
  - O padrão não é novo: o exterior amplia o movimento nacional nos três anos, de 2 a 4 vezes.
- **Hipótese política com previsões conferidas.** O aumento tem a forma de mobilização de 2º turno, larga e sem seção-alvo:
  - está espalhado: sobe em 113 das 145 cidades com voto, fica igual em 6 e cai em 26;
  - 49% dele está nos EUA e em Portugal, onde estão as maiores comunidades;
  - o eleitor a mais chegou de **manhã**: 34% do acréscimo às 8 h, e houve menos votos depois das 14 h do que no 1º turno. Não chegou em rajada de fim de dia;
  - nenhuma seção desvia da própria cidade além do ruído de amostra;
  - a geografia partidária é a de 2022: correlação de 0,97 entre cidades.
- **Neutralidade.**
  - O eleitor a mais pendeu para o 13. Dentro da mesma cidade, cada eleitor novo deu 0,64 voto ao 13 e 0,25 ao 22, contra 46% e 42% de fatia no comparecimento do 1º turno.
  - Mesmo assim, o exterior deu ao 13 uma parte do disponível **menor** que o Brasil: 60,8% contra 73,6%.
  - Essa parte fica dentro da faixa histórica do próprio exterior: 65,5% em 2018 para o 13 e 38,1% em 2022, quando o 22 ficou com 61,9%.
- **Limite (princípio 8).** Sem biometria, um voto de alguém que usa título e ano de nascimento de um eleitor que **não iria votar** não deixa rastro distinguível de um eleitor real mobilizado. Os testes acima excluem rajada, seção-alvo, contagem impossível e voto sem diário. Não excluem substituição espalhada e proporcional ao fluxo normal.

## Como reproduzir

```bash
node scripts/auditoria/politico-h22-secoes.mjs        # ~10 s: universo, contagem, ritmo, política, neutralidade
node scripts/auditoria/politico-h22-apuracao.mjs      # ~5 s: Sistema de Apuração e origem do voto 2022 × 2026
node scripts/auditoria/politico-h22-linha-de-base.mjs # ~30 s: exterior em 2018 e 2022 (rodar depois do anterior)
```

- Saídas em `data/parsed/auditoria/cientista-politico/`:
  - `h22-exterior.json` e `h22-secoes.jsonl`, uma linha por seção, sem título de mesário nem de eleitor;
  - `h22-paises.csv`;
  - `h22-apuracao.json`;
  - `h22-linha-de-base.json`.
- Fontes:
  - banco pela cópia de leitura de 29/10/2026 10:50, com as 28 UFs nos dois turnos (`secao`, `secao_eleicao`, `voto_bu` cargo 1, `perfil_log` com `votosPorHoraLocal` e as faixas de intervalo);
  - `eleitorado_local_votacao_2026_ZZ`, que dá o país pelo campo NM_BAIRRO, corrigido à mão em 43 cidades onde o campo traz "CENTRO" ou o nome da cidade;
  - `perfil_eleitor_secao_2026_ZZ`, o cadastro de 14/07/2026;
  - correspondências efetivadas (CEFT) de 2022 (1º turno) e de 2026 (1º e 2º turnos);
  - `votacao_candidato_munzona` de 2018, 2022 e 2026.
- Biblioteca comum: `scripts/auditoria/politico-h22-lib.mjs`.

## 1. Universo (Fato)

| | 1º turno | 2º turno |
|---|---|---|
| Seções (principais) | 1.351 | 1.351 |
| com urna | 1.281 (1.252 titulares + 29 reservas) | 1.281 (1.238 titulares + 42 reservas + 1 RED) |
| apuradas em cédula pelo Sistema de Apuração (SA) | 29 | 29 |
| não instaladas ("Nao instalada") | 41 | 41 (as mesmas) |
| Seções agregadas (votam na urna da principal) | 1.364 | 1.364 |
| Aptos | 916.111 | 916.260 |
| Comparecimento (presidente) | 341.766 | 381.443 |

- As 1.351 principais e as 1.364 agregadas batem, uma a uma, com o `eleitorado_local_votacao` dos dois turnos (0 divergência).
- As 41 não instaladas têm 426 eleitores no cadastro, no máximo 29 por seção. São postos pequenos (Bridgetown, Pyongyang, Bagdá, Malabo...), iguais nos dois turnos, sem BU e sem voto.
- No exterior só se vota para presidente, nos dois turnos. A cédula é a mesma, e o 1º turno da mesma seção é a linha de base natural do ritmo do 2º.

## 2. Anomalias de processo procuradas (Fato)

| Sinal de processo (o suspeito) | Resultado | Linha de base / nota |
|---|---|---|
| Comparecimento acima dos aptos | 0 nos dois turnos | — |
| Comparecimento acima do cadastro (principal + agregadas) | 0 | O cadastro de julho é ≥ aptos em todas as seções; é maior em 889 (eleitor que saiu do cadastro depois de julho). Soma: 918.450 contra 916.260 |
| Seção que só aparece num turno | 0 | As 1.351 têm linha nos dois turnos. Mudança de categoria: só ZZ 30961/0001/3869 (Faro), urna → RED no 2º turno |
| Seção de SA num turno só | 0 | As 29 são as mesmas nos dois turnos |
| Votos no BU sem o diário correspondente (BU ≠ votos computados no log) | 0 de 1.281 no 1º turno, 0 de 1.281 no 2º | — |
| Votos fora da janela (antes de "urna pronta" ou depois do encerramento) | 0 nos dois turnos | — |
| Liberação por biometria ou manual pelo mesário | 0 nos dois turnos | 100% por título e ano de nascimento (já sabido) |
| Aptos que mudam entre os turnos | 316 seções, saldo **+149** | No Brasil, 55.406 seções mudam, saldo **−149**. O total nacional de aptos é o mesmo nos dois turnos: 149 eleitores passaram do Brasil para o exterior entre os turnos |
| Votos antes das 8 h locais | 0 | **Zero automático:** a urna só abre às 08:00 do próprio relógio, então o número mostra apenas que ela seguiu a própria regra. **Que o relógio estava na hora local é Fato** por outro teste ([cetico-revisor/37](../cetico-revisor/37-h18-h21-h22.md), seção 2). A Europa, Israel e o Líbano saíram do horário de verão na madrugada do 2º turno. Nessas 585 seções, a mediana do registro do mesário antes da abertura foi de 7,61 h para 7,48 h; nas 685 que não mudaram de horário, de 7,47 h para 7,34 h. A diferença entre os grupos é de cerca de 3 min; se o relógio não tivesse acompanhado a mudança, seria de 1 h |
| Votos depois das 18 h locais | 1º turno: 99 votos em 8 seções. 2º turno: 0 | Fila de fim de dia do 1º turno: Bruxelas (2), Buenos Aires, Ciudad del Este (2), Nagóia e Toronto (2). Todos dentro da janela; último voto às 18:37 em Ciudad del Este |

## 3. Ritmo (Fato)

| | 1º turno | 2º turno |
|---|---|---|
| Seções com urna e voto | 1.281 | 1.281 |
| Votos por hora no pico da seção: mediana / p99 / máximo | 43 / 74 / 89 | 48 / 82 / 95 |
| Maior rajada em 10 min: mediana / máximo | 11 / 19 | 12 / 21 |
| Intervalo mínimo entre votos: menor / p1 / mediana | 19 s / 22,8 s / 38 s | 16 s / 21 s / 34 s |
| Intervalos abaixo de 15 s | 0 | 0 |
| Habilitação → voto em menos de 5 s | 151 (0,04%) | 285 (0,07%) |
| Votos das 16 h em diante | 7,0% | 5,6% |
| "Já votou" / eleitor não encontrado / suspensos | 1.052 / 5.617 / 105 | 556 / 4.401 / 61 |

- **Linha de base do Brasil** (2º turno, 497.896 seções): o intervalo mínimo tem p1 de 22 s e mediana de 29 s. O exterior não é mais rápido que o Brasil.
- **Pico acima do maior pico do 1º turno (89/h):** 3 seções no 2º turno.

  | Seção | Pico no 1º turno | Pico no 2º turno |
  |---|---|---|
  | Berlim 29386/0001/1714 | 84 | 91 |
  | Dublin 29661/0001/3315 | 85 | 95 |
  | Montreal 30155/0001/0699 | 63 | 91 |

  - 95 votos por hora são 38 s por eleitor, acima do intervalo mínimo observado.
  - **Não é ritmo impossível.**
- **"Já votou".** O 1º turno tem 5 seções e o 2º tem 2 com o padrão já conhecido de "já votou" ≈ 1 por voto: Lisboa 29955/0001/3858 nos dois turnos, Kingston 99430/0001/0145 nos dois, e Lisboa 0630, Nova York 0308 e Chicago 0867 só no 1º. É o padrão de consulta periódica de [03](03-plausibilidade-achados.md).
  - Sem essas seções, os casos de "já votou" são **190 no 1º turno e 211 no 2º**.
  - O comparecimento subiu 11,6% e esses casos subiram 11%: não há surto de eleitor real que chega e encontra o voto já dado.
- **Perfil horário do eleitor a mais** (2º − 1º turno, seções com urna nos dois):

  | Hora local | 8 h | 9 h | 10 h | 11 h | 12 h | 13 h | 14 h | 15 h | 16 h | 17 h | 18 h |
  |---|---|---|---|---|---|---|---|---|---|---|---|
  | Δ votos | +13.573 | +6.878 | +8.829 | +7.360 | +5.063 | +1.891 | −652 | −783 | −721 | −1.704 | −99 |

  - O acréscimo veio na abertura e no fim da manhã. É o contrário da assinatura de H15 (rajada no fim do dia).

## 4. Sistema de Apuração: seções apuradas em cédula (Fato)

| | 2022 (1º turno) | 2026 (1º turno) | 2026 (2º turno) |
|---|---|---|---|
| Seções com origem "Sistema de apuração" (CEFT, país inteiro) | 116 (99 no exterior) | 31 (29 no exterior + 2 em MG) | 29 (todas no exterior) |
| Máquinas que geraram esses BUs no exterior | 8 (de 6 a 26 seções cada) | 1 (urna 1808076, 29 seções) | 2 (1808076: 20; 1762246: 9) |
| BU gerado por RED (país inteiro) | 134 | 50 | 16 (1 no exterior) |

- **As 29 de 2026 são postos pequenos**: 30 a 252 aptos (Katmandu, Abidjã, Díli, Teerã, Moscou...). São as mesmas nos dois turnos.
  - 23 delas também foram SA em 2022.
  - As 6 novas são Argel, Ciudad Guayana, Kiev, Paso de los Libres, Port of Spain e Trípoli.
- Em 2022 o SA cobria também cidades grandes (Lisboa, Londres, Miami, Tóquio, Atlanta). Dessas 99, 63 votaram em urna em 2026 (42.539 aptos) e 13 não existem mais.
- **A máquina única não é anomalia.** As duas urnas que geram os BUs de SA receberam carga em 18/09/2026, no mesmo lote da zona do exterior. A estação que transmite a correspondência é a mesma que gerou as mídias de urnas comuns do exterior, como Miami (`ZZZ001WKS51`). A apuração das cédulas do exterior é digitada de forma centralizada.
- **Comparecimento e voto:**
  - 1º turno: 789 de 2.053 aptos (38,4%);
  - 2º turno: 831 de 2.054 (40,5%), perto da média do exterior;
  - 0 seção acima dos aptos;
  - 2 seções com comparecimento 0: Ciudad Guayana nos dois turnos e Trípoli no 2º.
- **Hora de emissão contra o fim da votação no posto:**
  - Premissa declarada: o relógio do SA está na hora de Brasília.
  - As 17 h locais de cada posto foram convertidas para a hora de Brasília pelo fuso IANA da cidade. A conversão leva em conta o horário de verão de cada data.
  - Resultado: **0 de 60 BUs emitidos antes do fechamento**, desde que o relógio da máquina do SA esteja na hora de Brasília.
  - A menor folga é de 70 min no 1º turno e de 30 min no 2º turno (Nassau, com emissão às 18:29 e fechamento às 18:00 de Brasília).
  - **Sem essa premissa, o resultado muda** ([cetico-revisor/37](../cetico-revisor/37-h18-h21-h22.md)):
    - com o relógio 1 h adiantado, 3 BUs do 2º turno ficariam antes do fechamento;
    - em UTC, 5 do 1º turno e 9 do 2º.
  - **Âncora independente da premissa (Fato):** o horário de recebimento no TSE (`recebido_tse`), marcado pelo servidor na hora de Brasília.
    - No 2º turno, cada um dos 29 BUs foi recebido 160 min ou mais depois do fechamento do próprio posto.
    - O primeiro recebimento, às 19:25, já vem depois do fechamento de todos os postos.
    - No 1º turno o banco não tem esse horário (0 de 31 BUs de SA).
  - **Princípio 8:** a hora não confere o conteúdo. Um BU com números errados, digitado depois do fechamento, passa neste teste. O controle do conteúdo é a ata da junta (Pendente).
- **Voto no SA contra o continente:**
  - As cidades de SA dão ao 13 mais que o resto do continente: +59 votos no 1º turno e +56 no 2º, sobre cerca de 700 a 800 votos dos dois finalistas.
  - **O mesmo excesso aparece em 2018 (+19 e +44) e em 2022 (+31 e +59)**, nas mesmas cidades.
  - É o perfil dos postos pequenos: comunidade de diplomatas, funcionários e expatriados, diferente da diáspora das cidades grandes. É estável e não nasce no 2º turno.
- **Inconsistência de cadastro nos arquivos do TSE (Fato, sem efeito no voto).** No CEFT de 2026, as 29 linhas de SA trazem `NM_MUNICIPIO = BUENOS AIRES` nos dois turnos.
  - O `CD_MUNICIPIO` está certo (Katmandu, Kiev, Teerã...).
  - No CEFT de 2022, o nome está certo.
  - **Pendente:** perguntar ao TSE por quê. A hipótese é um campo preenchido pela máquina de transmissão, não pela seção.

## 5. A variação entre os turnos, por lugar (Fato)

| Continente | Aptos (2º turno) | Comparecimento 1º → 2º | Δ relativo | Δ13 | Δ22 | Eliminados no 1º turno | Parte do disponível com o 13 | Fatia do 13 (13 × 22) 1º → 2º |
|---|---|---|---|---|---|---|---|---|
| Europa | 413.089 | 39,5% → 44,4% | +12,6% | +24.901 | +10.069 | 14.111 | 71,2% | 66,1% → 67,1% |
| América do Norte | 315.367 | 31,4% → 36,1% | +14,8% | +12.070 | +10.241 | 7.559 | 54,1% | 40,9% → 43,5% |
| Ásia e Oriente Médio | 114.889 | 41,4% → 42,6% | +2,8% | +2.488 | +4.593 | 5.374 | 35,1% | 29,1% → 30,0% |
| América do Sul | 42.380 | 47,6% → 51,0% | +7,1% | +1.456 | +1.539 | 1.354 | 48,6% | 42,9% → 43,7% |
| Oceania | 23.399 | 37,4% → 44,1% | +18,1% | +1.639 | +923 | 1.023 | 64,0% | 64,5% → 64,3% |
| América Central e Caribe | 3.644 | 46,4% → 48,5% | +4,5% | +90 | +161 | 185 | 35,9% | 43,6% → 42,5% |
| África | 3.492 | 41,8% → 44,0% | +5,1% | +123 | +71 | 112 | 63,4% | 55,0% → 56,1% |
| **Exterior** | **916.260** | **37,3% → 41,6%** | **+11,6%** | **+42.767** | **+27.597** | **29.718** | **60,8%** | **52,2% → 53,9%** |

- **Balanço:**
  - o disponível é 29.718 votos dos eliminados, mais 969 de queda de brancos e nulos, mais 39.677 de comparecimento novo: 70.364 votos;
  - isso é igual a Δ13 + Δ22;
  - os dois finalistas ganharam mais do que os eliminados podiam dar: o 13, +27% sobre o 1º turno; o 22, +19%.
  - **Os dois lados mobilizaram.**
- **Concentração.** Os EUA têm 30% do comparecimento novo e Portugal 19%. Canadá, Reino Unido e Alemanha têm 5% a 7% cada.
  - 26 das 145 cidades com voto tiveram queda (as outras 41 cidades só têm seção não instalada ou de comparecimento 0).
  - A maior queda foi em Ramallah: −11%, 1.202 → 1.069; o 13 perdeu 78 votos e o 22 ficou igual, numa comunidade com 96% de 13 entre os finalistas no 1º turno.
- **Comunidades com perfil próprio, nos dois sentidos:**
  - Japão: +2,7%, comunidade com 82% de 22 no 1º turno;
  - Ciudad del Este: +16%, com 92% de 22;
  - Marselha, Oslo e Barcelona: +20% a +23%, com 75% a 87% de 13 no 1º turno.
- **Cidades em que um finalista ganhou mais que o disponível:** 21, todas com menos de 250 votos de diferença. A maior é Ramallah, onde o comparecimento caiu e o 13 perdeu 78 votos.

### Linha de base 2018 e 2022 (votos nominais, `votacao_candidato_munzona`)

| Ano | Nominais 1º → 2º | Parte do disponível com o 13 | Fatia do 13 no 2º turno | Mediana das cidades | Cidades com +20% |
|---|---|---|---|---|---|
| 2018 (13 × 17) | −4,1% | 65,5% | 29,0% | — | — |
| 2022 (13 × 22) | +1,2% | 38,1% | 51,3% | +0,5% | 0 |
| 2026 (13 × 22) | +12,3% | 60,8% | 53,9% | +11,9% | 6 |

- Entre as 59 cidades com 500 votos ou mais, o crescimento de 2026 se correlaciona com o de 2022: r = 0,52. As cidades que crescem em 2026 tendem a ser as que já cresciam um pouco em 2022 (Sydney, Nova York, Zurique, Tel Aviv).
- A fatia do 13 no 2º turno, cidade a cidade, é praticamente a de 2022: r = 0,97. As maiores mudanças foram:
  - Tel Aviv: 46,6% → 19,2%;
  - Amã: 76,5% → 90,5%;
  - Beirute: 59,1% → 68,2%;
  - cidades dos EUA: +6 a +8 p.p. para o 13.
- **Nota de fonte.** O `munzona` de 2026 tem 123 votos nominais a menos que o BU no 1º turno do exterior: os votos do número 28, assunto de [cetico-revisor/09](../cetico-revisor/09-numeros-omitidos-munzona.md). Os números de 2026 da seção 5 saem do BU.

## 6. Neutralidade: o comparecimento novo cresceu mais onde um lado era mais forte? (Fato)

- **Modelo:**
  - Universo: seções com urna nos dois turnos e 50 aptos ou mais; 1.233 seções em cidades com 2 seções ou mais.
  - Variável: Δ comparecimento (em p.p. dos aptos) contra a fatia do 13 no 1º turno, as duas centradas na média da cidade.
  - Hipótese nula: inclinação 0. Significância por 2.000 permutações da fatia dentro de cada cidade, com semente fixa.
- **Resultado:**
  - inclinação de +0,063 p.p. de comparecimento por p.p. de fatia do 13, com r = 0,25 e p = 0,0005;
  - com controle do comparecimento do 1º turno, a inclinação é +0,065, e o controle quase não pesa (−0,0095).
  - Em números: dentro da mesma cidade, uma seção 20 p.p. mais favorável ao 13 cresceu 1,3 p.p. a mais.
- **Partilha marginal do eleitor a mais (dentro da cidade):** 0,64 voto ao 13 e 0,25 ao 22. No 1º turno, a fatia no comparecimento era de 46% e 42%.
- **Seções que destoam da própria cidade** (|z robusto| ≥ 5, 49 cidades, 1.178 seções):
  - Δ comparecimento: 3 seções, todas de **queda** (Faro 0688 e 0693; Toronto 3083). Nenhuma alta.
  - Δ fatia do 13: 10 seções pelo z robusto, todas a favor do 13. Com o ruído de amostra (z binomial com n do 1º e do 2º turno), **nenhuma seção passa de |z| = 3, nos dois sentidos**.
  - As 10 são seções de comparecimento baixo onde entraram poucos eleitores: Wellington 38 → 74, Edimburgo 29 → 43.
- **Leitura.** O lado que mais cresceu em seções do exterior foi o 13, sobretudo na Europa. Mas:
  - no Brasil, a parte do disponível com o 13 foi 73,6%; no exterior, 60,8%. O exterior pendeu **menos** para o 13 que o país;
  - em 2022, o exterior deu ao 22 61,9% do disponível. A troca de lado entre eleições é a regra.
  - **Nada aqui favorece um lado mais do que a votação nacional.**

## 7. Anomalia política (esperada) × anomalia de processo (suspeita)

| Explicação | O que ela prevê | Bate? |
|---|---|---|
| **Mobilização de 2º turno, maior no exterior** (o eleitor do exterior é mais elástico: abstenção de ~60% e custo alto de ir ao consulado) | aumento largo, em quase todas as cidades, maior onde a diáspora é grande; o exterior amplia o movimento nacional; mesma geografia partidária | Sim: sobe em 113 das 145 cidades com voto; 4 vezes o Brasil em 2022 e 3 vezes em 2026; r = 0,97 com 2022 |
| **Fila e cansaço no 1º turno** (eleitor desiste) | fila depois das 17 h no 1º turno; no 2º, mais eleitores cedo | Em parte: 99 votos depois das 18 h só no 1º turno; o acréscimo do 2º turno se concentra às 8 h. Não mede quem desistiu |
| **Comunidades homogêneas** (Ramallah, Japão, Ciudad del Este, França) | queda ou alta inteira para um lado, igual em 2022 | Sim (seção 5) |
| **Postos pequenos com perfil próprio (SA)** | voto diferente do continente, estável entre anos e turnos | Sim: excesso de 13 em 2018, 2022 e 2026 |
| *Processo:* inserção em seções-alvo | seções muito acima da cidade em comparecimento e no lado favorecido | Não: 0 alta destoante; 0 seção além do ruído de amostra |
| *Processo:* votos sem eleitor no diário | BU ≠ log | Não: 0 |
| *Processo:* rajada de fim de dia (H15) | acréscimo nas últimas horas | Não: o acréscimo é de manhã |
| *Processo:* ritmo impossível | intervalo abaixo do tempo físico; pico acima da capacidade | Não: nenhum intervalo abaixo de 15 s; pico máximo de 95/h (38 s por eleitor) |
| *Processo:* comparecimento acima do cadastro / seção fantasma | comp > aptos; seção num turno só | Não: 0 e 0 |
| *Processo:* BU de cédula fabricado antes do fim da votação | emissão antes das 17 h locais | Não: 0 de 60, com a premissa de relógio em Brasília. Sem premissa, só no 2º turno: os 29 foram recebidos pelo TSE 160 min ou mais depois do fechamento |
| *Processo:* substituição de eleitores que não iriam votar, espalhada | igual à mobilização em todos os sinais acima | **Indistinguível com estes dados** (princípio 8) |

## 8. O que o teste permite e não permite afirmar

**Permite (Fato):**
- No exterior, nos dois turnos e em todas as seções, o comparecimento cabe nos aptos e no cadastro, todo voto do BU tem o eleitor no diário da urna, não há voto fora da janela e não há seção que exista num turno só.
- O ritmo do 2º turno é o do 1º com mais gente, na mesma cédula e com intervalos de mesma ordem. O acréscimo chegou de manhã.
- O SA de 2026 é menor que o de 2022 (29 seções contra 99), e cobre os mesmos postos pequenos nos dois turnos. Com o relógio do SA na hora de Brasília, nenhum BU foi emitido antes do fim da votação local. No 2º turno, sem essa premissa, todos foram recebidos pelo TSE 160 min ou mais depois do fechamento. A hora não confere o conteúdo digitado.
- O aumento do comparecimento é largo e tem a geografia política de 2022. O lado que mais ganhou no exterior ganhou menos do disponível que no Brasil.

**Não permite:**
- Dizer que todo voto do exterior é do próprio eleitor. Sem biometria, o único controle é humano.
  - O que ficou testado é que não há rastro de substituição concentrada (seção, hora ou lado).
  - Uma substituição espalhada de eleitores ausentes, proporcional ao fluxo, ficaria escondida no aumento de 39.677 eleitores.
  - O teste com "já votou" (190 → 211, igual ao aumento do comparecimento) só pega o eleitor real que aparece depois. Não pega quem não iria votar.
- Separar, em 2018 e 2022, comparecimento de queda de brancos e nulos: o `munzona` só tem votos nominais.
- Dizer, com os arquivos, quem digitou as cédulas no SA e em que relógio. A conferência do horário depende da premissa de relógio em Brasília.
- Atribuir a mobilização a uma causa (campanha, transporte, data). Isso é Hipótese sem dado no repositório.

## Pendente / Recomendações

- **Pendente (TSE):**
  - norma e motivo de as urnas do exterior não pedirem digital, nem de quem tem biometria no cadastro (222.584 eleitores);
  - fuso do relógio da máquina do SA;
  - motivo de `NM_MUNICIPIO = BUENOS AIRES` nas linhas de SA do CEFT de 2026;
  - atas das 29 seções de SA (contagem das cédulas) e das 41 não instaladas.
- **Pendente (dados):** `detalhe_votacao_munzona` de 2018 e 2022, para ter comparecimento, brancos e nulos do exterior nos anos anteriores e confirmar se 2026 é o maior aumento entre turnos da série. Depende de autorização de rede.
- **Recomendação (H15 no exterior):** o teste de "liberação em bloco pelo mesmo mesário" não se aplica, porque toda liberação é por título e ano de nascimento. O análogo é o ritmo da habilitação por mesário e por hora. Com 0 intervalo abaixo de 15 s e o acréscimo de manhã, a prioridade é baixa.
- **Recomendação (perícia):** se for para o relatório, os números completos e conferidos são os das seções 1 a 4. As afirmações sobre mobilização (seções 5 a 7) ficam como Hipótese.
