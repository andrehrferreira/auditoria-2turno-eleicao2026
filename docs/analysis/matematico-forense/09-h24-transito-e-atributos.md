# 09. H24: eleitores em trânsito e atributos especiais usados para inflar seções?

Matemático forense, 30/10/2026, revisto com as correções do [parecer cético 39](../cetico-revisor/39-h23-h24-t11.md). Hipótese H24 de [hipoteses.md](../../hipoteses.md), proposta na discussão T19 ([síntese](../modelos/T19/sintese.md)). Banco: cópia de leitura de 29/10 10:50 UTC. Dados abertos do TSE já baixados: `eleitorado_local_votacao_2026.zip` (gerado em 25/10, os dois turnos) e `perfil_eleitor_secao_2026_<UF>.zip` (cadastro de julho). Universo completo: 499.207 seções com BU em cada turno, 517.179 seções nos dados abertos (inclui as agregadas e as 41 do exterior não instaladas).

## Resposta curta

- **Fato (invariantes, 0 violação nos dois turnos).**
  - aptos = aptos da seção + aptos em trânsito, em 997.114 pares seção × eleição no 1º turno e 539.817 no 2º;
  - comparecimento ≤ aptos, nos mesmos pares;
  - eleitor que só vota para Presidente (trânsito vindo de outra UF): 0 ≤ comparecimento federal − comparecimento estadual ≤ aptos federal − aptos estadual, em 497.897 seções no 1º turno e 39.739 no 2º. Não há seção com mais eleitores "só Presidente" votando do que inscritos;
  - aptos da seção do BU ≤ eleitorado da seção nos dados abertos, em 499.207 de 499.207 seções nos dois turnos (nenhuma seção com aptos acima do cadastro);
  - o eleitorado da seção nos dados abertos é o mesmo nos dois turnos em 499.207 de 499.207;
  - aptos da eleição federal do BU = eleitorado da eleição federal nos dados abertos em 499.207 de 499.207, nos dois turnos;
  - Σ aptos no 1º turno = Σ aptos no 2º turno = 158.745.079, e o que as seções ganharam de aptos próprios (+11.039) é exatamente o que o trânsito perdeu (595.156 → 584.117).
- **Pendente, sem número (balanço do trânsito).** Comparando o eleitorado da seção dos dados abertos com os aptos da seção do BU, a soma das "saídas" fica 42 abaixo da soma dos aptos em trânsito, igual nos dois turnos; as 41 seções do exterior não instaladas explicam 3. A conta supõe que o eleitorado da seção dos dados abertos (uma foto só, gerada em 25/10) seja o cadastro usado na carga das urnas, e isso não está comprovado. Por isso a diferença não vira número de eleitores: fica pendente até haver o cadastro da carga.
- **Fato (presença do trânsito).** Os eleitores vindos de outra UF (só Presidente) compareceram 90,68% no 1º turno (165.584 de 182.612) e 92,47% no 2º (24.727 de 26.740). A presença geral foi 78,92% e 80,78%.
- **Fato (mesmo local, com e sem trânsito).** As seções com 10 ou mais aptos em trânsito (8.817 no 1º turno, 8.611 no 2º) têm, contra as outras seções do mesmo local: comparecimento maior (+1,24 e +1,02 ponto), parcela do 13 maior (+1,57 e +1,32), brancos + nulos menores (−0,31 e −0,16) e **menos** votos liberados sem digital (−0,83 e −0,87 ponto). Todos passam da correção para 20 testes.
- **Fato (anomalia operacional: a conjunção pedida não aparece).** Quanto mais trânsito, **menos** liberação sem digital: no 2º turno, mais de 50% dos votos sem digital em 0,60% das seções sem trânsito (do mesmo local de uma seção com trânsito), 0,39% das com 1 a 9 em trânsito e 0,22% das com 10 ou mais (tabela abaixo). Comparecimento acima dos aptos: 0 em qualquer grupo. Das seções com trânsito cujo comparecimento passa do que 100% de presença do trânsito explicaria, 10 no 1º turno e 6 no 2º têm também mais de 50% sem digital ou rajada no diário. Em 14 dessas 16, o próprio cadastro biométrico da seção explica a liberação sem digital. Sobram 2, ambas do 1º turno: AL 28819/0045/0174 e PR 79294/0019/0055.
- **Fato (1º × 2º turno).** 71 seções ganharam 10 ou mais aptos em trânsito no 2º turno. A variação do comparecimento é igual à da zona (+0,10 ponto, p = 0,68); a da parcela do 13 é −0,46 ponto (p = 0,047, não passa da correção). O trânsito novo não veio junto com mais comparecimento nem com mais 13.
- **Fato (impedimentos registrados pela urna, 2º turno, todos os diários).** A urna barrou na seção de origem 459 tentativas de presos provisórios (289 seções), 516 de militares em serviço (335), 81 de servidores da Justiça Eleitoral (67), 125 de eleitores que pediram acessibilidade em outra seção (61) e 3.551 de eleitores que pediram voto em trânsito (2.362). É controle técnico com rastro: quem foi transferido não vota na origem.
- **Hipótese.** A diferença de voto entre seções com e sem trânsito no mesmo local é de perfil: quem pede trânsito (trabalhadores deslocados, estudantes, militares, presos, mesários de outra seção) vota diferente do vizinho e comparece mais, porque pediu para votar ali. Diferença de voto sem anomalia operacional não é indício pela regra declarada.
- **O que não se pode afirmar.** Que todo eleitor em trânsito existe e votou por si: o BU e o diário não dizem quem votou. A biometria reduz o risco (nas seções com trânsito a liberação sem digital é menor), mas cada liberação sem digital continua sendo ato do mesário (princípio 8). Os atributos especiais (preso, militar, servidor da JE, deficiência visual) não estão por seção nos arquivos públicos, salvo o tipo de local (presídio) e o total de eleitores com deficiência do cadastro de julho, sem separar o tipo.

## Regra declarada antes de olhar os votos

| Teste | Marca | Comparação | Anomalia operacional exigida |
|---|---|---|---|
| T1 mesmo local | 10+ aptos em trânsito no turno | nível no turno, contra as demais seções do mesmo local (permutação no local, 2.000 sorteios) | parte do comparecimento sem digital (BU) maior que a das vizinhas |
| T2 1º × 2º turno | ganhou 10+ aptos em trânsito do 1º para o 2º turno | variação contra a zona | variação do sem digital maior que a da zona |
| T3 excesso | qualquer trânsito | comparecimento − aptos da seção × taxa das seções sem trânsito do mesmo local − aptos em trânsito > 3 desvios binomiais | — |
| T3 + diário | as do T3 | — | mais de 50% sem digital (com 50+ votos) ou rajada de 10+ liberações sem digital em 10 min |
| T4 frequência | com trânsito, com 10+, sem trânsito no mesmo local, locais não convencionais | frequência de cada anomalia | as do T3 + comparecimento > aptos |

O limiar de 10 aptos em trânsito foi escolhido antes dos testes de voto: 85.429 das 150.752 seções com trânsito no 2º turno têm 1 só, e 29.398 têm 2 (em geral mesários e servidores convocados para outra seção). Correção de Bonferroni para os 20 testes de permutação: p < 0,0025.

## Atributos por seção (Fato)

| | 1º turno | 2º turno |
|---|---:|---:|
| Seções com algum apto em trânsito | 151.208 | 150.752 |
| Aptos em trânsito | 595.156 | 584.117 |
| Seções com 10+ em trânsito | 8.817 | 8.611 |
| Seções que ganharam trânsito no 2º turno | — | 3.395 (71 com +10 ou mais) |
| Seções que perderam trânsito no 2º turno | — | 7.512 |

Tipo de local (dados abertos):

| Tipo de local | Seções (2º turno) | Com trânsito | Aptos em trânsito (1º / 2º turno) |
|---|---:|---:|---:|
| Convencional | 495.287 | 149.249 | 529.573 / 520.033 |
| Temporário | 3.525 | 1.109 | 2.428 / 2.537 |
| Voto em trânsito | 152 | 151 | 48.196 / 46.811 |
| Preso provisório | 243 | 243 | 14.959 / 14.736 |

247 seções mudaram de tipo de local entre os turnos nos dados abertos (os locais "Temporário" passaram de 3.358 para 3.525 seções). Nenhuma seção mudou de local de votação, exceto 2 de MG (41238/0039/0168 e 50075/0047/0041) cujo "local" do 1º turno no banco é 1: são as 2 seções que votaram em parte em cédula no 1º turno (fora do universo dos testes do tópico 11).

## Mesmo local com e sem trânsito (Fato)

Efeito = seções com 10+ em trânsito menos as demais do mesmo local, em pontos percentuais.

| Medida | 1º turno (7.627 seções, 5.251 locais) | 2º turno (7.411, 5.113) |
|---|---|---|
| Comparecimento | +1,24 (p 0,0005; acaso ±0,11) | +1,02 (p 0,0005; acaso ±0,10) |
| Parcela do 13 | +1,57 (p 0,0005; acaso ±0,13) | +1,32 (p 0,0005; acaso ±0,12) |
| Brancos + nulos | −0,31 (p 0,0005) | −0,16 (p 0,0005) |
| Sem digital (do comparecimento) | **−0,83** (p 0,0005) | **−0,87** (p 0,0005) |

O comparecimento maior é em parte mecânico: o trânsito comparece 90% a 92%, e cada eleitor em trânsito puxa a taxa da seção para cima. A parcela do 13 maior aparece nos dois turnos com o mesmo sinal e tamanho parecido; por isso não é efeito do 2º turno. O sinal operacional vai no sentido contrário ao de inflar: há menos voto liberado sem digital.

## Anomalia operacional por grupo (Fato)

Grupos disjuntos. **Correção (parecer cético 39):** na primeira versão, o grupo "sem trânsito, no mesmo local" incluía por engano as 142.141 seções com 1 a 9 em trânsito (erro de `else` no script). Corrigido; a conclusão fica mais forte.

| Grupo (2º turno) | Seções | Mais de 50% sem digital (50+ votos) | Rajada de 10+ sem digital | As duas | Comparecimento > aptos |
|---|---:|---:|---:|---:|---:|
| Sem trânsito, no mesmo local de uma com trânsito | 234.756 | 1.414 (0,60%) | 521 (0,22%) | 414 | 0 |
| Com 1 a 9 em trânsito | 142.141 | 552 (0,39%) | 222 (0,16%) | 167 | 0 |
| Com 10+ em trânsito | 8.611 | 19 (0,22%) | 8 (0,09%) | 6 | 0 |
| Locais não convencionais | 3.920 | 6 (0,15%) | 5 (0,13%) | 2 | 0 |

No 1º turno, mais de 50% sem digital: 1.435 das 235.161 sem trânsito (0,61%), 559 das 142.391 com 1 a 9 (0,39%) e 19 das 8.817 com 10+ (0,22%).

**T3 com o diário.** Comparecimento acima do que 100% de presença do trânsito explica (excesso > 3 desvios): 4.538 seções com trânsito no 1º turno (3,67%) e 9.009 sem trânsito (2,77%); no 2º, 4.041 (3,28%) e 8.581 (2,64%). Com anomalia operacional junto: **10 no 1º turno e 6 no 2º**, entre as com trânsito, contra 360 e 361 entre as sem trânsito (quase todas do exterior, onde todo voto sai sem digital). No 2º turno as 6 têm de 1 a 5 aptos em trânsito; no 1º turno, 9 têm de 1 a 5 e a ES 56634/0025/0254 tem **26**.

**Conferência com o cadastro biométrico (correção do parecer cético 39).** "Mais de 50% sem digital" não leva em conta quantos eleitores da seção têm digital cadastrada. Comparei cada uma das 16 com o cadastro de julho (dados abertos, perfil do eleitorado). Liberação sem digital "explicada pelo cadastro" = 100% − % de eleitores com digital; supõe que quem tem e quem não tem digital comparecem igual (conta de conferência):

| Seção | Turno | Em trânsito | Com digital no cadastro | Sem digital no diário | Explicada pelo cadastro |
|---|---|---:|---:|---:|---:|
| ES 57932/0009/0090 | 1º e 2º | 1 | 28,3% | 66,9% e 66,8% | 71,7% |
| ES 56634/0025/0326 | 2º | 1 | 35,2% | 51,3% | 64,8% |
| ES 56251/0034/0935 | 2º | 1 | 40,2% | 51,9% | 59,8% |
| ES 56251/0054/0337 | 1º e 2º | 1 | 40,9% | 55,6% e 53,3% | 59,1% |
| GO 96415/0031/0123 | 1º e 2º | 5 | 27,7% | 58,8% e 61,5% | 72,3% |
| PE 24570/0147/0373 (marcada pela rajada) | 2º | 1 | 56,6% | 38,8% | 43,4% |
| ES 56634/0025/0254 | 1º | 26 | 29,8% | 58,3% | 70,2% |
| ES 56111/0020/0140 | 1º | 1 | 42,0% | 51,8% | 58,0% |
| ES 56146/0010/0094 | 1º | 1 | 33,3% | 56,6% | 66,7% |
| ES 56251/0034/0480 | 1º | 1 | 37,6% | 57,6% | 62,4% |
| ES 56251/0054/0299 | 1º | 2 | 37,7% | 59,0% | 62,3% |
| **AL 28819/0045/0174** | 1º | 1 | **100%** | **52,5%** | 0% |
| **PR 79294/0019/0055** | 1º | 1 | **100%** | **98,2%** | 0% |

- **Fato.** Em 14 das 16 (contando as que aparecem nos dois turnos uma vez por turno), a liberação sem digital fica abaixo da que o cadastro já explica: são seções com pouca biometria cadastrada. A rajada de 10 liberações sem digital também é esperada quando dois terços dos eleitores não têm digital. Essas 14 **não** são sinal da H15.
- **Fato.** AL 28819/0045/0174 e PR 79294/0019/0055 (1º turno) têm todos os eleitores com digital no cadastro e mesmo assim liberaram 52,5% e 98,2% dos votos sem digital.

**Recomendação.** Passar só AL 28819/0045/0174 e PR 79294/0019/0055 para a fila da H15 (liberação sem digital) e da H07 (leitor biométrico). As outras 14 saem da fila.

## Locais não convencionais (Fato)

Nível no 2º turno contra a própria zona (3.920 seções, 656 zonas): comparecimento −0,25 ponto (p 0,0005), parcela do 13 +0,65 (p 0,0005), brancos + nulos −0,09 (p 0,0005), sem digital −0,14 (p 0,12). Variação 1º → 2º turno contra a zona: parcela do 13 −0,10 (p 0,005, não passa da correção), comparecimento −0,03 (p 0,48). Os locais especiais votam diferente da zona nos dois turnos, sem mudança entre os turnos que passe da correção e sem sinal operacional.

## O que permite e o que não permite afirmar

- **Permite (Fato):** nenhuma seção tem mais eleitores votando do que inscritos, nem mais aptos da seção do que o eleitorado da seção nos dados abertos; nenhuma tem mais eleitores "só Presidente" votando do que inscritos; o eleitorado da seção nos dados abertos é o mesmo nos dois turnos; a soma dos aptos é a mesma nos dois turnos; quanto mais trânsito, **menos** votos liberados sem digital; o trânsito que entrou só no 2º turno não trouxe mais comparecimento.
- **Não permite:** dizer que todos os eleitores em trânsito votaram por si mesmos; dar número ao balanço do trânsito (depende do cadastro usado na carga); separar preso, militar, servidor e deficiência visual por seção (não há esse dado público por seção); afirmar que a diferença de voto entre seções com e sem trânsito é só de perfil (é Hipótese).

## Pendente

- O balanço do trânsito (entradas em trânsito sem saída visível no eleitorado dos dados abertos): comparar com o cadastro usado na carga das urnas, que não é público. Sem número até lá.
- 1º turno: a contagem dos impedimentos por motivo (o catálogo nacional de mensagens só existe para o 2º turno).
- Deficiência: o total por seção do cadastro de julho foi lido (`h24-atributos.jsonl`, campo `perfil.deficiencia`), mas não entrou em teste; não há o tipo da deficiência.

## Para refazer

```
node scripts/auditoria/matematico-h24-dados.mjs        # atributos por seção dos dados abertos (locais + perfil), ~10 min
node scripts/auditoria/matematico-h24-analise.mjs      # invariantes V1–V5, T1–T5, ~10 min
node scripts/auditoria/matematico-h24-cadastro.mjs     # cadastro × aptos (C1–C3) e o balanço do trânsito, ~1 min
node scripts/auditoria/matematico-h24-conjuncao.mjs    # T3 + diário (conjunção) com o cadastro biométrico, ~2 min
```

Saídas em `data/parsed/auditoria/matematico-forense/`: `h24-atributos.jsonl`, `h24-atributos-resumo.json`, `h24-resultado.json`, `h24-cadastro.json`, `h24-conjuncao.json`. O teste de permutação usa `scripts/auditoria/matematico-h23-lib.mjs`.
