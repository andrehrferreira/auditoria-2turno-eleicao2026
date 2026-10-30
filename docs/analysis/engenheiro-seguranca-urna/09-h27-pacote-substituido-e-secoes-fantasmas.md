# 09. H27: pacote assinado por outra urna e seções fantasmas

Perfil `engenheiro-seguranca-urna`, hipótese H27 ([hipoteses.md](../../hipoteses.md)), pedido do André em 30/10/2026. Continua o [doc 07](07-h25-certificados.md), o [doc 08](08-h25-certificados-fora-do-padrao.md) e o [parecer 35](../cetico-revisor/35-h25-certificados-fora-do-padrao.md). Universo completo: 499.207 pacotes por turno, os dois turnos.

> **Termos.**
> - **Carteira** é o certificado da urna: diz "esta chave é da urna nº X". A urna assina o pacote da seção com a chave dela.
> - **Carga** é a preparação da urna para uma seção: o cartão de carga grava o programa e o eleitorado da seção, e a urna recebe um **código de carga** de 24 dígitos, único. Esse código vai no boletim (BU).
> - **Correspondência** é o registro "urna nº X, com o código de carga Y, é da seção Z". O cartório transmite esse registro ao TSE depois da carga. O TSE publica duas listas nos dados abertos:
>   - **CESP** (esperadas): a urna de cada seção e as urnas de reserva (contingência) de cada zona, com o código de carga. Há duas versões por turno: uma da véspera e uma da manhã do dia da votação.
>   - **CEFT** (efetivadas): publicada depois da votação. Para cada seção, a urna esperada, a urna que de fato gerou os votos, as datas em que o TSE recebeu cada correspondência e o tipo de divergência (C = contingência, D = divergência, O = anulada).
> - **RED** (Recuperador de Dados): programa que gera o BU no cartório a partir da mídia de votação de uma urna que não conseguiu gerá-lo. O pacote sai assinado pela urna onde o RED rodou.
> - **Lista de fora do pacote:** o pacote diz quem assinou, qual urna e qual carga. Conferir essas três coisas entre si é circular (parecer 35), porque tudo vem do mesmo pacote assinado. As correspondências vêm de outro caminho (a carga, transmitida pelo cartório) e, na CESP da véspera, de **antes** da votação.

## Resposta curta

1. **Fato: nenhuma seção com pacote ficou fora das listas do TSE, e nenhuma urna que assinou é desconhecida delas.**
   - As 499.207 seções com pacote estão no CEFT nos dois turnos, e o CEFT não tem seção sem pacote.
   - A urna e a carga do BU são as **efetivadas** do CEFT em 100% das seções dos dois turnos.
   - Toda urna que assinou um pacote aparece nas listas do TSE: 0 assinante desconhecido nos dois turnos.
   - Nos 17 pacotes assinados por uma urna diferente da urna do BU (14 no 1º turno, 3 no 2º; todos RED), a urna que assinou estava na CESP como **urna de contingência**: 16 da mesma zona e 1 de outra zona (Aracaju, zona 2 para uma seção da zona 1).
2. **Fato: o par urna × carga do BU estava na lista publicada na véspera em 99,96% (1º turno) e 99,92% (2º turno) das seções votadas em urna.**

   | Onde o par urna × carga do BU aparece pela primeira vez | 1º turno | 2º turno |
   |---|---:|---:|
   | CESP da véspera (03/10 15:34; 24/10 12:31) | 498.978 | 498.789 |
   | só na CESP do dia (04/10 12:59; 25/10 13:45) | 181 | 341 |
   | só no CEFT, correspondência recebida **antes** do dia da votação | 0 | 20 |
   | só no CEFT, correspondência recebida **no dia** da votação | 17 | 28 |
   | Total de pacotes de urna (sem o Sistema de Apuração) | 499.176 | 499.178 |

3. **Fato: em todas as seções do Brasil, o TSE recebeu a correspondência da urna que votou antes de receber o BU dela.** São 497.895 seções no 1º turno e 497.897 no 2º; o exterior ficou fora, porque os fusos variam.
   - Nas 28 seções do 2º turno e nas 17 do 1º do item 2, a correspondência chegou **no dia da votação, depois de a votação abrir** (no 2º turno, à noite), de 2 a 169 minutos antes do BU. Não era uma lista de antes da votação.
   - É nessas 45 seções que a lista de fora do pacote não serve de prova anterior. Estão listadas no item 1.6.
4. **Fato: as carteiras que mudaram entre os turnos são explicadas pelas listas do TSE.**
   - São 4.440 seções com carteira diferente no 2º turno: urna de seção trocada (1.550), reserva da H14 (2.809), reserva do 1º turno que virou urna de seção (43), RED em algum turno (27) e Sistema de Apuração (11).
   - As 86 carteiras que aparecem em outra seção no outro turno se explicam assim:
     - 85 são urnas **recarregadas** para outra seção, com código de carga novo e registradas na CESP do 2º turno;
     - 1 é o computador do Sistema de Apuração do exterior, que apurou 29 seções no 1º turno e 20 delas no 2º.
5. **Fato (RED):**

   | | 1º turno | 2º turno |
   |---|---:|---:|
   | Seções RED | 50 | 16 |
   | assinadas pela própria urna da seção | 36 | 13 |
   | assinadas por outra urna | 14 | 3 |
   | votos nos diários do pacote = comparecimento do BU | 50 | 15 |
   | par urna × carga do BU na CESP da véspera | 50 | 16 |

   - A única urna de RED que assinou duas seções no mesmo turno foi a do ES 57932/0009, nas seções 0085 e 0112. Esse caso já está explicado no tópico 2 da perícia.
   - **Nenhum dos 66 pacotes RED traz assinatura própria da urna original.** O diário dela vem dentro do pacote assinado pela urna do RED. A conferência "diário = BU" é, portanto, coerência interna desse pacote.
6. **Fato: não há seção fantasma pelos critérios testados.**
   - Toda seção com pacote existe no cadastro de locais de votação como seção principal e ativa, e está no resultado oficial por seção.
   - O comparecimento passa dos aptos em 0 seções nos dois turnos, tanto nos aptos oficiais quanto nos do BU.
   - 389 seções não estão no perfil do eleitorado de julho. São 243 de preso provisório e 146 de voto em trânsito, todas formadas por eleitores transferidos temporariamente depois do fechamento do cadastro.
7. **Fato, com Hipótese para a causa: as seções criadas depois de 2022 ou 2024 têm comparecimento de 95% ou mais com muito mais frequência que as antigas do mesmo tamanho.**
   - No 2º turno são 433 seções novas nessa faixa. Entre as antigas, só 206 de 458.438 estão nela.
   - O local de votação e o município não explicam a diferença.
   - O cadastro dessas seções é de eleitorado recente:
     - 23% têm de 16 a 20 anos (nas antigas, 4,3%);
     - 0,3% não têm biometria (nas antigas, 11%);
     - 0,7% têm 80 anos ou mais (nas antigas, 3,6%);
     - 93% dos votos foram liberados por biometria (nas antigas, 87%).
   - **Hipótese benigna:** seção nova não carrega os eleitores que morreram ou se mudaram sem transferir o título. Por isso o teto de comparecimento dela é mais alto. Este teste não comprova essa hipótese (item 4.3).
8. **Limite.** As listas do TSE excluem o atacante que só tem uma urna com carteira válida. Não excluem quem também consegue registrar correspondência no TSE (carga ou transmissão), nem quem altera as listas no próprio TSE.
   - A urna "efetivada" do CEFT é a urna do BU em 100% das seções, inclusive nos RED. A lista registra a urna que o BU declara, não a urna que assinou.
   - No 2º turno, o código de carga do BU já era público desde a publicação do 1º turno em 494.382 seções, porque a carga vale para os dois turnos. Conhecer o código não é barreira para quem prepara um pacote falso do 2º turno.

## O ataque, visto pelo atacante

| Variante | O que o atacante precisa ter | Rastro esperado nos arquivos públicos | Procurado | Resultado |
|---|---|---|---|---|
| A. Cartão de resultado adulterado e assinado por uma urna "que só assina" | A chave de uma urna com carteira válida (urna alterada, de reserva ou de RED) e acesso ao cartão no caminho até a transmissão | Carteira em 2 seções; assinante fora das listas; assinante ≠ urna esperada/efetivada; diário da urna original ausente ou com votos ≠ BU | Itens 1.3, 2, 3 | 0 assinante fora das listas; 17 assinantes ≠ urna do BU, todos RED e todos urnas de contingência da CESP; diário presente nos 66 RED e com votos = BU em 65 (a exceção é o ES 0085, já explicado) |
| B. Mesmo ataque, copiando a urna e a carga da seção para o BU (o BU declara a urna original) | Variante A, mais o número da urna e o código de carga da seção. No 2º turno, os dois estão no BU publicado do 1º turno | Só o assinante ≠ urna do BU. No CEFT fica a urna do BU, e não aparece divergência | Item 1.3 | São os 17 RED. Fora deles, assinante = urna do BU em 100% |
| C. Urna inteira trocada por outra com carga própria (pacote "legítimo" de urna não prevista) | Uma urna com carteira válida, recarregada para a seção, e a correspondência registrada no TSE | Par urna × carga fora da CESP da véspera; correspondência recebida tarde; esperada ≠ efetivada sem divergência C | Itens 1.4 a 1.6 | 389 (2º turno) e 198 (1º turno) fora da véspera; 28 e 17 com correspondência recebida no dia da votação, depois da abertura (lista no item 1.6) |
| D. Seção fantasma (seção inexistente com pacote contado) | Criar a seção no cadastro e no resultado, preparar a urna e transmitir | Seção fora do perfil, dos locais ou do resultado; comparecimento > aptos; seção recém-criada com comparecimento alto | Item 4 | 0 fora dos locais e do resultado; 389 fora do perfil (todas de preso provisório ou trânsito); 0 com comparecimento > aptos; seções novas com comparecimento alto: ver item 4.3 |

## Fontes e método

- **Pacotes:** as saídas do doc 08, `data/parsed/auditoria/seguranca-h25/{1t,2t}-padrao-dirs.jsonl`, com 499.207 linhas por turno e uma seção por linha (conferido: 0 seção repetida). Cada linha traz:
  - o assinante: o número da urna do certificado, que é igual ao `idHW` do `.vsc` em 100% dos pacotes (doc 08);
  - a urna e o código de carga do BU;
  - as urnas e cargas que aparecem em todos os logs do pacote.
- **Correspondências (baixadas em 30/10/2026):**
  - a lista de arquivos sai da API do portal de dados abertos do TSE (`https://dadosabertos.tse.jus.br/api/3/action/package_show?id=<pacote>`), nos pacotes `resultados-2026-correspondencias-esperadas-e-efetivadas-1-turno` e `-2-turno`;
  - são 28 zips por tipo (27 UFs mais ZZ, o exterior), em `https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/correspesp/CESP_<t>t_<UF>_<data>.zip` e `.../correspefet/CEFT_<t>t_<UF>_<data>.zip`;
  - CESP do 1º turno de 03/10/2026 15:34 e 04/10/2026 12:59; CESP do 2º turno de 24/10/2026 12:31 e 25/10/2026 13:45;
  - CEFT do 1º turno de 05/10/2026 10:49; CEFT do 2º turno de 26/10/2026 12:01.
  - Para o item 4: CEFT do 1º turno de 2022 (28 zips) e de 2024 (26 zips; 2024 não teve eleição no DF nem no exterior), e a tabela pública "número interno × modelo da urna" (`https://cdn.tse.jus.br/estatistica/sead/odsele/modelo_urna/modelourna_numerointerno.zip`).
  - **Integridade:** 223 arquivos, 0 falha. 222 têm o `.sha512` publicado pelo TSE ao lado, e o SHA-512 confere em todos. A tabela de modelo não tem `.sha512` publicado (resposta HTTP 404).
  - A URL, o tamanho e o SHA-256 de cada arquivo estão em [09-h27-arquivos-baixados.csv](09-h27-arquivos-baixados.csv). O manifesto local é `data/raw/dadosabertos/correspondencias/manifesto.json`.
  - `src/dadosabertos.js` não cobre esses conjuntos, que ficam em outra pasta do CDN.
- **Leitura dos CSV:**
  - o CSV do TSE tira os zeros à esquerda do código de carga (1 em cada 10 códigos), e a comparação ignora esses zeros;
  - a data em que o TSE recebeu a correspondência efetivada vem na hora **local**. Nas seções sem troca, a correspondência esperada e a efetivada são o mesmo registro, e a esperada vem na hora de Brasília. A diferença foi medida assim, município por município, pelo valor mais comum. Fica igual à da UF (AC, 2 h; AM, MS, MT, RO e RR, 1 h; demais, 0) em todos os municípios do Brasil, menos 12: 11 do AM com 2 h e Fernando de Noronha (PE) com −1 h. O item 1.5 converte para a hora de Brasília.
- **Resultado oficial:**
  - `detalhe_votacao_secao_2026` (arquivo BR, cargo Presidente): aptos, comparecimento e as horas de recebimento do BU e da primeira totalização, na hora de Brasília;
  - `votacao_secao` (tabela `voto_oficial` do banco);
  - `eleitorado_local_votacao_2026` (cadastro de locais e seções);
  - `perfil_eleitor_secao_2026`, via `data/parsed/auditoria/biometria/cadastro-secao.jsonl`.
- **RED:** a tabela `secao` do banco (`tipo_arquivo = 'votacaoRED'`). Os votos dos diários vêm de `data/parsed/auditoria/integridade/{1t-identificadores,2t}/casos-especiais.json` (Auditor E). A estrutura do pacote foi lida no arquivo bruto, nos 66 diretórios oficiais.

## Medida 1 (refeita)

| | 1º turno | 2º turno |
|---|---:|---:|
| Carteiras distintas | 499.179 | 499.179 |
| Carteira em mais de uma seção | 1 | 3 |

- 1º turno: o computador do Sistema de Apuração nº 1808076, que assinou 29 seções do exterior.
- 2º turno:
  - o mesmo computador (20 seções);
  - o computador nº 1762246 (9 seções do exterior);
  - a urna nº 1758779, nas seções ES 57932/0009/0085 e /0112 (RED).

| Carteiras dos dois turnos | |
|---|---:|
| no mesmo conjunto de seções | 494.747 |
| em parte nas mesmas seções (o computador 1808076: 29 seções, depois 20 delas) | 1 |
| em seções sem nenhuma em comum | 85 |
| só no 1º turno / só no 2º turno | 4.346 / 4.346 |

Os números conferem com a primeira medida do coordenador: 494.747 e 86 (85 + 1).

## 1. Teste 1: a lista de fora do pacote

### 1.1 Universo

| | 1º turno | 2º turno |
|---|---:|---:|
| Seções com pacote | 499.207 | 499.207 |
| Seções no CEFT | 499.207 | 499.207 |
| Pacote sem CEFT / CEFT sem pacote | 0 / 0 | 0 / 0 |
| Seções na CESP do dia | 499.177 | 499.178 |
| Pacote fora da CESP do dia | 30: 28 do Sistema de Apuração e 2 de reserva | 29, todos do Sistema de Apuração |
| Urnas de contingência listadas na CESP do dia / usadas num pacote | 50.038 / 3.038 | 48.674 / 2.666 |
| Urna com mais de um código de carga na CESP | 0 | 0 |
| Urna esperada em mais de uma seção | 0 | 0 |

### 1.2 BU × efetivada (circular)

A urna e a carga do BU são as efetivadas do CEFT em 499.207 de 499.207 seções, nos dois turnos. O resultado mostra que o CEFT registra a urna que o BU declara. Não é prova independente de que essa urna votou.

### 1.3 Quem assinou

| | 1º turno | 2º turno |
|---|---:|---:|
| Assinante = urna do BU | 499.193 | 499.204 |
| Assinante ≠ urna do BU | 14 (RED) | 3 (RED) |
| assinante na CESP como contingência da mesma zona | 13 | 3 |
| assinante na CESP como contingência de outra zona | 1 (SE 31054/0001/0346, assinado por reserva da zona 2) | 0 |
| Assinante em nenhuma lista do TSE | 0 | 0 |
| Assinante fora das faixas públicas de número por modelo | 0 | 0 |

A tabela pública de faixas é de 2022 e não traz o UE2022. Ficam sem esse teste 198.757 pacotes no 1º turno e 198.746 no 2º. Para eles valem as faixas observadas do doc 08.

### 1.4 O par urna × carga do BU estava registrado antes da votação?

| Onde aparece pela primeira vez | Tipo de urna, divergência | 1º turno | 2º turno |
|---|---|---:|---:|
| CESP da véspera | urna de seção | 495.926 | 493.085 |
| | reserva com divergência C | 2.985 | 2.626 |
| | reserva sem divergência (reserva que já era a urna da seção) | 17 | 3.062 |
| | RED | 50 | 16 |
| só na CESP do dia | urna de seção | 155 | 327 |
| | reserva | 26 | 14 |
| só no CEFT, recebida antes do dia | urna de seção | 0 | 19 |
| | reserva | 0 | 1 |
| só no CEFT, recebida no dia | urna de seção | 13 | 19 |
| | reserva | 4 | 9 |

- **Fato:** das 341 seções do 2º turno que aparecem só na CESP do dia:
  - 334 tiveram a correspondência recebida antes de 25/10;
  - 7 a tiveram recebida na manhã de 25/10, entre 05:39 e 11:40 (hora local), antes da geração da CESP do dia (13:45). Essas 7 são urnas trocadas antes de a votação abrir ou no começo dela;
  - em 322 delas, a CESP do dia põe a urna que votou no lugar da urna esperada na véspera. É urna substituída depois da CESP da véspera.
- No 1º turno, das 181: 172 foram recebidas antes de 04/10 e 9 na manhã de 04/10, entre 06:11 e 11:11. Em 150, a urna esperada muda para a que votou.
- **Fato:** nas 20 seções do 2º turno "só no CEFT, antes do dia", o par foi recebido antes da votação, mas não aparece em nenhuma das duas CESP. Há quatro grupos:
  - **11 (AC 1, AP 9, MT 1):** uma urna de contingência da própria zona foi recarregada como urna de seção na manhã de 24/10. A correspondência foi recebida em 24/10, entre 10:21 e 15:58. A CESP continua listando essa urna como contingência, com a carga antiga.
  - **5 (SE: 31690/0012/0087, 32476/0023/0118, 31712/0013/0082, 32514/0035/0057, 31755/0005/0143):**
    - no 2º turno votou a urna da carga original de setembro, com correspondência recebida em setembro;
    - no 1º turno, a seção tinha votado com outra urna, registrada em 03/10;
    - a CESP do 2º turno esperava a urna do 1º turno;
    - o CEFT marca esperada ≠ efetivada **sem** divergência.
  - **2 (MA 09210/0001/0124 e /0125):** a mesma urna votou nos dois turnos, mas em 14/10 o TSE registrou outra urna como esperada para o 2º turno.
  - **2 (MG 41238/0331/0001 e /0197):** carga em 13/10, correspondência recebida em 13/10, e a urna não aparece em nenhuma CESP de nenhum turno.
- **Fato:** o CEFT nunca usa as divergências D (divergência) e O (anulada). A troca de urna de seção por outra urna de seção, sem contingência, aparece como esperada ≠ efetivada **sem** marca: 17 seções no 1º turno e 44 no 2º.

### 1.5 Ordem no tempo: correspondência antes do BU

| | 1º turno | 2º turno |
|---|---:|---:|
| Seções testadas (Brasil, urna; sem o exterior e sem o Sistema de Apuração) | 497.895 | 497.897 |
| BU recebido **depois** da correspondência efetivada | 497.895 | 497.897 |
| BU recebido antes da correspondência | 0 | 0 |
| intervalo de mais de 1 dia | 497.854 | 497.858 |
| intervalo de 1 h a 1 dia | 29 | 12 |
| intervalo de menos de 1 h | 12 | 27 |

- **Fato:** em nenhuma seção o TSE recebeu o BU antes da correspondência da urna que o gerou. O resultado é coerente com uma totalização que só aceita o BU de urna com correspondência registrada.
- **O que não permite afirmar:** que a totalização confere a carteira. O registro é da urna **do BU**, não da urna que assinou (item 1.2), e o intervalo pode ser de poucos minutos (item 1.6).

### 1.6 As 45 seções em que a correspondência chegou no dia da votação

**2º turno (28).** As horas de recebimento da correspondência estão em hora de Brasília para PA, BA, MA, PR, SE e SP; em MT e RO, a hora local é 1 h a menos. Os minutos contam até o BU, na hora de Brasília.

| Grupo | Seções | Carga | Correspondência → BU |
|---|---|---|---|
| Urna de contingência (na CESP com outra carga), recarregada como urna de seção. É da própria zona em 9; de outra zona do mesmo município em 2 (BA, zona 18) e em 1 (MT, zona 55); o PA 04278/0030/0295 só aparece como contingência no 1º turno | BA 38490/0008/0432 e /0606; MA 07536/0026/0088; MT 91553/0038/0113; PA 04278/0030/0295, 04278/0098/0273, 04278/0076/0475, 05630/0008/0325, 05355/0104/0279; PR 77399/0124/0085; RO 00051/0030/0123; SP 70378/0115/0155 (12) | 14/10 a 24/10 | 5 a 63 min |
| A própria urna da seção, recarregada (mesma carteira nos dois turnos, carga nova) | PA 04154/0107/0161, /0278, /0296, /0341; PA 04332/0013/0428 (5) | 15 e 16/10 | 5 a 30 min |
| Urna de seção de outra seção da zona no 1º turno, reserva no 2º | SE 31054/0002/0060, /0087, /0345, /0535, /0551 (a troca entre as zonas 1 e 2 de Aracaju, já vista na H14); SP 69213/0317/0270 e /0294 (7) | 15 e 19/10 | 7 a 28 min |
| **Urna que não aparece em nenhuma CESP de nenhum turno** | BA 33774/0071/0150 e BA 39144/0071/0170 (carga 21/10); PA 05355/0104/0093 (reserva, carga 03/10); SE 31054/0002/0524 (reserva, carga 19/10) (4) | — | 11 a 35 min |

**1º turno (17):**
- AM 02550/0001/0778 e /0869; CE 14672/0026/0030;
- MG 48658/0184/0358, 41475/0045/0043, 48852/0190/0107, 48917/0192/0042;
- PA 04278/0030/0260, 04278/0029/0578, 04278/0098/0020, 04030/0094/0117, 04570/0009/0074, 05312/0004/0450, 04626/0068/0161;
- PR 79316/0086/0191;
- SP 71072/0373/0044, 65692/0058/0166.

Nessas 17, a correspondência chegou em 04/10 entre 15:52 e 20:16 (hora local), e o BU de 2 a 169 minutos depois. 4 são reservas.

- **Fato:** nas 45, o diário do pacote traz a carga com o mesmo código do BU (`logTemCargaDoBU`).
- **Fato:** nas 4 urnas fora de todas as CESP, o par urna × carga entrou nos registros públicos do TSE só pela correspondência recebida na noite de 25/10. Elas são as mais próximas do perfil do ataque C. Também são compatíveis com urna recarregada entre os turnos e correspondência transmitida com atraso.
- **Hipótese (benigna, não testada):** os cartórios transmitiram com atraso a correspondência de urnas recarregadas ou trocadas entre os turnos. Os arquivos públicos não separam isso de um registro feito na hora para cobrir um pacote.

### 1.7 As trocas (esperada × efetivada no CEFT)

| | 1º turno | 2º turno |
|---|---:|---:|
| esperada = efetivada | 496.147 | 496.492 |
| ≠, divergência C (contingência) | 3.043 (3.011 reserva, 31 Sistema de Apuração, 1 RED em reserva) | 2.671 (2.640 reserva, 29 Sistema de Apuração, 2 RED em reserva) |
| ≠, sem divergência | 17 (13 urna de seção, 4 reserva) | 44 (35 urna de seção, 9 reserva) |
| Urnas esperadas que não geraram pacote | 3.060 | 2.715 |
| Seções cuja urna ou carga esperada mudou entre a CESP da véspera e a do dia | 165 | 360 |

No 2º turno, 3.063 seções votaram com reserva e têm esperada = efetivada. São as reservas herdadas do 1º turno (H14): a CESP do 2º turno já lista a reserva como urna da seção.

## 2. Teste 2: carteiras que mudaram entre os turnos

São 4.440 seções com carteira diferente no 2º turno. A coluna "lista do TSE" diz onde está o par urna × carga do BU do 2º turno.

| Grupo | Seções | CESP da véspera | só CESP do dia | só CEFT, antes do dia | só CEFT, no dia |
|---|---:|---:|---:|---:|---:|
| Urna de seção nos dois turnos, outra urna | 1.550 | 1.198 | 321 | 17 | 14 |
| Reserva nova no 2º turno (H14), urna de seção no 1º | 2.726 | 2.705 | 13 | 1 | 7 |
| Reserva nova no 2º turno (H14), outra reserva no 1º | 83 | 80 | 1 | 0 | 2 |
| Reserva no 1º turno, urna de seção no 2º | 43 | 41 | 2 | 0 | 0 |
| RED em algum dos turnos | 27 | 27 | 0 | 0 | 0 |
| Sistema de Apuração (exterior) num dos turnos | 11 | 2 (urna no 2º turno) | — | — | — |

- **Fato:** das 4.431 seções com urna no 2º turno, 4.408 (99,5%) têm o par urna × carga registrado no TSE antes do dia da votação, na CESP ou no CEFT. As outras 23 estão entre as 28 do item 1.6. As 5 restantes do item 1.6 têm a mesma carteira nos dois turnos, porque a urna da seção foi recarregada.
- A soma das reservas novas (2.809) difere das 2.818 trocas novas da H14 porque aqui as seções RED ficam num grupo separado.

### As 86 carteiras em seção diferente no outro turno

| Grupo | Carteiras | Mesma zona | Par do 2º turno na CESP da véspera | Só na CESP do dia | Carga |
|---|---:|---:|---:|---:|---|
| Urna de seção nos dois turnos, em seções diferentes | 47 | 27 | 39 | 8 | nova nas 47 |
| Urna de seção no 1º turno, reserva de outra seção no 2º | 32 | 27 | 30 | 2 | nova nas 32 |
| Urna de contingência que fez RED de outra seção no 1º turno e votou no 2º | 5 | 4 | 5 | 0 | nova nas 5 |
| Reserva nos dois turnos, em seções diferentes | 1 | 0 | 1 | 0 | nova |
| Computador do Sistema de Apuração do exterior (29 seções no 1º, 20 delas no 2º) | 1 | — | — | — | — |

- **Fato:** nas 85 urnas, o código de carga do 2º turno é diferente do código do 1º. A urna foi recarregada para a nova seção, e a nova correspondência está na CESP do 2º turno.
- Uma carga vale para uma seção. Uma urna que votasse em outra seção **com a mesma carga** seria anomalia. São 0.
- As 5 do RED:
  - ES 56995/0053/0028 → /0014;
  - ES 57053/0001/0046 → /0574;
  - SE 31054/0001/0346 → 31054/0002/0168;
  - SP 71072/0418/0073 → /0168;
  - SP 71072/0418/0418 → /0373.
- A lista completa, carteira por carteira, está em `carteiras.json`, chave `carteirasEmSecaoDiferente.lista`.

## 3. Teste 3: RED

| | 1º turno | 2º turno |
|---|---:|---:|
| Seções RED (`votacaoRED`) | 50 | 16 |
| Origem no CEFT | 50 R ("BU gerado por RED em urna de seção") | 14 R, 2 B ("BU gerado por RED em urna de contingência") |
| Assinadas pela própria urna da seção | 36 | 13 |
| Assinadas por outra urna | 14 | 3 |
| a urna que assinou é contingência da CESP | 14 | 3 |
| Comparecimento das assinadas por outra urna / de todas as RED | 3.271 / 11.881 | 819 / 3.829 |
| Diários do pacote com a urna e a carga do BU | 50 | 16 |
| Votos nos diários = comparecimento do BU | 50 | 15 (ES 0085: diários 612 = 308 da 0085 + 304 da 0112) |
| Par urna × carga do BU na CESP da véspera | 50 | 16 |
| Urna do RED que assinou outra seção no mesmo turno | 0 | 1 (ES 1758779: 0085 e 0112) |
| Carteira do RED no outro turno: mesma seção / outra seção / não aparece | 28 / 6 / 16 | 11 / 0 / 5 |
| Pacote com assinatura aninhada da urna original | 0 de 50 | 0 de 16 |

- **Fato (estrutura):** os 66 pacotes RED têm os mesmos 5 arquivos: BU, imagem do BU, RDV, `log.jez` e `vota.vsc`.
  - Dentro do `log.jez` há só diários (`logd.dat`) e diários compactados (`.jez`): 90 e 24, respectivamente.
  - Não há nenhum `.vsc`, `.sig`, `.p7s` ou certificado aninhado.
  - O diário da urna original fica coberto só pela assinatura da urna que fez o RED.
- **O que isso permite afirmar:** nos 17 RED assinados por outra urna, o assinante é uma urna de contingência registrada na zona antes da votação. A urna e a carga do BU são as esperadas para a seção. O diário dentro do pacote traz a urna e a carga do BU, e os votos dele fecham com o BU.
- **O que não permite afirmar:** que esse diário veio da urna original. Uma urna "que só assina", com software alterado, poderia montar um diário coerente com o BU, e o pacote passaria em todas essas conferências. O que limita esse ataque é a escala e o registro:
  - 17 seções com outra urna assinando (4.090 votos nos dois turnos);
  - todas com assinante registrado como contingência da zona.

## 4. Teste 4: seções fantasmas

### 4.1 Existência

| | 1º turno | 2º turno |
|---|---:|---:|
| Seções com pacote | 499.207 | 499.207 |
| no cadastro de locais como principal e ativa | 499.207 | 499.207 |
| no perfil do eleitorado por seção (julho/2026) | 498.818 | 498.818 |
| fora do perfil | 389 | 389 |
| no resultado oficial por seção (detalhe) | 499.207 | 499.207 |
| Resultado oficial sem pacote | 41 | 41 |
| Pacote sem votos de Presidente em `votacao_secao` | 1 | 2 |

- As 41 seções do resultado oficial sem pacote estão marcadas como não instaladas, com origem "Totalização".
- Os pacotes sem votos de Presidente em `votacao_secao` são seções do Sistema de Apuração no exterior com 0 voto: zz 29564/0001/0091 nos dois turnos e zz 30686/0001/0443 no 2º.
- As 389 seções fora do perfil são 243 de preso provisório e 146 de voto em trânsito, todas com eleitores em trânsito ou transferência temporária (TTE). Esses eleitores entram depois do perfil de julho. 206 delas não existiam em 2022.

### 4.2 Comparecimento × aptos

| | 1º turno | 2º turno |
|---|---:|---:|
| Comparecimento do BU > aptos oficiais | 0 | 0 |
| Comparecimento do BU > aptos do próprio BU | 0 | 0 |
| Aptos do BU ≠ aptos oficiais | 0 | 0 |
| Comparecimento > cadastro da seção (sem os eleitores em trânsito) | 1.540 | 1.655 |
| dessas, seções com eleitores em trânsito/TTE | 1.540 | 1.655 |
| Aptos da seção no BU **acima** do cadastro de locais | 0 | 0 |
| Comparecimento do BU ≠ oficial | 30 | 27 |

- Os aptos do BU são os aptos da seção mais os eleitores em trânsito ou TTE.
- As 30 e 27 seções em que o comparecimento do BU difere do oficial são todas do Sistema de Apuração: o pacote do SA não traz comparecimento, e o oficial vem da apuração.

### 4.3 Seções criadas depois de 2022 ou de 2024

"Nova" quer dizer que a chave UF/município/zona/seção não está no CEFT do 1º turno de 2022, ou no de 2024 (este sem DF e exterior).

| | 1º turno | 2º turno |
|---|---:|---:|
| Novas desde 2022 | 37.991 (10.904 com o mesmo número em outra zona do município: renumeração) | igual |
| Novas desde 2024 (sem DF e exterior) | 16.542 | igual |
| Comparecimento: antigas / novas desde 2022 / novas desde 2024 | 78,98% / 77,99% / 81,60% | 80,92% / 78,94% / 82,05% |
| Seções com comparecimento ≥ 95%: antigas | 111 de 458.436 | 206 de 458.438 |
| Seções com comparecimento ≥ 95%: novas (2022 ou 2024) | 448 | 433 |

Parcela com 95% ou mais, por tamanho da seção (2º turno):

| Aptos | Antigas | Novas |
|---|---:|---:|
| menos de 100 | 32 de 1.350 (2,4%) | 128 de 1.423 (9,0%) |
| 100 a 199 | 58 de 12.187 (0,48%) | 170 de 6.827 (2,5%) |
| 200 a 299 | 81 de 133.360 (0,06%) | 78 de 13.668 (0,57%) |
| 300 ou mais | 35 de 311.541 (0,01%) | 57 de 18.822 (0,30%) |

- **Fato:** a concentração não vem do local nem do município.
  - 1º turno: das 448 seções novas com 95% ou mais, 191 dividem o local de votação com seções antigas, e o local antigo passa de 90% em 11. O município passa de 90% em 3 de 446.
  - 2º turno: 197 dividem o local com seções antigas, e o local antigo passa de 90% em 17. O município passa de 90% em 0 de 431.
  - Não vem de eleitores em trânsito: mais da metade dos aptos é TTE em 38 (1º turno) e 40 (2º turno) delas.
- **Fato (perfil do cadastro):**

  | Grupo (2º turno) | 16 a 20 anos | sem biometria | 80 anos ou mais | votos liberados por biometria |
  |---|---:|---:|---:|---:|
  | antigas | 4,32% | 11,15% | 3,59% | 87,18% |
  | novas | 17,84% | 6,57% | 1,92% | 89,12% |
  | novas com ≥ 95% | 23,22% | 0,27% | 0,72% | 92,90% |

- **Hipótese:** seção nova reúne eleitores alistados ou transferidos há pouco, com biometria. Ela não acumula título de quem morreu ou se mudou sem transferir, e por isso o teto de comparecimento é mais alto. O mesmo mecanismo explica o comparecimento menor das seções antigas e liga este achado à H01.
  - O perfil (jovens, biometria quase completa, 93% liberados por biometria) contraria a ideia de seção fantasma: votos liberados por digital exigem a pessoa presente. Não exclui liberação sem biometria nos 7% restantes (H07).
  - Comprovar a hipótese pede comparar com 2022 (as mesmas seções novas de 2022 tiveram comparecimento alto em 2022?). Isso fica **Pendente**, para o estatístico e o demógrafo.

## O que cada resultado permite e não permite afirmar

| Resultado | Permite afirmar | Não permite afirmar |
|---|---|---|
| Urna e carga do BU = efetivada (100%) | O TSE registrou, para cada seção, a urna que o BU declara | Que essa urna votou; o CEFT sai do BU |
| Par urna × carga na CESP da véspera (99,96% e 99,92%) | Nessas seções, a urna e a carga do BU foram registradas no TSE antes da votação, por outro caminho | Que a urna que gravou o cartão era essa; que o software dela era o oficial |
| Correspondência antes do BU (100% no Brasil) | A totalização se comporta como se exigisse correspondência registrada | Que confere a carteira do assinante; nas 45 seções da noite, a correspondência e o BU chegaram com minutos de diferença |
| Assinante na CESP (100%) e RED só por contingência da zona (17) | Nenhuma urna estranha às listas assinou | Que a totalização rejeitaria uma urna estranha: não há caso para testar |
| Diário original no RED com votos = BU (65 de 66) | O pacote é coerente | Que o diário veio da urna original; ele não tem assinatura própria |
| 85 carteiras em outra seção, todas com carga nova e registradas | Toda mudança de seção passou por uma carga nova registrada | Que a recarga foi legítima (por que, por quem) |
| 0 comparecimento acima dos aptos; 0 seção fora dos locais e do resultado | Não há seção fantasma nos critérios das listas do TSE | Que uma seção criada no próprio cadastro do TSE não existe fisicamente; isso pede vistoria ou lista externa (endereço, mesários) |

## Limites

- **As listas são do TSE.** CESP e CEFT são independentes do pacote, mas não do TSE. Quem altera a totalização e as listas no próprio TSE não deixa rastro nestes arquivos. É o mesmo limite do doc 07, sobre a AC.
- **Atacante com acesso à carga ou à transmissão do cartório.** Uma urna recarregada gera correspondência válida. Nos arquivos públicos, a troca de urna com recarga e transmissão tardia (45 seções) é indistinguível de um registro feito para cobrir um pacote substituído.
- **Código de carga público no 2º turno.** Em 494.382 das 499.176 seções com urna nos dois turnos, o código de carga do BU do 2º turno é o mesmo do 1º, publicado três semanas antes. Saber o código não é barreira no 2º turno.
- **RED.** A ligação entre o pacote e a urna original é só o conteúdo (urna, carga, diário) dentro de um pacote assinado por outra chave. Não há assinatura da urna original.
- **Assinatura de software (CEPESC) e cadeia da AC:** como no doc 04 e no doc 07. Uma urna com software alterado **e** assinado com a chave verdadeira escreve diário e pacote normais.
- **Seção fantasma "por dentro":** uma seção criada no cadastro, com local, eleitorado e urna registrados, passa em todos os testes da seção 4. Só uma lista de fora do TSE (endereço vistoriado, mesários convocados, ata) a separaria.
- **Fusos:** a conversão da hora local do CEFT para a de Brasília usa a diferença medida em cada município, nas seções sem troca. Um erro de 1 h só inverteria a ordem do item 1.5 em seção com intervalo menor que 60 minutos: são 12 no 1º turno e 27 no 2º. O menor intervalo é de 2 minutos no 1º turno (AM 02550/0001/0869, Manaus, 1 h de diferença medida no próprio município) e de 5 minutos no 2º.

## Fato, Hipótese, Recomendação, Pendente

- **Fato:**
  - 0 seção com pacote fora do CEFT, 0 CEFT sem pacote e 0 assinante fora das listas do TSE, nos dois turnos;
  - assinante ≠ urna do BU só nos 17 RED, todos por urna de contingência da CESP.
- **Fato:**
  - o par urna × carga do BU estava na CESP da véspera em 498.978 de 499.176 (1º turno) e 498.789 de 499.178 (2º turno);
  - 17 seções (1º turno) e 28 (2º turno) só entraram nos registros pela correspondência recebida no próprio dia, depois da abertura da votação: no 1º turno, das 15:52 às 20:16; no 2º, das 18:46 às 21:07, na hora local;
  - no 2º turno, 4 dessas seções têm urna que não aparece em nenhuma CESP; as demais têm urna recarregada ou trocada.
- **Fato:** em 497.895 e 497.897 de 497.895 e 497.897 seções do Brasil, o BU chegou depois da correspondência efetivada.
- **Fato:** as 86 carteiras em seção diferente no outro turno são 85 urnas recarregadas (carga nova, registrada) e 1 computador do Sistema de Apuração.
- **Fato:**
  - RED: 66 seções; 49 assinadas pela própria urna e 17 por contingência da zona;
  - votos = BU em 65 (a exceção é o ES 0085);
  - 0 assinatura aninhada da urna original.
- **Fato:**
  - 0 seção com comparecimento acima dos aptos;
  - 0 seção fora do cadastro de locais ou do resultado oficial;
  - 389 fora do perfil de julho, todas de preso provisório ou voto em trânsito.
- **Fato:** as seções novas desde 2022 ou 2024 têm comparecimento de 95% ou mais muito mais vezes que as antigas do mesmo tamanho (433 contra 206 no 2º turno, com 10 vezes menos seções), e têm cadastro jovem e com biometria.
- **Hipótese:**
  - a alta nas seções novas vem de cadastro sem eleitores mortos ou mudados (liga à H01);
  - as 45 correspondências recebidas no dia da votação são transmissões atrasadas de urnas recarregadas ou trocadas.
- **Recomendação (LAI):**
  1. Para as 45 seções do item 1.6, pedir:
     - o registro de carga ou recarga (data, máquina, operador);
     - a hora da transmissão da correspondência;
     - a ata da mesa com a troca de urna.
  2. Pedir a regra da totalização: o que ela confere no pacote (carteira, AC, correspondência pela urna do BU ou pelo assinante) e o que faz com BU de urna sem correspondência.
  3. Pedir a explicação das 5 seções de SE e das 2 do MA: esperada ≠ efetivada sem divergência.
  4. Pedir a lista de urnas certificadas e recarregadas entre os turnos.
- **Pendente:**
  - teste de linha de base das seções novas com dados de 2022 (comparecimento por seção em 2022);
  - conferência, no diário bruto, da hora da carga e da primeira votação nas 4 urnas fora de todas as CESP;
  - leitura, no bruto, dos 2 casos do MG (carga em 13/10).

## Reproduzir

```
node scripts/auditoria/seguranca-h27-baixar.mjs
node --max-old-space-size=6000 scripts/auditoria/seguranca-h27-correspondencias.mjs --turno 1
node --max-old-space-size=6000 scripts/auditoria/seguranca-h27-correspondencias.mjs --turno 2
node --max-old-space-size=6000 scripts/auditoria/seguranca-h27-carteiras.mjs
node scripts/auditoria/seguranca-h27-red-estrutura.mjs
node --max-old-space-size=6000 scripts/auditoria/seguranca-h27-fantasmas.mjs
```

Entradas:
- `data/parsed/auditoria/seguranca-h25/{1t,2t}-padrao-dirs.jsonl` (doc 08);
- a cópia de leitura do banco;
- `data/parsed/auditoria/biometria/cadastro-secao.jsonl`;
- `data/parsed/auditoria/integridade/{1t-identificadores,2t}/casos-especiais.json`;
- os zips dos dados abertos.

Saídas em `data/parsed/auditoria/seguranca-h27/`:
- `correspondencias-{1t,2t}.json`: contagens e casos dos itens 1.1 a 1.7. As chaves dos casos são `parForaDaCespVespera` (com hora da correspondência, do BU e da totalização), `trocaSemDivergencia`, `assinanteForaEspEf` e `csecMudouEntreVersoes`;
- `carteiras.json`: medida 1, teste 2 (`teste2`, `carteirasEmSecaoDiferente`) e teste 3 (`red`);
- `red-estrutura.json`: arquivos de cada pacote RED e o que há dentro do `log.jez`;
- `fantasmas.json`: teste 4.

Lista de arquivos baixados, com URL e SHA-256: [09-h27-arquivos-baixados.csv](09-h27-arquivos-baixados.csv).
