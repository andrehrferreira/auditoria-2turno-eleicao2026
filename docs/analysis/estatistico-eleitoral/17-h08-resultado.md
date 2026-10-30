# 17. H08: resultado do ciclo completo de cada eleitor (dois turnos, universo completo)

Estatístico eleitoral, **30/10/2026**. Plano registrado antes de rodar: [15](15-h08-plano.md). O que não estava no plano está marcado **exploratório**.

## Resposta curta

- **Fato:** nos dois turnos, **nenhum** ciclo de eleitor abaixo do limite físico (C1 e C2 confirmados). O menor intervalo entre dois votos seguidos da mesma urna é **16 s no 2º turno** (3 ciclos) e **19 s no 1º turno** (2 ciclos, eleitores do exterior que votam só para presidente). Com 6 cargos (1º turno), o mínimo é **31 s**.
- **Fato:** as 3 seções do 2º turno com erro de leitura no perfil (BA 39870/0133/0184, ES 57932/0009/0085, MG 40690/0016/0264) têm, na leitura própria por fluxo de urna, mínimo de **25, 36 e 29 s** e votos **iguais ao BU** (228, 308 e 114). O "fora 3 seções" pode sair do texto (C4 confirmado).
- **Fato (C3 rejeitado como declarado):** o teste binomial por seção acha 2.604 seções com excesso de ciclos curtos no 2º turno contra 478 no 1º. **Exploratório:** com sobredispersão entre seções (beta-binomial), sobram **0** no 2º turno e **1** no 1º; e 97,5% dos ciclos curtos dessas seções são de eleitor liberado **pela própria digital**, concentrados das 8 h às 10 h. É ritmo de seção rápida e fila da manhã, não sequência impossível.
- **Limite (princípio 8):** o teste não vê voto inserido em ritmo humano (20 s ou mais por ciclo). O ritmo não diz quem digitou.

## Comandos

```bash
node scripts/auditoria/estatistico-h08-varredura.mjs --turno 2 --paralelo 3   # 31 min, 139 partes
node scripts/auditoria/estatistico-h08-varredura.mjs --turno 1 --paralelo 3   # 38 min, 139 partes
node --max-old-space-size=14000 scripts/auditoria/estatistico-h08-analise.mjs # limites, sequências, seções, BU
node scripts/auditoria/estatistico-h08-curtos.mjs                             # exploratório: via e hora dos ciclos curtos
```

Saídas em `data/parsed/auditoria/estatistico/h08/`: `resultado.json`, `secoes-bonferroni.csv` (3.082 seções), `secoes-excesso.csv` (200 mais extremas), `sequencias-le.csv` (330 sequências), `divergencias-bu.csv`, `curtos.json`, e por parte `<uf>-<p>.{secoes.jsonl,seq.bin,hist.json}`.

## Cobertura (Fato)

| | 1º turno | 2º turno |
|---|---|---|
| Seções lidas (todas as do disco, 28 UFs) | 499.248, 0 erro | 499.248, 0 erro |
| Votos computados nos diários | 125.274.062 | 128.235.189 |
| Seções com votos e vias iguais ao BU | 499.234 | 499.242 |
| Seções com diário **menor** que o BU | 14 (425 votos) | 6 (54 votos) |
| Seções com diário maior que o BU | 0 | 0 |
| Linhas duplicadas dentro do fluxo | 0 | 0 |
| Linhas de outra seção (urna RED que recuperou outra seção antes) | 251.233 | 190.011 |
| Linhas de cópias MI/ME fora da cópia escolhida | 7.663 | 877 |
| Ciclos D (dois votos seguidos da mesma urna) | 124.772.753 | 127.734.569 |
| D negativo (relógio voltou) | 0 | 0 |
| Voto computado sem habilitação no ciclo | 2 | 0 |

- As 6 seções do 2º turno com diário menor que o BU são as mesmas da [linha-do-tempo/03](../linha-do-tempo/03-intervalos-minimos.md) (BA 34711/0021/0178 −1, BA 35653/0173/0235 −13, MA 08893/0047/0609 −36, PB 21750/0002/0254 −1, PI 11533/0003/0216 −1, RS 89060/0017/0191 −2). As 14 do 1º turno estão em `divergencias-bu.csv`. Diário a menos não gera ciclo curto; só tira ciclos da medida.
- **Os 2 votos "sem ciclo" do 1º turno** estão em RJ 60011/0008/0061, urna 01760983 (311 votos, igual ao BU). Conferido no diário bruto: são linhas **corrompidas**, não voto sem eleitor. Às 08:31:25 a linha diz `Eleitor foi ha\`ilitado` com hash `ED990EE@84DE5A4A` (um bit trocado em "b" e em "0") e faltam as 6 linhas `Voto confirmado`; às 09:32:45 aparece `Biometria cmletada lãm é do mesário`, também com bits trocados, e a hora volta 2 s. **Hipótese:** erro de memória ou de armazenamento nessa urna. **Pendente** (engenharia de segurança): conferir o encadeamento de hash desse diário.
- As vias de liberação lidas assim batem com o BU (digital = "por biometria", ano de nascimento = "sem biometria cadastrada", dado pessoal = "por biografia") em todas as seções, menos as 6 e 14 acima. O `perfil_log` da cópia de 29/10 ainda tem as 3 seções com log duplicado (413, 612 e 160 votos): foi gerado antes da correção de 29/10 08:45.

## Distribuição do ciclo (Fato)

Segundos inteiros (relógio da urna, resolução de 1 s). k = cargos confirmados no ciclo do eleitor. D = de um voto computado ao seguinte, na mesma urna (inclui o mesário digitar o próximo identificador). A = identificador → habilitação. B = habilitação → voto. C = identificador → voto.

### D (ciclo completo entre dois eleitores)

| Turno | k | Ciclos | Mínimo (casos) | P0,1% | P1% | P5% | Mediana | P99% |
|---|---|---|---|---|---|---|---|---|
| 2º | 1 (presidente) | 117.477.781 | 16 (3) | 25 | 29 | 34 | 70 | 733 |
| 2º | 2 (presidente e governador ou consulta) | 10.249.120 | 22 (4) | 29 | 33 | 38 | 73 | 729 |
| 2º | 3 | 7.668 | 35 (1) | 37 | 42 | 49 | 87 | 871 |
| 1º | 6 | 124.226.571 | 31 (5) | 49 | 56 | 63 | 101 | 542 |
| 1º | 1 (só presidente: trânsito e exterior) | 515.324 | 19 (2) | 26 | 30 | 36 | 71 | 731 |
| 1º | 2 a 5 e 7 | 30.858 | 52 a 130 | — | — | — | 117 a 378 | — |

No 2º turno, k = 2 e 3 incluem as consultas locais do mesmo dia (prefeito suplementar, desmembramentos), que aparecem como "cargo" no diário.

### A, B e C

| Turno | k | A mín / P0,1% / mediana | B mín (casos) / P0,1% / mediana | C mín / P0,1% / mediana |
|---|---|---|---|---|
| 2º | 1 | 2 / 6 / 15 | 2 (2.702) / 3 / 10 | 8 / 13 / 26 |
| 2º | 2 | 3 / 6 / 15 | 4 (2) / 7 / 16 | 12 / 17 / 33 |
| 1º | 6 | 3 / 7 / 15 | 11 (6) / 24 / 55 | 20 / 35 / 74 |

Por cargo (habilitação ou confirmação anterior → confirmação), o mínimo é 1 s em todos os cargos, com uma exceção: 1 caso de 0 s entre os dois votos de senador no 1º turno, entre 249.484.999 confirmações de senador. Dois toques em menos de 1 s (BRANCO e CONFIRMA) é possível para uma pessoa.

## Limites e testes

### LF (limite físico, a priori): C1 e C2 confirmados

- **LF-1** (D ≤ 1 s): **0** no 1º turno, **0** no 2º.
- **LF-n** (n ≥ 2 ciclos seguidos com soma S + 1 ≤ Σ M(k), M(k) = 1,6 + 0,2·k s): **0** e **0**. A busca usou a janela de maior déficit em cada fluxo, então nenhuma janela de qualquer tamanho passou.
- **Fato:** o menor D do país (16 s) foi conferido no bruto em ZZ 30562/0001/1952 (urna 01836310): identificador 13:44:28, ano de nascimento 13:44:30, habilitado 13:44:31, presidente confirmado 13:44:36, computado 13:44:37; o voto anterior foi computado às 13:44:21. Os outros dois (PE 24570/0147/0393 e RS 88390/0162/0403) já tinham sido conferidos pelo Auditor C.

### LE (limite estatístico, 0,1% da distribuição nacional)

| Turno | k | LE (s) | Fração ≤ LE | Ciclos ≤ LE |
|---|---|---|---|---|
| 2º | 1 | 24 | 0,081% | 94.973 |
| 2º | 2 | 28 | 0,073% | 7.528 |
| 2º | 3 (turno inteiro) | 24 | 0,074% | — |
| 1º | 6 | 48 | 0,093% | 115.294 |
| 1º | 1 | 25 | 0,085% | 439 |
| 1º | outros (turno inteiro) | 45 | 0,094% | — |

**Sequências de 3 ou mais ciclos seguidos ≤ LE:**

| Turno | Observadas (≥ 3) | Esperadas se independentes | ≥ 5 | Maior |
|---|---|---|---|---|
| 2º | 300 | 0,07 | 9 | 5 |
| 1º | 30 | 0,10 | 0 | 4 |

O observado passa do esperado sob independência: ciclos curtos vêm juntos (fila, mesa rápida). Não é limite físico: a maior sequência tem 5 ciclos de 19 a 24 s. **Fato (conferido no bruto):** BA 35157/0156/0236, 10:10:36 a 10:12:18, 5 ciclos de 19 a 22 s, todos com identificador digitado, `Tipo de habilitação do eleitor [biométrica]`, confirmação e computado.

### Teste por seção (excesso de ciclos ≤ LE)

**998.354 testes** (499.176 seções no 1º turno e 499.178 no 2º, as que têm ao menos um ciclo D). Bonferroni: α = 5,0 × 10⁻⁸.

| | 1º turno | 2º turno |
|---|---|---|
| Binomial, Bonferroni | 478 (0,096%) | 2.604 (0,52%) |
| Binomial, BH 5% | 4.119 | 7.186 |
| **C3** (2º > 1º?) | z = 38,4: **rejeitado como declarado** | |
| Beta-binomial, Bonferroni (**exploratório**) | **1** | **0** |
| Sobredispersão estimada ρ | 0,0040 | 0,0154 |
| Mediana do D típico (mediana das medianas por seção) | 102 s (todas) / 80 s (as 478) | 71 s (todas) / 55 s (as 2.604) |

**Leitura (Hipótese, com o que a sustenta).** O teste binomial supõe que toda seção tem a mesma chance de ciclo curto. Não tem: há mesas e urnas mais rápidas. As 2.604 seções do 2º turno são seções **inteiras** mais rápidas (mediana de 55 s contra 71 s), não seções normais com uma rajada. A heterogeneidade entre seções é quase 4 vezes maior no 2º turno (ρ 0,0154 contra 0,0040) porque, com 1 cargo, o ciclo é dominado pelo tempo da mesa (digitar o título, ler a digital), que é próprio de cada seção; com 6 cargos, pesa o tempo de cada eleitor, que varia entre pessoas. Com a sobredispersão no modelo, nenhuma seção do 2º turno passa por Bonferroni.

**Exploratório (`estatistico-h08-curtos.mjs`), nas 3.082 seções sinalizadas pelo binomial:**

| | 1º turno | 2º turno |
|---|---|---|
| Ciclos curtos (≤ LE) | 4.049 | 27.655 |
| … pela digital do próprio eleitor | 3.891 (96,1%) | 26.968 (97,5%) |
| Todos os ciclos dessas seções pela digital | 89,0% | 89,2% |
| Ciclos curtos das 8 h às 10 h59 (hora local) | 26,6% | 73,3% |
| Todos os ciclos das 8 h às 10 h59 | 33,1% | 49,7% |

Mesário não consegue liberar um ausente pela digital do ausente. Os ciclos curtos são **mais** biométricos que a média da própria seção e se concentram na fila da manhã. Em 28 seções do 2º turno (13 do exterior, onde todo voto é pelo ano de nascimento, e 15 do Brasil: 10 em PE (8 no município 24570), 4 na BA (3 no município 38490) e 1 em SE, com 30% a 49% de eleitores pelo ano de nascimento) a maioria dos ciclos curtos é sem digital; nenhuma passa no beta-binomial. A lista está em `curtos.json`.

**A seção que passa no beta-binomial (1º turno):** AM 02755/0022/0097 (350 ciclos, 27 curtos, p ≈ 10⁻⁸ com sobredispersão). Conferida no bruto: fila contínua de 16:55 às 17:22 (hora da urna), um eleitor a cada 40 a 50 s, cada um com digital reconhecida, habilitação e voto de 6 cargos em cerca de 20 s. A pergunta sobre votação depois da hora de encerramento nessa seção é de fuso e horário, e fica com a [linha do tempo](../linha-do-tempo/02-votos-apos-17h.md); não é sequência impossível.

## O que isto permite e o que não permite afirmar

**Permite (Fato):**
- não há, em nenhuma das 499.248 seções e em nenhum dos dois turnos, voto em sequência abaixo do mínimo mecânico, nem voto computado sem ciclo de eleitor (os 2 do 1º turno são linhas corrompidas de uma urna, com o voto contado igual ao BU);
- o menor ciclo completo do país é 16 s (2º turno, 1 cargo) e 31 s com 6 cargos;
- as 3 seções com erro de leitura no perfil têm mínimo de 25 a 36 s e votos iguais ao BU: o "fora 3 seções" deixa de ser necessário.

**Não permite:**
- dizer que nenhum voto foi inserido: inserção em ritmo humano (≥ 16 s por ciclo, com ano de nascimento ou liberação manual) passa por eleitor normal;
- usar o excesso binomial de seções rápidas como sinal: ele desaparece quando se admite que seções têm ritmos diferentes;
- comparar com 2022 ou 2024: não há diário dessas eleições no repositório.

## Pendências

- Diário corrompido em RJ 60011/0008/0061 (1º turno): verificar o encadeamento de hash e se há outras urnas com linhas fora do formato (aqui só se contou o caso que gerou "voto sem ciclo").
- Linha de base histórica: diários de 2022 e 2024 (precisa de coleta, fora da regra "sem rede").
