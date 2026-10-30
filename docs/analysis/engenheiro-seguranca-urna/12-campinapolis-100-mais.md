# 12. Campinápolis (MT): os eleitores de 100 anos ou mais e os diários das urnas

Hipótese H01 (títulos de falecidos). Pedido do parecer 44 do revisor cético (`docs/analysis/cetico-revisor/44-aptos-100-2018-2022.md`, item 4): Campinápolis tem 224 aptos de 100+, 192 deles sem biometria. No 1º turno de 2026, 32 desses eleitores votaram (14,3%), contra 0,72% no país.

## Resposta curta

- **Fato:** dos 32 votantes de 100+, **20 se declararam indígenas Xavante**. Os 30 aptos de 100+ que se declaram Xavante têm **todos** digital no cadastro, e 20 deles votaram (66,7%). Os outros **12** votantes vêm dos 192 aptos de 100+ com raça/cor "não informada", todos sem biometria (6,25%).
- **Fato:** os diários das 38 urnas de Campinápolis, nos dois turnos, não mostram rastro de liberação em massa:
  - a parte dos votos sem digital fica entre 14% e 18% em todas as horas do dia;
  - a maior rajada é de 5 a 6 liberações sem digital em 10 minutos, perto das seções vizinhas da mesma zona (4 a 5);
  - o mesmo mesário liberou no máximo 3 eleitores seguidos, igual às seções vizinhas;
  - os números do 1º e do 2º turno quase não mudam (liberações pelo ano de nascimento: 747 e 785).
- **Fato (Censo 2022, IBGE):** o próprio Censo registra uma população de 100+ fora do comum em Campinápolis:
  - são **42 moradores** de 100 anos ou mais, ou 27,4 por 10 mil habitantes (no Brasil, 1,9 por 10 mil);
  - a faixa de 100+ é maior que a de 95 a 99 anos (42 contra 37). A razão entre as duas é 1,14, contra 0,23 no Brasil e 0,34 em MT.

  É o desenho típico de idade exagerada no documento. Só 2 dos 42 tiveram a idade "presumida" no Censo; os outros 40 deram data de nascimento, que vem do documento.
- **Explicação mais provável (Hipótese):**
  - os títulos de 100+ de Campinápolis estão, em boa parte, em aldeias Xavante. Lá, a data de nascimento do documento costuma ser estimada e sai mais velha do que a pessoa é;
  - o grupo com biometria é de idosos Xavante vivos, que votam muito;
  - o grupo sem biometria mistura idosos vivos (idade também exagerada) e títulos de quem morreu ou se mudou sem baixa. Óbito sem registro em cartório é comum em área indígena.
- **O que fica em aberto (pelo princípio 8):** os 12 votos de 100+ sem biometria foram liberados pelo ano de nascimento digitado pelo mesário, sem nenhum controle técnico de identidade. Os arquivos públicos não dizem se foram as próprias pessoas. É **Pendente (LAI)**.

## 1. Fontes e universo

| Fonte | O que dá | Universo |
|---|---|---|
| Diários das urnas (log.jez, principal e aninhados) | tipo de liberação de cada voto, horário, mesário (como apelido M1, M2…) | **todas** as 108 seções da zona 0026 de MT (Campinápolis 38, Nova Xavantina 51, Novo São Joaquim 19), **nos dois turnos**: 216 pacotes, nenhum excluído |
| `perfil_eleitor_secao_2026_MT` (TSE, gerado em 14/07/2026) | aptos, biometria e raça/cor declarada por seção e faixa etária | 1.737.758 linhas de MT; zona 0026 inteira |
| `perfil_comparecimento_abstencao_2026` (TSE, gerado em 13/10/2026) | aptos e comparecimento por município, zona, faixa, raça/cor e **grupo indígena** | 27 UFs + exterior. O zip traz também um `BRASIL.csv` com as mesmas linhas, que foi **descartado** para não contar tudo duas vezes. Tem **só o 1º turno** |
| Censo 2022, IBGE, SIDRA tabela 9514 (população por idade e **forma de declaração da idade**: data de nascimento ou idade presumida) | população por faixa e por idade simples | Campinápolis, Nova Xavantina, Novo São Joaquim, Alto Boa Vista, MT e Brasil |

Conferência: nas 216 seções, o diário bate com o BU no comparecimento, nos habilitados por digital e nos liberados sem digital.

A seção 0213 é agregada à 0197 (vota na urna dela). No perfil por seção, ela foi somada à 0197.

Os 224 aptos de 100+ são iguais no perfil por seção (julho) e no perfil de comparecimento (outubro).

## 2. As liberações nos diários (itens 1 a 3 do pedido)

Tipos de liberação de cada voto, lidos no diário:
- **digital:** "Tipo de habilitação do eleitor [biométrica]";
- **ano de nascimento:** "Ano de nascimento digitado é igual ao do cadastro". É o eleitor **sem digital no cadastro**: o mesário digita o ano e a urna libera, sem digital de ninguém;
- **mesário identificado:** "Dado digitado confere" e "Mesário N habilitou o eleitor". O eleitor tem digital, ela falhou, e um mesário registrado pôs a dele;
- **sem mesário identificado:** "Dado digitado confere", mas a digital do mesário "bate com uma digital gravada após o registro inicial", e a urna não associa a liberação a nenhum mesário.

### 2.1 Totais da zona 0026 (Fato)

| Município | Turno | Seções | Votos | Digital | Ano de nascimento | Mesário identificado | Sem mesário identificado | Sem digital (%) | Ano recusado* | "Já votou" | Maior rajada em 10 min | Maior sequência seguida | Mesmo mesário, seguidas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Campinápolis | 1º | 38 | 8.377 | 7.029 | 747 | 227 | 374 | 1.348 (16,1%) | 27 | 15 | 5 (seção 0070) | 5 (seção 0209) | 3 |
| Campinápolis | 2º | 38 | 8.497 | 7.069 | 785 | 350 | 293 | 1.428 (16,8%) | 30 | 29 | 6 (seção 0199) | 4 (seção 0065) | 3 |
| Nova Xavantina | 1º | 51 | 12.039 | 10.801 | 645 | 392 | 201 | 1.238 (10,3%) | 12 | 2 | 4 | 4 | 3 |
| Nova Xavantina | 2º | 51 | 12.369 | 11.074 | 690 | 442 | 163 | 1.295 (10,5%) | 10 | 7 | 5 | 4 | 3 |
| Novo São Joaquim | 1º | 19 | 4.151 | 3.716 | 120 | 231 | 84 | 435 (10,5%) | 5 | 3 | 4 | 4 | 3 |
| Novo São Joaquim | 2º | 19 | 4.165 | 3.728 | 132 | 230 | 75 | 437 (10,5%) | 5 | 1 | 5 | 4 | 3 |

\* "Ano de nascimento digitado é diferente do cadastro" (ALERTA): o mesário digitou um ano que não bate com o cadastro.

- **Fato:** Campinápolis tem mais votos sem digital que os vizinhos (16% contra 10%). Isso acompanha o cadastro: no perfil por seção, 20,8% dos aptos de Campinápolis não têm digital (2.393 de 11.515), contra 6,0% em Nova Xavantina e 12,0% em Novo São Joaquim.
- **Fato:** rajadas, sequências e o mesmo mesário liberando seguidas ficam no mesmo nível dos vizinhos. Nenhuma seção passa de 6 liberações sem digital em 10 minutos nem de 5 seguidas.
- **Fato:** liberações pelo ano de nascimento, do 1º para o 2º turno: 747 → 785 em Campinápolis (+5%), 645 → 690 em Nova Xavantina (+7%). O comparecimento subiu nos dois.

### 2.2 Horário (Fato)

Votos sem digital por hora em Campinápolis (votos sem digital / total da hora):

- 1º turno: 07h 16% · 08h 18% · 09h 16% · 10h 16% · 11h 17% · 12h 16% · 13h 16% · 14h 16% · 15h 14% · 16h 15% · 17h 14% · 18h 14% · 19h 12%.
- 2º turno: 07h 16% · 08h 18% · 09h 17% · 10h 17% · 11h 16% · 12h 17% · 13h 16% · 14h 16% · 15h 23% (62 de 268) · 16h 0 de 1.

A parte sem digital é plana ao longo do dia. Não há concentração no fim do dia, quando o comparecimento já é conhecido e quem não veio poderia ser "completado".

Às 15h do 2º turno, a taxa sobe para 23%, mas é a hora de menos votos (268); com tão poucos votos, a taxa varia mais.

Na última hora antes do encerramento, as seções de aldeia do 2º turno não têm nenhum voto: o eleitorado votou cedo.

Nota de método: a métrica "voto sem digital até 60 s depois do voto anterior" dá 0 no 1º turno e 168 no 2º. Isso vem do tamanho da cédula (6 cargos no 1º turno, 1 no 2º), não do comportamento. Ela não serve para comparar os turnos.

### 2.3 "Já votou"

- **Fato:** Campinápolis registrou 15 avisos "O eleitor identificado já votou" no 1º turno e 29 no 2º. Os vizinhos ficaram entre 1 e 7.
- 12 dos 29 do 2º turno são da **seção 0094** (Escola Estadual Couto Magalhães, área urbana). Ali, entre 12:58 e 13:09, foram digitados 10 títulos que a urna recusou como "já votou" e 3 CPFs "não encontrados", com só 2 votos no meio.
- O diário não grava o número digitado. Por isso não dá para saber se foi o mesmo título várias vezes ou títulos diferentes.
- **Hipótese:**
  - benigna: eleitores voltando à mesa ou o mesário conferindo quem já votou;
  - não benigna: tentativa de usar títulos já usados.

  A trava funcionou (nenhum voto saiu dessas tentativas). Fica registrado como rastro a examinar na ata da seção. **Recomendação:** pedir a ata da seção 0094 (2º turno) ao TRE-MT.

## 3. Onde estão os 100+ (item 4 do pedido)

Perfil do eleitorado por seção, Campinápolis (Fato):

| Grupo | Aptos 100+ | Com digital | Sem digital |
|---|---|---|---|
| Raça/cor declarada indígena (todos Xavante no perfil de comparecimento) | 30 | 30 | 0 |
| Raça/cor não informada | 192 | 0 | 192 |
| Outra raça/cor declarada | 2 | 2 | 0 |
| **Total** | **224** | **32** | **192** |

- 14 das 38 seções reúnem 157 dos 192 aptos de 100+ sem digital (81,8%).
- As cinco com mais 100+ sem digital ficam em **escolas indígenas de aldeia**: 0158 Aldeiona (34), 0157 Imaculada Conceição (24), 0159 Santo Antônio (23), 0198 Aldeia Estrela (19) e 0197 Santa Clara (6). Somam 106, mais da metade.
- A seguir vêm as seções urbanas da Escola Couto Magalhães (0094 com 11) e da Escola Anastácio Feliciano Alves.

Por local de votação:

| Local de votação | Seções | Aptos | Indígenas declarados | Aptos 100+ | 100+ sem digital | 100+ indígenas | Liberados pelo ano de nascimento, 1º / 2º turno |
|---|---|---|---|---|---|---|---|
| Escola Estadual Indígena Aldeiona | 3 | 914 | 81% | 41 | 35 | 5 | 61 / 60 |
| Escola Municipal Indígena Santo Antônio | 3 | 971 | 83% | 35 | 24 | 11 | 65 / 71 |
| Escola Municipal Anastácio Feliciano Alves | 8 | 2.441 | 13% | 31 | 29 | 1 | 160 / 164 |
| Escola Estadual Couto Magalhães | 8 | 2.849 | 15% | 30 | 30 | 0 | 216 / 228 |
| Escola Municipal Indígena Imaculada Conceição | 2 | 569 | 79% | 27 | 24 | 3 | 30 / 27 |
| Escola Indígena Aldeia Estrela | 2 | 473 | 81% | 20 | 19 | 1 | 28 / 38 |
| Escola Municipal Carinho e Ternura | 7 | 2.037 | 8% | 19 | 19 | 0 | 130 / 137 |
| Escola Municipal Indígena Santa Clara | 1 | 399 | 85% | 13 | 6 | 7 | 32 / 31 |
| Escola Municipal São José do Couto | 3 | 758 | 2% | 6 | 6 | 0 | 25 / 29 |
| Escola Municipal Campos Belos | 1 | 104 | 97% | 2 | 0 | 2 | 0 / 0 |

A tabela por seção (38 linhas, com as liberações dos dois turnos) está na saída do script de cruzamento e em `cruzamento.json`.

### 3.1 O estoque de 100+ sem digital puxa liberações extras?

- **Teste.** Hipótese nula: entre as seções, as liberações pelo ano de nascimento acompanham os aptos sem digital em geral e não dependem do estoque de 100+ sem digital.
  - Se títulos de 100+ estivessem sendo usados em volume, as seções com mais 100+ sem digital teriam liberações acima do que o resto do estoque sem digital explica.
- **Fato** (correlação de Spearman entre as 38 seções):
  - liberações pelo ano de nascimento × aptos sem digital: ρ = 0,79;
  - liberações pelo ano de nascimento × 100+ sem digital: ρ = 0,40;
  - taxa de liberação por apto sem digital com menos de 100 anos × 100+ sem digital: ρ = 0,26. Fica abaixo do limite de 5% para n = 38 (cerca de 0,32), sem efeito detectável.
- **Leitura:** as liberações seguem o estoque total sem digital, como esperado. Não aparece excesso onde estão os 100+.
- **Limite:** o teste só pega uso em volume. Os 12 votos de 100+ sem digital, espalhados por 38 seções, ficam abaixo da resolução dele: 12 em 1.348 votos sem digital.

## 4. Comparecimento dos 100+ por raça/cor (Fato, só 1º turno)

| Recorte | Aptos 100+ | Compareceram | Taxa |
|---|---|---|---|
| Campinápolis, indígena Xavante | 30 | 20 | 66,7% |
| Campinápolis, raça/cor não informada | 192 | 12 | 6,25% |
| Campinápolis, outra | 2 | 0 | 0% |
| Novo São Joaquim (mesma zona), todos | 29 | 0 | 0% |
| Nova Xavantina (mesma zona), todos | 3 | 0 | 0% |
| Brasil (com exterior), indígena declarado | 72 | 40 | 55,6% |
| Brasil (com exterior), não informado | 297.100 | 1.895 | 0,64% |
| Brasil (com exterior), outra | 1.067 | 206 | 19,3% |
| MT, não informado | 1.255 | 29 | 2,31% |

- **Fato:** Campinápolis sozinha tem 30 dos 72 aptos de 100+ declarados indígenas do país (42%) e 20 dos 40 votantes desse grupo.
- **Fato:** nas faixas abaixo, o grupo "não informado" de Campinápolis vota na mesma taxa que o de 100+: 6,3% (90 a 94 anos, 7 de 111) e 6,7% (95 a 99, 6 de 89). Os Xavante declarados votam em 70,8% e 76,5%. Em Nova Xavantina, o "não informado" de 90 a 94 vota em 7,8%.
- **Leitura (Hipótese):** em Campinápolis, o "não informado" de 100+ se comporta como o de 90 a 99 anos da mesma cidade, não como o de 100+ do país (0,64%, quase todo de títulos de mortos sem baixa, doc 03 do demógrafo). Isso combina com idades exageradas: parte dos "100+" seria, de fato, gente de 80 ou 90 anos.

## 5. Aldeia, data de nascimento estimada e o que o dado público permite ver (item 5 do pedido)

| Território (Censo 2022) | 90 a 94 | 95 a 99 | 100 ou mais | 100+ ÷ 95–99 | 100+ por 10 mil hab. | Idade presumida (todas as idades) |
|---|---|---|---|---|---|---|
| Campinápolis | 52 | 37 | **42** (presumida 2) | **1,14** | **27,4** | 7,8% |
| Nova Xavantina | 54 | 13 | 5 | 0,38 | 2,1 | 20,4% |
| Novo São Joaquim | 6 | 3 | 2 | 0,67 | 2,9 | 7,0% |
| Alto Boa Vista (MT, outra área Xavante) | 9 | 9 | 5 | 0,56 | 8,8 | 13,1% |
| Mato Grosso | 5.513 | 1.456 | 492 (presumida 123) | 0,34 | 1,3 | 15,0% |
| Brasil | 579.729 | 165.178 | 37.814 (presumida 8.500) | 0,23 | 1,9 | 14,8% |

- **Fato:** no Censo, Campinápolis tem 14 vezes mais centenários por habitante que o Brasil. A faixa aberta de 100+ é maior que a de 95 a 99 anos.
  - Numa população com idades exatas isso não acontece: a mortalidade nessas idades faz cada faixa de 5 anos ter bem menos gente que a anterior.
  - É o desenho conhecido de **exagero de idade**. Ele aparece onde a data de nascimento foi estimada no registro (registro administrativo indígena, registro tardio).
- **Fato:** o Censo marcou só 2 dos 42 como "idade presumida". Os outros 40 deram data de nascimento.
  - A pergunta do Censo separa quem informa uma data de quem estima a idade. Ela não detecta a data **estimada no documento**, que entra como "data de nascimento".
  - Por isso a "idade presumida" do Censo não serve para medir o 01/01.
- **Fato:** o índice de Whipple (preferência por idades terminadas em 0 e 5; 100 = nenhuma, 500 = todas) de Campinápolis é 107 de 23 a 62 anos e 108 de 63 a 97. No Brasil, é 104 nas duas faixas. Não há empilhamento em 0 e 5. Uma data estimada como 01/01 de um ano qualquer não precisa cair em ano redondo, e o índice não a vê.
- **Fato:** nenhum arquivo público do TSE ou do IBGE traz dia e mês de nascimento, mesmo agregados. O perfil do eleitorado só tem faixas de 5 anos. **Não foi possível conferir a concentração em 01/01.**
- **Hipótese** (forte, sem número próprio do cadastro): em Campinápolis, a "idade 100+" é em boa parte artefato de data estimada em documento de indígena Xavante. Isso explica três coisas:
  - o Censo também conta 42 centenários;
  - os 100+ estão nas aldeias;
  - os 100+ com biometria (vivos e recadastrados) votam em 67%.
- **Pendente (LAI ao TSE),** sem dado pessoal, só contagens:
  - (a) quantos dos 224 títulos de 100+ da zona 0026 em Campinápolis têm nascimento em 01/01, e o mesmo para 90 a 99 anos e para o resto de MT, por biometria e raça/cor;
  - (b) as seções dos 12 votantes de 100+ sem biometria, e se algum título tem óbito no SIRC (sistema de registro civil);
  - (c) o comparecimento por faixa do 2º turno, que o arquivo de comparecimento ainda não traz.

  Pedido complementar à Funai: quantos registros administrativos de nascimento de indígena (RANI) de Campinápolis têm data estimada.

## 6. Cenário de ataque e rastro (formato da matriz, doc 01)

| Ataque | Pré-requisitos | Rastro esperado | Onde procurar | Resultado | Limite |
|---|---|---|---|---|---|
| Mesário vota com títulos de 100+ sem biometria de quem não veio (vivo ausente ou morto sem baixa) | lista dos títulos sem digital da seção; mesário que digita o ano de nascimento; ninguém na fila contestando | liberações pelo ano de nascimento em rajada, no fim do dia, depois de a fila acabar; mais liberações onde há mais 100+ sem digital; 100+ votando muito acima da linha de base | diários das 38 seções, 2 turnos; perfil por seção; perfil de comparecimento | sem rajada (máx. 5–6 em 10 min, igual aos vizinhos); taxa sem digital plana por hora; nada a mais onde estão os 100+ (ρ = 0,26, n.s.); 12 votos de 100+ sem digital (6,25%), na faixa do "não informado" de 90 a 99 da mesma cidade | um uso pequeno (até 12 votos) não aparece em nenhum teste de ritmo; o diário não grava o ano digitado nem o título; o comparecimento por idade é por zona, não por seção; não há dado do 2º turno |
| Inflar a idade no cadastro para criar estoque de títulos "parados" | acesso ao cadastro do TSE ou registro tardio com data falsa | 100+ sem raça/cor declarada e sem biometria, concentrados | perfil por seção; Censo | os 100+ sem digital estão nas aldeias e o Censo, que é independente, também conta 42 centenários: combina com data estimada, não com manipulação do cadastro eleitoral | só a LAI (dia e mês, data de inscrição e da última revisão) separa as duas coisas |

## 7. Limites

- O diário não grava o ano digitado, a idade nem o título do eleitor liberado. Não dá para dizer, pelo log, **qual** liberação foi de um eleitor de 100+.
- O comparecimento por idade é publicado por município e zona, não por seção, e só do 1º turno.
- O perfil por seção é de julho de 2026. Três seções com 0 aptos sem digital no perfil (0207, 0209 e 0210) registram de 2 a 6 liberações pelo ano de nascimento por turno. É diferença pequena entre a foto de julho e o arquivo de digitais da urna; a causa não foi apurada.
- Pelo princípio 8, os 12 votos de 100+ sem biometria e todas as liberações pelo ano de nascimento não têm controle técnico de identidade. Que o mesário tenha conferido o documento não conta como controle. A brecha está aberta, mas não aparece uso dela que deixe rastro.

## Reprodução

```
node scripts/auditoria/seguranca-campinapolis-logs.mjs        # ~segundos: 216 diários (zona 0026 de MT, 2 turnos) → logs.json
node scripts/auditoria/seguranca-campinapolis-perfil.mjs      # ~5 min: perfil por seção (MT) + comparecimento (27 UFs + ZZ) → perfil.json
node scripts/auditoria/seguranca-campinapolis-censo.mjs       # baixa uma vez do SIDRA/IBGE (tabela 9514) e guarda em data/raw/externos/ibge/ → censo.json
node scripts/auditoria/seguranca-campinapolis-cruzamento.mjs  # segundos: tabelas deste documento → cruzamento.json
```

Saídas em `data/parsed/auditoria/engenheiro-seguranca-urna/campinapolis/`. Os arquivos do IBGE foram guardados com URL, data e SHA-256: `censo2022-9514-forma-declaracao-idade.json` e `censo2022-9514-idade-simples-forma-declaracao.json`, cada um com o seu `.meta.json`.

Nenhum script grava CPF ou número de título. O mesário vira apelido por seção e turno, e o título dele fica só na memória.
