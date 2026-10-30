# 14. H21: resultado do teste de número nulo usado como "senha" no RDV (30/10/2026)

Estatístico eleitoral. Plano registrado antes de rodar: [13-h21-plano.md](13-h21-plano.md). Os cortes do plano foram aplicados sem mudança. O passo 3 (casos) é **exploratório**: foi decidido depois de ver o resultado e não muda a lista do plano. **Aguarda revisão cética.**

## Resposta curta

- **Fato:** no 2º turno nenhum número nulo passa o teste: 0 de 98 no presidente e 0 de 483 no governador. No presidente, todos os 98 números nulos de 2 dígitos aparecem em pelo menos 307 zonas do país. Em nenhum deles as 3 zonas de maior contagem chegam a 50% das ocorrências (o máximo é 11,3%). Não existe número raro no presidente do 2º turno: com 2 dígitos, todo número nulo é digitado por milhares de pessoas no país.
- **Fato:** pelo critério do plano sobram **19 candidatos a "senha"**, todos de deputado no 1º turno (7 de deputado federal e 12 de estadual). Somam **648 ocorrências** no país, das quais 333 estão na zona de maior contagem. A maior contagem numa seção é de 1 a 3. Os 19 conferem no RDV bruto.
- **Hipótese (passo exploratório):** 14 dos 19 ficam a até 2 dígitos de diferença, ou a um "dedo deslocado" no teclado da urna, de um candidato que teve 5% ou mais dos votos de deputado **na mesma zona**. Por acaso seriam esperados 2,15. Exemplo: 88588 é o 55855 digitado com o dedo uma fileira abaixo, e o 55855 teve 59,4% dos votos de deputado estadual na zona de Itapira (SP). O padrão é de erro de digitação do candidato forte da região, não de senha.
- **Teto (Fato):** se os 19 fossem todos compra de anulação, seriam no máximo 648 votos de deputado no 1º turno. No presidente do 2º turno, 0. A margem do 2º turno é de 4.430.191 votos.
- **Alcance (Fato):** um número usado só pelo esquema aparece com 10 nulos numa zona. Um número que já tem uso de fundo no país precisa de tantos nulos a mais na zona quanto o fundo (~100 a mais para um fundo de 100 no país). Ficam invisíveis os esquemas com número de família comum (00, número de partido, vizinho do 13 ou do 22) e os espalhados por muitas zonas.

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

C = concentração (q < 0,01, lift ≥ 10, 10+ na zona). R = 3 zonas com 50%+ das ocorrências. G = crescimento no 2º turno na zona.

| Turno, cargo | Testes | C | R | C ∧ R | G | C ∧ R (∧ G) | Em família benigna | Candidatos a senha |
|---|---|---|---|---|---|---|---|---|
| 2º, presidente | 98 | 15 | 0 | 0 | 16 | 0 | — | **0** |
| 2º, governador (6 UFs) | 483 | 3 | 84 | 1 | 40 | 0 | — | **0** |
| 1º, presidente | 87 | 7 | 0 | 0 | — | 0 | — | 0 |
| 1º, governador | 2.337 | 7 | 169 | 1 | — | 1 | 1 | 0 |
| 1º, senador | 17.630 | 679 | 1.367 | 101 | — | 101 | 101 | 0 |
| 1º, deputado federal | 11.555 | 608 | 1.405 | 273 | — | 273 | 266 | **7** |
| 1º, deputado estadual | 12.094 | 705 | 2.220 | 414 | — | 414 | 402 | **12** |
| 1º, deputado distrital | 81 | 4 | 45 | 4 | — | 4 | 4 | 0 |
| **Total** | **44.365** | 2.028 | 5.290 | 794 | | 793 | 774 | **19** |

Famílias entre os 793 sinalizados (um número pode ter mais de uma): F1 número de candidato ou partido 443; F3 erro de tecla 462; F5 prefixo de partido 539; F4 digitação incompleta 125; F6 sequência 7; F2 dígitos repetidos 1.

- **Fato:** no presidente do 2º turno, as 15 concentrações (C) são todas de números de família benigna: números de partido ou de candidato (10, 12, 15, 20, 29, 30, 44, 45, 55, 77) e vizinhos de número válido (37, 73, 74, 78, 79). Nenhuma passa em R. Exemplo: o 45 tem 1.275 dos seus 27.359 nulos na zona de Palmas (TO), 27 vezes a taxa do resto do país, e o 45 é número de candidato a governador em TO no 1º turno.
- **Fato:** no governador do 2º turno, o único C ∧ R é o 20 em Goiatins (TO), com 36 nulos. Ele não cresce o bastante entre os turnos (31 → 36, para 21,3 esperados; o corte pede o dobro), e o 20 é número de partido.

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

**Controle de acaso do passo exploratório (Fato):** para cada caso, foi contada a fração de **todos** os números com o mesmo número de dígitos que ficariam tão perto de algum candidato com 5%+ dos votos da zona. Ela vai de 4,2% a 24,8%. A soma dá **2,15 casos esperados por acaso, contra 14 observados**.

- **Hipótese:** os 14 são erro de digitação do candidato forte da zona: dedo uma fileira acima ou abaixo (5↔8, 5↔6, 3↔6), ou dois dígitos trocados. Esse erro explica três traços que uma senha não explica tão bem: 1 a 3 nulos por seção, espalhados por 12 a 80 seções; ocorrências no resto do país; e a zona de maior contagem sendo justamente a base eleitoral do candidato parecido.
- **Hipótese:** os 5 restantes (66001 Brotas, 99599 Pedreira, 6633 Itapiúna, 42156 Sinop, 8822 Mossoró) somam 141 ocorrências, 72 nas zonas de maior contagem, com 1 ou 2 por seção. Têm vizinho de "dedo deslocado" com menos de 5% da zona (55001, 5533, 15123, 7722). Pode ser erro de digitação de candidato menor, material de campanha com número errado ou protesto local. Nada nos dados os separa de uma compra de anulação pequena.

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
- No universo completo dos dois turnos, os números que passam o critério do plano somam 648 votos de deputado no 1º turno, e 14 dos 19 têm explicação de erro de tecla com força estatística (14 contra 2,15).

**Não permite:**
- Afirmar que não houve compra de anulação. Um esquema com número de família comum (00, 99, número de partido, vizinho do 13 ou do 22) ou espalhado por muitas zonas não aparece. Um esquema de até ~300 nulos no presidente do 2º turno também se perde no fundo nacional.
- Afirmar que os 5 casos sem explicação são compra de voto. São poucos votos (141), com 1 ou 2 por seção, e o mesmo padrão sai de erro de digitação de candidato menor.
- Ligar o nulo de um cargo ao voto em outro cargo: o RDV guarda cada cargo numa lista separada e ordenada (H09).

## Pendente

- Revisão cética deste resultado e do passo exploratório (o controle de acaso usa a soma de probabilidades por caso, e o limiar de 5% foi escolhido depois de ver os dados).
- Os 5 casos sem explicação: checar material de campanha e notícias locais (exige rede ou fonte externa).
- Número 67: checar se houve campanha pública de voto nulo com esse número (exige rede).
