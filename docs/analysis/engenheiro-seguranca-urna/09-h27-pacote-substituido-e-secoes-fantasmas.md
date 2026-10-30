# 09. H27: pacote assinado por outra urna e seções fantasmas

Perfil `engenheiro-seguranca-urna`, hipótese H27 ([hipoteses.md](../../hipoteses.md)), pedido do André em 30/10/2026. Continua o [doc 07](07-h25-certificados.md), o [doc 08](08-h25-certificados-fora-do-padrao.md) e o [parecer 35](../cetico-revisor/35-h25-certificados-fora-do-padrao.md). Universo completo: 499.207 pacotes por turno, os dois turnos.

Revisado no [parecer 38](../cetico-revisor/38-h27-pacote-substituido.md): nenhum achado aponta pacote trocado nem seção fantasma. As correções pedidas estão aplicadas neste texto:
- o teste "assinante nas listas" agora é feito só contra a CESP;
- entrou o casamento estrito urna × carga × seção;
- as 45 seções foram reescritas: a correspondência chegou junto com o pacote;
- as 5 seções de SE ficaram explicadas pelo Teste de Integridade;
- o alcance da falta de assinatura no RED foi limitado aos 17 casos feitos em outra urna;
- o efeito das seções novas foi reduzido pelo tamanho e pelo perfil;
- o código de carga foi tratado como identificador;
- entraram novas perguntas de LAI.

Os números que vêm só dos scripts do parecer estão marcados "(parecer 38)".

> **Termos.**
> - **Carteira** é o certificado da urna: diz "esta chave é da urna nº X". A urna assina o pacote da seção com a chave dela.
> - **Carga** é a preparação da urna para uma seção: o cartão de carga grava o programa e o eleitorado da seção, e a urna recebe um **código de carga** de 24 dígitos, único. Esse código vai no boletim (BU).
> - **Correspondência** é o registro "urna nº X, com o código de carga Y, é da seção Z". O cartório transmite esse registro ao TSE depois da carga. O TSE publica duas listas nos dados abertos:
>   - **CESP** (esperadas): a urna de cada seção e as urnas de reserva (contingência) de cada zona, com o código de carga. Há duas versões por turno: uma da véspera e uma da manhã do dia da votação.
>   - **CEFT** (efetivadas): publicada depois da votação. Para cada seção, a urna esperada, a urna que de fato gerou os votos, as datas em que o TSE recebeu cada correspondência e o tipo de divergência (C = contingência, D = divergência, O = anulada).
> - **RED** (Recuperador de Dados): programa que gera o BU no cartório a partir da mídia de votação de uma urna que não conseguiu gerá-lo. O pacote sai assinado pela urna onde o RED rodou.
> - **Lista de fora do pacote:** o pacote diz quem assinou, qual urna e qual carga. Conferir essas três coisas entre si é circular (parecer 35), porque tudo vem do mesmo pacote assinado. As correspondências vêm de outro caminho (a carga, transmitida pelo cartório) e, na CESP da véspera, de **antes** da votação.

## Resposta curta

1. **Fato: nenhuma seção com pacote ficou fora do CEFT, e todo pacote foi assinado pela urna do próprio BU ou, nos 17 RED, por uma contingência da CESP.**
   - As 499.207 seções com pacote estão no CEFT nos dois turnos, e o CEFT não tem seção sem pacote.
   - A urna e a carga do BU são as **efetivadas** do CEFT em 100% das seções dos dois turnos. O CEFT **copia a urna do BU**. Por isso, contar o CEFT como "lista" torna o teste do assinante circular, e "0 assinante fora das listas" só vale com essa ressalva.
   - **Contra a CESP**, que é a lista anterior e independente do pacote:
     - 10 assinantes no 1º turno e 22 no 2º não estão em nenhuma CESP do turno;
     - no 2º turno, 11 urnas não aparecem em nenhuma das 4 CESP dos dois turnos: as 4 do item 1.6 (grupo D), as 2 de MG (41238/0331/0001 e /0197) e as 5 de SE (item 1.4);
     - **todas são a própria urna do BU.** Nenhuma assinou mais de uma seção nem assinou pacote declarando outra urna. Não há assinante "estranho" no sentido do ataque A;
     - as 10 do 1º turno aparecem depois na CESP do 2º.
   - Nos 17 pacotes assinados por uma urna diferente da urna do BU (14 no 1º turno, 3 no 2º; todos RED), a urna que assinou estava na CESP como **urna de contingência**: 16 da mesma zona e 1 de outra zona (Aracaju, zona 2 para uma seção da zona 1).
2. **Fato: o par urna × carga do BU estava na lista publicada na véspera em 99,96% (1º turno) e 99,92% (2º turno) das seções votadas em urna, casando só urna e carga.**
   - No casamento estrito (o par na linha da própria seção, ou como contingência da própria zona), os números caem para **498.934 (99,95%)** e **498.687 (99,90%)**.
   - A diferença são 44 e 98 reservas que usaram carga de contingência registrada para outra zona. Delas, 8 e 21 são de outro município (parecer 38).

   | Onde o par urna × carga do BU aparece pela primeira vez | 1º turno | 2º turno |
   |---|---:|---:|
   | CESP da véspera (03/10 15:34; 24/10 12:31) | 498.978 | 498.789 |
   | só na CESP do dia (04/10 12:59; 25/10 13:45) | 181 | 341 |
   | só no CEFT, correspondência recebida **antes** do dia da votação | 0 | 20 |
   | só no CEFT, correspondência recebida **no dia** da votação | 17 | 28 |
   | Total de pacotes de urna (sem o Sistema de Apuração) | 499.176 | 499.178 |

3. **Fato: em todas as seções do Brasil, o TSE recebeu a correspondência da urna que votou antes de receber o BU dela.** São 497.895 seções no 1º turno e 497.897 no 2º; o exterior ficou fora, porque os fusos variam.
   - Nas 28 seções do 2º turno e nas 17 do 1º do item 2, a correspondência chegou **no dia da votação, depois de a votação abrir**. No 2º turno, chegou **junto com o pacote**: em 25 das 28, no mesmo segundo ou até 3 s antes da chegada dele (parecer 38). Os "2 a 169 minutos" são a demora até o TSE **aceitar** o BU, não um registro anterior.
   - Nessas 45 seções, a exigência de correspondência foi satisfeita por um registro feito no momento da chegada do pacote. A lista de fora do pacote não serve ali de prova anterior. Estão listadas no item 1.6.
   - **É rotina, não desta eleição:** correspondência efetivada recebida no dia da votação houve em 194 seções em 2022 e em 82 em 2024. Nas 45 de 2026, a urna foi preparada dias antes e abriu às 8 h, e os votos não destoam (parecer 38).
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
   - **Nos 17 RED feitos em outra urna (4.090 votos nos dois turnos), o diário da urna original só é coberto pela chave da urna que fez o RED.** Ali, a conferência "diário = BU" é coerência interna do pacote.
   - Nos outros 49, o RED rodou na própria urna da seção, e o pacote leva a assinatura dela.
   - Isso decorre do desenho do RED, não desta eleição: a única chave disponível para lacrar o pacote é a da urna onde o RED roda.
6. **Fato: não há seção fantasma pelos critérios testados.**
   - Toda seção com pacote existe no cadastro de locais de votação como seção principal e ativa, e está no resultado oficial por seção.
   - O comparecimento passa dos aptos em 0 seções nos dois turnos, tanto nos aptos oficiais quanto nos do BU.
   - 389 seções não estão no perfil do eleitorado de julho. São 243 de preso provisório e 146 de voto em trânsito, todas formadas por eleitores transferidos temporariamente depois do fechamento do cadastro.
7. **Fato: as seções criadas depois de 2022 ou 2024 têm comparecimento de 95% ou mais com mais frequência que as antigas. O tamanho e o perfil do cadastro explicam a maior parte da diferença.**
   - No 2º turno são 433 seções novas nessa faixa. Entre as antigas, só 206 de 458.438 estão nela: a razão bruta é de 23,7 vezes.
   - Nos estratos comparáveis (tamanho, sem biometria, 80 anos ou mais, parcela TTE), a razão cai para **1,9 vez** (201 observadas contra 106,6 esperadas). As outras 232 ficam em estratos quase sem seção antiga para comparar (parecer 38).
   - O local de votação e o município não explicam a diferença.
   - O cadastro dessas seções é de eleitorado recente:
     - 23% têm de 16 a 20 anos (nas antigas, 4,3%);
     - 0,3% não têm biometria (nas antigas, 11%);
     - 0,7% têm 80 anos ou mais (nas antigas, 3,6%).
   - **Juízo:** é efeito de cadastro (seção nova, pequena, com eleitorado recente), não anomalia de processo. A comparação com as mesmas seções em 2022 fica **Pendente**.
8. **Limite.** As listas do TSE excluem o atacante que só tem uma urna com carteira válida. Não excluem quem também consegue registrar correspondência no TSE (carga ou transmissão), nem quem altera as listas no próprio TSE.
   - A urna "efetivada" do CEFT é a urna do BU em 100% das seções, inclusive nos RED. A lista registra a urna que o BU declara, não a urna que assinou.
   - O código de carga é **identificador, não senha**. Ele sai no BU e já aparece na CESP do 1º turno. Em 494.382 seções, o do 2º turno é o mesmo do 1º; em todas elas a urna também é a mesma, e há 0 seção com a mesma carga e outra urna.
   - Saber o código não ajuda nem atrapalha um atacante. A barreira contra pacote falso é a **chave da urna** (a assinatura), somada ao casamento urna × carga × seção no TSE.

## O ataque, visto pelo atacante

| Variante | O que o atacante precisa ter | Rastro esperado nos arquivos públicos | Procurado | Resultado |
|---|---|---|---|---|
| A. Cartão de resultado adulterado e assinado por uma urna "que só assina" | A chave de uma urna com carteira válida (urna alterada, de reserva ou de RED) e acesso ao cartão no caminho até a transmissão | Carteira em 2 seções; assinante fora das listas; assinante ≠ urna esperada/efetivada; diário da urna original ausente ou com votos ≠ BU | Itens 1.3, 2, 3 | Assinante = urna do BU, ou contingência da CESP nos 17 RED; contra a CESP, 10 e 22 assinantes fora da CESP do turno, todos a própria urna do BU; diário presente nos 66 RED e com votos = BU em 65 (a exceção é o ES 0085, já explicado) |
| B. Mesmo ataque, copiando a urna e a carga da seção para o BU (o BU declara a urna original) | Variante A, mais o número da urna e o código de carga da seção. Esses números são públicos (BU e CESP); a barreira é a chave da urna | Só o assinante ≠ urna do BU. No CEFT fica a urna do BU, e não aparece divergência | Item 1.3 | São os 17 RED. Fora deles, assinante = urna do BU em 100% |
| C. Urna inteira trocada por outra com carga própria (pacote "legítimo" de urna não prevista) | Uma urna com carteira válida, recarregada para a seção, e a correspondência registrada no TSE | Par urna × carga fora da CESP da véspera; correspondência recebida tarde; esperada ≠ efetivada sem divergência C | Itens 1.4 a 1.6 | 389 (2º turno) e 198 (1º turno) fora da véspera; 28 e 17 com correspondência recebida no dia, junto com o pacote. É rotina (194 em 2022, 82 em 2024): a urna foi preparada dias antes e abriu às 8 h, e os votos não destoam (lista no item 1.6) |
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
| Assinante fora da CESP e do CEFT | 0 | 0 |
| Assinante fora das faixas públicas de número por modelo | 0 | 0 |

A linha "fora da CESP e do CEFT" é circular: o CEFT copia a urna do BU, e o assinante é a urna do BU em quase todos os pacotes. **Só contra a CESP**, a lista anterior e independente do pacote (pacotes de urna, sem o Sistema de Apuração):

| Assinante | 1º turno | 2º turno |
|---|---:|---:|
| = urna do BU, esperada da própria seção | 496.132 | 496.491 |
| = urna do BU, contingência da própria zona | 2.974 | 2.561 |
| = urna do BU, contingência de outra zona | 46 | 101 |
| = urna do BU, **fora de toda CESP do turno** | **10** | **22** |
| dessas, fora das 4 CESP dos dois turnos | 0 | 11 |
| ≠ urna do BU (RED), contingência da própria zona / de outra zona | 13 / 1 | 3 / 0 |

- **Fato:** as 11 urnas do 2º turno fora de todas as CESP são:
  - BA 33774/0071/0150, BA 39144/0071/0170, PA 05355/0104/0093 e SE 31054/0002/0524 (item 1.6, grupo D);
  - MG 41238/0331/0001 e /0197;
  - as 5 de SE do item 1.4.
- As outras 11 do 2º turno estão só na CESP do 1º turno: MA 2, MT 1, PA 1, SE 5 da troca de Aracaju e SP 2.
- As 10 do 1º turno aparecem na CESP do 2º.
- **Fato:** todas são a própria urna do BU. Nenhuma assinou mais de uma seção. Os números conferem com os do parecer 38.

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

A tabela acima casa o par urna × carga em **qualquer** lugar da CESP. No casamento estrito, o par tem de estar na linha da própria seção ou como contingência da própria zona:

| Onde o par aparece (estrito) | 1º turno | 2º turno |
|---|---:|---:|
| CESP da véspera, própria seção ou própria zona | **498.934 (99,95%)** | **498.687 (99,90%)** |
| só na CESP do dia, própria seção ou própria zona | 179 | 345 |
| na CESP da véspera, mas como contingência de outra zona | 44 | 98 |
| na CESP do dia, mas como contingência de outra zona | 2 | 0 |
| só no CEFT, recebida antes do dia | 0 | 20 |
| só no CEFT, recebida no dia | 17 | 28 |

- **Fato:** as reservas com contingência de outra zona são, na maioria, do mesmo município: 36 de 44 e 77 de 98 (Rio de Janeiro, Manaus, Goiânia, Brasília, Aracaju). As outras 8 e 21 vêm de outro município (parecer 38).
- **Hipótese:** estoque de reserva do TRE ou do cartório-sede. O arquivo não diz por que a carga de contingência de uma zona serve em outra.
- **Fato:** a CESP **não é exaustiva**. Ela lista uma urna por seção e as contingências. Correspondências registradas e depois substituídas, ou registradas e não incluídas, ficam de fora (exemplos: MG 41238/0331, SE e MA abaixo). "Fora da CESP" não quer dizer "não registrado antes".

- **Fato:** das 341 seções do 2º turno que aparecem só na CESP do dia:
  - 334 tiveram a correspondência recebida antes de 25/10;
  - 7 a tiveram recebida na manhã de 25/10, entre 05:39 e 11:40 (hora local), antes da geração da CESP do dia (13:45). Essas 7 são urnas trocadas antes de a votação abrir ou no começo dela;
  - em 322 delas, a CESP do dia põe a urna que votou no lugar da urna esperada na véspera. É urna substituída depois da CESP da véspera.
- No 1º turno, das 181: 172 foram recebidas antes de 04/10 e 9 na manhã de 04/10, entre 06:11 e 11:11. Em 150, a urna esperada muda para a que votou.
- **Fato:** nas 20 seções do 2º turno "só no CEFT, antes do dia", o par foi recebido antes da votação, mas não aparece em nenhuma das duas CESP. Há quatro grupos:
  - **11 (AC 1, AP 9, MT 1):** uma urna de contingência da própria zona foi recarregada como urna de seção na manhã de 24/10. A correspondência foi recebida em 24/10, entre 10:21 e 15:58. A CESP continua listando essa urna como contingência, com a carga antiga.
  - **5 (SE: 31690/0012/0087, 32476/0023/0118, 31712/0013/0082, 32514/0035/0057, 31755/0005/0143). Explicado (parecer 38): é rastro do Teste de Integridade do 1º turno.**
    - No 2º turno votou a urna da carga original de setembro, com correspondência recebida em setembro.
    - O diário dessa urna traz, em 04/10, um dia inteiro de votação da **mesma seção**, quase sem digital (0 a 2 liberações por digital), encerrado depois das 17 h. Essa votação não virou resultado.
    - O resultado oficial do 1º turno veio de outra urna, carregada em 03/10 (véspera), com eleitores liberados por digital.
    - É o que acontece com a urna sorteada para o Teste de Integridade: sai da seção na véspera, recebe votos de cédula digitados sem digital e, no 2º turno, volta com a carga original, que vale para os dois turnos. A CESP do 2º turno continuou listando a substituta do 1º turno.
    - O rastro é técnico (diário assinado). Falta a lista de sorteio do TRE-SE para fechar como Fato.
  - **2 (MA 09210/0001/0124 e /0125). Lista desatualizada:**
    - a mesma urna, com carga de 28/09 registrada antes das duas votações, votou nos dois turnos com eleitores liberados por digital;
    - em 03/10 outras urnas foram carregadas para essas seções. A correspondência delas chegou em 14/10, e elas viraram as "esperadas" do 2º turno, mas nunca votaram;
    - o furo está na lista, não no pacote.
  - **2 (MG 41238/0331/0001 e /0197):** carga em 13/10 e correspondência recebida em 13/10. A CESP de 24/10 ainda lista a urna do 1º turno, e a nova não aparece em nenhuma CESP de nenhum turno.
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
- **Ressalva:** nas 45 seções do item 1.6, essa exigência foi satisfeita por um registro feito **no momento da chegada do pacote**, e não antes.
- **O que não permite afirmar:** que a totalização confere a carteira. O registro é da urna **do BU**, não da urna que assinou (item 1.2).

### 1.6 As 45 seções em que a correspondência chegou no dia da votação

**Quando a correspondência chegou (2º turno; parecer 38, com o arquivo aux de chegada do pacote).** Os "minutos até o BU" do script deste doc medem a demora até o TSE **aceitar** o BU, e não um registro anterior ao pacote:
- em 16 das 28, a correspondência chegou no mesmo segundo do pacote (±1 s);
- em 9, chegou 2 ou 3 s antes do pacote;
- em 2, chegou 6,6 min antes (PA 05355/0104/0279) e 22 min antes (PA 04332/0013/0428);
- em 1 (PA 04278/0030/0295), o aux registra outra chegada, em 28/10.

Em 25 das 28, portanto, **a correspondência chegou junto com o pacote**. O BU foi aceito de 5 a 63 minutos depois. No 1º turno não há aux, e a ordem correspondência → BU (2 a 169 min) não se separa da chegada do pacote.

**É rotina do processo.** Seções com correspondência efetivada recebida no dia da votação (CEFT do 1º turno de cada eleição, Brasil, sem o Sistema de Apuração; parecer 38):

| Eleição | Seções | às 17 h ou depois (hora local) |
|---|---:|---:|
| 2022 | 194 | 80 |
| 2024 (sem DF) | 82 | 51 |
| 2026, 1º turno | 26 | 14 |
| 2026, 2º turno | 35 | 28 |

**2º turno (28), por grupo (parecer 38).** Em todas, a urna foi preparada antes do dia, abriu no início da votação (07:00 a 08:05) e registrou o primeiro voto em poucos minutos. Nenhuma foi trocada no meio do dia.

| Grupo | Seções | Carga | Correspondência → BU aceito |
|---|---|---|---|
| A. Urna de contingência recarregada como urna de seção. Na CESP com outra carga: da própria zona em 9; de outra zona do mesmo município em 2 (BA, zona 18); de outro município da mesma zona em 2 (MT 91553 e SP 70378). O PA 04278/0030/0295 só aparece como contingência no 1º turno | BA 38490/0008/0432 e /0606; MA 07536/0026/0088; MT 91553/0038/0113; PA 04278/0030/0295, 04278/0098/0273, 04278/0076/0475, 05630/0008/0325, 05355/0104/0279; PR 77399/0124/0085; RO 00051/0030/0123; SP 70378/0115/0155 (12) | 14/10 a 24/10 (9 em 24/10) | 5 a 63 min |
| B. A própria urna da seção, recarregada (mesma carteira nos dois turnos, carga nova) | PA 04154/0107/0161, /0278, /0296, /0341; PA 04332/0013/0428 (5) | 15 e 16/10 | 5 a 30 min |
| C. Urna de seção de outra seção no 1º turno, recarregada como contingência | SE 31054/0002/0060 (era da 0001/0317), /0087 (era da 0002/0524), /0345 (era da 0001/0265), /0535 (era da 0002/1045), /0551 (era da 0002/0630): a troca entre as zonas 1 e 2 de Aracaju, já vista na H14. SP 69213/0317/0270 (era da 0317/0369) e /0294 (era da 0317/0370) (7) | 15 e 19/10 | 7 a 28 min |
| D. **Urna que não aparece em nenhuma CESP de nenhum turno** | BA 33774/0071/0150 e BA 39144/0071/0170 (carga de seção em 21/10); PA 05355/0104/0093 (carregada como contingência em 03/10, passou a urna da seção em 20/10); SE 31054/0002/0524 (contingência carregada em 19/10, procedimento de contingência em 24/10) (4) | 03/10 a 21/10 | 11 a 35 min |

**1º turno (17), por grupo (parecer 38):**
- **Urna carregada em 03/10, na véspera, no lugar da esperada (10):**
  - AM 02550/0001/0778 e /0869; CE 14672/0026/0030;
  - PA 04030/0094/0117, 04278/0029/0578, 04278/0030/0260, 04278/0098/0020, 04570/0009/0074, 05312/0004/0450;
  - SP 71072/0373/0044.
- **Urna carregada em setembro, mas a CESP esperava outra (6):**
  - MG 41475/0045/0043, 48658/0184/0358, 48917/0192/0042;
  - PA 04626/0068/0161; PR 79316/0086/0191; SP 65692/0058/0166.
- **Recarga na manhã da votação (1):** MG 48852/0190/0107. A contingência foi recarregada às 07:51 e abriu às 08:07; a correspondência chegou às 15:52.
- A correspondência chegou em 04/10 entre 15:52 e 20:16 (hora local). Em 16 das 17, a mesma urna e a mesma carga votaram no 2º turno e já estavam na CESP da véspera do 2º turno.

**Fatos:**
- Nas 45, o diário do pacote traz a carga com o mesmo código do BU (`logTemCargaDoBU`, script deste doc).
- Nas 4 do grupo D, há rastro técnico da preparação no diário, dias antes da votação: carga de seção, ou carga de contingência seguida do procedimento que a converte em urna da seção. A urna esperada pela CESP era a do 1º turno.
- Nas 2 da BA, a urna do 1º turno encerrou às 21:14 e às 20:47 de 04/10, mais de 3 h depois do fim da votação (parecer 38).
- **Os votos não destoam.** Das 45, 41 têm seções do mesmo local para comparar, e nenhuma passa do percentil 99 em nenhuma de 5 medidas: parcela do 13, comparecimento e virada entre os turnos. As 4 sem local comparável não destoam do próprio 1º turno; a BA 33774/0071/0150 é reduto, com 95% do 13 nos dois turnos (parecer 38).

**O que os arquivos não explicam:**
- por que as urnas do 1º turno foram trocadas;
- de onde vieram as 2 urnas da BA zona 71, que não aparecem como reserva em nenhuma lista;
- por que a correspondência de uma carga feita de 4 a 22 dias antes só chegou com o pacote.

**Hipóteses:**
- **Transmissão:** o transmissor do cartório manda a correspondência pendente e, logo depois, o pacote. Outra possibilidade compatível com os arquivos: a totalização cria o registro a partir do próprio BU. Nas duas, o pacote ficou parado até haver correspondência, e não havia registro anterior a ele.
- **Cargas de véspera (03/10 e 24/10):** podem ser a troca de urna do Teste de Integridade. Isso é só suposto: não há lista de sorteio no disco.

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
- **Fato (alcance):**
  - nos **17** RED feitos em outra urna (14 + 3; 4.090 votos), o diário da urna original fica coberto só pela assinatura da urna que fez o RED;
  - nos outros **49**, o RED rodou na própria urna da seção, e o pacote leva a assinatura dela, com um só diário (exemplo: ES 56170/0023/0137, 2º turno).
- **Fato:** em nenhum pacote, normal ou RED, o diário tem assinatura separada. Ele é coberto pela assinatura do pacote inteiro.
- **Do desenho, não desta eleição:** o RED existe porque a urna original não conseguiu gerar o resultado. A única chave disponível para lacrar o pacote é a da urna onde o RED roda.
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

- **Fato (parecer 38): o tamanho e o perfil explicam a maior parte da diferença.** A razão bruta (2º turno) é de 23,7 vezes. Foi feita uma padronização por tamanho, % sem biometria, % com 80 anos ou mais e parcela TTE, nos estratos com 30 ou mais seções antigas:
  - nos estratos comparáveis: 201 observadas contra 106,6 esperadas, ou **1,9 vez**;
  - as outras 232 estão em estratos quase sem seção antiga (seções pequenas, com biometria completa e sem idosos), sem base para comparar;
  - 101 das 433 são "novas" só pela chave (renumeração de zona);
  - 229 das 433 também passam de 95% no 1º turno (nas antigas, 58 de 206).
- **Juízo:** é efeito de cadastro, não anomalia de processo. Seção nova, pequena, com eleitorado alistado ou transferido há pouco e com biometria, não acumula título de quem morreu ou se mudou sem transferir. Por isso o teto de comparecimento é mais alto. O mesmo mecanismo liga o achado à H01. Nada nos pacotes dessas seções aponta troca.
- **Ressalva (parecer 38), que vai para a H07:**
  - nas novas com 95% ou mais e sem eleitor TTE, 7,83% dos votantes foram liberados sem digital, embora só 0,40% do cadastro delas não tenha biometria;
  - nas antigas com 95% ou mais, a proporção é de 13,22% contra 4,66%.
  - Seção com comparecimento muito alto tem mais liberação sem digital do que o cadastro sem biometria explica. Esse é o caminho que não exige a presença do eleitor. O perfil, portanto, não "contraria" a hipótese de votos liberados pelo mesário. Não é prova de nada.
- **Pendente:** comparar com o comparecimento das mesmas seções (ou dos mesmos locais) em 2022. Exige o comparecimento por seção de 2022, que não está no disco.

## O que cada resultado permite e não permite afirmar

| Resultado | Permite afirmar | Não permite afirmar |
|---|---|---|
| Urna e carga do BU = efetivada (100%) | O TSE registrou, para cada seção, a urna que o BU declara | Que essa urna votou; o CEFT sai do BU |
| Par urna × carga na CESP da véspera (99,96% e 99,92%; estrito 99,95% e 99,90%) | Nessas seções, a urna e a carga do BU foram registradas no TSE antes da votação, por outro caminho | Que a urna que gravou o cartão era essa; que o software dela era o oficial |
| Correspondência antes do BU (100% no Brasil) | A totalização se comporta como se exigisse correspondência registrada | Que confere a carteira do assinante; nas 45 seções do item 1.6, o registro nasceu junto com o pacote |
| Assinante = urna do BU, ou contingência da CESP nos 17 RED; 10 e 22 assinantes fora da CESP do turno, todos a própria urna do BU | Nenhuma urna "estranha" assinou o pacote de outra urna | Que toda urna que assinou estava registrada antes (11 do 2º turno só entraram pelo CEFT); que a totalização rejeitaria uma urna estranha (não há caso para testar) |
| Diário original no RED com votos = BU (65 de 66) | O pacote é coerente | Nos 17 RED feitos em outra urna, que o diário veio da urna original: ele não tem assinatura própria |
| 85 carteiras em outra seção, todas com carga nova e registradas | Toda mudança de seção passou por uma carga nova registrada | Que a recarga foi legítima (por que, por quem) |
| 0 comparecimento acima dos aptos; 0 seção fora dos locais e do resultado | Não há seção fantasma nos critérios das listas do TSE | Que uma seção criada no próprio cadastro do TSE não existe fisicamente; isso pede vistoria ou lista externa (endereço, mesários) |

## Limites

- **As listas são do TSE.** CESP e CEFT são independentes do pacote, mas não do TSE. Quem altera a totalização e as listas no próprio TSE não deixa rastro nestes arquivos. É o mesmo limite do doc 07, sobre a AC.
- **Atacante com acesso à carga ou à transmissão do cartório.**
  - Uma urna recarregada gera correspondência válida.
  - Nas 45 seções do item 1.6, a correspondência chegou junto com o pacote. Nos arquivos públicos, uma troca de urna com recarga e transmissão tardia é indistinguível de um registro feito para cobrir um pacote substituído.
  - O que pesa contra essa segunda leitura nessas 45:
    - o diário traz a preparação feita dias antes;
    - a abertura foi às 8 h;
    - os votos não destoam;
    - o mesmo padrão aparece em 2022 e 2024.
- **Código de carga.** É identificador, não senha: sai no BU e na CESP. Em 494.382 das 499.176 seções, o do 2º turno é o mesmo do 1º, sempre com a mesma urna. A barreira contra pacote falso é a chave da urna, não o código.
- **RED feito em outra urna (17 seções, 4.090 votos).** A ligação entre o pacote e a urna original é só o conteúdo (urna, carga, diário) dentro de um pacote assinado por outra chave. Isso é do desenho do RED. Nos 49 RED feitos na própria urna, a assinatura é dela.
- **Assinatura de software (CEPESC) e cadeia da AC:** como no doc 04 e no doc 07. Uma urna com software alterado **e** assinado com a chave verdadeira escreve diário e pacote normais.
- **Seção fantasma "por dentro":** uma seção criada no cadastro, com local, eleitorado e urna registrados, passa em todos os testes da seção 4. Só uma lista de fora do TSE (endereço vistoriado, mesários convocados, ata) a separaria.
- **Fusos:** a conversão da hora local do CEFT para a de Brasília usa a diferença medida em cada município, nas seções sem troca. Um erro de 1 h só inverteria a ordem do item 1.5 em seção com intervalo menor que 60 minutos: são 12 no 1º turno e 27 no 2º. O menor intervalo é de 2 minutos no 1º turno (AM 02550/0001/0869, Manaus, 1 h de diferença medida no próprio município) e de 5 minutos no 2º.

## Fato, Hipótese, Recomendação, Pendente

- **Fato:**
  - 0 seção com pacote fora do CEFT e 0 CEFT sem pacote, nos dois turnos;
  - todo assinante é a urna do BU ou, nos 17 RED, uma contingência da CESP;
  - "0 assinante fora das listas" só vale contando o CEFT, que copia a urna do BU;
  - contra a CESP, 10 assinantes (1º turno) e 22 (2º) estão fora da CESP do turno, todos a própria urna do BU;
  - 11 urnas do 2º turno não estão em nenhuma das 4 CESP.
- **Fato:**
  - o par urna × carga do BU estava na CESP da véspera em 498.978 de 499.176 (1º turno) e 498.789 de 499.178 (2º turno);
  - no casamento estrito (própria seção ou própria zona), em 498.934 e 498.687;
  - 17 seções (1º turno) e 28 (2º turno) só entraram nos registros pela correspondência recebida no próprio dia, depois da abertura da votação. No 2º turno, em 25 das 28, ela chegou junto com o pacote (parecer 38).
- **Fato:** em 497.895 e 497.897 de 497.895 e 497.897 seções do Brasil, o BU chegou depois da correspondência efetivada. Nas 45, a correspondência nasceu com o pacote.
- **Fato:**
  - o registro da correspondência só no dia da votação é rotina: 194 seções em 2022 e 82 em 2024;
  - nas 45 de 2026, a urna foi preparada dias antes, abriu às 8 h e não tem votos fora do padrão (parecer 38).
- **Fato (SE, refutado como anomalia):** as 5 urnas de SE fora de toda CESP trazem no diário, em 04/10, uma votação da mesma seção quase sem digital, que não virou resultado. É o rastro do Teste de Integridade do 1º turno. Falta a lista de sorteio do TRE-SE.
- **Fato (MA):** lista desatualizada. A urna registrada antes votou nos dois turnos, e a "esperada" do 2º turno nunca votou.
- **Fato:** as 86 carteiras em seção diferente no outro turno são 85 urnas recarregadas (carga nova, registrada) e 1 computador do Sistema de Apuração.
- **Fato:**
  - RED: 66 seções; 49 assinadas pela própria urna e 17 por contingência da zona;
  - votos = BU em 65 (a exceção é o ES 0085);
  - nos 17 feitos em outra urna (4.090 votos), o diário original só é coberto pela chave da urna do RED. Isso é do desenho do RED.
- **Fato:**
  - 0 seção com comparecimento acima dos aptos;
  - 0 seção fora do cadastro de locais ou do resultado oficial;
  - 389 fora do perfil de julho, todas de preso provisório ou voto em trânsito.
- **Fato:**
  - as seções novas desde 2022 ou 2024 têm comparecimento de 95% ou mais mais vezes que as antigas (433 contra 206 no 2º turno; razão bruta de 23,7 vezes);
  - tamanho e perfil do cadastro reduzem a razão para 1,9 vez nos estratos comparáveis (parecer 38). É efeito de cadastro.
- **Hipótese:**
  - o restante da alta nas seções novas vem de cadastro sem eleitores mortos ou mudados (liga à H01);
  - nas 45 seções do item 1.6, ou o cartório transmite a correspondência pendente logo antes do pacote, ou a totalização cria o registro a partir do BU;
  - as cargas de véspera das 45 são trocas do Teste de Integridade (só suposta).
- **Recomendação (para a H07):** testar se o excesso de liberação sem digital nas seções com 95% ou mais está nos eleitores com biometria cadastrada (parecer 38).
- **Recomendação (LAI):**
  1. Para as 45 seções do item 1.6, pedir:
     - o registro de carga ou recarga (data, máquina, operador);
     - a hora da transmissão da correspondência;
     - a ata da mesa com a troca de urna.
  2. Pedir a regra da totalização:
     - o que ela confere no pacote: carteira, AC, e correspondência pela urna do BU ou pelo assinante;
     - **o que acontece com um pacote que chega sem correspondência** (fica parado, é rejeitado ou gera o registro) e quem o libera.
  3. Pedir **a origem das 2 urnas da BA zona 71** (33774/0071/0150 e 39144/0071/0170), que não constam como reserva em lista nenhuma.
  4. Perguntar **por que a CESP da véspera do 2º turno não lista correspondências recebidas 11 dias antes** (MG 41238/0331/0001 e /0197, carga e correspondência em 13/10). Perguntar também por que a do MA lista como esperadas urnas que nunca votaram.
  5. Pedir **a regra de uso da contingência entre zonas e entre municípios** (44 e 98 reservas com carga de contingência de outra zona; 8 e 21 de outro município).
  6. Pedir as listas de sorteio do Teste de Integridade dos dois turnos, por TRE, para fechar as 5 de SE e testar as cargas de véspera.
  7. Pedir a lista de urnas certificadas e recarregadas entre os turnos.
- **Pendente:**
  - teste de linha de base das seções novas com dados de 2022 (comparecimento por seção em 2022, não está no disco);
  - listas de sorteio do Teste de Integridade (item 6 da LAI).

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
- `correspondencias-{1t,2t}.json`:
  - contagens e casos dos itens 1.1 a 1.7;
  - o assinante só contra a CESP fica em `contagens.assinanteSoContraCesp`, com os casos em `assinanteForaDaCespDoTurno`;
  - o casamento estrito fica em `contagens.parBUEstrito`;
  - as demais chaves dos casos são `parForaDaCespVespera` (com hora da correspondência, do BU e da totalização), `trocaSemDivergencia`, `assinanteForaEspEf` e `csecMudouEntreVersoes`;
- `carteiras.json`: medida 1, teste 2 (`teste2`, `carteirasEmSecaoDiferente`) e teste 3 (`red`);
- `red-estrutura.json`: arquivos de cada pacote RED e o que há dentro do `log.jez`;
- `fantasmas.json`: teste 4.

Lista de arquivos baixados, com URL e SHA-256: [09-h27-arquivos-baixados.csv](09-h27-arquivos-baixados.csv).

Números marcados "(parecer 38)" saem dos scripts `scripts/auditoria/cetico-38-*.mjs` (comandos no [parecer 38](../cetico-revisor/38-h27-pacote-substituido.md)):
- a hora de chegada do pacote (aux);
- a linha de base de 2022 e 2024;
- o diário de cada caso;
- os votos dos casos contra o local;
- a padronização das seções novas;
- as reservas de outra zona por município.
