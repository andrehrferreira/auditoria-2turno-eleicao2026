# 25. Variação do comparecimento entre turnos e ganho do 13: 2026 × 2022, MG e Brasil

Estatístico eleitoral. Ponto de partida: [parecer cético 48](../cetico-revisor/48-h13-v2-mg-2022.md), item 6.1. Em MG, com o comparecimento medido sobre os aptos do boletim, a variação do comparecimento entre turnos (Δc) acompanha o ganho do 13 em 2026 (+4,93, z 8,3) e não em 2022 (+0,04). O z da diferença fica perto de 5,1.

## Plano (registrado em 30/10/2026, antes de rodar)

Nada abaixo muda depois de ver os dados. O que vier depois fica marcado **exploratório** na seção de resultado.

### (a) Medida do comparecimento: aptos do boletim, não eleitores do perfil

- **Medida:** Δc = (comparecimento do 2º turno − do 1º) ÷ **aptos do boletim do 1º turno**, cargo presidente. As fontes:
  - 2026: `secao_eleicao.aptos` e `secao.comparecimento` do banco;
  - 2022: `QT_APTOS` e `QT_COMPARECIMENTO` do `detalhe_votacao_secao_2022`, lendo só `_BR.csv`, porque `_BRASIL.csv` repete o presidente.
- **Seções agregadas.** Quando uma seção pequena é agregada a outra, a seção principal recebe os eleitores da agregada. A votação acontece na urna da principal, e o boletim da principal soma os aptos e o comparecimento das duas. O perfil do eleitorado por seção, ao contrário, conta cada eleitor na seção em que ele está inscrito.
  - Na principal, os eleitores do perfil ficam **abaixo** dos aptos do boletim.
  - A agregada aparece no perfil, mas não tem boletim.
  - Dividir o comparecimento da principal pelos eleitores do perfil infla Δc, e de forma diferente em cada seção. Isso atenua e distorce o coeficiente.
  - Em 2026 há 17.931 seções agregadas em 16.142 principais, iguais nos dois turnos; em MG são 2.131.
  - Os aptos do boletim estão no mesmo universo que o comparecimento, por isso são o denominador certo.
- **Exploratório e relatado:** a mesma conta com os eleitores do perfil, em MG, para mostrar a atenuação.

### (b) Teste 2026 × 2022

**Modelo, igual nos dois anos e em cada unidade.** Mínimos quadrados ponderados, com:

| Parte | O que entra |
|---|---|
| Desfecho | ΔY = parcela do 13 (13 / (13 + 22)) no 2º turno menos no 1º |
| Regressor principal | Δc |
| Controles de regressão à média | c1 = comparecimento do 1º turno ÷ aptos; Y1 = parcela do 13 no 1º turno |
| Outros controles | log dos aptos; indicadores do modelo da urna no 2º turno; indicador "aptos mudaram entre os turnos" |
| Efeito fixo | local de votação (UF, município, zona, número do local) |
| Peso | 13 + 22 do 2º turno |
| Erro | CR1 por local |

Seções com menos de 20 votos em 13 + 22 em algum turno, ou sem os dois turnos, ficam fora, com contagem. O exterior fica fora.

**Testes** (diferença β(2026) − β(2022) do coeficiente de Δc, com erros tratados como independentes):
- **T1:** MG;
- **T2:** cada uma das outras 26 UFs (26 testes);
- **T3:** "Brasil sem MG", juntando as 26.

**Regra de leitura:**
- **Só MG:** T1 significativo e T3 não.
- **Nacional:** T3 significativo, com o mesmo sinal de MG. O número de UFs com T2 significativo vai ao lado.
- **Em parte:** os outros casos.

### (c) Controle por seção agregada e por troca de urna (sensibilidade declarada, sem teste)

Refazer T1 e T3 tirando:
1. as seções principais que recebem agregadas (2026, do banco). Em 2022 não há campo público que as identifique; o indicador "aptos mudaram entre os turnos" é o substituto, e a limitação é declarada;
2. as seções com troca de urna:
   - 2026: a urna do 2º turno diferente da do 1º, ou mais de uma urna com voto num turno, pela leitura do diário (doc 17, com união das cópias);
   - 2022: o modelo da urna mudou entre os turnos (`DS_MODELO_URNA`), único sinal público;
3. as duas coisas juntas.

### (d) Explicações benignas a descartar

**Regressão à média.** Seções com comparecimento ou voto no 13 fora do comum no 1º turno tendem a voltar no 2º. Por isso o modelo principal já controla c1 e Y1.
- **Sensibilidade declarada:** o mesmo modelo sem c1 e Y1.
- Se a diferença 2026 × 2022 só aparece sem os controles, a leitura é regressão à média.

**Mobilização diferente entre as eleições.** Uma campanha que, em 2026, trouxe de volta no 2º turno mais eleitores do 13 do que em 2022 produz exatamente esse padrão, sem nada de errado. Ela se distingue de voto inserido por **quem** são os votantes a mais:
- votante liberado **pela própria digital** é uma pessoa presente, conferida por controle técnico com rastro (princípio 8);
- voto inserido no lugar de um ausente só entra pelas vias sem digital: pelo ano de nascimento ou pela liberação à mão.

**T4 (2026, pelo boletim, universo):** o mesmo modelo, com Δc dividido em ΔV1 ÷ aptos (pela digital, "por biometria" do BU) e ΔSD ÷ aptos (sem digital, "sem biometria cadastrada" + "por biografia"). São 4 testes:
- **T4a:** β(ΔV1) no Brasil sem exterior;
- **T4b:** β(ΔV1) em MG;
- **T4c:** β(ΔSD) − β(ΔV1) no Brasil;
- **T4d:** β(ΔSD) − β(ΔV1) em MG.

**Leitura de T4:**
- **Mobilização** (benigna): β(ΔV1) positivo e significativo, e β(ΔSD) − β(ΔV1) não significativo. O padrão vem de votantes conferidos pela digital.
- **Inserção:** β(ΔSD) − β(ΔV1) positivo e significativo. O padrão se concentra em quem votou sem digital.
- **Mista:** os dois positivos e significativos.

Mobilização, aqui, não identifica **por que** o eleitor voltou. Só mostra que é eleitor de verdade.

### Número de testes e corte

T1 (1) + T2 (26) + T3 (1) + T4 (4) = **32 testes**. Bonferroni a 5%: **|z| ≥ 3,16**.

### O que este desenho não vê (declarado agora)

- O voto de cada eleitor, que é secreto.
- Inserção pela via da digital, que exigiria o dedo do próprio eleitor (fora do alcance da mesa, salvo com o eleitor presente).
- Diferenças de campanha que não passam pelo comparecimento.
- Em 2022, as seções agregadas não identificáveis e a troca de urna além da mudança de modelo.

### Recursos

No máximo 2 processos Node, sem linhas de execução extras. Sem rede: os arquivos de 2022 já estão no disco, ver [23-arquivos-baixados.csv](23-arquivos-baixados.csv). Nenhum CPF nem título.

---

## Resultado (30/10/2026)

```bash
node scripts/auditoria/estatistico-h13-comp-dados2022.mjs                          # 471.011 seções de 2022 (sem exterior)
node --max-old-space-size=12000 scripts/auditoria/estatistico-h13-comp-analise.mjs # → h13-comp/resultado.json
```

Saídas em `data/parsed/auditoria/estatistico/h13-comp/`: `secoes-2022.csv` e `resultado.json`.

### Resposta curta

- **MG (T1, teste declarado): sem diferença entre os anos.** No modelo do plano, Δc acompanha o ganho do 13 em 2026 (+4,10, z 7,7) **e** em 2022 (+4,74, z 8,1). A diferença é −0,64 (z −0,8). O "2026 sim, 2022 não" do parecer 48 **não se reproduz** com os aptos do boletim e o controle da regressão à média.
- **Brasil (T2 e T3): o efeito não é só de MG, nem é novo.** A associação existe nas duas eleições e foi **mais forte em 2022**:
  - Brasil sem MG: +2,03 (z 11,4) em 2026 contra +5,02 (z 25,9) em 2022, diferença −2,98 (z −11,4);
  - 10 UFs têm diferença significativa, **todas com 2026 menor** (AC, AM, AP, GO, MA, PA, PI, RJ, RO, RR);
  - nenhuma UF tem 2026 significativamente maior; a maior diferença positiva é a do RS, +3,04 (z 2,6, abaixo do corte).
- **Mobilização × inserção (T4, 2026, boletim, universo):** a associação vem **igual** dos votantes a mais liberados pela própria digital e dos sem digital.
  - Brasil: ΔV1 +2,24 (z 13,1) e ΔSD +2,21; a diferença é −0,03 (z −0,2).
  - MG: ΔV1 +4,04 (z 7,4) e ΔSD +4,33; a diferença é +0,30 (z 0,6).
  - Pela regra fixada, isso é **mobilização**: o padrão vem de eleitores conferidos pela digital, e não se concentra em quem votou sem ela.
- **Medida (a):** em MG 2026, a mesma conta dividida pelos eleitores do perfil dá +0,46 (z 1,3); dividida pelos aptos do boletim, +4,10 (z 7,7). As 1.877 seções em que as duas medidas diferem mais de 10% são, todas menos uma, principais que recebem agregadas (1.876). A atenuação vista no parecer 48 é isso.
- **Leitura:** a variação do comparecimento entre os turnos acompanha o ganho do 13 em 2022 e em 2026, em quase todo o país, e pelos votantes conferidos pela digital tanto quanto pelos outros. Não é um padrão de 2026 nem de MG, e não tem a marca de voto inserido.

### Testes

**32 testes; Bonferroni |z| ≥ 3,16; passam 13.** Todos os 13 vão no sentido "2026 não maior que 2022" ou "mobilização":
- 10 UFs no T2;
- o T3;
- T4a e T4b (β(ΔV1) positivo).

Amostras:

| | 2026 | 2022 |
|---|---|---|
| Seções no modelo | 497.819 | 470.963 |
| Fora: menos de 20 votos em 13 + 22 | 76 | 47 |
| Fora: sem os dois turnos | 2 | 1 |
| Comparecimento: 2º turno − 1º turno | +2.920.814 votantes (+1,85% dos aptos) | +564.356 (+0,36%) |
| Seções em que os aptos mudaram entre os turnos | 55.396 | 49.465 |

**Coeficiente de Δc por UF** (pontos de parcela do 13 por 100% dos aptos; z):

| UF | 2026 | 2022 | Diferença (z) | | UF | 2026 | 2022 | Diferença (z) |
|---|---|---|---|---|---|---|---|---|
| AC | −7,55 (−2,9) | +10,77 (4,3) | **−18,32 (−5,1)** | | PA | +2,39 (3,0) | +6,53 (7,4) | **−4,15 (−3,5)** |
| AL | +2,16 (1,7) | +2,89 (1,8) | −0,74 (−0,4) | | PB | +2,11 (2,0) | +3,87 (2,9) | −1,75 (−1,0) |
| AM | −1,47 (−1,2) | +7,82 (5,8) | **−9,29 (−5,2)** | | PE | +1,69 (2,3) | +2,15 (2,7) | −0,47 (−0,4) |
| AP | −7,78 (−3,3) | +16,39 (7,0) | **−24,18 (−7,2)** | | PI | −2,13 (−2,0) | +4,54 (3,8) | **−6,67 (−4,1)** |
| BA | +0,66 (1,0) | +1,92 (3,0) | −1,25 (−1,4) | | PR | +3,73 (5,0) | +5,65 (7,3) | −1,92 (−1,8) |
| CE | +1,21 (1,6) | +2,38 (2,7) | −1,17 (−1,0) | | RJ | +1,09 (1,8) | +5,41 (8,4) | **−4,32 (−4,9)** |
| DF | −0,57 (−0,4) | +3,92 (2,6) | −4,48 (−2,1) | | RN | +0,67 (0,6) | +3,03 (1,7) | −2,37 (−1,1) |
| ES | +3,86 (3,2) | +8,42 (6,1) | −4,56 (−2,5) | | RO | +1,48 (0,9) | +10,16 (5,8) | **−8,69 (−3,6)** |
| GO | +3,55 (3,6) | +10,08 (10,3) | **−6,53 (−4,7)** | | RR | −3,90 (−1,6) | +8,72 (3,2) | **−12,62 (−3,4)** |
| MA | +1,56 (1,8) | +6,13 (6,9) | **−4,57 (−3,7)** | | RS | +3,48 (4,4) | +0,44 (0,5) | +3,04 (2,6) |
| **MG** | +4,10 (7,7) | +4,74 (8,1) | −0,64 (−0,8) | | SC | +4,57 (4,8) | +4,19 (4,3) | +0,38 (0,3) |
| MS | +6,05 (4,6) | +8,15 (5,4) | −2,10 (−1,1) | | SE | +0,68 (0,4) | +4,39 (2,6) | −3,71 (−1,7) |
| MT | +4,78 (4,1) | +7,40 (5,7) | −2,61 (−1,5) | | SP | +3,33 (8,7) | +4,11 (10,7) | −0,78 (−1,4) |
| | | | | | TO | +1,09 (0,6) | +6,55 (3,5) | −5,45 (−2,1) |

Em negrito, as diferenças que passam por Bonferroni. Brasil inteiro, sem o exterior: 2026 +2,23 (z 13,2); 2022 +4,99 (z 27,2).

### (c) e (d) Sensibilidades declaradas

Diferença 2026 − 2022 do coeficiente de Δc (z):

| Variante | MG | Brasil sem MG |
|---|---|---|
| Modelo do plano | −0,64 (−0,8) | −2,98 (−11,4) |
| Sem c1 e Y1 (regressão à média não controlada) | −1,57 (−2,0) | −2,73 (−10,3) |
| Sem principais com agregadas (2026) / sem aptos que mudaram (2022) | −1,25 (−1,5) | −3,62 (−13,3) |
| Sem aptos que mudaram (os dois anos) | −1,00 (−1,2) | −3,48 (−12,5) |
| Sem troca de urna (2026 pelo diário; 2022 pela mudança de modelo) | −0,64 (−0,8) | −2,97 (−11,2) |
| Sem agregadas, sem aptos que mudaram e sem troca de urna | −1,20 (−1,4) | −3,41 (−12,1) |

Nenhuma variante produz "2026 maior que 2022", nem em MG nem no resto do país. Seções agregadas, aptos que mudam e troca de urna não explicam nada aqui: o resultado é o mesmo com e sem elas.

**Regressão à média.** Com e sem c1 e Y1, a conclusão não muda: não há diferença em MG, e 2026 é menor no resto do país. Ela não cria o padrão, nem o esconde.

**Mobilização (T4).** 2026, pelo boletim, Δc dividido pela via:

| Unidade | Seções | β(ΔV1) pela digital (z) | β(ΔSD) sem digital (z) | ΔSD − ΔV1 (z) |
|---|---|---|---|---|
| Brasil (sem exterior) | 475.795 | **+2,24 (13,1)** | +2,21 (10,4) | −0,03 (−0,2) |
| MG | 49.462 | **+4,04 (7,4)** | +4,33 (6,4) | +0,30 (0,6) |

**Exploratório (depois de ver o resultado): a mesma decomposição em MG 2022**, com as vias do diário de 2022 (doc 24), em 47.242 seções: ΔV1 +4,78 (z 7,9), ΔSD +4,89 (z 7,6), diferença +0,11 (z 0,3). Em MG, o padrão de 2022 também vem igual dos votantes pela digital.

### Conciliação com o parecer 48 (exploratório)

O parecer 48 achou, em MG, "Δc por apto +4,93 (z 8,3) em 2026 e +0,04 em 2022", num modelo com as vias (e_V2, e_V3m, e_V3s) e os controles do perfil do cadastro. Aqui, com os mesmos controles do perfil, sem c1 e Y1, e a decomposição por via:

| MG | Δc | ΔV1 pela digital | ΔSD sem digital |
|---|---|---|---|
| 2026 | +5,81 (10,7) | +5,49 (9,8) | +7,06 (10,1) |
| 2022 | +2,31 (3,9) | +2,42 (3,9) | +2,16 (3,3) |

- **Com os controles do perfil,** 2026 fica maior que 2022 em MG, cerca de +3,5. Ainda assim, 2022 não é zero. Com os controles do plano (c1 e Y1), a diferença some (+4,10 contra +4,74).
- **A diferença entre as duas especificações** está no controle do nível de partida da seção: o comparecimento e o voto no 13 do 1º turno. Sem ele, o coeficiente absorve a regressão à média, que é diferente em cada ano.
- **Não reproduzi o +0,04 de 2022 em nenhuma especificação.** A mais próxima é a com os controles do perfil (ΔV1 +2,42).
- **Pendente (revisão):** comparar o código do parecer (`cetico-48-modelo.mjs`) com este, linha a linha, para achar de onde vem o +0,04.

### Leitura

1. **A medida importa (a).** Dividir pelos eleitores do perfil atenua Δc nas seções que recebem agregadas, e daí veio o +0,91 do doc 24. Com os aptos do boletim, Δc acompanha o ganho do 13 em MG nos dois anos.
2. **Não é só MG, nem é de 2026 (b).** A associação "mais gente votou no 2º turno → mais voto no 13" existe em quase todas as UFs, nas duas eleições, e foi **mais forte em 2022**. Em 10 UFs, 2026 fica significativamente abaixo de 2022; em nenhuma fica acima.
3. **Seção agregada e troca de urna (c)** não mudam nada.
4. **Benignas (d):**
   - a regressão à média não cria o padrão;
   - a mobilização é a leitura que os dados favorecem: o padrão vem, na mesma medida, dos votantes conferidos pela própria digital, que não podem ser inseridos pela mesa sem a pessoa presente, e não se concentra em quem votou sem digital.
5. **Para a H13:** a "outra coisa" que o substituto do doc 23 carregava em MG é, muito provavelmente, essa associação geral entre comparecimento e ganho do 13. Ela não é de 2026, não é de MG e não tem marca de inserção. Ela não muda a leitura do sinal V2 dos docs 22 a 24.

### O que isto permite e o que não permite afirmar

**Permite:**
- **Fato (teste declarado):** em MG, a associação entre a variação do comparecimento (÷ aptos do boletim) e o ganho do 13 é do mesmo tamanho em 2026 e em 2022;
- **Fato (teste declarado):** fora de MG ela existe nas duas eleições e é menor em 2026;
- **Fato (teste declarado):** em 2026 ela vem igual dos votantes pela digital e dos sem digital, no Brasil e em MG.

**Não permite:**
- dizer por que o eleitor voltou no 2º turno, ou em quem votou (voto secreto);
- excluir voto inserido pela via da digital, que exigiria o eleitor presente;
- tratar o resultado com os controles do perfil como confirmatório: ele é exploratório e depende da especificação.
