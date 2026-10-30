# 38. Parecer: H27, pacote trocado por outra urna e seções fantasmas

Achado revisado: [engenheiro-seguranca-urna/09-h27-pacote-substituido-e-secoes-fantasmas.md](../engenheiro-seguranca-urna/09-h27-pacote-substituido-e-secoes-fantasmas.md) (commit 2609387), scripts `seguranca-h27-*.mjs`, saídas `data/parsed/auditoria/seguranca-h27/`.

Data: 30/10/2026. Base: os zips de correspondência do TSE (`data/raw/dadosabertos/correspondencias/`), a cópia de leitura do banco (`eleicao2026-20261029T105000`), `seguranca-h25/{1t,2t}-padrao-dirs.jsonl` (só para o assinante), `chegada-bu/aux-horarios.csv` e, para conferir casos, os pacotes brutos pelo caminho exato (`src/exportar.js`). `data/raw` não foi varrido. Nenhum pedido de rede. Rótulos: **Fato**, **Hipótese**, **Recomendação**, **Pendente**.

> **Termos.** *Carga*: preparação da urna para uma seção, com um *código de carga* único. *Correspondência*: o registro "urna X, carga Y, seção Z" que o cartório manda ao TSE depois da carga. *CESP*: lista das correspondências esperadas (uma da véspera e uma da manhã do dia, por turno). *CEFT*: lista das efetivadas, publicada depois da votação. *Pacote*: os arquivos da seção (BU, RDV, diário), lacrados pela assinatura da urna. *aux*: o arquivo do portal de resultados que diz quando o TSE recebeu cada pacote. *RED*: programa que recupera os votos de uma urna que não conseguiu gerar o BU.

## Vereditos

| # | Afirmação do doc 09 | Veredito | Motivo em uma linha |
|---|---|---|---|
| 1a | 0 pacote sem CEFT, 0 CEFT sem pacote; urna e carga do BU = efetivadas em 100% | **Sustentado** | Reproduzido com o BU lido pelo parser do banco (independente do doc 08). Circular, como o próprio doc diz |
| 1b | "0 assinante fora das listas do TSE" | **Sustentado com ressalvas** | Só vale contando o CEFT, que copia a urna do BU. Contra a lista anterior e independente (CESP), **10** assinantes no 1º turno e **22** no 2º não estão em nenhuma CESP do turno; **11** urnas do 2º turno não aparecem em CESP nenhuma, de nenhum turno (o doc fala em 4). Todas são a própria urna do BU: nenhum assinante "estranho" |
| 1c | Par urna × carga na CESP da véspera em 99,96% e 99,92% | **Sustentado com ressalvas** | Casa por urna e carga, mas **não por seção nem zona**. No casamento estrito (a linha da própria seção, ou a contingência da própria zona): 498.934 (99,95%) e 498.687 (99,90%). As 44 e 98 reservas a mais usaram carga de contingência registrada para **outra zona** (8 e 21 de outro município) |
| 2 | 45 seções com correspondência só no dia, "de 2 a 169 min antes do BU"; 4 urnas fora de todas as CESP | **Sustentado com ressalvas** | Números reproduzidos. Mas no 2º turno a correspondência chegou **junto com o pacote** (até 3 s antes da chegada dele) em 25 de 28; os minutos são a demora para o TSE aceitar o BU. Nenhuma das 45 tem votos fora do padrão. O mesmo fenômeno ocorreu em 2022 (194 seções) e 2024 (82) |
| 3 | 5 seções de SE e 2 do MA: "os arquivos não explicam" | **Refutado para SE, sustentado para MA** | Nas 5 de SE o diário da urna que votou no 2º turno traz um dia inteiro de votação no 1º turno, da mesma seção, **sem biometria**, que não virou resultado: rastro do Teste de Integridade. No MA a urna certa votou nos dois turnos com eleitores reais; a lista é que ficou desatualizada |
| 4 | "Nenhum dos 66 pacotes RED traz assinatura da urna original" | **Sustentado com ressalvas** | Vale para os **17** RED feitos em outra urna (4.090 votos). Nos outros 49 o RED rodou na própria urna da seção, e o pacote leva a assinatura dela. Decorre do desenho do RED, não desta eleição |
| 5 | Seções novas com 95% ou mais: 433 × 206 (2º turno) | **Sustentado com ressalvas** | Reproduzido exatamente. Tamanho e perfil do cadastro explicam a maior parte (de 23,7 vezes para 1,9 vez nos estratos comparáveis). Efeito de cadastro, não de processo. A comparação com 2022 não é possível com os dados no disco. Pista nova para a H07 |
| 6 | Código de carga do 2º turno = do 1º em 494.382 seções | **Sustentado** | Reproduzido: 494.382 de 499.176, todas com a mesma urna; 0 seção com a mesma carga e outra urna. O código é identificador, não senha |
| — | (item 3 do doc 09) "o TSE recebeu a correspondência antes do BU em 100% das seções" | **Sustentado com ressalvas** | Reproduzido no 2º turno (497.897 seções). Não prova registro **anterior** nas 45: lá o registro nasce com o pacote |

Nenhum achado aponta pacote trocado ou seção fantasma. As ressalvas mudam o texto: o teste "assinante nas listas" é mais fraco do que o doc 09 diz, e as 45 seções "da noite" não tinham registro anterior ao pacote. Por outro lado, a causa delas fica mais clara e é rotineira.

## Como reproduzi

Scripts próprios, sem `seguranca-h27-lib.mjs` na lógica (só a função de leitura de zip/CSV, revisada: separa por `;` fora de aspas, Latin-1, cabeçalho na 1ª linha):

| Script | O que faz |
|---|---|
| `cetico-38-correspondencias.mjs --turno N` | Urna e carga do BU vêm do **banco**. Casamento com a CESP em dois modos: frouxo (como o doc 09) e estrito (linha `csec` da própria seção; `ccont` da própria zona). Assinante testado só contra a CESP. Fuso do CEFT medido no mesmo registro |
| `cetico-38-efetivada.mjs` | Universo pacote × CEFT e BU × efetivada, dois turnos |
| `cetico-38-casos.mjs` | Vida de cada urna nas 4 CESP dos dois turnos (papel, município, carga, máquina) |
| `cetico-38-aux.mjs` | Hora da correspondência × hora de chegada do pacote (aux) × hora oficial do BU, todas as seções do 2º turno |
| `cetico-38-historico.mjs` | Correspondências recebidas no dia da votação em 2022, 2024 e 2026 |
| `cetico-38-votos.mjs` | Votos e comparecimento de cada caso contra as outras seções do mesmo local e contra o outro turno; linha de base de 451.883 seções |
| `cetico-38-novas.mjs` | Seções novas: reprodução, motivo provável, padronização por tamanho e perfil, liberação sem digital |

Saídas em `data/parsed/auditoria/cetico-revisor/38/`.

**Conferências de leitura (Fato):**
- doc 08 × banco: urna e carga do BU iguais em 499.207 de 499.207 pacotes de cada turno;
- o campo de recebimento da correspondência **esperada** do CEFT está na hora de Brasília: em 13.518 seções de UFs com a hora de Brasília (2º turno), ele vem menos de 1 h depois da hora da carga. Se fosse UTC, o mínimo seria 3 h;
- a diferença esperada × efetivada no mesmo registro confirma a tabela de fuso do doc 09: AC 2 h; AM, MS, MT, RO e RR 1 h (no AM, 551 registros com 2 h); Fernando de Noronha −1 h.

## 1. A lista de fora do pacote

### 1a. Universo e BU × efetivada

**Fato (reproduzido).** Nos dois turnos: 499.207 pacotes, 499.207 linhas no CEFT, 0 pacote sem CEFT, 0 CEFT sem pacote. Urna e carga do BU iguais às efetivadas em 499.207 de 499.207. Como o doc 09 diz, isso só mostra que o CEFT registra a urna que o BU declara.

### 1b. O assinante contra a lista independente

O doc 09 conta um assinante como "nas listas" se ele está na CESP **ou** é a urna esperada ou efetivada do CEFT. Como o assinante é a urna do BU em 499.193 seções do 1º turno e 499.204 do 2º (com o Sistema de Apuração), e o CEFT copia a urna do BU, o "0" sai do próprio pacote. Sem o CEFT:

| Assinante | 1º turno | 2º turno |
|---|---:|---:|
| = urna do BU, esperada da própria seção na CESP | 496.132 | 496.491 |
| = urna do BU, contingência da própria zona | 2.974 | 2.561 |
| = urna do BU, contingência de **outra** zona | 46 | 101 |
| = urna do BU, **em nenhuma CESP do turno** | **10** | **22** |
| ≠ urna do BU (RED), contingência da zona / de outra zona | 13 / 1 | 3 / 0 |
| Sistema de Apuração (fora do teste) | 31 | 29 |

- **Fato:** no 2º turno, **11** urnas que assinaram pacote não aparecem em nenhuma das 4 CESP dos dois turnos: as 4 do doc 09 (BA 33774/0071/0150, BA 39144/0071/0170, PA 05355/0104/0093, SE 31054/0002/0524), as 2 de MG (41238/0331/0001 e /0197) e as 5 de SE do item 3. No 1º turno, as 10 sem CESP do turno aparecem depois na CESP do 2º.
- **Fato:** nenhuma dessas urnas assinou mais de uma seção nem assinou pacote declarando outra urna. Não há assinante "estranho" no sentido do ataque A.
- **Correção para o doc 09:** "0 assinante fora das listas do TSE" deve virar "todo assinante é a urna do BU ou, nos 17 RED, uma contingência da CESP. 11 urnas do 2º turno só entraram nas listas pelo CEFT, depois da votação".

### 1c. A CESP da véspera é lista independente? O casamento é por urna e carga?

- **Fato:** a CESP da véspera foi gerada em 03/10 15:34 e 24/10 12:31 (campo de geração, igual em todas as UFs), antes da votação. Sai das correspondências transmitidas na carga. É independente do pacote, mas não do TSE: a hora de geração é declarada pelo próprio TSE.
- **Fato:** a CESP **não é exaustiva**. Ela lista uma urna por seção e as contingências. Correspondências registradas e depois substituídas, ou registradas e não incluídas, ficam de fora:
  - MG 41238/0331/0001 e /0197: carga e correspondência em 13/10; a CESP de 24/10 ainda lista a urna do 1º turno;
  - as 5 de SE e as 2 do MA (item 3).
  - Portanto, "fora da CESP" não quer dizer "não registrado antes".
- **Fato:** o casamento do doc 09 é por urna **e** carga (sem os zeros à esquerda), mas aceita o par em qualquer lugar da CESP. No casamento estrito:

| Onde o par aparece | 1º turno | 2º turno |
|---|---:|---:|
| CESP da véspera, linha da própria seção | 495.981 | 496.138 |
| CESP da véspera, contingência da própria zona | 2.953 | 2.549 |
| **Subtotal véspera (estrito)** | **498.934 (99,95%)** | **498.687 (99,90%)** |
| só na CESP do dia (seção ou zona) | 179 | 345 |
| na véspera, mas como contingência de **outra** zona | 44 | 98 |
| outros só no CEFT, recebidos antes do dia | 2 | 20 |
| só no CEFT, recebidos no dia | 17 | 28 |

- As reservas com contingência de outra zona são, em sua maioria, do mesmo município (36 de 44; 77 de 98: Rio de Janeiro, Manaus, Goiânia, Brasília, Aracaju). As outras 8 e 21 vêm de outro município. Exemplos: Maceió (AL 27855, zona 54) para zonas do interior; Aracaju (zona 27) para SE 31631, 31712 e 32115; São Luís para o MA.
- **Hipótese:** é um estoque de reserva do TRE ou do cartório-sede. O arquivo não explica por que a carga de contingência de uma zona serve em outra. **Recomendação (LAI):** a regra de uso da contingência entre zonas.

## 2. As 45 seções "da noite" e as 4 urnas fora das CESP

### 2.1 Reprodução

**Fato.** 17 no 1º turno e 28 no 2º. Lista e horários iguais aos do doc 09 (correspondência das 15:52 às 20:16 e das 18:46 às 21:07, na hora local; BU de 2 a 169 minutos depois).

### 2.2 A correspondência veio antes do pacote ou com ele?

No 2º turno existe o aux de todas as seções, com a hora em que o pacote chegou ao TSE. Nacionalmente, essa hora é igual, ao segundo, à hora oficial de recebimento do BU em 478.191 de 497.897 seções; é mais cedo em só 107.

| As 28 do 2º turno | Seções |
|---|---:|
| correspondência no **mesmo segundo** da chegada do pacote (±1 s) | 16 |
| correspondência 2 ou 3 s antes da chegada do pacote | 9 |
| correspondência 6,6 min antes (PA 05355/0104/0279) e 22 min antes (PA 04332/0013/0428) | 2 |
| aux com outra chegada em 28/10 (PA 04278/0030/0295) | 1 |
| estão entre as 107 seções do país com BU oficial **depois** da chegada do pacote | 27 |

- **Fato:** em 25 de 28 seções, a correspondência foi registrada no TSE junto com o pacote, até 3 segundos antes dele. Os "5 a 63 minutos" até o BU oficial são o tempo entre a chegada do pacote e a aceitação.
- **Fato:** essas 27 seções são um quarto das 107 seções do país com esse atraso.
- **Hipótese (as duas compatíveis com os arquivos):**
  - (a) o transmissor do cartório manda a correspondência pendente e, logo depois, o pacote;
  - (b) a totalização cria o registro a partir do próprio BU.
  - Nas duas, o pacote ficou parado até haver correspondência, e não havia registro anterior a ele.
- **Fato (1º turno):** não há aux no disco. A ordem correspondência → BU (2 a 169 min) não pode ser separada da chegada do pacote.
- **Correção para o doc 09:** trocar "de 2 a 169 minutos antes do BU" por "junto com o pacote; o BU foi aceito de 2 a 169 minutos depois". O item 3 do doc ("a totalização se comporta como se exigisse correspondência registrada") precisa da ressalva de que, nessas seções, a exigência foi satisfeita por um registro feito no momento da chegada do pacote.

### 2.3 Linha de base histórica

| CEFT, 1º turno salvo indicação, Brasil, sem Sistema de Apuração | Seções com correspondência efetivada recebida no dia da votação | às 17 h ou depois (hora local) |
|---|---:|---:|
| 2022 | 194 | 80 |
| 2024 (sem DF) | 82 | 51 |
| 2026, 1º turno | 26 | 14 |
| 2026, 2º turno | 35 | 28 |

**Fato:** o registro da correspondência no próprio dia, inclusive à noite, junto com a transmissão, ocorre em toda eleição com CEFT no disco. Em 2026 foi menos frequente que em 2022 e 2024. Isso não fecha a brecha. Mostra que ela é do desenho do processo, não desta eleição.

### 2.4 O que o diário de cada seção mostra

Em todas as 45, a urna que votou foi preparada **antes** do dia, abriu no início da votação e registrou o primeiro voto em poucos minutos. Nenhuma foi trocada no meio do dia. As horas abaixo são da urna, no relógio local.

**2º turno (28):**

| Grupo | Seções | Carga | Abertura / 1º voto |
|---|---|---|---|
| A. Urna de contingência recarregada como urna de seção | BA 38490/0008/0432, /0606; MA 07536/0026/0088; MT 91553/0038/0113; PA 04278/0030/0295, 04278/0098/0273, 04278/0076/0475, 05630/0008/0325, 05355/0104/0279; PR 77399/0124/0085; RO 00051/0030/0123; SP 70378/0115/0155 (12) | 14 a 24/10 (9 em 24/10, a véspera) | 07:00 a 08:03 / até 4 min depois |
| B. A própria urna da seção, recarregada | PA 04154/0107/0161, /0278, /0296, /0341; PA 04332/0013/0428 (5) | 15 e 16/10 | 08:00 a 08:05 |
| C. Urna de seção de outra seção no 1º turno, recarregada como contingência | SE 31054/0002/0060 (era da 0001/0317), /0087 (era da 0002/0524), /0345 (era da 0001/0265), /0535 (0002/1045), /0551 (0002/0630); SP 69213/0317/0270 (0317/0369), /0294 (0317/0370) (7) | 15 e 19/10 | 08:00 / 08:00 a 08:55 |
| D. Urna em nenhuma CESP | as 4 abaixo | 03/10 a 21/10 | 08:00 |

As 4 do grupo D, no bruto:

| Seção | Diário da urna | Correspondência → pacote → BU oficial (Brasília) |
|---|---|---|
| BA 33774/0071/0150 | Carga **de seção** em 21/10 10:50 (mídia do cartório da zona 71, gerada em 17/09); ligada em 22/10 para conferência; em 25/10 ligada às 07:16, abertura 08:00:01, 1º voto 08:01, fim 17:03 | 20:42:34 → 20:42:36 → 20:53:46 |
| BA 39144/0071/0170 | Mesma máquina e mesmo operador de carga, 21/10 11:12; abertura 08:00:01, 1º voto 08:02 | 20:55:43 → 20:55:45 → 21:15:20 |
| PA 05355/0104/0093 | Urna UE2022 carregada **como contingência** em 03/10 13:24 (véspera do 1º turno); em 20/10 passou a "Modo de carga: Votação, seção 0093, 2º turno"; abertura 08:00:01, 1º voto 08:02 | 20:31:12 → 20:31:12 → 21:05:54 |
| SE 31054/0002/0524 | Contingência carregada em 19/10 14:17 (máquina do TRE-SE); em 24/10 08:25, "Início do procedimento de contingência"; em 25/10, seção 0524, abertura 08:00:01, 1º voto 08:02 | 20:58:21 → 20:58:21 → 21:10:06 |

- **Fato:** nas 4 há rastro técnico da preparação no diário (carga de seção, ou carga de contingência seguida do procedimento que a converte em urna da seção), dias antes da votação. A urna esperada pela CESP era a do 1º turno.
- **Fato:** nas 2 da BA, a urna do 1º turno encerrou às 21:14 e às 20:47 do dia 04/10, mais de 3 h depois do fim da votação.
- **Sem explicação nos arquivos:**
  - por que as urnas do 1º turno foram trocadas;
  - de onde vieram as 2 urnas da BA, que não aparecem como reserva em nenhuma lista;
  - por que a correspondência de uma carga feita de 4 a 22 dias antes só chegou com o pacote.

**1º turno (17):**

| Grupo | Seções |
|---|---|
| Urna carregada em 03/10, véspera, no lugar da esperada (algumas são contingências da zona recarregadas) | AM 02550/0001/0778, /0869; CE 14672/0026/0030; PA 04030/0094/0117, 04278/0029/0578 (carga às 16:19, depois da CESP), 04278/0030/0260, 04278/0098/0020, 04570/0009/0074, 05312/0004/0450; SP 71072/0373/0044 (10) |
| Urna carregada em setembro, mas a CESP esperava outra | MG 41475/0045/0043 (carga 21/09; a esperada foi carregada em 22/09), MG 48658/0184/0358, MG 48917/0192/0042, PA 04626/0068/0161, PR 79316/0086/0191, SP 65692/0058/0166 (6) |
| Recarga na manhã da votação | MG 48852/0190/0107 (contingência recarregada às 07:51, abertura 08:07; a correspondência chegou às 15:52, durante a votação) (1) |

- **Fato:** em 16 das 17, a mesma urna e a mesma carga votaram no 2º turno e já estavam na CESP da véspera do 2º turno.
- **Hipótese:** as cargas de 03/10 e 24/10 (véspera) batem com a troca de urna do Teste de Integridade, em que a urna sorteada sai da seção na véspera e é substituída. Não há lista das seções sorteadas no disco. **Pendente:** cruzar com as listas de sorteio dos TREs.

### 2.5 Os votos destoam?

Para cada caso: parcela do 13 entre 13 e 22 e comparecimento, comparados com as outras seções do mesmo local de votação, em cada turno, e a virada do 1º para o 2º turno contra a do local. A linha de base é a mesma conta em 451.883 seções de locais com 3 ou mais seções.

- **Fato:** das 45, 41 têm linha de base. **Nenhuma** passa do percentil 99 em nenhuma das 5 medidas. Passam do percentil 95 de 0 a 3 por medida, contra cerca de 2 esperadas ao acaso.
- **Fato:** as 4 sem local comparável, contra o município:
  - BA 33774/0071/0150: o 13 teve 95,0% no 2º turno e 95,2% no 1º, com outra urna (município: 77% e 76%). É reduto, igual nos dois turnos;
  - BA 39144/0071/0170: 82,5% e 85,4%;
  - PA 04626/0068/0161: 18,8% e 21,7%;
  - PA 05630/0008/0325: 65,7% e 62,8%.
  - Nada destoa do próprio 1º turno.
- **Fato:** nas 12 seções do item 3 e afins, 1 passa do percentil 99: a virada da SE 31755/0005/0143 (o 13 caiu 2,6 pontos e o local subiu 4,1). É 1 em 57 casos × 5 medidas, dentro do acaso.

## 3. As trocas que o doc 09 deu como sem explicação

### SE (5): 31690/0012/0087, 32476/0023/0118, 31712/0013/0082, 32514/0035/0057, 31755/0005/0143

No diário bruto da urna que votou no 2º turno (carga de setembro, correspondência recebida em setembro):

| Seção | 04/10: votos no diário da urna do 2º turno | dos quais liberados por digital | Encerramento | 1º turno oficial (outra urna, carga 03/10): comparecimento / por digital | 25/10: votos / por digital |
|---|---:|---:|---|---:|---:|
| 31690/0012/0087 | 164 | 1 | 17:02 | 169 / 157 | 183 / 168 |
| 31712/0013/0082 | 189 | 0 | 17:10 | 192 / 182 | 192 / 182 |
| 31755/0005/0143 | 180 | 2 | 17:16 | 174 / 165 | 174 / 165 |
| 32476/0023/0118 | 155 | 1 | 17:02 | 274 / 237 | 279 / 235 |
| 32514/0035/0057 | 202 | 1 | 17:05 | 262 / 246 | 263 / 246 |

- **Fato:** cada uma dessas urnas fez, no dia 04/10, uma votação completa e oficial da **mesma seção**, quase sem digital, e encerrou depois das 17 h. Essa votação não é o resultado oficial do 1º turno. O resultado oficial veio da urna carregada em 03/10, com eleitores liberados por digital.
- **Hipótese forte:** é o Teste de Integridade do 1º turno. A urna sorteada sai da seção na véspera (daí a carga nova de 03/10 na seção) e recebe, ao longo do dia, votos de cédulas de papel digitados sem a digital do eleitor. No 2º turno ela voltou à seção com a carga original, que vale para os dois turnos. A CESP do 2º turno continuou listando a substituta do 1º turno.
- O rastro é técnico (diário assinado), não procedimento humano. Falta só a lista das seções sorteadas pelo TRE-SE.
- **Observação (Fato):** em 2 das 5 (0082 e 0143), comparecimento e liberação por digital são iguais nos dois turnos. Isso ocorre em 0,55% das seções de 150 a 249 aptos. A distribuição dos votos por hora é diferente entre os turnos (ex.: 0143, 18 votos entre 12 h e 13 h no 1º turno e 8 no 2º), o que afasta uma cópia da sessão do 1º turno.

### MA (2): 09210/0001/0124 e /0125

- **Fato:** a mesma urna, com a carga de 28/09 (correspondência recebida em 28/09 e listada na CESP da véspera do 1º turno), votou nos dois turnos com eleitores liberados por digital: 265 de 295 e 252 de 297 na 0124; 273 de 306 e 274 de 306 na 0125.
- **Fato:** em 03/10, às 15:08 e 15:19, outras urnas foram carregadas para essas seções. A correspondência delas chegou em 14/10, e elas passaram a ser as "esperadas" do 2º turno. Nunca votaram.
- **Sem explicação nos arquivos:** por que a substituição preparada na véspera do 1º turno não foi usada. O par que votou estava registrado antes das duas votações. O furo está na lista, não no pacote.

### Do mesmo tipo: MG 41238/0331/0001 e /0197; MT 90670/0039/0376

- **Fato:** urnas novas carregadas entre os turnos (13/10 em MG; 24/10 10:00 no MT). A correspondência chegou no mesmo dia (MG, 14:13; MT, 11:21, antes da CESP de 12:31), mas a CESP da véspera não as lista. Os diários de MG mostram a carga de 13/10, uma conferência em 18/10 e a abertura às 08:00.
- **Fato:** nas 10 seções deste item, só uma medida passa do percentil 99: a virada da SE 31755/0005/0143 (item 2.5).

## 4. RED

- **Fato (reproduzido no bruto):** os 66 pacotes RED têm só BU, imagem do BU, RDV, `log.jez` e `vota.vsc`. Dentro do `log.jez` não há nenhuma assinatura aninhada.
- **Fato (SE 31054/0001/0346, 1º turno):**
  - o BU declara a urna da seção;
  - o pacote é assinado por uma contingência da zona 2;
  - o `log.jez` traz um `.jez` com o nome da urna do RED, e dentro dele o diário da urna original, sem assinatura própria. O diário mostra uma tentativa de RED na própria urna às 18:06 e o fechamento do log às 18:28;
  - traz também o diário da urna do RED, que rodou às 18:48 ("Identificada uma urna de contingência").
- **Fato (ES 56170/0023/0137, 2º turno):** o RED rodou na **própria** urna da seção às 18:43. Há um só diário, e o pacote leva a assinatura da própria urna.
- **Fato:** 49 dos 66 RED são deste segundo tipo: o assinante é a urna do BU. Só nos **17** (14 + 3) o diário original fica coberto apenas pela chave de outra urna. São 3.271 votos no 1º turno e 819 no 2º, 4.090 nos dois. Todas as 17 urnas do RED são contingências da CESP: 16 da mesma zona e 1 de outra zona do mesmo município (Aracaju).
- **Vale para todo RED?** Por construção, sim. O RED existe porque a urna original não conseguiu gerar o resultado, e a única chave disponível para lacrar o pacote é a da urna onde o RED roda. Os arquivos de outras eleições não estão no disco para confirmar que o formato é o mesmo, mas não há nada próprio de 2026 no mecanismo. Em pacote nenhum, normal ou RED, o diário tem assinatura separada. Ele é coberto pela assinatura do pacote inteiro, e cada linha traz um código de encadeamento cuja regra não é pública.
- **Correção para o doc 09:** "nenhum dos 66 RED traz assinatura da urna original" deve virar "nos 17 RED feitos em outra urna, o diário da urna original só é coberto pela chave da urna que fez o RED. Nos 49 feitos na própria urna, a assinatura é dela".

## 5. Seções novas com comparecimento de 95% ou mais

**Fato (reproduzido exatamente, com os aptos do BU):** no 2º turno, 433 de 40.740 seções novas e 206 de 458.438 antigas. No 1º turno, 448 e 111. A razão bruta é 23,7 vezes (2º turno).

| Explicação testada (2º turno) | Resultado |
|---|---|
| Renumeração de zona (mesmo número de seção, mesmo município, outra zona em 2022) | 101 das 433. São "novas" só pela chave |
| Local de votação que já existia em 2022 | 119 |
| Seção especial (maioria TTE: trânsito, presos) | 7 |
| **Tamanho × % sem biometria no cadastro × % com 80 anos ou mais × parcela TTE** (padronização indireta, estratos com 30 ou mais seções antigas) | Nos estratos comparáveis: 201 observadas × 106,6 esperadas (**1,9 vez**). As outras **232** estão em estratos quase sem seção antiga (seções pequenas, com biometria completa e sem idosos), onde não há base para comparar |
| A mesma seção no outro turno | 229 das 433 novas com 95% ou mais também passam de 95% no 1º turno. Nas antigas, 58 de 206 |

- **Fato:** tamanho e perfil do cadastro explicam a maior parte da diferença: ela cai de 23,7 vezes para 1,9 vez onde há com o que comparar. O resto não se separa com estes dados. Comparar com 2022 (a mesma seção, ou o mesmo local, em 2022) exige o comparecimento por seção de 2022, que não está no disco. **Pendente** (precisa de download).
- **Juízo:** é efeito de cadastro (seção nova com eleitorado recente e pequeno), não anomalia de processo. Nada nos pacotes dessas seções aponta troca.
- **Ressalva ao doc 09 ("o perfil contraria a ideia de seção fantasma"):** nas novas com 95% ou mais e sem eleitor TTE, **7,83%** dos votantes foram liberados sem digital, embora só **0,40%** do cadastro delas não tenha biometria. Nas antigas com 95% ou mais: 13,22% contra 4,66%. No conjunto das antigas: 12,98% contra 11,05%. Seção com comparecimento muito alto, nova ou antiga, tem mais liberação sem digital do que o cadastro sem biometria explica. É exatamente o caminho que não exige a presença do eleitor (H07). Não é prova de nada, mas o perfil não "contraria" a hipótese tanto quanto o doc diz. **Recomendação:** levar à H07 (liberação pelo mesário) a pergunta "o excesso de liberação sem digital nas seções de 95% ou mais está nos eleitores com biometria cadastrada?".

## 6. Código de carga repetido no 2º turno

- **Fato (reproduzido):** 494.382 de 499.176 seções com urna nos dois turnos têm o mesmo código de carga, e em todas a urna também é a mesma. 0 seção com a mesma carga e outra urna. As outras 4.794 trocaram de urna ou foram recarregadas.
- **Implicação:** o código de carga é um número de identificação da preparação, publicado no BU (e também na CESP, já no 1º turno). Não é segredo e não foi feito para ser. A barreira contra um pacote falso é a chave da urna (assinatura) mais o casamento urna × carga × seção no TSE. Saber o código não ajuda nem atrapalha um atacante.

## Explicações alternativas: testadas × supostas

| Explicação | Situação |
|---|---|
| Fuso do CEFT (hora local × Brasília) | Testada (mesmo registro e hora da carga) |
| Erro de leitura do BU (urna/carga) | Testada (parser do banco = doc 08 em 100%) |
| Correspondência registrada antes, mas fora da CESP | Testada (CEFT antes do dia, fora da CESP: 20 seções no 2º turno) |
| Troca no meio do dia (urna nova à tarde) | Testada e descartada nas 45 (abertura e 1º voto no início) |
| Teste de Integridade (SE 5) | Testada no diário (sessão sem digital em 04/10). Falta a lista de sorteio |
| Teste de Integridade (cargas de véspera nas 45) | Suposta. Falta a lista de sorteio |
| Transmissão atrasada pelo cartório | Suposta. Os arquivos não dizem quem transmitiu nem por quê (o campo "máquina de transmissão" não separa) |
| "O mesário/juiz conferiu a troca" | Recusada (princípio 8) |

## Texto para leigos (pode entrar no relatório)

> **Cada urna "assina" o resultado da sua seção. Alguém poderia trocar esse resultado por outro, assinado por outra urna?**
>
> Conferimos todas as seções dos dois turnos. Em todas, o resultado foi assinado pela própria urna que ele diz ter votado. A exceção são as seções em que a urna quebrou e os votos foram recuperados por outra urna, num procedimento chamado recuperação de dados. Nesses casos, quem assinou foi uma urna de reserva registrada para a região.
>
> O TSE publica uma segunda lista, feita antes da eleição, com a urna que cada seção deveria usar. É como a lista de chamada da escola, feita antes da prova. Em quase todas as seções, a urna que votou estava nessa lista na véspera. Numa pequena parte, a urna foi trocada dias antes, e o registro dela só chegou ao TSE na noite da eleição, junto com o resultado. Nessas seções, a lista de chamada não serve de prova feita antes. Olhamos cada uma: a urna foi preparada dias antes, abriu às 8 h e recebeu o primeiro voto em minutos, e os votos são parecidos com os das seções vizinhas e com os do 1º turno. O mesmo atraso de registro aconteceu, em número maior, nas eleições de 2022 e 2024.
>
> Algumas urnas do 2º turno tinham passado o dia do 1º turno fora da seção, votando com cédulas de papel sem digital, como acontece com as urnas sorteadas para o teste público de integridade. Depois voltaram para a seção de origem.
>
> Na recuperação de dados feita em outra urna, a única "assinatura" dos votos recuperados é a da urna que fez a recuperação. Isso faz parte de como o procedimento funciona, não é falha desta eleição. Afeta poucas seções.
>
> Não encontramos seção fantasma: toda seção com resultado existe no cadastro de locais e no resultado oficial, e nenhuma teve mais votantes do que eleitores. Seções criadas nos últimos anos têm comparecimento muito alto com mais frequência. Isso se explica em boa parte por serem pequenas e terem eleitorado recente, sem eleitores que morreram ou se mudaram.

**Fica fora do relatório:**
- percentis, razões padronizadas e qualquer número de teste;
- a hipótese do Teste de Integridade para as cargas de véspera das 45 (só a das 5 de SE tem rastro, e mesmo ela depende da lista do TRE para virar Fato);
- a pista de liberação sem digital nas seções de 95% ou mais (vai para a H07);
- a contagem das 107 seções com BU aceito depois da chegada do pacote, até ser revista no tema da linha do tempo.

**Números que podem entrar (universo completo, conferidos):**
- 499.207 seções com pacote em cada turno, todas no CEFT;
- 45 seções com registro só no dia (17 e 28);
- 17 recuperações feitas em outra urna (14 e 3);
- 494.382 seções com o mesmo código de carga nos dois turnos.

## Pendente e recomendações

- **Pendente:**
  - listas de sorteio do Teste de Integridade dos dois turnos, por TRE, para fechar as 5 de SE e testar as cargas de véspera;
  - comparecimento por seção de 2022, para a linha de base das seções novas.
- **Recomendação (LAI):**
  1. regra da totalização: o que acontece com um pacote que chega sem correspondência (fica parado, é rejeitado ou gera o registro?) e quem libera;
  2. a origem das 2 urnas da BA zona 71 que não constam de lista nenhuma;
  3. por que a CESP da véspera do 2º turno não lista correspondências recebidas 11 dias antes (MG);
  4. uso de contingência entre zonas e entre municípios.
- **Para o doc 09 (o engenheiro corrige, não este parecer):**
  - itens 1, 1.6, 3 e Teste 3, conforme as correções acima;
  - no item 1.6, as urnas da SE 0060 e 0345 vinham de seções da zona 1, não da zona 2;
  - a contingência de MT 91553 e SP 70378 está registrada em outro município da mesma zona.

## Reproduzir

```
node --max-old-space-size=6000 scripts/auditoria/cetico-38-correspondencias.mjs --turno 1
node --max-old-space-size=6000 scripts/auditoria/cetico-38-correspondencias.mjs --turno 2
node scripts/auditoria/cetico-38-efetivada.mjs
node --max-old-space-size=4000 scripts/auditoria/cetico-38-casos.mjs
node --max-old-space-size=4000 scripts/auditoria/cetico-38-aux.mjs
node scripts/auditoria/cetico-38-historico.mjs
node --max-old-space-size=4000 scripts/auditoria/cetico-38-votos.mjs
node --max-old-space-size=4000 scripts/auditoria/cetico-38-novas.mjs
node src/exportar.js --turno 2 --uf se --municipio 31755 --zona 0005 --secao 0143 --log completo --stdout   # e as demais seções citadas
```
