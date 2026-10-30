# 08. H23: recarga e carga fora da cerimônia oficial

Matemático forense, 30/10/2026. Hipótese H23 de [hipoteses.md](../../hipoteses.md), proposta na discussão T19 ([síntese](../modelos/T19/sintese.md)). Banco: cópia de leitura de 29/10 10:50 UTC (os dois turnos, 28 UFs). Universo completo: 499.207 pacotes de urna por turno, 507.327 diários (logd.dat) no 1º turno e 512.173 no 2º, todos os BUs.

## Resposta curta

- **Fato (invariante, 0 violação).** O código de carga de cada BU aparece numa carga gravada no diário da própria urna do BU: **499.207 de 499.207** nos dois turnos.
- **Fato (estrutura).** Cada diário (logd.dat) traz **uma** carga. Quando a urna é recarregada, o diário anterior fica arquivado dentro do novo, com a hora do arquivamento no nome (`<urna><data><hora>-0N.jez`). Por isso "mais de uma carga" se mede pela mesma urna com 2 ou mais códigos de carga no mesmo pacote. A ordem foi conferida: em 2.595 de 2.674 recargas do 1º turno e em 1.721 de 1.770 do 2º, o arquivamento do diário anterior está a até 10 minutos do início da nova carga.
- **Fato (recargas).** 1º turno: **2.674** recargas (2.669 antes do dia da eleição, 4 no dia, 1 com data digitada impossível). 2º turno: **1.770** recargas novas (1.762 entre os turnos, 8 no dia 25/10). Por motivo visível no diário:

| Motivo (primeiro que vale) | 1º turno (até 03/10) | 2º turno (05/10 a 24/10) | 2º turno (25/10) |
|---|---:|---:|---:|
| Carga anterior não terminou | 13 | 0 | 0 |
| Linha ERRO na sessão anterior | 499 | 639 | 3 |
| Reserva (seção 0000) recarregada para uma seção | 776 | 1.018 | 4 |
| Urna de seção recarregada como reserva | 79 | 58 | 0 |
| Carga anterior era de outra seção ou zona | 318 | 11 | 0 |
| Sessão anterior com votos (urna do 1º turno recarregada) | 0 | 23 | 0 |
| Nova mídia de carga, gerada depois da carga anterior | 483 | 1 | 0 |
| **Sem motivo no diário** (mesma seção, sem ERRO, mesma mídia, sem votos) | **501** | **12** | **1** |
| Total | 2.669 | 1.762 | 8 |

- **Fato (BU que saiu de recarga sem motivo).** 475 BUs do 1º turno e **10 BUs do 2º turno** (9 entre os turnos e 1 no dia) vêm de uma carga que é recarga sem motivo visível no diário. Os 10 do 2º turno estão na tabela "Caso a caso".
- **Fato (carga no dia da votação).** BU com carga no dia: **7 no 1º turno** (4 urnas de seção e 3 reservas) e **5 no 2º turno** (as 5 já citadas no tópico 2). Nas 12, o relógio interno da urna no momento da carga confirma a data e a hora digitadas (diferença de até 1 hora). Isso fecha a pendência "carga no dia da votação no 1º turno" do tópico 2.
- **Fato (fora do bloco da zona, 1º turno).** 1.040 BUs vêm de carga feita num dia em que a zona carregou no máximo 2 urnas, a 2 dias ou mais do dia de cerimônia mais próximo (1.269 com 1 dia; 969 com 3 dias). 980 têm o relógio interno de acordo com a data digitada. Destas 1.040, 517 são reservas recarregadas para a seção, 441 são a primeira carga daquela urna, 43 têm ERRO antes e **27 são recarga sem motivo**. 59 cargas foram feitas de madrugada (00:00 a 05:59), 54 delas em dois lotes de zona inteira (MA zona 0015, 26 urnas na madrugada de 01/10; MG zona 0107, 28 urnas na madrugada de 24/09).
- **Fato (votos).** Nenhum dos conjuntos marcados (recarga sem motivo, fora do bloco, madrugada) mostra diferença na **parcela do 13** que o teste separe do acaso, depois da correção para 36 testes. Em 10 BUs do 2º turno com recarga sem motivo, a variação da parcela do 13 é +0,04 ponto (p = 0,94).
- **Fato (único teste que passa da correção).** Nas 1.572 seções cujo BU do 2º turno saiu de uma recarga entre os turnos (qualquer motivo), o comparecimento subiu **0,23 ponto** a mais que na zona (p = 0,0005, faixa do acaso ±0,11). O teste de nível mostra de onde vem: no 1º turno essas seções tiveram comparecimento 0,22 ponto **abaixo** das vizinhas do mesmo local (p = 0,05); no 2º turno, 0,12 abaixo (p = 0,24). A parcela do 13 não muda (−0,004 ponto, p = 0,94).
- **Hipótese.** A recarga entre os turnos é consequência de falha da urna no 1º turno (639 com ERRO, 1.018 com reserva recarregada), e a falha baixou o comparecimento do 1º turno. É o mesmo efeito visto nas reservas herdadas do tópico 11. Não testado: a hora e a duração da falha no 1º turno.
- **O que não se pode afirmar.** "Sem motivo no diário" não é "sem motivo": o diário não registra por que o operador recarregou. Defeito visto só pela pessoa (tela, teclado, lacre), carga repetida por erro de digitação e procedimento local não deixam linha ERRO. Pelo princípio 8, a recarga é ato de pessoa, e o motivo só existe na ata. E uma recarga com programa adulterado e assinado pelo TSE deixa o mesmo rastro de uma recarga legítima.

## Regra declarada antes de olhar os votos

| Marca | Definição | Fonte |
|---|---|---|
| Sessão de carga | um logd.dat com uma carga SCUE (urna + código de carga) | varredura do 2º turno; registros de integridade do 1º; releitura |
| Recarga | a mesma urna com 2+ sessões no mesmo pacote; ordem pelo arquivamento | releitura dos 7.241 pacotes com urna de 2+ cargas ou carga no dia |
| Motivo visível | na ordem: carga anterior sem "Urna carregada com sucesso"; ERRO na sessão anterior; reserva → seção; seção → reserva; outra seção/zona/município; votos na sessão anterior; mídia de carga nova (gerada depois da carga anterior) | releitura |
| Sem motivo | nenhum dos anteriores: mesma seção, sem ERRO, carga anterior bem-sucedida, mesma mídia, sem votos | releitura |
| Carga no dia | data digitada da carga = 04/10 ou 25/10 (BU e diários); conferida com o relógio interno da urna no momento da digitação | BU, varredura, releitura |
| Dia de cerimônia da zona | dia com 3 ou mais cargas no BU do 1º turno da zona | BU |
| Fora do bloco | carga num dia com até 2 cargas da zona e a 2+ dias do dia de cerimônia mais próximo (sensibilidade 1 e 3 dias) | BU |
| Madrugada | hora digitada de 00:00 a 05:59 | BU |
| Junção com os votos | diferença entre as marcadas e as demais da mesma zona na variação 1º → 2º turno, e do mesmo local no nível de cada turno; permutação de 2.000 sorteios dentro do grupo; Bonferroni para 36 testes (limiar p < 0,0014) | banco |

A ordem dos motivos vai do mais forte (falha registrada) ao mais fraco. Uma recarga com ERRO e mídia nova conta como "erro".

## Universo e conferências

| | 1º turno | 2º turno |
|---|---:|---:|
| Pacotes de urna | 499.207 | 499.207 |
| Diários (logd.dat) | 507.327 | 512.173 |
| Sessões de carga distintas (urna + código) | 504.977 | 509.691 |
| Urnas com 1 carga | 499.756 | 500.492 |
| Urnas com 2 ou mais cargas | 2.545 | 4.409 |
| BU com o código de carga no diário da própria urna | 499.207 de 499.207 | 499.207 de 499.207 |
| Pacotes relidos no bruto | 2.547 | 4.694 |

O catálogo do 2º turno contém também as cargas anteriores ao 1º turno (o diário é cumulativo). Por isso, no 2º turno só contam as recargas com nova carga a partir de 05/10. Uma delas tinha código de carga que já existia no 1º turno (CE 14176/0021/0051: data digitada 23/10, relógio interno 23/09): data digitada errada, e foi tirada do 2º turno.

**Fato.** A data digitada pelo operador não serve, sozinha, para ordenar as cargas: há trocas de dia digitadas erradas nos dois sentidos (exemplo: SP 71072/0257/0004, urna 02237586, duas cargas com os dias 23/09 e 26/09 trocados entre si). O relógio interno também falha (há relógio em 2009). A ordem usada é a do arquivamento do diário, que a urna faz sozinha.

**Fato.** Nos 2 BUs do 1º turno em que a carga é posterior à abertura (SC 83518/0046/0038 e 0113), a urna é reserva carregada no dia (09:45 e 09:54) e a abertura gravada é a da urna original (08:00:01). Não é violação: na contingência a reserva continua a votação aberta pela urna original. Carga posterior ao encerramento: 0 nos dois turnos.

**Fato.** 64 diários de urnas que geraram BU no 2º turno (de 499.180 sessões distintas) têm a carga com código e assinaturas gravados, mas sem a linha final "Urna carregada com sucesso". Em AM 02550/0001/0706 o diário fecha 3 segundos depois da última verificação de assinatura, e a urna liga normalmente 9 minutos depois. Por UF: SP 19, RJ 8, PR 6, MG 5, PA 4, SC 4 e outros 18. **Pendente:** ver se é um padrão de versão ou de modelo de urna.

## Carga no dia da votação

**1º turno (Fato).** Relógio interno e data digitada concordam nas 7.

| Seção | Urna | Tipo | Carga | Abertura | Comparecimento | Δ parcela do 13 − zona (pontos) |
|---|---|---|---|---|---:|---:|
| BA 33197/0036/0003 | 02212056 | reserva (carregada como 0000) | 04/10 05:50 | 08:12:37 | 269 | +2,32 |
| MG 48852/0190/0107 | 02080458 | seção | 04/10 07:51 | 08:07:45 | 176 | +1,23 |
| PR 75353/0003/0495 | 02320515 | seção | 04/10 08:09 | 08:47:27 | 300 | −0,12 |
| SC 83194/0027/0057 | 01653250 | seção | 04/10 08:01 | 09:18:43 | 240 | −0,24 |
| SC 83194/0027/0056 | 01654161 | seção | 04/10 08:13 | 09:23:18 | 242 | −1,27 |
| SC 83518/0046/0038 | 01650872 | reserva (0000) | 04/10 09:45 | 08:00:01 (urna original) | 261 | +1,15 |
| SC 83518/0046/0113 | 01828007 | reserva (0000) | 04/10 09:54 | 08:00:01 (urna original) | 246 | +5,50 |

A última coluna é a variação da parcela do 13 do 1º para o 2º turno menos a da zona; ela mede a seção inteira, não só a carga do dia.

Além dos BUs, há 3 sessões com data digitada no dia que não geraram BU: SC 83518/0046/0042 (reserva 01678200 carregada às 09:28, registrou 5 votos e foi substituída), BA 34797/0060/0030 e PA 04278/0073/0291 (data digitada 04/10, relógio interno 23/09: dia digitado errado numa carga antiga, arquivada).

**2º turno (Fato).** As 5 do tópico 2: MS 90514/0008/0486 (06:55), MS 91650/0051/0044 (07:36; uma carga anterior às 07:16 com ERRO), PR 74918/0056/0037 (09:20; carga anterior às 09:09 sem ERRO, ver abaixo), PR 75833/0043/0397 (10:04) e SP 61816/0016/0436 (07:58). Relógio confirma as 5. Fora dos BUs: BA 35653/0173/0235 (urna original recarregada às 09:06 com a preparação da seção 0083, já descrita no tópico 2) e GO 93335/0008/0295 (data digitada 25/10 17:38, relógio 25/09: mês digitado errado numa carga antiga).

## Recarga sem motivo no diário, 2º turno (caso a caso)

**Fato.** 13 recargas entre 05/10 e 25/10 sem motivo no diário; 10 geraram o BU do 2º turno. Em 9 das 13 a sessão anterior passou pelo teste (ATUE) e pela abertura do aplicativo de votação (VOTA) e foi desligada normalmente. As 13 foram no mesmo dia da carga anterior, de 5 a 56 minutos depois.

| Seção | Urna | Carga anterior | Nova carga | Antes | Δ parcela do 13 − zona | Δ comparecimento − zona |
|---|---|---|---|---|---:|---:|
| BA 36633/0051/0105 | 01667530 | 24/10 10:18 | 24/10 10:31 | carga + GAP | +1,88 | +5,66 |
| BA 38490/0013/0072 | 02380185 | 24/10 11:49 | 24/10 12:28 | carga + teste + VOTA | +1,58 | −3,11 |
| DF 97012/0015/0318 | 02233101 | 24/10 11:44 | 24/10 11:49 (digitada 10:49) | só a carga | +0,10 | +0,25 |
| ES 57053/0001/0557 | 02007008 | 24/10 09:48 | 24/10 10:05 | carga + teste + VOTA | −0,11 | −1,27 |
| MG 41017/0021/0112 | 01837543 | 24/10 09:29 | 24/10 10:00 | carga + teste + VOTA | +0,84 | +5,41 |
| MG 54275/0282/0138 | 01792764 | 19/10 15:28 | 19/10 15:59 | carga + teste + VOTA | +0,48 | −1,40 |
| PE 26298/0138/0081 | 02378984 | 24/10 11:24 | 24/10 11:47 | carga + teste + VOTA | −3,01 | −1,26 |
| PR 74918/0056/0037 | 01797363 | 25/10 09:09 | 25/10 09:20 | só a carga | −0,26 | +6,75 |
| SP 62510/0027/0083 | 02067659 | 16/10 14:15 | 16/10 15:05 | carga + teste + VOTA | +2,06 | +0,30 |
| TO 95532/0026/0001 | 02257259 | 24/10 10:58 | 24/10 11:22 | carga + teste + VOTA | −2,71 | +1,39 |

Sem BU: BA 39411/0038/0020, ES 56120/0043/0101 e SC 80837/0009/0162 (a urna recarregada não foi a que votou).

Teste de conjunto nas 10 (permutação dentro da zona): parcela do 13 +0,04 ponto (p = 0,94; faixa do acaso ±1,1); comparecimento +1,13 (p = 0,10). No 2º turno, as 10 somam 2.791 eleitores que compareceram, 1.382 votos no 13 e 1.303 no 22.

## Junção com os votos (Fato)

Efeito = média ponderada das seções marcadas menos a das demais do mesmo grupo, em pontos percentuais. p = permutação (2.000 sorteios). Limiar com correção para 36 testes: p < 0,0014.

| Conjunto | Seções no teste | Comparação | Comparecimento | Parcela do 13 | Brancos + nulos |
|---|---:|---|---|---|---|
| Recarga sem motivo entre os turnos (BU 2º) | 10 | variação × zona | +1,13 (p 0,10) | +0,04 (p 0,94) | +0,13 (p 0,82) |
| Qualquer recarga entre os turnos (BU 2º) | 1.572 | variação × zona | **+0,23 (p 0,0005)** | −0,004 (p 0,94) | −0,03 (p 0,53) |
| idem | 1.472 | nível 1º turno × local | −0,22 (p 0,05) | −0,005 (p 0,97) | +0,03 (p 0,55) |
| idem | 1.474 | nível 2º turno × local | −0,12 (p 0,24) | +0,06 (p 0,60) | −0,05 (p 0,18) |
| Recarga sem motivo antes do 1º turno (BU 1º) | 422 | nível 1º turno × local | −0,33 (p 0,14) | +0,45 (p 0,03) | +0,08 (p 0,38) |
| idem | 422 | nível 2º turno × local | −0,07 (p 0,76) | +0,36 (p 0,07) | +0,08 (p 0,20) |
| Fora do bloco da zona (≥ 2 dias) | 991 | nível 1º turno × local | −0,16 (p 0,20) | −0,04 (p 0,78) | −0,10 (p 0,04) |
| idem | 1.040 | variação × zona | +0,16 (p 0,02) | −0,07 (p 0,31) | +0,13 (p 0,009) |
| Madrugada | 59 | variação × zona | +0,72 (p 0,08) | −0,21 (p 0,50) | −0,17 (p 0,57) |

Só o comparecimento das 1.572 recargas entre os turnos passa da correção. Os p entre 0,009 e 0,05 não passam: com 36 testes, de 1 a 2 deles ficariam abaixo de 0,05 só pelo acaso.

**Conjunção (Fato).** Recarga sem motivo **e** fora do bloco: 27 seções no 1º turno. Recarga sem motivo **e** madrugada: 0. Recarga sem motivo **e** carga no dia: 1 (PR 74918/0056/0037). Nenhuma das três combinações tem desvio de voto.

## O que permite e o que não permite afirmar

- **Permite (Fato):** toda carga que gerou BU está no diário da urna; as recargas e as cargas fora do bloco existem nas quantidades acima, com data e hora conferidas pelo relógio interno; a maioria das recargas tem motivo visível no diário (falha, erro, reserva, mídia nova); nenhuma marca de carga fora do padrão vem junto com desvio na parcela do 13 que o teste separe do acaso.
- **Não permite:** dizer por que foram feitas as 501 + 13 recargas sem motivo no diário (falta a ata); dizer que a carga fora do bloco foi feita fora da cerimônia oficial (sem o calendário de cerimônias de cada zona, o "bloco" é medido pelos próprios dados: uma cerimônia extra anunciada em edital também aparece como "fora do bloco"); excluir programa adulterado com assinatura válida (escreve diário normal).
- **Recomendação.** Pedir aos TREs as atas e editais das cerimônias de carga das zonas com recarga sem motivo no 2º turno (as 10 da tabela) e da carga no dia nas 12 seções (7 no 1º turno, 5 no 2º). A lista completa está em `data/parsed/auditoria/matematico-forense/h23-casos.csv`.

## Pendente

- Hora e duração da falha no 1º turno das 1.572 seções com recarga entre os turnos (para testar a hipótese de que a falha baixou o comparecimento).
- O padrão dos 64 diários sem a linha "Urna carregada com sucesso" (versão, modelo, mídia de carga).
- Efeito mínimo detectável por conjunto (simulação de poder), pedido na T19.

## Para refazer

```
node scripts/auditoria/matematico-h23-cargas.mjs     # catálogo das cargas (varredura 2º turno + integridade 1º turno + BU), ~20 s
node scripts/auditoria/matematico-h23-reler.mjs      # relê no bruto só os 7.241 pacotes da lista, ~1 min
node scripts/auditoria/matematico-h23-analise.mjs    # recargas, carga no dia, fora do bloco, votos, ~1 min
```

Saídas em `data/parsed/auditoria/matematico-forense/`: `h23-sessoes-1t.jsonl`, `h23-sessoes-2t.jsonl`, `h23-reler.json`, `h23-relidos.jsonl`, `h23-cargas-resumo.json`, `h23-resultado.json` (todas as tabelas e os pares sem motivo, com as 3 últimas linhas do diário anterior) e `h23-casos.csv`. Funções comuns (carga dos votos por seção e teste de permutação) em `scripts/auditoria/matematico-h23-lib.mjs`.
