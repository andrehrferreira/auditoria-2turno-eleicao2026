# 04. Linha de base histórica: o balanço 1º → 2º turno de presidente em 2018, 2022 e 2026

Cientista político, 29/10/2026. Rótulos: **Fato**, **Hipótese**, **Recomendação**. O princípio 8 (doc 01) vale como antes: as explicações políticas só entram como hipótese com previsão conferida nos dados.

## Como reproduzir

```bash
node scripts/auditoria/politico-linha-de-base.mjs   # ~5 s
```

- Saída: `data/parsed/auditoria/cientista-politico/linha-de-base.json`.
- Fontes: `votacao_candidato_munzona_<ano>_BR.csv`. O de 2018 foi gerado em 13/11/2024, o de 2022 em 29/10/2026 e o de 2026 em 28/10/2026. Do `consulta_cand_2026_BR.csv` saem só número, nome de urna, partido e totalização. CPF, título e e-mail não são lidos para a saída.

## Limite dos dados (importante)

O `votacao_candidato_munzona` traz **só votos nominais**: não traz comparecimento, brancos nem nulos.

- **A parte do disponível continua exata.** Pela identidade ΔA + ΔB = disponível ([01](01-balanco-turnos.md)), a parte de cada finalista é ΔA / (ΔA + ΔB). A conta é a mesma usada em 2026.
- **A queda de comparecimento é aproximada** pela variação dos votos nominais entre os turnos. Essa variação mistura comparecimento com brancos e nulos.
  - Para separar os dois, falta o `detalhe_votacao_munzona` de 2018 e 2022 (Recomendação ao coordenador).
  - Em 2026 os dois números andam juntos: nos AC, AP e RR, o comparecimento caiu 5,7, 8,1 e 6,0 p.p., e os votos nominais caíram 7,9%, 9,3% e 6,9%.

Os finalistas de cada ano:

| Ano | A (o que mais cresceu) | B |
|---|---|---|
| 2018 | 13 (Haddad, PT) | 17 (Bolsonaro, PSL) |
| 2022 | 22 (Bolsonaro, PL) | 13 (Lula, PT) |
| 2026 | 13 (Lula, PT) | 22 (Flávio Bolsonaro, PL) |

## 1. Os 73,6% de 2026 são comuns ou raros? (Fato)

| Ano | ΔA | ΔB | Eliminados | **Parte do disponível com A** | ΔA ÷ eliminados | Votos nominais 1º → 2º | Municípios em que A / B perdeu votos | UFs em que B perdeu votos |
|---|---|---|---|---|---|---|---|---|
| 2018 | +15,70 mi | +8,52 mi | 26,43 mi | **64,8%** | 59% | **−2,1%** | 128 / 138 | nenhuma |
| 2022 | +7,13 mi | +3,09 mi | 9,90 mi | **69,8%** | 72% | **+0,3%** | 108 / **997** | AC, AM, AP, RR |
| 2026 | +10,38 mi | +3,72 mi | 9,32 mi | **73,6%** | **111%** | **+4,0%** | 89 / **950** | AC, AM, AP, RR, TO, MA |

- **A parte do disponível não é rara.** Ela está 3,8 p.p. acima de 2022 e 8,8 p.p. acima de 2018. Nos três anos, o finalista que mais cresce fica com 65% a 74%.
  - Mediana entre UFs: 65,5% em 2018, 75,7% em 2022 e 71,5% em 2026.
- **O número de municípios em que o "outro" finalista perde votos também é o normal.** São 950 em 2026 e 997 em 2022, com os lados trocados. Em 2022 o 13 perdeu votos em 4 UFs do Norte, que são 4 das 6 UFs de 2026.
- **O que é novo em 2026 é o volume, não a divisão:**
  - os votos nominais cresceram **+4,0%** entre os turnos, contra +0,3% em 2022 e −2,1% em 2018;
  - por região, o 2026 fica acima dos dois anos anteriores em todas, menos no Norte: NE +4,6% (2022: −0,3%), SE +5,0% (+1,0%), S +3,9% (+0,9%), CO +2,8% (+0,7%), exterior +12,3% (+1,2%), Norte −1,4% (−3,1%);
  - por isso **2026 é o único dos três anos em que o ganho do maior finalista passa de todos os votos dos eliminados** (111%).
- **Hipótese:** um aumento de votos nominais entre turnos tão espalhado, quatro vezes o de 2022, é mobilização no 2º turno somada a menos brancos e nulos.
  - O que já foi testado (princípio 8, [01, E2](01-balanco-turnos.md)): nas 12 UFs com o 1º turno no banco, o eleitor a mais se dividiu igual entre habilitados por biometria e sem biometria. A parcela sem biometria não mudou.
  - O que falta, e é o ponto mais forte desta linha de base para a revisão adversarial (Recomendação):
    - rodar o E2 nas UFs restantes, sobretudo Sul e Sudeste;
    - obter o `detalhe_votacao_munzona` de 2018 e 2022 para saber quanto do +4,0% é comparecimento e quanto é queda de brancos e nulos.

## 2. A queda no interior do Norte se repete? (Fato, pelos votos nominais)

| | 2018 capital / interior | 2022 capital / interior | 2026 capital / interior |
|---|---|---|---|
| AC | −5,6% / **−13,0%** | −3,8% / **−10,1%** | −3,2% / **−11,5%** |
| AP | −8,3% / **−12,5%** | −7,8% / **−12,1%** | −6,7% / **−12,7%** |
| RR | −5,8% / **−10,6%** | −3,3% / **−10,5%** | −3,5% / **−11,9%** |
| AM | −3,4% / −7,2% | −2,8% / −6,4% | −0,4% / −4,6% |

- **Sim.** A queda de 10% a 13% dos votos no interior de AC, AP e RR, de 2 a 3 vezes a da capital, aparece **nos três anos** com a mesma ordem de grandeza. Em 2026 ela fica dentro da faixa histórica.
- **Previsão da hipótese "acesso e transporte no interior amazônico, não lado político":** a queda se repete qualquer que seja o finalista que cresce.
  - Confirmado. O Norte deu a maior parte do disponível a Bolsonaro em 2022 (91,6%) e ao 13 em 2026 (97,1%).
  - O finalista que perdeu votos no Norte foi o 13 em 2022 e o 22 em 2026. É o mesmo mecanismo da abstenção diferencial de [01, E1](01-balanco-turnos.md).
- A causa concreta (transporte fluvial, estiagem de outubro, transporte de eleitores no 1º turno por candidatos locais) segue como **Hipótese** sem dado no repo.
  - O transporte de eleitores por candidatos é comportamento humano sem rastro no arquivo: fica como risco (princípio 8), não como explicação que reduz risco.

## 3. Os municípios de maior virada em 2026 já tinham virada parecida? (Fato)

Virada = variação da fatia do 13 (PT nos três anos) no confronto entre os dois finalistas, do 1º para o 2º turno, em p.p.

| Município | 2018 | 2022 | 2026 |
|---|---|---|---|
| *mediana dos municípios (p1 a p99)* | *+2,3 (−4,9 a +13,7)* | *−1,7 (−4,7 a +0,4)* | *+2,4 (−0,7 a +4,9)* |
| Campos dos Goytacazes/RJ | **+11,6** | −0,2 | +5,9 |
| São João da Barra/RJ | **+10,8** | −0,6 | +5,9 |
| São Tomé/RN | −3,6 | −0,5 | +6,1 |
| Paranhos/MS | −1,1 | −1,3 | +6,0 |
| Belo Monte/AL | −0,1 | −1,4 | **−8,8** |
| Santo Antônio de Lisboa/PI | −0,8 | **−4,5** (perto do p1 de 2022) | **−7,6** |
| Caldeirão Grande/BA | −0,8 | **−8,5** (abaixo do p1 de 2022) | −4,1 |

- **Norte Fluminense (Campos e São João da Barra):** a virada pró-13 tem precedente em **2018**, quando o 13 também crescia no 2º turno, mas não em 2022.
- **Santo Antônio de Lisboa e Caldeirão Grande:** já tinham virada **contra o 13 em 2022**. Caldeirão Grande teve em 2022 uma virada maior do que a de 2026.
  - **Hipótese:** dinâmica política local recorrente, desfavorável ao 13 no 2º turno, nesses dois municípios.
  - Previsão compatível: virada no mesmo sentido em mais de um ano e em todas as seções ([02](02-geografia.md)).
  - A seção PI 11878/0028/0099 continua destoando dentro do município, e o caso continua aberto.
- **Sem precedente nos dois anos:** Belo Monte/AL (−8,8, quando nunca tinha passado de −1,4), São Tomé/RN e Paranhos/MS.
  - São viradas do município inteiro ([02](02-geografia.md)), sem caso parecido em 2018 ou 2022.
  - A explicação local (mudança de liderança, prefeito) está **[a confirmar]**. **Recomendação:** perfil dos dois turnos nas seções de Belo Monte (horário dos votos, habilitação sem biometria) quando o 1º turno de AL estiver no perfil.
- **Correlação ponderada das viradas municipais entre anos** (Fato):
  - 2026 × 2018: **0,51** em 5.648 municípios;
  - 2026 × 2022: **0,14** em 5.657.
  - A geografia da virada de 2026 repete a de 2018, o outro ano em que o PT crescia no 2º turno vindo de trás. É o que a hipótese de geografia política sistemática prevê. Uma manipulação localizada não teria por que reproduzir o mapa de 2018.
  - Ressalva: uma correlação de 0,51 deixa bastante espaço para desvios locais. Ela não absolve casos individuais.

## Candidato 28 (pendência do [01](01-balanco-turnos.md))

- **Fato:** no `consulta_cand_2026_BR` há **duas candidaturas a presidente com o número 28 (PRTB)**:
  - uma com nome de urna "LEONARDO AVALANCHE" e totalização "NÃO ELEITO";
  - outra com nome de urna "PABLO MARÇAL" e totalização "#NULO".
- O campo de situação da candidatura vem "#NE" nas duas.
- **Hipótese:** substituição de candidato no PRTB. Isso explicaria por que o `munzona` não tem linha do 28, enquanto o `votacao_secao` e o `detalhe` têm 5.246 votos.
  - Em qual situação esses votos foram totalizados (válidos ou anulados) está **[a confirmar]**: a coluna de situação não traz a informação. Ver o leiame ou `consulta_cand_complementar`.
  - O efeito no balanço é desprezível: 0,06% dos eliminados.
