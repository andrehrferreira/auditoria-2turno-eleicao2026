# 09. H24: eleitores em trânsito e atributos especiais usados para inflar seções?

Matemático forense, 30/10/2026. Hipótese H24 de [hipoteses.md](../../hipoteses.md), proposta na discussão T19 ([síntese](../modelos/T19/sintese.md)). Banco: cópia de leitura de 29/10 10:50 UTC. Dados abertos do TSE já baixados: `eleitorado_local_votacao_2026.zip` (gerado em 25/10, os dois turnos) e `perfil_eleitor_secao_2026_<UF>.zip` (cadastro de julho). Universo completo: 499.207 seções com BU em cada turno, 517.179 seções nos dados abertos (inclui as agregadas e as 41 do exterior não instaladas).

## Resposta curta

- **Fato (invariantes, 0 violação nos dois turnos).**
  - aptos = aptos da seção + aptos em trânsito, em 997.114 pares seção × eleição no 1º turno e 539.817 no 2º;
  - comparecimento ≤ aptos, nos mesmos pares;
  - eleitor que só vota para Presidente (trânsito vindo de outra UF): 0 ≤ comparecimento federal − comparecimento estadual ≤ aptos federal − aptos estadual, em 497.897 seções no 1º turno e 39.739 no 2º. Não há seção com mais eleitores "só Presidente" votando do que inscritos;
  - aptos da seção do BU ≤ eleitorado da seção nos dados abertos, em 499.207 de 499.207 seções nos dois turnos (nenhuma seção com aptos acima do cadastro);
  - o eleitorado da seção nos dados abertos é o mesmo nos dois turnos em 499.207 de 499.207;
  - aptos da eleição federal do BU = eleitorado da eleição federal nos dados abertos em 499.207 de 499.207, nos dois turnos;
  - Σ aptos no 1º turno = Σ aptos no 2º turno = 158.745.079, e o que as seções ganharam de aptos próprios (+11.039) é exatamente o que o trânsito perdeu (595.156 → 584.117).
- **Fato (um balanço que não fecha por 42).** Cada eleitor em trânsito deveria sair de uma seção (cadastro − aptos da seção) e entrar em outra (aptos em trânsito). Nas 499.207 seções, as saídas somam 595.114 e as entradas 595.156 no 1º turno; 584.075 e 584.117 no 2º. **Faltam 42 saídas nos dois turnos.** As 41 seções do exterior não instaladas explicam 3 (cadastro 426, eleitorado federal 423). Restam **39 eleitores** contados nos aptos de uma seção de destino sem saída visível de nenhuma seção de origem. **Pendente:** achar onde estão; os dados abertos são de 25/10 e o BU usa o cadastro fechado antes da carga, e uma mudança de cadastro depois da carga também explicaria a diferença. 39 em 158,7 milhões não muda nenhum resultado.
- **Fato (presença do trânsito).** Os eleitores vindos de outra UF (só Presidente) compareceram 90,68% no 1º turno (165.584 de 182.612) e 92,47% no 2º (24.727 de 26.740). A presença geral foi 78,92% e 80,78%.
- **Fato (mesmo local, com e sem trânsito).** As seções com 10 ou mais aptos em trânsito (8.817 no 1º turno, 8.611 no 2º) têm, contra as outras seções do mesmo local: comparecimento maior (+1,24 e +1,02 ponto), parcela do 13 maior (+1,57 e +1,32), brancos + nulos menores (−0,31 e −0,16) e **menos** votos liberados sem digital (−0,83 e −0,87 ponto). Todos passam da correção para 20 testes.
- **Fato (anomalia operacional: a conjunção pedida não aparece).** Nas seções com trânsito há **menos** liberação sem digital e menos rajadas, não mais (tabela abaixo). Comparecimento acima dos aptos: 0 em qualquer grupo. Das seções com trânsito cujo comparecimento passa do que 100% de presença do trânsito explicaria (4.041 no 2º turno), só 6 têm também anomalia operacional no diário, todas com 1 a 5 eleitores em trânsito.
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

| Grupo (2º turno) | Seções | Mais de 50% sem digital (50+ votos) | Rajada de 10+ sem digital | As duas | Comparecimento > aptos |
|---|---:|---:|---:|---:|---:|
| Com trânsito (qualquer) | 150.752 | 571 (0,38%) | 230 (0,15%) | 173 | 0 |
| Com 10+ em trânsito | 8.611 | 19 (0,22%) | 8 (0,09%) | 6 | 0 |
| Sem trânsito, no mesmo local de uma com trânsito | 376.897 | 1.966 (0,52%) | 743 (0,20%) | 581 | 0 |
| Locais não convencionais | 3.920 | 6 (0,15%) | 5 (0,13%) | 2 | 0 |

No 1º turno: mais de 50% sem digital em 578 das 151.208 com trânsito (0,38%), 19 das 8.817 com 10+ (0,22%) e 1.994 das 377.552 sem trânsito no mesmo local (0,53%).

**T3 com o diário.** Comparecimento acima do que 100% de presença do trânsito explica (excesso > 3 desvios): 4.538 seções com trânsito no 1º turno (3,67%) e 9.009 sem trânsito (2,77%); no 2º, 4.041 (3,28%) e 8.581 (2,64%). Com anomalia operacional junto: **10 no 1º turno e 6 no 2º**, entre as com trânsito (0,22% e 0,15% dos excessos), contra 360 e 361 entre as sem trânsito (4,0% e 4,2%, quase todas do exterior, onde todo voto sai sem digital). As 6 do 2º turno: ES 57932/0009/0090, ES 56634/0025/0326, ES 56251/0034/0935, ES 56251/0054/0337, GO 96415/0031/0123 e PE 24570/0147/0373, com 1 a 5 aptos em trânsito. O trânsito não explica o excesso nelas (é de 1 a 5 eleitores, e o excesso é de 23 a 31); o sinal é de liberação sem digital, que é o tema da H15.

**Recomendação.** Passar as 6 seções do 2º turno e as 10 do 1º para a fila da H15 (liberação sem digital em bloco), não para a H24.

## Locais não convencionais (Fato)

Nível no 2º turno contra a própria zona (3.920 seções, 656 zonas): comparecimento −0,25 ponto (p 0,0005), parcela do 13 +0,65 (p 0,0005), brancos + nulos −0,09 (p 0,0005), sem digital −0,14 (p 0,12). Variação 1º → 2º turno contra a zona: parcela do 13 −0,10 (p 0,005, não passa da correção), comparecimento −0,03 (p 0,48). Os locais especiais votam diferente da zona nos dois turnos, sem mudança entre os turnos que passe da correção e sem sinal operacional.

## O que permite e o que não permite afirmar

- **Permite (Fato):** nenhuma seção tem mais eleitores votando do que inscritos, nem mais aptos do que o cadastro; nenhuma tem mais eleitores "só Presidente" votando do que inscritos; o cadastro da seção não mudou entre os turnos; a soma dos aptos é a mesma nos dois turnos; seções com muito trânsito liberam **menos** votos sem digital que as vizinhas; o trânsito que entrou só no 2º turno não trouxe mais comparecimento.
- **Não permite:** dizer que todos os eleitores em trânsito votaram por si mesmos; dizer onde estão os 39 eleitores do balanço; separar preso, militar, servidor e deficiência visual por seção (não há esse dado público por seção); afirmar que a diferença de voto entre seções com e sem trânsito é só de perfil (é Hipótese).

## Pendente

- O balanço de 39 eleitores (entradas em trânsito sem saída visível): comparar com o cadastro usado na carga das urnas, que não é público.
- 1º turno: a contagem dos impedimentos por motivo (o catálogo nacional de mensagens só existe para o 2º turno).
- Deficiência: o total por seção do cadastro de julho foi lido (`h24-atributos.jsonl`, campo `perfil.deficiencia`), mas não entrou em teste; não há o tipo da deficiência.

## Para refazer

```
node scripts/auditoria/matematico-h24-dados.mjs        # atributos por seção dos dados abertos (locais + perfil), ~10 min
node scripts/auditoria/matematico-h24-analise.mjs      # invariantes V1–V5, T1–T5, ~10 min
node scripts/auditoria/matematico-h24-cadastro.mjs     # cadastro × aptos (C1–C3) e o balanço de 42, ~1 min
node scripts/auditoria/matematico-h24-conjuncao.mjs    # T3 + diário (conjunção), ~2 min
```

Saídas em `data/parsed/auditoria/matematico-forense/`: `h24-atributos.jsonl`, `h24-atributos-resumo.json`, `h24-resultado.json`, `h24-cadastro.json`, `h24-conjuncao.json`. O teste de permutação usa `scripts/auditoria/matematico-h23-lib.mjs`.
