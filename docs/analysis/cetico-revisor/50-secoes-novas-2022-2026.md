# 50. Seções novas: a coorte de 2022 até 2026 e o teste de recência (H27)

Parecer do revisor cético, 31/10/2026. Revisa o [demógrafo 11](../demografo/11-secoes-novas-2022-2026.md) e os scripts `demografo-novas-2022-{baixar,perfil,analise,biometria-idade}.mjs`, com as saídas em `data/parsed/auditoria/demografo/`. Contexto: [demógrafo 08](../demografo/08-secoes-novas-e-h01-2turno.md), [parecer 41](41-pendencias-engenheiro-demografo.md) e o registro da H27 em `docs/hipoteses.md`.

Banco: cópia de leitura de 29/10, 10:50 UTC. Sem rede. No máximo 2 processos pesados ao mesmo tempo. `data/raw` não foi varrido com `find`: só os zips já conhecidos foram abertos pelo nome. Nenhum CPF nem número de título foi gravado ou impresso. Tudo é agregado por seção.

## Vereditos

| # | Achado do doc 11 | Veredito |
|---|---|---|
| 1 | Coorte de 2022: 118 novas com 95%+, de 96,06% para 89,31%, −6,44 contra −3,62 nas antigas; excesso de +54,3 para −19,8 | **Sustentado com ressalvas.** Os números batem. "O excesso some" vale para o total do 2º turno. Nos locais novos de 2022, que eram a fonte do excesso, ele cai muito mas não some: 1,65 vez no 2º turno e 4,6 vezes no 1º |
| 2 | "Passageiro": a diferença de 2,8 pontos é o que a nova perde a mais | **Sustentado com ressalvas.** Não é só volta à média comum: com tamanho e crescimento controlados, sobra cerca de 2,2 pontos. Mas a perda a mais não é da cauda: as novas de 90% a 95% também perdem 2,2 pontos a mais. "Passageiro" descreve, não explica, e não separa causa benigna de não benigna |
| 3 | Excesso de 2022 e 2026 por local novo e local existente (+52,9 / +1,4; +213,5 / +128,3) | **Sustentado** para os números do 2º turno. **Ressalva:** no 1º turno de 2022 o local existente já tinha +19,2 (1,4 vez); "todo o excesso de 2022 estava no local novo" vale só para o 2º turno |
| 4 | Decomposição dos cerca de 288 (72 / 89 / 127) | **Sustentado com ressalvas, como Estimativa.** A parte do local existente (127) não depende da ordem da conta. A divisão entre "mais seções" e "taxa maior" depende: 72 / 89 na ordem do doc, 123 / 38 na ordem inversa, 97 / 63 na média. Não pode virar Fato |
| 5 | TTE não explica a diferença (régua "aptos − cadastro") | **Sustentado com ressalvas fortes.** A régua mede o saldo de TTE (quem entra menos quem sai), não o TTE. Com o TTE exato do BU, dois terços do excesso dos locais existentes de 2026 estão em seções com TTE. Sem TTE nenhum, o fenômeno novo nos locais existentes cai de cerca de 127 para cerca de 40 seções. Ver item 5 |
| 6 | 385 × 52 nas novas com 0% sem biometria; controles de 5,4 e 4,3 | **Sustentado com ressalvas.** 385 × 52,03 bate. O controle mais completo deixa sem base 266 das 408 novas com 95%+. E "0% sem biometria" no perfil não quer dizer "todos com digital" |
| 7 | Perfil de 2022: 156.454.011 eleitores em 496.512 seções | **Sustentado.** Reproduzido do bruto e igual à soma dos aptos do resultado de 2022 |
| 8 | "Os locais das novas com 95%+ mudaram" (23,4% → 8,7% sem biometria) | **Refutado na forma escrita.** Compara conjuntos diferentes (só os locais que existiam em 2022 contra todos os locais de 2026). A queda nacional foi de 24,5% para 11,0%; as antigas desses mesmos locais estão em 11,0% em 2026 |
| 9 | Biometria por idade em 2022 (99,98% dos 16–17 anos sem digital) | **Sustentado.** Conferido no bruto do AC (99,88%). A causa (pandemia) é contexto de fora dos arquivos, não Fato |
| 10 | Explicação benigna: a seção nova reúne eleitores com operação recente no cadastro | **Sustentado com ressalvas, só como Hipótese, e aceito cedo demais no texto.** O doc rotula bem no fim, mas chama de "explicação benigna conferida (Fato)" o que é só a localização do excesso. Há uma explicação alternativa não testada que produz os mesmos sinais: transferência irregular de domicílio (item 10) |
| 11 | Teste novo deste parecer: liberação pelo mesário sem a digital nas novas com 95%+ (canal da H07) | **Fato.** 6,38% dos votantes, contra 9,24% nas antigas com 95%+ e 6,73% nas demais; nas 100% biométricas, 0,71 vez o esperado pelo tamanho. Não há uso em massa desse canal nessas seções |

---

## Como foi refeito (caminho próprio)

Três scripts novos deste parecer, que não leem nenhuma saída do demógrafo:

- `scripts/auditoria/cetico-50-perfil.mjs`. Lê os 56 zips do perfil por seção (2022 e 2026, 27 UFs e exterior) com um separador de CSV que respeita aspas e colunas pelo nome do cabeçalho. Conta linhas mal formadas, faixas de idade desconhecidas e a data de geração de cada arquivo.
- `scripts/auditoria/cetico-50-novas.mjs`. Lê o detalhe por seção de 2018, 2020, 2022 e 2026 e os CEFT de 2022 e 2024 com o mesmo separador e conta linhas repetidas de Presidente. Tira o comparecimento de 2026 de **duas fontes**: o detalhe de 2026 (dados abertos) e o BU do banco. Refaz as partes A e B do doc, a decomposição nas duas ordens, a regressão à média, o TTE exato e a liberação sem digital.
- `scripts/auditoria/cetico-50-cruzamento.mjs`. Cruza os dois: novas com 0% sem biometria, validação da régua de TTE com o sinal, um invariante de biometria, as seções de trânsito e as contagens diretas do texto para leigos.

```
node scripts/auditoria/cetico-50-perfil.mjs 2022 2026                       # ~12 min
node --max-old-space-size=6000 scripts/auditoria/cetico-50-novas.mjs        # ~1 min
node scripts/auditoria/cetico-50-cruzamento.mjs                             # ~1 min
```

Saídas em `data/parsed/auditoria/cetico-revisor/50/` (`perfil-resumo-<ano>.json`, `novas-resumo.json`, `cruzamento-resumo.json` e as tabelas por seção).

**Conferências de leitura (Fato):**
- Detalhe: 0 linha repetida de Presidente em 2022 e em 2026, e 0 linha com número de colunas diferente do cabeçalho. O separador simples do doc, que não respeita aspas, não errou nenhuma linha nesses arquivos.
- Detalhe de 2026 × BU do banco: 499.176 (1º t.) e 499.178 (2º t.) seções nas duas fontes, com **0 diferença** de aptos e de comparecimento. Só no detalhe ficam 72 e 70 seções: as do Sistema de Apuração e as sem arquivo, que o doc exclui (1º turno: 29 `saManual`, 2 `saMista` e 41 sem arquivo; 2º turno: 29 e 41). O doc não declara essa exclusão com contagem.
- Detalhe de 2022: a soma de aptos de Presidente é **156.454.011** nos dois turnos.

**Caso conferido no bruto.** PI 12335/0068/0092 (Belém do Piauí), nova de 2022 em local novo. Detalhe de 2022, Presidente: 1º turno com 95 aptos e 95 votantes; 2º turno com 95 e 94 (98,9%). BU de 2026, 2º turno (`node src/exportar.js --uf pi --municipio 12335 --zona 0068 --secao 0092 --turno 2 --log nao --stdout`): 136 aptos (133 da seção e 3 em trânsito) e 132 votantes (97,1%). Igual à tabela de trajetória do doc.

---

## Item 1. A coorte de 2022 (doc §1)

| 2º turno | Doc 11 | Caminho próprio (BU 2026) | Caminho próprio (detalhe 2026) |
|---|---|---|---|
| Novas de 2022 / com par em 2026 / mesmo local | 85.893 / 81.749 / 77.616 | igual | 85.893 / 81.763 / 76.583 |
| Novas com 95%+ em 2022 / com par | 118 / 112 | igual | igual |
| Taxa 2022 → 2026 | 96,06% → 89,31% | igual | igual |
| Variação média (EP) | −6,44 (0,52) | igual | igual |
| Antigas com 95%+: taxa e variação | 95,77% → 92,16%; −3,62 (0,33) | igual | igual |
| Aptos médios das novas com 95%+ | 173 → 239 | 173,2 → 239,4 | igual |
| Excesso pelo tamanho, 2022 | 118 × 63,7 = +54,3 | 118 × 63,67 = +54,33 | igual |
| Excesso pelo tamanho, 2026, mesmas seções | 41 × 60,8 = −19,8 | 41 × 60,79 = −19,79 | 41 × 58,07 = −17,07 |
| 1º turno, 2022 → 2026 | +110,3 → +14,0 | +110,30 → +14,03 | — |

O "mesmo local" muda com a fonte (77.616 × 76.583) porque o número do local no BU e no detalhe de 2026 nem sempre coincide. Isso não afeta as contas de excesso da coorte.

**Ressalva 1a. O excesso não some nos locais novos de 2022 (Fato).** O doc diz que, "como coorte, o excesso pelo tamanho some". Abrindo a coorte pela categoria que ela tinha em 2022:

| Coorte de 2022, em 2026 | 2º turno: obs. × esp. (razão) | 1º turno: obs. × esp. (razão) |
|---|---|---|
| Era local novo em 2022 (4.302 com par) | **16 × 9,7 (1,65)** | **21 × 4,6 (4,6)** |
| Era local existente em 2022 (76.415) | 23 × 49,9 (0,46) | 19 × 21,7 (0,87) |
| Zona nova (1.032) | 2 × 1,3 | 1 × 0,7 |
| Total | 41 × 60,8 (0,67) | 41 × 27,0 (1,52) |

- Em 2022, o excesso do 2º turno estava todo nos locais novos (62 × 9,1, razão 6,8). No 1º turno, estava quase todo (100 × 9,1, razão 11,1, contra +19,2 no local existente; ressalva 3a).
- Quatro anos depois, esses mesmos locais novos ainda passam de 95% acima do esperado (com par em 2026: 4.302 no 2º turno, 4.330 no 1º). No 2º turno, 1,65 vez: se o esperado fosse 9,7, a chance de dar 16 ou mais seria de 3,8%. No **1º turno, 4,6 vezes**: a chance de dar 21 ou mais com esperado de 4,6 é menor que 2 em 100 milhões. As duas contas de chance não incluem a incerteza do esperado nem as várias comparações feitas; servem só de ordem de grandeza.
- O total do 2º turno fica negativo porque as novas de 2022 em local existente, que nunca tiveram excesso, ficam **abaixo** do esperado em 2026 (0,46). Isso puxa a soma para −19,8.

A leitura certa: o excesso dos locais novos de 2022 caiu de 6,8 para 1,65 vez no 2º turno e de 11,1 para 4,6 vezes no 1º. Caiu muito, mas não sumiu. A frase do doc "se desfaz em uma eleição geral" é forte demais, sobretudo para o 1º turno. A previsão de que as novas de 2026 "percam o excesso até 2030" tem de ser lida com esse resultado.

**Ressalva 1b.** As 18 novas que continuam com 95%+ e as 24 antigas são contagens pequenas. A diferença de persistência (16% × 22%) não tem poder para nada.

---

## Item 2. "Passageiro" ou só volta à média? (doc §1, leitura)

O doc trata a queda das antigas (−3,62) como a volta à média comum e diz que a diferença (2,8 pontos) é o que a seção nova perde a mais. Há dois problemas. A nova é menor, o que dá mais ruído e mais volta à média. E ela cresceu mais, o que dilui o grupo. Testei as duas coisas.

**Modelo nas antigas.** Nas 5.367 antigas que tiveram 90% ou mais em 2022 e existem em 2026, ajustei a variação em pontos contra a taxa de 2022 e 1/√aptos (o tamanho do ruído). Depois apliquei o modelo às 112 novas com 95%+.

| 2º turno | Variação média |
|---|---:|
| Observada nas novas com 95%+ | −6,44 |
| Prevista pelo modelo das antigas, com taxa e tamanho | −3,48 |
| Prevista com taxa, tamanho e crescimento dos aptos de 2022 a 2026 | −4,25 |

1º turno: observada −7,85; prevista −3,86 e −4,87.

- **Estimativa.** A volta à média esperada para seções do mesmo tamanho e do mesmo nível explica cerca de 3,5 pontos de queda. O crescimento (diluição) explica mais cerca de 0,8. Sobram **cerca de 2,2 pontos** no 2º turno e 3,0 no 1º que a nova perde a mais. O doc está certo em que existe uma perda a mais. O tamanho dela depende do modelo.
- **Fato. A perda a mais não é só da cauda.** Variação média de 2022 para 2026, por faixa de comparecimento em 2022, 2º turno:

| Faixa em 2022 | Novas (seções; variação) | Antigas (seções; variação) | Diferença |
|---|---|---|---:|
| abaixo de 70% | 6.270; +6,36 | 24.970; +6,35 | 0,0 |
| 70–80% | 31.873; +2,40 | 158.915; +2,63 | −0,2 |
| 80–85% | 26.254; −0,01 | 132.097; +0,61 | −0,6 |
| 85–90% | 14.600; −1,66 | 58.098; −0,65 | −1,0 |
| 90–95% | 2.640; −3,87 | 5.256; −1,71 | **−2,2** |
| 95% ou mais | 112; −6,44 | 111; −3,62 | −2,8 |

  Quanto mais alta a seção nova estava em 2022, mais ela cai, e ela cai mais que a antiga do mesmo nível. Nas de 90% a 95%, com 2.640 seções, a perda a mais é de 2,2 pontos, quase a mesma das 112 de 95%+. Uma parte do comparecimento da seção nova em 2022 não se repete, e essa parte é maior quanto mais alta ela estava.
- **Consequência.** "Passageiro" e "volta à média mais forte na seção nova" são a mesma frase. O teste mostra que o comparecimento alto da seção nova é **menos permanente** que o da antiga. Não diz **por quê**. Combina com a recência (grupo coeso que se dilui), com a diluição medida e com qualquer causa ligada à primeira eleição da seção, benigna ou não.
- A comparação com as antigas controla a volta à média comum. Sozinha, ela não controla o tamanho e o crescimento; o modelo acima controla em parte.

**Veredito do item:** a perda a mais existe e não é artefato da volta à média comum. Ela não prova o mecanismo benigno. Só diz que o efeito é transitório, e, pelo item 1, só em parte.

---

## Item 3. Onde está o excesso (doc §2, tabela)

| 2º turno | Doc 11 | Caminho próprio (BU) | Caminho próprio (detalhe 2026) |
|---|---|---|---|
| 2022, local novo | 62 × 9,1 = +52,9 | 62 × 9,13 = +52,87 | igual |
| 2022, local existente | 55 × 53,6 = +1,4 | 55 × 53,60 = +1,40 | igual |
| 2026, local novo | 247 × 33,5 = +213,5 | 247 × 33,50 = +213,50 | 246 × 33,11 = +212,89 |
| 2026, local existente | 184 × 55,7 = +128,3 | 184 × 55,72 = +128,28 | 185 × 61,36 = +123,64 |
| 2026, total | 433 × 90,5 = +342,5 | +342,47 | +336,67 |

- **Fato:** reproduzido. A pequena diferença com o detalhe de 2026 vem do número do local, que no BU e no detalhe nem sempre é o mesmo (as novas em local novo passam de 10.816 no BU para 11.102 no detalhe).
- **Ressalva 3a (Fato).** No **1º turno de 2022**, o local existente tinha excesso: 67 × 47,8 = **+19,2** (razão 1,40), ao lado de +90,9 no local novo. A frase "em 2022, todo o excesso está nas seções novas em local novo" vale só para o 2º turno. No 1º turno de 2026: local novo +234,7 (11,1 vezes) e local existente +149,1 (4,9 vezes).
- **Ressalva 3b.** "Local novo" é o número de local que não existia na eleição geral anterior. Local renumerado conta como novo. Em 2026, 14.481 seções **antigas** estão em local "novo"; em 2022, 3.398. De 2022 para 2026 houve mais criação ou renumeração de locais do que de 2018 para 2022. Parte do "local novo" de 2026 pode ser local antigo com número novo. O doc cita o limite, mas não o tamanho dele.

---

## Item 4. A decomposição dos cerca de 288 (doc §2, Estimativa)

A diferença total (342,47 − 54,33 = 288,14) se reproduz. A divisão do doc é uma conta de "volume × taxa" no local novo, mais a diferença simples no local existente.

| 2º turno | Ordem do doc (volume primeiro, com a taxa de 2022) | Ordem inversa (taxa primeiro, com o volume de 2022) | Média das duas |
|---|---:|---:|---:|
| Mais seções novas em local novo | 72 | **123** | 97 |
| Taxa maior nos locais novos | 89 | **38** | 63 |
| Fenômeno nos locais existentes | 127 | 127 | 127 |
| Zona nova | 0,6 | 0,6 | 0,6 |

1º turno (diferença de 275,6): volume 123 e taxa 21 na ordem do doc; 135 e 9 na inversa; local existente 130.

- **Fato:** a parte do local existente (cerca de 127) não depende da ordem.
- **Estimativa que depende de escolha:** a divisão entre "mais seções" e "taxa maior" muda muito com a ordem. Na ordem inversa, o volume explica quase o dobro (123 contra 72) e a taxa menos da metade (38 contra 89). O doc apresenta uma só ordem. "A taxa nesses locais novos ser maior em 2026" não se sustenta como número.
- **Outras escolhas que mexem na conta:** a faixa de 25 aptos, o corte de 95%, a base (antigas do mesmo ano) e a definição de local novo (ressalva 3b). A razão também cresce com o corte: a 98%, os locais novos de 2026 dão 42 × 1,8 (23 vezes) e os de 2022, 11 × 0,2 (48 vezes).
- **O 127 também precisa de ressalva:** pelo item 5, dois terços dele estão em seções com eleitor em trânsito.

---

## Item 5. TTE: a régua "aptos − cadastro" e o TTE exato de 2026 (doc §2, "O que não explica")

### 5.1 A régua mede saldo, não TTE

O eleitor em trânsito sai dos aptos da seção de origem e entra nos da seção de destino. Por isso a soma dos aptos fica igual à do cadastro: em 2022, aptos = perfil = 156.454.011; em 2026, 158.745.079 no BU contra 158.745.463 no perfil. A conta "aptos − cadastro da seção" dá **entradas menos saídas**. Uma seção que recebe 3 e manda 5 dá −2 e entra como "sem TTE".

**Validação refeita (Fato, 2º turno de 2026, 498.789 seções com perfil):**
- Nas 348.426 seções sem TTE no BU, a régua dá **zero em 155.914 e negativo em 192.512**, e positivo em nenhuma. O doc diz que "a estimativa dá zero em todas", mas o script conta "zero ou menos" (`est <= 0`). A conclusão (a régua nunca acusa TTE onde não há) fica de pé; a frase está errada.
- Nas 150.363 com TTE, ela acusa TTE em 82.682 (55%) e acerta o número exato em 54.398 (36%).
- 2022 (471.738 seções do resultado com perfil): zero em 181.927, negativo em 205.729, positivo em 84.082 (17,8%). Em 2026, positivo em 16,6%. A distribuição parecida sugere que os dois perfis tratam o trânsito do mesmo jeito. É indício, não calibração.

### 5.2 O TTE exato de 2026 por categoria

Com o TTE do BU (`aptos_tte`), 2º turno de 2026:

| Seção nova em | Sem TTE | TTE de 1 a 3 | TTE de 4 ou mais |
|---|---|---|---|
| Local existente | 70 × 28,6 = +41,4 (2,45) | 54 × 18,5 = +35,5 (2,92) | 60 × 8,7 = **+51,3 (6,93)** |
| Local novo | 122 × 13,1 = +109,0 (9,35) | 78 × 9,4 = +68,6 (8,33) | 47 × 11,1 = +35,9 (4,24) |
| Zona nova | 2 × 0,7 | 0 × 0,2 | 0 × 0,4 |

Base: antigas do mesmo tamanho, todas. Com a base restrita às antigas sem TTE, como o doc faz com a régua, o local existente sem TTE dá 70 × 31,8 = +38,2.

- **Fato:** dos +128,3 dos locais existentes, **+86,9 estão em seções com TTE** e +41,4 em seções sem nenhum TTE. Do total de +342,5, +190,8 estão em seções com TTE e +151,7 em seções sem TTE.
- **Fato:** sem TTE nenhum, a nova em local existente passa de 95% de 2,2 a 2,45 vezes mais que a antiga do mesmo tamanho. O fenômeno não some, como o doc diz. Mas cai de cerca de 127 para **cerca de 40 seções**.
- **Seções só de trânsito (Fato).** Há seções novas em que todos os aptos estão em trânsito. Exemplo: Recife (PE 25313), zona 0008, seções 0411, 0412 e 0413, com 438, 435 e 429 aptos, todos em trânsito, e 96%, 95% e 97% de comparecimento. No 2º turno de 2026 há 296 seções novas e 93 antigas só de trânsito; 25 das novas e 4 das antigas passaram de 95%. Conferido no bruto: PB 20516/0076/0448 (João Pessoa), BU do 2º turno com 393 aptos, 0 da seção, 393 em trânsito e 375 votantes. Em 2022 há 337 seções do resultado sem nenhum eleitor no perfil (276 novas e 61 antigas), com 9 novas acima de 95%. Em 2026 há ainda 79 novas em que o trânsito é a maioria, mas não todo; 15 delas passaram de 95%.

### 5.3 O que isso muda

- A conclusão do doc, "a diferença nos locais existentes continua sem o TTE", é **verdadeira**. Mas o texto passa a ideia de que o TTE não pesa, e ele pesa: é mais da metade do excesso de 2026 e dois terços do "fenômeno novo" nos locais existentes.
- **2022 não se mede com a mesma régua de forma confiável.** Em 2026, a régua acha TTE em só 55% das seções que têm TTE. Em 2022 não há TTE por seção para calibrar. Os dois perfis foram gerados em datas diferentes (campo `DT_GERACAO`): o de 2022 em **26/08/2022**, o de 2026 em **14/07/2026**. Nada nos arquivos diz se a data muda a forma como o perfil conta o eleitor em trânsito. A comparação "2,5 vezes em 2026 contra 0,96 em 2022" com a régua é indicativa, não medida.
- **Explicação que fica aberta:** parte do aumento de 2022 para 2026 pode vir de mais eleitores em trânsito em seções novas, inclusive de seções criadas só para o trânsito. O eleitor em trânsito pediu para votar ali e quase sempre comparece. É procedimento previsto, mas o peso dele em 2022 **não foi medido**.

---

## Item 6. Recência pelo perfil: 385 × 52 e os controles (doc §3)

| 2º turno de 2026 | Doc 11 | Caminho próprio |
|---|---|---|
| Novas e antigas com perfil | 40.444 e 458.345 | igual |
| Novas sem perfil / das quais com 95%+ | 296 / 25 | igual |
| Novas com 0% sem biometria: obs. × esp. | 385 × 52,0 | **385 × 52,03** |
| 0 a 5% / 5% ou mais | 15 × 13,4 / 8 × 14,5 | 15 × 13,42 / 8 × 14,50 |
| 1º turno, 0% | 390 × 38,4 | 390 × 38,36 |

- **Fato:** reproduzido. As 296 novas sem perfil são **exatamente as 296 seções só de trânsito** (aptos todos em TTE, nenhum eleitor no cadastro da seção). O doc e o relatório atual as chamam de "sem dado de idade no perfil" sem dizer o que são.
- **Controle mais simples, próprio:** contra antigas do mesmo tamanho **e** da mesma faixa sem biometria, as novas 100% biométricas dão 385 × 94,4 (**4,1 vezes**; 1º turno, 5,7). Cai de 7,4, mas fica alto. Bate em ordem de grandeza com os 5,4 do doc (que soma a parcela jovem).
- **Ressalva 6a. O controle do doc cobre só parte da cauda.** No controle "tamanho × jovens × sem biometria", 6.393 novas ficam sem antiga para comparar, e entre elas estão **113 das 408** novas com 95%+. Somando o crescimento do local, ficam sem base 11.266 novas e **266 das 408**. O "4,3" vale para 142 seções, um terço da cauda. O doc dá o número de novas sem base, mas não o de seções com 95%+ que ficam fora.
- **Ressalva 6b. "0% sem biometria" não quer dizer "todos com digital".** O perfil público conta como "com biometria" quem tem só a foto no cadastro. É a diferença de definição já medida no [parecer 01](01-b1a-sem-biometria-acima-do-cadastro.md) e no tópico 8, item 5, do relatório. Teste próprio, 2º turno:
  - 25.284 seções têm 0% sem biometria no perfil e nenhum TTE. Em **7.039** delas o BU registra liberação pelo ano de nascimento, que é a via de quem não tem biometria cadastrada: 13.103 votos, até 65 numa só seção.
  - Nas 385 novas com 95%+ e 0% sem biometria houve 240 liberações pelo ano de nascimento em 60.179 votantes (0,4%); parte pode ser de eleitor em trânsito. Sem TTE, 35 delas têm liberação pelo ano de nascimento.
  - O marcador continua útil como sinal de cadastro recente, mas é "100% com biometria pela definição do perfil", não "100% com digital".
- **Partição por TTE:** das 385, 178 não têm TTE (178 × 25,0, 7,1 vezes) e 207 têm (207 × 27,0, 7,7 vezes).

---

## Item 7. O perfil de 2022 soma 156.454.011 eleitores (doc, Fontes)

- **Fato, reproduzido por caminho próprio:** leitura dos 28 zips de 2022 direto do bruto, com separador que respeita aspas. São 76.211.234 linhas, 0 mal formada, **156.454.011 eleitores em 496.512 seções**. 2026: 91.015.804 linhas, **158.745.463 eleitores em 516.785 seções**.
- **Conferência independente:** a soma dos aptos de Presidente no resultado por seção de 2022 também dá **156.454.011** nos dois turnos. São dois arquivos diferentes do TSE com o mesmo total.
- **Detalhe que o doc não cita:** o perfil de 2022 tem duas datas de geração. DF e exterior foram gerados em 12/07/2022 (1.313.435 linhas); as outras 26 UFs, em 26/08/2022. O de 2026 tem uma só data, 14/07/2026.
- Faixa de idade inválida (código −3): 1.990 eleitores em 2022 e 1.212 em 2026. Não afeta nada do doc.
- Conferido no bruto de 2026: PI 10324/0016/0187 (Lagoa Alegre), uma das 56 novas com 98%+, tem 102 eleitores no cadastro, 95 com biometria e 47 de 16 a 20 anos. No BU do 2º turno, 7 liberações pelo ano de nascimento, igual aos 7 sem biometria.

---

## Item 8. "Os locais das novas com 95%+ mudaram" (doc §3)

O doc diz: "A parcela sem biometria do local caiu de 23,4% (locais que já existiam em 2022) para 8,7% (todos os locais delas em 2026)".

- **Conjuntos diferentes.** O número de 2022 é só dos locais que já existiam; o de 2026 inclui também os locais que não existiam em 2022. A queda mistura a mudança do local com a entrada de locais novos na conta. Pelo `novas-2022-resumo.json` do próprio doc, são 366.707 eleitores em 2022 contra 505.207 em 2026: não é o mesmo grupo.
- **A queda nacional é do mesmo tamanho.** No país, o cadastro sem biometria foi de 24,48% para 10,99% (o doc mostra isso no §4). As **antigas** desses mesmos locais estão em 10,98% em 2026, igual à média do país.
- **Veredito:** a frase, como está, não mostra que esses locais mudaram mais que os outros. A "geração adulta" (1,04 contra 0,93) é a medida que sustenta a ideia de local que ganhou gente. Ela tem um viés de seleção que o doc não cita: o cartório cria seção nova onde o eleitorado cresce, então o local de seção nova tende a ter crescido por construção.

---

## Item 9. Biometria por idade em 2022 (doc §4)

- **Fato, conferido no bruto do AC (2022):** 16–17 anos, 12.769 de 12.784 sem biometria (99,88%); 18–20 anos, 56,98%; 21–24 anos, 6,33%; 25+, 3,71%. O padrão é o mesmo do país no doc (99,98%, 64,71%).
- **O que não é Fato:** "o alistamento feito a distância durante a pandemia não coletava a digital". É contexto público de fora dos arquivos, plausível, mas não está nos dados. Deve ficar como **Hipótese (contexto)**.
- **Consequência que o doc tira e que se sustenta:** em 2022, "seção 100% biométrica" não marca o eleitor recente. Por isso o teste de recência pelo perfil não tem equivalente em 2022, e a comparação das duas eleições nesse ponto fica fraca.

---

## Item 10. A explicação benigna está sendo aceita cedo demais? (doc, "O que é explicação benigna conferida")

**O que o doc faz bem:** a recência fica rotulada como **Hipótese** e "a forma pela qual o cartório distribui as inscrições novas entre as seções não está nos arquivos" está escrito.

**O que não se sustenta:**
1. O título "**Explicação benigna conferida (Fato)**" cobre quatro itens. Os itens 1 e 2 dizem **onde** está o excesso (seção nova em local novo, 100% biométrica, diferente do local, em local que ganhou adultos) e que ele é transitório. Isso é Fato como descrição. Não confere que a causa é benigna. Só o item 3 (TTE, revisão biométrica, renumeração) testa explicações, e o TTE pesa mais do que o texto diz (item 5).
2. Em §3, "O que distingue a nova não é a idade nem a biometria em si, mas ser um grupo recém-formado" vem como Fato. É interpretação. O controle por tamanho, idade e biometria deixa sem base 113 das 408 novas com 95%+; somando o crescimento do local, ficam sem base **266 das 408**. O controle mais completo vale para um terço da cauda.
3. "É gente viva, que mora ali e acabou de ir ao cartório" é suposição. Pelo princípio 8, a comprovação de domicílio no alistamento e na transferência é conferida por pessoas (servidor do cartório) e não conta como controle. A biometria no cadastro prova que uma pessoa viva foi ao cartório. Não prova que ela mora ali.

**Explicação alternativa que produz os mesmos sinais e não foi testada (Hipótese).** Transferência ou alistamento de eleitores que não moram no lugar, feitos em grupo e em pouco tempo (a irregularidade de cadastro conhecida como transferência irregular de domicílio eleitoral). Ela daria:
- seção nova, criada para receber as inscrições;
- cadastro 100% biométrico, porque cada eleitor vai pessoalmente ao cartório;
- composição diferente da do local e local que "ganhou adultos";
- comparecimento muito alto e estável nos dois turnos, se os eleitores forem levados para votar;
- diluição com o tempo, quando a seção recebe eleitores comuns.

Não é fraude na urna nem voto de morto. Nada no doc separa essa leitura da recência benigna. O argumento do doc de que "um mecanismo que aproveitasse a seção nova para votos indevidos não precisaria produzir os outros sinais juntos" vale contra fraude na urna e contra título de morto. Não vale contra irregularidade de cadastro com eleitor vivo.

**Testes possíveis com dado público (Recomendação):** eleitorado do município de 2022 para 2026 contra a população estimada do IBGE, e a concentração das novas com 95%+ nos municípios em que o eleitorado cresceu mais que a população. Com LAI: número de transferências por seção nos 12 meses antes do fechamento do cadastro, e o município de origem delas (agregado, sem dado pessoal).

**Liberação sem digital nas novas com 95%+ (teste novo, Fato).** É o canal da H07: eleitor com digital cadastrada liberado pelo mesário com "dado digitado confere". No 2º turno de 2026 (BU, universo completo):

| Grupo | Seções | Votantes | Liberados pelo ano de nascimento | Liberados por dado digitado |
|---|---:|---:|---:|---:|
| Novas com 95%+ | 433 | 69.999 | 0,79% | **6,38%** |
| Antigas com 95%+ | 206 | 40.771 | 3,90% | 9,24% |
| Novas abaixo de 95% | 40.307 | 8.925.654 | 3,11% | 6,53% |
| Antigas abaixo de 95% | 458.232 | 119.198.819 | 5,85% | 6,75% |

1º turno: 6,68%, 10,11%, 6,65% e 6,66%.

Só nas seções em que o cadastro não tem nenhum eleitor sem biometria (2º turno): novas com 95%+, 385 seções, 6,40% por dado digitado; antigas com 95%+, 34 seções, 10,44%; novas abaixo de 95%, 6,44%; antigas abaixo, 7,08%. Contra antigas 100% biométricas do mesmo tamanho, as novas com 95%+ tiveram **3.853** liberações por dado digitado onde se esperariam 5.394 (0,71 vez). No 1º turno, 0,68 vez. A primeira tabela reproduz os 7,17% do doc 08 (0,79% + 6,38%).

- **Fato:** a liberação por dado digitado nas novas com 95%+ não é maior que a das outras seções. É menor que a das antigas com 95%+. Se o comparecimento a mais viesse de votos liberados pelo mesário sem a digital, essa taxa subiria nessas seções. Não sobe.
- **Limite:** isso afasta o uso **em massa** desse canal nessas seções. Não afasta um uso pequeno, nem a irregularidade de cadastro acima, em que o próprio eleitor vota com a própria digital.

---

## Leitura do código (`demografo-novas-2022-analise.mjs`)

- **Definições de "nova" e "local novo":** iguais às do doc 08 e às minhas. Nenhum filtro silencioso além dos declarados, salvo a exclusão das seções do Sistema de Apuração e sem arquivo (72 e 70), que vem do doc 08 e não é contada no doc 11.
- **Comparação de 95%:** `comp / aptos >= 0.95` em ponto flutuante. Com números inteiros pequenos dá o mesmo que a conta inteira que usei (`comp × 100 >= 95 × aptos`): os resultados batem.
- **Separador de CSV:** `split(';')` sem respeitar aspas. Não errou nenhuma linha nos arquivos lidos (conferido com leitor próprio), mas é frágil para nomes de local com ponto e vírgula.
- **TTE estimado:** a validação conta `est <= 0` e o texto diz "zero" (item 5).
- **Controles com estrato:** as novas sem antiga no estrato saem da conta sem aviso no texto sobre quantas delas são da cauda (item 6).
- **Perfil de 2022 por seção:** só a seção principal; as agregadas de 2022 ficam fora porque o principal não é conhecido. Declarado no doc.

---

## Explicações alternativas: testadas e supostas

| Explicação | Situação |
|---|---|
| Erro de leitura dos arquivos (aspas, colunas, linhas repetidas) | **Testada:** leitor próprio, colunas pelo nome, 0 linha repetida ou mal formada; detalhe de 2026 = BU nas 499 mil seções |
| Volta à média comum | **Testada:** explica cerca de 3,5 dos 6,44 pontos; com crescimento, cerca de 4,25 |
| Tamanho da seção | **Testada** pelo doc (padronização) e aqui (modelo com 1/√aptos) |
| Eleitor em trânsito (TTE) | **Testada em 2026** com o TTE exato: explica mais da metade do excesso e dois terços do "fenômeno novo" dos locais existentes, mas não todo. **Não testável em 2022** com a régua sem calibração |
| Renumeração de seção | **Lida, não refeita.** O argumento do doc (renumerar aumenta observadas e esperadas juntas) está certo se a seção renumerada se comporta como antiga |
| Renumeração de local | **Não medida.** 14.481 antigas em local "novo" em 2026, contra 3.398 em 2022 |
| Revisão biométrica do município | **Lida, não refeita.** O código está certo; o resultado (excesso em todas as classes) não depende das ressalvas deste parecer |
| Recência no cadastro (alistamento, transferência, revisão) | **Suposta.** Combina com os sinais, sem dado direto. Pendente (LAI) |
| Transferência ou alistamento irregular de eleitor que não mora ali | **Não testada.** Produz os mesmos sinais (item 10) |
| Votos liberados pelo mesário sem a digital | **Testada:** a taxa não sobe nas novas com 95%+ |
| Fraude na urna ou pacote trocado | Fora deste doc. Parecer 38 e engenheiro 09: nenhum pacote trocado nem seção fantasma |

---

## O que pode ir para o relatório de perícia

**Fato (universo completo, conferido, com script):**
- As contagens diretas de seções e de seções com 95%+ por grupo: novas e antigas; local novo e local existente; com e sem TTE; com 0% sem biometria. Nos dois turnos, em 2022 e 2026. Os números estão em `cruzamento-resumo.json` e foram refeitos por dois caminhos.
- A coorte de 2022 em contagem direta: das 118 novas com 95%+ em 2022, 18 passaram de novo em 2026; das 81.749 novas de 2022 que existem em 2026, 41 passaram de 95% (0,050%), contra 171 de 379.447 antigas (0,045%).
- A queda média das seções que passaram de 95% em 2022: novas de 96,06% para 89,31%; antigas de 95,77% para 92,16%.
- O perfil de 2022 soma 156.454.011 eleitores, igual à soma dos aptos do resultado por seção de 2022.
- A falta de biometria por idade em 2022 e 2026 (99,98% dos 16–17 anos em 2022).
- A liberação por dado digitado nas novas com 95%+ (6,38%), contra 9,24% nas antigas com 95%+ e 6,75% nas demais.

**Fica fora do relatório (Estimativa, depende de modelo):** os "esperados" e os excessos (+54,3, −19,8, +213,5, +128,3, +342,5), as razões, a decomposição dos cerca de 288 (72 / 89 / 127), os 2,2 pontos que a nova perde a mais e a régua de TTE "aptos − cadastro". Podem aparecer só como frase qualitativa ("mesmo comparando com seções antigas do mesmo tamanho, a diferença diminui mas não some"), como o relatório já faz, e sem número.

**Hipótese:** a recência no cadastro; a transferência ou alistamento irregular de quem não mora ali; o peso de seções de trânsito; a pandemia como causa da falta de digital em 2022.

**Pendente:** data da última operação no cadastro, agregada por seção (LAI); ato e motivo de criação das seções novas; regra de distribuição das inscrições novas; TTE por seção de 2022; comparecimento de 2024 da coorte de 2022; transferências por seção nos 12 meses antes do fechamento do cadastro.

**Correção ao relatório atual.** O tópico 6 diz que o excesso de 2022 "desapareceu nos anos seguintes". Pelo item 1, isso vale para o conjunto das seções novas de 2022, mas não para as que ficavam em prédio novo, que ainda passam de 95% acima do esperado em 2026, sobretudo no 1º turno. A frase deve mudar (texto abaixo).

---

## Texto para leigos

### Para o tópico 6 (títulos de falecidos): substitui o parágrafo "no mesmo prédio de votação..." e a linha Pendente da parte "Outro fenômeno vizinho"

> **As seções novas de 2022, acompanhadas até 2026 (Fato).** Para saber se o comparecimento muito alto das seções novas se mantém com o tempo, as seções que eram novas em 2022 (número que não existia em 2018 ou em 2020) foram acompanhadas até 2026, pelo mesmo número. Os números abaixo são do 2º turno e contam todas as seções do país.
>
> | 2º turno | Seções novas de 2022 | Seções antigas de 2022 |
> |---|---:|---:|
> | Seções em 2022 | 85.893 | 386.182 |
> | Com 95% ou mais de comparecimento em 2022 | 118 | 114 |
> | As mesmas seções que ainda existem em 2026 | 81.749 | 379.447 |
> | Com 95% ou mais em 2026 | 41 | 171 |
>
> **Como ler:** em 2022, passaram de 95% 0,14% das seções novas (118 de 85.893) e 0,03% das antigas (114 de 386.182). Em 2026, as mesmas seções passaram de 95% quase na mesma proporção: 0,050% das que eram novas e 0,045% das antigas.
>
> Das 118 seções novas que passaram de 95% em 2022, 112 ainda existem em 2026. Somadas, tiveram 96,1% de comparecimento em 2022 e 89,3% em 2026. As 111 antigas na mesma situação (das 114) foram de 95,8% para 92,2%. Toda seção que fica muito acima da média numa eleição tende a ficar mais perto da média na seguinte, como o aluno que tirou a nota máxima numa prova e tira um pouco menos na próxima. A seção nova caiu mais que a antiga. Isso também aparece nas 2.640 seções novas que tinham entre 90% e 95% em 2022: em média, perderam 3,9 pontos, contra 1,7 das 5.256 antigas do mesmo nível. A seção nova também cresceu mais: foi de 173 para 239 eleitores em média, e a antiga, de 203 para 217. Com a entrada de eleitores comuns, o grupo do começo se diluiu.
>
> **Mas a queda não foi completa (Fato).** Em 2022, as seções novas muito altas estavam sobretudo nas instaladas num **prédio de votação novo**: 62 das 4.585 seções assim passaram de 95% (1,35%). Em 2026, 16 das 4.302 que ainda existem passaram de 95% no 2º turno, e 21 de 4.330 no 1º turno. Comparando com seções antigas do mesmo tamanho, elas ainda passam de 95% mais vezes, sobretudo no 1º turno. A diferença dessas seções diminuiu muito em quatro anos, mas não sumiu.
>
> **Onde ficam as seções novas muito altas (Fato).** Aqui, "prédio novo" é o local de votação cujo número não existia na eleição geral anterior. Um prédio antigo que mudou de número conta como novo.
>
> | 2º turno | Seções em 2022 | Com 95%+ em 2022 | Seções em 2026 | Com 95%+ em 2026 |
> |---|---:|---:|---:|---:|
> | Nova, em prédio novo | 4.585 | 62 | 10.816 | 247 |
> | Nova, em prédio que já existia | 80.247 | 55 | 27.719 | 184 |
> | Nova, em zona eleitoral nova | 1.061 | 1 | 2.205 | 2 |
> | Antiga | 386.182 | 114 | 458.438 | 206 |
>
> **Como ler:** no 2º turno de 2022, a seção nova num prédio que já existia passou de 95% tanto quanto a antiga do mesmo tamanho. Em 2026, ela passa bem mais. Essa é a principal mudança de uma eleição para a outra. A outra é que em 2026 há mais que o dobro de seções novas em prédio novo.
>
> **Eleitores em trânsito (Fato).** Quem pede para votar fora da sua seção, o eleitor em trânsito, quase sempre vai votar, porque pediu. Em 2026, das 433 seções novas que passaram de 95% no 2º turno, 239 tinham pelo menos um eleitor em trânsito. Destas, 25 eram seções só de trânsito, sem nenhum eleitor do cadastro do local, por exemplo em Recife e em João Pessoa.
>
> | 2º turno de 2026 | Seções novas | Novas com 95%+ | Seções antigas | Antigas com 95%+ |
> |---|---:|---:|---:|---:|
> | Sem eleitor em trânsito | 24.080 | 194 | 324.346 | 158 |
> | De 1 a 3 eleitores em trânsito | 12.746 | 132 | 113.639 | 42 |
> | 4 ou mais eleitores em trânsito | 3.914 | 107 | 20.453 | 6 |
>
> **Como ler:** o eleitor em trânsito explica uma parte grande das seções novas muito altas, mas não todas. Mesmo sem nenhum eleitor em trânsito, a seção nova passa de 95% mais vezes que a antiga do mesmo tamanho, também nos prédios que já existiam. O arquivo de 2022 não informa o eleitor em trânsito por seção. Por isso não se sabe quanto da diferença entre 2022 e 2026 vem dele (**Pendente**).
>
> **Cadastro todo com biometria (Fato).** Das 16.917 seções novas em que todos os eleitores do cadastro constam com biometria, 385 passaram de 95% no 2º turno (2,3%). Das 23.456 antigas assim, 34 passaram (0,14%). Nas seções novas em que algum eleitor não tem biometria, quase nenhuma passou de 95%: 23 de 23.527. No cadastro público, "com biometria" inclui quem tem só a foto, sem a digital (ver o tópico 8).
>
> **Liberação sem digital (Fato).** Quando a digital de um eleitor que tem biometria cadastrada não é reconhecida, o mesário pode liberá-lo pelos dados do documento. Se o comparecimento a mais dessas seções viesse de eleitores liberados assim, essa via subiria nelas. Ela não subiu.
>
> | 2º turno de 2026 | Votantes | Liberados pelo mesário sem a digital | Parte dos votantes |
> |---|---:|---:|---:|
> | Seções novas com 95%+ | 69.999 | 4.468 | 6,38% |
> | Seções antigas com 95%+ | 40.771 | 3.768 | 9,24% |
> | Demais seções | 128.124.473 | 8.624.252 | 6,73% |
>
> **Como ler:** nas seções novas muito altas, 6,38 de cada 100 votantes foram liberados pelo mesário sem a digital. É menos do que nas antigas muito altas e quase o mesmo que nas demais seções do país. As seções apuradas em cédula e as sem arquivo de urna ficam fora.
>
> **Hipótese (sem fraude):** a seção nova de 2026 reúne, em boa parte, eleitores que acabaram de passar pelo cartório: quem tirou o primeiro título, quem mudou de endereço e quem fez a biometria. Isso combina com o que se vê: seção mais jovem, cadastro todo com biometria, prédio que ganhou moradores e queda do excesso com o tempo. Não foi conferido com a data em que cada eleitor passou pelo cartório.
>
> **Hipótese (irregularidade no cadastro, não testada):** os mesmos sinais aparecem se eleitores que não moram no lugar forem transferidos para lá em grupo e levados para votar. Cada um tem a própria digital e vota com ela. Não seria fraude na urna nem voto de pessoa morta, mas seria uma irregularidade no cadastro. A comprovação de endereço no cartório é feita por pessoas e não deixa rastro técnico nos arquivos públicos. Os dados públicos não separam essa leitura da anterior.
>
> **O que isso não permite dizer:** o exame mede cadastro e comparecimento. Ele não diz se algum voto foi irregular, nem quem votou. A diferença entre as seções novas e as antigas foi refeita por uma segunda verificação independente, que leu de novo os arquivos do TSE com outro programa e chegou aos mesmos números.
>
> **Pendente:** pedir à Justiça Eleitoral, só em números e sem dados pessoais:
> - quantos eleitores de cada seção nova fizeram alistamento, transferência ou revisão no cadastro nos 12 meses antes do fechamento, e de que município vieram os transferidos;
> - o ato e o motivo da criação de cada seção nova com 95% ou mais;
> - o número de eleitores em trânsito por seção em 2022.

### Para o tópico 14 (outras formas de fraude): substitui a linha "Pendente: comparar com o comparecimento das mesmas seções em 2022"

> - **Fato:** as seções novas de 2022 foram acompanhadas até 2026. O excesso de seções novas muito altas de 2022 diminuiu muito em quatro anos, mas não sumiu nas que ficavam em prédio de votação novo (ver o tópico 6).
> - **Fato:** em 2026, das 433 seções novas que passaram de 95% no 2º turno, 239 tinham eleitor em trânsito (25 eram só de trânsito) e 385 tinham o cadastro todo com biometria. Nelas, a liberação pelo mesário sem a digital (6,38% dos votantes) foi menor que nas antigas com 95% ou mais (9,24%).
> - **Pendente:** a data da última operação no cadastro dos eleitores de cada seção nova, o motivo da criação de cada uma e o eleitor em trânsito por seção em 2022.


---

## Checagens rodadas

- `node --check` nos três scripts novos.
- Leitura própria dos 56 zips do perfil (2022 e 2026), dos 4 zips do detalhe (2018, 2020, 2022 e 2026) e dos CEFT de 2022 e 2024, com separador que respeita aspas: 0 linha mal formada, 0 linha repetida.
- Comparecimento de 2026 por duas fontes (detalhe × BU): 0 diferença em 499.176 e 499.178 seções.
- Casos no bruto:
  - PI 12335/0068/0092 (detalhe de 2022 e BU de 2026);
  - PB 20516/0076/0448 (BU de 2026, seção só de trânsito);
  - PI 10324/0016/0187 (perfil de 2026 e banco);
  - perfil de 2022 do AC por idade e biometria;
  - data de geração da primeira linha dos 28 perfis de 2022.
- Estabilidade entre turnos refeita: 229 de 433 e 58 de 206 (2026); 70 de 118 e 45 de 114 (2022). Igual ao doc.
- **Não refeito, só lido no código:** dissimilaridade de Duncan, geração adulta do local, revisão biométrica do município, excesso por UF e a parte D (convergência das novas de 2022).

## Recomendações ao demógrafo (sem editar o doc 11)

1. Trocar "como coorte, o excesso pelo tamanho some" por "o excesso dos locais novos de 2022 caiu de 6,8 para 1,65 vez no 2º turno e de 11,1 para 4,6 vezes no 1º" (item 1).
2. Mostrar a decomposição nas duas ordens e rotular as partes "volume" e "taxa" como dependentes da ordem (item 4).
3. Corrigir "dá zero em todas" para "nunca dá positivo (155.914 zero e 192.512 negativo)", dizer que a régua mede saldo e mostrar o TTE exato de 2026 por categoria (item 5).
4. Dizer que as 296 novas "sem perfil" são as seções só de trânsito (item 6).
5. Dizer quantas das 408 novas com 95%+ ficam fora de cada controle (item 6).
6. Comparar a parcela sem biometria dos mesmos locais nos dois anos, ou retirar a frase (item 8).
7. Tirar o título "Explicação benigna conferida (Fato)": os itens 1 e 2 dizem onde está o excesso, não que a causa é benigna. Incluir a transferência irregular de domicílio entre as explicações não testadas (item 10).
8. Declarar com contagem a exclusão de 72 e 70 seções (Sistema de Apuração e sem arquivo).
