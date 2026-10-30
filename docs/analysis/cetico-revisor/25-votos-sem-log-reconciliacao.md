# 25. Parecer: votos do BU sem rastro no log, reconciliação das três contagens (H03/H08)

Achados revisados:
- auditor A, [coerencia-contagem/03-coerencia-interna.md](../coerencia-contagem/03-coerencia-interna.md), e o [parecer 08](08-votos-sem-log-contingencia.md): 2º turno, 50 votos em 3 contingências;
- matemático forense, [matematico-forense/02-ciclo-do-eleitor.md](../matematico-forense/02-ciclo-do-eleitor.md): I11 violado em 7 seções no 2º turno e em 10 no 1º, com 152 votos sem rastro no 1º turno. O parecer 20 não existia e foi escrito junto com este: [20-matematico-ciclo-e-votos-sem-rastro.md](20-matematico-ciclo-e-votos-sem-rastro.md);
- engenheiro de segurança, [engenheiro-seguranca-urna/04-versao-e-verificacao-de-assinatura.md](../engenheiro-seguranca-urna/04-versao-e-verificacao-de-assinatura.md) e linha C1b de [01-matriz-ataques.md](../engenheiro-seguranca-urna/01-matriz-ataques.md): 54 votos em 6 seções, 2º turno;
- auditor E, [integridade-nacional/03-seriais-h11.md](../integridade-nacional/03-seriais-h11.md): a urna 2423907 na BA 39934/0183 no 1º turno.

Revisão de 29/10/2026. Banco: cópia de leitura com os dois turnos completos (28 UFs cada).

## Resposta curta

As três contagens não se contradizem. Cada uma mede uma coisa diferente, e as três estão certas dentro da própria definição no 2º turno. A contagem independente deste parecer leu o log de **todos** os pacotes de urna dos dois turnos e chegou a estes números (Fato):

| | 2º turno | 1º turno |
|---|---:|---:|
| Pacotes de urna lidos (todas as seções com arquivo, menos o Sistema de Apuração; 0 sem log, 0 erro de leitura) | 499.178 | 499.176 |
| Comparecimento no BU × votos "computado" da própria seção no log | 128.235.243 × 128.235.189 | 125.274.487 × 125.274.328 |
| **Votos do BU sem a linha "O voto do eleitor foi computado"** no log da própria seção | **54 em 6 seções** | **159 em 9 seções** |
| ... com o ciclo do eleitor no log e a urna caindo antes da última linha | 5 em 4 seções | 7 em 6 seções |
| ... **sem nenhuma linha do eleitor** no log publicado (o log da urna que gravou os votos não está no pacote) | **49 em 2 seções** | **152 em 3 seções** |
| Seções com mais votos no log do que no BU, depois de tirar cópias e logs de outra seção | 0 | 0 |

- O **engenheiro** conta a 1ª linha (54). O **auditor A** e o **matemático** contam 50: os 49 sem nenhuma linha, mais 1 voto da RS 89060/0017/0191 que só tem identificação do eleitor no log.
- No 1º turno, o matemático tem o número certo (152 e 7). O método do engenheiro e o do auditor A, aplicados ao 1º turno, dariam números errados, por defeitos de leitura descritos abaixo.
- **Exclusões, com contagem:**
  - 41 seções do exterior sem arquivo em cada turno;
  - 31 (1º turno) e 29 (2º turno) seções do Sistema de Apuração, que não têm ciclo de eleitor.
- **Conferência com o matemático:** o total de computados dele é igual ao meu mais os votos de log de outra seção que ficaram no pacote: 128.235.189 + 304 (ES 57932/0009/0085, log da 0112) = 128.235.493; e 125.274.328 + 100 (BA 39934/0183/0175, log da 0181) = 125.274.428.

## As três definições

| Quem | Script | O que conta | 2º turno | 1º turno |
|---|---|---|---|---|
| Engenheiro | `seguranca-log-x-bu.mjs` (consulta ao `perfil_log`) | BU − `perfil_log.votos_computados`. O perfil soma todos os `logd.dat` do pacote, sem tirar cópias e sem separar a seção declarada | 54 em 6 seções. **Certo**, porque no 2º turno nenhum excesso do perfil esconde falta | Não rodado. Pelo banco, daria **58 em 8 seções** (`sql.mjs` abaixo): a BA 39934/0183/0175 apareceria com 36 em vez de 136, e a RS 89036/0083/0044 sumiria (perfil 368 × BU 279, por cópias do mesmo log) |
| Auditor A | `contagem-log-pacote.mjs` | BU − (computados distintos dos logs "sem outra seção" + ciclos com qualquer "Voto confirmado" e sem "computado") | 50 em 3 seções. **Certo** para essas 3 | Parcial (3 seções). Na BA 39934/0183/0175 daria **160**, não 136 (problema 2 abaixo) |
| Matemático | `matematico-brutos.mjs` (I11) | Confirmações por cargo no log × BU, com cópias tiradas por urna | 7 seções: 3 contingências (50 votos), 3 interrupções, 1 leitura (ES 57932/0009/0085, log da seção 0112) | 10 seções: 3 contingências (152), 6 interrupções (7 votos), 1 log corrompido com votos certos (RJ 60011/0008/0061). O 136 da BA foi tirado à mão: o script soma 236 (parecer 20) |
| Este parecer | `cetico-vsr25-universo.mjs` | BU − computados da própria seção (linha inteira como chave, cópias contadas uma vez, seção pela linha "Seção Eleitoral" de cada urna); ciclos interrompidos só contam se não terminaram em "computado" em nenhuma cópia. No resumo do script, "D2" é a classe C1 e "D3" soma C2 e C3: 4 e 50 no 2º turno, 5 e 154 no 1º | 54 em 6 | 159 em 9 |

## Tabela final por seção e turno (Fato, reproduzida)

C1 = ciclo no log com todos os cargos confirmados, sem a linha "computado". C2 = ciclo parcial no log, urna caiu. C3 = nenhuma linha do eleitor no log publicado.

| Turno | Seção | BU | Log da própria seção | Faltam | Classe | Pelos contadores do BU (biometria / biografia / sem biometria) | Mecanismo |
|---|---|---:|---:|---:|---|---|---|
| 2º | MA 08893/0047/0609 | 224 | 188 | 36 | C3 | 32 / 4 / 0 | **Comprovado:** erro 72 (urna intrusa grava log na ME antes de ser recusada) |
| 2º | BA 35653/0173/0235 | 217 | 204 | 13 | C3 | 1 / 12 / 0 | **Comprovado:** erro 72 |
| 2º | RS 89060/0017/0191 | 92 | 90 | 2 | 1 C1 + 1 C2 | 1 / 1 / 0 | **Comprovado:** queda da urna; a MV tinha dados mais novos que a MI |
| 2º | BA 34711/0021/0178 | 234 | 233 | 1 | C1 | — | **Comprovado:** reinício com Presidente confirmado; "já votou" depois |
| 2º | PB 21750/0002/0254 | 304 | 303 | 1 | C1 | — | Reinício com Presidente confirmado (bateria crítica); "já votou" depois de 3 religamentos |
| 2º | PI 11533/0003/0216 | 259 | 258 | 1 | C1 | — | Reinício com Presidente confirmado; "já votou" depois |
| **2º** | **6 seções** | | | **54** | 49 C3 + 4 C1 + 1 C2 | | |
| 1º | BA 39934/0183/0175 | 272 | 136 | 136 | C3 | 117 / 7 / 12 | **Comprovado**, com ressalva: urna de outra seção (0181) grava log na ME; não há linha "erro 72" |
| 1º | SP 71072/0002/0035 | 247 | 232 | 15 | C3 | 13 / 2 / 0 | Perda do log **comprovada** (erro 72). **Não explicado:** qual urna gravou os 15 votos |
| 1º | RS 89036/0083/0044 | 279 | 278 | 1 | C3 | 1 / 0 / 0 | **Comprovado:** a urna original volta e sobrescreve o log da intermediária (erro 17) |
| 1º | ES 56995/0053/0211 | 265 | 264 | 1 | C1 | — | Reinício com os 6 cargos confirmados |
| 1º | RN 16039/0029/0028 | 242 | 241 | 1 | C1 | — | Reinício com os 6 cargos confirmados; "já votou" depois |
| 1º | SP 63614/0227/0305 | 290 | 289 | 1 | C1 | — | Reinício com os 6 cargos confirmados (bateria crítica) |
| 1º | SP 64254/0291/0346 | 278 | 277 | 1 | C1 | — | Reinício com os 6 cargos confirmados; "já votou" depois |
| 1º | SP 71072/0260/0037 | 285 | 284 | 1 | C1 | — | Desligada pela chave com os 6 cargos confirmados; "já votou" depois |
| 1º | RJ 58971/0087/0184 | 258 | 256 | 2 | C2 | — | **Não explicado voto a voto:** 12 ciclos interrompidos por reinícios, nenhum com o Presidente confirmado no log |
| **1º** | **9 seções** | | | **159** | 152 C3 + 5 C1 + 2 C2 | | |

Os contadores por classe saem de: BU menos os votos da própria seção no log, classificados por atendimento (doc 06). Para C1 e C2, o BU não diz qual atendimento virou voto, e a coluna fica vazia.

## Mecanismo, seção a seção (conferido no log bruto)

### 2º turno

- **MA 08893/0047/0609 (36, C3). Fato.**
  - A urna 01813459, com a carga da seção 0445, foi ligada duas vezes com a MV da 0609.
  - Nas duas, gravou o log na ME antes de ser recusada:
    - log na ME às 10:28:20, erro 72 às 10:29:43;
    - log na ME às 10:33:57, erro 72 às 10:35:21.
  - A contingência 01664037 arquivou às 10:51:22 só o log da 01813459 (`0166403725102026105122-01.jez`).
  - Os 36 votos foram gravados pela urna original 01663580. A 1ª carga do histórico do BU, `561061…020`, é a carga do BU do 1º turno dela.
  - Confirma o parecer 08.
- **BA 35653/0173/0235 (13, C3). Fato**, com um dado novo em relação ao parecer 08.
  - O pacote traz o arquivo `0168198625102026084139-01.jez`. É o log anterior da ME, que a urna **01681986** arquivou às 08:41:39 ao receber a MV. Isso prova que a 01681986 operou a MV da seção às 08:41. O parecer 08 a identificava só pela faixa de numeração (Hipótese).
  - A abertura do BU é às 08:48:54.
  - A urna 01833178, recarregada no dia para a seção 0083, foi ligada com essa MV às 09:50, gravou o log na ME às 09:52:45 e recebeu o erro 72 às 09:54:07.
  - Que a carga do meio do histórico (`454736…572`) é da 01681986 continua Hipótese forte: nenhum log publicado traz esse código.
- **RS 89060/0017/0191 (2: 1 C1 + 1 C2). Fato.**
  - O log da urna original 02320374 para às 09:02:34, no meio de um atendimento (identificação, foto, "Solicita digital"), sem linha de desligamento. Volta às 09:38:59.
  - Às 09:40:20 há duas linhas: "Erro na verificação de assinatura do arquivo - uenux.vsu" e "Origem da sincronização dos arquivos dinâmicos na ME". A urna restaurou o estado a partir da MV, que tinha dados mais novos que a memória interna.
  - Às 09:42:25 um eleitor é habilitado e às 09:42:39 confirma o Presidente. O log termina aí, e a contingência entra às 09:56.
  - O BU tem 2 votos a mais: 1 por biometria e 1 por biografia. Não dá para dizer pelo log qual atendimento corresponde a qual.
- **BA 34711/0021/0178, PB 21750/0002/0254, PI 11533/0003/0216 (1 cada, C1). Fato.**
  - Nos três, o ciclo tem "Eleitor foi habilitado" e "Voto confirmado para [Presidente]", e a urna reinicia antes do "computado". BA e PB registram bateria crítica antes.
  - Depois do religamento, a urna responde "O eleitor identificado já votou": na BA às 09:07:35, na PI às 11:13:39 e na PB às 13:03:58, depois de 3 religamentos. O log não diz se é a mesma pessoa.
  - O engenheiro escreveu que nessas seções "o caminho de habilitação desses votos é desconhecido". Isso não vale para estes 3: a habilitação está no log. Só falta a última linha.

### 1º turno

- **BA 39934/0183/0175 (136, C3). Fato**, com uma ressalva.
  - A urna original é a **02424441**. Às 13:23:56 ela registra que a MV original na sua memória é a 008B59DC, a MV da seção.
  - O log dela no pacote começa às 13:23:37 ("Iniciando registro do log na MI e na ME") e tem 24 votos até 14:20:00. O trecho das 08:00 às 13:23 não existe no pacote nem em nenhum dos 606 pacotes da zona 0183 nos dois turnos.
  - Antes disso, às 13:19:03, a urna **02423907** foi ligada com a MV 008B59DC. Essa urna tinha a carga da seção 0181 e já tinha sido substituída lá às 12:25.
    - Às 13:20:06 ela gravou o log na ME.
    - Às 13:20:25 leu a MV: a original na memória era A23FBB23, a presente era 008B59DC.
    - O log dela termina às 13:20:46, sem abrir a votação e **sem a linha "erro 72"**.
  - O log da 02423907 (100 votos da seção 0181, das 07:39 às 12:25) é o que ficou na mídia. Por isso aparece nos pacotes das duas seções. O BU da 0181 é 263 = 100 + 163 da contingência dela.
  - A contingência 02429118 arquivou a ME às 14:24:52 (`024291180410202614245201ME.jez`) e deu mais 112 votos: 136 + 24 + 112 = 272.
  - O histórico de cargas do BU tem 2 códigos: `560254…085` e o da contingência. A carga da 02423907 (`024800…526`) não está lá, então ela não gravou votos na MV. Que `560254…085` é a carga da 02424441 é Hipótese forte: a linha da carga dela não está em nenhum log publicado.
  - **Ressalva:** o fato de a 02423907 ter sido recusada se apoia na falta de votação e de carga no histórico, não numa linha de erro.
- **SP 71072/0002/0035 (15, C3).** A perda do log é Fato. A urna que gravou os votos **não foi explicada**.
  - O BU abre às 09:34:17.
  - A urna 02254720 recebeu em 29/09 a carga da seção 0035 e registrou a MV 7FBB29C7.
  - No dia, ela só aparece das 10:17:39 às 10:52:
    - foi ligada com a MV 9F62BC72, gerada em 27/09;
    - gravou o log na ME às 10:18:41;
    - recebeu o erro 72 às 10:19:32;
    - foi desligada pela chave às 10:52:00.
  - A contingência 02253783 arquivou a ME às 10:55:01 e deu 232 votos.
  - Os 15 votos das 09:34 às 10:18 foram gravados na MV 9F62BC72 por uma urna cujo log não está no pacote.
  - **A contradição:** o histórico de cargas do BU tem só 2 códigos: o da 02254720 (`725394…153`) e o da contingência. Mas o log da 02254720 não tem nenhuma linha no dia antes das 10:17, e a memória dela tinha registrada outra MV.
  - Nos 878 pacotes da zona 0002 (dois turnos), nenhum outro log cita a MV 9F62BC72, a MV 7FBB29C7 ou a carga `725.394…`.
  - Chamar a 02254720 de "urna original que votou" (texto do matemático) não está provado.
- **RS 89036/0083/0044 (1, C3). Fato.** É uma variante nova.
  - A urna original 01801772 votou 90 vezes e foi desligada pela chave às 11:04:26.
  - O pacote traz o arquivo `016752570410202611115001ME.jez`, que a urna **01675257** gravou às 11:11:50 ao receber a MV. O histórico de cargas do BU tem 3 códigos: o da 01801772 (`975386…686`), um código do meio (`177306…147`) e o da contingência 01651842. A carga do meio é, por Hipótese forte, a da 01675257, e mostra que ela gravou na MV.
  - Às 11:40 a urna **original** 01801772 foi religada com a mesma MV.
    - Às 11:42:39 gravou o log dela na ME.
    - Às 11:44:13 deu "GAP erro 17 | Sincronização da MI para ME | os dados da MV não correspondem aos da memória interna". A MV tinha mudado depois dela.
    - Foi desligada às 11:44:27.
  - A contingência 01651842 arquivou a ME às 12:03:51: só o log da 01801772. O log da 01675257 (11:11–11:41) se perdeu.
  - A urna 01675257 não aparece em nenhum dos 216 pacotes da zona 0083 nos dois turnos.
  - Diferenças em relação ao 2º turno: quem sobrescreveu foi a urna original da própria seção, com erro 17, e a janela perdida não é a da manhã.
- **ES 56995/0053/0211, RN 16039/0029/0028, SP 63614/0227/0305, SP 64254/0291/0346, SP 71072/0260/0037 (1 cada, C1). Fato.**
  - Nos cinco, o ciclo tem os 6 cargos confirmados, até o Presidente, e é cortado por religamento ou por "Votação suspensa".
  - Em RN, SP 64254 e SP 71072/0260, a primeira identificação depois do religamento recebe "O eleitor identificado já votou". O log não diz se é a mesma pessoa.
- **RJ 58971/0087/0184 (2, C2).** O mecanismo é **não explicado voto a voto**.
  - A urna 02172702 reiniciou muitas vezes entre 11:42 e 16:07, a maioria sem linha de desligamento.
  - Há 12 ciclos interrompidos. Nenhum chega ao Presidente no log: o mais longo, às 15:44, para no Governador; 4 não têm nenhuma confirmação.
  - O BU tem 2 votos a mais.
  - O compatível é a urna ter gravado o voto na mídia e perdido o fim do log na queda, como no RS 89060 do 2º turno. Mas aqui o log não tem linha de sincronização que mostre isso. Não dá para dizer quais 2 dos 12 atendimentos viraram voto.

## Assinaturas (Fato)

`cetico-vsr25-lacres.mjs` confere os 6 pacotes com C3 com `src/lacres.js`:
- 1º turno: BA 0175 e SP 0035 passam direto, com 25 conferências e 0 falha. A RS 0044 dá 25 conferências e 0 falha depois de cortar 1 byte 0x00 do certificado (UE2013, mesmo defeito de leitura do parecer 08).
- 2º turno: MA, BA e RS, com 22 conferências e 0 falha cada.

O pacote assinado é o da contingência. A assinatura prova que BU, RDV e log não mudaram depois dela. Não diz nada sobre o log que nunca entrou no pacote.

## Bugs de leitura (Fato)

1. **`src/perfil-secoes.js` (tabela `perfil_log`), usado pelo engenheiro.** Soma as cópias MI/ME do mesmo log e os logs de outra seção.
   - No 2º turno, isso gera excesso em 3 seções (BA 39870/0133/0184, ES 57932/0009/0085, MG 40690/0016/0264) e não esconde nenhuma falta.
   - No 1º turno, gera excesso em 7 seções, e uma delas esconde 1 voto sem rastro: RS 89036/0083/0044, com perfil 368 × BU 279 e 278 votos reais na própria seção. Também reduz a falta da BA 39934/0183/0175 de 136 para 36.
   - Quem aplicar ao 1º turno o método do engenheiro acha 58 em 8 seções, e não 159 em 9.
2. **`contagem-log-pacote.mjs` (auditor A).** São três defeitos, e só o primeiro já tinha sido apontado (parecer 08, item 8):
   - **(a) Seção marcada por arquivo inteiro.** No 1º turno da BA 39934/0183/0175, um mesmo `logd.dat` aninhado tem a urna 02423907 (seção 0181) e a 02424441 (seção 0175). O arquivo inteiro vira "outra seção", e os 24 votos da 0175 saem da conta: o script daria 272 − 112 = 160 sem rastro, em vez de 136.
   - **(b) Ciclo interrompido contado por cópia.** O script não confere se o ciclo terminou em "computado" na outra cópia, e o resultado fica negativo. Na própria saída parcial do autor (`log-pacote-1t.csv`) aparecem MG 44458/0103/0221 com −3 e MG 47830/0165/0031 com −2.
   - **(c) Qualquer "Voto confirmado" conta como rastro**, mesmo de um ciclo que não virou voto. No 2º turno, em 85 pacotes, há ciclos interrompidos com confirmação que não viraram voto (matemático). Uma falta real na mesma seção ficaria escondida.
   - Não rodei o script porque ele grava por cima do CSV do autor. O número 160 sai da regra do código aplicada ao log bruto da BA 39934/0183/0175. O script também abre o banco primário em vez da cópia de leitura.
3. **`matematico-brutos.mjs`.** Tira as cópias certo, mas não separa a seção declarada. O 136 da BA foi corrigido à mão (parecer 20).
4. **O "log aninhado/duplicado" não cria falsos votos sem rastro.** O defeito do perfil infla o log, não o reduz. Depois de tirar cópias e outra seção, nenhuma seção do país tem mais votos no log que no BU nos dois turnos.

## Tentativa de derrubar, nos dois sentidos

| Explicação | Testada? | Resultado |
|---|---|---|
| **Alarme falso:** cópia de log, log de outra seção ou contagem por arquivo | Testada no universo completo | Descartada como causa das faltas. Ela só inflava o log. |
| **Alarme falso:** o voto está no log de outro pacote da zona | Testada (zonas BA 0183, SP 0002, RS 0083, nos dois turnos; o parecer 08 fez MA 0047 e BA 0173) | Descartada: o trecho perdido não está em nenhum pacote. |
| **Alarme falso:** BU adulterado depois da urna | Testada (assinaturas) | Descartada para o pacote assinado. |
| **Absolvição falsa:** uma falta escondida por excesso na mesma seção (cópia, outra seção, ciclo que não virou voto) | Testada: a contagem tira as cópias pela linha inteira, separa a seção e só aceita ciclo interrompido sem "computado" em nenhuma cópia | Achou 1 falta que o método do engenheiro esconde (RS 89036/0083/0044) e corrigiu a BA 39934 (136, não 36). Nenhuma outra. |
| **Absolvição falsa:** voto de outra seção contado como da própria. Isso acontece quando a urna foi ligada na véspera e não declara a seção no dia: 1.569 pacotes (390.388 votos) no 1º turno e 1.361 (351.390) no 2º | Testada (`cetico-vsr25-indefinida.mjs`, seção declarada no log inteiro) | Descartada: todos esses votos são da própria seção. Só 1 pacote por turno tem voto de log de outra seção: BA 39934/0183/0175 (1º turno) e ES 57932/0009/0085 (2º turno). |
| **Absolvição falsa:** "interrupção que virou voto" é benigna | Em parte | Nos 9 votos C1, a habilitação e todas as confirmações estão no log. Em 6 deles há "já votou" logo depois do religamento. Nos 3 C2 (RJ 2, RS 1), o log não mostra o voto inteiro. |
| **Benigna suposta:** "o mesário trocou a mídia e a urna certa" | Recusada (princípio 8) | O que conta é o rastro técnico: erro 72 e erro 17 bloquearam as urnas erradas, o histórico de cargas mostra quem gravou, e os nomes dos arquivos arquivados mostram quem tocou a MV. |
| **Hipótese de risco:** votos lançados sem eleitor na janela sem log (C3: 201 votos em 5 seções) | Não testável com arquivos públicos | Continua aberta. Só os contadores do BU indicam a habilitação: 131 dos 152 do 1º turno por biometria, 33 dos 49 do 2º turno por biometria. Contador não é linha de log. |

**Poder.** A contagem cobre todos os pacotes de urna dos dois turnos, e 1 voto a mais no BU não escapa. O que ela não vê: um voto falso **com** linha no log (pareceres 01 e 10) e o conteúdo dos logs que nunca entraram no pacote.

## Vereditos

| Afirmação | Veredito |
|---|---|
| Auditor A / parecer 08: 50 votos sem rastro em 3 contingências (2º turno), mecanismo erro 72 em MA e BA | **sustentado com ressalvas.** A contagem e o mecanismo se confirmam. Ressalvas: são 49 sem nenhuma linha e 1 (RS) com identificação parcial; a definição deixa de fora 4 votos com ciclo confirmado; o script tem 3 defeitos de leitura que, no 1º turno, dariam 160 na BA. |
| Engenheiro: 54 votos em 6 seções sem "voto computado" (2º turno) | **sustentado com ressalvas.** O número está certo. Ressalvas: o método (perfil) falha no 1º turno; em 4 dos 54 a habilitação está no log; "contingência em cadeia" não descreve o MA, onde a urna intermediária não votou. |
| Matemático: 7 seções (2º turno) e 10 (1º turno) com I11 violado | **sustentado** |
| Matemático: 152 votos sem rastro em 3 contingências no 1º turno | **sustentado**, reproduzido por código independente |
| Matemático: "130 dos 152 por biometria" | **refutado no número**: são 131 |
| Matemático: mecanismo "igual ao do 2º turno" | **sustentado com ressalvas**: são 3 variantes (erro 72; urna de outra seção sem linha de erro; urna original que volta, erro 17) |
| Auditor E: urna 2423907 ligada às 13:19 com o cartão da 0175, parou às 13:20:46 sem votar | **sustentado** e explica a BA: foi ela que sobrescreveu o log da urna original 02424441 |
| "SP 71072/0002/0035: urna original 02254720" | **não reproduzido**: a 02254720 foi recusada (erro 72), e a urna que votou não foi identificada |

## Afirmação revisada (pronta para a perícia)

> **Fato.** Comparamos, em todas as seções com urna eletrônica dos dois turnos, o número de eleitores que votaram no boletim de urna com as linhas "O voto do eleitor foi computado" do log da própria seção.
>
> - **2º turno:** 499.178 seções. Em 6, o boletim tem mais votos que o log: 54 votos no total.
> - **1º turno:** 499.176 seções. Em 9, o boletim tem mais votos que o log: 159 votos no total.
> - Ficaram de fora, nos dois turnos, as 41 seções do exterior sem arquivo e as seções apuradas pelo Sistema de Apuração, cujo log não registra eleitores (31 no 1º turno e 29 no 2º).
> - Em nenhuma seção o log tem mais votos que o boletim.
>
> **Fato.** Em 10 dessas seções, o log mostra o atendimento do eleitor (identificação, habilitação ou confirmação do voto), e a urna caiu ou foi desligada antes de gravar a última linha: 5 votos no 2º turno e 7 no 1º.
>
> **Fato.** Em 5 seções de contingência, o log da urna que gravou parte dos votos não está no pacote publicado: 49 votos no 2º turno e 152 no 1º. Nas 5, os arquivos mostram como o log se perdeu. Outra urna foi ligada com a mídia de votação da seção e gravou o próprio log nessa mídia, por cima do anterior. Depois ela foi recusada ou parou sem votar. A urna de contingência empacotou o log que ficou.
> - 2º turno: MA 08893/0047/0609 (36) e BA 35653/0173/0235 (13);
> - 1º turno: BA 39934/0183/0175 (136), SP 71072/0002/0035 (15) e RS 89036/0083/0044 (1).
>
> Os boletins dessas 5 seções estão assinados, e as assinaturas conferem.
>
> **Pendente:** qual urna gravou os votos da SP 71072/0002/0035 antes das 10:18 do 1º turno.
>
> **Pendente:** como cada um desses votos foi habilitado. O log da urna que os gravou não foi publicado.

## Recomendações

1. **Pedir à Justiça Eleitoral (doc 07, C3)** o log da memória interna das urnas:
   - 2º turno: 01663580 (MA 0609) e 01681986 (BA 0235);
   - 1º turno: 02424441 (BA 0175), 01675257 (RS 0044) e a urna que abriu a SP 71072/0002/0035 às 09:34:17, com a ata da seção.
2. **Engenheiro de segurança:** conferir na documentação do TSE se gravar o log na mídia externa antes de validar a MV (erros 72 e 17) é o previsto. Os 5 casos C3 mostram que esse passo apaga a trilha da urna anterior.
3. **Engenheiro:** corrigir o texto sobre BA 34711, PB 21750 e PI 11533 (a habilitação está no log) e não estender o método do `perfil_log` ao 1º turno.
4. **Auditor A:** corrigir os 3 defeitos de `contagem-log-pacote.mjs` (seção por urna e por trecho, ciclo interrompido conferido em todas as cópias, "rastro" só com o Presidente confirmado) e gravar `--secao` em outro arquivo.
5. **Matemático:** 131, não 130; fazer o script separar a seção declarada; descrever as 3 variantes do mecanismo.

## Comandos

```bash
# contagem independente, universo completo (cada turno ~30 min com 2 processos)
node scripts/auditoria/cetico-vsr25-universo.mjs --turno 2 --procs 2
node scripts/auditoria/cetico-vsr25-universo.mjs --turno 1 --procs 2
node scripts/auditoria/cetico-vsr25-universo.mjs --turno 1 --consolidar   # refaz só o resumo
node scripts/auditoria/cetico-vsr25-indefinida.mjs --turno 1               # votos sem "Seção Eleitoral" no dia (urna ligada na véspera)
node scripts/auditoria/cetico-vsr25-indefinida.mjs --turno 2
# log bruto, seção a seção (BU, histórico de cargas, urnas, seção declarada, MV, erro 72, ciclos)
node scripts/auditoria/cetico-vsr25-bruto.mjs --turno 1 --secao ba/39934/0183/0175 --secao sp/71072/0002/0035 --secao rs/89036/0083/0044
node scripts/auditoria/cetico-vsr25-bruto.mjs --turno 2 --secao ma/08893/0047/0609 --secao ba/35653/0173/0235 --secao rs/89060/0017/0191
node scripts/auditoria/cetico-vsr25-bruto.mjs --turno 1 --secao rs/89036/0083/0044 --grep " (11:0[3-9]|11:[1-4][0-9]|12:0[0-9])"
# o log perdido não está em outro pacote da zona
node scripts/auditoria/cetico-vsr25-busca-zona.mjs --uf sp --zona 0002 --turno 1 --turno 2 --padrao "9F62BC72|7FBB29C7|725\.394\.486"
node scripts/auditoria/cetico-vsr25-busca-zona.mjs --uf rs --zona 0083 --turno 1 --turno 2 --padrao "01675257|177\.306\.172"
node scripts/auditoria/cetico-vsr25-busca-zona.mjs --uf ba --zona 0183 --turno 1 --turno 2 --padrao "560\.254\.694"
# assinaturas
node scripts/auditoria/cetico-vsr25-lacres.mjs
# o que o método do engenheiro (perfil_log) daria nos dois turnos
node scripts/sql.mjs "select s.turno,s.uf,s.municipio,s.zona,s.secao,s.comparecimento bu,p.votos_computados log from secao s join perfil_log p using(turno,uf,municipio,zona,secao,hash) where s.comparecimento<>p.votos_computados order by 1,2"
```

Saídas: `data/parsed/auditoria/cetico/vsr25/<t>t/<uf>.jsonl` (só pacotes com divergência ou log de outra seção), `<uf>.resumo.json`, `resumo-<t>t.json` e `execucao-<t>t.log`.
