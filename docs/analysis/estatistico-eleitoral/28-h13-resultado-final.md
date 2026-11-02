# 28. H13, fechamento: resultado final

Estatístico eleitoral, **02/11/2026**. Plano pré-registrado: [27](27-h13-plano-final.md), gravado sozinho no **commit 89ede09** antes de qualquer conta. O que não estava no plano está marcado **exploratório**. O que mudou em relação ao plano está na seção "Desvios do plano".

## Veredito final

**H13: fato que pede explicação.** O sinal que obriga essa forma está fora do Nordeste.

- **Teste declarado:** em Minas Gerais, a variação, entre os turnos, da liberação à mão com mesário identificado (V3m) acompanha a variação do voto no 13 (+1,93 pontos por 100% do cadastro; z 4,15). Essa associação não existia em 2022 (−1,21). Pela regra fixada antes, é um sinal novo.
- **Exploratório:** ela vem das seções em que a V3m **caiu** no 2º turno, que ganharam menos voto no 13. Isso não tem a forma de voto inserido pela mesa.

**A parte "sobretudo no Nordeste" fica sem sinal nos dados públicos.** Nenhuma UF do Nordeste, nem a média do Nordeste, nem o exame nominal de CE, PB e PE mostra liberação sem digital ligada a mais voto no 13. O teste, porém, não tem poder para descartar efeitos de dezenas de milhares de votos (seção 1.5).

**Peso no resultado: nenhum.** Mesmo que todo o sinal novo de MG fosse fraude, ele equivaleria a cerca de 25 mil votos, contra uma margem de 4.430.191.

**O diário não tem buraco.** Em 2026 não há nenhuma seção com boletim e diário sem votos, nos dois turnos.

## Resposta curta

- **Método único (b), 27 UFs, 192 testes, Bonferroni (p ≤ 2,604 × 10⁻⁴).** Oito testes passam.
  - **A favor do 13, só no painel:** MG V2 +5,68 (z 4,19), RS V2 +9,66 (z 3,69) e MG V3m +1,93 (z 4,15).
  - **Contra o 13, só no nível do 2º turno, e já assim no 1º turno:** ES, RJ e SP na V2, e SP na V3m e na V3s.
  - A média do Brasil e a do Nordeste não passam em nenhuma via e em nenhum desfecho, e a diferença Nordeste − resto também não.
- **Classificação pela regra:**
  - MG V2 e RS V2 são **estáveis**: o teste direto com os diários de 2022 já mostrava a mesma associação (docs 24 e 26).
  - MG V3m é **novo**: em 2022 dava −1,21 (z −2,59), pelo doc 24 e pelo parecer 48.
- **Exame nominal (a), CE, PB e PE:** nenhum dos 12 testes passa.
  - As seções em que um único mesário liberou 25% ou mais dos votos (30 no 2º turno; 8 com metade ou mais) não têm excesso de voto no 13: nenhuma está na cauda.
  - Nas seções de liberação alta, o excesso de 13 aparece um pouco mais em PB e PE (p 0,002 e 0,013, sem passar). Isso já estava no 1º turno, mais forte, e some no painel: é estrutural, não do 2º turno.
  - Nenhum mesário liberou em locais diferentes no 2º turno. A maior rajada foi de 10 liberações do mesmo mesário em 10 minutos.
- **Diário sem votos (c), 2026, dois turnos, universo inteiro:**
  - **0 casos** de boletim com votos e diário sem nenhum voto. Nenhum caso como o de RS 87912/0060/0322.
  - Há 15 diários **parciais**: 9 no 1º turno (159 votos) e 6 no 2º (54 votos). Doze têm marca de falha. Três não têm marca e somam 4 votos. Em 3 desses 4 votos, a confirmação de cargo está no diário e falta só a linha final.
  - **Não pesam no resultado.**
- **H13-L (literal):** em todas as 27 UFs o cerco aritmético vai de menos de 6% a mais de 79%. "A maioria dos liberados votou no 13" é **não decidível (voto secreto)**.
  - Só no exterior o cerco decide: 52,47% no 2º turno, porque lá todos os eleitores entram pela V2.
  - Estimativa ecológica no Nordeste (Hipótese de modelo): os liberados deram ao 13 o mesmo que os eleitores pela digital, ou menos. Em PE, 69,8% pela V3m contra 69,0% pela digital; em PB, 56,8% pela V2 contra 67,7%.

## Comandos

```bash
node --max-old-space-size=16000 scripts/auditoria/estatistico-h13-final-modelo.mjs        # seção 4: 27 UFs, estágio 2, cerco
node --max-old-space-size=8000  scripts/auditoria/estatistico-h13-final-diario-vazio.mjs  # seção 6 (com --so-controle: só 2022)
node --max-old-space-size=12000 scripts/auditoria/estatistico-h13-final-nominal.mjs       # seção 5: CE, PB, PE
node scripts/auditoria/estatistico-h13-final-decisao.mjs                                    # 192 testes e regra da seção 8
# exploratório (fora do plano)
node --max-old-space-size=8000  scripts/auditoria/estatistico-h13-final-mg-v3m.mjs
node --max-old-space-size=12000 scripts/auditoria/estatistico-h13-final-nominal.mjs --ufs mg --nome nominal-mg --turnos 2
```

Biblioteca comum: `scripts/auditoria/estatistico-h13-final-lib.mjs`. Saídas em `data/parsed/auditoria/estatistico/h13-final/`: `modelo.json`, `ufs.csv`, `cerco.csv`, `nominal.json`, `diario-vazio.json`, `diario-vazio-controle.json`, `testes.csv` (os 192), `decisao.json`, `mg-v3m.json` e `nominal-mg.json`.

## Conferências (seção 9 do plano)

| # | Conferência | Resultado |
|---|---|---|
| 1 | Vias do 2º turno, com a união das cópias, contra o doc 18 | Iguais: V1 111.970.297, V2 7.632.421, V3m 5.841.108 e V3s 2.791.363, com o exterior. São 128.235.189 votos no diário contra 128.235.243 no BU; os 54 que faltam são das 6 seções do item (c) |
| 2 | MG e RS, painel, V2, contra os docs 24 e 26 | Iguais: MG +5,68 (z 4,19, 49.462 seções); RS +9,66 (z 3,69, 24.405 seções) |
| 3 | Injeção de 10% dos V3m do Nordeste no 13 (N2) | μ_NE da V3m vai de −0,45 para +2,35 (t 5,36) e passa. O modelo vê fraude quando ela existe |
| 4 | Controle positivo do classificador de diário vazio (5 seções de 2022) | RS 87912/0060/0322 sai "D0 sem marca" nos dois turnos (BU 300 e 309, diário 0). As outras 4 saem com marca no turno do diário curto (contingência, Recuperador de Dados, log corrompido, energia). A lista de marcas ficou como no plano |
| 5 | Cobertura do banco contra o disco | 499.248 seções por turno; com BU, 499.176 (1º) e 499.178 (2º); todas com diário lido. Sem comparecimento no banco: 41 seções do exterior "sem arquivo", 29 apurações por cédula no exterior e, no 1º turno, 2 apurações mistas por cédula em MG |
| 6 | V3m da leitura nominal contra o `h08` | Iguais (V3m e votos) nas 55.895 seções de CE, PB e PE, nos dois turnos. No exploratório de MG, 52.062 de 52.062 |
| 7 | Bruto | Conferidas com `exportar.js --log dia`: as 3 seções de diário parcial sem marca (seção 3); as 5 seções acima do corte na triagem e as seções de maior concentração por mesário e de maior rajada (seção 2), com BU e liberações por mesário iguais às da medida. Em CE 15598/0024/0330 e 0189, o `exportar` mostra só o log da urna reserva. A contagem própria no log aninhado da urna original dá 172 + 130 = 302 e 26 + 245 = 271, iguais ao BU |
| 8 | Segredo | Busca de 11 a 13 dígitos seguidos (fora de casas decimais) em todas as saídas e neste doc: 0. Nenhum identificador de mesário gravado |

## 1. Método único nas 27 UFs (b)

### 1.1 Amostras

- **Seções no modelo** (em locais com 2 ou mais seções): N2 475.671, P 475.658, N1 475.666.
- **Exclusões, somadas nas 27 UFs:**
  - sem perfil: 331 (N2), 326 (P), 339 (N1);
  - menos de 20 votos em 13 + 22: 66, 76 e 61;
  - diário diferente do BU: 6, 15 e 9;
  - sem a seção nos dois turnos: 2 (P).
- Por UF, as exclusões estão em `ufs.csv`.
- **Exterior:** não identificável. Todos os eleitores entram pela V2, então não há grupo pela digital para comparar. O exterior entra só no cerco e no item (c).

### 1.2 Estágio 1 por UF (Hipótese de modelo)

O β está em pontos de parcela do 13 (13 / (13 + 22)) por 100% de exposição; entre parênteses, o z. Os desfechos são:

- **nível (N2):** a exposição é a parte dos votantes do 2º turno liberada pela via;
- **painel (P):** a exposição é a variação da via entre os turnos, sobre os eleitores do cadastro, com a variação do comparecimento no modelo. O β é a **parte própria** da via.

Em negrito, o que passa por Bonferroni.

| UF | Seções (P) | V2 nível | V3m nível | V3s nível | V2 painel | V3m painel | V3s painel |
|---|---|---|---|---|---|---|---|
| AL | 7.072 | −5,88 (−0,73) | −0,34 (−0,27) | −0,56 (−0,35) | −1,20 (−0,19) | 0,61 (0,72) | 0,01 (0,14) |
| BA | 32.589 | −0,02 (−0,01) | −1,03 (−1,77) | −0,54 (−0,92) | −2,37 (−1,01) | 0,01 (0,03) | −0,03 (−0,05) |
| CE | 21.590 | −2,97 (−1,16) | 0,42 (0,45) | 0,74 (0,65) | 2,93 (0,86) | 0,20 (0,33) | −0,33 (−0,46) |
| MA | 15.900 | −5,03 (−1,59) | −1,34 (−1,16) | 0,99 (0,80) | 3,43 (0,90) | −0,11 (−0,13) | 1,22 (1,30) |
| PB | 10.589 | −10,71 (−2,17) | −0,16 (−0,11) | 2,80 (1,76) | 8,53 (1,34) | 1,30 (1,14) | 2,29 (1,90) |
| PE | 21.097 | 2,56 (1,32) | −0,78 (−0,96) | 0,31 (0,32) | −1,34 (−0,60) | 0,61 (0,89) | −0,59 (−0,79) |
| PI | 8.975 | −10,57 (−1,79) | −0,90 (−0,70) | −2,52 (−1,74) | −12,28 (−1,71) | 1,15 (1,13) | 1,05 (0,97) |
| RN | 7.933 | −8,56 (−2,00) | 1,37 (0,90) | −1,08 (−0,60) | 6,74 (1,10) | 0,88 (0,74) | 1,55 (1,21) |
| SE | 5.764 | −6,86 (−1,25) | 0,10 (0,06) | 0,37 (0,17) | 14,21 (1,78) | 0,60 (0,43) | −0,02 (−0,01) |
| AC | 2.143 | −9,18 (−1,11) | −1,59 (−0,40) | −7,30 (−1,32) | 31,45 (2,90) | −3,27 (−0,84) | −2,54 (−0,60) |
| AM | 7.690 | −14,58 (−3,08) | −1,12 (−0,54) | −0,37 (−0,15) | −2,54 (−0,48) | 0,28 (0,17) | −0,74 (−0,43) |
| AP | 1.813 | 21,00 (1,66) | 0,35 (0,07) | 0,74 (0,12) | −1,29 (−0,11) | −0,05 (−0,01) | −1,69 (−0,38) |
| DF | 6.954 | 5,17 (1,09) | −5,16 (−2,07) | −6,86 (−2,29) | 1,07 (0,15) | −2,36 (−1,24) | −3,25 (−1,59) |
| ES | 9.551 | **−11,89 (−5,38)** | −2,85 (−1,54) | −2,17 (−1,08) | 3,02 (1,03) | 0,63 (0,57) | 1,11 (0,96) |
| GO | 15.440 | 7,45 (2,76) | 2,23 (1,91) | 1,55 (1,13) | 10,83 (3,59) | 1,68 (1,77) | 1,80 (1,91) |
| MG | 49.462 | −2,78 (−2,74) | −0,40 (−0,53) | −0,73 (−0,89) | **5,68 (4,19)** | **1,93 (4,15)** | 0,85 (1,14) |
| MS | 6.983 | 1,06 (0,35) | −2,44 (−1,22) | −2,94 (−1,37) | 4,04 (0,73) | 0,99 (0,71) | 1,13 (0,74) |
| MT | 7.983 | 3,92 (1,08) | −0,61 (−0,34) | 1,42 (0,70) | 5,35 (1,13) | −1,31 (−1,04) | −1,93 (−1,49) |
| PA | 18.505 | −0,81 (−0,28) | −2,70 (−2,23) | −3,07 (−2,41) | 0,73 (0,22) | 0,53 (0,53) | −0,61 (−0,57) |
| PR | 26.142 | 3,38 (0,77) | −1,49 (−1,48) | −0,64 (−0,58) | 9,05 (1,32) | 1,14 (1,72) | 1,27 (1,75) |
| RJ | 37.377 | **−6,96 (−5,26)** | −2,90 (−3,65) | −2,31 (−2,75) | 6,96 (3,33) | −1,53 (−2,43) | −0,07 (−0,11) |
| RO | 4.581 | −5,78 (−0,81) | −0,26 (−0,10) | 0,66 (0,21) | 9,68 (0,97) | −1,29 (−0,74) | −1,43 (−0,74) |
| RR | 1.420 | −11,12 (−1,08) | −2,93 (−0,48) | −5,91 (−0,71) | −22,76 (−1,77) | 3,01 (0,73) | −7,34 (−1,59) |
| RS | 24.405 | −0,55 (−0,32) | −1,74 (−1,82) | −0,98 (−0,96) | **9,66 (3,69)** | −0,18 (−0,25) | 0,42 (0,58) |
| SC | 16.221 | 5,87 (2,10) | −2,66 (−2,28) | −2,57 (−1,97) | 6,38 (1,92) | 0,05 (0,06) | 0,21 (0,23) |
| SP | 103.276 | **−5,15 (−5,32)** | **−3,59 (−6,39)** | **−3,27 (−5,24)** | 5,62 (3,58) | 0,10 (0,23) | 0,14 (0,32) |
| TO | 4.203 | −10,55 (−1,88) | 0,93 (0,29) | −2,28 (−0,62) | 8,02 (0,85) | −0,72 (−0,32) | −0,23 (−0,10) |

**Leitura:**

- No Nordeste, o maior z positivo é 1,90 (PB, V3s no painel). Sob o acaso, com 54 testes do Nordeste, isso é esperado.
- Abaixo do corte, mas acima de z 3, estão GO V2 painel (+10,83, z 3,59), SP V2 painel (+5,62, z 3,58) e RJ V2 painel (+6,96, z 3,33). É o mesmo padrão V2 do painel de MG e do RS, e nenhum deles passa.

### 1.3 Estágio 2: Brasil, Nordeste e diferença (efeitos aleatórios; HKSJ com piso; t com 26 ou 25 gl)

Corte de Bonferroni no p: 2,604 × 10⁻⁴, o que equivale a |t| ≥ 4,22 (26 gl) ou 4,25 (25 gl). τ² é a variância entre UFs além do acaso, e I² é a parte da variação que é real.

| Desfecho | Via | μ_BR (t; p) | μ_NE (t; p) | δ_NE = NE − resto (t; p) | τ² | I² |
|---|---|---|---|---|---|---|
| N2 | V2 | −2,68 (−2,23; p 0,034) | −3,97 (−1,86; p 0,074) | −1,89 (−0,73; p 0,47) | 16,68 | 74% |
| N2 | V3m | −1,22 (−3,69; p 0,001) | −0,45 (−1,00; p 0,33) | +1,36 (2,30; p 0,030) | 1,08 | 45% |
| N2 | V3s | −0,97 (−2,66; p 0,013) | +0,01 (0,02; p 0,99) | +1,70 (2,70; p 0,012) | 1,28 | 44% |
| P | V2 | +4,19 (3,79; p 8,1 × 10⁻⁴) | +0,72 (0,43; p 0,67) | −5,09 (−2,53; p 0,018) | 10,61 | 49% |
| P | V3m | +0,36 (1,81; p 0,081) | +0,44 (1,36; p 0,19) | +0,14 (0,33; p 0,74) | 0,22 | 23% |
| P | V3s | +0,11 (0,97; p 0,34) | +0,07 (0,49; p 0,63) | −0,20 (−0,70; p 0,49) | 0,02 | 3% |
| N1 (linha de base) | V2 | −4,24 (−3,01) | −7,64 (−3,19) | −4,99 (−1,71) | 19,38 | 75% |
| N1 | V3m | −1,22 (−3,03) | −0,20 (−0,35) | +1,65 (2,20) | 2,08 | 59% |
| N1 | V3s | −1,34 (−2,92) | −0,22 (−0,32) | +1,76 (2,05) | 2,01 | 56% |

**Leitura:**

- Nenhum dos 18 testes do estágio 2 passa.
- O que chega perto é o padrão já conhecido. O painel da V2 no Brasil (+4,19, p 8 × 10⁻⁴) é puxado por MG, RS, GO, SP e RJ. No Nordeste ele é +0,72, e o Nordeste fica **abaixo** do resto (−5,09).
- No nível, o Nordeste é "menos negativo" que o resto na V3 (+1,36 e +1,70). Essa diferença já existia no 1º turno (+1,65 e +1,76) e não passa.
- **Sensibilidade, sem teste:**
  - com τ² por REML, μ_BR e μ_NE quase não mudam (no painel da V2: +4,19 e +0,21);
  - tirando uma UF de cada vez, μ_NE do painel da V2 fica entre +0,17 e +1,67, e μ_BR entre +3,81 e +4,70;
  - com efeito comum (sem τ²), o painel da V2 no Brasil dá +4,46 (z 7,17). É a leitura de "uma média só", que ignora que as UFs diferem.

### 1.4 Mínimo detectável (o que o teste veria, 80% de poder, corte de Bonferroni)

"f" é a fração dos liberados pela via (no painel, só os que vieram a mais) que, virando voto a mais num candidato, o teste pegaria. "Votos" é f × essa base.

| Desfecho | Via | Base no Nordeste | μ_NE, a favor do 13: f / votos | μ_NE, a favor do 22: f / votos | μ_BR, a favor do 13: f / votos |
|---|---|---|---|---|---|
| N2 | V2 | 1.657.318 | 44,9% / 743.678 | 13,9% / 230.633 | 13,8% / 999.360 |
| N2 | V3m | 1.793.821 | 7,6% / 136.570 | 3,2% / 57.563 | 3,5% / 206.351 |
| N2 | V3s | 815.464 | 8,6% / 70.154 | 3,4% / 27.587 | 4,0% / 111.148 |
| P | V2 | 96.114 a mais | 34,4% / 33.063 | 16,4% / 15.794 | 17,1% / 77.055 |
| P | V3m | 542.915 a mais | 8,6% / 46.824 | 3,4% / 18.291 | 3,7% / 65.895 |
| P | V3s | 301.038 a mais | 23,4% / 70.376 | 8,8% / 26.631 | 7,2% / 71.915 |

- No Nordeste, o teste é **2 a 3 vezes menos sensível a fraude a favor do 13** do que a favor do 22. Com o 13 perto de 70%, um voto a mais nele muda pouco a parcela.
- O teste por UF fica em `testes.csv`. Nas UFs pequenas, f passa de 20% e o teste é cego.

### 1.5 Equivalência no Nordeste ("refutada" exige limite abaixo de 44.302 votos)

- **Pela fórmula do plano: não vale.** A fórmula multiplica cada seção por max(2, 1/(1 − p)). Em 27 seções do Nordeste, o 22 teve 0 votos (2.596 votos no 13), e nelas 1/(1 − p) é infinito. O limite em votos fica infinito nas 6 combinações. Ver "Desvios do plano".
- **Pela calibração da injeção (variante, fora do plano): também não vale** em 5 das 6 combinações. Os limites superiores de μ_NE, em votos, são:

  | Combinação | Limite em votos |
  |---|---|
  | N2 V2 | 348.947 |
  | N2 V3m | 87.203 |
  | N2 V3s | 58.845 |
  | P V2 | 30.383 (a única abaixo da margem) |
  | P V3m | 51.605 |
  | P V3s | 65.532 |

- **Leitura:** os dados do Nordeste são compatíveis com efeito zero. Eles não conseguem descartar um efeito a favor do 13 de algumas dezenas de milhares de votos, nem, no nível da V2, de algumas centenas de milhares. Por isso o Nordeste fica **sem sinal**, e não "refutado".

### 1.6 O que passa (Fato, teste declarado)

| Teste | β (z) | Classe pela regra | Por quê |
|---|---|---|---|
| MG, painel, V2 | +5,68 (4,19) | estável | 2022: +5,94, passou (doc 24, parecer 48) |
| RS, painel, V2 | +9,66 (3,69) | estável | 2022: +8,72, passou (doc 26, parecer 51) |
| MG, painel, V3m | +1,93 (4,15) | **novo** | 2022: −1,21 (z −2,59), relatado sem teste no doc 24. A associação não existia em 2022 |
| ES, nível, V2 | −11,89 (−5,38) | contra o 13 | 1º turno: −9,07 (−3,95) |
| RJ, nível, V2 | −6,96 (−5,26) | contra o 13 | 1º turno: −6,43 (−4,72) |
| SP, nível, V2 / V3m / V3s | −5,15 / −3,59 / −3,27 | contra o 13 | 1º turno: −3,76 / −3,31 / −2,64 |

O Benjamini-Hochberg a 5% (só gerador de hipótese) aceita 17 dos 192. Os 9 a mais que o Bonferroni são:

- nível contra o 13: AM V2 (−14,58), RJ V3m (−2,90) e μ_BR V3m (−1,22);
- painel a favor do 13 na V2: AC (+31,45), GO (+10,83), RJ (+6,96), SP (+5,62) e μ_BR (+4,19). É o mesmo padrão de MG e do RS;
- **um do Nordeste:** o a1 de PB no nível (cauda de 13 × liberação alta; razão 3,46; p 0,002). Ele já estava no 1º turno, mais forte (razão 3,80; p 0,0007), e some no painel (seção 2).

## 2. Exame nominal de CE, PB e PE (a)

**Universo:** todas as seções de CE, PB e PE nos dois turnos. São 55.895 seções lidas por turno, com o diário relido ciclo a ciclo e conferido contra o `h08` em 100% delas. Nos testes entram as seções do modelo (CE 21.590, PB 10.589, PE 21.097).

**Por que "nominal" quer dizer isto:** o exame pessoa a pessoa precisaria do caderno de votação assinado, do cadastro com identidade e das imagens das digitais, e nada disso é público. O exame aqui é feito seção a seção, eleitor a eleitor pelo diário (sem identidade) e mesário a mesário (identificador só na memória).

### 2.1 Testes declarados (unilaterais, a favor do 13; corte p ≤ 2,604 × 10⁻⁴)

"Cauda" = resíduo robusto z ≥ 3. É uma seção com mais voto no 13 do que as vizinhas do mesmo prédio e do mesmo perfil, medida pela mediana e pelo MAD da UF.

| UF | Desfecho | a1: cauda entre as de liberação alta (decil superior) × nas outras | razão | p | a2: cauda entre as de mesário concentrado | p |
|---|---|---|---|---|---|---|
| CE | nível | 11 de 2.170 × 68 de 19.499 | 1,46 | 0,16 | 0 de 18 | 1,00 |
| PB | nível | 10 de 1.070 × 26 de 9.555 | 3,46 | 0,0022 | sem casos (0 seções) | — |
| PE | nível | 13 de 2.123 × 53 de 19.040 | 2,21 | 0,013 | 0 de 6 | 1,00 |
| CE | painel | 5 de 2.165 × 56 de 19.486 | 0,80 | 0,74 | 0 de 18 | 1,00 |
| PB | painel | 7 de 1.067 × 34 de 9.563 | 1,85 | 0,11 | sem casos | — |
| PE | painel | 5 de 2.116 × 45 de 19.031 | 1,00 | 0,57 | 0 de 6 | 1,00 |

- **Nenhum passa.** Em PB, o a2 não tem nenhuma seção com mesário concentrado na amostra do modelo. Pela regra, ele conta como teste, com p = 1.
- **Linha de base (1º turno, nível, sem teste):** a1 dá CE razão 2,25 (p 0,015), PB 3,80 (p 0,0007) e PE 3,27 (p 0,0002).
  - O pouco que aparece em PB e PE no 2º turno já estava no 1º, mais forte.
  - No painel, que mede o que mudou no 2º turno, some (razões 1,85 e 1,00).
  - É uma associação estrutural: seções de muita liberação sem digital tendem a ter, nos dois turnos, um pouco mais de seções muito pró-13 que as vizinhas. O perfil medido não a explica por inteiro. Ela **não** cresceu no 2º turno.

### 2.2 Mesário a mesário (Fato; só contagens)

| | 1º turno | 2º turno |
|---|---|---|
| Liberações V3m (CE + PB + PE) | 643.664 | 738.646 |
| Mesários (identificadores distintos) | 80.602 | 87.246 |
| Seções em que um só mesário liberou ≥ 25% dos votos | 28 | 30 |
| … ≥ 50% dos votos | 10 | 8 |
| Mesário que liberou em mais de uma seção | 8 (16 seções; 1 em locais diferentes) | 6 (12 seções; nenhum em locais diferentes) |
| Maior rajada do mesmo mesário em 10 minutos | 7 | 10 |
| Menor intervalo entre duas liberações do mesmo mesário | 73 s | 43 s |

**As seções de maior concentração no 2º turno (conferidas no bruto):** CE 13773/0108/0001 (147 de 188 votos liberados por um só mesário), PE 23272/0042/0046 (144 de 188), PE 23817/0105/0390 (104 de 139), CE 14753/0047/0036 (155 de 223) e PE 23817/0105/0324 (216 de 331).

- Todas têm pouquíssima habilitação por digital: 8, 7, 4, 38 e 15 votos. É o padrão de leitor de digital que não lê (H05, doc 08).
- Nenhuma está na cauda de voto no 13. A parcela do 13 nelas vai de 52% (PE 23817/0105/0324: 168 a 153) a 86% (CE 13773/0108/0001: 153 a 25), como as vizinhas.
- A maior rajada (10 em 10 minutos) é de PE 23817/0105/0324 e PE 25615/0044/0130. Isso é um voto a cada minuto, ritmo de fila. O menor intervalo do mesmo mesário é 43 s.

### 2.3 Triagem de seções (exploratória)

- **Nível:** 5 das 53.276 seções passam do corte de Bonferroni (z ≥ 4,77). São PB 19518/0062/0115 (13: 267, 22: 43), CE 14796/0044/0148, CE 14958/0057/0111, CE 13188/0078/0407 e CE 98574/0065/0197. Todas foram conferidas no BU.
  - Nenhuma tem mesário concentrado: a maior parte de um só mesário é 14% (PB 19518/0062/0115, 45 de 315).
  - A liberação sem digital nelas vai de 2,4% a 19,7% dos votos.
  - Pelo BH são 27 seções.
- **Painel:** 0 seções acima do corte; 0 pelo BH.
- Na cauda de z ≥ 3 há 181 seções pró-13 e 185 pró-22 no nível, e 152 e 108 no painel. É o que se espera de caudas um pouco mais grossas que a normal, dos dois lados.

### 2.4 Por que o M2 do parecer 18 via CE, PB e PE positivos

Com efeito fixo de **zona** em vez de local, o nível do 2º turno dá:

- CE: V2 +14,77 (z 3,69) e V3s +5,60 (z 3,09);
- PB: V3s +5,51 (z 2,67);
- PE: nenhum acima de z 2.

Com efeito fixo de **local** (o modelo do plano), tudo isso some (tabela 1.2). A diferença está **entre prédios da mesma zona**: os prédios com mais liberação são também os mais pró-13. Dentro do mesmo prédio, a seção com mais liberação não vota mais no 13. Sem controles, o efeito do nível cresce muito (CE V3m +14,16, z 13,3): é o perfil de quem tem a digital gasta, como no doc 18.

## 3. Diário sem votos com boletim normal (c)

**Universo:** toda seção com comparecimento ≥ 1 no BU, nos dois turnos e nas 28 UFs: 499.176 no 1º turno e 499.178 no 2º. Todas têm diário no disco e foram lidas.

| | 1º turno | 2º turno |
|---|---|---|
| Diário igual ao BU | 499.167 | 499.172 |
| **D0, diário sem nenhum voto** | **0** | **0** |
| DP, diário parcial, com marca de falha | 7 (156 votos faltando) | 5 (53) |
| DP, diário parcial, **sem marca** | 2 (3 votos) | 1 (1 voto) |
| D+, diário maior que o BU | 0 | 0 |
| **Casos como o de RS 87912/0060/0322** | **0** | **0** |

**Os 3 diários parciais sem marca, conferidos no bruto (Fato):**

| Seção | Turno | BU | Votos computados no diário | O que o diário tem |
|---|---|---|---|---|
| PI 11533/0003/0216 | 2º | 259 | 258 | 259 "Voto confirmado para [Presidente]" e 260 "Eleitor foi habilitado": o voto está no diário, falta só a linha final. A urna alternou rede elétrica e bateria interna (em linhas INFO, que o plano não conta como marca) |
| RJ 58971/0087/0184 | 1º | 258 | 256 | 257 confirmações de governador e 256 de presidente; 26 inícios do log no dia (urna religada várias vezes, o que o plano não conta como marca) |
| SP 71072/0260/0037 | 1º | 285 | 284 | 285 confirmações de presidente e de governador: falta só a linha final de um voto |

**Os 12 parciais com marca:** são as seções já conhecidas (doc 17; engenharia de segurança, docs 01 e 04).

- 7 com contingência e urna reserva no BU: BA 39934/0183/0175 (1º, −136), SP 71072/0002/0035 (1º, −15), RN 16039/0029/0028 e RS 89036/0083/0044 (1º, −1 cada); BA 35653/0173/0235 (2º, −13), MA 08893/0047/0609 (2º, −36), RS 89060/0017/0191 (2º, −2).
- As outras, com alerta de energia: ES 56995/0053/0211, SP 63614/0227/0305 e SP 64254/0291/0346 (1º); BA 34711/0021/0178 e PB 21750/0002/0254 (2º).

**Peso no resultado (Fato, conta exata):**

- **2º turno:**
  - sem marca, 2 × (0 + 1) = 2 votos, contra uma margem de 4.430.191: **não pesa**;
  - com todos os parciais, 2 × 54 = 108: também não;
  - anulando os votos do 13 nas seções sem marca, a margem fica em 4.430.017.
- **1º turno:**
  - sem marca, 3 votos; com todos, 159;
  - a menor distância que mudaria o resultado é o que faltou ao primeiro colocado (o 22, 56.104.503 votos) para mais de 50% dos 119.306.034 válidos: 3.548.515;
  - a diferença entre o 2º e o 3º colocados é maior. **Não pesa.**
- **Exclusões do universo**, todas sem comparecimento no banco:
  - 41 seções do exterior por turno com "sem arquivo" (sem BU);
  - as apurações por cédula no Sistema de Apuração: 29 do exterior por turno (`saManual`) e, no 1º turno, 2 de MG (`saMistaBUImpressoCedula`).
  - Estas últimas levam a marca M4 pelo próprio tipo de arquivo. A engenharia de segurança já as tratou (docs 03 e 05).

## 4. H13-L: "a maioria dos liberados votou no 13" (cerco, Fato)

- **2º turno, todos os liberados sem digital (V2 + V3m + V3s):** em cada uma das 27 UFs, a parte possível no 13 vai de um mínimo entre 0,03% e 5,37% a um máximo entre 79,86% e 100%. Isso é **não decidível (voto secreto)** em todas, e o mesmo vale para cada via separada e para o 1º turno.
- **Exterior:** lá todos os eleitores entram pela V2, então o cerco é o próprio resultado:
  - 2º turno: 52,47% dos votantes no 13, maioria no 13 (Fato);
  - 1º turno: maioria fora do 13 (Fato).
  - Isso não diz nada sobre liberação. Fora do Brasil, não há leitor de digital.
- **Estimativa ecológica (Hipótese de modelo, N2 de cada UF):** parte no 13 dos liberados pela via contra a dos eleitores pela digital da mesma UF.
  - CE: V2 65,3%, V3m 71,4%, V3s 72,6%; digital 68,9%.
  - PB: 56,8%, 67,8% e 70,0%; digital 67,7%.
  - PE: 70,4%, 69,8% e 71,4%; digital 69,0%.
  - BA: 71,1%, 71,1% e 72,9%; digital 71,3%.
  - SP: 44,3%, 41,9% e 43,4%; digital 46,5%.
  - MG: 48,0%, 50,9% e 50,8%; digital 50,8%.
  - No Nordeste, os liberados provavelmente deram a maioria ao 13, como os eleitores pela digital. A maioria vem da região, não da liberação. Tabela completa em `modelo.json` (`ecologica`).

## 5. Aplicação da regra (seção 8 do plano)

| Parte | Critério | Status |
|---|---|---|
| Nordeste | Sinal positivo numa UF do Nordeste, em μ_NE ou em a1/a2? Não. Equivalência? Não. δ_NE positivo e significativo? Não | **sem sinal** |
| Fora do Nordeste | Sinais positivos: MG V2 (estável), RS V2 (estável), MG V3m (**novo**) | **há sinal novo** |
| Rastro (c) | Casos como o do RS 0322: 0 | **ausente** |
| **Forma final** | Regra 1: "há sinal novo em qualquer UF" | **fato que pede explicação** |

**O dado público que fecharia a questão** (exigido pela regra 1): o sinal novo está em MG, e o diário de 2022 de MG já está no disco e já foi usado. Ele mostra que a associação da V3m **não existia** em 2022. Nenhum arquivo público adicional separa as duas causas possíveis abaixo; o que resta é a análise da forma do sinal (seção 6). Não houve download.

## 6. O sinal novo: V3m em MG (exploratório, fora do plano; não muda a forma)

O sinal mede isto: onde a liberação manual com mesário identificado caiu do 1º para o 2º turno, o 13 ganhou menos. Onde ela subiu, o 13 ganhou mais. A pergunta é se o sinal tem a forma de **inserção de votos pela mesa** (mais V3m no 2º turno, com voto no 13) ou de **composição** (quem é liberado à mão no 1º turno e não volta no 2º, ou o contrário).

| Teste exploratório | Resultado | Inserção preveria |
|---|---|---|
| Separar seções em que a V3m **subiu** e em que **caiu** | Subiu: +0,20 (z 0,33; 26.822 seções). Caiu: **+2,85 (z 5,64)**; 19.158 seções | Sinal onde a V3m subiu |
| Concentração por município (referência nula: efeito homogêneo, bootstrap selvagem por local, 1.000 repetições, como no doc 22) | Parte dos 1% maiores municípios (9 de 853) no numerador: 0,70, contra mediana nula 0,60 (p 0,22). β sem os 10 maiores: +0,89, contra mediana nula +1,18 (p 0,33) | Concentração além da nula |
| Regressão à média (+ parcela do 13 e V3m do 1º turno) | +1,77 (z 3,60) | — |
| Urna antiga (UE2013/UE2015, 9.080 seções) × nova | Nova +1,87 (z 4,05); diferença da antiga +0,59 (z 0,71) | — |
| Sem controles do perfil | +0,62 (z 1,42) | — |
| Erro por município / efeito fixo de zona | +1,93 (z 3,97) / +1,89 (z 4,59) | — |
| Exame nominal de MG, 2º turno (o mesmo da seção 2, aplicado a MG) | Seções de liberação alta na cauda de voto no 13 (z ≥ 3): 9 de 4.948 (0,18%), contra 129 de 44.516 (0,29%) nas outras (Fisher p 0,94). Seções com um mesário liberando ≥ 25% dos votos: 9 no estado, nenhuma na cauda. Maior rajada: 8 liberações do mesmo mesário em 10 min. Menor intervalo entre duas liberações do mesmo mesário: 46 s. Mesário em mais de uma seção: 12 de 77.739 identificadores (25 seções; 2 em locais diferentes). Conferência: V3m igual ao `h08` nas 52.062 seções | Liberações concentradas em poucos mesários, em rajada, nas seções com excesso de 13 |

**Leitura (Hipótese):**

- O sinal está inteiro nas seções em que a liberação manual com mesário **caiu** no 2º turno, e não onde ela subiu. Inserção pela mesa no 2º turno deixaria o sinal onde a V3m subiu, e lá ele é zero (intervalo de 95% de −1,0 a +1,4, que exclui o +1,93).
- Ele também não está concentrado além do que um efeito igual em toda parte produziria.
- A forma é a de **composição**: os eleitores liberados à mão no 1º turno que não voltaram (ou voltaram pela digital) pendiam mais para o 13 do que os que os substituíram.
- Como o sinal da V2 em MG, ele depende do controle do perfil: sem os controles, cai a z 1,42.
- Isso não fecha a causa. Pelo princípio 8, uma mesa que deixasse de liberar no 2º turno eleitores que tinha liberado no 1º não deixaria marca diferente desta. Mas esse mecanismo **tiraria** votos do 13, e não daria votos a ele.
- **Tamanho, se tudo fosse fraude a favor do 13:** f ≈ 13,8% dos 184.884 V3m a mais de MG, ou seja, cerca de **25 mil votos** (0,6% da margem nacional).

## 7. Desvios do plano

1. **Fórmula de votos da equivalência (seção 4 do plano):** max(2, 1/(1 − p)) é infinito quando o 22 tem 0 votos na seção (27 seções do Nordeste). Apliquei a fórmula como escrita, e o resultado é "equivalência não vale". Relato ao lado uma variante (limite convertido pela calibração da injeção) que dá o mesmo resultado em 5 das 6 combinações. **A decisão não muda.**
   - Nota: no painel, a fórmula do plano usa a_s = max(0, e_v) × eleitores ÷ votos, o que aumenta os votos em cerca de 1/comparecimento em relação à conversão linear exata. É o lado conservador para quem quer descartar efeito, e só pesa na equivalência, que não vale de qualquer jeito.
2. **Controle positivo do classificador (seção 6):** o plano esperava "DP com marca" em PR 75833/0043/0074 no 1º turno de 2022. O diário dessa seção tem 0 votos, então ela sai "D0 **com** marca" (contingência, Recuperador de Dados, log corrompido). O que o controle testa (marca presente nas 4 com falha e ausente no RS 0322) passou. A lista de marcas não mudou.
3. **Exploratório além do plano:** a seção 6 inteira e a leitura nominal de MG. O plano previa só dizer "onde, de que tamanho e qual dado público fecharia". Os testes da seção 6 foram escolhidos depois de ver o sinal e não entram nos 192.
4. **Script a mais:** `estatistico-h13-final-decisao.mjs`, que junta os 192 testes e aplica a regra, e `estatistico-h13-final-lib.mjs`, a biblioteca comum. Os nomes seguem o padrão pedido.

## 8. O que isto permite e o que não permite afirmar

**Permite:**

- **Fato (teste declarado):** com o mesmo modelo nas 27 UFs, nenhuma UF do Nordeste, nem a média do Nordeste, liga a liberação sem digital a mais voto no 13. Isso vale no nível do 2º turno e na variação entre os turnos.
- **Fato (teste declarado):** em MG, a variação da liberação manual com mesário identificado acompanha a variação do 13 (+1,93, z 4,15), e isso não acontecia em 2022.
- **Fato:** em 2026 não há nenhuma seção com boletim e diário sem votos. Dos 4 votos sem linha final em diários sem marca de falha, 3 têm a confirmação do voto no diário. O quarto (RJ 58971/0087/0184, 1º turno) fica numa urna religada 26 vezes no dia.

**Não permite:**

- dizer em quem votaram os liberados (voto secreto; o cerco não decide em nenhuma UF);
- descartar, no Nordeste, fraude a favor do 13 abaixo do mínimo detectável da seção 1.4 (de ~33 mil a ~744 mil votos, conforme a via e o desfecho);
- descartar fraude igual em todas as seções de um local, alinhada ao perfil, igual nos dois turnos ou difusa;
- dar a causa do sinal novo de MG: a forma é de composição, mas a causa fica aberta.

## 9. Riscos que ficam

- **Poder:** o Nordeste fica "sem sinal" e não "refutado", porque o teste não vê efeitos de dezenas de milhares de votos.
- **Painel da V2 abaixo do corte em GO, SP e RJ** (z de 3,3 a 3,6): é o mesmo padrão de MG e do RS, sem teste de 2022 nessas UFs. Se entrasse, seria classificado como novo. Os diários de 2022 de SP estão sendo baixados por outra frente (doc 29). Não baixei nada.
- **Marca da V3m entre 2022 e 2026:** o texto mudou entre os anos (doc 24, seção 2). O parecer 48 confirmou a diferença pela liberação manual inteira do boletim (−1,23 em 2022 contra +1,70 em 2026), mas a parte só do mesário identificado em 2022 depende da tradução.
- **Controles:** os dois sinais de MG somem sem os controles do perfil. Um perfil mal medido (sem renda nem urbano/rural por seção) pode criá-los ou escondê-los.
- **Revisão independente** pendente antes de qualquer uso na perícia.

## Adendo 1: resultado

Adendo 1 ao plano 27, gravado sozinho no **commit ed0474c** antes de rodar. Ele foi escrito depois do [parecer cético 54](../cetico-revisor/54-h13-fechamento.md), que mostrou que o teste MG V3m do painel dependia de 14 seções em que o perfil público do eleitorado (julho de 2026) tem de 1 a 23 eleitores para urnas com 139 a 419 aptos. **O resultado acima fica como está.** Esta seção refaz a conta com as três mudanças do adendo:

1. **Um só denominador, os aptos do BU de cada turno e ano.** No painel, e_v = L_v,2 ÷ aptos_2 − L_v,1 ÷ aptos_1, e Δc igual. Em todos os testes, o controle de tamanho é o log dos aptos. No nível, a exposição continua sendo votos da via ÷ comparecimento do BU (premissa aceita pelo coordenador).
2. **Linha de base de 2022 refeita com o mesmo denominador em MG, PR, SC, RS e SP** (15 testes, |z| ≥ 2,935).
3. **Regra "estável" por UF × via.**

A forma final é recalculada pela seção 8, com os mesmos 192 testes e o mesmo corte.

### A1.1 Veredito depois do adendo

**H13: não decidível com dados públicos.**

- **Nordeste: sem sinal.** Nenhuma UF do Nordeste, nem μ_NE, nem os 12 testes de CE, PB e PE. O maior z positivo do Nordeste é 1,80 (PB, V3s, painel). A equivalência não vale (seção A1.4).
- **Fora do Nordeste, só sinais estáveis:**
  - MG V2 +5,69 (z 3,71): em 2022, +6,37 (z 5,13);
  - RS V2 +9,81 (z 3,76): em 2022, +8,83 (z 3,58).
  - Pela regra, as duas associações já existiam em 2022, na mesma via e com o mesmo denominador.
- **MG V3m deixa de passar:** +1,25 (z 2,00). Era o único sinal novo, e sumiu com o denominador corrigido.
- **Rastro (c): ausente.** Nada muda, porque o item (c) não usa denominador.
- **Por que "não decidível":**
  - O padrão V2 estável (onde mais eleitores sem digital, liberados pelo ano de nascimento, voltam a votar no 2º turno, o 13 ganha mais) é compatível com duas causas: composição (quem volta a votar sem digital pende mais para o 13) e inserção com o mesmo formato em 2022 e em 2026.
  - Os testes públicos que separariam as duas já rodaram sem separá-las: hora, sequência, foto, concentração, escolaridade, estado civil, idade e 2022.
  - Separá-las exige ligar voto a pessoa: caderno de votação assinado, imagens das digitais (`wsqman.jez`) e cadastro com identidade. Nada disso é público, e o voto é secreto.
- **Peso máximo do sinal estável (Fato, aritmética):** a V2 a mais do 2º turno em MG e no RS soma 133.526 votos (98.706 + 34.820).
  - Mesmo que todos fossem votos falsos no 13, a margem iria de 4.430.191 para 4.296.665.
  - Mesmo que todos fossem votos trocados do 22 para o 13, ela iria para 4.163.139.
  - Pela calibração da injeção (Hipótese de modelo), os coeficientes equivalem a cerca de 21 mil votos (MG 12.691; RS 8.243).

### A1.2 Conferências do adendo

| # | Conferência | Resultado |
|---|---|---|
| 1 | Com o denominador do plano, o script do adendo reproduz o doc 28 | Os 180 testes do modelo são iguais aos do doc 28 (diferença máxima 0). A decisão refeita na pasta do plano dá a mesma forma e as mesmas classes |
| 2 | MG V3m com ÷ aptos contra os pareceres 54 e 48 | 2026: +1,25 (z 2,00), contra +1,23 (z 1,98) no parecer 54. A diferença vem da definição: o parecer dividiu ΔL pelos aptos do 2º turno, e o adendo usa a taxa de cada turno. 2022: −1,24 (z −2,51), igual ao parecer 48 |
| 2b | Linha de base de 2022 com o denominador do plano contra os docs 24 e 26 | Reproduz: MG V2 +5,94 e V3m −1,21; PR +6,57; SC +2,32; RS +8,72 |
| 3 | Vias do diário de SP 2022 contra o boletim de 2022 (critério do adendo 6) | V2 igual em 99,44% (1º) e 99,86% (2º) das seções; diferença absoluta de 0,013% e 0,007% da V2. **Confirmada.** V3 igual em 101.066 e 101.068 seções |
| 3b | Tabela de SP 2022 da frente H02/H05 contra releitura própria do zip | 40 seções sorteadas (semente fixa), 40 de 40 iguais nos dois turnos (votos, V1, V2, V3m e V3s) |
| 4 | Leitura por mesário de CE, PB e PE | Igual ao `h08` em 55.895 de 55.895 seções nos dois turnos |
| 5 | Segredo | Busca de 11 a 13 dígitos seguidos (fora de casas decimais) nas saídas do adendo: 0 |

**SP 2022 pronto:** conferência dos zips com `ok` e 0 falhas (101.073 seções por turno) e leitura do diário terminada nos dois turnos. Nada foi baixado por esta frente. Arquivos lidos, com sha256:

| Arquivo | sha256 |
|---|---|
| `h13-v2/secoes-sp-2022-diario.csv` | `046a0495…de42f` |
| `diario2022/sp-1t.jsonl` | `ebe79cb6…85c5e` |
| `diario2022/sp-2t.jsonl` | `087a4e7b…79257` |
| `sul2022/bu2022-sp.csv` | `c38ec62f…b67dc` |

Os sha256 completos estão em `adendo1/linha-base-2022.json` (o do CSV) e em `adendo1/conferencias-sp-2022.txt`.

### A1.3 Os testes que passam (192 testes; corte p ≤ 2,604 × 10⁻⁴)

| Teste | Plano (÷ perfil) | Adendo (÷ aptos) | Classe no adendo |
|---|---|---|---|
| MG, painel, V2 | +5,68 (z 4,19) | +5,69 (z 3,71) | estável (2022: +6,37, z 5,13) |
| RS, painel, V2 | +9,66 (z 3,69) | +9,81 (z 3,76) | estável (2022: +8,83, z 3,58) |
| MG, painel, V3m | **+1,93 (z 4,15), novo** | +1,25 (z 2,00), não passa | — |
| ES, nível, V2 | −11,89 (−5,38) | −11,74 (−5,29) | contra o 13 |
| RJ, nível, V2 | −6,96 (−5,26) | −7,05 (−5,33) | contra o 13 |
| RJ, nível, V3m | −2,90 (−3,65), não passava | −2,91 (−3,66) | contra o 13 (passa por pouco) |
| SP, nível, V2 / V3m / V3s | −5,15 / −3,59 / −3,27 | −5,04 / −3,61 / −3,28 | contra o 13 |

- **Logo abaixo do corte:** SP V2 painel +5,60 (z 3,56) e RJ V2 painel +7,03 (z 3,26).
  - Se SP V2 passasse, seria **estável**: em 2022, +6,09 (z 6,34).
  - O RJ não tem diário de 2022 analisado.
  - GO V2 painel, que estava em z 3,59 no plano, cai para z 1,24: era artefato do denominador, como o parecer 54 já tinha visto.
- **Estágio 2:** nenhum dos 18 testes passa.
  - μ_BR painel V2 +3,81 (t 3,52; p 0,0016); μ_NE painel V2 +0,64 (t 0,38).
  - δ_NE painel V2 −4,68 (t −2,34): o Nordeste fica abaixo do resto.
  - No nível, δ_NE V3m +1,32 e V3s +1,67 (t 2,21 e 2,60). Isso já estava no 1º turno e não passa.
- O Benjamini-Hochberg a 5% aceita 14 dos 192. Os 6 além do Bonferroni são:
  - GO V2 nível (+8,20);
  - μ_BR V3m nível (−1,22);
  - RJ V2 painel (+7,03);
  - SP V2 painel (+5,60);
  - μ_BR V2 painel (+3,81);
  - PB a1 nível (razão 3,46; p 0,0022), que já estava no 1º turno (razão 3,80).

### A1.4 Equivalência e mínimo detectável no Nordeste (÷ aptos)

- **Equivalência: não vale.** Pela fórmula do plano, o limite é infinito (as mesmas 27 seções com 22 = 0). Pela calibração da injeção, os limites superiores de μ_NE, em votos, são:

  | Combinação | Limite em votos | Vale (≤ 44.302)? |
  |---|---|---|
  | N2 V2 | 342.396 | não |
  | N2 V3m | 86.630 | não |
  | N2 V3s | 59.156 | não |
  | P V2 | 28.559 | sim |
  | P V3m | 41.420 | sim |
  | P V3s | 31.415 | sim |

  Três das seis falham.
- **Mínimo detectável de μ_NE a favor do 13 (80% de poder, corte de Bonferroni):**

  | Desfecho | V2 | V3m | V3s |
  |---|---|---|---|
  | Nível | 45,1% / 746.642 votos | 7,7% / 137.841 | 8,7% / 71.195 |
  | Painel | 32,6% / 31.378 | 7,1% / 38.566 | 10,6% / 31.915 |

  A favor do 22, o teste é 2 a 3 vezes mais sensível.

### A1.5 Exame nominal de CE, PB e PE (÷ aptos)

**Nenhum dos 12 testes passa.**

| UF | Desfecho | a1: cauda entre as de liberação alta × nas outras | razão | p | a2 |
|---|---|---|---|---|---|
| CE | nível | 11 de 2.170 × 68 de 19.499 | 1,46 | 0,16 | 0 de 18 |
| PB | nível | 10 de 1.070 × 26 de 9.555 | 3,46 | 0,0022 | sem casos |
| PE | nível | 13 de 2.123 × 54 de 19.041 | 2,17 | 0,014 | 0 de 6 |
| CE | painel | 6 de 2.165 × 55 de 19.486 | 0,98 | 0,58 | 0 de 18 |
| PB | painel | 7 de 1.066 × 35 de 9.565 | 1,80 | 0,12 | sem casos |
| PE | painel | 6 de 2.121 × 45 de 19.027 | 1,20 | 0,41 | 0 de 6 |

- **Linha de base do 1º turno (nível):** CE 2,06 (p 0,030), PB 3,80 (p 0,0007), PE 3,06 (p 0,0004). Como no resultado original, o pouco que aparece em PB e PE no 2º turno já estava no 1º, mais forte, e some no painel.
- **Triagem:** 5 seções acima do corte no nível (as mesmas da seção 2.3) e 0 no painel.
- As estatísticas por seção do mesário (sem identificador) ficam em `adendo1/mesario-nominal-{1t,2t}.jsonl`.

### A1.6 O que muda na leitura do resultado original

- **A seção 6 (exploratório sobre MG V3m) perde o objeto.** O "sinal novo" era artefato do denominador em 14 seções (parecer 54, item 1.3).
  - A assimetria "o sinal vem de onde a V3m caiu" também era do denominador.
  - A leitura "forma de composição" não se sustenta, e a leitura "inserção no 1º turno" (parecer 54, item 2.3) também fica sem apoio: o N1 de MG V3m é +0,11 (z 0,14).
- **O veredito "fato que pede explicação" do resultado original** foi a aplicação correta da regra registrada a uma medida com defeito. A forma depois da correção é a do A1.1.
- **O que continua aberto (exploratório):** em MG, a liberação manual se associa ao ganho do 13 com sinais opostos em 2022 (−1,24) e 2026 (+1,25). A diferença entre os anos fica perto de z 3 (parecer 54: +2,56, z 3,3, com outra variante). Pela regra, isso não é sinal de 2026: o "novo" exige β > 0 em 2026 passando no corte.

### A1.7 Desvios e riscos do adendo

- **Desvios:**
  - A outra frente juntou a tabela de SP 2022 enquanto o adendo rodava. Usei a tabela juntada, com sha256 gravado. O script também sabe ler os `.jsonl` finais, com a mesma regra do `--juntar`.
  - `estatistico-h13-v2-dados2022.mjs` ganhou `--ufs` e `--saida`. O padrão não mudou (conferido: as linhas de MG, PR, RS e SC são idênticas byte a byte às de `h13-v2/secoes-2022.csv`).
  - A decisão do plano foi regravada na pasta do plano com os campos novos. A forma e as classes são as mesmas.
- **Riscos:**
  - MG V2 e RS V2 passam por pouco (z 3,71 e 3,76 contra 3,652). Se caíssem abaixo do corte e SP V2 continuasse abaixo, a forma seria "sem sinal nos dados públicos", e não "não decidível".
  - Os controles de composição ainda vêm do perfil de julho (ruidosos nas seções fora de data). Isso fica declarado, sem variante.
  - O RJ V2 do painel (z 3,26) não tem linha de base de 2022.
  - O teste do Nordeste não descarta efeitos de algumas dezenas a centenas de milhares de votos (A1.4).
  - **Revisão independente** pendente.

### A1.8 Comandos do adendo

```bash
A=data/parsed/auditoria/estatistico/h13-final/adendo1
node scripts/auditoria/estatistico-h13-v2-dados2022.mjs --ufs MG,PR,RS,SC,SP --saida $A/secoes-2022.csv
node --max-old-space-size=16000 scripts/auditoria/estatistico-h13-final-modelo.mjs --saida $A/reproducao        # conferência 1
node --max-old-space-size=16000 scripts/auditoria/estatistico-h13-final-modelo.mjs --denominador aptos --saida $A
node --max-old-space-size=12000 scripts/auditoria/estatistico-h13-final-nominal.mjs --denominador aptos --saida $A
node --max-old-space-size=8000  scripts/auditoria/estatistico-h13-final-2022.mjs                                 # 15 testes de 2022 + conferência de SP
node scripts/auditoria/estatistico-h13-final-decisao.mjs --dir $A
```

Saídas em `data/parsed/auditoria/estatistico/h13-final/adendo1/`: `modelo.json`, `ufs.csv`, `cerco.csv`, `nominal.json`, `mesario-nominal-{1t,2t}.jsonl`, `linha-base-2022.json`, `secoes-2022.csv`, `testes.csv`, `decisao.json`, `conferencias-sp-2022.txt` e `reproducao/`.
