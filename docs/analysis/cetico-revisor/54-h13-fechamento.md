# 54. Parecer: fechamento da H13 (liberados sem digital e voto no 13)

Parecer do revisor cético, 02/11/2026. Revisa o fechamento da H13 feito pelo estatístico eleitoral:

- plano pré-registrado [27-h13-plano-final.md](../estatistico-eleitoral/27-h13-plano-final.md) (commit 89ede09);
- resultado [28-h13-resultado-final.md](../estatistico-eleitoral/28-h13-resultado-final.md) (commit ee296d2);
- scripts `scripts/auditoria/estatistico-h13-final-*.mjs` e saídas `data/parsed/auditoria/estatistico/h13-final/`.

A base anterior são os pareceres [42](42-h08-h13-log.md), [46](46-h13-v2-fora-nordeste.md), [48](48-h13-v2-mg-2022.md) e [51](51-v2-sul-2022.md).

**Rótulos:** **Fato** (sai de script do repo sobre arquivo público, universo completo), **Hipótese**, **Recomendação**, **Pendente**.

**Como trabalhei:**

- Sem rede.
- Banco: cópia de leitura `eleicao2026-20261029T105000`.
- Diários de MG 2026: os do F:, lidos por `readdir`. Não rodei `find` em `data/raw`.
- Zips de 2022: não reli. Usei o boletim de 2022 já lido no parecer 48 e as vias do diário de 2022 do doc 24.
- Não usei os diários de SP 2022.
- Nenhum CPF, título de eleitor ou número de mesário foi lido para saída ou gravado. A busca por 11 a 13 dígitos seguidos nas minhas saídas e scripts dá 0.
- Tudo o que vem depois da reprodução é **fora do plano**: análise minha, feita depois de ver o resultado. Os z servem para ordenar a força dos resultados, não são testes confirmatórios.

## Resposta curta

**Veredito geral: sustentado com ressalvas na aplicação da regra; derrubado no fundamento.**

- A conta reproduz, e a regra do plano foi aplicada como escrita. Pela letra do plano, a forma é "fato que pede explicação".
- Mas o único teste que obriga essa forma (MG, painel, V3m, +1,93, z 4,15) passa por causa de **14 seções** de MG. Nelas, a tabela pública de perfil do eleitorado, gerada em 14/07/2026, traz de 1 a 23 eleitores para urnas com 139 a 419 aptos no boletim.
- Nessas seções o regressor do plano (variação da V3m ÷ eleitores do perfil) vira um número absurdo. Exemplo: MG 50350/0350/0248, com 1 eleitor no perfil e 341 aptos, tem e_V3m = −12, ou −1.200% do cadastro.
- Sem essas 14 seções, ou com qualquer denominador sem esse defeito, a V3m de MG cai para +1,0 a +1,2, com z de 1,9 a 2,1, e não passa no corte (3,652).
- A assimetria "o sinal vem das seções em que a V3m caiu", que o doc 28 usa para ler "composição", também some.

| # | Item | Veredito |
|---|---|---|
| 1 | Reprodução própria e comparação com 2022 | **Sustentado:** reproduz exatamente, e a tradução das marcas está certa no universo. **Derrubado:** o "sinal novo" como associação real. Ele é artefato do denominador em 14 seções |
| 2 | Leitura do sinal concentrado onde a V3m caiu | **Derrubado** (exploratório do autor). A assimetria só existe com o denominador defeituoso. Regressão à média, troca de urna e troca V3m ↔ V3s não a explicavam; o denominador explica |
| 3 | Plano seguido; os 4 desvios | **Sustentado com ressalvas.** Os 4 desvios são aceitáveis. Falta um quinto risco, que já era conhecido antes do plano (parecer 48, item 6.2 e variante A) e não entrou nem no plano nem nos riscos do doc 28 |
| 4 | As 5 associações contra o 13 (ES, RJ, SP) | **Sustentado.** Reproduzem e já estavam no 1º turno de 2026, com o mesmo sinal e z de 3,64 a 5,70. Não dependem do perfil |
| 5 | "~25 mil votos" | **Sustentado com ressalvas.** A conta está certa (25.467), mas é uma estimativa sob um mecanismo que a própria forma do sinal contradiz, não um teto. O teto aritmético é de 1.160.672 votos, contra 4.430.191 de margem |
| 6 | Veredito pela regra | **Certo pela letra; frágil na substância.** Com o defeito corrigido, a forma vira "não decidível com dados públicos" (MG V2 e RS V2, estáveis). Mas fica na beira do corte por SP V2 (z de 3,60 a 3,70 contra 3,652) |

**Para o coordenador (linha H13):** a frase final não deve dizer que há uma associação nova em Minas.

- **Recomendação:** registrar as duas coisas.
  - Pela regra pré-registrada: fato que pede explicação.
  - A explicação foi achada na revisão: um defeito do denominador público em 14 seções. Corrigido, não há sinal novo, e a H13 fica "não decidível com dados públicos", com uma pendência em SP.
- O Nordeste fica sem sinal em qualquer denominador. O maior z positivo, em qualquer variante, é 1,90 (PB, V3s).

## Comandos e saídas

```bash
node scripts/auditoria/cetico-54-censo-v3.mjs --turno 2 --workers 3          # censo próprio das marcas da V3, MG 2026, ~9 min
node scripts/auditoria/cetico-54-censo-v3.mjs --turno 1 --workers 3
node --max-old-space-size=8000 scripts/auditoria/cetico-54-modelo.mjs        # MG 2026 × 2022: réplica, boletim, censo, subiu/caiu, urna, denominador, votos
node --max-old-space-size=12000 scripts/auditoria/cetico-54-nivel.mjs        # ES, RJ, SP: N2 e N1 (os 5 testes contra o 13)
node --max-old-space-size=12000 scripts/auditoria/cetico-54-nivel.mjs --painel --ufs al,ba,ce,ma,pb,pe,pi,rn,se,ac,am,ap,pa,ro,rr,to,df,go,ms,mt,es,mg,rj,sp,pr,rs,sc
node scripts/auditoria/cetico-54-perfil-bruto.mjs mg/50350/0350/0247,...     # perfil no zip do TSE × aptos e comparecimento das 14 seções
```

Saídas em `data/parsed/auditoria/cetico/54/`:

- `censo-v3-{1t,2t}.jsonl` e `.resumo.json`;
- `modelo.json`;
- `nivel.json`;
- `painel-denominador.json`;
- `perfil-bruto.json`.

**Independência do caminho:**

- Nenhum script importa `estatistico-h13-final-lib.mjs`.
- A regressão é minha: eliminação de Gauss com pivô, efeito fixo de local por desvio da média ponderada, CR1 por local.
- A leitura dos diários de MG 2026 no censo também é minha: `src/zip.js`, união das cópias, ciclo do eleitor.
- O que vem da cadeia do estatístico:
  - as vias por seção do `h08`, que o censo confere em 100% das seções de MG;
  - para 2022, a divisão V3m/V3s do diário (doc 24).

## 1. Reprodução e comparação com 2022

### 1.1 Os números reproduzem (Fato)

| | Doc 28 / doc 24 | Este parecer |
|---|---|---|
| MG 2026, painel, e_V3m | +1,93 (z 4,15), 49.462 seções | **+1,934 (z 4,15)**, 49.462 seções, 7.493 locais |
| MG 2022, painel, e_V3m | −1,21 (z −2,59) | **−1,207 (z −2,59)**, 47.222 seções |
| MG 2026, e_V2 / e_V3s / Δc | +5,68 / +0,85 / +0,91 | +5,675 / +0,846 / +0,907 |

- **Todos os 81 coeficientes do painel** (27 UFs × 3 vias) e os 18 do nível de ES, RJ e SP batem com `ufs.csv` com diferença de no máximo 0,0005 ponto (`painel-denominador.json`, `nivel.json`).
- O N de 2022 difere do doc 24 em 20 seções pelo motivo já explicado no parecer 48: votos e local vêm do boletim.

### 1.2 A tradução das marcas da V3m está certa (Fato, universo de MG 2026)

A dúvida era esta:

- em 2022, a V3m é marcada por `Biometria do mesário # encontrada nos arquivos coletados` **ou** `… em eleitores`;
- em 2026, por `Mesário # habilitou o eleitor`.

Se em 2026 a linha "encontrada … em eleitores" não viesse seguida de "habilitou", esses votos cairiam na V3s em 2026 e na V3m em 2022, e a comparação seria injusta. O parecer 48 só tinha conferido 3 seções.

**O censo próprio (`cetico-54-censo-v3.mjs`)** leu todas as 52.062 seções de MG nos dois turnos de 2026 e classificou cada voto sem digital pelas marcas do ciclo:

| Combinação de marcas no ciclo do voto | 1º turno 2026 | 2º turno 2026 |
|---|---|---|
| ano de nascimento igual (V2) | 1.415.926 | 1.502.075 |
| dado confere + solicitação + **encontrada nos arquivos** + habilitou | 413.097 | 483.514 |
| dado confere + solicitação + **encontrada em eleitores** + habilitou | 85.301 | 96.822 |
| dado confere + solicitação + digital bate sem mesário associável | 171.844 | 158.143 |
| dado confere + solicitação + digital salva em arquivo novo | 174.651 | 149.431 |
| "habilitou" sem "encontrada" / "encontrada" sem "habilitou" | **0 / 0** | **0 / 0** |

- Em 2026, "Mesário # habilitou" vem **sempre** junto de uma das duas linhas "encontrada", e cada "encontrada" num voto manual vem com "habilitou". A regra de 2022, aplicada a 2026, dá **exatamente** a mesma V3m em todas as seções: 498.398 e 580.336 votos. O coeficiente sai idêntico (+1,934).
- A marca de V3 de 2022 (a solicitação de dado pessoal) também coincide com a de 2026 (dado confere): 844.893 e 887.910.
- O censo bate com o `h08` em V2, V3m e V3s, nos dois turnos, em **52.044 de 52.044** seções do painel.
- Os votos do diário somam o comparecimento do boletim de MG nos dois turnos: 12.636.715 e 13.044.203. Em MG, isso confirma por caminho próprio o "0 diário sem votos" do item (c).
- **A comparação também não depende da tradução.** Com a liberação manual inteira contada só pelo boletim (sem diário), o resultado é:
  - 2026: +1,70 (z 3,66);
  - 2022: −1,23 (z −2,83).

**Conclusão do item 1.2:** a mudança de texto entre 2022 e 2026 não cria o "sinal novo".

### 1.3 O sinal de 2026 é artefato do denominador (Fato no bruto; o efeito no coeficiente é exploratório)

O plano mede a exposição do painel como e_v = ΔL_v ÷ eleitores do **perfil** (`forense/perfil/mg.csv`, que vem do `perfil_eleitor_secao_2026_MG.zip` do TSE).

A decomposição pela alavanca mostra o problema: cada seção pesa w·x̃², em que x̃ é a e_V3m que sobra depois de tirar o efeito do prédio e dos outros regressores.

| Seção | Eleitores no perfil do TSE (gerado em 14/07/2026) | Aptos no BU (1º / 2º) | Comparecimento (1º / 2º) | V3m (1º → 2º) | Parte da alavanca | Parte do numerador |
|---|---|---|---|---|---|---|
| MG 50350/0350/0247 (Poços de Caldas) | 4 | 339 / 339 | 230 / 244 | 10 → 12 | **12,2%** | **13,0%** |
| MG 51276/0110/0075 (Romaria) | 11 | 353 / 353 | 288 / 302 | 21 → 35 | 7,2% | 2,4% |
| MG 50350/0350/0248 (Poços de Caldas) | **1** | 341 / 341 | 266 / 274 | 13 → 1 | 2,4% | 6,5% |
| MG 41238/0034/0364 (Belo Horizonte) | 5 | 343 / 342 | 272 / 294 | 3 → 11 | 1,2% | **10,4%** |

- **Fato, conferido no bruto:**
  - o BU da 50350/0350/0247 (`exportar.js --log nao`, dois turnos) traz 339 aptos e 230 e 244 votantes, na mesma urna;
  - o zip público do perfil traz 4 eleitores para essa seção (`perfil-bruto.json`).
  - O mesmo vale para as 14 seções de perfil com até 25 eleitores e 100 ou mais aptos: de 1 a 23 eleitores no perfil contra 139 a 419 aptos, sempre no mesmo local de votação.
- **Peso dessas seções:**
  - as 10 seções de maior alavanca carregam 27% de toda a alavanca de MG em 2026 (em 2022, 10,5%);
  - Poços de Caldas sozinho, com 401 seções, carrega 16,9% da alavanca;
  - a tabela de alavanca do próprio doc 28 (`mg-v3m.json`) já mostrava esses 0,169, mas o doc não os examinou.
- **Também os controles dessas seções vêm de 1 a 23 pessoas** (idade, escolaridade, fração sem biometria). A linha inteira é ruído.

**Efeito no coeficiente** (exploratório; MG, painel, mesmo modelo, controles e efeito fixo do plano):

| Variante | 2026 e_V3m (z) | 2022 e_V3m (z) | e_V2 de MG 2026 (z) |
|---|---|---|---|
| Plano (÷ perfil, todas) | **+1,93 (4,15)** | −1,21 (−2,59) | +5,68 (4,19) |
| Sem as seções de perfil com até 25 eleitores e 100 ou mais aptos (14 em 2026, 0,03% da amostra; 9 em 2022) | +1,16 (1,94) | −1,26 (−2,70) | +5,79 (3,95) |
| Sem as 642 seções com perfil abaixo da metade dos aptos (Q) | +1,23 (1,99) | −1,33 (−2,77) | +5,55 (3,66) |
| ÷ aptos do BU | +1,23 (1,98) | −1,24 (−2,51) | +5,75 (3,74) |
| Só seções com perfil a menos de 10% dos aptos (A2) | +1,22 (1,92) | −1,23 (−2,44) | +5,81 (3,72) |
| ÷ comparecimento do 1º turno | +1,01 (2,10) | −1,00 (−2,67) | +4,04 (3,49) |

- **Com qualquer correção, a V3m de MG 2026 fica entre +1,0 e +1,2, com z de 1,9 a 2,1.** Não passa no corte de 3,652, nem perto. 2022 não muda.
- **O que sobra é a diferença entre os anos** (exploratório): com Q, 2026 − 2022 = +2,56 (z 3,3). É o que o parecer 48 já tinha dito: a liberação manual se associa ao ganho do 13 com sinal oposto nos dois anos (item 5 dele). Pela regra do plano, porém, o "sinal novo" exige β > 0 em 2026 passando no corte, e não uma diferença entre anos.
- **Esse risco já era conhecido antes do plano.**
  - O parecer 48 (30/10) apontou, no item 6.2, cerca de 2 mil seções de MG com aptos bem acima do perfil.
  - A variante A dele dava exatamente "V3m ÷ aptos +1,23 (z 1,98)".
  - O plano 27 (02/11) não pôs essa exclusão. O doc 28, na seção 9, cita o parecer 48 para a tradução, mas não para o denominador.
- **Por que o teste de concentração do doc 28 não viu isso.** A referência nula da seção 6 ("bootstrap selvagem por local") mantém os x fixos e sorteia só o sinal do resíduo. As 14 seções de x absurdo têm a mesma alavanca em todas as repetições. Por isso, "parte dos 1% maiores municípios" sob a nula também é alta (mediana 0,60). O teste é cego, por construção, a um artefato de alavanca. "Não é concentrado" vale para o resíduo, não para o regressor.
- **Hipótese (fora do meu escopo):** as seções do perfil de julho com 1 a 23 eleitores e 300 ou mais aptos em outubro parecem seções que receberam eleitores depois da geração do perfil, por remanejamento dentro do mesmo local. Não conferi isso. Fica para a frente das seções novas e remanejadas (pareceres 43 e 50). Não é achado de fraude: é a tabela pública de perfil fora de data para essas seções.

## 2. O sinal "onde a V3m caiu" (exploratório do autor)

### 2.1 Reproduz, mas só com o denominador defeituoso

| | Plano (÷ perfil) | Sem perfil quebrado (Q) | ÷ aptos | ÷ comparecimento do 1º turno |
|---|---|---|---|---|
| 2026, V3m subiu | +0,20 (0,33) | +0,87 (1,12) | +1,03 (1,31) | +1,03 (1,70) |
| 2026, V3m caiu | **+2,85 (5,64)** | +1,71 (1,79) | +1,51 (1,55) | +0,99 (1,29) |
| 2022, subiu / caiu | −1,36 / −1,01 | −1,28 / −1,40 | −1,17 / −1,32 | −1,01 / −1,00 |

- A assimetria "caiu +2,85 contra subiu +0,20" reproduz exatamente. Com o denominador corrigido, os dois lados ficam iguais dentro do erro. A seção 50350/0350/0248, por exemplo, tem e_V3m = −12, no lado "caiu", e sozinha leva 6,5% do numerador.
- **A leitura "a forma é de composição" do doc 28 perde a base.** Não há forma a ler: o que sobra é uma inclinação fraca e igual dos dois lados.

### 2.2 Explicações benignas: o que testei (com o denominador do plano, para ver se alguma outra explicava antes do denominador)

| Explicação | Teste | Resultado | Explica? |
|---|---|---|---|
| Regressão à média (Y e V3m do 1º turno) | + Y1, x_V3m,1, x_V3s,1, x_V2,1 | caiu +2,66 (z 4,19); subiu −0,28 | não |
| Troca de urna (e de leitor) entre os turnos | número interno da urna nos dois turnos: 51.718 iguais, 326 trocadas | só mesma urna: +1,85 (z 3,94); interação com urna trocada +3,5 (z 1,6) | não |
| Troca de marca V3m ↔ V3s (mesário não registrado num turno) | caiu e a V3s subiu pelo menos metade (10.069 seções) × o resto | com troca +2,41 (z 4,63); sem troca +5,06 (z 4,40) | não |
| Erro por município / sem controles | CR1 por município; sem perfil | +1,93 (z 3,97); +0,62 (z 1,42) | sem controles, some (já no doc 28) |
| **Denominador do perfil** | 4 variantes (tabela 1.3) | +1,0 a +1,2 (z 1,9 a 2,1) | **sim** |

### 2.3 E a leitura de fraude? (fora do plano)

- **O doc 28 diz que o sinal "não tem a forma de voto inserido pela mesa".** Isso vale só para inserção no **2º turno**.
  - O formato "onde a V3m caiu, o 13 ganhou menos" é o rastro esperado de outra coisa: voto inserido pela V3m no **1º turno**, a favor do 13, que não se repetiu no 2º. Ali o Y1 fica alto e a V3m cai.
  - O doc não considerou essa leitura. Pelo princípio 8, a liberação manual é a brecha humana mais larga, e o 1º turno também conta para a H13.
- **Teste com o 1º turno (nível N1, x_V3m do 1º turno):** MG dá +0,11 (z 0,14); o doc 28 dá o mesmo.
  - Uma inserção no 13 pela V3m do 1º turno levantaria esse coeficiente.
  - Numa aproximação linear (Hipótese de modelo), o limite superior de 95% (+1,68) corresponde a cerca de 3% da V3m do 1º turno de MG (498.398), ou seja, perto de 16 mil votos. Acima disso, o N1 veria.
- **Decomposição exata do painel em Y2 e Y1** (mesmos regressores e peso; coef(Y2) − coef(Y1) = coef(ΔY); denominador do plano):
  - o lado "caiu" é +1,77 (z 1,6) no Y2 e −1,09 (z −1,1) no Y1;
  - a parte do 1º turno (Y1 mais alto onde a V3m depois caiu) e a do 2º (Y2 mais baixo) dividem o efeito, e nenhuma é significativa sozinha.
- **Leitura:** com o denominador corrigido não há sinal a explicar. A leitura de fraude no 1º turno fica sem apoio: o N1 é zero, e o lado "caiu" some. Mas o N1 não descarta uma inserção difusa abaixo de ~16 mil votos em MG (aproximação).

## 3. O plano foi seguido? Os 4 desvios

- **Registro prévio:** o commit 89ede09 (04:28) traz só o doc 27. O doc 27 não muda entre 89ede09 e ee296d2. As saídas do doc 28 têm hora de 04:38 em diante. **Fato:** o plano veio antes das contas gravadas.
- **Os 8 testes que passam:** conferidos em `testes.csv` (192 linhas) e `decisao.json`. São ES, RJ e SP no nível (5, contra o 13), MG V2 e RS V2 no painel (estáveis) e MG V3m no painel (novo).

| Desvio do doc 28 | Aceitável? | Por quê |
|---|---|---|
| 1. Equivalência com 1/(1 − p) infinito em 27 seções | **sim** | Aplicada como escrita, dá "não vale", o lado conservador. A variante pela injeção também falha em 5 de 6. A decisão não muda |
| 2. PR 75833/0043/0074 sai "D0 com marca", e não "DP com marca" | **sim** | O que o controle testa (marca presente nas 4 com falha e ausente no RS 0322) passou, e a lista de marcas não mudou. Não rerodei esse controle |
| 3. Seção 6 inteira e nominal de MG fora do plano | **sim** | Estão marcados como exploratórios e não entram nos 192. Mas a conclusão exploratória dele ("forma de composição") cai (item 2) |
| 4. Scripts a mais (`decisao`, `lib`) | **sim** | Cosmético |

**O que falta (problemas não declarados):**

1. **Denominador do painel (item 1.3).** É o problema principal. Ele estava apontado no parecer 48 antes do plano e decide a forma final.
2. **Leitura da regra "sinal estável".** A regra diz "a UF tem teste direto com o diário de 2022 que já mostrava a associação" e lista "MG e RS".
   - Lida ao pé da letra, **qualquer** sinal de painel em MG seria estável, e a V3m de MG também. A forma seria então "não decidível".
   - O doc 28 leu por via: o coeficiente da V3m de 2022 é negativo, logo não "mostrava a associação".
   - Concordo com a leitura por via, que é a natural ("um coeficiente de 2022 positivo que passou no seu teste"). Mas a ambiguidade devia estar dita.
3. **Mínimo detectável e equivalência do painel no Nordeste:** usam o mesmo denominador. As seções de perfil quebrado inflam a alavanca e mexem no erro. Como a equivalência não vale de qualquer jeito, a decisão não muda. Os números de votos da seção 1.4 do doc 28 ficam com essa ressalva.

## 4. As 5 associações contra o 13 (sustentado)

Reprodução própria (`nivel.json`). Nível, efeito fixo de local do turno, peso 13 + 22 do turno, CR1:

| Teste | 2º turno (N2) | 1º turno (N1) |
|---|---|---|
| ES V2 | −11,89 (z −5,38) | −9,07 (z −3,95) |
| RJ V2 | −6,96 (z −5,26) | −6,43 (z −4,72) |
| SP V2 | −5,15 (z −5,32) | −3,76 (z −3,64) |
| SP V3m | −3,59 (z −6,39) | −3,31 (z −5,70) |
| SP V3s | −3,27 (z −5,24) | −2,64 (z −4,34) |

- **Fato:** os 5 já estavam no 1º turno de 2026, com o mesmo sinal e |z| ≥ 3,64.
- No painel das mesmas UFs, nenhum passa contra o 13: ES V2 +3,02; RJ V2 +6,96; SP V2 +5,62; SP V3m +0,10; SP V3s +0,14.
- O nível usa a parte do diário (L ÷ votos), não o perfil. Por isso **não sofre** o defeito do item 1.3.
- **Ressalva de vocabulário:** "estrutural" aqui quer dizer "já no 1º turno da mesma eleição", não "já em 2022".
  - Uma fraude contra o 13 igual nos dois turnos não seria separada por esse critério.
  - Como essas associações vão contra a H13, isso não muda a conclusão da H13.

## 5. Os "~25 mil votos"

- **A conta reproduz:** f = 1,934 ÷ 0,1404 (deslocamento de β por 1% injetado) = 13,77%; 13,77% × 184.884 (V3m a mais em MG) = **25.467**.
- **Não é teto: é uma estimativa sob um mecanismo.** A calibração injeta votos no 13 **só onde a V3m subiu**. O sinal do plano está do lado em que a V3m **caiu**, e do lado que subiu ele é +0,20. Por isso, a calibração pede 4 a 5 vezes mais votos do que a forma do sinal implica.
- **Conversões diretas** (fora do plano; Σ|β·e_s|·(13 + 22)_s, denominador do plano):

  | Leitura | Votos |
  |---|---|
  | Votos equivalentes de parcela, todas as seções | 4.550 |
  | Só onde a V3m caiu | 2.450 |
  | O mesmo, como votos trocados (efeito na margem) | 4.900 |
  | O mesmo, como inserção no 13 no 1º turno | 4.548 |

- **Com o denominador corrigido, não há sinal a converter.**
- **O teto aritmético (Fato)** não depende de modelo:
  - toda a V3m de MG no 2º turno são 580.336 votos (censo, universo);
  - mesmo que todos fossem votos trocados do 22 para o 13, a margem mudaria em 1.160.672, contra 4.430.191.
  - Logo, "não pesa no resultado" está certo, e por uma conta mais forte que a do doc 28.

## 6. A forma final e a frase

**Pela letra do plano:** "fato que pede explicação". A regra 1 aplica-se porque MG V3m passa por Bonferroni e é classificado como novo. Isso está certo.

**Com o defeito do denominador corrigido** (exploratório, painel das 27 UFs, `painel-denominador.json`):

| Denominador do painel | Positivos que passam (z ≥ 3,652) | Forma pela regra |
|---|---|---|
| Perfil (plano) | MG V2 4,19; RS V2 3,69; **MG V3m 4,15 (novo)** | fato que pede explicação |
| Sem as seções com perfil abaixo da metade dos aptos (Q; 3.891 seções no Brasil) | MG V2 3,66; RS V2 3,67 (estáveis) | **não decidível com dados públicos** |
| Aptos do BU | MG V2 3,74; RS V2 3,76 (estáveis) | **não decidível com dados públicos** |
| Só perfil a menos de 10% dos aptos (A2) | MG V2 3,72; RS V2 3,76; **SP V2 3,70 (sem 2022: novo)** | fato que pede explicação, por SP |

- A forma fica **na beira do corte** nas quatro variantes.
  - MG V2 e RS V2 passam por pouco (3,66 a 3,76).
  - SP V2 fica entre 3,60 e 3,70.
  - GO V2 (z 3,59 no plano) também era artefato do denominador: cai para z 1,0 a 1,3 com qualquer correção.
- **SP V2** é o mesmo padrão V2 que em MG e no RS já existia em 2022. O que decide é a linha de base de 2022 de SP (diários em download por outra frente). **Pendente.**
- **O Nordeste não muda:**
  - em nenhuma variante há z positivo acima de 1,90 numa UF do Nordeste (PB, V3s);
  - o nível não usa o perfil;
  - o exame nominal de CE, PB e PE não usa o painel.

**Recomendação de status:** registrar a forma pela regra junto com a correção. A versão curta para `hipoteses.md`:

> H13: pela regra pré-registrada, "fato que pede explicação", por uma associação em MG (liberação manual com mesário × ganho do 13). A revisão achou a explicação: o teste depende de 14 seções em que o perfil público do eleitorado (julho de 2026) tem de 1 a 23 eleitores para urnas com 139 a 419 aptos. Corrigido isso, não há sinal novo, e a H13 fica "não decidível com dados públicos". O padrão V2 de MG e do RS já existia em 2022. Pendente: SP V2, na beira do corte, sem linha de base de 2022. Nordeste: sem sinal, sem poder para descartar efeitos de algumas dezenas de milhares de votos.

**Frase em linguagem simples** (sem exagero nos dois sentidos):

> Comparando seções do mesmo prédio, a auditoria não encontrou sinal de que os eleitores liberados sem digital tenham votado mais no 13 do que os vizinhos que votaram com a digital, nem no Nordeste nem no resto do país. O teste, porém, só enxergaria um desvio a partir de algumas dezenas de milhares de votos no Nordeste, e não sabe dizer em quem cada liberado votou, porque o voto é secreto. Uma ligação que tinha aparecido em Minas Gerais vinha de 14 seções em que a tabela pública de eleitores, feita em julho, mostra de 1 a 23 eleitores para urnas que tinham mais de cem eleitores aptos no dia. Com esse erro de tabela corrigido, a ligação fica dentro do que o acaso produz. Mesmo que toda a liberação manual de Minas tivesse sido usada para trocar votos, a diferença entre os candidatos não mudaria.

(Para a perícia, valem as regras de sempre: só números de universo conferidos. "14 seções", "de 1 a 23" e "580.336" são de universo. Os coeficientes e os z não entram.)

## 7. Riscos que ficam

- **Forma na beira do corte.** MG V2, RS V2 e SP V2 ficam todos entre z 3,60 e 3,76 contra o corte de 3,652. Uma escolha razoável de denominador ou de erro muda a forma final. A decisão honesta depende da linha de base de 2022 de SP. **Pendente.**
- **Denominador nas outras análises.** O mesmo perfil de julho entra no painel dos docs 19 a 26. GO V2 já mostrou que o defeito cria sinal. Recomendo que todo painel por eleitor do perfil seja refeito com a exclusão Q, ou dividindo pelos aptos.
- **A diferença 2022 × 2026 da liberação manual em MG continua** (exploratório: +2,56, z 3,3 com Q; parecer 48: +2,93 pela V3 do boletim). Não é sinal de 2026 sozinho, mas é uma mudança entre eleições sem explicação.
  - Parque de urnas diferente e regra de registro de mesário diferente são hipóteses benignas não testadas.
  - Pelo princípio 8, a liberação manual é a brecha mais larga.
- **Item (c), diário sem votos:** só conferi MG (os votos do diário somam o comparecimento do BU nos dois turnos). Não rerodei o classificador nas 28 UFs nem o controle positivo de 2022.
- **Exame nominal de CE, PB e PE:** não refiz. Ele não usa o denominador do perfil.
- **Seções de perfil com 1 a 23 eleitores e 300 ou mais aptos:** a causa (remanejamento depois de julho?) não foi conferida. Fica para a frente das seções novas.

**Não editei** o doc 28, `hipoteses.md` nem `docs/pericia/`. Não fiz commit.

## Adendo 1: revisão

Revisão curta do adendo 1 do plano 27, que o estatístico gravou sozinho no commit ed0474c (só o doc 27 muda), e do resultado nas seções A1.1 a A1.8 do doc 28 (commit a1e694a). As regras são as mesmas de antes: sem rede, nada baixado, nenhum título lido para saída. Os diários e boletins de SP 2022 foram só lidos.

```bash
node scripts/auditoria/cetico-54-bu2022.mjs --uf rs                     # boletim de 2022 lido por tag (meu decodificador)
node scripts/auditoria/cetico-54-bu2022.mjs --uf sp
node --max-old-space-size=16000 scripts/auditoria/cetico-54-adendo.mjs   # painel ÷ aptos de cada turno, MG/RS/SP, 2026 e 2022
node scripts/auditoria/cetico-54-sp2022.mjs                              # 20 seções de SP 2022 no bruto, dois turnos
```

Saídas em `data/parsed/auditoria/cetico/54/`: `bu2022-rs.csv`, `bu2022-sp.csv`, `adendo.json` e `sp2022-bruto.json`.

### A1. Reprodução com os aptos do BU (Fato de reprodução; código próprio)

Usei o denominador do adendo: e_v = L_v,2 ÷ aptos_2 − L_v,1 ÷ aptos_1, Δc igual e log dos aptos do 2º turno como controle de tamanho. Os controles de composição vêm do perfil do mesmo ano. O efeito fixo é o do local do 2º turno, o peso é 13 + 22 do 2º turno e o erro é CR1 por local.

| Teste | Doc 28, adendo | Este parecer |
|---|---|---|
| MG 2026, V2 | +5,69 (z 3,71) | **+5,692 (z 3,71)**, 49.462 seções |
| MG 2026, V3m | +1,25 (z 2,00) | **+1,248 (z 2,00)** |
| RS 2026, V2 | +9,81 (z 3,76) | **+9,808 (z 3,76)**, 24.405 seções |
| SP 2026, V2 | +5,60 (z 3,56) | **+5,598 (z 3,56)**, 103.276 seções |
| MG 2022, V2 / V3m | +6,37 (5,13) / −1,24 (−2,51) | +6,370 (5,12) / −1,242 (−2,52), 47.222 seções |
| RS 2022, V2 | +8,83 (z 3,58) | +8,856 (z 3,60), 23.646 seções |
| SP 2022, V2 | +6,09 (z 6,34) | +6,080 (z 6,33), 100.630 seções |

- 2026 reproduz exatamente.
- Em 2022 as diferenças ficam na 2ª casa. A causa é a fonte: tirei aptos, comparecimento, local, 13 e 22 do **boletim** de 2022, lido por mim tag a tag (`cetico-54-bu2022.mjs`, 0 erros: 27.200 seções do RS e 101.071 e 101.073 de SP). O adendo usa o `detalhe_votacao_secao_2022`.
- A diferença entre o +1,23 do parecer e o +1,25 do adendo vem da definição de aptos, como o doc 28 diz. Na minha variante antiga (ΔL ÷ aptos do 2º turno), a conta do mesmo script dá o valor do parecer (`adendo.json`, chave `parecer54`).

### A2. SP 2022 no bruto (Fato: 20 de 20 nos dois turnos)

Sorteei 20 seções de SP com semente fixa (54), entre as que estão na tabela de 2022 do adendo. Para cada uma, nos dois turnos, fiz três leituras:

- **Diário:**
  - tirei o `.logjez` do zip oficial e o abri com o **7-Zip oficial**, não com o leitor do repositório, descendo nos `.jez` aninhados;
  - separei as linhas por urna e pela seção declarada, com união das cópias;
  - classifiquei as vias sobre as **mensagens originais de 2022**, sem a tabela de tradução.
- **Boletim:** o `.bu` da seção, lido por tag.
- **Comparação:** contra as vias de `diario2022/sp-<t>t.jsonl` e os votos e aptos de `adendo1/secoes-2022.csv`, que entram no modelo.

| | 1º turno | 2º turno |
|---|---|---|
| Vias do diário (votos, V1, V2, V3m, V3s, outra) iguais às do estatístico | 20 de 20 | 20 de 20 |
| 13, 22, aptos e comparecimento da tabela iguais aos do boletim | 20 de 20 | 20 de 20 |
| Votos do diário = comparecimento do boletim | 20 de 20 | 20 de 20 |
| V2 do diário = comparecimento − comparecimento com biometria (boletim) | 20 de 20 | 20 de 20 |
| V3 do diário = liberação manual do boletim | 20 de 20 | 20 de 20 |

- **A leitura de SP 2022 está certa.** Junto com a conferência de universo do doc 28 (V2 igual ao boletim em 99,44% e 99,86% das seções), isso cobre a tradução, o leitor e a tabela.
- E o coeficiente de SP 2022 sai igual com o meu boletim (+6,08, z 6,33).

### A3. A forma "não decidível" pela regra do adendo (sustentado)

- **O registro prévio é verificável.** O commit ed0474c traz só o doc 27, e o resultado vem depois (a1e694a).
  - O adendo diz que foi escrito depois de ler os números deste parecer.
  - Ele se protege da escolha a posteriori com **um só** denominador: o do parecer 48, que é anterior ao plano. Ele não escolhe entre as minhas variantes. Isso é aceitável.
- **Os positivos que passam no corte de 3,652 em 2026** são só MG V2 (3,71) e RS V2 (3,76).
  - Pela regra por UF × via, os dois são **estáveis**: em 2022, na mesma via e com o mesmo denominador, dão +6,37 (z 5,12) e +8,86 (z 3,60), acima de 2,935.
  - MG V3m não passa (z 2,00).
  - Nordeste: sem sinal. Rastro: ausente.
  - Pela seção 8, a regra 1 não se aplica e a regra 2 se aplica: **não decidível com dados públicos**. Está certo.
- **Agora a forma é robusta ao denominador, ao contrário de antes.**
  - Nas variantes do item 6 deste parecer (Q, aptos, A2), os únicos positivos que passam são MG V2, RS V2 e, no A2, SP V2 (z 3,70). SP V2 agora é **estável**: em 2022 dá +6,08, z 6,33.
  - Nenhuma variante sem o defeito do perfil leva a "fato que pede explicação".
- **O risco que fica é para baixo, não para cima.** MG V2 e RS V2 passam por pouco. Se caíssem abaixo do corte, a forma seria "sem sinal nos dados públicos". Nos dois casos, nada nos dados públicos aponta liberação sem digital usada para dar votos ao 13.
- **O peso máximo de 133.526 votos** é da amostra do modelo, e eu o trocaria pelo valor de universo. Somando o aumento da V2 seção a seção, só onde ela subiu, no universo do `h08`, dá **133.653** votos (MG 98.822, RS 34.831).
  - Os 127 votos de diferença são das seções fora do modelo.
  - A conclusão não muda. Mais forte: mesmo que **toda** a V2 do 2º turno de MG e do RS (1.502.075 + 559.431 = 2.061.506 votos) fosse voto trocado do 22 para o 13, a margem mudaria em 4.123.012, menos que os 4.430.191.

**Veredito do adendo: sustentado.** As ressalvas são duas:

- o teto em votos deve usar o universo (133.653), e não a amostra do modelo;
- a forma fica entre "não decidível" e "sem sinal", conforme MG V2 e RS V2, que estão no limite do corte.

### A4. Frase em linguagem simples para o relatório

> **Eleitores liberados sem digital.** A auditoria comparou, prédio a prédio, as seções em que mais eleitores foram liberados sem a digital com as vizinhas do mesmo prédio. Não apareceu, em nenhum estado do Nordeste nem no país como um todo, sinal de que esses eleitores tenham dado ao 13 mais votos do que os que votaram com a digital. Em Minas Gerais e no Rio Grande do Sul aparece um padrão: onde mais eleitores sem digital no cadastro voltaram a votar no 2º turno, o 13 cresceu um pouco mais. O mesmo padrão já existia na eleição de 2022, conferida nos diários de urna daquele ano. Com os dados públicos não dá para saber se isso é o jeito de votar desses eleitores ou outra coisa com o mesmo formato. Para separar uma coisa da outra seria preciso ligar cada voto a uma pessoa, o que o voto secreto impede. Mesmo que todos os eleitores sem digital no cadastro de Minas e do Rio Grande do Sul tivessem tido o voto trocado, a diferença entre os candidatos não mudaria. Uma ligação que tinha aparecido em Minas vinha de um erro na tabela pública de eleitores de 14 seções e sumiu quando a conta passou a usar o número de eleitores do boletim de urna. O teste do Nordeste não consegue descartar desvios pequenos (conferido por uma segunda verificação independente).

**Notas para o redator** (regras da perícia):

- os números citados são de universo: 14 seções; 1.502.075 e 559.431 votos; margem de 4.430.191;
- coeficientes, z, o mínimo detectável (é estimativa) e o peso de 133 mil (amostra do modelo) ficam fora.
