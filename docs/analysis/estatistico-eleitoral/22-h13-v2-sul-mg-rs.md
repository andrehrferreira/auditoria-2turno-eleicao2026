# 22. H13, sinal V2 no Sul, em MG e no RS: escolaridade, estado civil, foto, concentração e 2022

Estatístico eleitoral, **30/10/2026**. Plano fixado antes de rodar no **adendo 3** do [plano 16](16-h13-log-plano.md). O adendo 2 foi registrado e não chegou a rodar: foi substituído pelo 3, depois do [parecer cético 42](../cetico-revisor/42-h08-h13-log.md). O que foi decidido depois de ver os dados está marcado **exploratório**. Este doc não altera os docs 17, 18 e 19, que estão em revisão; as correções que valem para eles estão na seção 1.

## Resposta curta

- **Fato:** com a medida por eleitor do cadastro, o sinal V2 continua no Sul (+8,38, z 4,3), em MG (+5,68, z 4,2) e no RS (+9,66, z 3,7). Isso reproduz o parecer 42. Descontada a regressão à média, fica +6,35 (3,5), +5,12 (3,9) e +7,79 (3,1).
- **Fato:** dos 39 testes declarados, passa 1 por Bonferroni, e ele não é sobre o sinal: é a comparação por zona de 2026, que vai no sentido oposto (ver d).
- **Nenhuma assinatura de inserção:**
  - **foto:** a interação com a parte de V2 que teve a foto apresentada não é negativa. No RS é positiva (z 3,06, abaixo do corte de 3,22);
  - **concentração:** igual à de um efeito homogêneo com ruído. A parte das 1% maiores zonas fica dentro da nula nas três unidades (p de 0,27 a 0,69).
- **Composição por escolaridade ou estado civil:** não demonstrada. Nenhuma das 24 interações passa. Em MG, as da seção apontam no sentido que a composição preveria (escolaridade baixa, que puxa para o 13: z 2,65), mas não passam; as dos sem biometria são nulas.
- **2022: Pendente.** O substituto por zona não reproduz nem o sinal de 2026: por zona, o V2 real de 2026 se associa **negativamente** ao ganho do 13 (Sul z −2,7; MG z −3,9). O sinal vive dentro do local de votação e some quando se agrega por zona. Comparar com 2022 exige voto por seção e biometria por seção de 2022, que não estão no disco (sem rede).
- **Leitura pela regra do adendo 3: misto.** Os dados não mostram rastro de inserção, e não identificam a composição que explicaria o sinal. O sinal é real nas três unidades, difuso e do tamanho de uma diferença de comportamento entre grupos de eleitores, mas a causa fica aberta.

## Comandos

```bash
node scripts/auditoria/estatistico-h13-v2-perfil2.mjs     # escolaridade e estado civil por seção, com e sem biometria
node scripts/auditoria/estatistico-h13-v2-zonas.mjs       # tabela por zona, 2022 e 2026
node scripts/auditoria/estatistico-h08-varredura.mjs --turno 1 --secoes <10 seções> --saida data/parsed/auditoria/estatistico/h08-uniao/1t --paralelo 1
node scripts/auditoria/estatistico-h08-varredura.mjs --turno 2 --secoes <5 seções>  --saida data/parsed/auditoria/estatistico/h08-uniao/2t --paralelo 1
node scripts/auditoria/estatistico-h13-v2-horario.mjs --turno 1 --secoes <10 seções> --saida data/parsed/auditoria/estatistico/h08-uniao/horario-1t.jsonl
node scripts/auditoria/estatistico-h13-v2-horario.mjs --turno 2 --secoes <5 seções>  --saida data/parsed/auditoria/estatistico/h08-uniao/horario-2t.jsonl
node --max-old-space-size=14000 scripts/auditoria/estatistico-h13-v2-analise2.mjs
```

As listas de seções relidas estão na seção 1. Saídas em `data/parsed/auditoria/estatistico/h13-v2/`: `perfil-escol-civil.csv`, `zonas.csv`, `resultado2.json`; e em `data/parsed/auditoria/estatistico/h08-uniao/`.

## 1. Correção do leitor: união das cópias da mesma urna (Fato)

O parecer 42 achou um erro no leitor dos docs 17 a 19. Quando a mesma urna aparece em mais de um texto do pacote (cópia MI/ME, trecho girado do log, `.jez` aninhado), a regra "fica a cópia com mais linhas" descartava trechos que só estavam em outro texto.

- **Correção:** função `juntarCopias(lista, modo)` em `scripts/auditoria/estatistico-h08-varredura.mjs`, com a opção `--copias uniao|maior`; o padrão agora é `uniao`.
  - A união junta todas as linhas distintas. Os textos entram na ordem da primeira linha do dia (empate: o mais longo primeiro), e cada linha já vista é pulada.
  - `--copias maior` repete a regra antiga.
  - Os leitores `estatistico-h13-v2-horario.mjs`, `estatistico-h13-v2-bruto.mjs` e `estatistico-h08-curtos.mjs` passaram a usar a mesma função.
- **Sem refazer tudo:** a regra só muda alguma coisa onde algum texto tinha linhas fora do maior, o que a varredura registrou em `linhasForaDaCopia`. São **10 seções no 1º turno e 5 no 2º**. Reli só essas, com a união:
  - 1º turno: BA 34797/0060/0030, MG 44458/0103/0221, MG 47830/0165/0031, MS 90379/0006/0044, PA 04278/0073/0291, PR 75353/0002/0574, PR 76570/0010/0273, RJ 58041/0155/0190, RJ 60011/0204/0266, SP 64750/0212/0299;
  - 2º turno: BA 35653/0173/0235, GO 93335/0008/0295, MS 91650/0051/0044, PR 74918/0056/0037, SP 61654/0014/0250.
- **Resultado:** com a união, as 10 seções do 1º turno dão votos iguais ao BU. Cinco delas estavam entre as "14 com diário menor que o BU" do doc 17: MG 44458 (+1), MG 47830 (+37), PR 75353 (+20), PR 76570 (+102) e RJ 58041 (+106), somando 266 votos recuperados.
  - **No 1º turno, os votos do BU sem linha no diário passam a ser 159, em 9 seções, e não 425 em 14** (igual ao parecer 25).
  - **No 2º turno não muda:** continuam 54 votos em 6 seções. BA 35653/0173/0235 segue com 204 no diário contra 217 no BU.
- **Efeito no H08:** nenhum. Nos trechos recuperados não há ciclo ≤ 1 s, D negativo nem voto sem ciclo; o menor D é 34 s no 1º turno e 20 s no 2º. Os outros números do doc 17 mudam em 266 ciclos de 124,8 milhões.
- **Efeito na H13:** essas seções antes saíam por "diário ≠ BU". Agora entram. A análise deste doc usa as vias relidas.

## 2. Dados e medida

- **Unidades:** Sul (PR, RS, SC), MG e RS. O RS está dentro do Sul.
- **Seções no painel:** 124.000 nas três unidades. Ficaram fora 77: 51 sem perfil, 22 com menos de 20 votos em 13 + 22, 2 com diário diferente do BU e 2 sem a seção nos dois turnos. Por unidade:

| Unidade | Seções | Em locais com 2 ou mais seções | Locais |
|---|---|---|---|
| Sul | 71.956 | 66.768 | 10.855 |
| MG | 52.044 | 49.462 | 7.493 |
| RS | 27.515 | 24.405 | 4.662 |

- **Medida principal:** e_v = Δ(votos da via) ÷ eleitores do cadastro, com Δc = Δ(votos) ÷ eleitores no modelo. O coeficiente de e_V2 é a **parte própria da V2**: quanto um votante V2 a mais acompanha o ganho do 13 além de um votante pela digital a mais.
- **Perfil (Fato, Brasil):** entre os 17.443.923 eleitores sem biometria no cadastro, comparados com o eleitorado inteiro:

| | Sem biometria | Eleitorado inteiro |
|---|---|---|
| Escolaridade baixa | 36,3% | 30,7% |
| Superior completo | 5,0% | 11,4% |
| Solteiros | 69,8% | 60,5% |
| Casados | 25,5% | 31,8% |

## 3. Modelo de base (parte própria da V2)

Pontos de parcela do 13 por 100% do cadastro (z).

| Unidade | e_V2 | e_V3m | e_V3s | Δc (qualquer votante a mais) | e_V2 descontada a regressão à média | Medida antiga (parcela) |
|---|---|---|---|---|---|---|
| Sul | **+8,38 (4,34)** | +0,44 (1,0) | +0,75 (1,7) | +7,15 (14,5) | +6,35 (3,46) | +9,66 (6,0) |
| MG | **+5,68 (4,19)** | +1,93 (4,15) | +0,85 (1,1) | +0,91 (1,3) | +5,12 (3,92) | +6,25 (5,1) |
| RS | **+9,66 (3,69)** | −0,18 (−0,3) | +0,42 (0,6) | +5,53 (6,5) | +7,79 (3,11) | +9,90 (4,7) |

- Os três valores de e_V2 reproduzem o parecer 42 (+8,39, +5,70 e +9,66).
- **Exploratório:** em MG, a V3m (liberação à mão com mesário) também tem parte própria (+1,93, z 4,15). No Sul e no RS, não.

## 4. Testes

**39 testes; Bonferroni |z| ≥ 3,22 (bilateral) ou p ≤ 0,00128 (unilateral, teste c). Passa 1, e ele não é sobre o sinal (item d).**

### (a) Escolaridade e estado civil

**Inclinação política de cada traço da seção inteira**, no nível do 2º turno, com o mesmo efeito fixo e controles:

| Unidade | Escolaridade baixa | Superior | Solteiro | Casado |
|---|---|---|---|---|
| Sul | +23,2 (43) | −0,7 (−0,9) | −4,8 (−5,4) | −15,0 (−17) |
| MG | +20,8 (46) | −4,8 (−4,3) | −7,3 (−6,9) | −10,0 (−9,7) |
| RS | +20,6 (25) | +1,3 (1,1) | −6,7 (−4,6) | −15,3 (−10,8) |

As seções de escolaridade baixa votam mais no 13; as de casados, menos. As frações entre os sem biometria têm inclinações pequenas: por exemplo, escolaridade baixa −1,3 a −1,9 depois dos controles da seção.

**Interações com e_V2** (as 4 juntas em cada linha):

| Unidade | Família | e_V2 | × baixa | × superior | × solteiro | × casado |
|---|---|---|---|---|---|---|
| Sul | A3 seção | 9,53 (4,6) | −2,6 (−0,1) | +20,1 (0,7) | −49,7 (−0,8) | −43,4 (−0,6) |
| Sul | A4 sem biometria | 7,68 (3,5) | +8,0 (0,6) | +37,4 (1,1) | −25,7 (−0,6) | −31,4 (−0,6) |
| MG | A3 seção | 6,01 (4,1) | **+27,1 (2,65)** | +18,7 (1,0) | −88,9 (−2,36) | −113,7 (−2,62) |
| MG | A4 sem biometria | 4,19 (2,9) | +4,9 (0,6) | +12,9 (0,5) | −17,9 (−0,5) | +2,8 (0,1) |
| RS | A3 seção | 9,91 (3,5) | +21,7 (0,7) | +57,9 (1,5) | −25,3 (−0,3) | −42,1 (−0,5) |
| RS | A4 sem biometria | 8,00 (2,8) | +21,4 (1,2) | +69,3 (1,6) | −56,6 (−0,9) | −74,6 (−1,1) |

Nenhuma passa. Em MG, as da seção inteira têm o sinal que a composição preveria: o efeito é maior onde há mais escolaridade baixa (que puxa para o 13) e menor onde há mais casados. O z vai de 2,4 a 2,7, abaixo do corte. As interações com o perfil dos **sem biometria**, que seriam o teste mais direto de "quem voltou a votar", são nulas nas três unidades.

### (b) Foto

| Unidade | Seções com 5 ou mais V2 | Parte dos V2 do 2º turno com foto | Seções com 0% de foto | e_V2 | × fração com foto |
|---|---|---|---|---|---|
| Sul | 36.253 | 4,0% | 20.564 | 9,50 (4,8) | +28,3 (1,79) |
| MG | 44.442 | 2,3% | 24.212 | 4,48 (3,1) | −39,3 (−1,69) |
| RS | 21.480 | 2,5% | 12.672 | 12,30 (4,5) | +126,7 (3,06) |

A foto quase não aparece nos ciclos V2 dessas unidades. Inserção sem conferência da foto previa interação negativa. Não aparece: no RS a interação é positiva e fica perto do corte, no sentido de o sinal ser **maior** onde a urna mostrou a foto. Como a variação é pequena (mais da metade das seções sem nenhuma foto), o teste tem pouco poder.

### (c) Referência nula da concentração por zona

Parte do numerador do coeficiente de e_V2 nas 1% maiores zonas, contra 1.000 repetições de efeito homogêneo com ruído (bootstrap selvagem por local).

| Unidade | Zonas | 1% maiores | Observada | Nula: mediana [5%; 95%] | p unilateral |
|---|---|---|---|---|---|
| Sul | 1.257 | 13 | 48% | 53% [41%; 78%] | 0,69 |
| MG | 898 | 9 | 44% | 39% [28%; 58%] | 0,27 |
| RS | 521 | 5 | 37% | 40% [28%; 63%] | 0,60 |

A concentração observada é a que um efeito igual em todo lugar produz, dado o ruído. A "1% das zonas com 33% do numerador" do doc 19 não indica foco: com zonas de tamanhos e ruídos diferentes, o topo sempre leva uma parte grande.

**Por que não permutar ΔV2 dentro do local:** a permutação impõe β = 0. Com β = 0, o numerador fica perto de zero e a "parte do numerador" perde o sentido. A pergunta é se o β é mais concentrado do que um efeito homogêneo produziria, e por isso a nula mantém o β observado.

### (d) 2022

Pontos de parcela do 13 (z). "Calibração" é o mesmo modelo de 2026 com o ΔV2 real no lugar do produto.

| Unidade | Zonas | 2022 Δc × sem biometria | 2026 Δc × sem biometria | Diferença 2026 − 2022 | Calibração 2026 com o ΔV2 real |
|---|---|---|---|---|---|
| Sul | 1.253 | −22 (−0,2) | **−170 (−4,13)** | −148 (−1,5) | −151 (−2,7) |
| MG | 898 | −43 (−2,1) | +21 (0,7) | +64 (1,7) | −114 (−3,9) |
| RS | 522 | +309 (2,0) | −161 (−1,8) | −470 (−2,6) | −79 (−0,9) |

**Leitura: o substituto não serve.** Por zona, em 2026, nem o ΔV2 **real** reproduz o sinal: entre zonas da mesma UF, onde a V2 cresceu mais, o 13 cresceu **menos** (Sul −151, MG −114). O sinal só existe na comparação **dentro do mesmo local de votação**. Agregado por zona, o perfil das zonas o domina e inverte. O único teste que passa por Bonferroni (Sul 2026, z −4,13) é esse padrão entre zonas, não o sinal.

**Pendente:** a comparação com 2022 precisa de voto por candidato por seção (`votacao_secao_2022`) e de biometria por seção (`perfil_eleitor_secao_2022`) do TSE. Não estão no disco; com a regra sem rede, não foram baixados.

## 5. Leitura conjunta pela regra do adendo 3

| Critério | Composição prevê | Inserção prevê | Observado |
|---|---|---|---|
| (a) escolaridade e estado civil | interações alinhadas à inclinação | nenhuma | nenhuma passa; MG (seção) alinhada, z ≤ 2,7; sem biometria nulas → **não demonstra composição** |
| (b) foto | nada | interação negativa | não negativa (RS +, z 3,06) → **contra inserção sem conferência da foto** |
| (c) concentração | igual à nula | acima da nula | igual à nula (p 0,27 a 0,69) → **contra inserção concentrada** |
| (d) 2022 | mesma associação | ausente | substituto inválido → **Pendente** |

**Resultado: misto.**
- Somando os docs 19 e 22, a inserção não deixou nenhuma das marcas que deixaria no diário e nos dados: última hora, sequência, rajada, poucos municípios, concentração acima do acaso, falta de foto.
- A composição também não foi demonstrada: idade, escolaridade e estado civil, do eleitorado ou dos sem biometria, não explicam o sinal.
- Os dados por seção não separam as duas leituras. O voto é secreto, e o substituto de 2022 não funciona.

## 6. O que isto permite e o que não permite afirmar

**Permite:**
- **Fato:** no Sul, em MG e no RS, um votante V2 a mais acompanha um ganho do 13 maior que o de um votante pela digital a mais, dentro do mesmo local de votação. A diferença é de +5,7 a +9,7 pontos por 100% do cadastro, e de +5,1 a +7,8 descontada a regressão à média.
- **Fato:** esse sinal é tão concentrado quanto um efeito homogêneo seria. Não é mais forte onde a urna não mostrou foto, e não depende de idade, escolaridade ou estado civil medidos no cadastro.
- **Fato:** no 1º turno, os votos do BU sem linha no diário são 159, em 9 seções. A contagem de 425 em 14 vinha da regra de cópia, já corrigida.

**Não permite:**
- dizer que o sinal é composição: o traço que o explicaria não foi achado;
- dizer que é inserção: nenhuma marca de inserção aparece, e o sinal tem o formato de uma diferença difusa de comportamento;
- comparar com 2022 enquanto faltarem os dados por seção.

## Pendências

- **2022 por seção:** baixar, com autorização de rede, `votacao_secao_2022` e `perfil_eleitor_secao_2022` e rodar o mesmo painel 1º → 2º turno com a parte sem biometria do cadastro no lugar da V2.
- **MG, V3m com parte própria** (+1,93, z 4,15): é exploratório e não estava no plano. Vai para revisão.
- **Docs 17 a 19:** os números que mudam com a união das cópias estão na seção 1. Devem ser ajustados nesses documentos quando a revisão terminar.
