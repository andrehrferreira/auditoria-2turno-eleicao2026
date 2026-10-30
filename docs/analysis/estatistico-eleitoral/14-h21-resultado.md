# 14. H21: resultado do teste de número nulo usado como "senha" no RDV (30/10/2026)

Estatístico eleitoral. Plano registrado antes de rodar: [13-h21-plano.md](13-h21-plano.md). Os cortes do plano foram aplicados sem mudança, com uma exceção: o sinal G tinha um defeito de construção e foi corrigido e rodado de novo (seção "Sinal G"). O passo 3 (casos) é **exploratório**: foi decidido depois de ver o resultado e não muda a lista do plano. Revisado pelo cético no [parecer 37](../cetico-revisor/37-h18-h21-h22.md), que reproduziu todos os números por outro caminho; as correções desse parecer estão aplicadas aqui (30/10/2026).

## Resposta curta

- **Fato:** no 2º turno nenhum número nulo passa o teste: 0 de 98 no presidente e 0 de 483 no governador. No presidente, todos os 98 números nulos de 2 dígitos aparecem em pelo menos 307 zonas do país. Em nenhum deles as 3 zonas de maior contagem chegam a 50% das ocorrências (o máximo é 11,3%). Não existe número raro no presidente do 2º turno: com 2 dígitos, todo número nulo é digitado por milhares de pessoas no país.
- **Fato: o teste de "senha" não tem poder no presidente nem no governador.** Por construção, todos os 100 números de 2 dígitos estão numa família benigna: são número de partido ou de candidato, ou ficam a uma tecla de um deles. Mesmo que um número passasse em C, R e G, a família o tiraria da lista. O "0" do 2º turno é um Fato do teste, e não absolvição.
- **Fato:** pelo critério do plano sobram **19 candidatos a "senha"**, todos de deputado no 1º turno (7 de deputado federal e 12 de estadual). Somam **648 ocorrências** no país, das quais 333 estão na zona de maior contagem. A maior contagem numa seção é de 1 a 3. Os 19 conferem no RDV bruto.
- **Hipótese (passo exploratório):** 14 dos 19 ficam a até 2 dígitos de diferença, ou a um "dedo deslocado" no teclado da urna, de um candidato que teve 5% ou mais dos votos de deputado **na mesma zona**. Por acaso seriam esperados 2,15, ou 1,26 se a conta se restringir aos números fora das famílias, que é de onde os 19 saíram (parecer 37). Exemplo: 88588 é o 55855 com cada dígito diferente trocado por uma tecla vizinha, e o 55855 teve 59,4% dos votos de deputado estadual na zona de Itapira (SP). O padrão é de erro de digitação do candidato forte da região, não de senha.
- **Teto (Fato):** se os 19 fossem todos compra de anulação, seriam no máximo 648 votos de deputado no 1º turno. No presidente do 2º turno, 0. A margem do 2º turno é de 4.430.191 votos.
- **Alcance (Fato):** um número usado só pelo esquema aparece com 10 nulos numa zona. Um número que já tem uso de fundo no país precisa de tantos nulos a mais na zona quanto o fundo (~100 a mais para um fundo de 100 no país). Ficam invisíveis os esquemas com número de família comum (00, número de partido, vizinho do 13 ou do 22), os espalhados por muitas zonas e os que usam número com menos de 10 ocorrências no âmbito, que nunca é testado. No 1º turno, esses números pouco usados somam 167.913 nulos de deputado federal (4,0%) e 320.253 de estadual (7,3%), em 70.949 e 178.997 números diferentes.

## Como reproduzir

```bash
node --max-old-space-size=12288 scripts/auditoria/estatistico-h21-extrair.mjs   # ~60 s: uma passada por voto_rdv, dois turnos
node --max-old-space-size=8192  scripts/auditoria/estatistico-h21-analise.mjs   # ~100 s: famílias, sinais C, R, G, BH, MDE
node scripts/auditoria/estatistico-h21-casos.mjs                                 # ~1 min (exploratório): RDV bruto e número válido próximo
```

Saídas em `data/parsed/auditoria/estatistico-eleitoral/h21/`: `frequencia.csv` (cada número nulo digitado por cargo e âmbito: ocorrências, seções e zonas em cada turno, seção de maior contagem; 304.547 linhas), `zonas.jsonl` (contagem por zona dos números com 10+ ocorrências), `exposicao.json`, `testes.csv` (os 44.365 testes), `sinalizados.csv` (C ∧ R), `candidatos.csv`, `casos.csv` e `resumo.json`.

## Dados e conferências (Fato)

| Item | 1º turno | 2º turno |
|---|---|---|
| Votos nulos digitados (`tipo_voto = 'nulo'`) | 39.348.069 | 3.180.131 |
| Linhas (seção × cargo × número) | 15.276.510 | 1.640.597 |
| Fora do teste (não digitados) | `nuloPorRepeticao` 3.585.033 (senador); `nuloAposSuspensao` 135.770 | `nuloAposSuspensao` 638 |

- Os totais de nulos são iguais aos de uma contagem SQL direta na mesma cópia (`eleicao2026-20261029T105000.sqlite`).
- Números válidos: 42.034 linhas de candidatura de 2026 (36 números de partido) e 18.057.953 linhas de votação por município e zona de 2018 e 2022. Ao todo, 12.875 números distintos de candidato ou partido em 2018–2026.
- **Exclusão não prevista no plano:** os cargos de eleição suplementar de prefeito (11) e de consulta (25, 26 e 27) do dia do 2º turno ficaram fora: 42 números com 10+ ocorrências. O plano listava só os cargos 1, 3, 5, 6, 7 e 8.

## Número de testes

44.365 pares (turno, cargo, âmbito, número) com 10 ou mais ocorrências, num só BH para todos. Dentro de cada teste, o número de zonas do âmbito entra como Bonferroni (de 19 zonas no DF a 2.641 no país). Corte de Bonferroni equivalente, usado só no MDE: 2,25 × 10⁻⁷.

## Resultado por cargo e turno (Fato)

C = concentração (q < 0,01, lift ≥ 10, 10+ na zona). R = 3 zonas com 50%+ das ocorrências. G = crescimento no 2º turno na zona, com o corte corrigido (taxa do 2º turno ≥ 2 × a do 1º); entre parênteses, o corte original do plano.

| Turno, cargo | Testes | C | R | C ∧ R | G | C ∧ R (∧ G) | Em família benigna | Candidatos a senha |
|---|---|---|---|---|---|---|---|---|
| 2º, presidente | 98 | 15 | 0 | 0 | 32 (16) | 0 | — | **0** |
| 2º, governador (6 UFs) | 483 | 3 | 84 | 1 | 67 (40) | 1 | 1 | **0** |
| 1º, presidente | 87 | 7 | 0 | 0 | — | 0 | — | 0 |
| 1º, governador | 2.337 | 7 | 169 | 1 | — | 1 | 1 | 0 |
| 1º, senador | 17.630 | 679 | 1.367 | 101 | — | 101 | 101 | 0 |
| 1º, deputado federal | 11.555 | 608 | 1.405 | 273 | — | 273 | 266 | **7** |
| 1º, deputado estadual | 12.094 | 705 | 2.220 | 414 | — | 414 | 402 | **12** |
| 1º, deputado distrital | 81 | 4 | 45 | 4 | — | 4 | 4 | 0 |
| **Total** | **44.365** | 2.028 | 5.290 | 794 | | 794 | 775 | **19** |

Famílias entre os 794 sinalizados (um número pode ter mais de uma): F1 número de candidato ou partido 444; F3 erro de tecla 463; F5 prefixo de partido 539; F4 digitação incompleta 125; F6 sequência 7; F2 dígitos repetidos 1. Com o corte original do G, eram 793 sinalizados e 774 em família; a diferença é o 20 de Goiatins (abaixo).

**Cobertura das famílias (Fato, parecer 37):** no presidente e no governador, 100% dos números possíveis estão em família. Para senador e deputados, a mediana por UF vai de 38% a 46%, chegando a 81% no deputado federal de uma UF. Entre os números concentrados, 775 de 794 (98%) estão em família, bem acima dessa base: os nulos concentrados ficam em volta de candidatos reais.

- **Fato:** no presidente do 2º turno, as 15 concentrações (C) são todas de números de família benigna: números de partido ou de candidato (10, 12, 15, 20, 29, 30, 44, 45, 55, 77) e vizinhos de número válido (37, 73, 74, 78, 79). Nenhuma passa em R. Exemplo: o 45 tem 1.275 dos seus 27.359 nulos na zona de Palmas (TO), 27 vezes a taxa do resto do país, e o 45 é número de candidato a governador em TO no 1º turno.
- **Fato:** no governador do 2º turno, o único C ∧ R é o 20 em Goiatins (TO), com 36 nulos. Pelo corte original do G ele não passava (31 → 36, para 21,3 esperados); pelo corte corrigido passa (a taxa cresce 2,48 vezes, p = 0,00017). Continua fora da lista por ser número de partido (F1).
- **Fato: a explicação real de Goiatins é a eleição suplementar de prefeito no mesmo dia** (eleição 6286 no BU). Os candidatos eram o **77** (3.863 votos) e o **20** (3.446). Na zona 0032 (TO), os nulos de presidente com 77 e 20 foram de 9 e 9 no 1º turno para 186 e 124 no 2º, e os de governador com 20 e 77, de 31 e 5 para 36 e 41. É o número do candidato a prefeito digitado no campo errado. A família F1 tirou o caso da lista, mas o motivo real está no BU do prefeito.

### Sinal G: defeito e nova rodada (Fato)

- **Defeito (parecer 37).** O corte do plano, "x2 ≥ 2 × esperado" com esperado = (x1 + x2)·π e π = e2/(e1 + e2), pede que a taxa do número cresça 2(1 − π)/(1 − 2π) vezes. Com π = 0,43, típico do presidente, isso dá ~8 vezes, e não 2. Com π ≥ 0,5 é impossível, o que ocorre em 273 das 2.641 zonas no presidente e em 34 das 231 de governador.
- **Correção aplicada:** p < 0,01 no mesmo binomial condicional **e** taxa do 2º turno (x2/e2) ≥ 2 × taxa do 1º (x1/e1). O corte original fica gravado na coluna `gPlano` de `testes.csv`.
- **Nova rodada:** o G passa em 32 números no presidente (eram 16) e 67 no governador (eram 40). C ∧ G: 9 no presidente e 2 no governador. C ∧ R ∧ G: 0 no presidente e 1 no governador (o 20 de Goiatins, em família). **Os candidatos a "senha" continuam os mesmos 19, e o 2º turno continua com 0.**
- Os 11 casos C ∧ G do 2º turno, ignorando R e famílias:

| Campo | Número | Zona | 1º → 2º turno | Taxa cresce | Explicação |
|---|---|---|---|---|---|
| Presidente | 77 e 20 | Goiatins (TO) | 9 → 186 e 9 → 124 | 13,1× e 8,7× | prefeito suplementar (77 e 20) |
| Governador | 77 e 20 | Goiatins (TO) | 5 → 41 e 31 → 36 | 17,5× e 2,5× | prefeito suplementar (77 e 20) |
| Presidente | 12 e 30 | Itaguaí (RJ) | 160 → 1.484 e 0 → 205 | 5,3× e sem nulo no 1º | prefeito suplementar (eleição 6285: 12 com 58.054 votos, 30 com 14.260) |
| Presidente | 15 | Cariacica (ES) | 403 → 1.350 | 2,1× | governador do 2º turno no ES (10 × 15) |
| Presidente | 55 | Manacapuru (AM) | 0 → 1.098 | sem nulo no 1º | governador do 2º turno no AM (55 × 22) |
| Presidente | 45 | Palmas (TO) | 340 → 1.275 | 2,6× | governador do 2º turno em TO (45 × 44) |
| Presidente | 29 | Porto Alegre (RS) | 0 → 10 | sem nulo no 1º | candidato a presidente eliminado no 1º turno |
| Presidente | 73 | zona 0024 (MA, Brejo) | 38 → 81 | 4,4× | Hipótese: tecla vizinha do 13 (o 7 fica na coluna do 1; o 13 tem ~79% dos votos ali, parecer 37) |

  Dos 11, 10 são número válido de outra eleição do mesmo dia ou do 1º turno. O 11º (73, 81 nulos) é provável erro de tecla. Nenhum tem o padrão de senha (concentrado e raro).

### Os 19 candidatos a "senha" (todos do 1º turno)

| Cargo, UF | Número | No país | Na zona | Zona (município principal) | Máx. numa seção | RDV bruto | Número válido próximo com 5%+ da zona |
|---|---|---|---|---|---|---|---|
| Estadual, SP | 88588 | 83 | 39 | Itapira | 2 | confere | 55855 (59,4%), dedo deslocado |
| Estadual, SP | 66001 | 31 | 26 | Brotas | 2 | confere | não (55001 tem 2,6%) |
| Estadual, RJ | 58788 | 54 | 41 | Petrópolis | 2 | confere | 50700 (21,8%), dedo deslocado |
| Estadual, SP | 66466 | 22 | 19 | Buritama | 2 | confere | 55455 (8,4%), dedo deslocado |
| Estadual, CE | 42426 | 69 | 26 | Redenção | 3 | confere | 45456 (22,5%), dedo deslocado |
| Estadual, MG | 05578 | 18 | 14 | Lambari | 3 | confere | 55789 (32,6%), 2 dígitos |
| Estadual, GO | 66244 | 43 | 24 | Rio Verde | 2 | confere | 55244 (42,0%), dedo deslocado |
| Estadual, SP | 99599 | 24 | 14 | Pedreira | 1 | confere | não |
| Federal, AM | 8855 | 24 | 16 | Itacoatiara | 3 | confere | 5588 (37,6%), dedo deslocado |
| Federal, MA | 4154 | 31 | 14 | Urbano Santos | 2 | confere | 1544 (53,9%), 2 dígitos |
| Federal, CE | 6633 | 16 | 10 | Itapiúna | 2 | confere | não (5533 tem 4,4%) |
| Estadual, CE | 73733 | 19 | 12 | Itapipoca | 1 | confere | 13133 (46,5%), 2 dígitos |
| Federal, SC | 8855 | 59 | 14 | Lages | 2 | confere | 5588 (19,8%), dedo deslocado |
| Federal, PB | 4949 | 31 | 12 | Sousa | 2 | confere | 4040 (62,6%), 2 dígitos |
| Estadual, PI | 66500 | 13 | 10 | Altos | 2 | confere | 65000 (31,6%), 2 dígitos |
| Estadual, CE | 41370 | 19 | 10 | São Benedito | 2 | confere | 13700 (50,6%), 2 dígitos |
| Federal, CE | 4828 | 22 | 10 | Acaraú | 2 | confere | 4020 (44,3%), dedo deslocado |
| Estadual, MT | 42156 | 35 | 12 | Sinop | 2 | confere | não (15123 tem 3,2%) |
| Federal, RN | 8822 | 35 | 10 | Mossoró | 2 | confere | não (7722 tem 2,7%) |

"Dedo deslocado": cada dígito diferente foi trocado por uma tecla vizinha no teclado da urna (1 2 3 / 4 5 6 / 7 8 9 / 0). "2 dígitos": até duas trocas, inserções, remoções ou inversões. "Na zona" é a contagem na zona de menor valor-p. "Máx. numa seção" saiu do banco e foi conferido no RDV da seção com `src/exportar.js`. Em GO e SC o exportar avisa `DER: comprimento ausente` na verificação de integridade, um aviso já conhecido (H25), e o RDV é lido normalmente.

"Dedo deslocado" é uma definição larga: cada dígito diferente pode ir para qualquer tecla vizinha, em direções diferentes. 88588 contra 55855, por exemplo, troca 5 → 8 (para baixo) e 8 → 5 (para cima). Não é a mão inteira deslocada uma fileira. O controle de acaso mede exatamente essa definição.

**Controle de acaso do passo exploratório (Fato):** para cada caso, foi contada a fração de **todos** os números com o mesmo número de dígitos que ficariam tão perto de algum candidato com 5%+ dos votos da zona. Ela vai de 4,2% a 24,8%. A soma dá **2,15 casos esperados por acaso, contra 14 observados**.

O parecer 37 refez o controle de dois jeitos. No **controle condicional**, o acaso é contado só entre os números fora das famílias, que é de onde os 19 saíram; lá, os números perto de candidato são mais raros. A **sensibilidade ao limiar** varia o "candidato forte":

| Limiar de "candidato forte" | Observados | Esperado, todos os números (este doc) | Esperado, só fora das famílias (parecer 37) |
|---|---|---|---|
| 2% dos votos da zona | 18 | 4,02 | 2,47 |
| 5% (limiar usado aqui) | 14 | 2,15 | **1,26** |
| 10% | 13 | 1,21 | 0,68 |

- O 2,15 é conservador, e o resultado não depende do limiar de 5%, que foi escolhido depois de ver os dados.
- Ressalva: com 14 observados e ~1,3 esperados, cerca de 1 dos 14 pode estar perto de um candidato só por coincidência. O conjunto se explica por erro de digitação; cada caso isolado, não necessariamente.

- **Hipótese:** os 14 são erro de digitação do candidato forte da zona: dígitos trocados por tecla vizinha (5↔8, 5↔6, 3↔6), ou dois dígitos trocados. Vários trocam o prefixo 55 por 66 ou 88 (66244, 66466, 88588, 8855 em AM e em SC). Esse erro explica três traços que uma senha não explica tão bem: 1 a 3 nulos por seção, espalhados por 12 a 80 seções; ocorrências no resto do país; e a zona de maior contagem sendo justamente a base eleitoral do candidato parecido.
- **Hipótese:** com o limiar de 5% sobram 5 (66001 Brotas, 99599 Pedreira, 6633 Itapiúna, 42156 Sinop, 8822 Mossoró), que somam 141 ocorrências, 72 nas zonas de maior contagem, com 1 ou 2 por seção. Têm vizinho de tecla vizinha com menos de 5% da zona (55001, 5533, 15123, 7722). **Com o limiar de 2%, sobra 1:** 99599, em Pedreira (SP), com 24 ocorrências, 14 na zona e no máximo 1 por seção. Pode ser erro de digitação de candidato menor, material de campanha com número errado ou protesto local. Nada nos dados os separa de uma compra de anulação pequena.

### Observação exploratória: o número 67

- **Fato:** o 67 (sem candidato nem partido) foi o número nulo de presidente que mais cresceu: 3.539 no 1º turno e 15.298 no 2º, 5,8 vezes mais em proporção aos nulos de presidente. No campo de governador do 2º turno ele também cresce em número absoluto nas 6 UFs. Está espalhado: aparece em 2.140 zonas, e a de maior contagem tem 0,4% das ocorrências.
- **Hipótese:** é uma moda nacional (protesto ou brincadeira de internet), e não um esquema local. Sem acesso à rede não dá para conferir. Esse padrão é o oposto do que a H21 procura.

## Efeito mínimo detectável (Fato)

Para a zona de exposição mediana, com Bonferroni sobre os 44.365 testes, são estas as ocorrências a mais na zona para passar C ∧ R:

| Uso de fundo no âmbito | Presidente (2º turno) | Governador (2º turno) | Deputado estadual (1º) |
|---|---|---|---|
| 0 | 10 | 10 | 10 |
| 10 | 10 | 10 | 10 |
| 100 | 100 | 98 | 98 |
| 1.000 | 1.000 | 970 | 990 |
| 10.000 | 9.994 | 9.700 | 9.898 |

O que manda é o sinal R (50% nas 3 zonas maiores), e não o valor-p: o esquema precisa ter, na zona, tanto quanto o número tem no resto do âmbito. No presidente do 2º turno, o número nulo menos usado tem 335 ocorrências no país. Um esquema de 2 dígitos no presidente precisaria de mais de ~300 nulos combinados numa zona para aparecer.

## O que o resultado permite e não permite afirmar

**Permite (Fato):**
- No 2º turno, para presidente e governador, não há número nulo concentrado numa zona e quase ausente no resto do país.
- No universo completo dos dois turnos, os números que passam o critério do plano somam 648 votos de deputado no 1º turno, e 14 dos 19 têm explicação de erro de tecla com força estatística (14 contra 2,15, ou 1,26 no controle condicional).
- Os casos que mais chamam atenção no 2º turno (Goiatins e Itaguaí) são número de candidato a prefeito em eleição suplementar no mesmo dia, digitado no campo errado.

**Não permite:**
- Afirmar que não houve compra de anulação. O teste não tem poder no presidente nem no governador: todo número de 2 dígitos está em família. Também não aparece um esquema com número de família comum (00, 99, número de partido, vizinho do 13 ou do 22), espalhado por muitas zonas ou com número de menos de 10 ocorrências no âmbito (4% a 7% dos nulos de deputado ficam nessa faixa).
- Afirmar que os casos sem explicação (5 com limiar de 5%, 1 com limiar de 2%) são compra de voto. São poucos votos (141 e 24), com 1 ou 2 por seção, e o mesmo padrão sai de erro de digitação de candidato menor.
- Ligar o nulo de um cargo ao voto em outro cargo: o RDV guarda cada cargo numa lista separada e ordenada (H09).

## Pendente

- Revisão cética da nova rodada do sinal G (o parecer 37 revisou a rodada original).
- Os casos sem explicação, prioridade para 99599 (Pedreira, SP): checar material de campanha e notícias locais (exige rede ou fonte externa).
- Esquema com número de menos de 10 ocorrências: só um teste por seção, e não por zona, veria. Não foi feito.
- Número 67: checar se houve campanha pública de voto nulo com esse número (exige rede).
