# 06. H03 no 1º turno completo: soma dos BUs = resultado oficial, todos os cargos

Matemático forense, 29/10/2026. Banco: cópia de leitura de 29/10 10:50 UTC (`src/banco-leitura.js`), com as 28 UFs dos dois turnos. Refaz, no universo completo, a medida do Auditor A ([coerencia-contagem/01](../coerencia-contagem/01-bu-x-oficial.md), 13 UFs) e a do parecer cético [09](../cetico-revisor/09-numeros-omitidos-munzona.md) (22 a 25 UFs).

## Resposta curta

- **Fato.** No 1º turno, a soma dos BUs é igual ao resultado oficial em todos os cargos, em todas as 28 UFs e em todos os campos: aptos, comparecimento, nominais, brancos, nulos e legenda. Isso vale seção a seção, zona a zona por candidato e no total de cada UF × cargo. A diferença é zero em todos.
- **Fato.** O único ponto em que os arquivos oficiais "não batem" com o BU é de classificação, não de contagem. São **250 números de candidato** (um por candidato) que têm voto no BU e não aparecem nem no `votacao_candidato_munzona` nem na divulgação, somando 628.629 votos. Também ficam de fora **4 legendas de partido**, com 1.912 votos.
- **Fato.** A divulgação conta esses votos como **nulo técnico** (`vnt`). A identidade `vnt = votos BU dos números ausentes + legenda BU dos partidos ausentes` fecha **nos 109 de 109 pares** UF × cargo, sem resto. O total é 630.541 votos.
- **Fato.** Com esses votos contados como válidos, **só um resultado muda: governador do RJ**, que teria 2º turno (o nº 22 cairia de 50,880% para 49,270% dos válidos). Nenhuma vaga de deputado, nenhum senador e nenhum outro governador muda, e o presidente também não.

## Universo (Fato)

| Medida | Valor |
|---|---|
| Seções do 1º turno no banco | 499.248 (28 UFs) |
| Com BU completo | 499.207 |
| Sem arquivo | 41, todas no exterior (ZZ), não instaladas |
| Divulgação nacional (presidente) | ts 499.248, si 499.207, sni 41 |
| UFs em que seções no banco = `ts` e completas = `si` | 27 de 27 (o ZZ não tem divulgação própria; entra no nacional) |

- Uma seção completa do exterior (ZZ 29564/0001/0091, contingência) tem comparecimento 0 e nenhum voto. Por isso há 499.206 seções com voto de presidente, e não 499.207.
- Além das eleições federal (6257) e estadual (6259), o banco tem a eleição 6261 em PE. É uma consulta popular, cargo 25, com 10 seções e 2.445 votantes. Ela fica fora do H03 (não está no `detalhe` nem na divulgação de cargos).

## Teste 1: por seção e cargo (`detalhe_votacao_secao`, Fato)

`scripts/auditoria/contagem-detalhe.mjs --turno 1` compara os seis campos de cada seção e cargo.

| Cargo | Seções no oficial | Iguais ao BU nos 6 campos | Divergências |
|---|---:|---:|---:|
| Presidente | 499.248 | 499.207 | 0 |
| Governador | 497.897 | 497.897 | 0 |
| Senador | 497.897 | 497.897 | 0 |
| Dep. Federal | 497.897 | 497.897 | 0 |
| Dep. Estadual | 490.928 | 490.928 | 0 |
| Dep. Distrital | 6.969 | 6.969 | 0 |

- As 41 linhas de presidente sem BU são as 41 seções não instaladas do exterior. Têm origem "Totalização" e comparecimento 0. Os 423 aptos de diferença no total são o eleitorado delas (`esni` = 423 na divulgação).
- Nenhuma seção completa do banco falta no oficial.
- Origem do voto no oficial: 2.490.506 linhas de urna, 250 de BU gerado pelo RED e 39 do Sistema de Apuração. Todas são iguais ao BU.

## Teste 2: presidente por seção e votável (`votacao_secao`, Fato)

Resultado de `scripts/auditoria/contagem-secao-presidente.mjs --turno 1`:
- 499.206 seções com BU e as mesmas 499.206 no oficial. Nenhuma seção aparece só de um lado.
- Zero divergência em todos os 13 votáveis, branco (95) e nulo (96) incluídos.
- O nº 28 tem 5.246 votos dos dois lados.

## Teste 3: candidato por município e zona (`votacao_candidato_munzona`, Fato)

`scripts/auditoria/contagem-munzona.mjs --turno 1` compara só os votos nominais.

| Cargo | Pares zona × número | Iguais | Só no BU | Números distintos sem linha | Votos BU sem linha |
|---|---:|---:|---:|---:|---:|
| Presidente | 77.652 | 75.504 | 2.148 | 1 | 5.246 |
| Governador | 45.914 | 44.473 | 1.441 | 9 | 342.427 |
| Senador | 76.311 | 74.238 | 2.073 | 8 | 221.990 |
| Dep. Federal | 2.771.430 | 2.765.548 | 5.882 | 127 | 48.241 |
| Dep. Estadual | 3.770.247 | 3.767.169 | 3.078 | 102 | 10.238 |
| Dep. Distrital | 7.935 | 7.885 | 50 | 3 | 487 |
| **Total** | | | **14.672** | **250** | **628.629** |

- As 14.672 divergências são todas do mesmo tipo: o BU tem voto para um número que não tem linha no munzona. Nenhum par tem valores diferentes dos dois lados. Nenhum par existe só no oficial.
- O conjunto de 250 números ausentes do munzona é **idêntico**, número a número e voto a voto, ao conjunto de números ausentes da divulgação (`resultados.tse.jus.br`).

## Teste 4: total de cada UF × cargo na divulgação (Fato)

`scripts/auditoria/matematico-h03-1turno.mjs` compara 109 pares: 27 UFs × cargos estaduais, mais o presidente nacional com as 28 UFs. Cada voto do BU recebe o destino que a divulgação dá ao candidato ou partido (campo `dvt`):
- "Válido" vai para `vnom`;
- "Válido (legenda)" vai para `vl`;
- "Anulado" vai para `van`;
- "Anulado sub judice" vai para `vansj`;
- número ou partido ausente da divulgação vai para `vnt`.

| Campo | Pares iguais | Σ BU = Σ oficial |
|---|---:|---:|
| aptos (`esi`) | 109/109 | 789.330.503 |
| comparecimento (`c`) | 109/109 | 624.349.775 |
| brancos (`vb`) | 109/109 | 39.442.990 |
| nulos digitados (`vn`) | 109/109 | 43.068.810 |
| nominais válidos (`vnom`) | 109/109 | 653.791.525 |
| legenda válida (`vl`) | 109/109 | 10.719.351 |
| anulados (`van`) | 109/109 | 71.059 |
| anulados sub judice (`vansj`) | 109/109 | 1.393.984 |
| **nulo técnico (`vnt`)** | **109/109** | **630.541** |
| válidos (`vv`) | 109/109 | 664.510.876 |
| total (`tv`) | 109/109 | 749.118.260 |

Outras conferências do mesmo script:
- Os 109 pares fecham nos 11 campos ao mesmo tempo.
- Nenhum voto do BU ficou sem destino.
- Todo candidato publicado tem votos BU = `vap`.
- Nenhum candidato publicado com voto deixa de ter voto no BU.
- Todo partido com legenda válida tem legenda BU = `tvtl`. No MS dep. estadual, isso inclui os 16.884 votos nominais do candidato com destino "Válido (legenda)".

Esta forma de classificar resolve os 12 pares de "legenda BU ≠ `vl`" do parecer 09. Neles, a legenda do partido tem destino "Anulado" ou "Anulado sub judice", e a classificação de cada voto pelo destino do partido fecha a conta.

## Identidade do nulo técnico, UF × cargo (Fato)

**`vnt` = Σ BU dos números de candidato ausentes da divulgação + Σ legenda BU de partido ausente.** A conta fecha em 109 de 109 pares e tem `vnt` > 0 em 63 deles. Dos 630.541 votos, 628.629 são nominais e 1.912 são de legenda.

| Cargo | Pares | Com `vnt` | `vnt` | Nominais | Legenda |
|---|---:|---:|---:|---:|---:|
| Presidente (BR) | 1 | 1 | 5.246 | 5.246 | 0 |
| Governador | 27 | 7 | 342.427 | 342.427 | 0 |
| Senador | 27 | 6 | 221.990 | 221.990 | 0 |
| Dep. Federal | 27 | 25 | 50.153 | 48.241 | 1.912 |
| Dep. Estadual | 26 | 23 | 10.238 | 10.238 | 0 |
| Dep. Distrital | 1 | 1 | 487 | 487 | 0 |

**Majoritários, número a número.** Em todos os pares, `vnt` = BU.
- Presidente nº 28: 5.246.
- Governador:
  - RJ nº 10: 274.411;
  - SE nº 22: 31.852 e nº 45: 1.343 (33.195);
  - SP nº 29: 22.370;
  - DF nº 55: 8.456;
  - RN nº 50: 2.151 e nº 29: 227 (2.378);
  - TO nº 35: 1.027;
  - PB nº 27: 590.
- Senador:
  - SP nº 300: 120.575 e nº 290: 10.434 (131.009);
  - AM nº 181: 57.518;
  - PE nº 355: 18.179;
  - DF nº 555: 6.323;
  - PI nº 333: 4.330 e nº 338: 1.858 (6.188);
  - MS nº 365: 2.773.

**Legenda de partido ausente da divulgação.**
- PB dep. federal, partido 70: 304.
- SE dep. federal, partido 25: 309.
- SE dep. federal, partido 77: 126.
- SP dep. federal, partido 29: 1.173. **Este é novo:** SP não tinha sido medido.

**Proporcionais.** Os pares com mais `vnt` são:
- RJ dep. federal: 24.223 (nº 7062, 23.684);
- SP dep. federal: 6.910;
- MG dep. federal: 4.047;
- BA dep. federal: 2.724;
- CE dep. federal: 2.544;
- GO dep. federal: 2.307;
- RJ dep. estadual: 2.242;
- MG dep. estadual: 2.154.

A lista completa dos 63 pares e dos 254 itens (250 números e 4 legendas) está em `h03-1t-resumo.txt` e `h03-1t-omitidos.csv`.

**Caso conferido no arquivo bruto (Fato).** SP 63053/0037/0095, senador nº 300:
- o `bu.dat` traz `nominal:300 = 36`;
- o BU impresso (`imgbu.dat`) lista o candidato com nome, número 300 e 0036 votos;
- o banco tem 36.

SP 71072/0403/0029, governador nº 29: o `bu.dat` traz 5, e o banco também. Os casos de DF e RJ já tinham sido conferidos no parecer 09.

## Efeito no resultado: o `vnt` como válido muda alguma vaga? (Fato)

O modelo de cálculo foi validado antes contra o resultado oficial e reproduz o que foi publicado em todos os pares:
- maioria absoluta dos válidos nos majoritários;
- vagas de senador;
- vagas proporcionais (CE arts. 106 a 109, Lei 14.211/2021, 3ª fase aberta a todas as agremiações conforme STF ADIs 7228/7263/7325);
- quociente eleitoral.

| Cargo | Pares | Modelo = oficial | Muda com o `vnt` válido |
|---|---:|---:|---|
| Presidente | 1 | 1 | não (2º turno 13 × 22 nos dois casos) |
| Governador | 27 | 27 | **RJ** |
| Senador | 27 | 27 | não |
| Dep. Federal | 27 | 27 | não |
| Dep. Estadual | 26 | 26 | não |
| Dep. Distrital | 1 | 1 | não |

No cenário, cada número omitido conta para o seu candidato e para a agremiação do seu partido. Um partido inteiro ausente entra como agremiação nova, com nominais e legenda. Os válidos sobem pelo `vnt`, e o quociente é recalculado.

- **RJ governador.** O nº 22 teve 4.271.199 de 8.394.627 válidos (50,880%), 73.885 votos acima do mínimo da maioria absoluta (4.197.314). Com os 274.411 votos do nº 10 como válidos, cairia para 49,270% e haveria 2º turno entre o nº 22 e o nº 55.
- **Majoritários sem efeito, com margem.**
  - SE: o eleito cairia de 61,121% para 59,462%.
  - SP governador: 62,653% → 62,592%.
  - PB: 64,298% → 64,281%.
  - DF, RN e TO já tiveram 2º turno, e o `vnt` só reduz a fatia do líder.
  - Senadores: o maior omitido é o SP nº 300, com 120.575 votos, contra 12.703.089 do último eleito.
- **Proporcionais sem efeito.** O maior omitido é o RJ dep. federal nº 7062, com 23.684 votos (12,5% do quociente). O partido dele (70) teve 159.772 votos e nenhuma vaga.
  - Mesmo sem o omitido, a média do 70 já superava a menor média vencedora (158.682). O partido ficou fora porque nenhum candidato dele chegou a 20% do quociente (38.016). O mais votado teve 32.149.
  - O nº 7062 também não chega a 20%. Com ele, o 70 continua sem vaga.
  - Nos outros pares, o maior omitido fica abaixo de 1,0% do quociente (o maior deles é o CE nº 1300, com 0,98%, que o CSV arredonda para "1.0%").
- **Governador perto do limite com `vnt`:** DF, 49,990%, faltaram 168 votos. O DF tem `vnt` de 8.456 votos (nº 55): anular 335 votos válidos de outros candidatos bastaria para o nº 11 vencer no 1º turno (parecer cético [26](../cetico-revisor/26-h03-1turno-todos-cargos.md)). Correção: uma versão anterior punha o DF na lista abaixo, "sem `vnt`".
- **Governadores perto do limite, sem `vnt`** (não dependem da classificação, mas qualquer reclassificação futura pesaria):
  - PR: 50,109%, 6.773 votos acima do mínimo;
  - AC: 49,758%, faltaram 1.064;
  - ES: 49,647%, faltaram 7.453.

## O que muda em relação ao parecer 09 (Fato)

| Medida | Parecer 09 (22 a 25 UFs) | Universo completo |
|---|---|---|
| Números de candidato sem linha no munzona e na divulgação | 200 (22 UFs) / 241 (25 UFs) | **250** (1 presidente, 9 governadores, 8 senadores, 127 dep. federais, 102 estaduais, 3 distritais) |
| Votos nominais desses números | 428.896 / 466.360 | **628.629** |
| Legenda de partido ausente | PB 70 (304), SE 25 e 77 (435) | os mesmos, mais **SP 29 dep. federal (1.173)**: 1.912 |
| `vnt` = omitidos + legenda ausente | 88/88 e 100/100 | **109/109** |
| Resultado que muda | RJ governador | **só RJ governador** (SP, TO e ZZ não acrescentam nenhum) |

- O ZZ não tem número omitido: o nº 28 de presidente é contado no total nacional.
- SP acrescenta:
  - governador nº 29 (22.370);
  - senadores nº 300 e nº 290 (131.009);
  - 22 itens de dep. federal (6.910, com a legenda do partido 29);
  - 4 de dep. estadual (503).
- TO acrescenta governador nº 35 (1.027) e 7 deputados.

## Correções feitas no próprio teste (não são achados)

A primeira execução do script deu três falsos alarmes, todos de leitura nossa. Foram corrigidos no script e não são violação.

1. **Aptos e comparecimento de PE.** O script somava a eleição 6261 (consulta popular, 10 seções, 3.634 aptos, 2.445 votantes) à estadual. Corrigido: só 6259 é estadual.
2. **`vl` nos majoritários.** O JSON de governador, senador e presidente não tem o campo `vl`. Ausente vale 0.
3. **Quem foi ao 2º turno.** No JSON, `e = 's'` marca também os dois candidatos que vão ao 2º turno. O que separa os casos é `st` ("Eleito" × "2º turno").

## Leitura pelo princípio 8

- **Contra desvio na totalização, o teste é forte.**
  - É uma igualdade exata, em inteiros, em quatro níveis: seção, zona × candidato, UF × cargo × categoria e candidato.
  - Um voto movido de um candidato para outro, ou de nulo técnico para válido, quebraria pelo menos dois campos.
  - O resultado é zero em todos.
- **Contra manipulação gravada no próprio BU, o teste não diz nada.** O oficial é derivado do BU. Isso fica para os testes de RDV, log e assinatura.
- **A classificação como nulo técnico é decisão humana:** cancelamento, indeferimento ou renúncia do registro. O rastro jurídico dela (processo, data, trânsito em julgado) não está nos arquivos locais. No `consulta_cand_2026`, a situação da candidatura vem `#NE` em todas as linhas (parecer 09).
  - Para 249 dos 250 números, isso não muda vaga nem resultado.
  - No RJ governador nº 10, decide se houve 2º turno.

## Pendente

- **RJ governador nº 10.** Situação e data da decisão sobre o registro. Se havia recurso pendente, o destino previsto seria "Anulado sub judice", e não nulo técnico. Exige consulta pública com rede, a ser autorizada pelo coordenador. É a única pendência que pode mudar um resultado.
- **Situação dos outros números omitidos**, em especial:
  - os novos de SP: governador nº 29, senadores nº 300 e nº 290, partido 29 sem lista de dep. federal;
  - SE governador nº 22 (31.852 votos).
- **Arquivo de candidatos da urna.** Saber se algum número omitido faltava em parte das urnas da UF. Este teste mostra só que o BU e a divulgação concordam sobre os votos registrados.

## Reproduzir

Os quatro comandos rodaram ao mesmo tempo, em cerca de 4 min no total. Tempos de cada um: 1 min 08 s, 3 min 05 s, 4 min 14 s e 2 min 08 s.

```bash
node --max-old-space-size=16000 scripts/auditoria/contagem-secao-presidente.mjs --turno 1
node --max-old-space-size=24000 scripts/auditoria/contagem-detalhe.mjs --turno 1
node --max-old-space-size=24000 scripts/auditoria/contagem-munzona.mjs --turno 1
node --max-old-space-size=8000  scripts/auditoria/matematico-h03-1turno.mjs
# conferência no bruto (SP senador nº 300):
node scripts/auditoria/cetico-numeros-omitidos-munzona-bruto.mjs data/raw/1t/urnas/sp/63053/0037/0095/<hash>/ 5 300
```

Os três scripts `contagem-*` passaram a abrir a cópia de leitura (`abrirLeitura`) em vez do banco primário (regra 2 do doc 10). A lógica deles não mudou.

Saídas:
- **`data/parsed/auditoria/contagem/`:** `detalhe-1t-*`, `munzona-1t-divergencias.csv` e `secao-presidente-1t-divergencias.csv`;
- **`data/parsed/auditoria/matematico/`:**
  - `h03-1t-resumo.txt`;
  - `h03-1t-fechamento.csv` (109 pares × 11 campos);
  - `h03-1t-omitidos.csv` (254 itens);
  - `h03-1t-efeito.csv`;
  - `h03-1t-universo.csv`;
  - e os registros das execuções `h03-1t-{detalhe,munzona,secao-presidente,execucao}.txt`.
