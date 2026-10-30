# 19. H13, sinal V2 fora do Nordeste: composição ou inserção?

Estatístico eleitoral, **30/10/2026**. Testes fixados antes de rodar no adendo de 30/10/2026 ao [plano 16](16-h13-log-plano.md). O que foi decidido depois de ver os dados está marcado **exploratório**. O sinal vem do [doc 18](18-h13-log-resultado.md) (painel, V2 = liberação pelo ano de nascimento, sem digital na urna).

## Resposta curta

- **Fato:** nenhum dos 18 testes declarados passa por Bonferroni (|z| ≥ 2,99).
- **As assinaturas de inserção pela mesa não aparecem.** O V2 a mais do 2º turno não se concentra na última hora: a parcela do V2 na última hora caiu mais que a do V1, diferença em diferenças de −0,62 ponto fora do Nordeste. Também não pesa mais quando vem em sequência (B2: −0,40, z −0,7). O sinal não depende de poucos municípios: tirando os 10 que mais contribuem, β = 5,67 (z 8,0). E as 20 seções que mais pesam têm V2 espalhado no dia, em ritmo humano (menor intervalo entre dois V2 seguidos: 30 s), sem pedido de digital e sem rajada.
- **A composição por idade também não explica.** As interações com a idade da seção e com a idade dos sem biometria não passam no teste, e o β fica de pé com elas (5,67 a 6,09, z ≥ 8,3 fora do Nordeste).
- **Leitura pela regra fixada antes:** o resultado é **misto, desfavorável à inserção com rastro de mesa** (última hora, sequência, poucos municípios, rajada). Fica aberta uma composição por outro traço que não é a idade, ou uma inserção em ritmo humano, espalhada por milhares de seções. Esta segunda exigiria, para o tamanho visto (cerca de 62 mil votos), uma operação difusa em quase 3.800 municípios sem deixar padrão de horário.
- **Um ponto a acompanhar:** o V2 a mais da última hora tem inclinação um pouco maior que o do resto do dia (8,17 contra 6,25; diferença z 2,71 fora do Nordeste, 2,56 no Sudeste). Não passa no corte. Por volume, a última hora pesa pouco: 5,3% dos V2 do 2º turno.

## Comandos

```bash
node scripts/auditoria/estatistico-h13-v2-perfil.mjs           # idade com e sem biometria, por seção (perfil_eleitor_secao)
node scripts/auditoria/estatistico-h13-v2-horario.mjs --turno 2 # 93 min, um processo
node scripts/auditoria/estatistico-h13-v2-horario.mjs --turno 1 # 111 min, um processo (os dois rodaram juntos: 2 processos)
node --max-old-space-size=14000 scripts/auditoria/estatistico-h13-v2-analise.mjs
node scripts/auditoria/estatistico-h13-v2-bruto.mjs            # as 20 seções de maior contribuição, nos dois turnos
```

Saídas em `data/parsed/auditoria/estatistico/h13-v2/`: `perfil-idade.csv`, `horario-1t.jsonl`, `horario-2t.jsonl` (499.248 seções cada, 0 erro), `resultado.json`, `concentracao-municipios.csv`, `top20.csv`, `bruto-top20.json`.

## Dados e amostra

- **Seções no painel:** 497.473 (Brasil sem o exterior). Ficaram fora 424: 326 sem perfil do eleitorado, 76 com menos de 20 votos em 13 + 22, 20 com diário diferente do BU e 2 sem a seção nos dois turnos. Em todas as que entraram, o V2 contado na leitura de horário é igual ao da varredura do doc 17.
- **Fora do Nordeste:** 356.827 seções, das quais 344.144 em locais com 2 seções ou mais. Sudeste: 203.129. Sul: 71.954.
- **Perfil por idade (Fato):** dos 17.443.923 eleitores sem biometria no cadastro do país, 24,5% têm 16 a 24 anos e 19,2% têm 70 ou mais. No eleitorado inteiro, essas faixas são 12,1% e 10,9%.

## Modelo de base (reprodução do doc 18)

| Unidade | β ΔV2 (pontos por 100%) | z |
|---|---|---|
| Fora do Nordeste | +6,45 | 10,4 |
| Sudeste | +6,32 | 8,4 |
| Sul | +9,66 | 6,0 |
| Nordeste (comparação) | −0,17 | −0,2 |

## (a) Idade

Primeiro, a inclinação política de cada faixa, no nível do 2º turno, com o mesmo efeito fixo de local e os mesmos controles. Fora do Nordeste, a parcela de 16 a 24 anos puxa para o 13 (+15,6, z 116). A de 70 ou mais puxa para o 22 (−8,75, z −27).

| Unidade | Teste | Interação β (z) | β ΔV2 com a interação |
|---|---|---|---|
| Fora do Nordeste | A1 ΔV2 × p16–24 | −8,21 (−1,1) | 6,09 (9,5) |
| | A1 ΔV2 × p70+ | +14,95 (+2,1) | |
| | A2 ΔV2 × jovens entre os sem biometria | −0,25 (−0,1) | 5,67 (8,3) |
| | A2 ΔV2 × 70+ entre os sem biometria | +8,87 (+2,3) | |
| Sudeste | A1 p16–24 / p70+ | −8,15 (−0,8) / +14,21 (+1,8) | 5,87 (7,6) |
| | A2 jovens / 70+ entre os sem biometria | −5,17 (−1,1) / +6,44 (+1,6) | 5,33 (6,3) |
| Sul | A1 p16–24 / p70+ | −21,10 (−0,9) / +33,92 (+1,6) | 9,07 (5,5) |
| | A2 jovens / 70+ entre os sem biometria | +13,27 (+1,5) / +31,01 (+2,5) | 9,04 (4,5) |

**Leitura.** Se o V2 a mais fosse de jovens voltando a votar, o efeito seria maior onde há mais jovens: interação positiva com 16–24. Não é (todas perto de zero ou negativas, nenhuma passa). As interações com 70+ são positivas e chegam perto do corte (z 2,1 a 2,5), mas apontam no sentido oposto ao da composição: os idosos dessas seções puxam para o 22. Nenhuma interação passa por Bonferroni, e o β principal quase não muda. **A idade não explica o sinal.**

Detalhe de construção (fixado ao montar A2, antes de rodar): onde a seção tem menos de 5 eleitores sem biometria (52.280 seções fora do Nordeste), a fração de jovens e de idosos entre eles fica na média da unidade, com um indicador próprio como controle.

## (b) Horário e sequência

### Testes

| Unidade | B1: β última hora | β resto do dia | Diferença (z) | B2: β em sequência | β isolado | Diferença (z) |
|---|---|---|---|---|---|---|
| Fora do Nordeste | 8,17 (9,2) | 6,25 (10,0) | +1,92 (2,71) | 6,14 (8,2) | 6,54 (10,3) | −0,40 (−0,72) |
| Sudeste | 8,34 (7,7) | 6,12 (8,1) | +2,23 (2,56) | 5,95 (6,7) | 6,46 (8,4) | −0,51 (−0,78) |
| Sul | 10,97 (4,8) | 9,51 (5,9) | +1,46 (0,81) | 10,70 (5,7) | 9,31 (5,7) | +1,39 (1,05) |
| Nordeste (comparação) | −0,25 | −0,16 | −0,09 (−0,09) | −0,83 | 0,00 | −0,83 (−0,77) |

"Última hora" é a hora antes do `Inicio do Encerramento` de cada urna. "Em sequência" quer dizer que o eleitor anterior da mesma urna também foi V2.

### Descritivo (Fato), fora do Nordeste

| | 1º turno | 2º turno |
|---|---|---|
| Votos V2 | 5.336.449 | 5.592.118 |
| Parcela dos V2 na última hora | 8,96% | 5,27% |
| Parcela dos V1 na última hora | 7,58% | 4,52% |
| Parcela dos V2 cujo anterior também foi V2 | 15,2% | 15,5% |
| Seções com 10 ou mais V2 em 10 minutos | 0 | 627 |
| Seções com 20 ou mais V2 em 10 minutos | 0 | 0 |

- **Diferença em diferenças na última hora:** −0,62 ponto. O V2 perdeu peso no fim do dia um pouco **mais** que o V1.
- **A mais por hora** (2º − 1º turno, hora local, das 8 h às 16 h), lado a lado:

| Via | 8 h | 9 h | 10 h | 11 h | 12 h | 13 h | 14 h | 15 h | 16 h |
|---|---|---|---|---|---|---|---|---|---|
| V1 | +4.919.881 | +3.119.014 | +2.403.196 | +677.739 | −1.152.392 | −1.690.066 | −1.696.805 | −1.887.438 | −2.425.390 |
| V2 | +317.120 | +219.727 | +191.547 | +79.007 | −35.089 | −71.361 | −69.069 | −104.462 | −189.959 |

  O V2 a mais segue o mesmo perfil do V1 a mais: o 2º turno, com 1 cargo, andou mais rápido de manhã e esvaziou à tarde. As 627 seções com 10 V2 em 10 minutos vêm desse ritmo: com 1 cargo, uma mesa atende 10 eleitores em 10 minutos. Com 6 cargos, no 1º turno, isso não acontecia. Nenhuma chega a 20.

**Leitura.** Inserção pela mesa tende a deixar V2 no fim do dia, em rajada ou em sequência. O V2 a mais do 2º turno não está na última hora, não vem mais em sequência que no 1º turno e segue o horário do eleitor pela digital. A inclinação da última hora é um pouco maior (B1), mas não passa no corte, e esse grupo é pequeno (5,3% dos V2).

## (d) Concentração

Contribuição de cada seção para o β (numerador do estimador depois de tirar o local e os controles), somada por município e por zona. A "alavanca" é a parte do denominador: quanto a seção pesaria só pelo tamanho da variação de V2.

| Fora do Nordeste | Unidades | 1% maiores: numerador / alavanca | 5% maiores | 10% maiores |
|---|---|---|---|---|
| Municípios | 3.776 | 53% / 30% (38 municípios) | 105% / 45% | 139% / 52% |
| Zonas | 4.202 | 33% / 6,9% (42 zonas) | 98% / 22% | 144% / 34% |

Parcelas acima de 100% significam que o resto, somado, puxa para o outro lado.

- **Maiores municípios por contribuição** (numerador / alavanca): SP 71072 11,5% / 9,2%; MG 41238 4,6% / 3,3%; RS 88013 3,6% / 2,2%; RJ 60011 2,6% / 5,2%; ES 56251 2,3% / 0,7%. São capitais e grandes cidades, em geral com peso perto da própria alavanca.
- **Critério declarado (sem os 10 municípios de maior contribuição):**

| Unidade | β | z | Concentrado? |
|---|---|---|---|
| Fora do Nordeste | 5,67 | 8,0 | não |
| Sudeste | 5,14 | 5,7 | não |
| Sul | 7,07 | 3,76 | não (no limite) |

- **Sem cada UF, uma de cada vez:** fora do Nordeste, β entre 6,14 (sem RS) e 6,67 (sem PA), z entre 8,8 e 10,5. No Sul, sem RS: 8,92 (z 3,7).
- **As 20 seções de maior contribuição** somam 3,8% do numerador fora do Nordeste.

**Leitura.** O sinal está mais concentrado em algumas zonas do que a alavanca prevê: 1% das zonas tem um terço do numerador. Mas não depende delas para existir. Não há referência nula para essa concentração de zonas: é descritiva (**exploratório**).

## (c) As 20 seções de maior contribuição, no diário bruto (Fato)

Lista em `top20.csv`; detalhes em `bruto-top20.json`. As 20 estão fora do Nordeste: 7 em MG, 6 no RJ, 2 em SP, 2 em MS e 1 em ES, AM e RS.

- **V2 a mais por seção:** de −6 a +13. O peso delas vem mais do salto do 13 entre turnos do que do tamanho do V2 a mais. Exemplo: RJ 58041/0152/0084, com V2 de 20 para 27 e o 13 de 38,2% para 49,8%.
- **Horário:** o V2 do 2º turno está espalhado das 8 h às 16 h em todas as 20, sem acúmulo no fim do dia: na hora das 16 h, de 0 a 7 V2 por seção no 2º turno (de 0 a 12 no 1º).
- **Ritmo:**
  - menor intervalo entre dois V2 seguidos no 2º turno: de 30 s (MG 40339/0009/0031) a 129 s;
  - maior sequência de V2: 13 em ES 56332/0040/0007, de 09:39 a 10:04, com intervalos de 47 a 326 s. Nessa seção, metade dos votantes é V2 nos dois turnos (93 de 196 e 105 de 207), o que torna sequências longas esperadas;
  - nas outras 19, a maior sequência vai de 0 a 5.
- **Leitor:** nenhum ciclo V2 com `Solicita digital` (a urna não pediu digital, como deve ser na V2). `Foto do eleitor apresentada` em 0 a 4 ciclos V2 por seção.
- **Erros e mesa:**
  - 1 linha ERRO por seção no 2º turno, em todas as 20: `Problema ao desmontar a MR`, entre 7 h e 8 h, antes da votação. Não aparece no 1º turno;
  - ALERTA: de 4 a 50 por seção, sem padrão entre turnos;
  - de 6 a 9 mesários registrados por seção, nos dois turnos.
- **Liberação à mão com mesário:** muda entre turnos em algumas seções. Exemplo: RJ 60011/0211/0156, com 0 de 19 no 1º turno e 26 de 26 no 2º. Isso é a classificação V3m/V3s, não V2, e já está descrito no doc 18 (reclassificação entre turnos).

Nenhuma das 20 mostra rajada de V2, V2 no fim do dia ou V2 em ritmo de mesa (abaixo de 30 s).

## Leitura conjunta pela regra do adendo

| Critério | Previsto por composição | Previsto por inserção | Observado |
|---|---|---|---|
| (a) idade | interação com a idade | nenhuma | nenhuma interação passa; β intacto → **não confirma composição por idade** |
| (b) horário e sequência | inclinações iguais | concentra na última hora ou em sequência | não concentra (B1 z 2,71 não passa; B2 nulo; diferença em diferenças −0,62) → **contra inserção** |
| (d) concentração | não depende de poucos municípios | depende | não depende (z 8,0 sem os 10 maiores) → **contra inserção** |
| (c) bruto | V2 espalhado | rajadas | V2 espalhado, ritmo humano → **contra inserção** |

**Resultado: misto.** As três assinaturas de inserção pela mesa estão ausentes. A explicação benigna testada (idade) não se confirma.

## O que isto permite e o que não permite afirmar

**Permite:**
- **Fato:** o sinal V2 fora do Nordeste não tem as marcas que uma inserção pela mesa deixaria no diário: não está na última hora, não está em sequência, não depende de poucos municípios e não aparece como rajada nas seções que mais pesam;
- **Fato:** a idade do eleitorado (da seção e dos sem biometria) não explica o sinal.

**Não permite:**
- dizer que o sinal é benigno: a composição que o explicaria não foi identificada;
- excluir inserção em ritmo humano, espalhada por milhares de seções e sem padrão de horário. Para o tamanho visto (~14% dos V2 a mais do país, ~62 mil votos, doc 18), ela exigiria uma operação difusa em quase 3.800 municípios;
- dizer em quem votou o eleitor V2 (voto secreto).

## Pendências e próximos passos

- **Recomendação:** testar outros traços de composição que o perfil público tem: escolaridade e estado civil dos sem biometria. Também o grupo "foto sem digital" (`Foto do eleitor apresentada` nos ciclos V2), que é a maior parte do V2 em algumas zonas (perícia, tópico 4, item 3). O teste seria a interação ΔV2 × fração de V2 com foto.
- **Recomendação:** referência nula para a concentração por zona (permutar o resíduo de ΔY dentro do local).
- O ponto B1 (última hora, z 2,71) fica para revisão independente.
